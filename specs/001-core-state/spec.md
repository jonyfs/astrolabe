---
track: full
status: active
---

# Feature Specification: Core Spec Kit state and first installable release

**Feature Branch**: `001-core-state`

**Created**: 2026-10-07

**Status**: Implemented, review fixes applied

**Input**: User description: "001-core-state — use the 'State model' section and the
001-core-state roadmap entry of the office-hours design doc
(`~/.gstack/projects/repositorios/jony-mod-status-design-20261007-012608.md`) as input"

## Overview

Astrolabe's first feature gives the mod a correct picture of a project's Spec Kit state and
shows a one-line summary of it in the shared status line under the prompt. It also makes the
mod installable from its own marketplace, so v0.1.0 is something a user can install and see
working. Every later feature (band, prompt hint, spinner, pane, toasts, usage governance)
reads the state this feature derives, so its rules must be exact and tested against fixture
projects.

## Clarifications

### Session 2026-10-07

The user asked for the Spec Kit flow to run without stopping, so each recommended answer
below was accepted as given.

- Q: What exact text does the status entry show when the project has no `.specify/`
  directory? → A: `◆ no Spec Kit`
- Q: What exact text does the status entry show when Spec Kit is present but no feature is
  active? → A: `◆ no active feature · next: <command>`, for example
  `◆ no active feature · next: /speckit-specify`

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the active feature and its phase at a glance (Priority: P1)

A developer works in a project that uses Spec Kit. Under the prompt, the status line shows
which feature is active, the phase it is in and how far its tasks have progressed, for
example `◆ 002 · implement 45%`. The developer no longer opens `tasks.md` or runs a script to
find out where the work stands.

**Why this priority**: This is the smallest slice that delivers the product's
differentiator, live Spec Kit state, and every other surface depends on the same state.

**Independent Test**: Open a Claude Code session in a fixture project with a feature that has
a spec, a plan and a `tasks.md` with some tasks ticked. The status line shows the feature id,
the phase `implement` and the correct percentage.

**Acceptance Scenarios**:

1. **Given** a project whose active feature `002-band-hint` has 9 of 20 tasks ticked,
   **When** a session starts, **Then** the status line reads `◆ 002 · implement 45%`.
2. **Given** a feature with `spec.md` only, **When** a session starts, **Then** the status
   line shows that feature in phase `plan`.
3. **Given** a feature whose `spec.md` still contains `[NEEDS CLARIFICATION` and has no
   `plan.md`, **When** a session starts, **Then** the phase shown is `clarify`.
4. **Given** a feature with all tasks ticked and no front matter, **When** a session starts,
   **Then** the feature is `done` and is not chosen as active by the fallback rule.
5. **Given** tasks ticked with uppercase `[X]` (as `speckit-implement` writes them) and
   lowercase `[x]`, **When** progress is computed, **Then** both count as done.

---

### User Story 2 - The display follows the disk, including edits made outside Claude Code (Priority: P1)

The developer ticks a task in an external editor, or a Spec Kit skill writes `plan.md`.
After the next turn completes, the status line reflects the change. Nothing the mod inferred
from events survives once the disk says otherwise.

**Why this priority**: A status display that drifts from reality is worse than none
(Principle XI). The disk is the only source that sees every change (Principle V).

**Independent Test**: In a fixture project, change a checkbox in `tasks.md` without any tool
call, complete a turn, and confirm the percentage updates.

**Acceptance Scenarios**:

1. **Given** a session showing `implement 45%`, **When** a task is ticked in an external
   editor and the next turn completes, **Then** the percentage updates to the new value.
2. **Given** a `Skill` call to `speckit-plan` is observed, **When** it runs, **Then** the
   status line may mark the plan step as running, **and when** the next turn completes and
   no `plan.md` exists, **Then** the running marker is cleared and the phase stays `plan`.
3. **Given** a project with 40 features, **When** a turn completes, **Then** only the active
   feature, `feature.json`, the constitution, the `specs/` listing and any feature directory
   touched during the turn are re-read.

---

### User Story 3 - Find the right active feature, and say so when it is a guess (Priority: P1)

The developer may have `.specify/feature.json` pointing at the current feature, may be on a
git branch named after a feature, or may have neither. The mod picks the active feature in a
fixed order and marks it as guessed when `feature.json` exists but cannot be trusted.

**Why this priority**: Showing the wrong feature is the failure the user hit with the old
statusline (a `feature.json` pointing at a folder without a plan). Getting this wrong
undermines every other surface.

**Independent Test**: Run the resolution against fixtures for each case (valid
`feature.json`, dangling `feature.json`, malformed `feature.json`, matching branch, branch in
a git worktree, no hint at all) and confirm the chosen feature and its source.

**Acceptance Scenarios**:

