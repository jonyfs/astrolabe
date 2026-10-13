---
track: full # quick | full
status: active # active | done | abandoned
---

# Feature Specification: Read the statusline runs output and failure contract

**Feature Branch**: `076-statusline-runs`

**Created**: 2026-10-13

**Status**: Draft

**Input**: "Create the spec and implement it so Astrolabe adapts to statusline's JSON mode, with the data of the last spec I am running in statusline." That spec is statusline 056, `Runs output and failure contract for a host` (branch `feat/056-runs-output-contract`, FR-001 and FR-003). This is its host side: spec 070 left the ANSI parser and the fallback-line comparison in place until statusline gave Astrolabe a data form.

## The contract this spec reads

From statusline spec 056:

- `CLAUDE_STATUSLINE_OUTPUT=runs` makes the renderer print one JSON object: `{ "contract": 1, "lines": [[ { "text", "fg"?, "bg"?, "bold"?, "dim"?, "underline"?, "href"? } ]] }`. Colors are `#rrggbb`; `href` is http, https or file.
- A render that cannot produce lines exits `75` and prints `{ "contract": 1, "error": { "code", "message" } }`; codes are `node-version`, `bad-payload`, `internal`.
- Without the variable the output is the ANSI text, and failures exit 0 with the legacy lines.
- `contract` rises only when a host could notice a change in the shape.

## Requirements

- **FR-001**: The mod MUST ask for the runs form by setting `CLAUDE_STATUSLINE_OUTPUT=runs` on every render.
- **FR-002**: A runs object MUST become the footer's lines with no escape parsing. Each run keeps `text`, `#rrggbb` `fg` and `bg`, and the `true` styles; a color that is not `#rrggbb` is dropped; a `href` outside http, https and file is dropped with its text kept; control characters in `text` are removed; an empty run is dropped; trailing blank lines are dropped.
- **FR-003**: An object with an `error` MUST be read before the exit code. `node-version` MUST give the reason `node-old`; any other code MUST give `renderer-failed`. The mod MUST NOT print the error's message in the footer; the Setup tab names the reason in its own words.
- **FR-004**: A `contract` higher than this build reads (`1`) MUST NOT be read. The footer MUST be the native one with the reason `contract-newer`, shown at once and not after the minute the last good lines are kept.
- **FR-005**: Output that is not a JSON object with an integer `contract` MUST be read as ANSI, byte for byte as before, so a vendored copy that predates statusline 056 keeps working and nothing changes for it.
- **FR-006**: A runs object with no lines, or one that exits non-zero, MUST be a failed render, as an empty ANSI output is.
- **FR-007**: The footer state MUST say how the renderer answered (`runs` with its contract, or `ansi`), and the Setup tab MUST show it under the source.
- **FR-008**: The contract test in `tool-tests/unit` MUST check the runs form against the vendored copy when the copy supports it, and be skipped when it does not, so the sync pull request that brings statusline 056 is checked by it.
- **FR-009**: Four languages for each new string.

## Out of scope

- Deleting `parseAnsiLines`: it stays for every copy that predates statusline 056.
- The omit list, passive mode, `--print-config` and the render-only build (separate statusline specs).
- A sync of the vendored copy: statusline 056 is not merged yet.

## Success criteria

- **SC-001**: With a fake renderer that answers a runs object, the pane footer shows the same lines as with the ANSI text of the same content.
- **SC-002**: With one that answers `contract: 9`, the footer is native and the Setup tab says the copy is newer than this Astrolabe reads.
- **SC-003**: With one that answers the error object with exit 75, the footer is native and the mod never prints a stack trace or the message.
- **SC-004**: The existing 070 tests pass unchanged.
- **SC-005**: No new `$` call on the draw path.

## Assumptions

- Statusline 056 ships `contract: 1` as written in its spec.
- The mod keeps asking for runs even from a copy that does not know the variable: such a copy ignores it.
