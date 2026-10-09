<!--
Sync Impact Report (1.0.2)
- Version change: 1.0.1 → 1.0.2 (PATCH: wording only)
- Modified principles: II. Complete Documentation With Working Examples. The rule is
  unchanged; the principle now names the CI guard that enforces it.
- Templates: no change needed.
- Source: specs/056-readme-sync.

Sync Impact Report (1.0.1)
- Version change: 1.0.0 → 1.0.1 (PATCH: wording only)
- Modified principles: V. Disk Is the Truth, Events Are Hints. The rule is unchanged
  (SPECIFY_FEATURE and SPECIFY_FEATURE_DIRECTORY are not read); its reason is corrected.
  Claude Code 2.1.292 does offer `$.env.get`; those variables are set in the shells Claude
  runs, not in Claude Code's own process, so reading them would not tell the active feature.
- Templates: no change needed.
- Source: pre-submission audit, docs/reports/pre-submission-audit.md.

Sync Impact Report (1.0.0)
- Version change: template (unversioned) → 1.0.0
- Modified principles: none (first ratification; all template placeholders replaced)
- Added principles:
  I. English-Only Project
  II. Complete Documentation With Working Examples
  III. Native Mod, Zero Settings
  IV. Pure Core, Thin Surfaces
  V. Disk Is the Truth, Events Are Hints
  VI. Test-First (NON-NEGOTIABLE)
  VII. Good Neighbor
  VIII. Responsive by Width
  IX. Theme by Tokens
  X. Presets Are Data
  XI. Honest Degradation
  XII. Nothing Slow on the Draw Path
  XIII. Spec Kit for Every Change
  XIV. Verified Distribution
- Added sections: Platform & Technical Constraints; Development Workflow & Quality Gates;
  Governance
- Removed sections: none
- Templates reviewed (not modified by this command): .specify/templates/plan-template.md,
  .specify/templates/spec-template.md, .specify/templates/tasks-template.md. Their
  "Constitution Check" gates read this file at runtime and need no edits.
- Deferred TODOs: none
- Correction before first commit (still 1.0.0): Principle V no longer lists
  SPECIFY_FEATURE / SPECIFY_FEATURE_DIRECTORY, because the 2.1.292 module API cannot read
  environment variables; it now defines the feature.json, git branch, latest-feature
  fallback found by the design review.
- Source: office-hours design doc
  ~/.gstack/projects/repositorios/jony-mod-status-design-20261007-012608.md
  (Constitution Brief), plus the user's amendment that everything in the project is written
  in English and that documentation is always complete, with examples in README.md.
-->

# Astrolabe Constitution

Astrolabe is a Claude Code mod: a plugin whose behaviour lives in a hooks module. It draws
live session state, Spec Kit progress and usage-window governance into the places Claude
Code lets a mod draw, and it is installed from its own public GitHub repository
(github.com/jonyfs/astrolabe) acting as a plugin marketplace. It replaces both
github.com/jonyfs/statusline and the usage-governor skill for Claude Code. The project also
teaches, step by step, how to turn a classic `statusLine` command into a mod.

## Core Principles

### I. English-Only Project

Everything written in this repository MUST be in English: source code, identifiers,
comments, commit messages, pull request text, specs, plans, tasks, checklists, the
constitution, the README, the tutorial, test names, user-facing strings drawn by the mod,
and error messages. No translated copies are kept in the repository.

Rationale: the mod is published for an international audience through a public marketplace.
One language keeps every artifact searchable and reviewable by anyone.

### II. Complete Documentation With Working Examples

Documentation is part of the product, and a change is not done until its documentation is
complete.

- `README.md` MUST always cover, each with at least one copy-pasteable example:
  installation (the exact `/plugin install` line and what the user sees next), every preset,
  every `userConfig` option with its default and allowed values, every slash command the mod
  registers, every place the mod draws, the Spec Kit layout it reads, updating and
  uninstalling, surfaces where the mod draws nothing (VS Code, `claude -p`, cloud sessions),
  and troubleshooting (where refusal lines appear, `claude --debug`).
- Every example in the README MUST work as written against the current release. Every
  image of the mod MUST be generated from the real mod, never drawn by hand.
- The statusline-to-mod tutorial in `docs/tutorial/` MUST pair each step with the real file
  in jonyfs/statusline and the equivalent file in this repository.
