import { describe, it, expect } from 'vitest';
import { CaptureArtifact, CaptureView } from '../../src/types/quality-distribution.js';

describe('Capture Contract', () => {
  it('should validate capture artifact structure', () => {
    const artifact: CaptureArtifact = {
      id: 'cap-test-123',
      type: 'screenshot',
      view: 'dashboard',
      outputPath: 'docs/assets/captures/dashboard.png',
      format: 'png',
      viewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
      capturedAt: new Date().toISOString(),
    };

    expect(artifact.id).toBeDefined();
    expect(['screenshot', 'video']).toContain(artifact.type);
    expect(['png', 'webm', 'mp4']).toContain(artifact.format);
    expect(artifact.viewport.width).toBeGreaterThan(0);
    expect(artifact.viewport.height).toBeGreaterThan(0);
  });

  it('should validate video capture artifact', () => {
    const artifact: CaptureArtifact = {
      id: 'cap-test-123',
      type: 'video',
      view: 'demo',
      outputPath: 'docs/assets/captures/demo.webm',
      format: 'webm',
      viewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
      durationMs: 10000,
      capturedAt: new Date().toISOString(),
    };

    expect(artifact.type).toBe('video');
    expect(artifact.durationMs).toBeGreaterThan(0);
  });

  it('should validate capture view config', () => {
    const view: CaptureView = {
      name: 'dashboard',
      url: 'http://localhost:3000/dashboard',
      actions: [
        { type: 'wait', duration: 1000 },
      ],
      capture: {
        type: 'screenshot',
        viewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
      },
    };

    expect(view.name).toBeDefined();
    expect(view.url).toBeDefined();
    expect(view.capture.type).toBeDefined();
  });
});