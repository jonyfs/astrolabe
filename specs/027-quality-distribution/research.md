# Research: Quality and Distribution

**Feature**: 027-quality-distribution
**Date**: 2026-10-10

## CI Benchmark Tool

**Decision**: Use `@opencode/benchmark` (existing gstack skill) with Vitest integration

**Rationale**: 
- Already integrated in codebase via gstack-benchmark skill
- Provides baseline tracking, trend analysis, PR comments
- Works with existing browse daemon for page performance
- Native GitHub Actions integration

**Alternatives Considered**:
- Custom Vitest benchmark: More control but reinvents baseline/trend features
- GitHub Actions built-in: Limited to runner metrics, no app-level benchmarks
- Lighthouse CI: Good for web vitals but heavier, less flexible for CLI benchmarks

---

## Image Generation

**Decision**: Mermaid CLI (@mermaid-js/mermaid-cli) for diagrams, Playwright for screenshots

**Rationale**:
- Mermaid CLI: Native support in repo (diagrams already use Mermaid), headless, fast
- Playwright: Already in deps, can capture rendered HTML/CSS for complex visuals
- Both work in GitHub Actions Linux runners without display

**Alternatives Considered**:
- PlantUML: Requires Java, heavier, different syntax from existing diagrams
- Custom SVG: Maximum control but high maintenance for diagram updates
- Excalidraw CLI: Good for hand-drawn style but not for technical diagrams

---

## Desktop Capture

**Decision**: Playwright with Electron/Tauri app automation

**Rationale**:
- Playwright: Already in deps, supports Electron via CDP, video recording built-in
- Can launch app headless, navigate views, capture screenshots/video
- Stable API, good CI support with xvfb

**Alternatives Considered**:
- Puppeteer: Similar but Electron support less mature
- Native Electron capture: Requires app modifications, less flexible
- Tauri built-in: Only works for Tauri apps, not Electron

---

## Privacy Page

**Decision**: Static Markdown generated from TypeScript config object

**Rationale**:
- Simple, version-controlled, easy to audit
- Config-driven ensures consistency with actual data practices
- Can be validated in CI for completeness
- Renders to HTML via existing doc pipeline

**Required Disclosures (GDPR/CCPA)**:
- Data controller identity
- Categories of personal data collected
- Legal basis for processing
- Retention periods
- Third-party sharing
- User rights (access, deletion, portability, objection)
- Contact for privacy inquiries
- Cross-border transfers
- Automated decision-making

**Alternatives Considered**:
- Dynamic page from CMS: Overkill, adds external dependency
- Hand-written MD: Risk of drift from actual practices
- Legal template service: Cost, vendor lock-in

---

## Plugin Directory Assets

**Decision**: Generate assets per marketplace spec from single source config

**Marketplace Requirements**:

| Marketplace | Icon | Banner | Screenshots | Description |
|-------------|------|--------|-------------|-------------|
| VS Code | 128x128 PNG | 1280x640 PNG | Up to 5, 1280x720 | Markdown, 5000 char |
| JetBrains | 128x128 PNG | 1400x320 PNG | Up to 10, 1600x900 | HTML, 4000 char |
| Chrome Web Store | 128x128 PNG | 1400x560 PNG | Up to 5, 1280x800 | Plain text, 16000 char |

**Rationale**: Single source of truth, automated resize/format conversion, CI validation

**Alternatives Considered**:
- Manual creation: Error-prone, inconsistent updates
- Separate configs per marketplace: Duplication, drift risk

---

## Load Test (500 Features)

**Decision**: Synthetic feature generator + existing spec processing pipeline

**Rationale**:
- Reuses actual spec parsing/validation code (realistic load)
- Generates features programmatically (no manual maintenance)
- Can profile memory/CPU of real code paths
- Configurable feature complexity distribution

**Synthetic Feature Strategy**:
- 30% simple (minimal spec, 1-2 requirements)
- 50% medium (standard spec, 5-10 requirements, 1-2 user stories)
- 20% complex (full spec, 15+ requirements, multiple stories, contracts)

**Metrics to Capture**:
- Total processing time
- Peak memory (RSS)
- CPU utilization
- Success/failure count
- Per-phase timing (parse, validate, plan, task-gen)
- GC pause impact

**Alternatives Considered**:
- Real feature corpus: Not available at scale, privacy concerns
- Fixed synthetic set: Doesn't test variability
- Load test only CLI: Misses spec processing pipeline