# Plugin directory listing

The texts and art for Astrolabe's entry in the Claude Code plugin directory.

## Name

Astrolabe

## Tagline

Spec Kit progress, usage and git, always in view while Claude works.

## Description

Astrolabe shows where a Spec Kit project stands while Claude works on it. A band above the prompt
follows the active feature through constitution, specify, clarify, plan, tasks and implement, with a
bar for its tasks and the next command one key away. The footer carries what a statusline would: the
5-hour and 7-day windows with their resets, the context window, the model, git and the cost, in
Catppuccin colours. The `/astrolabe` pane lists every feature, the open tasks, the session, a
dashboard with charts, help, every option and the open pull requests.

A usage governor holds new subagents and pauses tools near the rate limits, asks you what to do,
and resumes the work when the window renews. Everything runs on your machine: no server, no
telemetry, one request a day for the update check.

## Category

Developer tools

## Keywords

spec kit, spec-driven development, statusline, rate limits, usage, tasks, progress, git, pull requests

## Art

- `icon.svg` (256 × 256): the astrolabe dial. Six steps around a mauve ring, the done steps green,
  the current one peach with the needle on it, the steps ahead grey. Catppuccin Mocha on its base.
- Screenshots: the images in `docs/images/` (`overview-180.svg`, `pane-specs.svg`,
  `pane-tasks.svg`, `pane-session.svg`).

## Links

- Repository: https://github.com/jonyfs/astrolabe
- Install: `/plugin install astrolabe --marketplace jonyfs/astrolabe`
- Privacy: `docs/privacy.md`
