---
description: "Task list for 001-core-state"
---

# Tasks: Core Spec Kit state and first installable release

**Input**: Design documents from `specs/001-core-state/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required. Constitution Principle VI is test-first and non-negotiable: every
implementation task is preceded by a test task that must fail first.

**Organization**: grouped by user story. US1, US2 and US3 are all P1; US1 is the MVP because
it is the first visible slice.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1 to US5 from spec.md

## Phase 1: Setup

**Purpose**: plugin skeleton, type checking and the test harness.

- [X] T001 Create `.claude-plugin/plugin.json` (`name: astrolabe`, `version: 0.1.0`, description, `author` `{ name: "Jony Santos" }`, `repository: https://github.com/jonyfs/astrolabe`, `license: MIT`, `types: ./types/index.d.ts`) and `hooks/hooks.json` (`{ "modules": ["./register.tsx"] }`)
- [X] T002 [P] Create `scripts/sync-engine-types.sh` that copies the engine-written declarations into `types/engine/claude-code.d.ts`, run it, and add `.claude-plugin/types/` to `.gitignore`
- [X] T003 [P] Create `tsconfig.json` with the engine's recommended options (`target es2023`, `lib es2023`, `types []`, `module esnext`, `moduleResolution bundler`, `strict`, `noUncheckedIndexedAccess`, `noEmit`, `skipLibCheck`, `jsx react`, `jsxFactory h`, `jsxFragmentFactory Fragment`), `include: ["types", "hooks", "tests"]`
- [X] T004 Create a minimal `hooks/register.tsx` exporting `register: Register` that registers nothing yet, and confirm `claude plugin validate .` passes

## Phase 2: Foundational

**Purpose**: types, path helpers, the `Fs` port and the fake file system every story uses.

- [X] T005 Write `hooks/core/types.ts` with `Phase`, `Step`, `Task`, `FeatureFiles`, `Feature`, `Snapshot`, `Active`, `ActiveWarning`, `SessionMemo`, `SpeckitState` exactly as in data-model.md, and `types/index.d.ts` declaring `PluginState['astrolabe'] = { speckit: { state: SpeckitState; memo: SessionMemo } }` per contracts/state.md
- [X] T006 [P] Write failing tests in `tests/core/paths.test.ts`: `normalizePath` turns backslashes into `/`, drops a trailing slash, lowercases a drive letter; `featureDirOf(root, path)` returns `002-x` for absolute, relative and Windows-style paths (`C:\\proj\\specs\\002-x\\tasks.md` with root `c:/proj`, any letter case) and `undefined` outside `specs/NNN-*`; `joinPath` and `parentDir` handle `/` and `C:/` roots
- [X] T007 Implement `hooks/core/paths.ts` until T006 passes
- [X] T008 [P] Write `hooks/io/fs-port.ts` (`Fs` type: `read`, `list`, `exists`) and `tests/helpers/fake-fs.ts`: `treeFs(tree)` returning an `Fs` over a `Record<string, string>` with read counters, and `installTree(on, tree, cwd)` registering test hooks for `fs.read`, `fs.list`, `fs.exists`, `fs.stat`, `session.cwd`, `session.start` and `ui.status` that answer `{ value }` or `{ deny: 'ENOENT' }` and record every status text

**Checkpoint**: `claude plugin test .` runs and the path tests pass.

## Phase 3: User Story 1 - See the active feature and its phase at a glance (P1) 🎯 MVP

**Goal**: phases, task counts and the status entry for a project whose active feature comes
from a valid `feature.json`.

**Independent Test**: a fixture with `002-band-hint` at 9 of 20 tasks shows
`◆ 002 · implement 45%` after `session.start`.

### Tests for User Story 1

