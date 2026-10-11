import { GeneratedImage } from '../types/quality-distribution.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface ImageGenerationManifest {
  generatedAt: string;
  imageCount: number;
  changed: boolean;
  images: GeneratedImage[];
}

export async function writeImageManifest(
  manifestPath: string,
  images: GeneratedImage[],
  previousManifestPath?: string
): Promise<ImageGenerationManifest> {
  await mkdir(dirname(manifestPath), { recursive: true });

  let changed = false;
  if (previousManifestPath) {
    try {
      const fs = require('node:fs');
      const prevContent = fs.readFileSync(previousManifestPath, 'utf-8');
      const prevManifest: ImageGenerationManifest = JSON.parse(prevContent);
      
      const prevMap = new Map(prevManifest.images.map(img => [img.sourcePath, img.checksum]));
      const currMap = new Map(images.map(img => [img.sourcePath, img.checksum]));
      
      for (const [source, checksum] of currMap) {
        if (prevMap.get(source) !== checksum) {
          changed = true;
          break;
        }
      }
      
      if (currMap.size !== prevMap.size) {
        changed = true;
      }
    } catch {
      changed = true;
    }
  } else {
    changed = images.length > 0;
  }

  const manifest: ImageGenerationManifest = {
    generatedAt: new Date().toISOString(),
    imageCount: images.length,
    changed,
    images,
  };

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  return manifest;
}

export async function readImageManifest(manifestPath: string): Promise<ImageGenerationManifest | null> {
  try {
    const fs = require('node:fs');
    const content = fs.readFileSync(manifestPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}