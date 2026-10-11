# Implementation Plan: Quality and Distribution

**Branch**: `027-quality-distribution` | **Date**: 2026-10-10 | **Spec**: specs/027-quality-distribution/spec.md

**Input**: Feature specification from `/specs/027-quality-distribution/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Implement six quality and distribution improvements: CI performance benchmark, automated README image generation, desktop app captures, privacy page, plugin directory assets, and 500-feature load test. The approach uses existing CI infrastructure (GitHub Actions), headless browser automation (Playwright/Puppeteer), and Node.js tooling for image generation and load testing.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20.x

**Primary Dependencies**: GitHub Actions, Playwright, Mermaid CLI, @opencode/benchmark, @opencode/health

**Storage**: File system (generated artifacts, reports, screenshots)

**Testing**: Vitest (unit), Playwright (e2e/capture), custom load test runner

**Target Platform**: Linux CI runners (GitHub Actions), desktop app (Electron/Tauri)

**Project Type**: CLI tool with desktop app companion, CI/CD pipeline enhancements

**Performance Goals**: CI benchmark <5 min, load test 500 features <10 min, <512MB memory

**Constraints**: CI runtime <10 min total, headless browser automation, zero manual steps for image gen

**Scale/Scope**: 6 deliverables, 500 synthetic features for load test, marketplace asset specs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Single project structure (no new repos) ✓
- No external services required ✓
- TypeScript/Node.js only ✓
- CI changes only, no production infra ✓

## Project Structure

### Documentation (this feature)

```text
specs/027-quality-distribution/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
# Single project (DEFAULT)
.github/workflows/
├── ci.yml              # Updated with benchmark, image gen, load test
├── capture.yml         # Desktop app captures
└── release.yml         # Updated with plugin assets

scripts/
├── benchmark.ts        # Performance benchmark runner
├── generate-images.ts  # README image generation (Mermaid, etc.)
├── capture-desktop.ts  # Desktop app screenshot/recording
├── load-test.ts        # 500-feature load test runner
└── privacy.ts          # Privacy page generator

docs/
├── privacy.md          # Privacy page (generated)
├── images/             # Generated README images
└── assets/             # Plugin directory assets

tests/
├── benchmark.test.ts   # Benchmark validation
├── capture.test.ts     # Capture validation
└── load-test.test.ts   # Load test validation

src/
├── benchmark/          # Benchmark core logic
├── capture/            # Desktop capture core logic
├── load-test/          # Load test core logic
└── privacy/            # Privacy page core logic
```

**Structure Decision**: Single project with CI workflow enhancements, new scripts for automation, and generated documentation/assets. Follows existing repo structure patterns.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations. All work fits within existing project structure.

## Phase 0: Research (NEEDS CLARIFICATION Resolution)

### Unknowns to Research

| Item | Question | Research Task |
|------|----------|---------------|
| CI Benchmark Tool | Which benchmark framework integrates best with existing @opencode/health? | Research @opencode/benchmark, custom Vitest benchmark, or GitHub Actions built-in |
| Image Generation | Mermaid CLI vs PlantUML vs custom SVG for diagrams? | Compare output quality, CI compatibility, maintenance |
| Desktop Capture | Playwright vs Puppeteer vs native Electron capture? | Evaluate headless stability, screenshot quality, video recording |
| Privacy Page | Static MD vs generated from config? | Research GDPR/CCPA required disclosures, template approach |
| Plugin Assets | Marketplace specs (VS Code, JetBrains, Chrome Web Store)? | Document required sizes, formats, metadata for each |
| Load Test | Synthetic feature generation strategy? | Research realistic feature spec patterns, memory profiling |

### Research Output

*To be populated by research agents and consolidated into research.md*

## Phase 1: Design & Contracts

### Data Model (data-model.md)

Entities to define:
- **BenchmarkResult**: metrics, baseline, comparison, pass/fail
- **GeneratedImage**: source, output path, format, checksum
- **CaptureArtifact**: type (screenshot/video), viewport, path, metadata
- **PrivacyPolicy**: version, sections, lastUpdated, jurisdiction
- **PluginAsset**: marketplace, type, specs, sourceFile, outputFiles
- **LoadTestReport**: featureCount, duration, peakMemory, successRate, errors

### Contracts (/contracts/)

- **benchmark-contract.json**: Input (baseline path), Output (results JSON)
- **image-gen-contract.json**: Input (source dir), Output (image manifest)
- **capture-contract.json**: Input (app URL, views), Output (artifact manifest)
- **privacy-contract.json**: Input (config), Output (privacy.md)
- **plugin-assets-contract.json**: Input (manifest), Output (asset manifest)
- **load-test-contract.json**: Input (featureCount, config), Output (report)

### Quickstart (quickstart.md)

Validation scenarios:
1. Run benchmark locally: `npm run benchmark` → compare with baseline
2. Generate images: `npm run generate-images` → verify docs/images/ updated
3. Capture desktop: `npm run capture` → verify artifacts in docs/assets/
4. Generate privacy: `npm run generate-privacy` → verify docs/privacy.md
5. Build plugin assets: `npm run build-assets` → verify marketplace specs
6. Run load test: `npm run load-test 500` → verify report metrics
