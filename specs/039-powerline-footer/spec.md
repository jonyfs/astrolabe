---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick spec: The footer in statusline's colours

**Created**: 2026-10-08 · **Source**: the owner asked that the mod's footer look like the jonyfs/statusline project's

## Requirements

- **FR-001**: The pane footer MUST draw its parts as Powerline chips in statusline's Catppuccin
  colours: Spec Kit mauve, model red, git lavender, cost teal, duration surface1, the usage windows
  and the context on statusline's ramp.
- **FR-002**: The ramp MUST be statusline's: green below 60%, yellow to 85% with `▵`, red above with
  `▴`; the context takes the colour and not the mark.
- **FR-003**: Chips MUST carry dark or light text by the chip's luminance, and the solid Powerline
  arrow only with the Nerd Font icon set; with `ascii` icons or the accessible mode the footer stays
  plain text.
- **FR-004**: The flavor option MUST pick the chip palette; `theme` uses latte on a light theme and
  mocha on a dark one.

## Tasks

- [x] T001 Tests in `tests/core/powerline-footer.test.ts`
- [x] T002 `footerChips`, `rampOf`, `CHIPS`, the chip row in the pane footer
- [x] T003 README, version 0.29.0
