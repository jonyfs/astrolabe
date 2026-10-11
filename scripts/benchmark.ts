import { program } from 'commander';
import { createBenchmarkRunner, runBenchmarkWithBaseline } from '../src/benchmark/runner.js';
import { loadBaseline, saveBaseline } from '../src/benchmark/comparator.js';
import { formatBenchmarkResult, generatePrComment } from '../src/benchmark/reporter.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

program
  .name('benchmark')
  .description('Run performance benchmark')
  .option('-b, --baseline <path>', 'Path to baseline JSON file')
  .option('-t, --threshold <percent>', 'Regression threshold percentage', '10')
  .option('-m, --metrics <metrics...>', 'Specific metrics to benchmark')
  .option('-o, --output <path>', 'Output path for results')
  .option('--save-baseline', 'Save current run as new baseline')
  .option('--pr-comment', 'Generate PR comment format');

program.parse();

const options = program.opts();

async function main() {
  const runner = createBenchmarkRunner({
    metrics: options.metrics,
    timeoutMs: 300000,
  });

  let baseline = { durationMs: 1000, peakMemoryMB: 100, cpuPercent: 10, customMetrics: {} };
  
  if (options.baseline) {
    const loaded = loadBaseline(options.baseline);
    if (loaded) {
      baseline = loaded;
    }
  }

  const threshold = parseFloat(options.threshold);
  const result = await runBenchmarkWithBaseline(runner, baseline, threshold);

  const output = options.prComment ? generatePrComment(result) : formatBenchmarkResult(result);
  
  console.log(output);

  if (options.output) {
    await mkdir(dirname(options.output), { recursive: true });
    await writeFile(options.output, JSON.stringify(result, null, 2));
  }

  if (options.saveBaseline && options.baseline) {
    saveBaseline(options.baseline, result.metrics);
    console.error(`Baseline saved to ${options.baseline}`);
  }

  if (!result.passed) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});