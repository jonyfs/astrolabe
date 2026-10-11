import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { GeneratedImage } from '../types/quality-distribution.js';
import type { CaptureArtifact } from '../types/quality-distribution.js';
import type { PluginAsset } from '../types/quality-distribution.js';

export interface ManifestEntry {
  id: string;
  path: string;
  timestamp: string;
  [key: string]: unknown;
}

export async function writeManifest<T extends ManifestEntry>(
  manifestPath: string,
  entries: T[]
): Promise<void> {
  await mkdir(dirname(manifestPath), { recursive: true });
  const manifest = {
    generatedAt: new Date().toISOString(),
    entryCount: entries.length,
    entries,
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

export async function writeImageManifest(
  manifestPath: string,
  images: GeneratedImage[]
): Promise<void> {
  await writeManifest(manifestPath, images);
}

export async function writeCaptureManifest(
  manifestPath: string,
  captures: CaptureArtifact[]
): Promise<void> {
  await writeManifest(manifestPath, captures);
}

export async function writePluginAssetManifest(
  manifestPath: string,
  assets: PluginAsset[]
): Promise<void> {
  await writeManifest(manifestPath, assets);
}