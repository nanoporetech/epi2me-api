import type { S3 } from 'aws-sdk';
import type { FileStat } from './inputScanner.type';
import type { FileScannerOptions, UploadContext, UploadSettings } from './fileUploader.type';
import type { MappedFileStats } from './filestats/filestats.type';
import type { UploadState } from './epi2me-state.type';
import type { EPI2ME_FS } from './epi2me-fs';
import type { Dictionary } from 'ts-runtime-typecheck';
import type { InputQueueMessage, UploadConfigurationSubset } from './fileUploader.type';

import { loadInputFiles } from './inputScanner';
import { createQueue } from './queue';
import { sleep } from './timers';
import { getFileName, getNormalisedFileExtension, isFastq } from './file_extensions';
import { FileUploadWarnings, UploadWarnings } from './fileUploader.type';
import { splitter } from './splitters/fastq';
import { filestats } from './filestats';
import { niceSize } from './niceSize';
import {
  asNumber,
  asOptDictionary,
  asOptDictionaryOf,
  asOptString,
  assertDefined,
  isArray,
  isDefined,
  makeNumber,
} from 'ts-runtime-typecheck';
import { first } from 'rxjs/operators';
import path from 'path';
import fs from 'fs';
import { Duration } from './Duration';
import { getErrorMessage, NestedError, wrapAndLogError } from './NodeError';
import { FileIndex } from './FileIndex';

export function instantiateFileUpload(instance: EPI2ME_FS): () => Promise<void> {
  assertDefined(instance.config.workflow, 'Workflow');

  const fileIndex = new FileIndex();
  const splitFiles = new Set<string>();

  const workflow = instance.config.workflow;
  const settings = readSettings(instance.config);
  const hasStorageAccount = 'storage_account' in workflow;

  if (settings.requiresStorage && !hasStorageAccount) {
    throw new Error('Workflow requires storage enabled. Please provide a valid storage account');
  }

  const { inputFolders, outputFolder, filetype: filetypes } = instance.config.options;
  const { warnings, upload: state } = instance.states;
  const stopped$ = instance.uploadStopped$;

  const context: UploadContext = {
    settings,
    warnings,
    fileIndex,
    splitFiles,
    instance,
    state,
    logger: instance.log,
    hasStopped: false,
    stopped$,
  };

  assertDefined(inputFolders, 'inputFolders');

  const scanner = createFileScanner({
    fileIndex,
    inputFolders,
    filetypes,
    outputFolder,
    context,
  });

  let running = true;
  stopped$.subscribe(() => {
    running = false;
    context.hasStopped = true;
  });

  const { add: queueFile, empty$ } = createQueue<FileStat>({}, async (file: FileStat) => {
    if (running) {
      await processFile(context, file);
    }
  });
  const uploadInterval = instance.config.options.fileCheckInterval;
  const queueEmpty = () => empty$.pipe(first()).toPromise();

  return async () => {
    while (running) {
      const uploadDuration = Duration.Delta();

      // NOTE scanner errors are handled inside createFileScanner
      const files = await scanner();
      // NOTE queueEmpty will never resolve if nothing is queued
      if (files.length > 0) {
        for (const file of files) {
          queueFile(file);
        }
        // NOTE errors that occur in the queue are swallowed
        await queueEmpty();
      }

      await sleep(uploadInterval.subtract(uploadDuration()).clamp(Duration.ZERO));
    }
  };
}

export function createFileScanner({
  fileIndex,
  inputFolders,
  outputFolder,
  filetypes,
  context,
}: FileScannerOptions): () => Promise<FileStat[]> {
  const filter = (location: string) => {
    const exists = context.splitFiles.has(location) || fileIndex.has(location);
    return !exists;
  };

  const errorHandler = (err: unknown) => {
    // TODO we should reconsider this warning, is it a critical error?
    addWarning(context, UploadWarnings.SCAN_FAIL, err + '');
  };

  const options = {
    inputFolders,
    outputFolder,
    filetypes,
    filter,
    errorHandler,
  };

  return () => loadInputFiles(options);
}

