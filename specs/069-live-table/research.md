# Research: Live Table

## R1 Agent facts

**Decision**: an `Agent` tool call writes a record (brief, type, model, start) to the session state and its end removes it. Step, context gauge and tokens fill only from the usage a subagent's `turn.step` reports; otherwise the cells stay blank.

**Rationale**: the engine does not report a subagent's step or context to a mod. A blank cell is honest (Principle XI). In Claude Code 2.1.296 a real session showed no hook event for a launched subagent at all (the governor's `inFlight` stayed 0 too), so agent rows fill only when the engine reports the run; the row model is tested with a held `Agent` call.

## R2 Gate sources

**Decision**: one `ps -axo pid=,ppid=,etime=,command=` on the clock every 15 seconds. A hook is a command running a file under `hooks/` of a `.git` directory or `.husky/`. A gate script is a file whose name starts with `gate` or `gates` and `-`, `_` or `.`, or lies inside a `gates/` directory, or matches `gates.patterns` of the project's `.statusline.json`.

**Rationale**: no hook of Claude Code fires for a git hook; the process list is the only fact. One read per 15 seconds is cheap.

## R3 Nesting

**Decision**: descendants of a hook by parent pid fold into the hook's row as its chain of programs.

**Rationale**: a gate script run by a hook must not appear twice.

## R4 The lock

**Decision**: the file `gates.lock` at the repository root or in `.git/` names a pid. A live gate row with that pid reads `waiting for gates.lock` in yellow.

**Rationale**: statusline marks the holder this way; a missing or stale lock changes nothing.

## R5 Failed gates

**Decision**: a Bash call that runs `git commit` or `git push` and fails while a gate row was seen in the last minute raises one toast.

**Rationale**: the process list shows that a hook ended, not how. The failing Bash result is the one signal a mod gets.

## R6 Column reservation

**Decision**: each column keeps `max(width needed so far)` up to its declared width, in memory for the session; a narrower terminal still drops columns first.

**Rationale**: rows must not jump when a longer cell comes and goes.

## R7 WHO is ten cells wide

**Decision**: WHO is 10 cells, not 8.

**Rationale**: `pre-commit` and `pre-push` are the hook names this column shows; at 8 cells they would draw as `pre-com…`. The drop order and the 100-column tiers are unchanged.
