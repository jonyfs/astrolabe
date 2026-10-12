import { describe, expect, test, beforeAll, afterAll } from 'vitest';

import {
  MARKETPLACE_SPECS,
  getSpecs,
  listMarketplaces,
} from '../../src/plugin-assets/specs.js';
import {
  validateAllAssets,
  validatePluginAsset,
} from '../../src/plugin-assets/validator.js';
import { generateVariants, validateAssetSize } from '../../src/plugin-assets/resizer.js';
import type { PluginAsset, AssetSpecs } from '../../src/types/quality-distribution.js';

const dummySpecs: AssetSpecs = {
  widths: [128],
  heights: [128],
  formats: ['png'],
  maxSizeKB: 200,
  namingPattern: 'icon.png',
};

function asset(overrides: Partial<PluginAsset> = {}): PluginAsset {
  return {
    id: 'a1',
    marketplace: 'vscode',
    type: 'icon',
    sourcePath: 'src.png',
    outputPaths: [],
    specs: dummySpecs,
    generatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('MARKETPLACE_SPECS invariants', () => {
  test('contains the three supported marketplaces', () => {
    expect(listMarketplaces().sort()).toEqual(['chrome', 'jetbrains', 'vscode']);
  });

  test('every marketplace has all four asset types', () => {
    for (const specs of Object.values(MARKETPLACE_SPECS)) {
      expect(specs).toHaveProperty('icon');
      expect(specs).toHaveProperty('banner');
      expect(specs).toHaveProperty('screenshot');
      expect(specs).toHaveProperty('description');
    }
  });

  test('all icons are 128x128 png', () => {
    for (const specs of Object.values(MARKETPLACE_SPECS)) {
      expect(specs.icon.widths).toEqual([128]);
      expect(specs.icon.heights).toEqual([128]);
      expect(specs.icon.formats).toEqual(['png']);
    }
  });

  test('maxSizeKB is positive everywhere and format is valid', () => {
    const formats = new Set(['markdown', 'html', 'text']);
    for (const specs of Object.values(MARKETPLACE_SPECS)) {
      expect(specs.icon.maxSizeKB).toBeGreaterThan(0);
      expect(specs.banner.maxSizeKB).toBeGreaterThan(0);
      expect(specs.screenshot.maxSizeKB).toBeGreaterThan(0);
      expect(specs.description.maxChars).toBeGreaterThan(0);
      expect(formats.has(specs.description.format)).toBe(true);
    }
  });

  test('getSpecs returns undefined for unknown marketplace or type', () => {
    expect(getSpecs('nope' as any, 'icon')).toBeUndefined();
    expect(getSpecs('vscode', 'nope' as any)).toBeUndefined();
    expect(getSpecs('vscode', 'icon')).toEqual(MARKETPLACE_SPECS.vscode!.icon);
  });
});

describe('validatePluginAsset / validateAllAssets', () => {
  test('unknown marketplace fails immediately with error', async () => {
    const r = await validatePluginAsset(asset({ marketplace: 'apple' as any }));
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('Unknown marketplace');
  });

  test('unknown asset type fails with error', async () => {
    const r = await validatePluginAsset(asset({ type: 'video' as any }));
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('Unknown asset type');
  });

  test('missing output file produces a not-found error', async () => {
    const r = await validatePluginAsset(
      asset({ outputPaths: ['/no/such/file-here.png'] })
    );
    expect(r.valid).toBe(false);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain('File not found or inaccessible');
  });

  test('icon with 0 or 2 output paths produces a warning, not an error', async () => {
    const r = await validatePluginAsset(asset({ type: 'icon', outputPaths: [] }));
    expect(r.warnings).toContain('Icon should have exactly 1 output file');
    expect(r.valid).toBe(true);
  });

  test('screenshot with more than 10 outputs warns', async () => {
    const paths = Array.from({ length: 11 }, (_, i) => `/no/such/s${i}.png`);
    const r = await validatePluginAsset(
      asset({ type: 'screenshot', outputPaths: paths })
    );
    expect(r.warnings).toContain(
      'More than 10 screenshots may exceed marketplace limits'
    );
  });

  test('validateAllAssets handles an empty list', async () => {
    const r = await validateAllAssets([]);
    expect(r.allValid).toBe(true);
    expect(r.summary).toEqual({ total: 0, valid: 0, invalid: 0 });
  });

  test('validateAllAssets counts valid and invalid correctly', async () => {
    const good = asset({ outputPaths: [] });
    const bad = asset({ id: 'bad', marketplace: 'apple' as any });
    const r = await validateAllAssets([good, bad]);
    expect(r.allValid).toBe(false);
    expect(r.summary).toEqual({ total: 2, valid: 1, invalid: 1 });
  });
});

describe('validateAssetSize', () => {
  let tmpDir: string;
  let smallPath: string;
  let bigPath: string;

  beforeAll(async () => {
    const fs = await import('node:fs/promises');
    const os = await import('node:os');
    const path = await import('node:path');
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'astro-assets-'));
    smallPath = path.join(tmpDir, 'small.bin');
    bigPath = path.join(tmpDir, 'big.bin');
    await fs.writeFile(smallPath, Buffer.alloc(1024)); // exactly 1 KB
    await fs.writeFile(bigPath, Buffer.alloc(300 * 1024)); // 300 KB
  });

  afterAll(async () => {
    const fs = await import('node:fs/promises');
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test('file exactly at the max boundary is valid (<=)', async () => {
    const r = await validateAssetSize(smallPath, 1);
    expect(r.valid).toBe(true);
    expect(r.sizeKB).toBe(1);
  });

  test('oversized file is invalid with measured size', async () => {
    const r = await validateAssetSize(bigPath, 200);
    expect(r.valid).toBe(false);
    expect(r.sizeKB).toBe(300);
  });

  test('missing file rejects', async () => {
    await expect(
      validateAssetSize('/no/such/file.bin', 100)
    ).rejects.toThrow();
  });
});

describe('generateVariants', () => {
  test('throws for an unknown marketplace', () => {
    expect(() => generateVariants('icon.png', 'apple', 'icon')).toThrow(
      /Unknown marketplace/
    );
  });

  test('produces width x height x format combinations with naming', () => {
    const variants = generateVariants('/assets/logo.png', 'vscode', 'icon');
    expect(variants).toHaveLength(1);
    const v = variants[0];
    expect(v).toMatchObject({
      marketplace: 'vscode',
      type: 'icon',
      width: 128,
      height: 128,
      format: 'png',
    });
    expect(v!.outputPath.replaceAll('\\', '/')).toContain('docs/assets/marketplace/vscode/icon');
    expect(v!.outputPath).toContain('logo-128x128.png');
  });

  test('strips the original extension from the base name', () => {
    const variants = generateVariants('icon.svg', 'chrome', 'icon');
    expect(variants[0]!.outputPath).not.toContain('.svg.png');
    expect(variants[0]!.outputPath).toContain('icon-128x128.png');
  });
});