export function readSettings({
  options,
  instance: workflowInstance,
  workflow,
}: UploadConfigurationSubset): UploadSettings {
  assertDefined(workflow);
  assertDefined(workflowInstance.bucket, 'workflowInstance.bucket');
  assertDefined(workflowInstance.bucketFolder, 'workflowInstance.bucketFolder');

  const settings: UploadSettings = {
    maxFiles: Infinity,
    maxFileSize: Infinity,
    requiresStorage: false,
    bucket: workflowInstance.bucket,
    bucketFolder: workflowInstance.bucketFolder,
    sseKeyId: workflowInstance.key_id,
    retries: options.uploadRetries,
  };

  const workflowAttributes = asOptDictionary(workflow.workflowAttributes || workflow.workflow_attributes);
  const attributes = asOptDictionaryOf(isArray)(workflow.attributes);

  if (workflowAttributes) {
    // started from GUI agent
    if (workflowAttributes.requires_storage) {
      settings.requiresStorage = true;
    }

    if ('split_size' in workflowAttributes) {
      settings.split = {};
      settings.split.maxChunkBytes = makeNumber(workflowAttributes.split_size);
    }

    if ('split_reads' in workflowAttributes) {
      settings.split = settings.split ?? {};
      settings.split.maxChunkReads = makeNumber(workflowAttributes.split_reads);
    }

    if ('max_size' in workflowAttributes) {
      settings.maxFileSize = makeNumber(workflowAttributes.max_size);
    }

    if ('max_files' in workflowAttributes) {
      settings.maxFiles = makeNumber(workflowAttributes.max_files);
    }
  } else if (attributes) {
    // started from CLI

    if ('epi2me:max_size' in attributes) {
      settings.maxFileSize = makeNumber(attributes['epi2me:max_size'][0]);
    }
    if ('epi2me:max_files' in attributes) {
      settings.maxFiles = makeNumber(attributes['epi2me:max_files'][0]);
    }
    if ('epi2me:split_size' in attributes) {
      settings.split = {};
      settings.split.maxChunkBytes = makeNumber(attributes['epi2me:split_size'][0]);
    }
    if ('epi2me:split_reads' in attributes) {
      settings.split = settings.split ?? {};
      settings.split.maxChunkReads = makeNumber(attributes['epi2me:split_reads'][0]);
    }

    if ('epi2me:category' in attributes && attributes['epi2me:category'].includes('storage')) {
      settings.requiresStorage = true;
    }
  }

  return settings;
}

export async function processFile(ctx: UploadContext, file: FileStat): Promise<void> {
  const { settings, state, splitFiles, fileIndex } = ctx;

  if (settings.maxFiles <= state.filesCount) {
    skipFile(file, ctx, FileUploadWarnings.TOO_MANY);
    return;
  }

  if (file.size === 0) {
    skipFile(file, ctx, FileUploadWarnings.EMPTY);
    return;
  }

  const { split } = settings;
  const canSplit = isFastq(file.path, true);
  const shouldSplit = file.size > asNumber(split?.maxChunkBytes, Infinity) || isDefined(split?.maxChunkReads);

  // we need the isDefined here to appease the typechecker, it's proved by 'shouldSplit' but flow analysis can't see it
  if (canSplit && shouldSplit && isDefined(split)) {
    addFileWarning(file, ctx, FileUploadWarnings.SPLIT);

    const isCompressed = /\.gz$/i.test(file.path);
    const directory = path.dirname(file.relative);

    let chunkId = 0;

    await splitter(
      file.path,
      split,
      splitFiles,
      async (chunkFile: string): Promise<void> => {
        if (ctx.hasStopped) {
          // NOTE should be caught by the queue and discarded
          throw new Error('File upload aborted');
        }

        chunkId += 1;

        const name = path.basename(chunkFile);
        const relative = path.join(directory, name);
        const id = `${file.id}-${chunkId.toString().padStart(4, '0')}`;

        const chunkFilestat: FileStat = {
          name,
          path: chunkFile,
          relative,
          id,
          size: 0, // NOTE uploadJob immediately overwrites this placeholder value with the actual size from `filestats(file.path)`
        };

        await uploadJob(ctx, chunkFilestat);
      },
      isCompressed,
    );

    state.filesCount += 1;

    // mark the original file as done
    fileIndex.add(file.path);
    return;
  }

  // check if the file exceeds our size limit
  if (file.size > settings.maxFileSize) {
    skipFile(file, ctx, FileUploadWarnings.TOO_BIG);
    return;
  }

  await uploadJob(ctx, file);
  fileIndex.add(file.path);

  state.filesCount += 1;
}

