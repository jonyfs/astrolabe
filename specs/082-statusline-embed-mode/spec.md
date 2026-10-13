---
track: full # quick | full
status: done # active | done | abandoned
---

# Feature Specification: Use statusline's embedding contract

**Feature Branch**: `082-statusline-embed-mode`

**Created**: 2026-10-13

**Status**: Done

**Input**: "Write the Astrolabe spec" for what statusline 1.54 to 1.58 added for a host that
embeds it: passive mode, an omit list, the resolved configuration, shared fixtures and a
render-only build (statusline specs 057 to 061; the contract itself is 056, which Astrolabe reads
since spec 076). Spec 077 already sends the facts the mod holds. This spec decides what
Astrolabe does with the rest, without losing a feature it shows today.

## What statusline now offers, and what each costs Astrolabe

| Offer | What it does | What Astrolabe would lose by using it |
|---|---|---|
| `CLAUDE_STATUSLINE_PASSIVE=1` | A render starts only read-only `git` and writes only inside `CLAUDE_STATUSLINE_CACHE_DIR` (nothing when unset). | The pull request, CI, gate and `rtk` chips: they come from a cache that a detached `gh` or `rtk` process fills, and passive mode starts none. Measured on 1.53.1 with a throwaway home: without `NO_REFRESH` a render spawns `gh` and `rtk` and writes `~/.claude/statusline/`. |
| `CLAUDE_STATUSLINE_OMIT=<keys>` | Switches named segments off before layout; the width goes to the others. | Whatever it names. Astrolabe's lead draws the Spec Kit part, the deciding window, the advisor and the help hint; statusline draws `5h` and `7d` too, and the README shows both on purpose. |
| `--print-config` | The flavor and where it came from, the ramp, contrast, glyph set, separator, colour depth, layout and omitted keys, passive and cache dir, as one JSON object. | Nothing. One extra short process, off the draw path. |
| `fixtures/host/` | Payloads and expected plain rows at 80, 100, 144 and 200 columns. | Nothing. |
| `scripts/build-render-only.js` | The copy without installer, doctor, Codex launcher and pane (39 of 52 modules, about 74% of the bytes). | Nothing the mod calls. |

## Requirements

- **FR-001** (sync): The vendored copy is refreshed to a statusline that has all five (1.58.0 or
  newer) through the existing weekly workflow or a manual dispatch. The contract test passes
  against it, and the sync script keeps copying `bin/` and `src/` as it does today.
- **FR-002** (live by default): By default Astrolabe sets exactly the environment it sets today.
  Every chip it shows today, including the pull request, CI, gates and `rtk`, keeps drawing. A
  copy that predates an offer ignores it.
- **FR-003** (passive, opt-in): A new option `footerStatuslineMode` (`live`, the default, or
  `passive`) lets a person ask for the certainty. In `passive` the environment gains
  `CLAUDE_STATUSLINE_PASSIVE=1` and `CLAUDE_STATUSLINE_CACHE_DIR=<a directory the mod owns>`, so
  the git snapshot and the session state persist between renders and nothing else is written. The
  Setup tab says which chips a passive footer cannot draw.
- **FR-004** (omit, opt-in): A new option `footerOmit` (a comma-separated list of statusline
  segment keys, empty by default) is passed as `CLAUDE_STATUSLINE_OMIT`. Names that are not
  segments are ignored by the renderer; the Setup tab shows the list as written.
- **FR-005** (resolved configuration): The Setup tab's footer rows show what the copy resolved
  (flavor, glyph set, separator, passive, omitted keys) from `--print-config`, read on the same
  cadence as the Node check (at most once a minute, never on the draw path), and says when the
  flavor Astrolabe asked for is not the one drawn.
- **FR-006** (fixtures): The contract test also renders the copy's `fixtures/host` payloads with
  the environment named in its `scripts/host-fixtures.js` and compares the rows, skipping when the
  copy has no such folder.
- **FR-007** (render-only, optional): The sync script copies the render-only build when the source
  has `scripts/build-render-only.js` and falls back to `bin/` and `src/` otherwise. The contract
  test and the fixtures pass either way.
- **FR-008**: Four languages for each new string; no new `$` call on the draw path.

## Decisions (taken: the three recommendations)

1. **Is passive worth its cost as an option?** Recommended: yes, as an opt-in (FR-003), default
   `live`. Making it the default would drop the pull request, CI and `rtk` chips for everyone, so it
   is not proposed. A third way (Astrolabe writes statusline's cache entries itself, from its own
   pull request reading) needs a documented cache-write contract statusline does not have; it is
   out of scope and would be a statusline spec first.
2. **Which directory is `CLAUDE_STATUSLINE_CACHE_DIR`?** Recommended: a folder under the engine's
   own plugin data directory, created on first use. The alternative, the operating system's
   temporary directory, loses the state between restarts.
3. **Should anything be omitted by default?** Recommended: no. The duplicated `5h` and `7d` are a
   design choice of the README, and a person who prefers one place has `footerOmit`.

## Success criteria

- **SC-001**: With no option set, the environment of a render and the footer it draws are what
  they are in 0.137.2 (the existing 070, 076 and 077 tests pass unchanged).
- **SC-002**: With `footerStatuslineMode: passive`, a recording of the renderer's child processes
  and file writes shows only read-only `git` and writes inside the cache directory.
- **SC-003**: With `footerOmit: dir,branch`, the footer has no directory or branch chip and every
  other chip.
- **SC-004**: The contract test renders the shared fixtures through the vendored copy and passes.
- **SC-005**: The Setup tab shows the resolved configuration and names a mismatched flavor.

## Out of scope

- Writing statusline's cache from Astrolabe; the prompt-cache and `vim` chips (the mod does not
  hold those figures); a release or tag of Astrolabe.
- Changing what Astrolabe's native footer draws.
