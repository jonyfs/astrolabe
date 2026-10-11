import { describe, it, expect } from 'vitest';
import { LoadTestReport, LoadTestConfig, LoadTestResults, PhaseTiming } from '../../src/types/quality-distribution.js';

describe('Load Test Contract', () => {
  it('should validate load test config structure', () => {
    const config: LoadTestConfig = {
      featureCount: 500,
      distribution: { simple: 0.3, medium: 0.5, complex: 0.2 },
      timeoutMs: 30000,
      memoryLimitMB: 512,
      parallel: false,
    };

    expect(config.featureCount).toBeGreaterThan(0);
    expect(config.distribution.simple + config.distribution.medium + config.distribution.complex).toBeCloseTo(1.0);
    expect(config.timeoutMs).toBeGreaterThan(0);
    expect(config.memoryLimitMB).toBeGreaterThan(0);
  });

  it('should validate load test report structure', () => {
    const report: LoadTestReport = {
      id: 'load-test-123',
      timestamp: new Date().toISOString(),
      featureCount: 500,
      config: {
        featureCount: 500,
        distribution: { simple: 0.3, medium: 0.5, complex: 0.2 },
        timeoutMs: 30000,
        memoryLimitMB: 512,
        parallel: false,
      },
      results: {
        totalDurationMs: 300000,
        peakMemoryMB: 256,
        avgCpuPercent: 45,
        successCount: 500,
        failureCount: 0,
        errors: [],
        phaseTimings: [
          { phase: 'parse', durationMs: 50000, avgPerFeatureMs: 100 },
          { phase: 'validate', durationMs: 80000, avgPerFeatureMs: 160 },
          { phase: 'plan', durationMs: 100000, avgPerFeatureMs: 200 },
          { phase: 'tasks', durationMs: 70000, avgPerFeatureMs: 140 },
        ],
      },
      passed: true,
    };

    expect(report.id).toBeDefined();
    expect(report.results.successCount + report.results.failureCount).toBe(report.featureCount);
    expect(report.passed).toBe(true);
  });

  it('should validate phase timing structure', () => {
    const timing: PhaseTiming = {
      phase: 'parse',
      durationMs: 50000,
      avgPerFeatureMs: 100,
    };

    expect(timing.phase).toBeDefined();
    expect(timing.durationMs).toBeGreaterThan(0);
    expect(timing.avgPerFeatureMs).toBeGreaterThan(0);
  });
});