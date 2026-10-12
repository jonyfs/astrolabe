import { describe, it, expect } from 'vitest';
import { PluginAsset, AssetSpecs } from '../../src/types/quality-distribution.js';

describe('Plugin Assets Contract', () => {
  it('should validate plugin asset structure', () => {
    const asset: PluginAsset = {
      id: 'asset-test-123',
      marketplace: 'vscode',
      type: 'icon',
      sourcePath: 'docs/assets/source/logo.png',
      outputPaths: ['docs/assets/marketplace/vscode/icon/logo-128x128.png'],
      specs: {
        widths: [128],
        heights: [128],
        formats: ['png'],
        maxSizeKB: 200,
        namingPattern: 'logo-{width}x{height}.{format}',
      },
      generatedAt: new Date().toISOString(),
    };

    expect(asset.id).toBeDefined();
    expect(['vscode', 'jetbrains', 'chrome']).toContain(asset.marketplace);
    expect(['icon', 'banner', 'screenshot', 'description']).toContain(asset.type);
    expect(asset.outputPaths.length).toBeGreaterThan(0);
  });

  it('should validate asset specs', () => {
    const specs: AssetSpecs = {
      widths: [128, 256],
      heights: [128, 256],
      formats: ['png', 'webp'],
      maxSizeKB: 200,
      namingPattern: 'icon-{width}x{height}.{format}',
    };

    expect(specs.widths.length).toBeGreaterThan(0);
    expect(specs.heights.length).toBeGreaterThan(0);
    expect(specs.formats.length).toBeGreaterThan(0);
    expect(specs.maxSizeKB).toBeGreaterThan(0);
  });
});