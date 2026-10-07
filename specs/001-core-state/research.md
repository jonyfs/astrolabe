# Research: Core Spec Kit state and first installable release

All findings were checked against Claude Code 2.1.292 (its engine-written declarations and
the bundled plugin-authoring reference) and a throwaway spike plugin run with
`claude plugin validate` and `claude plugin test`.

## R1. How tests reach the code

- **Decision**: unit tests import `hooks/core/*` directly; integration tests load the
  plugin through the test kit and raise events with `$.session.start(...)`,
  `$.tool.call(...)` and `$.turn.complete(...)`.
- **Rationale**: the spike showed a `*.test.ts` can `import { add } from '../hooks/core/add'`
  and that `$.session.start({ cwd, surface, isInteractive })` runs the plugin's
  `session.start` hook once the test answers the bottom with
  `on('session.start', ($, e) => ({ cwd: e.cwd }))`.
- **Alternatives considered**: raising `classic.SessionStart` does not run a
  `session.start` hook (the kit answered "no implementation for classic.SessionStart").

## R2. File system in tests and fixture format

- **Decision**: the test environment has no file system, so every fixture is a TypeScript
  module at `tests/fixtures/<scenario>/index.ts` exporting a `Tree`
  (`Record<string, string>` of POSIX paths to file contents, directories implied).
  `tests/helpers/fake-fs.ts` registers test hooks on `fs.read`, `fs.list`, `fs.exists`,
  `fs.stat`, `session.cwd` and `ui.status` that answer from the tree.
- **Rationale**: the kit says tests run "in an environment like the one a plugin's hooks
  run in (no fs, network or process)". Hooks on noun events must answer a result object:
  `{ value }` for a value, `{ deny }` for a refusal. The spike passed with
  `on('fs.read', ...) => ({ value: 'hello' })`. A deny makes the plugin's `$.fs.read`
  reject, which the io layer treats as a missing file.
- **Alternatives considered**: real directories under `tests/fixtures/` cannot be read from
  a test. Markdown fixture files cannot be imported (only script suffixes load).
- **Constitution fit**: Principle VI asks for fixture repositories in
  `tests/fixtures/<scenario>/`; each scenario keeps that path, its tree in `index.ts`.

## R3. Where reads happen and how they are counted

- **Decision**: `hooks/io/` takes an `Fs` port (`read`, `list`, `exists`) instead of `$`, and
  `register.tsx` binds it to `$.fs`. The integration fake counts calls per method, which is
  how SC-005 is measured.
- **Rationale**: keeps `$` out of everything except `register.tsx` and the surface, and
  lets the snapshot reader be unit tested without the kit as well.

## R4. Status entry width

- **Decision**: `$.ui.status(text)` takes no width and the engine reports none to event
  hooks. The formatter `formatStatus(state, columns?)` takes an optional budget and
  degrades in a fixed order (percent, then phase, then the separator and id). The surface
  passes no budget, so the full entry is shown; the engine draws the first 2,000 characters.
- **Rationale**: the entry is at most about 45 characters, below any supported width
  (80 columns). The budget path exists for later features that draw the same text in the
  band, and it makes FR-024 testable now.

## R5. Session values

- **Decision**: one `$.state` key, `astrolabe.speckit`, holding `{ state, memo }`:
  the derived `SpeckitState` and a `SessionMemo` (cached feature files, the analyzed flags,
  the current task id and when it started, the feature directories touched during the
  turn). Writes happen only in event hooks.
- **Rationale**: Principle III puts session values in `$.state`, which survives a hot
  reload while module variables do not.
- **Alternatives considered**: module variables would lose the memo on every reload in
  development.

## R6. Reading the git branch without a process

- **Decision**: read `<root>/.git`. If it is a directory, read `.git/HEAD`. If it is a file
  (`gitdir: <path>`), resolve that path (relative to the root when not absolute) and read its
  `HEAD`. A `ref: refs/heads/<name>` line gives the branch; a detached SHA gives none.
  Walk up from the Spec Kit root to find `.git` when it is not at the root (monorepo).
- **Rationale**: FR-012; `$.process` is not allowed for this, and `$.fs.read` handles both.

## R7. Paths on Windows

- **Decision**: one helper normalizes every path before comparison: backslashes to forward
  slashes, a trailing slash removed, a drive letter lowercased; comparisons against the
  root are case-insensitive when the root looks like a Windows path (`^[A-Za-z]:/`).
- **Rationale**: FR-020. `$.session.cwd()` on Windows answers a drive path, and tool calls
  may use either separator.

## R8. Type checking in CI

- **Decision**: vendor the engine's declarations at `types/engine/claude-code.d.ts`, copied
  by `scripts/sync-engine-types.sh` from the engine-written file, and type check with
  `npx -p typescript@5 tsc -p .`. `.claude-plugin/types/` (laid by the engine during local
  development) is gitignored and excluded from `tsconfig.json` so it cannot clash.
- **Rationale**: see the plan's Complexity Tracking.

## R9. CI install of the CLI

- **Decision**: install Claude Code with `npm install -g @anthropic-ai/claude-code` on each
  runner, then run `claude plugin validate .` and `claude plugin test .`. Neither command
  calls the API.
- **Rationale**: Principle XIV; both commands ran offline in the spike.

## R10. Front matter

- **Decision**: front matter is recognized only when the file's first line is exactly
  `---` and a later line is exactly `---`. Inside it, lines `key: value` are read for
  `track` (`quick`, `full`) and `status` (`active`, `done`, `abandoned`), with optional
  quotes and surrounding spaces. Anything else is ignored (FR-007).
- **Rationale**: a full YAML parser is a dependency the constitution does not allow, and the
  two keys are flat strings.