export function skipFile(file: FileStat, ctx: UploadContext, warn: FileUploadWarnings): void {
  addFileWarning(file, ctx, warn);
  ctx.fileIndex.add(file.path);
}

export function addWarning(ctx: UploadContext, warn: UploadWarnings, msg: string): void {
  const { logger, warnings } = ctx;
  let type;
  switch (warn) {
    case UploadWarnings.SCAN_FAIL:
      type = 'WARNING_SCAN_FAIL';
      break;
  }
  logger.error(msg);
  warnings.push({ msg, type });
}

export function addFileWarning(
  file: Pick<FileStat, 'relative' | 'size'>,
  ctx: UploadContext,
  warn: FileUploadWarnings,
): void {
  const { settings, logger, warnings } = ctx;
  const splitSize = settings.split?.maxChunkBytes ?? Infinity;
  let type, msg;
  switch (warn) {
    case FileUploadWarnings.EMPTY:
      type = 'WARNING_FILE_EMPTY';
      msg = `The file ${file.relative} is empty. It will be skipped.`;
      break;
    case FileUploadWarnings.SPLIT:
      type = 'WARNING_FILE_SPLIT';
      msg = `${file.relative}${file.size > splitSize ? ' is too big and' : ''} is going to be split`;
      break;
    case FileUploadWarnings.TOO_BIG:
      type = 'WARNING_FILE_TOO_BIG';
      msg = `The file ${file.relative} is bigger than the maximum size limit (${niceSize(
        settings.maxFileSize,
      )}B). It will be skipped.`;
      break;
    case FileUploadWarnings.TOO_MANY:
      type = 'WARNING_FILE_TOO_MANY';
      msg = `Maximum ${settings.maxFiles} file(s) already uploaded. Marking ${file.relative} as skipped.`;
      break;
    case FileUploadWarnings.UPLOAD_FAILED:
      type = 'WARNING_FILE_UPLOAD_FAILED';
      msg = `Uploading ${file.relative} failed.`;
      break;
    case FileUploadWarnings.UPLOAD_RETRIES_EXCEEDED:
      type = 'WARNING_FILE_UPLOAD_RETRIES_EXCEEDED';
      msg = `Exceeded maximum retries uploading ${file.relative}. This file will not be uploaded.`;
      break;
    case FileUploadWarnings.MESSAGE_RETRIES_EXCEEDED:
      type = 'WARNING_FILE_UPLOAD_MESSAGE_RETRIES_EXCEEDED';
      msg = `Exceeded maximum retries adding ${file.relative} to the queue. This file will not be processed.`;
      break;
  }
  logger.warn(msg);
  warnings.push({ msg, type });
}

export async function uploadJob(ctx: UploadContext, file: FileStat): Promise<void> {
  await uploadFile(file, await filestats(file.path), ctx);
}

export function addFailure(state: UploadState, msg: string): void {
  if (!state.failure) {
    state.failure = {};
  }
  state.failure[msg] = (state.failure[msg] ?? 0) + 1;
}