- A pull request that adds or changes behaviour MUST update the README in the same pull
  request. A reviewer rejects it otherwise, and CI fails it first: the README guard
  (`scripts/check-readme-sync.sh`, run on every pull request and push) turns a README
  that misses the current version line, a `userConfig` option, or an `/astrolabe`
  subcommand into a red check.

Rationale: users install from a one-line command and never read the source. Examples are
the contract they rely on.

### III. Native Mod, Zero Settings

The plugin MUST consist only of `.claude-plugin/plugin.json`,
`.claude-plugin/marketplace.json`, `hooks/hooks.json`, the hooks module and its supporting
files. No code writes to `~/.claude/settings.json`, project settings, or any user file.
Persistent values live only in `$.store`; session values live only in `$.state`, declared in
`types/index.d.ts`.

Rationale: a plugin cannot set `statusLine`, and installing must never surprise the user by
changing their configuration.

### IV. Pure Core, Thin Surfaces

Business logic (Spec Kit state, `tasks.md` parsing, drift detection, theme tokens, presets)
MUST live in `hooks/core/` and MUST NOT reference `$`. Each place the mod draws is a thin
adapter in `hooks/surfaces/` that only turns state into an element tree. `register.tsx`
only wires events to the core and the adapters.

Rationale: the core can then be tested exhaustively with fixtures, without an engine.

### V. Disk Is the Truth, Events Are Hints

Spec Kit state MUST be reconciled with what is on disk at `session.start` and at
`turn.complete`. `tool.call` events (Skill invocations, Edit and Write under `specs/` or
`.specify/`) MAY update state early, but no event-derived value may survive a reconciliation
that contradicts it. The active feature is resolved in this order: `.specify/feature.json`
when it names an existing directory, then the git branch when it matches a
`specs/NNN-<name>/` directory, then the highest-numbered feature that is neither done nor
abandoned. A malformed or dangling `feature.json` is reported to the user, never silently
trusted. `SPECIFY_FEATURE` and `SPECIFY_FEATURE_DIRECTORY` are not read: Spec Kit sets
them in the shells Claude runs, not in Claude Code's own process, so they do not say which
feature is active. A spec's front matter
(`track: quick|full`, `status: active|done|abandoned`) overrides phase inference when
present.

Rationale: a checkbox ticked in an editor produces no `tool.call`. Only the disk sees it.

### VI. Test-First (NON-NEGOTIABLE)

Every behaviour starts as a failing `*.test.ts` run by `claude plugin test`. The core is
tested against fixture repositories in `tests/fixtures/<scenario>/` (at least: no Spec Kit,
template constitution, spec only, plan without tasks, half-done tasks, all done,
malformed checkbox, front matter overriding inference). Every adapter is mounted on
`['terminal', 'desktop']` in its tests. Red, then green, then refactor.

Rationale: the mod API is new and moves fast. Tests are how we notice when it moves.

### VII. Good Neighbor

The band and the status line are shared with every other mod.

- An `AbovePrompt` hook MUST include `await next(e)` among its children, and MUST return
  `next(e)` when it has nothing to show.
- A pane MUST NOT open unasked below 144 terminal columns, and MUST NOT use `holdToasts`
  unless it is a short-lived dialog.
- A toast MUST mark a change of state (a phase finished, a drift detected), never fire on
  every turn.

Rationale: users run several mods at once. One noisy mod gets all of them uninstalled.

### VIII. Responsive by Width

Every tree MUST size itself from `e.props.bodyColumns` or `e.viewport.columns` and drop
segments in a declared priority order as width shrinks. No layout overflows at 80, 100, 144
or 200 columns, and no task ID (`T014`) or feature ID (`002`) is ever cut in the middle.

Rationale: the same mod runs in a narrow split and in a fullscreen terminal.

### IX. Theme by Tokens

Colors come only from theme tokens in `hooks/core/theme.ts`, which supports the four
Catppuccin flavors (mocha, frappe, macchiato, latte). No adapter contains a literal color.
Borders use only the styles the terminal draws (`single`, `double`, `round`, `bold`,
`singleDouble`, `doubleSingle`, `classic`, `arrow`, `dashed`, `quote`). The default look
uses native elements (`Box`, `Text`, `Button`, `round` borders) so the mod reads as part of
Claude Code.

