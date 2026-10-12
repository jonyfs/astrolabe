# Research: Statusline as the Footer

## R1 What the renderer takes and gives

**Finding**: `node bin/cli.js` with no subcommand reads Claude Code's `statusLine` payload on stdin, reads its width from `COLUMNS`, prints ANSI lines and exits 0 with a one-line fallback on any failure (statusline `bin/cli.js`). It reads the payload fields it needs one by one (`model`, `workspace`, `context_window`, `rate_limits`, `cost`, `session_id`, `transcript_path`) and degrades per field.

**Decision**: call that entry point as a process. Do not import `src/render.js`: the engine loads a mod's modules in its own host, and statusline's modules use Node APIs and a version floor the host does not promise.

## R2 Where the payload comes from

**Finding**: `$.session.usage()` returns `{ startedAt, context, rateLimits, cost }` "as the status line has them" (engine types). `$.session.cwd()`, the model and effort noted by `turn.step`, and the git facts in `SessionStats` cover the rest.

**Decision**: `buildPayload` in the core maps those to the statusLine field names. A field the mod does not have is left out, never zero.

## R3 Where the copy lives

**Finding**: `$.plugin.root` is the install location and may be a git checkout the user owns (folder marketplace). `$.fs.write` and `$.process.run` exist. Claude Code gives plugins a data directory in `CLAUDE_PLUGIN_DATA`.

**Decision**: the copy lives in `${CLAUDE_PLUGIN_DATA}/statusline/<version>/`, one folder per release, with a small `current.json` naming the folder in use. Replacing the pointer is the atomic step; a half-cloned folder is never named. Two releases are kept, older ones are removed. Without `CLAUDE_PLUGIN_DATA` the feature degrades to native (Principle XI).

## R4 How a release is found and fetched

**Decision**: `git ls-remote --tags --refs https://github.com/jonyfs/statusline.git` once a day, the highest `vX.Y.Z` inside the compatible range, then `git clone --depth 1 --branch <tag>` into the versioned folder, then a check that `package.json` names that version and `bin/cli.js` exists. No package manager, no scripts run from the copy except the renderer.

**Alternatives**: a git submodule or a vendored folder (pins the copy to an Astrolabe release; no "automatic" update, and doubles the repository); the npm package (needs a package manager and a lifecycle script run); following `main` (unreviewed code every day).

## R5 Trust

**Finding**: running downloaded code on every redraw is the sharpest edge of this request.

**Decision**: only tags of one hard-coded repository are accepted; the renderer is started with an argv array, a time budget and a trimmed environment (HOME, PATH, COLUMNS, LINES, NO_COLOR, `CLAUDE_STATUSLINE_*`); its output goes through a parser that keeps colour and attribute sequences only. The README states that the dependency is code from that repository and names the option that turns it off.

## R6 Output to elements

**Finding**: the pane footer draws chips from `Chip[]`; statusline prints ANSI (24-bit colour, Powerline caps). The status entry takes plain text.

**Decision**: `parseAnsiLines` yields `Run[][]` (`text`, `fg`, `bg`, `bold`). The pane draws each run as a `Text` with those colours; the status entry gets the same lines without colour, joined and cut to the width. Columns are measured with `textWidth` (the single measure).

## R7 Cadence

**Decision**: a refresh on turn end and on each usage reading, at most every 5 seconds, and not while the pane is closed with `footerIn=pane`. One process at a time; a refresh that finds one running is dropped. The last good output is reused for 60 seconds on failure.
