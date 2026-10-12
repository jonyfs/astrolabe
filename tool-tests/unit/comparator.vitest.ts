import { describe, expect, test } from 'vitest';

import {
  compareBenchmarks,
  loadBaseline,
  saveBaseline,
} from '../../src/benchmark/comparator.js';
import type { BenchmarkMetrics } from '../../src/types/quality-distribution.js';

function metrics(overrides: Partial<BenchmarkMetrics> = {}): BenchmarkMetrics {
  return {
    durationMs: 100,
    peakMemoryMB: 50,
    cpuPercent: 10,
    customMetrics: {},
    ...overrides,
  };
}

describe('compareBenchmarks', () => {
  test('identical metrics are all stable', () => {
    const a = metrics({ customMetrics: { throughput: 100 } });
    const r = compareBenchmarks(a, a);
    expect(r.regressions).toEqual([]);
    expect(r.improvements).toEqual([]);
    expect(r.stable).toContain('durationMs');
    expect(r.stable).toContain('peakMemoryMB');
    expect(r.stable).toContain('cpuPercent');
    expect(r.stable).toContain('throughput');
    expect(Object.keys(r.details)).toHaveLength(4);
  });

  test('delta exactly at threshold stays stable (boundary is strict >)', () => {
    const current = metrics({ durationMs: 110 });
    const baseline = metrics({ durationMs: 100 });
    const r = compareBenchmarks(current, baseline, 10);
    expect(r.regressions).toEqual([]);
    expect(r.stable).toContain('durationMs');
    expect(r.details.durationMs!.status).toBe('stable');
  });

  test('delta one tick above threshold is a regression for durationMs', () => {
    const current = metrics({ durationMs: 111 });
    const baseline = metrics({ durationMs: 100 });
    const r = compareBenchmarks(current, baseline, 10);
    expect(r.regressions).toContain('durationMs');
  });

  test('negative-good keys: lowercase duration/memory/size/time keys regress on increase', () => {
    const current = metrics({
      customMetrics: { bundle_size: 200, render_time: 150 },
    });
    const baseline = metrics({
      customMetrics: { bundle_size: 100, render_time: 100 },
    });
    const r = compareBenchmarks(current, baseline, 10);
    expect(r.regressions).toContain('bundle_size');
    expect(r.regressions).toContain('render_time');
    expect(r.improvements).toEqual([]);
  });

  test('keyword match is case-sensitive: peakMemoryMB treated as positive-good', () => {
    // 'peakMemoryMB' does not contain lowercase 'memory', so an increase
    // reads as an improvement rather than a regression.
    const current = metrics({ peakMemoryMB: 100, cpuPercent: 50 });
    const baseline = metrics({ peakMemoryMB: 50, cpuPercent: 25 });
    const r = compareBenchmarks(current, baseline, 10);
    expect(r.improvements).toContain('peakMemoryMB');
  });

  test('camelCase renderTime misses the lowercase time keyword (positive-good)', () => {
    const up = compareBenchmarks(
      metrics({ customMetrics: { renderTime: 200 } }),
      metrics({ customMetrics: { renderTime: 100 } }),
      10
    );
    expect(up.improvements).toContain('renderTime');
  });

  test('negative-good keys: decrease beyond threshold is improvement', () => {
    const current = metrics({ durationMs: 50 });
    const baseline = metrics({ durationMs: 100 });
    const r = compareBenchmarks(current, baseline, 10);
    expect(r.improvements).toContain('durationMs');
    expect(r.regressions).toEqual([]);
  });

  test('positive-good custom metric: increase is improvement, decrease is regression', () => {
    const up = compareBenchmarks(
      metrics({ customMetrics: { throughput: 200 } }),
      metrics({ customMetrics: { throughput: 100 } })
    );
    expect(up.improvements).toContain('throughput');

    const down = compareBenchmarks(
      metrics({ customMetrics: { throughput: 50 } }),
      metrics({ customMetrics: { throughput: 100 } })
    );
    expect(down.regressions).toContain('throughput');
  });

  test('keys present on only one side are skipped entirely', () => {
    const current = metrics({ customMetrics: { newMetric: 1 } });
    const baseline = metrics({ customMetrics: { oldMetric: 1 } });
    const r = compareBenchmarks(current, baseline);
    expect(r.details.newMetric).toBeUndefined();
    expect(r.details.oldMetric).toBeUndefined();
    expect(r.stable).not.toContain('newMetric');
    expect(r.stable).not.toContain('oldMetric');
  });

  test('zero baseline yields Infinity delta and flags regression on increase', () => {
    const current = metrics({ durationMs: 5 });
    const baseline = metrics({ durationMs: 0 });
    const r = compareBenchmarks(current, baseline, 10);
    expect(r.details.durationMs!.deltaPercent).toBe(Infinity);
    expect(r.regressions).toContain('durationMs');
  });

  test('zero baseline with zero current yields NaN delta, treated stable', () => {
    const r = compareBenchmarks(metrics({ durationMs: 0 }), metrics({ durationMs: 0 }), 10);
    expect(r.details.durationMs!.deltaPercent).toBeNaN();
    expect(r.stable).toContain('durationMs');
  });

  test('empty customMetrics on both sides still compares core metrics', () => {
    const r = compareBenchmarks(metrics(), metrics());
    expect(Object.keys(r.details).sort()).toEqual(['cpuPercent', 'durationMs', 'peakMemoryMB']);
  });

  test('custom threshold of 0 flags any non-zero change', () => {
    const current = metrics({ durationMs: 101 });
    const baseline = metrics({ durationMs: 100 });
    const r = compareBenchmarks(current, baseline, 0);
    expect(r.regressions).toContain('durationMs');
  });
});

describe('loadBaseline / saveBaseline', () => {
  test('loadBaseline returns null for a missing file', () => {
    expect(loadBaseline('/nonexistent/path/baseline.json')).toBeNull();
  });

  test('loadBaseline returns null for malformed JSON', async () => {
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');
    const tmp = path.join(os.tmpdir(), `astro-bad-baseline-${process.pid}.json`);
    fs.writeFileSync(tmp, '{not json');
    try {
      expect(loadBaseline(tmp)).toBeNull();
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  test('saveBaseline + loadBaseline roundtrip preserves metrics', async () => {
    const os = await import('node:os');
    const path = await import('node:path');
    const fs = await import('node:fs');
    const tmp = path.join(os.tmpdir(), `astro-baseline-${process.pid}.json`);
    const m = metrics({ customMetrics: { sizeBytes: 123 } });
    try {
      saveBaseline(tmp, m);
      expect(loadBaseline(tmp)).toEqual(m);
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  });
});
