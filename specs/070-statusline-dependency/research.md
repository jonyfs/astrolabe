# Research: Statusline as the Footer

## R1 What the renderer takes and gives

**Finding**: `node bin/cli.js` with no subcommand reads Claude Code's `statusLine` payload on stdin and its width from `COLUMNS`, prints ANSI lines (24-bit and 256 colour, SGR attributes, OSC 8 links) and **always exits 0**: on any internal failure it prints ` statusline unavailable ` (and ` statusline needs Node 18+ ` on an old Node). It can print more than three lines (task, subagent and gate rows, an update chip row).

**Decision**: run it as a process; treat the fallback texts as failure; set `LINES` and turn its own update chip off.

## R2 Why not a runtime fetch of release tags

**Finding**: `git ls-remote --tags` ends at `v1.3.0`; `package.json` is `1.47.0` and HEAD is 210 commits past that tag. The engine has no `mkdir`, `rename` or `remove` for a mod, no `CLAUDE_PLUGIN_DATA` in its types, and `$.process.run`'s `env` only adds to the host's. A clone at runtime means unreviewed code on every machine within a day.

**Decision**: vendor the runtime into the repository and refresh it by pull request (R3).

## R3 The vendored copy and its sync

**Decision**: `vendor/statusline/{bin,src,package.json,LICENSE}` (about 740 KB, no dependencies) and `VERSION` (`commit`, `version`, `syncedAt`). A script `scripts/sync-statusline.sh` clones upstream `main` at a given ref into a temp folder, copies those paths, writes `VERSION`, runs the contract test; a workflow runs it weekly and on demand and opens a pull request through `gh`. Upstream tags, if the owner publishes them, change only the ref the script defaults to.

**Alternatives**: npm package (no package manager for a mod, and the package name differs from the repository's owner); importing `src/render.js` (the host has no Node API and a different module loader); a git submodule (needs `git submodule update` at install, which a plugin install does not run).

## R4 Payload

**Decision**: `buildPayload` in the core. `$.session.usage()` gives `{startedAt, context, rateLimits, cost}`; rate limits convert to `used_percentage` and `resets_at` in epoch seconds (an ISO string would make statusline drop the reset); only `context_window_size` and `used_percentage` are sent for context; `model.display_name` only when known (statusline prints a literal `Claude` otherwise); `session_id` from `$.session.id()`; `workspace.current_dir` from the session's cwd.

## R5 Side effects of the renderer

**Finding**: statusline writes `~/.claude/statusline/` (caches, per-session state, update records), spawns detached `git`, `gh` and `rtk` refreshes, and by default checks for its own update.

**Decision**: pass `CLAUDE_STATUSLINE_UPDATES=off` and `CLAUDE_STATUSLINE_DEBUG=0`; keep its refreshes (they give the PR, CI and rtk chips) and disclose them; amend Principle III to say that a bundled program keeps its caches there. Running statusline also as Claude Code's `statusLine` shares those caches, which are keyed by session and safe to share.

## R6 Output to elements and width

**Decision**: `parseAnsiLines` yields `Run[][]` with `text`, `fg`, `bg`, `bold`, `dim`, `underline`, `href`. Width is `textWidth` over run text only. `COLUMNS` passed to the renderer is the region width (`columns - 4`). On draw, runs rendered for another width are hard-cut to the current one and one refresh is scheduled (debounced). The region reserves the lead row plus the cached line count (at most three), one refresh behind.

## R7 `$` and the engine

**Decision**: every `$` call lives in functions declared in `hooks/register.tsx` (a recorded pitfall: the engine refuses a module that passes `$` across an import). Core and IO modules take plain data and closures built in register. The process call uses the field `stdin`, not `input`.

## R8 Why the native lead stays

**Finding**: statusline knows nothing of Spec Kit, the governor's deciding window or the advisor. With statusline as the whole footer the pane would lose the Spec Kit part and the deciding window on every tab.

**Decision**: a native lead row above statusline's lines.
