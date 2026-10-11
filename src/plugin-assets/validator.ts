import { PluginAsset, AssetSpecs } from '../types/quality-distribution.js';
import { MARKETPLACE_SPECS } from './specs.js';
import { validateAssetSize } from './resizer.js';
import { writeFile, mkdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';

export interface AssetValidationResult {
  asset: PluginAsset;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export async function validatePluginAsset(asset: PluginAsset): Promise<AssetValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const specs = MARKETPLACE_SPECS[asset.marketplace];
  if (!specs) {
    errors.push(`Unknown marketplace: ${asset.marketplace}`);
    return { asset, valid: false, errors, warnings };
  }

  const typeSpecs = specs[asset.type as keyof typeof specs];
  if (!typeSpecs) {
    errors.push(`Unknown asset type: ${asset.type} for marketplace: ${asset.marketplace}`);
    return { asset, valid: false, errors, warnings };
  }

  for (const outputPath of asset.outputPaths) {
    try {
      const sizeCheck = await validateAssetSize(outputPath, typeSpecs.maxSizeKB);
      if (!sizeCheck.valid) {
        errors.push(`${outputPath}: ${sizeCheck.sizeKB.toFixed(1)}KB exceeds max ${typeSpecs.maxSizeKB}KB`);
      }
    } catch {
      errors.push(`${outputPath}: File not found or inaccessible`);
    }
  }

  if (asset.type === 'icon') {
    if (asset.outputPaths.length !== 1) {
      warnings.push('Icon should have exactly 1 output file');
    }
  }

  if (asset.type === 'screenshot') {
    if (asset.outputPaths.length > 10) {
      warnings.push('More than 10 screenshots may exceed marketplace limits');
    }
  }

  return {
    asset,
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export async function validateAllAssets(assets: PluginAsset[]): Promise<{
  results: AssetValidationResult[];
  allValid: boolean;
  summary: { total: number; valid: number; invalid: number };
}> {
  const results = await Promise.all(assets.map(validatePluginAsset));
  const valid = results.filter(r => r.valid).length;
  const invalid = results.filter(r => !r.valid).length;

  return {
    results,
    allValid: invalid === 0,
    summary: { total: results.length, valid, invalid },
  };
}

export interface PluginAssetManifest {
  generatedAt: string;
  assetCount: number;
  assets: PluginAsset[];
  validation: {
    allValid: boolean;
    summary: { total: number; valid: number; invalid: number };
  };
}

export async function writePluginAssetManifest(
  manifestPath: string,
  assets: PluginAsset[],
  validationResults: AssetValidationResult[]
): Promise<PluginAssetManifest> {
  await mkdir(dirname(manifestPath), { recursive: true });

  const validation = await validateAllAssets(assets);

  const manifest: PluginAssetManifest = {
    generatedAt: new Date().toISOString(),
    assetCount: assets.length,
    assets,
    validation: validation,
  };

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  return manifest;
}