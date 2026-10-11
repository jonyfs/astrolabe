import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { ZodSchema } from 'zod';

export async function loadConfig<T>(configPath: string, schema: ZodSchema<T>): Promise<T> {
  const resolvedPath = configPath.startsWith('file://')
    ? fileURLToPath(configPath)
    : configPath;

  const content = await readFile(resolvedPath, 'utf-8');
  const parsed = JSON.parse(content);
  return schema.parse(parsed);
}

export async function loadConfigFromFile<T>(
  filePath: string,
  schema: ZodSchema<T>
): Promise<T> {
  const content = await readFile(filePath, 'utf-8');
  const parsed = JSON.parse(content);
  return schema.parse(parsed);
}