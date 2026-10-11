import { LoadTestConfig, LoadTestReport, LoadTestResults, LoadTestError, PhaseTiming, FeatureDistribution } from '../types/quality-distribution.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface SyntheticFeature {
  id: string;
  name: string;
  complexity: 'simple' | 'medium' | 'complex';
  spec: string;
  requirements: string[];
  userStories: string[];
}

export async function generateSyntheticFeatures(
  count: number,
  distribution: FeatureDistribution
): Promise<SyntheticFeature[]> {
  const features: SyntheticFeature[] = [];
  
  const simpleCount = Math.round(count * distribution.simple);
  const mediumCount = Math.round(count * distribution.medium);
  const complexCount = count - simpleCount - mediumCount;

  for (let i = 0; i < simpleCount; i++) {
    features.push(createSimpleFeature(i));
  }
  for (let i = 0; i < mediumCount; i++) {
    features.push(createMediumFeature(i));
  }
  for (let i = 0; i < complexCount; i++) {
    features.push(createComplexFeature(i));
  }

  return shuffleArray(features);
}

function createSimpleFeature(index: number): SyntheticFeature {
  return {
    id: `feature-simple-${index}`,
    name: `Simple Feature ${index}`,
    complexity: 'simple',
    spec: `# Simple Feature ${index}\n\n## Requirements\n\n- FR-001: Basic functionality\n- FR-002: Error handling\n\n## User Stories\n\n### US1 - Basic use (P1)\nUser can perform basic action.`,
    requirements: ['FR-001', 'FR-002'],
    userStories: ['US1'],
  };
}

function createMediumFeature(index: number): SyntheticFeature {
  return {
    id: `feature-medium-${index}`,
    name: `Medium Feature ${index}`,
    complexity: 'medium',
    spec: `# Medium Feature ${index}\n\n## Requirements\n\n- FR-001: Core functionality\n- FR-002: Data validation\n- FR-003: Integration point\n- FR-004: Performance requirement\n- FR-005: Security consideration\n\n## User Stories\n\n### US1 - Primary flow (P1)\nUser completes main workflow.\n\n### US2 - Edge case (P2)\nUser handles error scenario.`,
    requirements: ['FR-001', 'FR-002', 'FR-003', 'FR-004', 'FR-005'],
    userStories: ['US1', 'US2'],
  };
}

