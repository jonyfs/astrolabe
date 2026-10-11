import { GeneratedImage } from '../types/quality-distribution.js';
import { fileHash } from '../lib/file-hash.js';
import { writeFile, mkdir, readFile, readdir } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { chromium } from 'playwright';

export interface PlaywrightRendererOptions {
  inputDir: string;
  outputDir: string;
  formats?: ('png' | 'webp')[];
  onlyChanged?: boolean;
  viewport?: { width: number; height: number };
}

export async function renderPlaywrightSources(
  options: PlaywrightRendererOptions
): Promise<GeneratedImage[]> {
  const { inputDir, outputDir, formats = ['png'], onlyChanged = true, viewport = { width: 1280, height: 720 } } = options;

  await mkdir(outputDir, { recursive: true });

  const files = await readdir(inputDir);
  const htmlFiles = files.filter(f => extname(f) === '.html' || extname(f) === '.tsx');

  const results: GeneratedImage[] = [];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize(viewport);

  for (const file of htmlFiles) {
    const sourcePath = join(inputDir, file);
    const baseName = basename(file, extname(file));

    for (const format of formats) {
      const outputPath = join(outputDir, `${baseName}.${format}`);
      
      if (onlyChanged) {
        const sourceHash = await fileHash(sourcePath);
        const existingHash = await getExistingHash(outputPath);
        
        if (sourceHash === existingHash) {
          continue;
        }
      }

      await renderHtmlFile(page, sourcePath, outputPath, format);

      const checksum = await fileHash(outputPath);
      
      results.push({
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sourcePath,
        outputPath,
        format,
        generator: 'playwright',
        checksum,
        metadata: {
          width: viewport.width,
          height: viewport.height,
          viewport,
        },
        generatedAt: new Date().toISOString(),
      });
    }
  }

  await browser.close();

  return results;
}

async function renderHtmlFile(
  page: any,
  inputPath: string,
  outputPath: string,
  format: 'png' | 'webp'
): Promise<void> {
  const fileUrl = `file://${inputPath}`;
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  await page.screenshot({
    path: outputPath,
    fullPage: true,
    type: format,
  });
}

async function getExistingHash(path: string): Promise<string | null> {
  try {
    return await fileHash(path);
  } catch {
    return null;
  }
}

export async function findPlaywrightSources(dir: string): Promise<string[]> {
  const files = await readdir(dir);
  return files
    .filter(f => extname(f) === '.html' || extname(f) === '.tsx')
    .map(f => join(dir, f));
}