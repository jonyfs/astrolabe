# Data model: Core Spec Kit state

Types are declared in `types/index.d.ts` (the self-contained `$.state` contract) and re-exported by `hooks/core/types.ts`. Every value is plain JSON data so it can sit in
`$.state`.

## Phase

`'specify' | 'clarify' | 'plan' | 'tasks' | 'implement' | 'done' | 'abandoned'`

The first step that is not yet complete. Derived by the decision table in FR-005, in order.

## Task

| Field | Type | Rule |
|---|---|---|
| `id` | `string \| undefined` | First `T\d+` token after the checkbox, when present. |
| `text` | `string` | The rest of the line after the checkbox and the id, trimmed. |
| `isDone` | `boolean` | `[x]` or `[X]`. |
| `line` | `number` | 1-based line number in `tasks.md`. |

A line is a task when it matches `^\s*[-*]\s+\[( |x|X)\]\s+`. When any task has an `id`,
tasks without one are dropped (FR-009).

## FeatureFiles (snapshot input)

| Field | Type | Rule |
|---|---|---|
| `dir` | `string` | Directory name under `specs/`, for example `002-band-hint`. |
| `spec` | `string \| undefined` | Text of `spec.md`, undefined when missing or unreadable. |
| `plan` | `boolean` | Whether `plan.md` exists. |
| `tasks` | `string \| undefined` | Text of `tasks.md`. |

## Feature (derived)

| Field | Type | Rule |
|---|---|---|
| `id` | `string` | The `NNN` prefix of `dir`. |
| `name` | `string` | `dir` without the `NNN-` prefix. |
| `dir` | `string` | As in FeatureFiles. |
| `phase` | `Phase` | FR-005. |
| `track` | `'quick' \| 'full' \| undefined` | Front matter. |
| `status` | `'active' \| 'done' \| 'abandoned' \| undefined` | Front matter. |
| `done`, `total` | `number` | Task counts. |
| `currentTask` | `{ id?, text } \| undefined` | First unticked task. |
| `warnings` | `Array<'clarification-after-plan'>` | `[NEEDS CLARIFICATION` in `spec.md` while `plan.md` exists. |

Only directories matching `^\d{3}-.+` are features. They are sorted by `id` ascending.

## Snapshot

| Field | Type |
|---|---|
| `root` | `string \| undefined` (undefined means Spec Kit is not present) |
| `featureJson` | `{ kind: 'missing' } \| { kind: 'malformed' } \| { kind: 'ok', dir: string }` |
| `constitution` | `string \| undefined` |
| `branch` | `string \| undefined` |
| `features` | `FeatureFiles[]` |

`featureJson.dir` is normalized to the form `specs/<name>` relative to the root, whatever
spelling the file used (absolute, `./specs/…`, backslashes).

## Active

| Field | Type |
|---|---|
| `dir`, `id`, `name` | `string` |
| `source` | `'feature.json' \| 'branch' \| 'latest'` |

Plus `activeWarning?: 'feature-json-malformed' | 'feature-json-dangling'` on the state.
Resolution order in FR-011; a feature counts as existing when its directory is in
`features`.

## SessionMemo (session only)

| Field | Type | Rule |
|---|---|---|
| `files` | `Record<dir, FeatureFiles>` | Cache that lets `turn.complete` re-read only what FR-016 lists. |
| `analyzed` | `string[]` | Feature dirs for which `speckit-analyze` ran this session. |
| `runningSkill` | `{ name, step } \| undefined` | From a `Skill` call; cleared at reconcile (FR-018). |
| `touched` | `string[]` | Feature dirs a tool call touched this turn; cleared at reconcile. |
| `currentTask` | `{ dir, id, startedAt } \| undefined` | `startedAt` changes only when the id changes. |
| `base` | `Snapshot` without `features` | The rest of the last snapshot, so a skill hint or a single file re-read can re-derive without other reads. |

`step` is `'constitution' | 'specify' | 'clarify' | 'plan' | 'tasks' | 'implement'`.

## SpeckitState (derived, what surfaces read)

| Field | Type |
|---|---|
| `present` | `boolean` |
| `root` | `string \| undefined` |
| `constitution` | `'missing' \| 'template' \| 'ratified'` |
| `active` | `Active \| undefined` |
| `activeWarning` | as above |
| `features` | `Feature[]` (abandoned included, flagged by phase) |
| `runningSkill` | from the memo |
| `currentTask` | `{ id?, text, startedAt } \| undefined` for the active feature |
| `isAnalyzed` | `boolean` for the active feature |
| `nextCommand` | `string \| undefined` (FR-021) |

## Transitions

- `session.start`: find root, full snapshot, derive, write `{ state, memo }`, show status.
- `tool.call` `Skill`: set `runningSkill` (or the analyzed flag), re-derive from the memo,
  show status. No reads.
- `tool.call` `Edit`, `Write`, `NotebookEdit` under `specs/NNN-*/`: add the dir to
  `touched`. For `Edit` or `Write` of `.../tasks.md`, `spec.md` or `plan.md`, re-read that one
  file after the call completes and re-derive (FR-019).
- `turn.complete`: partial snapshot (FR-016), clear `runningSkill` and `touched`, derive,
  write, show status.
