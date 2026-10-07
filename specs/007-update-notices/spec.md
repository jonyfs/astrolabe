---
track: full # quick | full
status: done # active | done | abandoned
---

# Feature Specification: Clickable update notices

**Feature Branch**: `007-update-notices`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description (office hours, 2026-10-07): "show when gstack skills, the Spec Kit
CLI (specify) or Astrolabe itself have an update, with a notice the user can click to install
it, checked once per new day or new session." Design: `docs/designs/update-notices-and-reach.md`
(approach B, chosen by the user).

## Overview

Once a day Astrolabe checks four things: gstack, the Spec Kit CLI, this project's Spec Kit
skills, and Astrolabe itself. When any has an update, the band shows a button for it. One
click installs it, and a toast reports the result.

## Clarifications

### Session 2026-10-07

The user asked for the flow to run without stopping; each recommended answer was accepted.

- Q: How does the gstack button install, given `/gstack-upgrade` is an interactive skill? →
  A: The click runs `/gstack-upgrade` through `$.command.run` (the engine refuses a slash command sent as a prompt); Claude runs the skill. Still one click.
- Q: The project-skills refresh rewrites `.claude/skills/speckit-*`. → A: The first click asks
  for a second click (`confirm`); only the second runs `specify init --here --integration
  claude --force` in the Spec Kit root.
- Q: Where do results live? → A: In `$.store` under `updates` (`checkedOn` and the items), so
  a new session the same day shows them without checking again.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See what can be updated (Priority: P1)

1. **Given** no check today and `checkUpdates` on, **When** a session starts, **Then** the mod
   runs the four checks in the background and stores the result with today's date.
2. **Given** gstack reports `UPGRADE_AVAILABLE 1.91.32.0 1.91.33.0`, **Then** the band shows a
   second row `updates: [gstack 1.91.33.0]`.
3. **Given** a check already ran today, **When** another session starts, **Then** nothing runs
   and the stored items show.
4. **Given** a tool is missing or a check fails, **Then** that item is left out, nothing errors.
5. **Given** `checkUpdates: false`, **Then** nothing runs and no network call is made.

### User Story 2 - One click installs (Priority: P1)

1. **gstack**: the click runs the `/gstack-upgrade` command.
2. **specify**: the click runs `specify self upgrade`; success toasts
   `🧭 specify updated to <v>` and removes the item; failure toasts the first error line and
   the command to run by hand.
3. **Spec Kit skills**: the first click turns the button into `confirm: rewrite
   .claude/skills/speckit-*`; the second runs the refresh.
4. **astrolabe**: the click runs `claude plugin update astrolabe` and toasts
   `🧭 Astrolabe updated; run /reload-plugins`.

### Edge Cases

- A session that crosses midnight checks again on its next `session.start` or `turn.complete`
  of the new day.
- The band is off (`minimal`): the notices show in the `/astrolabe` pane's Session tab instead.

## Requirements *(mandatory)*

- **FR-001**: The mod MUST check at most once per local day (`updates.checkedOn` in `$.store`),
  started from `session.start` or a main `turn.complete` without delaying either.
- **FR-002**: Checks: gstack via `sh -c "$HOME/.claude/skills/gstack/bin/gstack-update-check"`
  (`UPGRADE_AVAILABLE <installed> <latest>`); the CLI via `specify self check` (any output other
  than `Up to date` naming two versions); project skills when `specify version`'s CLI version is
  newer than `.specify/integrations/speckit.manifest.json`'s `version`; Astrolabe via one GET of
  `https://api.github.com/repos/jonyfs/astrolabe/releases/latest` compared with the installed
  `plugin.json` version.
- **FR-003**: The band MUST show a second row with one Button per item when the preset turns
  the band on; the pane's Session tab MUST list them in any preset.
- **FR-004**: Clicks MUST act as US2 says, report with a toast, and drop the item on success.
- **FR-005**: `userConfig` `checkUpdates` (boolean, default true) MUST turn off every check and
  the network call.
- **FR-006**: The README MUST document the checks, the one network call, each button, and how
  to turn it off.

## Success Criteria *(mandatory)*

- **SC-001**: With every tool answering "up to date", no row and no toast appear.
- **SC-002**: At most one round of checks per local day across sessions.
- **SC-003**: With `checkUpdates: false`, zero process and network calls.
