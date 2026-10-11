import { GeneratedImage } from '../types/quality-distribution.js';
import { fileHash } from '../lib/file-hash.js';
import { writeFile, mkdir, readFile, readdir } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface MermaidRendererOptions {
  inputDir: string;
  outputDir: string;
  formats?: ('png' | 'svg' | 'webp')[];
  onlyChanged?: boolean;
}

export async function renderMermaidDiagrams(
  options: MermaidRendererOptions
): Promise<GeneratedImage[]> {
  const { inputDir, outputDir, formats = ['png', 'svg'], onlyChanged = true } = options;

  await mkdir(outputDir, { recursive: true });

  const files = await readdir(inputDir);
  const mmdFiles = files.filter(f => extname(f) === '.mmd');

  const results: GeneratedImage[] = [];

  for (const file of mmdFiles) {
    const sourcePath = join(inputDir, file);
    const baseName = basename(file, '.mmd');

    for (const format of formats) {
      const outputPath = join(outputDir, `${baseName}.${format}`);
      
      if (onlyChanged) {
        const sourceHash = await fileHash(sourcePath);
        const existingHash = await getExistingHash(outputPath);
        
        if (sourceHash === existingHash) {
          continue;
        }
      }

      await renderMermaidFile(sourcePath, outputPath, format);

      const checksum = await fileHash(outputPath);
      
      results.push({
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sourcePath,
        outputPath,
        format,
        generator: 'mermaid',
        checksum,
        generatedAt: new Date().toISOString(),
      });
    }
  }

  return results;
}

async function renderMermaidFile(
  inputPath: string,
  outputPath: string,
  format: 'png' | 'svg' | 'webp'
): Promise<void> {
  const args = ['-i', inputPath, '-o', outputPath];
  
  if (format === 'svg') {
    args.push('--outputFormat', 'svg');
  } else if (format === 'png') {
    args.push('--outputFormat', 'png');
  } else if (format === 'webp') {
    args.push('--outputFormat', 'png'); // mermaid doesn't support webp directly
  }

  try {
    await execFileAsync('mmdc', args);
  } catch (error) {
    throw new Error(`Mermaid rendering failed for ${inputPath}: ${error}`);
  }
}

async function getExistingHash(path: string): Promise<string | null> {
  try {
    return await fileHash(path);
  } catch {
    return null;
  }
}

export async function findMermaidSources(dir: string): Promise<string[]> {
  const files = await readdir(dir);
  return files
    .filter(f => extname(f) === '.mmd')
    .map(f => join(dir, f));
}