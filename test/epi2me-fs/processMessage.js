import assert from 'assert';
import sinon from 'sinon';
import tmp from 'tmp';
import fs from 'fs-extra';
import path from 'path';
import { merge } from 'lodash';
import AWS from 'aws-sdk';
import { EPI2ME_FS as EPI2ME } from '../../src/epi2me-fs';

describe('epi2me-api.processMessage', () => {
  const clientFactory = (opts) => {
    const client = new EPI2ME(
      merge(
        {
          url: 'https://epi2me-test.local',
          log: {
            debug: sinon.stub(),
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub(),
            critical: sinon.stub(),
          },
        },
        opts,
      ),
    );
    sinon.stub(client, 'socket').resolves({
      emit: () => {},
    });
    return client;
  };

  let stubs;
  beforeEach(() => {
    stubs = [];
  });

  afterEach(() => {
    stubs.forEach((s) => {
      s.restore();
    });
  });

  it('should handle bad message json', (done) => {
    const client = clientFactory({
      downloadMode: 'telemetry',
    });
    client.telemetryLogStream = fs.createWriteStream('/dev/null');

    const stub = sinon.stub(client, 'deleteMessage').resolves();
    const msg = {
      Body: '{message: body}',
    };

    assert.doesNotThrow(() => {
      client.processMessage(msg, () => {});
    });

    sinon.assert.calledWith(stub, msg);
    assert(client.log.error.calledOnce);
    stub.restore();
    done();
  });

  it('should parse message json', (done) => {
    const client = clientFactory({
      downloadMode: 'telemetry',
    });
    client.telemetryLogStream = fs.createWriteStream('/dev/null');

    sinon.stub(client, 'sessionedS3').rejects(new Error('error message'));

    assert.doesNotThrow(() => {
      client.processMessage(
        {
          Body: '{"message": "body"}',
        },
        () => {},
      );
    });
    assert(client.log.warn.calledOnce); // No path
    done();
  });

  it('should not double-prepend drive letters MC-6850', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true });
    const client = clientFactory({
      filter: 'on',
      downloadMode: 'data+telemetry',
      outputFolder: tmpDir.name,
    });
    client.telemetryLogStream = fs.createWriteStream('/dev/null');

    // MC-7519: Multiple instances running means multiple outputs need to be namespaced by id_workflow_instance
    // processMessage should be called for running instances so there should be an id_workflow_instance
    client.config.instance.id_workflow_instance = '1234567';

    const s3 = new AWS.S3();

    sinon.stub(client, 'sessionedS3').resolves(s3);
    sinon.stub(client, 'initiateDownloadStream').resolves();
    sinon.stub(client, 'deleteMessage').resolves();
    stubs.push(sinon.stub(fs, 'mkdirpSync').callsFake());

    await client.processMessage(
      {
        Body: JSON.stringify({
          bucket: 'epi2test',
          path: 'OUTPUT-UUID/INPUT-UUID/9999/999999/component-2/OK/pass/CLASSIFIED/fastq_runid_shasum_15.fastq/fastq_runid_shasum_15.fastq',
          telemetry: {
            hints: {
              folder: 'OK/pass/CLASSIFIED',
            },
          },
        }),
      },
      () => {},
    );

    assert.strictEqual(
      client.initiateDownloadStream.args[0][2],
      path.join(tmpDir.name, '1234567/OK/PASS/CLASSIFIED/fastq_runid_shasum_15.fastq'),
    );
    tmpDir.removeCallback();
  });

  it('should retain output folder when no telemetry', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true });
    const client = clientFactory({
      filter: 'on',
      downloadMode: 'data+telemetry',
      outputFolder: tmpDir.name,
    });
    client.telemetryLogStream = fs.createWriteStream('/dev/null');
    // MC-7519: Multiple instances running means multiple outputs need to be namespaced by id_workflow_instance
    // processMessage should be called for running instances so there should be an id_workflow_instance
    client.config.instance.id_workflow_instance = '1234567';

    const s3 = new AWS.S3();
    sinon.stub(client, 'sessionedS3').resolves(s3);
    sinon.stub(client, 'initiateDownloadStream').resolves();
    sinon.stub(client, 'deleteMessage').resolves();
    stubs.push(sinon.stub(fs, 'mkdirpSync').callsFake());

    await client.processMessage(
      {
        Body: JSON.stringify({
          bucket: '',
          path: 'OUTPUT-UUID/INPUT-UUID/9999/999999/component-2/OK/pass/CLASSIFIED/fastq_runid_shasum_15.fastq/fastq_runid_shasum_15.fastq',
        }),
      },
      () => {},
    );

    assert.strictEqual(
      client.initiateDownloadStream.args[0][2],
      path.join(tmpDir.name, '1234567', 'fastq_runid_shasum_15.fastq'),
    );
    tmpDir.removeCallback();
  });

  // it('should retain output folder when filtering off', async () => {
  //   const tmpDir = tmp.dirSync();
  //   const client = clientFactory({
  //     filter: 'off',
  //     downloadMode: 'data+telemetry',
  //     outputFolder: tmpDir.name,
  //   });
  //   const stub = sinon.stub(client, 'sessionedS3').callsFake(() => 's3 object');

  //   const stub2 = sinon
  //     .stub(client, 'initiateDownloadStream')
  //     .callsFake((s3, messageBody, message, outputFile, completeCb) => {
  //       completeCb();
  //     });

  //   stubs.push(sinon.stub(fs, 'mkdirpSync').callsFake());

  //   try {
  //     await client.processMessage(
  //       {
  //         Body: JSON.stringify({
  //           path:
  //             'OUTPUT-UUID/INPUT-UUID/9999/999999/component-2/OK/pass/CLASSIFIED/fastq_runid_shasum_15.fastq/fastq_runid_shasum_15.fastq',
  //           telemetry: {
  //             hints: {
  //               folder: 'OK/pass/CLASSIFIED',
  //             },
  //           },
  //         }),
  //       },
  //       () => {},
  //     );
  //   } catch (err) {
  //     assert.fail(err);
  //   }

  //   assert.equal(stub2.args[0][3], path.join(tmpDir.name, 'fastq_runid_shasum_15.fastq'));
  //   tmpDir.removeCallback();
  //   stub.restore();
  //   stub2.restore();
  // });

  it('should correctly process real-world filter folder MC-6850', async () => {
    const tmpDir = tmp.dirSync();
    const client = clientFactory({
      filter: 'on',
      downloadMode: 'data+telemetry',
      outputFolder: tmpDir.name,
    });
    client.telemetryLogStream = fs.createWriteStream('/dev/null');
    // MC-7519: Multiple instances running means multiple outputs need to be namespaced by id_workflow_instance
    // processMessage should be called for running instances so there should be an id_workflow_instance
    client.config.instance.id_workflow_instance = '1234567';

    const s3 = new AWS.S3();
    sinon.stub(client, 'sessionedS3').resolves(s3);
    sinon.stub(client, 'initiateDownloadStream').resolves();
    sinon.stub(client, 'deleteMessage').resolves();
    stubs.push(sinon.stub(fs, 'mkdirp').callsFake());

    await client.processMessage(
      {
        Body: JSON.stringify({
          key_id: 'a14b0525-cb44-4f5c-8f12-96f858c6f09f',
          bucket: 'eu-west-1-metrichor-live',
          components: {
            0: {
              inputQueueName: '0F95872C-D6D2-11E8-9DBC-0371A22B323C',
            },
            1: {
              command:
                'python /usr/local/bin/fq_homogenizer.py --input_folder %inputfolder --min_qscore %min_qscore --regex *.fastq --detect_barcode %detect_barcode',
              params: {
                detect_barcode: 'Auto',
                user_defined: {},
                min_qscore: '7',
                ports: [
                  {
                    port: '*',
                    title: 'End workflow',
                    type: 'output',
                  },
                  {
                    type: 'output',
                    title: 'Pass',
                    port: 'PASS',
                  },
                ],
              },
              fail: '0',
              next: {
                '*': '0',
                PASS: '2',
              },
              wid: 1693,
              inputQueueName: 'iq_homogenizer-3100',
              dockerRegistry: '622693934964.dkr.ecr.eu-west-1.amazonaws.com',
            },
            2: {
              params: {
                output_format: 'fastq.bam',
                reference: 's3://metrichor-prod-biodata-eu-west-1/reference-genomes/10710/ONT/lambda.fasta',
                ports: [
                  {
                    type: 'output',
                    title: 'End workflow',
                    port: '*',
                  },
                  {
                    port: 'PASS',
                    type: 'output',
                    title: 'Pass',
                  },
                ],
                cwl: 's3://metrichor-prod-cwl-eu-west-1/bioinformatics-workflows/telemap-workflow/amd64-v1.3.5-release/telemap_map_epi2me_directive.yml',
              },
              command:
                'cgd --working_directory /tmp/analysis/%id_worker -o %outputfolder -d %cwl workflow.data.input.path=%input workflow.data.reference.path=%reference workflow.data.min_mq=0 workflow.data.primary_only=true',
              wid: 1647,
              inputQueueName: 'iq_telemap-135',
              next: {
                '*': '0',
              },
              fail: '0',
              dockerRegistry: '622693934964.dkr.ecr.eu-west-1.amazonaws.com',
            },
          },
          id_workflow_instance: '182103',
          targetComponentId: '0',
          path: '0F95872C-D6D2-11E8-9DBC-0371A22B323C/2185/182103/component-2/PASS/fastq_runid_738d663ef9214e590fb4806bf5aed784b941fd48_1.fastq/fastq_runid_738d663ef9214e590fb4806bf5aed784b941fd48_1.fastq.bam',
          telemetry: {
            filename: 'fastq_runid_738d663ef9214e590fb4806bf5aed784b941fd48_1.fastq.bam',
            id_workflow_instance: '182103',
            id_workflow: 1647,
            component_id: '2',
            params: {
              output_format: 'fastq.bam',
              reference: 's3://metrichor-prod-biodata-eu-west-1/reference-genomes/10710/ONT/lambda.fasta',
              ports: [
                {
                  type: 'output',
                  title: 'End workflow',
                  port: '*',
                },
                {
                  port: 'PASS',
                  type: 'output',
                  title: 'Pass',
                },
              ],
              cwl: 's3://metrichor-prod-cwl-eu-west-1/bioinformatics-workflows/telemap-workflow/amd64-v1.3.5-release/telemap_map_epi2me_directive.yml',
            },
            agent_address: {
              remote_addr: '193.240.53.18, 10.132.3.56',
            },
            version: '2.55.6',
            itype: 'r3.8xlarge',
            ec2_instance: 'i-09d960a7e4b2d2411',
            message_id: '0c25e648-d239-44d4-9a93-18b30118889e',
            filesize: 28383807,
            timings: {
              t_wrkr_dn: '2018-10-23T15:00:00.272Z',
              t_wrkr_dl: '2018-10-23T15:00:01.062Z',
              t_wrkr_an: '2018-10-23T15:00:31.773Z',
              t_wrkr_ul: '2018-10-23T15:00:34.356Z',
            },
            id_master: '1694',
            message: 'upload ok',
            hints: {
              folder: 'pass',
            },
            batch_summary: {
              NA: {
                reads_num: 3842,
                exit_status: {
                  'Workflow successful': 3655,
                  'No alignment found': 187,
                },
                seqlen: 21252771,
                run_ids: {
                  '738d663ef9214e590fb4806bf5aed784b941fd48': 3842,
                },
              },
              seqlen: 21252771,
              reads_num: 3842,
            },
            data_files: [
              '0F95872C-D6D2-11E8-9DBC-0371A22B323C/2185/182103/component-2/PASS/fastq_runid_738d663ef9214e590fb4806bf5aed784b941fd48_1.fastq.data.json',
            ],
            src_prefix:
              '0F95872C-D6D2-11E8-9DBC-0371A22B323C/2185/182103/component-1/PASS/fastq_runid_738d663ef9214e590fb4806bf5aed784b941fd48_1.fastq/',
            tgt_prefix: '0F95872C-D6D2-11E8-9DBC-0371A22B323C/2185/182103/component-2/PASS/',
            id_user: '2185',
          },
          agent_address: {
            remote_addr: '193.240.53.18, 10.132.3.56',
          },
          id_master: '1694',
        }),
      },
      () => {},
    );

    assert.strictEqual(
      client.initiateDownloadStream.args[0][2],
      path.join(tmpDir.name, '1234567/PASS/fastq_runid_738d663ef9214e590fb4806bf5aed784b941fd48_1.fastq.bam'),
      'initiateDownloadStream argument',
    );
    assert.strictEqual(fs.mkdirp.args[0][0], path.join(tmpDir.name, '1234567', 'PASS'), 'mkdirpSync argument');
    tmpDir.removeCallback();
  });
});