1. **Given** `feature.json` names an existing directory, **Then** that feature is active and
   its source is `feature.json`.
2. **Given** no `feature.json` and the git branch `003-spinner-narration` with a matching
   `specs/003-spinner-narration/`, **Then** feature 003 is active with source `branch`.
3. **Given** the same branch inside a git worktree (where `.git` is a file with a `gitdir:`
   pointer), **Then** the branch is still read correctly.
4. **Given** no `feature.json`, no matching branch, and features 001 (done), 002 (implement)
   and 003 (abandoned), **Then** 002 is active with source `latest`.
5. **Given** `feature.json` names a directory that does not exist, **Then** resolution
   continues with the branch and latest rules, a `feature-json-dangling` warning is
   recorded, and the status line marks the feature as guessed (`◆ ~002 · …`).
6. **Given** `feature.json` is not valid JSON, **Then** the same happens with a
   `feature-json-malformed` warning.

---

### User Story 4 - Install Astrolabe v0.1.0 from its marketplace (Priority: P2)

A developer runs `/plugin install astrolabe --marketplace jonyfs/astrolabe`, accepts the
marketplace, picks a scope, and the status entry appears in the same session without a
restart and without any change to their settings files.

**Why this priority**: The state model is only useful once people can install it. It comes
after the state model because an installable mod that shows wrong state has no value.

**Independent Test**: On a clean Claude Code 2.1.292 or later, run the install line, then
open a Spec Kit project and see the status entry.

**Acceptance Scenarios**:

1. **Given** a clean Claude Code install, **When** the user runs the install line and answers
   `y` to `Add marketplace?`, **Then** the mod is active in the same session and the status
   entry appears.
2. **Given** the mod is installed, **Then** no file under `~/.claude/` or the project's
   `.claude/` settings was modified by the mod.
3. **Given** a pull request to the repository, **When** CI runs, **Then** plugin validation,
   the plugin tests and the type check run and pass on Ubuntu, macOS and Windows.

---

### User Story 5 - New specs in this repository carry front matter (Priority: P3)

A maintainer runs `/speckit-specify` in the Astrolabe repository. The new `spec.md` starts
with front matter declaring `track` and `status`, so the mod can honour an explicit
`status: done` or `track: quick` instead of guessing.

**Why this priority**: Stock Spec Kit templates do not emit this front matter, and
Principle XIII requires it. It matters for correctness of later specs but does not block the
first release.

**Independent Test**: Create a spec from the repository's template and confirm the front
matter is present with `track: full` and `status: active` as defaults.

**Acceptance Scenarios**:

1. **Given** the customized template, **When** a new spec is created, **Then** its file
   starts with front matter containing `track` and `status`.
2. **Given** a spec with `status: done` whose tasks are only half ticked, **Then** its phase
   is `done`.
3. **Given** a spec with `track: quick` and no plan or tasks, **Then** its phase is
   `implement` until it declares `status: done`.

---

### Edge Cases

- **No Spec Kit**: no `.specify/` directory anywhere from the session directory up to the
  filesystem root. The status line reads `◆ no Spec Kit`, and nothing else is derived.
- **Subdirectory or monorepo**: the session starts below the project root. The nearest
  ancestor directory that contains `.specify/` is the root.
- **Template constitution**: `.specify/memory/constitution.md` still contains placeholders
  such as `[PROJECT_NAME]`. The constitution is reported as `template`, not `ratified`.
- **Missing constitution**: reported as `missing`.
- **Stray checklists in `tasks.md`**: when any checkbox has a task id (`T001`), only lines
  with an id count; otherwise every checkbox counts.
- **Indented checkboxes** count like top-level ones.
- **Malformed checkbox** (for example `[]` or `[ x]`): not counted as a task, never a crash.
- **`tasks.md` with zero tasks**: the phase is `tasks`, not `implement` or `done`.
- **All tasks ticked and front matter `status: active`**: the phase stays `implement` at
  100%, waiting for the author to declare it done.
- **`[NEEDS CLARIFICATION` left after `plan.md` exists**: does not change the phase; it is
  recorded as a warning for later surfaces.
- **Abandoned features** are excluded from counts and never chosen by the fallback rule.
- **Unreadable files** or unexpected content degrade to a smaller display, never to an
  error or a blank status line.
- **Narrow terminals**: the status text never cuts a feature id or task id in the middle.
- **Surfaces that draw no mod UI** (VS Code, `claude -p`, cloud sessions): the mod's hooks
  run, nothing is drawn, nothing errors.
- **Windows paths** in tool calls (`specs\002-x\tasks.md`, different letter case) are
  matched to the same feature as their forward-slash form.

## Requirements *(mandatory)*

### Functional Requirements

**Project discovery**