Rationale: one source of color makes every flavor correct by construction.

### X. Presets Are Data

A preset is a declaration of which places to draw and in what order. It is data, not code.
Version 1 ships `minimal`, `compact` and `full`. Adding a preset requires its own spec and
tests for every place it turns on.

Rationale: fewer, polished layouts beat many half-finished ones.

### XI. Honest Degradation

Without `.specify/`, the mod shows only its status entry and says that the project does not
use Spec Kit. Where the surface draws no mod UI (VS Code, `claude -p`, cloud sessions), the
hooks run, nothing is drawn, and nothing errors. Any missing or malformed input degrades to
a smaller display, never to a crash or a refused tree.

Rationale: a status display that breaks is worse than none.

### XII. Nothing Slow on the Draw Path

A `ui.render` hook MUST NOT perform network calls, spawn processes, or read files. Reads
happen in event hooks or on `$.clock` and land in `$.state`, and drawing only reads state.
The mod makes no network calls at all unless a spec explicitly adds one and documents it in
the README.

Rationale: drawing runs often, and the terminal must never stutter because of this mod.

### XIII. Spec Kit for Every Change

Every change, including work started by other tools such as gstack skills, starts as a spec
under `specs/NNN-<name>/` and goes through `/speckit-specify`, `/speckit-clarify`,
`/speckit-plan`, `/speckit-tasks`, `/speckit-analyze` and `/speckit-implement`. Each
`spec.md` declares `track` and `status` in its front matter. Commit messages cite the spec
scope, for example `feat(002): draw the phase rail`.

Rationale: the mod displays Spec Kit state, so its own repository must be the reference
example of that workflow.

### XIV. Verified Distribution

`.claude-plugin/marketplace.json` lists the plugin with `"source": "./"`, so the repository
is both marketplace and plugin. `plugin.json` carries an explicit `version`. CI runs
`claude plugin validate .`, `claude plugin test .` and a type check on every pull request.
A release is cut only from a tag `vX.Y.Z` equal to `plugin.json`'s `version`, and CI fails
when they differ.

Rationale: users get a pinned, reproducible release, not whatever commit happens to be on
`main`.

## Platform & Technical Constraints

- Runtime: the Claude Code mod engine (2.1.287 or later for the terminal, 2.1.286 or later
  for the Desktop app). The hooks module runs without DOM and without Node. Everything
  outside it is reached through `$`.
- Language: TypeScript with JSX, compiled against the global `h`. Elements come from
  `$.ui.resolve(e)`. API reference: the engine-written `claude-code` types.
- Places the mod may draw: `$.ui.status`, `AbovePrompt`, `PromptHint`, `Spinner`, `Pane`,
  `$.ui.toast`. Any other render site needs a spec that justifies it.
- Spec Kit inputs read: `.specify/feature.json`, `.specify/memory/constitution.md`,
  `specs/NNN-*/{spec,plan,tasks}.md`, and front matter in `spec.md`.
- Dependencies: none beyond what the mod engine provides, unless a spec justifies one.

## Development & Quality Gates

1. Spec Kit flow per Principle XIII. `/speckit-analyze` MUST pass before
   `/speckit-implement`.
2. Local loop: `claude --plugin-dir .` (or hot reload), `claude plugin validate .`,
   `claude plugin test .`, `tsc -p .`.
3. A pull request passes only when CI is green, the README and tutorial reflect the change
   (Principle II), and the plan's Constitution Check lists no unjustified violation.
4. Visual changes include a regenerated image of the mod at 100 and 180 columns.
5. Releases follow Principle XIV and semantic versioning: MAJOR when a preset, command or
   config option is removed or changes meaning, MINOR when one is added, PATCH for fixes.

## Governance

This constitution overrides any other practice in the repository. Every plan's Constitution
Check and every review verifies compliance with it. Complexity that breaks a principle must
be justified in the plan's Complexity Tracking table, or the change is rejected.

Amendments are made only through `/speckit-constitution`, with a written rationale and a
Sync Impact Report. Versioning: MAJOR for removing or redefining a principle, MINOR for
adding a principle or section or materially expanding one, PATCH for wording only.

**Version**: 1.0.2 | **Ratified**: 2026-10-07 | **Last Amended**: 2026-10-09
