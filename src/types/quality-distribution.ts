export interface BenchmarkMetrics {
  durationMs: number;
  peakMemoryMB: number;
  cpuPercent: number;
  customMetrics: Record<string, number>;
}

export interface MetricDelta {
  current: number;
  baseline: number;
  deltaPercent: number;
  status: 'regression' | 'improvement' | 'stable';
}

export interface BenchmarkComparison {
  regressions: string[];
  improvements: string[];
  stable: string[];
  details: Record<string, MetricDelta>;
}

export interface BenchmarkResult {
  id: string;
  timestamp: string;
  branch: string;
  commit: string;
  metrics: BenchmarkMetrics;
  baseline: BenchmarkMetrics;
  comparison: BenchmarkComparison;
  passed: boolean;
  threshold: number;
}

export interface ImageMetadata {
  width?: number;
  height?: number;
  viewport?: { width: number; height: number };
  selector?: string;
}

export interface GeneratedImage {
  id: string;
  sourcePath: string;
  outputPath: string;
  format: 'png' | 'svg' | 'webp';
  generator: 'mermaid' | 'playwright' | 'custom';
  checksum: string;
  metadata?: ImageMetadata;
  generatedAt: string;
}

export interface Viewport {
  width: number;
  height: number;
  deviceScaleFactor: number;
}

export interface CaptureMetadata {
  appVersion?: string;
  os?: string;
  browser?: string;
  url?: string;
}

export interface CaptureArtifact {
  id: string;
  type: 'screenshot' | 'video';
  view: string;
  outputPath: string;
  format: 'png' | 'webm' | 'mp4';
  viewport: Viewport;
  durationMs?: number;
  metadata?: CaptureMetadata;
  capturedAt: string;
}

export interface PrivacySection {
  id: string;
  title: string;
  content: string;
  requiredBy?: string[];
}

export interface DataController {
  name: string;
  address: string;
  email: string;
  dpoEmail?: string;
}

export interface PrivacyPolicy {
  version: string;
  lastUpdated: string;
  sections: PrivacySection[];
  jurisdiction: string[];
  dataController: DataController;
  contactEmail: string;
}

export interface AssetSpecs {
  widths: number[];
  heights: number[];
  formats: string[];
  maxSizeKB: number;
  namingPattern: string;
}

export interface PluginAsset {
  id: string;
  marketplace: 'vscode' | 'jetbrains' | 'chrome';
  type: 'icon' | 'banner' | 'screenshot' | 'description';
  sourcePath: string;
  outputPaths: string[];
  specs: AssetSpecs;
  generatedAt: string;
}

export interface FeatureDistribution {
  simple: number;
  medium: number;
  complex: number;
}

export interface LoadTestConfig {
  featureCount: number;
  distribution: FeatureDistribution;
  timeoutMs: number;
  memoryLimitMB: number;
  parallel: boolean;
}

export interface LoadTestError {
  featureId: string;
  phase: string;
  error: string;
  stack?: string;
}

export interface PhaseTiming {
  phase: string;
  durationMs: number;
  avgPerFeatureMs: number;
}

export interface LoadTestResults {
  totalDurationMs: number;
  peakMemoryMB: number;
  avgCpuPercent: number;
  successCount: number;
  failureCount: number;
  errors: LoadTestError[];
  phaseTimings: PhaseTiming[];
}

export interface LoadTestReport {
  id: string;
  timestamp: string;
  featureCount: number;
  config: LoadTestConfig;
  results: LoadTestResults;
  passed: boolean;
}

// Skill Model Types (spec 030)
export type SkillTier = 'deep-reasoning' | 'balanced-coding' | 'fast-lightweight';
export type SkillCategory = 'speckit' | 'gstack';
export type EffortLevel = 'low' | 'medium' | 'high' | 'max';

export interface SkillModelConfig {
  skill: string;
  category: SkillCategory;
  tier: SkillTier;
  model: string;
  effort: EffortLevel;
  description?: string;
}

export interface SkillModelMap {
  skills: Record<string, SkillModelConfig>;
  version: string;
  updatedAt: string;
}

export interface AutoModeState {
  enabled: boolean;
  activeSkill?: string;
  appliedModel?: string;
  appliedEffort?: string;
  contextReReadCount: number;
}

export interface ModelSkillTabRow {
  skill: string;
  category: string;
  tier: string;
  model: string;
  effort: string;
  isActive: boolean;
}