- [X] T009 [P] [US1] Write failing tests in `tests/core/tasks-parser.test.ts`: a line is a task when it matches `^\s*[-*]\s+\[( |x|X)\]\s+`; `[x]` and `[X]` are done; indented checkboxes count; `[]` and `[ x]` are not tasks; when any task has a `T\d+` id, tasks without one are dropped; `line` is 1-based; first unticked task is the current task
- [X] T010 [P] [US1] Write failing tests in `tests/core/front-matter.test.ts`: recognized only when line 1 is exactly `---` and a later line is exactly `---`; reads `track` (`quick`, `full`) and `status` (`active`, `done`, `abandoned`) with optional quotes and spaces; ignores unknown keys and values; no front matter returns `{}`
- [X] T011 [P] [US1] Write failing tests in `tests/core/constitution.test.ts`: `undefined` is `missing`; text containing a token matching `\[[A-Z][A-Z0-9_]+\]` is `template`; otherwise `ratified`
- [X] T012 [P] [US1] Write failing tests in `tests/core/phase.test.ts` covering every row of the FR-005 table in order, including `track: quick` without plan, `[NEEDS CLARIFICATION` without plan, zero tasks, 100% with `status: active`, and the `clarification-after-plan` warning
- [X] T013 [P] [US1] Write failing tests in `tests/core/status-text.test.ts` for every row of contracts/status-entry.md (`◆ no Spec Kit`, `◆ no active feature · next: /speckit-specify`, `◆ 002 · implement 45%`, `◆ 002 · plan`, `◆ ~002 · implement 45%`, running-skill suffix) and the width degradation order at budgets 80, 100, 144, 200 and narrow values (never cutting an id)
- [X] T014 [P] [US1] Write failing tests in `tests/core/next-command.test.ts` for every row of the FR-021 table

### Implementation for User Story 1

- [X] T015 [P] [US1] Implement `hooks/core/tasks-parser.ts` until T009 passes
- [X] T016 [P] [US1] Implement `hooks/core/front-matter.ts` until T010 passes
- [X] T017 [P] [US1] Implement `hooks/core/constitution.ts` until T011 passes
- [X] T018 [US1] Implement `hooks/core/phase.ts` (`derivePhase`) until T012 passes
- [X] T019 [P] [US1] Implement `hooks/core/next-command.ts` until T014 passes
- [X] T020 [US1] Implement `hooks/core/status-text.ts` (`formatStatus`) until T013 passes
- [X] T021 [P] [US1] Create fixtures `tests/fixtures/{no-speckit,template-constitution,spec-only,clarify-pending,plan-without-tasks,half-done,all-done,malformed-checkbox,uppercase-x}/index.ts`, each exporting `{ cwd, tree, expected }`
- [X] T022 [US1] Write failing tests in `tests/io/snapshot.test.ts` using `treeFs`: `findRoot` walks up to the nearest `.specify/` and stops at the filesystem root; `readSnapshot(fs, root, 'full')` lists only `^\d{3}-.+` dirs sorted by id, reads `spec.md` and `tasks.md`, checks `plan.md` with `exists`, and treats a rejected read as missing
- [X] T023 [US1] Implement `hooks/io/root.ts` and `hooks/io/snapshot.ts` until T022 passes
- [X] T024 [US1] Write failing tests in `tests/core/speckit.test.ts`: `deriveSpeckitState` over each US1 fixture's snapshot gives the expected constitution, features, phases, done/total, active (from `feature.json`), current task and next command
- [X] T025 [US1] Implement `hooks/core/speckit.ts` (with a first `hooks/core/active.ts` covering the `feature.json` rule only) until T024 passes
- [X] T026 [US1] Write failing integration test `tests/integration/session-start.test.ts`: with `installTree`, `$.session.start` on the half-done fixture records `◆ 002 · implement 45%`; on `no-speckit` records `◆ no Spec Kit`; a fixture whose every read is denied still records a non-empty entry
- [X] T027 [US1] Implement `hooks/surfaces/status.ts` and the `session.start` hook in `hooks/register.tsx` (find root, full snapshot, derive, `$.state.set` of `astrolabe.speckit`, show status; every failure caught and shown as the smaller entry) until T026 passes

**Checkpoint**: US1 works alone; `claude --plugin-dir .` shows the entry in this repository.

## Phase 4: User Story 2 - The display follows the disk (P1)

**Goal**: reconcile at `turn.complete` with partial reads; skill hints and early updates
from tool calls never outlive a reconcile.

**Independent Test**: tick a box in the fixture tree without a tool call, complete a turn,
see the new percentage.