export function openReadStream(location: string, handler: (rs: fs.ReadStream) => void | Promise<void>): Promise<void> {
  const rs = fs.createReadStream(location);
  return new Promise<void>((resolve, reject) => {
    rs.addListener('open', async () => {
      try {
        await handler(rs);
        resolve();
      } catch (err) {
        rs.close(); // ensure the stream is closed if we have an error in the handler
        reject(err);
      }
    });
    rs.addListener('error', (err) => reject(new NestedError('upload filesystem error', err)));
  });
}

export function constructUploadParameters(
  ctx: UploadContext,
  file: FileStat,
  rs: S3.PutObjectRequest['Body'],
): S3.PutObjectRequest {
  const {
    settings: { bucket, sseKeyId, bucketFolder },
  } = ctx;

  // MC-8747
  // We previously generated the key from the relative path, but this could cause key collisions between different files
  // to avoid this we now insert the file id ( unique for the session ) into the name

  // get our (normalized) extension
  const ext = getNormalisedFileExtension(file.relative);
  const filename = getFileName(file.relative);
  // special case handling where there is no directory above the file
  const directoryParts = file.relative === file.name ? [] : path.dirname(file.relative).split(/[\\/]+/g);
  // extract the parts of the relative path without the extension
  const parts = [...directoryParts, `${filename}-${file.id}.${ext}`];
  // rejoin the parts with underscore instead of slash, insert the file.id before the extension
  const label = parts.join('_');

  // path is `$ROOT/component-0/$LABEL/$LABEL`
  // each file gets it's own folder so the derived files have somewhere to go, hence the double $LABEL
  const key = [bucketFolder, 'component-0', label, label].join('/').replace(/\/+/g, '/');

  const params: S3.PutObjectRequest = {
    Bucket: bucket,
    Key: key,
    Body: rs,
  };

  if (sseKeyId) {
    // MC-4996 support (optional, for now) encryption
    params.SSEKMSKeyId = sseKeyId;
    params.ServerSideEncryption = 'aws:kms';
  }

  if (file.size) {
    params.ContentLength = file.size;
  }

  return params;
}

export async function uploadFile(file: FileStat, stats: MappedFileStats, ctx: UploadContext): Promise<void> {
  const { state, instance, stopped$ } = ctx;
  try {
    const timeout = instance.config.options.uploadTimeout.add(Duration.Seconds(5));
    const s3 = instance.sessionedS3({
      retryDelayOptions: {
        customBackoff(count: number, err?: Error): number {
          addFileWarning(file, ctx, FileUploadWarnings.UPLOAD_FAILED);
          ctx.logger.error('Upload error', err);
          if (count > ctx.settings.retries) {
            addFileWarning(file, ctx, FileUploadWarnings.UPLOAD_RETRIES_EXCEEDED);
            return -1;
          }
          return 2 ** count * 1000; // 2s, 4s, 8s, 16s, 32s
        },
      },
      maxRetries: ctx.settings.retries,
      httpOptions: {
        timeout: timeout.milliseconds,
      },
    });

    await openReadStream(file.path, async (rs) => {
      const params = constructUploadParameters(ctx, file, rs);
      const options = {
        partSize: 10 * 1024 * 1024,
        queueSize: 2,
      };

      instance.uploadState('progress', 'incr', {
        total: file.size,
      });

      if (ctx.hasStopped) {
        return;
      }

      const managedUpload = s3.upload(params, options);
      const subscription = stopped$.subscribe(() => {
        managedUpload.abort();
      });

      let currentProgress = 0;

      managedUpload.on('httpUploadProgress', async (progress) => {
        const progressDelta = progress.loaded - currentProgress;
        instance.uploadState('progress', 'incr', {
          bytes: progressDelta,
        }); // delta since last time
        currentProgress = progress.loaded; // store for calculating delta next iteration
      });

      try {
        await managedUpload.promise();
        await uploadComplete(ctx, params.Key, file); // send message
      } finally {
        instance.uploadState('progress', 'decr', {
          total: file.size,
          bytes: currentProgress,
        }); // zero in-flight upload counters
        subscription.unsubscribe();
      }
    });

    const { bytes = 0, reads = 0, sequences = 0 } = stats ?? {};
    instance.uploadState('success', 'incr', { files: 1, bytes, reads, sequences });
    const ext = path.extname(file.name);
    instance.uploadState('types', 'incr', {
      [ext]: 1,
    });
  } catch (err) {
    addFailure(state, getErrorMessage(err));
    throw err;
  }
}