- **FR-001**: The mod MUST find the project root by walking up from the session directory to
  the nearest directory containing `.specify/`, stopping at the filesystem root.
- **FR-002**: When no root is found, the mod MUST report Spec Kit as not present and show the
  status entry `◆ no Spec Kit`.
- **FR-003**: The mod MUST classify the constitution as `missing` (file absent), `template`
  (file contains any placeholder token of the form `[UPPER_CASE_NAME]`) or `ratified`
  (otherwise).

**Feature phases**

- **FR-004**: The mod MUST list every `specs/NNN-<name>/` directory as a feature with its id
  (`NNN`), name, phase, optional `track` and `status` from front matter, and done/total task
  counts.
- **FR-005**: The mod MUST assign each feature's phase with this decision table, evaluated
  top to bottom, first match wins:

  | # | Condition | Phase |
  |---|---|---|
  | 1 | front matter `status: abandoned` | `abandoned` |
  | 2 | front matter `status: done` | `done` |
  | 3 | no `spec.md` | `specify` |
  | 4 | front matter `track: quick` | `implement` |
  | 5 | no `plan.md` and `spec.md` contains `[NEEDS CLARIFICATION` | `clarify` |
  | 6 | no `plan.md` | `plan` |
  | 7 | no `tasks.md`, or `tasks.md` with zero tasks | `tasks` |
  | 8 | done < total | `implement` |
  | 9 | done == total and front matter `status: active` | `implement` |
  | 10 | done == total | `done` |

- **FR-006**: A phase MUST name the first step that is not yet complete.
- **FR-007**: Front matter `track` and `status` MUST be read only when present at the very
  top of `spec.md`; missing or unrecognized values MUST be ignored rather than rejected.

**Task parsing**

- **FR-008**: A task MUST be a line that starts (after optional indentation) with `-` or `*`,
  a space and a checkbox `[ ]`, `[x]` or `[X]`. `[x]` and `[X]` both count as done.
- **FR-009**: When any checkbox in `tasks.md` carries a task id (`T` followed by digits),
  only lines with an id MUST count; otherwise every checkbox MUST count.
- **FR-010**: The current task MUST be the first unticked task in file order, with its id
  and text. The time the current task id last changed MUST be kept in memory only.

**Active feature**

- **FR-011**: The mod MUST resolve the active feature in this order: (1)
  `.specify/feature.json` whose `feature_directory` exists, source `feature.json`; (2) the
  current git branch when it matches `NNN-…` and `specs/<branch>/` exists, source `branch`;
  (3) the highest-numbered feature that is neither `done` nor `abandoned`, source `latest`;
  (4) none.
- **FR-012**: The git branch MUST be read from the repository's `HEAD`, following the
  `gitdir:` pointer when `.git` is a file (git worktrees), without running any process.
- **FR-013**: When `feature.json` exists but is malformed or names a missing directory, the
  mod MUST continue at step 2 and record `feature-json-malformed` or
  `feature-json-dangling`; the status entry MUST mark the resulting feature as guessed.
- **FR-014**: The mod MUST NOT read the `SPECIFY_FEATURE` or `SPECIFY_FEATURE_DIRECTORY`
  environment variables, and the README MUST say so.

**Reconciliation and hints**

- **FR-015**: The mod MUST scan every feature at session start.
- **FR-016**: At the end of each turn the mod MUST re-read `feature.json`, the constitution,
  the active feature's `spec.md`, `plan.md` and `tasks.md`, the `specs/` listing, and the
  files of any other feature whose directory a tool call touched during the turn.
- **FR-017**: A `Skill` tool call for `speckit-constitution`, `speckit-specify`,
  `speckit-clarify`, `speckit-plan`, `speckit-tasks` or `speckit-implement` MUST set a
  running-skill marker mapped to that step. `speckit-analyze` MUST set an "analyzed" flag on
  the active feature for the rest of the session. Every other skill name MUST give no hint.
- **FR-018**: A running-skill marker MUST NOT change any derived phase and MUST be cleared at
  the next reconciliation, whatever the skill's outcome.
- **FR-019**: `Edit` and `Write` tool calls under `specs/` or `.specify/` MAY update the
  derived state before the turn ends, but no event-derived value may survive a
  reconciliation that contradicts the disk.
- **FR-020**: Tool-call paths MUST be normalized before matching: made relative to the root,
  backslashes turned into forward slashes, and compared case-insensitively on Windows.

**Next command**

