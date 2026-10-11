#!/usr/bin/env tsx

import { program } from 'commander';
import { runLoadTest, formatLoadTestReport } from '../src/load-test/runner.js';
import { join } from 'node:path';

program
  .name('load-test')
  .description('Run load test with synthetic features')
  .argument('[count]', 'Number of features to test', '500')
  .option('-d, --distribution <simple,medium,complex>', 'Feature complexity distribution (comma-separated)', '0.3,0.5,0.2')
  .option('--timeout <ms>', 'Per-feature timeout in ms', '30000')
  .option('--memory-limit <mb>', 'Memory limit in MB', '512')
  .option('-p, --parallel', 'Process features in parallel', false)
  .option('-o, --output-dir <path>', 'Output directory for report', 'results');

program.parse();

const args = program.args;
const options = program.opts();

async function main() {
  const count = parseInt(args[0] || '500', 10);
  const [simple, medium, complex] = options.distribution.split(',').map(parseFloat);
  
  if (Math.abs(simple + medium + complex - 1.0) > 0.01) {
    console.error('Distribution must sum to 1.0');
    process.exit(1);
  }

  console.log(`Running load test with ${count} features...`);
  console.log(`Distribution: simple=${simple}, medium=${medium}, complex=${complex}`);
  console.log(`Timeout: ${options.timeout}ms, Memory limit: ${options.memoryLimit}MB`);
  console.log(`Parallel: ${options.parallel}`);

  const report = await runLoadTest({
    config: {
      featureCount: count,
      distribution: { simple, medium, complex },
      timeoutMs: parseInt(options.timeout, 10),
      memoryLimitMB: parseInt(options.memoryLimit, 10),
      parallel: options.parallel,
    },
    outputDir: options.outputDir,
    onProgress: (completed, total) => {
      if (completed % 50 === 0 || completed === total) {
        console.log(`Progress: ${completed}/${total} (${((completed/total)*100).toFixed(1)}%)`);
      }
    },
  });

  console.log('\n' + formatLoadTestReport(report));

  if (!report.passed) {
    console.error('\nLoad test FAILED');
    process.exit(1);
  } else {
    console.log('\nLoad test PASSED');
  }
}

main().catch(err => {
  console.error('Load test failed:', err);
  process.exit(1);
});