function createMessage(instance: EPI2ME_FS, objectId: string): InputQueueMessage {
  const workflowInstance = instance.config.instance;

  const message: InputQueueMessage = {
    bucket: workflowInstance.bucket,
    outputQueue: workflowInstance.outputQueueName,
    remote_addr: workflowInstance.remote_addr,
    apikey: instance.config.options.apikey,
    id_workflow_instance: workflowInstance.id_workflow_instance,
    id_master: workflowInstance.id_workflow,
    utc: new Date().toISOString(), // WARN ported from the old version, why ISOString for utc?
    path: objectId,
    prefix: objectId.substring(0, objectId.lastIndexOf('/')),
    key_id: workflowInstance.key_id,
  };

  if (workflowInstance.chain) {
    let components: Dictionary<Dictionary>;

    try {
      components = JSON.parse(JSON.stringify(workflowInstance.chain.components)); // low-frills object clone
    } catch {
      throw new Error(`Failed to clone workflow chain`);
    }

    // WARN this is slightly odd behavior, but taken from the previous
    // version of the upload algorithm. We should validate that it's
    // correct
    for (const component of Object.values(components)) {
      switch (component?.inputQueueName) {
        case 'uploadMessageQueue':
          component.inputQueueName = instance.uploadMessageQueue;
          break;
        case 'downloadMessageQueue':
          component.inputQueueName = instance.downloadMessageQueue;
          break;
        default:
          // NOTE should this be a NOOP or an error
          break;
      }
    }

    message.components = components;
    message.targetComponentId = workflowInstance.chain.targetComponentId;
  }

  return message;
}

async function messageInputQueue(ctx: UploadContext, objectId: string, file: FileStat): Promise<string | undefined> {
  const { instance, logger } = ctx;
  const message = createMessage(instance, objectId);

  try {
    const inputQueueURL = await instance.discoverQueue(asOptString(instance.config.instance.inputQueueName));
    const sqs = instance.sessionedSQS({
      retryDelayOptions: {
        customBackoff(count: number, err?: Error): number {
          ctx.logger.error('Upload message error', err);
          if (count > ctx.settings.retries) {
            addFileWarning(file, ctx, FileUploadWarnings.MESSAGE_RETRIES_EXCEEDED);
            return -1;
          }
          return 2 ** count * 1000; // 2s, 4s, 8s, 16s, 32s
        },
      },
      maxRetries: ctx.settings.retries,
    });

    logger.info(`${file.id} sending SQS message to input queue`);
    const { MessageId } = await sqs
      .sendMessage({
        QueueUrl: inputQueueURL,
        MessageBody: JSON.stringify(message),
      })
      .promise();
    return MessageId;
  } catch (err) {
    throw wrapAndLogError(`${file.id} exception sending SQS message`, err, logger);
  }
}

async function uploadComplete(ctx: UploadContext, objectId: string, file: FileStat): Promise<void> {
  const { instance, logger } = ctx;

  logger.info(`${file.id} uploaded to S3: ${objectId}`);

  const messageId = await messageInputQueue(ctx, objectId, file);
  const workflowInstance = instance.config.instance;

  instance.realtimeFeedback(`workflow_instance:state`, {
    type: 'start',
    id_workflow_instance: workflowInstance.id_workflow_instance,
    id_workflow: workflowInstance.id_workflow,
    component_id: '0',
    message_id: messageId,
    id_user: workflowInstance.id_user,
  });

  logger.info(`${file.id} SQS message sent. Mark as uploaded`);
}