- [X] T028 [P] [US2] Write failing tests in `tests/core/skill-hints.test.ts`: the six mapped skills give their step, `speckit-analyze` gives the analyze flag, `speckit-checklist`, `speckit-converge`, `speckit-taskstoissues`, `specjedi-plan` and any other name give `undefined`
- [X] T029 [US2] Implement `hooks/core/skill-hints.ts` until T028 passes
- [X] T030 [US2] Write failing tests in `tests/io/snapshot.test.ts` for the partial scope: `readSnapshot(fs, root, { dirs }, previous)` re-reads `feature.json`, the constitution, the `specs/` listing and only the named dirs, reusing `previous` for the rest; on a 40-feature fixture (`tests/fixtures/forty-features/index.ts`) the read counter is `2 + 2k` and `list` is called once
- [X] T031 [US2] Extend `hooks/io/snapshot.ts` with the partial scope until T030 passes
- [X] T032 [US2] Write failing integration test `tests/integration/turn-complete.test.ts`: (a) a box ticked in the tree between `session.start` and `$.turn.complete` changes the entry; (b) a `Skill` `speckit-plan` call shows the running suffix and the next `turn.complete` with no `plan.md` clears it and keeps phase `plan`; (c) a `speckit-analyze` call at 0 done turns the next command from `/speckit-analyze` to `/speckit-implement`; (d) an `Edit` of `specs/002-*/tasks.md` re-reads that file when the call completes; (e) an `Edit` under another feature's dir makes the next `turn.complete` re-read that dir; (f) the current task's `startedAt` stays the same across reconciles while its id is unchanged and moves to the clock's time when the id changes (FR-010)
- [X] T033 [US2] Implement the `tool.call` hooks (`Skill`, `Edit`, `Write`, `NotebookEdit`; always `next(e)` first and never throwing) and the `turn.complete` hook in `hooks/register.tsx` until T032 passes

**Checkpoint**: US1 and US2 both pass.

## Phase 5: User Story 3 - Find the right active feature (P1)

**Goal**: full FR-011 resolution with warnings and the guessed marker.

**Independent Test**: each resolution fixture gives the expected feature and source.

- [X] T034 [P] [US3] Create fixtures `tests/fixtures/{feature-json-valid,feature-json-dangling,feature-json-malformed,branch-match,branch-worktree,latest-fallback,subdirectory-cwd,windows-paths}/index.ts`
- [X] T035 [US3] Write failing tests in `tests/io/git-branch.test.ts`: `.git` directory with `ref: refs/heads/003-spinner-narration`; `.git` file with `gitdir:` absolute and relative pointers; detached SHA gives `undefined`; missing `.git` gives `undefined`; `.git` found above the Spec Kit root
- [X] T036 [US3] Implement `hooks/io/git-branch.ts` and call it from `readSnapshot` until T035 passes
- [X] T037 [US3] Write failing tests in `tests/core/active.test.ts` for FR-011 and FR-013 over the T034 fixtures: valid `feature.json`; branch match (only when `feature.json` is missing or rejected); worktree branch; latest skips `done` and `abandoned`; dangling and malformed set the warning; `feature_directory` spelled absolute, `./specs/…` or with backslashes resolves the same
- [X] T038 [US3] Complete `hooks/core/active.ts` until T037 passes, and add an integration case to `tests/integration/session-start.test.ts` that the dangling fixture records `◆ ~002 · …`

**Checkpoint**: all P1 stories pass.

## Phase 6: User Story 4 - Install v0.1.0 from the marketplace (P2)

**Goal**: marketplace manifest, CI, and an install that changes no settings.

**Independent Test**: `claude plugin validate .` reads both manifests; local marketplace
install shows the entry.

- [X] T039 [US4] Create `.claude-plugin/marketplace.json` (`name: astrolabe`, `owner: { name: "Jony Santos" }`, `plugins: [{ name: "astrolabe", source: "./", description }]`) and confirm `claude plugin validate .` reads it
- [X] T040 [P] [US4] Write a failing test in `tests/integration/no-writes.test.ts` that a full session (start, tool calls, turn complete) never raises `fs.write` (the test hook fails the test if called) never calls `$.store.set`, and never raises `env.get` (FR-014)
- [X] T041 [P] [US4] Create `.github/workflows/ci.yml`: on `pull_request` and pushes to `main`, a matrix of `ubuntu-latest`, `macos-latest`, `windows-latest` that sets up Node, runs `npm install -g @anthropic-ai/claude-code`, `claude plugin validate .`, `claude plugin test .` and `npx -p typescript@5 tsc -p .`

