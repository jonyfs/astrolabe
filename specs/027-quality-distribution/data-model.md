# Data Model: Quality and Distribution

**Feature**: 027-quality-distribution
**Date**: 2026-10-10

## Entities

### BenchmarkResult

Represents the outcome of a CI performance benchmark run.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique run identifier (timestamp + hash) |
| timestamp | ISO8601 | Yes | When the benchmark ran |
| branch | string | Yes | Git branch name |
| commit | string | Yes | Git commit SHA |
| metrics | BenchmarkMetrics | Yes | Measured performance values |
| baseline | BenchmarkMetrics | Yes | Baseline for comparison |
| comparison | BenchmarkComparison | Yes | Delta analysis vs baseline |
| passed | boolean | Yes | Whether all metrics within threshold |
| threshold | number | Yes | Regression threshold (default 10%) |

#### BenchmarkMetrics

| Field | Type | Description |
|-------|------|-------------|
| durationMs | number | Total benchmark duration |
| peakMemoryMB | number | Peak RSS memory |
| cpuPercent | number | Average CPU utilization |
| customMetrics | Record<string, number> | Domain-specific metrics (e.g., page load, bundle size) |

#### BenchmarkComparison

| Field | Type | Description |
|-------|------|-------------|
| regressions | string[] | Metrics exceeding threshold |
| improvements | string[] | Metrics improved beyond threshold |
| stable | string[] | Metrics within threshold |
| details | Record<string, MetricDelta> | Per-metric delta |

#### MetricDelta

| Field | Type | Description |
|-------|------|-------------|
| current | number | Current value |
| baseline | number | Baseline value |
| deltaPercent | number | Percentage change |
| status | 'regression' | 'improvement' | 'stable' | Classification |

---

### GeneratedImage

Represents a diagram or screenshot generated from source.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier |
| sourcePath | string | Yes | Path to source file (.mmd, .html, .tsx) |
| outputPath | string | Yes | Path to generated file (.png, .svg, .webp) |
| format | 'png' | 'svg' | 'webp' | Yes | Output format |
| generator | 'mermaid' | 'playwright' | 'custom' | Yes | Generation method |
| checksum | string | Yes | SHA256 of output for change detection |
| metadata | ImageMetadata | No | Generator-specific metadata |
| generatedAt | ISO8601 | Yes | Generation timestamp |

#### ImageMetadata

| Field | Type | Description |
|-------|------|-------------|
| width | number | Image width (px) |
| height | number | Image height (px) |
| viewport | {width, height} | Viewport used for capture |
| selector | string | CSS selector for element capture |

---

### CaptureArtifact

Represents a desktop app screenshot or recording.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier |
| type | 'screenshot' | 'video' | Yes | Artifact type |
| view | string | Yes | Logical view name (e.g., 'dashboard', 'settings') |
| outputPath | string | Yes | Path to artifact file |
| format | 'png' | 'webm' | 'mp4' | Yes | File format |
| viewport | Viewport | Yes | Capture viewport |
| durationMs | number | No | Video duration (video only) |
| metadata | CaptureMetadata | No | Additional context |
| capturedAt | ISO8601 | Yes | Capture timestamp |

#### Viewport

| Field | Type | Description |
|-------|------|-------------|
| width | number | Viewport width |
| height | number | Viewport height |
| deviceScaleFactor | number | Device pixel ratio |

#### CaptureMetadata

| Field | Type | Description |
|-------|------|-------------|
| appVersion | string | Application version |
| os | string | Operating system |
| browser | string | Browser/engine version |
| url | string | Page URL (if web view) |

---

### PrivacyPolicy

Represents the privacy policy document and its metadata.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| version | string | Yes | Semantic version (e.g., 1.0.0) |
| lastUpdated | ISO8601 | Yes | Last modification date |
| sections | PrivacySection[] | Yes | Policy sections |
| jurisdiction | string[] | Yes | Applicable jurisdictions (GDPR, CCPA, etc.) |
| dataController | DataController | Yes | Controller identity |
| contactEmail | string | Yes | Privacy contact |

