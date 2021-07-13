import type { Logger } from '../Logger.type';

export interface SplitStyle {
  maxChunkBytes?: number;
  maxChunkReads?: number;
}

export interface Chunk {
  bytes: number;
  reads: number;
  location: string;
  writer: NodeJS.WritableStream;
  closed: Promise<void>;
  error?: unknown;
}

export type Splitter = (
  location: string,
  style: SplitStyle,
  handler: (location: string) => Promise<void>,
  logger: Logger,
) => Promise<void>;
