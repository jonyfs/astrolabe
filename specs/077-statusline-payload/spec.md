---
track: full # quick | full
status: done # active | done | abandoned
---

# Feature Specification: Send statusline the facts the mod already has

**Feature Branch**: `077-statusline-payload`

**Created**: 2026-10-13

**Status**: Done

**Input**: An investigation of the bundled statusline (1.53.1) against what Astrolabe sends it.
Statusline reads `transcript_path` for the active skills, the activity chip (working, your turn,
sleeping), the subagent state and the cache chip, and `cost.total_duration_ms` and
`cost.total_cost_usd` for the session duration and the spend. The mod's payload (spec 070
FR-007) carries `session_id`, `cwd`, `model`, `effort`, `context_window` and `rate_limits` and
nothing else, so those chips never draw inside Astrolabe even though the facts are known to the
mod: the transcript is where Claude Code keeps it, `$.session.usage()` carries the cost and the
start time.

## Requirements

- **FR-001**: The payload MUST carry `transcript_path` when the session id and the directory are
  known: `<config dir>/projects/<directory with every character outside `A-Za-z0-9` turned into
  `-`>/<session id>.jsonl`, where the config dir is `CLAUDE_CONFIG_DIR` when set and
  `<home>/.claude` otherwise. It is a path the statusline reads and tolerates missing; the mod
  does not read the file.
- **FR-002**: The payload MUST carry `cost.total_duration_ms` (now minus the session start from
  `$.session.usage()`) and `cost.total_cost_usd` (`usage.cost.usd`) when each is a finite,
  non-negative number. A fact the mod does not have is left out, never zero.
- **FR-003**: Nothing else changes: the same environment, the same footer logic, the same reasons
  and the same reading of the runs form. No new `$` call on the draw path (the payload is built
  in the refresh, as before).
- **FR-004**: The README's footer section says what is sent.

## Success criteria

- **SC-001**: `buildPayload` places the three fields as above, and leaves them out when unknown.
- **SC-002**: `transcriptPathFor` gives the path Claude Code writes for a POSIX and a Windows
  directory, with and without `CLAUDE_CONFIG_DIR`.
- **SC-003**: The refresh passes the payload with those fields to the renderer, and the existing
  070 and 076 tests pass unchanged.

## Out of scope

- Passive mode, the omit list and the resolved configuration of the statusline (statusline 057 to
  059); a sync of the vendored copy (the weekly workflow opens it).
- `prompt_cache`, `vim`, `fast_mode`, `worktree`: the mod's API does not expose them.
