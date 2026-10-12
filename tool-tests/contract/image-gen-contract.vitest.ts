import { describe, it, expect } from 'vitest';
import { GeneratedImage } from '../../src/types/quality-distribution.js';

describe('Image Generation Contract', () => {
  it('should validate generated image structure', () => {
    const image: GeneratedImage = {
      id: 'img-test-123',
      sourcePath: 'docs/diagrams/arch.mmd',
      outputPath: 'docs/images/arch.png',
      format: 'png',
      generator: 'mermaid',
      checksum: 'abc123',
      generatedAt: new Date().toISOString(),
    };

    expect(image.id).toBeDefined();
    expect(['png', 'svg', 'webp']).toContain(image.format);
    expect(['mermaid', 'playwright', 'custom']).toContain(image.generator);
    expect(image.checksum).toBeDefined();
  });

  it('should validate image metadata', () => {
    const image: GeneratedImage = {
      id: 'img-test-123',
      sourcePath: 'docs/diagrams/arch.mmd',
      outputPath: 'docs/images/arch.png',
      format: 'png',
      generator: 'mermaid',
      checksum: 'abc123',
      metadata: {
        width: 1280,
        height: 720,
        viewport: { width: 1280, height: 720 },
        selector: '.diagram',
      },
      generatedAt: new Date().toISOString(),
    };

    expect(image.metadata?.width).toBeGreaterThan(0);
    expect(image.metadata?.height).toBeGreaterThan(0);
  });
});