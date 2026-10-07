# Implementation Plan: Core Spec Kit state and first installable release

**Branch**: `001-core-state` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-core-state/spec.md`

## Summary

Derive a project's Spec Kit state (root, constitution, features, phases, task progress,
active feature, next command) as a pure function of a snapshot of files read from disk,
reconcile it at `session.start` and `turn.complete`, take early hints from `tool.call`, and
show it as one `$.ui.status` entry. Ship the repository as its own marketplace with
`plugin.json` at `0.1.0` and a CI job that validates, tests and type-checks on Ubuntu,
macOS and Windows. The spike in [research.md](research.md) confirmed that tests can import
the pure core directly and can stand in for `$.fs`, `$.session` and `$.ui.status` by
hooking their events.

## Technical Context

**Language/Version**: TypeScript (strict, ES2023) compiled by the Claude Code mod engine;
TSX for `register.tsx` so later features can draw with JSX.

**Primary Dependencies**: none at run time beyond the engine's `$`. Development only:
TypeScript 5.4 or newer through `npx -p typescript tsc` for the type check.

**Storage**: `$.state` for session values (the derived state and the per-session memo).
No `$.store` use in this feature (the phase baseline arrives with toasts in 005).

**Testing**: `claude plugin test .` running `tests/**/*.test.ts` with `claude-code/testing`.
Pure core tests call core functions directly. Integration tests raise `session.start`,
`tool.call` and `turn.complete` through the test `$` and answer `fs.*`, `session.cwd` and
`ui.status` with hooks backed by in-memory fixture trees.

**Target Platform**: Claude Code 2.1.292 or later, terminal and Desktop Code tab; the hooks
run in VS Code, `claude -p` and cloud sessions without drawing.

**Project Type**: Claude Code plugin (mod), repository doubling as its marketplace.

**Performance Goals**: an end-of-turn reconcile on a 40-feature project makes one `specs/`
listing, `2 + 2k` file reads (feature.json, constitution, then `spec.md` and `tasks.md` for
each of the k features re-read, the active one included), k `exists` checks for `plan.md`,
and up to two reads for git `HEAD`. A session start reads every feature once. Deriving the
state for 100 features with 200 tasks each takes about 30 ms in the test engine.

**Constraints**: no `$` in `hooks/core/`; no file reads, processes or network on any draw
path; no writes outside `$.state`; no environment variables; every input failure degrades
to a smaller status entry.

**Scale/Scope**: projects with up to about 100 features; `tasks.md` files up to a few
thousand lines (one read is capped at 4 MiB by the engine, and a rejected read counts as a
missing file).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | How this plan complies | Status |
|---|---|---|
| I. English-only | All code, docs, tests and strings in English. | Pass |
| II. Complete docs | README updated in this feature with install, status entry states, Spec Kit layout, ignored env vars, surfaces, update, uninstall, troubleshooting (FR-030). | Pass |
| III. Native mod, zero settings | Plugin = manifests, `hooks/hooks.json`, hooks module and supporting files. No settings writes (FR-028). Session values in `$.state`, declared in `types/index.d.ts`. | Pass |
| IV. Pure core, thin surfaces | All logic in `hooks/core/` with no `$`. `hooks/io/` reads through a small `Fs` port that `register.tsx` binds to `$.fs`. `hooks/surfaces/status.ts` only returns the text: the engine follows `$` only into functions declared in `register.tsx`, so that file makes the `$.ui.status` call. | Pass |
| V. Disk is the truth | Reconcile at `session.start` and `turn.complete`; `tool.call` only sets hints that the next reconcile clears; active-feature order exactly as written; dangling or malformed `feature.json` reported; no env vars; front matter wins. | Pass |
| VI. Test-first | Every task starts with a failing test. Fixtures live in `tests/fixtures/<scenario>/` as TypeScript modules exporting an in-memory file tree (see research R2). The status adapter is not a render component, so the `['terminal','desktop']` mount rule does not apply until feature 002. | Pass |
| VII. Good neighbor | Only `$.ui.status`; no band, pane or toast in this feature. | Pass |
| VIII. Responsive by width | The status formatter takes a column budget and drops percent, then phase, then id, never cutting an id; tested at 80, 100, 144, 200 and narrow budgets. | Pass |
| IX. Theme by tokens | No colors in this feature (status is plain text). | Pass |
| X. Presets are data | No presets in this feature (002). | Pass |
| XI. Honest degradation | `◆ no Spec Kit`, `◆ no active feature · next: …`, unreadable files treated as missing, no throw escapes a hook. | Pass |
| XII. Nothing slow on the draw path | No `ui.render` hook in this feature; reads happen in event hooks. No network. | Pass |
| XIII. Spec Kit for every change | This feature runs the full flow; `spec.md` has front matter; FR-026 adds it to the template. | Pass |
| XIV. Verified distribution | `marketplace.json` with `"source": "./"`, `plugin.json` `version: 0.1.0`, CI validate/test/type-check on three OSes. Tag check deferred to 006 per spec assumptions. | Pass |

Post-design re-check: still all Pass. One item is recorded under Complexity Tracking because
it adds a file the constitution does not list by name.

## Project Structure

### Documentation (this feature)

```text
specs/001-core-state/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── status-entry.md  # The text contract of the status entry
│   └── state.md         # The $.state contract and the core function signatures
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
.claude-plugin/
├── plugin.json              # name astrolabe, version 0.1.0, types, author, repository
└── marketplace.json         # { name: astrolabe, plugins: [{ name: astrolabe, source: "./" }] }
hooks/
├── hooks.json               # { "modules": ["./register.tsx"] }
├── register.tsx             # wires session.start, tool.call, turn.complete to core, io and surfaces
├── core/                    # pure, no $
│   ├── types.ts             # Phase, Feature, Task, SpeckitState, Snapshot, SessionMemo
│   ├── paths.ts             # join, dirname, normalizeToolPath, featureDirOf
│   ├── front-matter.ts      # parseFrontMatter(text) -> { track?, status? }
│   ├── tasks-parser.ts      # parseTasks(text) -> Task[]
│   ├── constitution.ts      # classifyConstitution(text | undefined)
│   ├── phase.ts             # derivePhase(files) -> Phase (decision table FR-005)
│   ├── active.ts            # resolveActive(snapshot, features) -> Active + warning
│   ├── next-command.ts      # nextCommand(state) (FR-021)
│   ├── skill-hints.ts       # skillHint(name) -> SkillHint | undefined (FR-017)
│   ├── speckit.ts           # deriveSpeckitState(snapshot, memo) -> SpeckitState
│   └── status-text.ts       # formatStatus(state, columns?) -> string
├── io/
│   ├── fs-port.ts           # Fs port type: read, list, exists (bound to $.fs in register)
│   ├── root.ts              # findRoot(fs, cwd)
│   ├── git-branch.ts        # readBranch(fs, root) incl. worktree gitdir pointer
│   └── snapshot.ts          # readSnapshot(fs, root, scope, previous?) -> Snapshot
└── surfaces/
    └── status.ts            # showStatus($, state)
