# Quickstart: Quality and Distribution

**Feature**: 027-quality-distribution
**Date**: 2026-10-10

## Prerequisites

- Node.js 20+
- npm 10+
- GitHub CLI (`gh`) for CI validation
- Playwright browsers installed (`npx playwright install`)
- Mermaid CLI (`npm install -g @mermaid-js/mermaid-cli`)

## Validation Scenarios

### 1. CI Performance Benchmark

**Purpose**: Verify benchmark runs and detects regressions

```bash
# Run benchmark locally
npm run benchmark

# Expected: Benchmark completes in <5 min, outputs results JSON
# Verify: results/benchmark-<timestamp>.json exists with metrics
```

**CI Validation**:
```bash
# Trigger CI run (push to branch)
git push origin 027-quality-distribution

# Verify: GitHub Actions "CI" workflow runs benchmark job
# Verify: PR comment posted with benchmark results
# Verify: Pass/fail status reflects threshold comparison
```

### 2. README Image Generation

**Purpose**: Verify diagrams/screenshots regenerate from source

```bash
# Generate images
npm run generate-images

# Expected: docs/images/ updated with .png/.svg files
# Verify: Generation manifest at docs/images/manifest.json
# Verify: Only changed sources regenerated (checksum comparison)
```

**CI Validation**:
```bash
# Modify a diagram source (e.g., docs/diagrams/architecture.mmd)
# Push and verify CI "Generate Images" job runs
# Verify: Updated images committed to PR branch
# Verify: No changes → no commits
```

### 3. Desktop App Capture

**Purpose**: Verify screenshots/recordings of key views

```bash
# Run capture (requires built desktop app)
npm run capture

# Expected: docs/assets/captures/ populated with screenshots/videos
# Verify: Manifest at docs/assets/captures/manifest.json
# Verify: All configured views captured
# Verify: Video duration matches config
```

**CI Validation**:
```bash
# Push to trigger "Desktop Capture" workflow
# Verify: Artifacts uploaded as workflow artifacts
# Verify: Coverage report shows 100% configured views
```

### 4. Privacy Page Generation

**Purpose**: Verify privacy.md generated from config with all required sections

```bash
# Generate privacy page
npm run generate-privacy

# Expected: docs/privacy.md created/updated
# Verify: All GDPR/CCPA required sections present
# Verify: Version incremented, lastUpdated current
# Verify: Compliance checklist passes
```

**CI Validation**:
```bash
# Verify: Privacy page renders correctly in docs site
# Verify: Link from README/footer works
# Verify: Version history maintained
```

### 5. Plugin Directory Assets

**Purpose**: Verify marketplace assets meet specifications

```bash
# Build assets
npm run build-assets

# Expected: docs/assets/marketplace/ with subdirs per marketplace
# Verify: All required sizes/formats generated
# Verify: Validation passes for each marketplace
```

**CI Validation**:
```bash
# Verify: Assets pass marketplace validation scripts
# Verify: Manifest lists all generated files with specs
```

### 6. 500-Feature Load Test

**Purpose**: Verify system handles 500 features within limits

```bash
# Run load test
npm run load-test 500

# Expected: Completes in <10 min, <512MB peak memory
# Verify: Report at results/load-test-<timestamp>.json
# Verify: successCount = 500, failureCount = 0
# Verify: Phase timings show no bottlenecks
```

**CI Validation**:
```bash
# Push to trigger "Load Test" workflow (scheduled or manual)
# Verify: Report uploaded as artifact
# Verify: Metrics within success criteria
# Verify: Performance trends tracked
```

## Expected Outcomes

| Scenario | Success Criteria |
|----------|-----------------|
| Benchmark | <5 min, detects 10% regression, PR comment posted |
| Image Gen | Auto-regenerates on source change, zero manual steps |
| Capture | 100% views covered, artifacts <50MB total |
| Privacy | All required sections, versioned, compliant |
| Assets | All marketplace specs met, validation passes |
| Load Test | 500 features <10 min, <512MB, 0 failures |

## Troubleshooting

| Issue | Resolution |
|-------|------------|
| Benchmark timeout | Increase CI timeout, reduce metric scope |
| Image gen fails | Check Mermaid syntax, install CLI globally |
| Capture blank | Verify app URL, increase wait durations |
| Privacy missing sections | Check config completeness, run compliance check |
| Asset validation fails | Verify source image quality, check spec dimensions |
| Load test OOM | Reduce parallelism, increase memory limit |