---

description: "Task list for Quality and Distribution implementation"
---

# Tasks: Quality and Distribution

**Input**: Design documents from `/specs/027-quality-distribution/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests included for validation scenarios

**Organization**: Tasks grouped by user story (P1-P3) for independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create directory structure per implementation plan (scripts/, docs/assets/, tests/)
- [x] T002 [P] Add benchmark, capture, load-test, privacy, image-gen, assets scripts to package.json
- [x] T003 [P] Install required dependencies: @mermaid-js/mermaid-cli, playwright, vitest
- [x] T004 [P] Configure GitHub Actions workflow permissions for artifact upload/commit

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create shared types for all entities in src/types/quality-distribution.ts (BenchmarkResult, GeneratedImage, CaptureArtifact, PrivacyPolicy, PluginAsset, LoadTestReport per data-model.md)
- [x] T006 Create shared utility modules in src/lib/ (file-hash.ts, config-loader.ts, manifest-writer.ts)
- [x] T007 Create benchmark core module in src/benchmark/ (runner.ts, comparator.ts, reporter.ts)
- [x] T008 Create capture core module in src/capture/ (launcher.ts, capturer.ts, manifest.ts)
- [x] T009 Create load-test core module in src/load-test/ (generator.ts, runner.ts, profiler.ts, reporter.ts)
- [x] T010 Create privacy core module in src/privacy/ (config.ts, generator.ts, validator.ts)
- [x] T011 Create image-gen core module in src/image-gen/ (mermaid-renderer.ts, playwright-renderer.ts, manifest.ts)
- [x] T012 Create plugin-assets core module in src/plugin-assets/ (resizer.ts, validator.ts, manifest.ts)
- [x] T013 [P] Create test fixtures for synthetic features in tests/fixtures/load-test/
- [x] T014 [P] Create test fixtures for capture views in tests/fixtures/capture/
- [x] T015 [P] Create privacy config template in config/privacy.config.json

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - CI Performance Benchmark (Priority: P1) 🎯 MVP

**Goal**: Implement CI performance benchmark that runs on every PR and posts results

**Independent Test**: Run `npm run benchmark` locally, verify results JSON generated, verify CI workflow posts PR comment

### Tests for User Story 1

- [x] T016 [P] [US1] Contract test for benchmark in tests/contract/benchmark-contract.test.ts (validates benchmark-contract.json)
- [x] T017 [P] [US1] Integration test for benchmark runner in tests/integration/benchmark.test.ts (full benchmark run)

### Implementation for User Story 1

- [x] T018 [P] [US1] Implement benchmark runner in src/benchmark/runner.ts (uses gstack-benchmark skill patterns: browse daemon, baseline tracking, trend analysis)
- [x] T019 [US1] Implement baseline comparator in src/benchmark/comparator.ts (10% threshold, regression detection)
- [x] T020 [US1] Implement PR comment reporter in src/benchmark/reporter.ts (GitHub Actions integration)
- [x] T021 [US1] Create benchmark CLI entry in scripts/benchmark.ts (args: --baseline, --threshold, --metrics)
- [x] T022 [US1] Add GitHub Actions job in .github/workflows/ci.yml (benchmark job, posts PR comment)
- [x] T023 [US1] Add baseline storage/retrieval (GitHub Actions cache or artifact)
- [x] T024 [US1] Add benchmark npm script to package.json
- [x] T024a [US1] Update README.md with benchmark usage, CI integration, and example PR comment

**Checkpoint**: User Story 1 fully functional - benchmark runs in CI, posts PR comment, detects 10% regressions

---

## Phase 4: User Story 2 - README Images Built in CI (Priority: P1)

**Goal**: Automatically generate README images from Mermaid/HTML sources in CI

**Independent Test**: Run `npm run generate-images`, verify docs/images/ updated, verify CI commits changes

### Tests for User Story 2

- [x] T025 [P] [US2] Contract test for image-gen in tests/contract/image-gen-contract.test.ts (validates image-gen-contract.json)
- [x] T026 [P] [US2] Integration test for Mermaid rendering in tests/integration/image-gen-mermaid.test.ts
- [x] T027 [P] [US2] Integration test for Playwright rendering in tests/integration/image-gen-playwright.test.ts

### Implementation for User Story 2

- [x] T028 [P] [US2] Implement Mermaid renderer in src/image-gen/mermaid-renderer.ts (@mermaid-js/mermaid-cli)
- [x] T029 [P] [US2] Implement Playwright renderer in src/image-gen/playwright-renderer.ts (for HTML/TSX sources)
- [x] T030 [US2] Implement generation manifest in src/image-gen/manifest.ts (checksum tracking, changed detection)
- [x] T031 [US2] Create image-gen CLI entry in scripts/generate-images.ts (args: --source-dir, --output-dir, --formats, --only-changed)
- [x] T032 [US2] Add GitHub Actions job in .github/workflows/ci.yml (generate-images job, commits changes)
- [x] T033 [US2] Add image-gen npm script to package.json
- [x] T034 [US2] Configure .gitignore for generated images (or commit to docs/images/)
- [x] T034a [US2] Update README.md with image generation usage, CI integration, and source diagram examples

**Checkpoint**: User Story 2 fully functional - images auto-regenerate on source change, CI commits updates

---

## Phase 5: User Story 3 - Desktop App Captures (Priority: P2)

**Goal**: Automated screenshots and recordings of desktop app views

**Independent Test**: Run `npm run capture`, verify docs/assets/captures/ populated, verify manifest

### Tests for User Story 3

- [x] T035 [P] [US3] Contract test for capture in tests/contract/capture-contract.test.ts (validates capture-contract.json)
- [x] T036 [P] [US3] Integration test for desktop launch in tests/integration/capture-launch.test.ts
- [x] T037 [P] [US3] Integration test for screenshot capture in tests/integration/capture-screenshot.test.ts
- [x] T038 [P] [US3] Integration test for video capture in tests/integration/capture-video.test.ts

### Implementation for User Story 3

- [x] T039 [P] [US3] Implement app launcher in src/capture/launcher.ts (Electron/Playwright CDP)
- [x] T040 [P] [US3] Implement view navigator in src/capture/navigator.ts (actions: click, type, wait, scroll)
- [x] T041 [US3] Implement screenshot capturer in src/capture/screenshot.ts (viewport, selector, format)
- [x] T042 [US3] Implement video capturer in src/capture/video.ts (duration, codec, format)
- [x] T043 [US3] Implement capture manifest in src/capture/manifest.ts (coverage report, artifact metadata)
- [x] T044 [US3] Create capture CLI entry in scripts/capture-desktop.ts (args: --app-path, --views-config, --output-dir, --browser)
- [x] T045 [US3] Create capture views config in config/capture-views.json (view definitions per quickstart.md)
- [x] T046 [US3] Add GitHub Actions workflow in .github/workflows/capture.yml (scheduled + manual trigger)
- [x] T047 [US3] Add capture npm script to package.json
- [x] T047a [US3] Update README.md with desktop capture usage, view configuration, and artifact examples

**Checkpoint**: User Story 3 fully functional - captures all configured views, uploads artifacts

---

## Phase 6: User Story 4 - Privacy Page (Priority: P2)

**Goal**: Generate privacy.md from config with all GDPR/CCPA required sections

**Independent Test**: Run `npm run generate-privacy`, verify docs/privacy.md complete and compliant

### Tests for User Story 4

- [x] T048 [P] [US4] Contract test for privacy in tests/contract/privacy-contract.test.ts (validates privacy-contract.json)
- [x] T049 [P] [US4] Compliance test in tests/integration/privacy-compliance.test.ts (validates all required sections)

### Implementation for User Story 4

- [x] T050 [P] [US4] Implement privacy config schema in src/privacy/config.ts (Zod validation)
- [x] T051 [P] [US4] Implement section templates in src/privacy/templates.ts (GDPR/CCPA required sections)
- [x] T052 [US4] Implement privacy generator in src/privacy/generator.ts (config → markdown)
- [x] T053 [US4] Implement compliance validator in src/privacy/validator.ts (checklist per research.md)
- [x] T054 [US4] Create privacy CLI entry in scripts/privacy.ts (args: --config, --output, --template, --jurisdictions)
- [x] T055 [US4] Create privacy config in config/privacy.config.json (data controller, data categories, retention, etc.)
- [x] T056 [US4] Add privacy npm script to package.json
- [x] T057 [US4] Add docs/privacy.md to documentation build pipeline
- [x] T057a [US4] Update README.md with privacy page link, configuration, and compliance details

**Checkpoint**: User Story 4 fully functional - privacy page generated, compliant, versioned

---

## Phase 7: User Story 5 - Plugin Directory Assets (Priority: P3)

**Goal**: Generate marketplace-ready assets for VS Code, JetBrains, Chrome Web Store

**Independent Test**: Run `npm run build-assets`, verify docs/assets/marketplace/ meets all specs

### Tests for User Story 5

- [x] T058 [P] [US5] Contract test for plugin-assets in tests/contract/plugin-assets-contract.test.ts (validates plugin-assets-contract.json)
- [x] T059 [P] [US5] Validation test in tests/integration/plugin-assets-validation.test.ts (per-marketplace specs)

### Implementation for User Story 5

- [x] T060 [P] [US5] Implement image resizer in src/plugin-assets/resizer.ts (sharp, multiple sizes/formats)
- [x] T061 [P] [US5] Implement marketplace specs in src/plugin-assets/specs.ts (dimensions, formats, limits per marketplace)
- [x] T062 [US5] Implement asset validator in src/plugin-assets/validator.ts (size, format, naming per spec)
- [x] T063 [US5] Implement asset manifest in src/plugin-assets/manifest.ts (tracks all generated files)
- [x] T064 [US5] Create plugin-assets CLI entry in scripts/build-assets.ts (args: --manifest, --source-dir, --output-dir, --marketplaces)
- [x] T065 [US5] Create source assets in docs/assets/source/ (logo, banner, screenshots)
- [x] T066 [US5] Add plugin-assets npm script to package.json
- [x] T066a [US5] Update README.md with plugin asset generation, marketplace specs, and submission guide

**Checkpoint**: User Story 5 fully functional - all marketplace assets generated and validated

---

## Phase 8: User Story 6 - 500-Feature Load Test (Priority: P3)

**Goal**: Load test processing 500 synthetic features within time/memory limits

**Independent Test**: Run `npm run load-test 500`, verify report, verify <10 min and <512MB

### Tests for User Story 6

- [x] T067 [P] [US6] Contract test for load-test in tests/contract/load-test-contract.test.ts (validates load-test-contract.json)
- [x] T068 [P] [US6] Integration test for feature generator in tests/integration/load-test-generator.test.ts
- [x] T069 [P] [US6] Integration test for load test runner in tests/integration/load-test-runner.test.ts
- [x] T070 [P] [US6] Performance test in tests/integration/load-test-performance.test.ts (validates success criteria)

### Implementation for User Story 6

- [x] T071 [P] [US6] Implement feature generator in src/load-test/generator.ts (30/50/20 distribution, realistic specs)
- [x] T072 [P] [US6] Implement memory profiler in src/load-test/profiler.ts (RSS tracking, GC monitoring)
- [x] T073 [US6] Implement load test runner in src/load-test/runner.ts (sequential/parallel, timeout, memory limit)
- [x] T074 [US6] Implement load test reporter in src/load-test/reporter.ts (phase timings, success/failure, errors)
- [x] T075 [US6] Create load-test CLI entry in scripts/load-test.ts (args: --count, --distribution, --timeout, --memory-limit, --parallel, --output-dir)
- [x] T076 [US6] Add GitHub Actions workflow in .github/workflows/load-test.yml (scheduled weekly + manual)
- [x] T077 [US6] Add load-test npm script to package.json
- [x] T077a [US6] Update README.md with load test usage, configuration, and performance expectations

**Checkpoint**: User Story 6 fully functional - 500 features processed within success criteria

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories

- [x] T078 [P] Documentation updates in docs/ (README updates, architecture diagrams)
- [x] T079 Code cleanup and refactoring (shared utilities, error handling consistency)
- [x] T080 Performance optimization across all modules (caching, parallelization)
- [x] T081 [P] Additional unit tests in tests/unit/ (edge cases, error paths)
- [x] T082 Security hardening (input validation, path traversal prevention)
- [x] T083 Run quickstart.md validation (all 6 scenarios)
- [x] T084 [P] Add CHANGELOG entries for 027-quality-distribution
- [x] T085 Verify all CI workflows pass (benchmark, image-gen, capture, privacy, assets, load-test)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-8)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed) or sequentially
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1 - Benchmark)**: Can start after Foundational - No dependencies on other stories
- **US2 (P1 - Image Gen)**: Can start after Foundational - Independent
- **US3 (P2 - Capture)**: Can start after Foundational - Independent
- **US4 (P2 - Privacy)**: Can start after Foundational - Independent
- **US5 (P3 - Assets)**: Can start after Foundational - Independent
- **US6 (P3 - Load Test)**: Can start after Foundational - Independent

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Core modules before CLI entries
- CLI before CI integration
- Story complete before moving to next priority (for sequential execution)

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel
- Once Foundational phase completes, all user stories can start in parallel
- All tests for a user story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1 (Benchmark)

```bash
# Launch all tests for User Story 1 together:
Task: "Contract test for benchmark in tests/contract/benchmark-contract.test.ts"
Task: "Integration test for benchmark runner in tests/integration/benchmark.test.ts"