types/
├── index.d.ts               # PluginState['astrolabe'] contract
└── engine/
    └── claude-code.d.ts     # vendored engine declarations for CI type checks
tests/
├── fixtures/<scenario>/index.ts   # in-memory trees, one per scenario
├── helpers/fake-fs.ts             # hooks that answer fs.*, session.cwd, ui.status from a tree
├── core/*.test.ts                 # pure unit tests
└── integration/*.test.ts          # session.start / tool.call / turn.complete through $
scripts/
└── sync-engine-types.sh           # refreshes types/engine/ from the engine-written file
tsconfig.json
.github/workflows/ci.yml           # validate + test + type check, ubuntu/macos/windows
.specify/templates/spec-template.md  # gains front matter (FR-026)
README.md                          # updated per FR-030
```

**Structure Decision**: single plugin at the repository root, laid out as the design doc's
architecture with `core/`, `io/` and `surfaces/`. Later features add files to `surfaces/`
and `core/` without moving anything created here.

## Complexity Tracking

| Item | Why needed | Simpler alternative rejected because |
|---|---|---|
| `types/engine/claude-code.d.ts`, a vendored copy of the engine's declarations | CI runners have no loaded mod, so `.claude-plugin/types/` is never laid there, and the type check needs the `claude-code` module. | Laying the types in CI needs an authenticated `claude` session; skipping the type check breaks Principle XIV. The copy is regenerated by `scripts/sync-engine-types.sh`, never edited by hand. |
