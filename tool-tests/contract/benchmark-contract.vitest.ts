import { describe, it, expect } from 'vitest';
import { BenchmarkMetrics, BenchmarkResult } from '../../src/types/quality-distribution.js';

describe('Benchmark Contract', () => {
  it('should validate benchmark metrics structure', () => {
    const metrics: BenchmarkMetrics = {
      durationMs: 1000,
      peakMemoryMB: 100,
      cpuPercent: 15,
      customMetrics: {
        'page-load-ms': 250,
        'bundle-size-kb': 150,
      },
    };

    expect(metrics.durationMs).toBeGreaterThan(0);
    expect(metrics.peakMemoryMB).toBeGreaterThan(0);
    expect(metrics.cpuPercent).toBeGreaterThanOrEqual(0);
  });

  it('should validate benchmark result structure', () => {
    const result: BenchmarkResult = {
      id: 'bench-test-123',
      timestamp: new Date().toISOString(),
      branch: 'main',
      commit: 'abc123',
      metrics: {
        durationMs: 1000,
        peakMemoryMB: 100,
        cpuPercent: 15,
        customMetrics: {},
      },
      baseline: {
        durationMs: 900,
        peakMemoryMB: 95,
        cpuPercent: 10,
        customMetrics: {},
      },
      comparison: {
        regressions: ['durationMs'],
        improvements: [],
        stable: ['peakMemoryMB', 'cpuPercent'],
        details: {
          durationMs: {
            current: 1000,
            baseline: 900,
            deltaPercent: 11.1,
            status: 'regression',
          },
        },
      },
      passed: false,
      threshold: 10,
    };

    expect(result.id).toBeDefined();
    expect(result.passed).toBe(false);
    expect(result.comparison.regressions).toContain('durationMs');
  });
});