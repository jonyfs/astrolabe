import { BenchmarkMetrics, BenchmarkComparison, MetricDelta } from '../types/quality-distribution.js';
import { readFileSync, writeFileSync } from 'node:fs';

export function compareBenchmarks(
  current: BenchmarkMetrics,
  baseline: BenchmarkMetrics,
  threshold = 10
): BenchmarkComparison {
  const regressions: string[] = [];
  const improvements: string[] = [];
  const stable: string[] = [];
  const details: Record<string, MetricDelta> = {};

  const allKeys = new Set([
    ...Object.keys(current.customMetrics),
    ...Object.keys(baseline.customMetrics),
    'durationMs',
    'peakMemoryMB',
    'cpuPercent',
  ]);

  for (const key of allKeys) {
    const currentVal = key === 'durationMs' ? current.durationMs
      : key === 'peakMemoryMB' ? current.peakMemoryMB
      : key === 'cpuPercent' ? current.cpuPercent
      : current.customMetrics[key];

    const baselineVal = key === 'durationMs' ? baseline.durationMs
      : key === 'peakMemoryMB' ? baseline.peakMemoryMB
      : key === 'cpuPercent' ? baseline.cpuPercent
      : baseline.customMetrics[key];

    if (currentVal === undefined || baselineVal === undefined) {
      continue;
    }

    const deltaPercent = ((currentVal - baselineVal) / baselineVal) * 100;
    let status: MetricDelta['status'] = 'stable';

    if (Math.abs(deltaPercent) > threshold) {
      const isNegativeGood = key.includes('duration') || key.includes('memory') || key.includes('cpu') || key.includes('size') || key.includes('time');
      
      if (isNegativeGood) {
        if (deltaPercent > 0) {
          status = 'regression';
          regressions.push(key);
        } else {
          status = 'improvement';
          improvements.push(key);
        }
      } else {
        if (deltaPercent > 0) {
          status = 'improvement';
          improvements.push(key);
        } else {
          status = 'regression';
          regressions.push(key);
        }
      }
    } else {
      stable.push(key);
    }

    details[key] = {
      current: currentVal,
      baseline: baselineVal,
      deltaPercent,
      status,
    };
  }

  return { regressions, improvements, stable, details };
}

export function loadBaseline(baselinePath: string): BenchmarkMetrics | null {
  try {
    const content = readFileSync(baselinePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export function saveBaseline(baselinePath: string, metrics: BenchmarkMetrics): void {
  writeFileSync(baselinePath, JSON.stringify(metrics, null, 2));
}