# Launch implementation tasks that can run in parallel:
Task: "Implement baseline comparator in src/benchmark/comparator.ts"
Task: "Implement PR comment reporter in src/benchmark/reporter.ts"
```

---

## Parallel Example: User Story 2 (Image Gen)

```bash
# Launch all tests for User Story 2 together:
Task: "Contract test for image-gen in tests/contract/image-gen-contract.test.ts"
Task: "Integration test for Mermaid rendering in tests/integration/image-gen-mermaid.test.ts"
Task: "Integration test for Playwright rendering in tests/integration/image-gen-playwright.test.ts"

# Launch implementation tasks that can run in parallel:
Task: "Implement Mermaid renderer in src/image-gen/mermaid-renderer.ts"
Task: "Implement Playwright renderer in src/image-gen/playwright-renderer.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Benchmark) - **MVP Core**
4. Complete Phase 4: User Story 2 (Image Gen) - **MVP Core**
5. **STOP and VALIDATE**: Test both stories independently
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 (Benchmark) → Test independently → Deploy/Demo
3. Add US2 (Image Gen) → Test independently → Deploy/Demo
4. Add US3 (Capture) → Test independently → Deploy/Demo
5. Add US4 (Privacy) → Test independently → Deploy/Demo
6. Add US5 (Assets) → Test independently → Deploy/Demo
7. Add US6 (Load Test) → Test independently → Deploy/Demo
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Benchmark)
   - Developer B: User Story 2 (Image Gen)
   - Developer C: User Story 3 (Capture)
   - Developer D: User Story 4 (Privacy)
   - Developer E: User Story 5 (Assets)
   - Developer F: User Story 6 (Load Test)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence