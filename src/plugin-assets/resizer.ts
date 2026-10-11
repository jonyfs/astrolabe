import sharp from 'sharp';
import { writeFile, mkdir, readFile, readdir } from 'node:fs/promises';
import { join, dirname, basename, extname } from 'node:path';

export interface MarketplaceSpecs {
  widths: number[];
  heights: number[];
  formats: string[];
  maxSizeKB: number;
  namingPattern: string;
}

export const MARKETPLACE_SPECS: Record<string, MarketplaceSpecs> = {
  vscode: {
    widths: [128],
    heights: [128],
    formats: ['png'],
    maxSizeKB: 200,
    namingPattern: 'icon.png',
  },
  jetbrains: {
    widths: [128],
    heights: [128],
    formats: ['png'],
    maxSizeKB: 200,
    namingPattern: 'icon.png',
  },
  chrome: {
    widths: [128],
    heights: [128],
    formats: ['png'],
    maxSizeKB: 100,
    namingPattern: 'icon.png',
  },
};

export interface AssetVariant {
  marketplace: string;
  type: string;
  width: number;
  height: number;
  format: string;
  outputPath: string;
}

export async function resizeAsset(
  sourcePath: string,
  variants: AssetVariant[]
): Promise<string[]> {
  const outputPaths: string[] = [];
  const image = sharp(await readFile(sourcePath));

  for (const variant of variants) {
    await mkdir(dirname(variant.outputPath), { recursive: true });
    
    await image
      .clone()
      .resize(variant.width, variant.height, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .toFormat(variant.format as any)
      .toFile(variant.outputPath);

    outputPaths.push(variant.outputPath);
  }

  return outputPaths;
}

export function generateVariants(
  sourcePath: string,
  marketplace: string,
  type: 'icon' | 'banner' | 'screenshot'
): AssetVariant[] {
  const specs = MARKETPLACE_SPECS[marketplace];
  if (!specs) {
    throw new Error(`Unknown marketplace: ${marketplace}`);
  }

  const baseName = basename(sourcePath, extname(sourcePath));
  const outputDir = `docs/assets/marketplace/${marketplace}/${type}`;
  
  const variants: AssetVariant[] = [];

  for (const width of specs.widths) {
    for (const height of specs.heights) {
      for (const format of specs.formats) {
        const outputPath = join(outputDir, `${baseName}-${width}x${height}.${format}`);
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

  return variants;
}

export async function validateAssetSize(
  path: string,
  maxSizeKB: number
): Promise<{ valid: boolean; sizeKB: number }> {
  const stats = await import('node:fs/promises').then(m => m.stat(path));
  const sizeKB = stats.size / 1024;
  return { valid: sizeKB <= maxSizeKB, sizeKB };
}