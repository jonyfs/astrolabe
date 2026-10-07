---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick spec: A README that shows every surface, with images of the real mod

**Created**: 2026-10-07 · **Source**: `/investigate` on README.md ("it must show visually every
way Astrolabe works in the terminal and in Claude Code, how to install, update, and so on:
complete documentation with images").

## Root cause

The README had no images because nothing turned the real mod into an image: the captures were
plain text (`docs/screens/*.txt`), and Principle II forbids drawn images of the mod. The text had
also drifted: the opening promised git and model state the mod does not draw, the status note
said governance "arrives in a later release" and linked a Roadmap section that no longer exists,
and Usage governance sat after Troubleshooting.

The captures also exposed a bug: the pane warned `! 001: [NEEDS CLARIFICATION] left after the
plan` for a finished feature whose spec only quotes the marker in backticks.

## Requirements

- **FR-001**: `scripts/capture/ansi-to-svg.mjs` MUST turn a `tmux capture-pane -e` capture into an
  SVG (24-bit, 256 and 16 colors, bold, dim, inverse; hyperlink and cursor codes dropped), tested.
- **FR-002**: `scripts/capture/scene.sh` MUST capture a live Claude Code screen with the installed
  mod, so every image is reproducible.
- **FR-003**: The README MUST show, with images of the real mod: the full screen at 180 and 100
  columns, the status entry states, the band, the update button, the hint, the three pane tabs,
  the `minimal` preset, the `latte` flavor, a folder without Spec Kit, and the install, update and
  configure commands; and say plainly what the Desktop app's Code tab shows, with what can be
  verified.
- **FR-004**: Clarification markers inside inline code or fenced code MUST NOT count, for the phase
  rule and for the pane warning.
- **FR-005**: The README's stale claims are removed and Usage governance moves before
  Troubleshooting.

## Tasks

- [X] T001 Converter and its test (`node scripts/capture/ansi-to-svg.test.mjs`)
- [X] T002 Failing tests for FR-004, then the fix in `hooks/core/phase.ts` and `hooks/core/compact.ts`
- [X] T003 Capture every scene into `docs/images/*.ansi` and render the SVGs
- [X] T004 Rewrite README.md around the images; humanize
- [X] T005 Validate, tests, tsc; CI runs the converter test
