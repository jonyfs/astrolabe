#!/usr/bin/env tsx

import { program } from 'commander';
import { loadPrivacyConfig, generatePrivacyPolicy, validateCompliance, writePrivacyPolicy } from '../src/privacy/generator.js';

program
  .name('generate-privacy')
  .description('Generate privacy policy from config')
  .option('-c, --config <path>', 'Path to privacy config JSON', 'config/privacy.config.json')
  .option('-o, --output <path>', 'Output path for privacy.md', 'docs/privacy.md')
  .option('-t, --template <path>', 'Custom template path (not yet implemented)')
  .option('-j, --jurisdictions <jurisdictions...>', 'Applicable jurisdictions', ['GDPR', 'CCPA']);

program.parse();

const options = program.opts();

async function main() {
  console.log(`Loading privacy config from ${options.config}...`);
  
  const config = await loadPrivacyConfig(options.config);
  
  console.log('Validating compliance...');
  const validation = validateCompliance(config);
  
  if (!validation.valid) {
    console.error('Compliance validation failed. Missing sections:');
    for (const missing of validation.missing) {
      console.error(`  - ${missing}`);
    }
    process.exit(1);
  }
  
  console.log('Generating privacy policy...');
  const policy = generatePrivacyPolicy(config);
  
  await writePrivacyPolicy(options.output, policy);
  
  console.log(`Privacy policy written to ${options.output}`);
  console.log('Compliance validation: ✅ PASSED');
}

main().catch(err => {
  console.error('Privacy generation failed:', err);
  process.exit(1);
});