import { BenchmarkResult, BenchmarkComparison, MetricDelta } from '../types/quality-distribution.js';

export function formatComparison(comparison: BenchmarkComparison): string {
  const lines: string[] = [];

  if (comparison.regressions.length > 0) {
    lines.push('## ⚠️ Regressions Detected');
    for (const metric of comparison.regressions) {
      const detail = comparison.details[metric];
      lines.push(`- **${metric}**: ${detail.baseline.toFixed(2)} → ${detail.current.toFixed(2)} (${detail.deltaPercent > 0 ? '+' : ''}${detail.deltaPercent.toFixed(1)}%)`);
    }
    lines.push('');
  }

  if (comparison.improvements.length > 0) {
    lines.push('## ✅ Improvements');
    for (const metric of comparison.improvements) {
      const detail = comparison.details[metric];
      lines.push(`- **${metric}**: ${detail.baseline.toFixed(2)} → ${detail.current.toFixed(2)} (${detail.deltaPercent.toFixed(1)}%)`);
    }
    lines.push('');
  }

  if (comparison.stable.length > 0) {
    lines.push('## 📊 Stable');
    for (const metric of comparison.stable) {
      const detail = comparison.details[metric];
      lines.push(`- **${metric}**: ${detail.current.toFixed(2)} (Δ${detail.deltaPercent > 0 ? '+' : ''}${detail.deltaPercent.toFixed(1)}%)`);
    }
  }

  return lines.join('\n');
}

export function formatBenchmarkResult(result: BenchmarkResult): string {
  const status = result.passed ? '✅ PASSED' : '❌ FAILED';
  const lines = [
    `## Benchmark Result: ${status}`,
    '',
    `**Run ID**: ${result.id}`,
    `**Branch**: ${result.branch}`,
    `**Commit**: ${result.commit.slice(0, 7)}`,
    `**Timestamp**: ${result.timestamp}`,
    `**Threshold**: ${result.threshold}%`,
    '',
    '### Metrics',
    '',
    `| Metric | Current | Baseline | Delta | Status |`,
    `|--------|---------|----------|-------|--------|`,
  ];

  for (const [key, detail] of Object.entries(result.comparison.details)) {
    const statusIcon = detail.status === 'regression' ? '🔴' : detail.status === 'improvement' ? '🟢' : '🟡';
    lines.push(`| ${key} | ${detail.current.toFixed(2)} | ${detail.baseline.toFixed(2)} | ${detail.deltaPercent > 0 ? '+' : ''}${detail.deltaPercent.toFixed(1)}% | ${statusIcon} ${detail.status} |`);
  }

  lines.push('', '### Summary', '', formatComparison(result.comparison));

  return lines.join('\n');
}

export function generatePrComment(result: BenchmarkResult): string {
  const status = result.passed ? '✅ **Benchmark Passed**' : '❌ **Benchmark Failed**';
  const summary = [
    status,
    '',
    `Threshold: ${result.threshold}% regression tolerance`,
    '',
    result.comparison.regressions.length > 0
      ? `⚠️ **${result.comparison.regressions.length} regression(s) detected**`
      : 'No regressions detected',
    result.comparison.improvements.length > 0
      ? `✅ **${result.comparison.improvements.length} improvement(s)**`
      : '',
    '',
    '<details>',
    '<summary>Full Results</summary>',
    '',
    formatBenchmarkResult(result),
    '',
    '</details>',
  ].filter(Boolean).join('\n');

  return summary;
}