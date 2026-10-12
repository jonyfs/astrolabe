import { describe, expect, test } from 'vitest';

import {
  formatLoadTestReport,
  generateSyntheticFeatures,
} from '../../src/load-test/runner.js';
import type {
  LoadTestReport,
  LoadTestConfig,
  LoadTestResults,
} from '../../src/types/quality-distribution.js';

function reportOf(overrides: {
  passed?: boolean;
  results?: Partial<LoadTestResults>;
} = {}): LoadTestReport {
  const config: LoadTestConfig = {
    featureCount: 10,
    distribution: { simple: 0.5, medium: 0.3, complex: 0.2 },
    timeoutMs: 5000,
    memoryLimitMB: 1024,
    parallel: false,
  };
  const results: LoadTestResults = {
    totalDurationMs: 12345,
    peakMemoryMB: 256.5,
    avgCpuPercent: 42.25,
    successCount: 40,
    failureCount: 0,
    errors: [],
    phaseTimings: [
      { phase: 'parse', durationMs: 1000, avgPerFeatureMs: 100 },
      { phase: 'plan', durationMs: 5000, avgPerFeatureMs: 500 },
    ],
    ...overrides.results,
  };
  return {
    id: 'load-test-1',
    timestamp: '2026-01-01T00:00:00.000Z',
    featureCount: 10,
    config,
    results,
    passed: overrides.passed ?? true,
  };
}

describe('formatLoadTestReport', () => {
  test('passed report shows PASSED header and metrics', () => {
    const md = formatLoadTestReport(reportOf({ passed: true }));
    expect(md).toContain('## Load Test Report: ✅ PASSED');
    expect(md).toContain('**Run ID**: load-test-1');
    expect(md).toContain('**Features**: 10');
    expect(md).toContain('**Duration**: 12.3s');
    expect(md).toContain('**Peak Memory**: 256.5MB');
    expect(md).toContain('**Failures**: 0');
  });

  test('failed report shows FAILED header', () => {
    const md = formatLoadTestReport(reportOf({ passed: false }));
    expect(md).toContain('## Load Test Report: ❌ FAILED');
  });

  test('renders one table row per phase timing', () => {
    const md = formatLoadTestReport(reportOf());
    expect(md).toContain('| Phase | Duration | Avg/Feature |');
    expect(md).toContain('| parse | 1.0s | 100.0ms |');
    expect(md).toContain('| plan | 5.0s | 500.0ms |');
  });

  test('no errors section when errors list is empty', () => {
    const md = formatLoadTestReport(reportOf());
    expect(md).not.toContain('### Errors');
  });

  test('errors listed up to 10, remainder summarized', () => {
    const errors = Array.from({ length: 15 }, (_, i) => ({
      featureId: `f-${i}`,
      phase: 'plan',
      error: `boom ${i}`,
    }));
    const md = formatLoadTestReport(
      reportOf({ passed: false, results: { errors, failureCount: 15 } })
    );
    expect(md).toContain('### Errors');
    expect(md).toContain('- **f-0** (plan): boom 0');
    expect(md).toContain('- **f-9** (plan): boom 9');
    expect(md).not.toContain('f-10');
    expect(md).toContain('... and 5 more');
  });

  test('exactly 10 errors shows no remainder line', () => {
    const errors = Array.from({ length: 10 }, (_, i) => ({
      featureId: `f-${i}`,
      phase: 'parse',
      error: 'x',
    }));
    const md = formatLoadTestReport(reportOf({ results: { errors } }));
    expect(md).toContain('- **f-9** (parse): x');
    expect(md).not.toContain('... and');
  });

  test('includes serialized config at the end', () => {
    const md = formatLoadTestReport(reportOf());
    expect(md).toContain('**Config**:');
    expect(md).toContain('"memoryLimitMB": 1024');
  });
});

describe('generateSyntheticFeatures', () => {
  test('produces the requested total count', async () => {
    const features = await generateSyntheticFeatures(10, {
      simple: 0.5,
      medium: 0.3,
      complex: 0.2,
    });
    expect(features).toHaveLength(10);
  });

  test('complex count absorbs rounding remainder', async () => {
    const features = await generateSyntheticFeatures(3, {
      simple: 0.34,
      medium: 0.33,
      complex: 0.33,
    });
    expect(features).toHaveLength(3);
    // round(1.02)=1 simple, round(0.99)=1 medium, complex gets the rest
    const byComplexity = (c: string) =>
      features.filter((f) => f.complexity === c).length;
    expect(byComplexity('simple')).toBe(1);
    expect(byComplexity('medium')).toBe(1);
    expect(byComplexity('complex')).toBe(1);
  });

  test('zero count returns an empty array', async () => {
    const features = await generateSyntheticFeatures(0, {
      simple: 0.5,
      medium: 0.3,
      complex: 0.2,
    });
    expect(features).toEqual([]);
  });

  test('all-complex distribution yields only complex features', async () => {
    const features = await generateSyntheticFeatures(4, {
      simple: 0,
      medium: 0,
      complex: 1,
    });
    expect(features).toHaveLength(4);
    expect(features.every((f) => f.complexity === 'complex')).toBe(true);
    expect(features.every((f) => f.requirements.length === 10)).toBe(true);
  });

  test('generated features carry ids, specs and stories matching complexity', async () => {
    const features = await generateSyntheticFeatures(3, {
      simple: 1,
      medium: 0,
      complex: 0,
    });
    for (const f of features) {
      expect(f.complexity).toBe('simple');
      expect(f.id).toMatch(/^feature-simple-\d+$/);
      expect(f.spec).toContain(`# Simple Feature`);
      expect(f.requirements).toEqual(['FR-001', 'FR-002']);
      expect(f.userStories).toEqual(['US1']);
    }
  });
});