#### PrivacySection

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Section identifier |
| title | string | Yes | Human-readable title |
| content | string | Yes | Markdown content |
| requiredBy | string[] | No | Regulations requiring this section |

#### DataController

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Organization name |
| address | string | Yes | Physical address |
| email | string | Yes | Contact email |
| dpoEmail | string | No | Data Protection Officer email |

---

### PluginAsset

Represents a marketplace asset (icon, banner, screenshot).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier |
| marketplace | 'vscode' | 'jetbrains' | 'chrome' | Yes | Target marketplace |
| type | 'icon' | 'banner' | 'screenshot' | 'description' | Yes | Asset type |
| sourcePath | string | Yes | Source file path |
| outputPaths | string[] | Yes | Generated output paths (multiple sizes) |
| specs | AssetSpecs | Yes | Marketplace specifications |
| generatedAt | ISO8601 | Yes | Generation timestamp |

#### AssetSpecs

| Field | Type | Description |
|-------|------|-------------|
| widths | number[] | Required widths (px) |
| heights | number[] | Required heights (px) |
| formats | string[] | Required formats |
| maxSizeKB | number | Maximum file size |
| namingPattern | string | Output filename pattern |

---

### LoadTestReport

Represents the outcome of a load test run.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique run identifier |
| timestamp | ISO8601 | Yes | When the test ran |
| featureCount | number | Yes | Number of features processed |
| config | LoadTestConfig | Yes | Test configuration |
| results | LoadTestResults | Yes | Aggregated results |
| passed | boolean | Yes | Whether all criteria met |

#### LoadTestConfig

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| featureCount | number | Yes | Target feature count |
| distribution | FeatureDistribution | Yes | Complexity distribution |
| timeoutMs | number | Yes | Per-feature timeout |
| memoryLimitMB | number | Yes | Memory limit |

#### FeatureDistribution

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| simple | number | Yes | Percentage of simple features |
| medium | number | Yes | Percentage of medium features |
| complex | number | Yes | Percentage of complex features |

#### LoadTestResults

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| totalDurationMs | number | Yes | Total wall-clock time |
| peakMemoryMB | number | Yes | Peak RSS memory |
| avgCpuPercent | number | Yes | Average CPU |
| successCount | number | Yes | Successfully processed |
| failureCount | number | Yes | Failed to process |
| errors | LoadTestError[] | Yes | Error details |
| phaseTimings | PhaseTiming[] | Yes | Per-phase breakdown |

#### LoadTestError

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| featureId | string | Yes | Feature that failed |
| phase | string | Yes | Phase where failure occurred |
| error | string | Yes | Error message |
| stack | string | No | Stack trace |

#### PhaseTiming

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| phase | string | Yes | Phase name (parse, validate, plan, tasks) |
| durationMs | number | Yes | Phase duration |
| avgPerFeatureMs | number | Yes | Average per feature |

## Relationships

- BenchmarkResult → baseline (references previous BenchmarkResult)
- GeneratedImage → sourcePath (references repo file)
- CaptureArtifact → view (logical grouping for UI coverage)
- PrivacyPolicy → sections (ordered composition)
- PluginAsset → marketplace (groups by target)
- LoadTestReport → config (immutable test parameters)

## Validation Rules

- BenchmarkResult: threshold must be 0-50%, durationMs > 0
- GeneratedImage: checksum must match actual file, outputPath must exist
- CaptureArtifact: video must have durationMs > 0, screenshot must not
- PrivacyPolicy: all GDPR/CCPA required sections present, version semver
- PluginAsset: outputPaths must match specs counts, files must exist
- LoadTestReport: successCount + failureCount = featureCount, peakMemoryMB <= config.memoryLimitMB