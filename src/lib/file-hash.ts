import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export async function fileHash(path: string): Promise<string> {
  const buffer = await readFile(path);
  return createHash('sha256').update(buffer).digest('hex');
}

export async function fileHashes(paths: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const path of paths) {
    result[path] = await fileHash(path);
  }
  return result;
}