function createComplexFeature(index: number): SyntheticFeature {
  return {
    id: `feature-complex-${index}`,
    name: `Complex Feature ${index}`,
    complexity: 'complex',
    spec: `# Complex Feature ${index}\n\n## Requirements\n\n- FR-001: Multi-step workflow\n- FR-002: State management\n- FR-003: External integration\n- FR-004: Real-time updates\n- FR-005: Offline support\n- FR-006: Accessibility\n- FR-007: Internationalization\n- FR-008: Analytics tracking\n- FR-009: Error recovery\n- FR-010: Performance budget\n\n## User Stories\n\n### US1 - Complete workflow (P1)\nUser completes full multi-step process.\n\n### US2 - Partial completion (P2)\nUser can save and resume.\n\n### US3 - Error handling (P2)\nUser recovers from failures.\n\n### US4 - Settings (P3)\nUser configures feature behavior.`,
    requirements: ['FR-001', 'FR-002', 'FR-003', 'FR-004', 'FR-005', 'FR-006', 'FR-007', 'FR-008', 'FR-009', 'FR-010'],
    userStories: ['US1', 'US2', 'US3', 'US4'],
  };
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export interface LoadTestRunnerOptions {
  config: LoadTestConfig;
  outputDir: string;
  onProgress?: (completed: number, total: number) => void;
}

export async function runLoadTest(
  options: LoadTestRunnerOptions
): Promise<LoadTestReport> {
  const { config, outputDir, onProgress } = options;
  
  await mkdir(outputDir, { recursive: true });

  const features = await generateSyntheticFeatures(config.featureCount, config.distribution);
  
  const startTime = Date.now();
  let peakMemory = 0;
  let totalCpu = 0;
  let cpuSamples = 0;
  
  const results: LoadTestResults = {
    totalDurationMs: 0,
    peakMemoryMB: 0,
    avgCpuPercent: 0,
    successCount: 0,
    failureCount: 0,
    errors: [],
    phaseTimings: [],
  };

  const phases = ['parse', 'validate', 'plan', 'tasks'];
  
  for (const phase of phases) {
    const phaseStart = Date.now();
    let phaseSuccess = 0;
    let phaseFailure = 0;
    const phaseErrors: LoadTestError[] = [];

    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      
      try {
        await simulateFeatureProcessing(feature, phase, config.timeoutMs);
        phaseSuccess++;
      } catch (error) {
        phaseFailure++;
        phaseErrors.push({
          featureId: feature.id,
          phase,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }

      const mem = process.memoryUsage().rss / 1024 / 1024;
      peakMemory = Math.max(peakMemory, mem);
      
      const cpu = process.cpuUsage();
      totalCpu += cpu.user + cpu.system;
      cpuSamples++;

      onProgress?.(i + 1, features.length);
    }

    const phaseDuration = Date.now() - phaseStart;
    results.phaseTimings.push({
      phase,
      durationMs: phaseDuration,
      avgPerFeatureMs: phaseDuration / features.length,
    });

    results.successCount += phaseSuccess;
    results.failureCount += phaseFailure;
    results.errors.push(...phaseErrors);
  }

  results.totalDurationMs = Date.now() - startTime;
  results.peakMemoryMB = peakMemory;
  results.avgCpuPercent = cpuSamples > 0 ? (totalCpu / cpuSamples / 1000000) * 100 : 0;

  const passed = results.failureCount === 0 && 
    results.totalDurationMs < 600000 && 
    results.peakMemoryMB < config.memoryLimitMB;

  const report: LoadTestReport = {
    id: `load-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    featureCount: config.featureCount,
    config,
    results,
    passed,
  };

  const reportPath = join(outputDir, `load-test-${report.id}.json`);
  await writeFile(reportPath, JSON.stringify(report, null, 2));

  return report;
}

async function simulateFeatureProcessing(
  feature: SyntheticFeature,
  phase: string,
  timeoutMs: number
): Promise<void> {
  const delay = phase === 'parse' ? 5 
    : phase === 'validate' ? 10
    : phase === 'plan' ? 15
    : 20;

  const complexityMultiplier = feature.complexity === 'simple' ? 1
    : feature.complexity === 'medium' ? 2
    : 3;

  await new Promise(resolve => setTimeout(resolve, delay * complexityMultiplier));

  if (Math.random() < 0.001) {
    throw new Error(`Simulated failure in ${phase} for ${feature.id}`);
  }
}

export function formatLoadTestReport(report: LoadTestReport): string {
  const status = report.passed ? '✅ PASSED' : '❌ FAILED';
  const r = report.results;

  const lines = [
    `## Load Test Report: ${status}`,
    '',
    `**Run ID**: ${report.id}`,
    `**Features**: ${report.featureCount}`,
    `**Timestamp**: ${report.timestamp}`,
    `**Duration**: ${(r.totalDurationMs / 1000).toFixed(1)}s`,
    `**Peak Memory**: ${r.peakMemoryMB.toFixed(1)}MB`,
    `**Avg CPU**: ${r.avgCpuPercent.toFixed(1)}%`,
    `**Success**: ${r.successCount}`,
    `**Failures**: ${r.failureCount}`,
    '',
    '### Phase Timings',
    '',
    '| Phase | Duration | Avg/Feature |',
    '|-------|----------|-------------|',
  ];

  for (const pt of r.phaseTimings) {
    lines.push(`| ${pt.phase} | ${(pt.durationMs / 1000).toFixed(1)}s | ${pt.avgPerFeatureMs.toFixed(1)}ms |`);
  }

  if (r.errors.length > 0) {
    lines.push('', '### Errors', '');
    for (const error of r.errors.slice(0, 10)) {
      lines.push(`- **${error.featureId}** (${error.phase}): ${error.error}`);
    }
    if (r.errors.length > 10) {
      lines.push(`... and ${r.errors.length - 10} more`);
    }
  }

  lines.push('', `**Config**: ${JSON.stringify(report.config, null, 2)}`);

  return lines.join('\n');
}