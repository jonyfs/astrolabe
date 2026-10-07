# Data Model: Astrolabe replaces the statusline

## SessionStats (`$.state` `astrolabe.session`)

| Field | Type | Notes |
|---|---|---|
| `startedAt` | number | Set at the first `session.start` of the session; kept across reloads. |
| `turns` | number | Main turns completed. |
| `toolCalls` | number | Main-thread and subagent tool calls. |
| `drifts` | number | Drift alarms raised. |
| `agentsRun` | number | Subagents that ran. |
| `agentsQueued` | number | Subagents the governor queued. |
| `model` | string? | Last main-thread request's model. |
| `effort` | string? | Its effort, a level or a number as text. |
| `context` | `{ percent: number }`? | From `session.measure`. |
| `cost` | number? | USD, from `session.measure`. |
| `git` | GitState? | From the last git query. |
| `series` | `Array<{ at: number; percent: number }>` | The binding window's percent per reading, at most 60. |

## GitState

| Field | Type | Notes |
|---|---|---|
| `branch` | string? | `(detached)` short id when detached. |
| `ahead` | number | 0 without an upstream. |
| `behind` | number | 0 without an upstream. |
| `changed` | number | Changed, added, deleted, renamed and untracked paths. |
| `conflicts` | number | Unmerged paths. |

## FooterPart (pure, not stored)

`{ key, icon, text, rank }`, rank 0 never dropped. Order and ranks: Spec Kit (0), binding window
(0), other window (2), context (1), model and effort (3), git (4), cost (5), duration (6).
