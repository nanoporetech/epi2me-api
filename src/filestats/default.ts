import fs from 'fs';
import type { DefaultStats } from './filestats.type';

export async function genericFileStatistics(filePath: string): Promise<DefaultStats> {
  const { size: bytes } = await fs.promises.stat(filePath);
  return { type: 'bytes', bytes };
}
