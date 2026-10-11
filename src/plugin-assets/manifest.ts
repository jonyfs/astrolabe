import { PluginAsset } from '../types/quality-distribution.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface PluginAssetManifest {
  generatedAt: string;
  assetCount: number;
  assets: PluginAsset[];
}

export async function writePluginAssetManifest(
  manifestPath: string,
  assets: PluginAsset[]
): Promise<PluginAssetManifest> {
  await mkdir(dirname(manifestPath), { recursive: true });

  const manifest: PluginAssetManifest = {
    generatedAt: new Date().toISOString(),
    assetCount: assets.length,
    assets,
  };

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  return manifest;
}