- **FR-021**: The mod MUST derive the next Spec Kit command from the state:

  | State | Next command |
  |---|---|
  | Spec Kit not present | none |
  | constitution `missing` or `template` | `/speckit-constitution` |
  | no active feature, or active is `done` or `abandoned` | `/speckit-specify` |
  | phase `specify` | `/speckit-specify` |
  | phase `clarify` | `/speckit-clarify` |
  | phase `plan` | `/speckit-plan` |
  | phase `tasks` | `/speckit-tasks` |
  | phase `implement`, no task done, not analyzed this session | `/speckit-analyze` |
  | phase `implement`, otherwise | `/speckit-implement` |

  In this feature the next command is derived and tested but not yet drawn; the prompt hint
  that shows it arrives in feature 002.

**Status entry**

- **FR-022**: The mod MUST show one status entry in the shared status line, in the form
  `◆ <id> · <phase> <percent>%` when the active feature has tasks, `◆ <id> · <phase>`
  otherwise, with `~` before the id when the feature is guessed, and ` · <step>…` appended
  while a skill hint is running (contracts/status-entry.md).
- **FR-023**: When no feature is active but Spec Kit is present, the status entry MUST read
  `◆ no active feature · next: <command>`, with the command from FR-021.
- **FR-024**: The status entry MUST NOT cut a feature id in the middle at any width; when
  space runs out, the percentage is dropped before the phase, and the phase before the id.
- **FR-025**: Drawing the status entry MUST NOT read files, run processes or make network
  calls; it only reads state already held by the mod.

**Repository template**

- **FR-026**: The repository's spec template MUST start with front matter declaring
  `track: full` and `status: active` as defaults, so new specs carry both fields.

**Distribution**

- **FR-027**: The repository MUST be both the marketplace and the plugin: the marketplace
  manifest lists the plugin `astrolabe` with source `./`, and the plugin manifest carries an
  explicit `version` of `0.1.0`.
- **FR-028**: Installing MUST NOT write to any user or project settings file.
- **FR-029**: CI MUST run plugin validation, the plugin tests and a type check on every pull
  request on Ubuntu, macOS and Windows.
- **FR-030**: The README MUST document, with working examples, the install lines, the status
  entry and its states, the Spec Kit layout read (including the front matter and the
  active-feature order), the environment variables that are ignored, where the mod draws
  nothing, updating and uninstalling, and troubleshooting.

### Key Entities

- **Spec Kit state**: whether Spec Kit is present, the project root, the constitution state,
  the active feature with its source and any warning, the list of features, the running
  skill marker, the current task, the "analyzed" flag and the next command.
- **Feature**: id, name, phase, optional track and status from front matter, done and total
  task counts, and warnings (for example clarification markers left after planning).
- **Task**: id (when present), text, done or not, its position in `tasks.md`.
- **Active-feature resolution**: the chosen feature, how it was chosen (`feature.json`,
  `branch`, `latest`) and why a hint was rejected (`feature-json-malformed`,
  `feature-json-dangling`).
- **Fixture project**: a small on-disk project used in tests to pin one scenario (no Spec
  Kit, template constitution, spec only, plan without tasks, half-done tasks, all done,
  malformed checkbox, front matter overriding inference, dangling and malformed
  `feature.json`, branch in a worktree, Windows-style paths).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of the fixture projects, the derived active feature, its source, phase,
  done and total match the expected values from the decision tables, with both `[x]` and
  `[X]` counted.
- **SC-002**: A checkbox ticked outside Claude Code is reflected in the status entry within
  one completed turn, in every run of the corresponding test.
- **SC-003**: On a clean Claude Code 2.1.292 or later, a user goes from the install line to a
  visible status entry in under 1 minute, without restarting the session and without any
  settings file changing.
- **SC-004**: At 80, 100, 144 and 200 columns the status entry never overflows and never cuts
  a feature id.
- **SC-005**: For a project with 40 features, an end-of-turn reconciliation re-reads at most
  the files listed in FR-016, not every feature.
- **SC-006**: Plugin validation, plugin tests and the type check pass in CI on all three
  operating systems for the release tagged v0.1.0.
- **SC-007**: No missing, unreadable or malformed input in any fixture causes an error, a
  refused display or an empty status line.

## Assumptions

- Claude Code 2.1.292 or later is the target; mods do not draw before 2.1.287 in the terminal
  or 2.1.286 in the Desktop app.
- The design doc's state model, decision tables and resolution order are authoritative; the
  design doc predates the rename, and every `mod-status` name in it reads as `astrolabe`.
- Only the Spec Kit part of the status entry ships in this feature. Git, model, context and
  usage-window segments, the band, prompt hint, spinner, pane, toasts, presets, themes and
  usage governance belong to later features.
- Spec Jedi's `quick.md` is not read in this feature.
- Tool calls made inside subagents may not be observed; nothing in this feature depends on
  them, because the disk reconciliation catches their effects.
- The feature numbering is three digits (`NNN`), as configured for this repository.
- The release tag check against the plugin version is delivered later (feature 006); this
  feature only sets the version and makes CI run validation, tests and the type check.