## Phase 7: User Story 5 - New specs carry front matter (P3)

- [X] T042 [US5] Add front matter (`track: full`, `status: active`, each with a one-line comment of allowed values) to the top of `.specify/templates/spec-template.md`
- [X] T043 [P] [US5] Create fixtures `tests/fixtures/{front-matter-done,front-matter-quick,front-matter-abandoned}/index.ts` and add their cases to `tests/core/speckit.test.ts` (half-ticked `status: done` is `done`; `track: quick` with spec only is `implement`; abandoned is never active by fallback)

## Phase 8: Polish & cross-cutting

- [X] T044 Update `README.md` per FR-030: install lines and what follows, the status entry and each of its states, the Spec Kit layout read (front matter, active-feature order), that `SPECIFY_FEATURE` and `SPECIFY_FEATURE_DIRECTORY` are ignored, where it draws nothing, update and uninstall, troubleshooting (`claude --debug`, the dim refusal lines), and what v0.1.0 does not draw yet
- [X] T045 Run `claude plugin validate .`, `claude plugin test .` and `npx -p typescript@5 tsc -p .`; fix every failure
- [X] T046 Performance check: assert in `tests/integration/turn-complete.test.ts` that one `turn.complete` on the forty-features fixture stays within the read budget, and time `claude plugin test .`
- [X] T047 Install locally through the folder marketplace (quickstart.md) and confirm the entry appears and `~/.claude/settings.json` is unchanged
- [X] T048 Capture the real status line from `claude --plugin-dir .` in tmux at 100 and 180 columns into `docs/screens/001-status-100.txt` and `docs/screens/001-status-180.txt` (Quality Gate 4), and reference them from the README
- [ ] T049 Mark `status: done` in `specs/001-core-state/spec.md` front matter once every task is ticked and the review is clean

## Phase 9: Review fixes (full review, 2026-10-07)

- [X] T050 Write a failing regression test in `tests/integration/concurrency.test.ts`: two concurrent `Edit` calls under `005-feature-5` and `007-feature-7` keep both dirs in `memo.touched`, and a concurrent `speckit-analyze` keeps the analyzed flag; then make `guarded` in `hooks/register.tsx` write with `ifVersion` and retry from a fresh read (at most 5 attempts)
- [X] T051 Replace the wall-clock assertion in `tests/core/performance.test.ts` with a warm-up run and a 500 ms per-run ceiling, keeping the correctness check
- [X] T052 Make the SC-005 check in `tests/integration/turn-complete.test.ts` exact: the read paths of one turn, the `exists` count, and a variant with `.git/HEAD`
- [X] T053 Re-check `<root>/.specify` once per turn in `hooks/io/reconcile.ts` and fall back to a full start when it is gone; integration tests for Spec Kit appearing and disappearing mid-session
- [X] T054 Pin `@anthropic-ai/claude-code@2.1.292` in `.github/workflows/ci.yml` and move to `actions/checkout@v5` and `actions/setup-node@v5`
- [X] T055 Record the Principle XIV deferrals (tag gate, unpinned marketplace source) in the plan's Complexity Tracking
- [X] T056 Read front matter after a UTF-8 BOM in `hooks/core/front-matter.ts`
- [X] T057 Accept `T001:` and `T001.` ids in `hooks/core/tasks-parser.ts`, and close a fence only with its own marker
- [X] T058 Set the running-skill marker only for main-thread `Skill` calls in `hooks/register.tsx`
- [X] T059 Fix README and spec artifact drift found by the review (done/abandoned entries with a percentage, the width guarantee, the contract direction, the spec header status)

## Dependencies & execution order

- Setup (T001 to T004) first; Foundational (T005 to T008) blocks every story.
- US1 (T009 to T027) is the MVP. US2 needs US1's snapshot and register. US3 needs US1's
  `active.ts` stub. US4 and US5 need only Foundational but are scheduled after the P1 stories.
- Within a story: tests, then the code that makes them pass.

## Parallel examples

- US1 tests: T009, T010, T011, T012, T013, T014 together; then T015, T016, T017, T019.
- US3: T034 while T035 is written.
- US4: T040 and T041 together.

## Implementation strategy

MVP is US1 (status entry from `feature.json`). Then US2 and US3 complete the P1 state model,
US4 makes it installable, US5 fixes the template, and Polish brings the README and checks.
