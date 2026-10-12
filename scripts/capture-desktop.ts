#!/usr/bin/env tsx

import { program } from 'commander';
import { launchAndCapture, loadCaptureViews } from '../src/capture/launcher.js';

program
  .name('capture')
  .description('Capture desktop app views (screenshots and videos)')
  .option('-a, --app <path>', 'Path to the built desktop app', 'dist/app')
  .option('-v, --views <path>', 'View configuration JSON', 'config/capture-views.json')
  .option('-o, --output-dir <path>', 'Output directory for artifacts', 'docs/assets/captures')
  .option('-b, --browser <browser>', 'Browser engine (chromium, firefox, webkit)', 'chromium');

program.parse();

const options = program.opts();

async function main() {
  console.log(`Loading view configuration from ${options.views}...`);
  const views = await loadCaptureViews(options.views);
  console.log(`Capturing ${views.length} views from ${options.app} to ${options.outputDir}...`);

  const artifacts = await launchAndCapture({
    appPath: options.app,
    views,
    outputDir: options.outputDir,
    browser: options.browser,
  });

  for (const artifact of artifacts) {
    console.log(`  ${artifact.type} ${artifact.view} -> ${artifact.outputPath}`);
  }
  console.log(`Captured ${artifacts.length} artifacts.`);
}

main().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
