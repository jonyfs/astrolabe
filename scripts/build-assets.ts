#!/usr/bin/env tsx

import { program } from 'commander';
import { resizeAsset, generateVariants } from '../src/plugin-assets/resizer.js';
import { MARKETPLACE_SPECS } from '../src/plugin-assets/specs.js';
import { writePluginAssetManifest, validateAllAssets } from '../src/plugin-assets/validator.js';
import { PluginAsset } from '../src/types/quality-distribution.js';
import { writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname, basename, extname } from 'node:path';

program
  .name('build-assets')
  .description('Build plugin marketplace assets')
  .option('-m, --manifest <path>', 'Path to plugin manifest (package.json)', 'package.json')
  .option('-s, --source-dir <path>', 'Source assets directory', 'docs/assets/source')
  .option('-o, --output-dir <path>', 'Output directory for marketplace assets', 'docs/assets/marketplace')
  .option('--marketplaces <marketplaces...>', 'Target marketplaces', ['vscode', 'jetbrains', 'chrome']);

program.parse();

const options = program.opts();

async function main() {
  console.log(`Building assets for marketplaces: ${options.marketplaces.join(', ')}`);
  console.log(`Source: ${options.sourceDir}`);
  console.log(`Output: ${options.outputDir}`);

  await mkdir(options.outputDir, { recursive: true });

  const sourceFiles = await readdir(options.sourceDir).catch(() => []);
  if (sourceFiles.length === 0) {
    console.error(`No source files found in ${options.sourceDir}`);
    console.log('Create source assets (logo.png, banner.png, screenshots/) first');
    process.exit(1);
  }

  const assets: PluginAsset[] = [];

  for (const marketplace of options.marketplaces) {
    const specs = MARKETPLACE_SPECS[marketplace];
    if (!specs) {
      console.warn(`Unknown marketplace: ${marketplace}`);
      continue;
    }

    for (const sourceFile of sourceFiles) {
      const sourcePath = join(options.sourceDir, sourceFile);
      const baseName = basename(sourceFile, extname(sourceFile));
      const type = detectAssetType(baseName);

      if (!type) continue;

      const typeSpecs = specs[type];
      if (!typeSpecs) continue;

      const variants = [];
      for (const width of typeSpecs.widths) {
        for (const height of typeSpecs.heights) {
          for (const format of typeSpecs.formats) {
            const outputPath = join(options.outputDir, marketplace, type, `${baseName}-${width}x${height}.${format}`);
            variants.push({
              marketplace,
              type,
              width,
              height,
              format,
              outputPath,
            });
          }
        }
      }

      await resizeAsset(sourcePath, variants);

      const asset: PluginAsset = {
        id: `asset-${marketplace}-${type}-${baseName}-${Date.now()}`,
        marketplace: marketplace as any,
        type: type as any,
        sourcePath,
        outputPaths: variants.map(v => v.outputPath),
        specs: {
          widths: typeSpecs.widths,
          heights: typeSpecs.heights,
          formats: typeSpecs.formats,
          maxSizeKB: typeSpecs.maxSizeKB,
          namingPattern: `${baseName}-{width}x{height}.{format}`,
        },
        generatedAt: new Date().toISOString(),
      };

      assets.push(asset);
    }
  }

  const manifestPath = join(options.outputDir, 'manifest.json');
  const validation = await validateAllAssets(assets);
  
  await writePluginAssetManifest(manifestPath, assets);

  console.log(`\nGenerated ${assets.length} assets`);
  console.log(`Validation: ${validation.allValid ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Summary: ${validation.summary.valid}/${validation.summary.total} valid`);

  if (!validation.allValid) {
    for (const result of validation.results) {
      if (!result.valid) {
        console.error(`Asset ${result.asset.id}:`);
        for (const error of result.errors) {
          console.error(`  - ${error}`);
        }
      }
    }
    process.exit(1);
  }
}

function detectAssetType(name: string): 'icon' | 'banner' | 'screenshot' | null {
  const lower = name.toLowerCase();
  if (lower.includes('icon') || lower.includes('logo')) return 'icon';
  if (lower.includes('banner') || lower.includes('hero')) return 'banner';
  if (lower.includes('screenshot') || lower.includes('screen') || lower.includes('preview')) return 'screenshot';
  return null;
}

main().catch(err => {
  console.error('Asset building failed:', err);
  process.exit(1);
});