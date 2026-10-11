#!/usr/bin/env tsx

import { program } from 'commander';
import { renderMermaidDiagrams } from '../src/image-gen/mermaid-renderer.js';
import { renderPlaywrightSources } from '../src/image-gen/playwright-renderer.js';
import { writeImageManifest } from '../src/image-gen/manifest.js';
import { writeFile } from 'node:fs/promises';

program
  .name('generate-images')
  .description('Generate README images from source diagrams')
  .option('-s, --source-dir <path>', 'Source directory with diagrams', 'docs/diagrams')
  .option('-o, --output-dir <path>', 'Output directory for images', 'docs/images')
  .option('-f, --formats <formats...>', 'Output formats', ['png', 'svg'])
  .option('--only-changed', 'Only regenerate changed images', true)
  .option('--no-only-changed', 'Regenerate all images');

program.parse();

const options = program.opts();

async function main() {
  console.log(`Generating images from ${options.sourceDir} to ${options.outputDir}...`);

  const [mermaidImages, playwrightImages] = await Promise.all([
    renderMermaidDiagrams({
      inputDir: options.sourceDir,
      outputDir: options.outputDir,
      formats: options.formats as ('png' | 'svg' | 'webp')[],
      onlyChanged: options.onlyChanged,
    }),
    renderPlaywrightSources({
      inputDir: options.sourceDir,
      outputDir: options.outputDir,
      formats: options.formats.filter((f: string) => f !== 'svg') as ('png' | 'webp')[],
      onlyChanged: options.onlyChanged,
    }),
  ]);

  const allImages = [...mermaidImages, ...playwrightImages];
  const manifestPath = `${options.outputDir}/manifest.json`;
  
  const manifest = await writeImageManifest(manifestPath, allImages, manifestPath);
  
  console.log(`Generated ${allImages.length} images (${manifest.changed ? 'changed' : 'unchanged'})`);
  console.log(`Manifest written to ${manifestPath}`);

  if (allImages.length > 0) {
    for (const img of allImages) {
      console.log(`  ${img.sourcePath} -> ${img.outputPath} (${img.format})`);
    }
  }
}

main().catch(err => {
  console.error('Image generation failed:', err);
  process.exit(1);
});