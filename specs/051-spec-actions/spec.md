---
track: quick # quick | full
status: active # active | done | abandoned
---

# Quick spec: Act on a spec from the pane

**Created**: 2026-10-08 · **Source**: the owner asked to review every tab with an efficient model, to prioritize a spec, to review a spec with a more expensive model, and to run `/investigate` and other gstack skills when gstack is installed

Astrolabe still writes nothing in the project: priorities live in its own store, reviews in
the session state, and a skill runs only when the person presses its button.

## What it does

- **Priority.** `/astrolabe priority <id> high|normal|low` (or `p` on the Specs tab, cycling the
  active feature) marks a spec. The Specs tab orders each section by priority and shows `↑` for
  high and `↓` for low. When the active feature is done, the next-up spec with the highest
  priority is named in the next command's reason. Stored per project in `$.store`
  (`priority:<folder>`), listed in `docs/privacy.md`.
- **Deep review.** `/astrolabe review [id]` sends the spec's `spec.md`, `plan.md` and `tasks.md`
  and the constitution's principle names to a more expensive model (`opus`, effort `xhigh`) with
  one question: what is missing, ambiguous, inconsistent or risky, at most 10 findings. The
  answer lands in the Session tab under `review` and a toast says it is ready. It runs from a
  timer, never inside a hook's 10 seconds, and only when the person types the command.
- **gstack skills.** When gstack is installed (`~/.claude/skills/gstack`), the active feature's
  summary on the Specs tab gets a row of buttons: `investigate`, `review`, `health`, `qa-only`,
  `retro`. Each runs that skill with the active feature named in its arguments. Without gstack
  the row is not drawn.
- **Per-tab audit.** The findings of an audit of each tab (Specs, Tasks, Session, Dashboard,
  Help, Config, PRs) by an efficient model become tasks in spec 052.

## Tasks

- [x] T001 Priority: `/astrolabe priority`, the store, order within sections, `↑`/`↓` (P1)
- [x] T002 Priority: `p` on the Specs tab cycles the active feature's priority (P1)
- [x] T003 Deep review: `/astrolabe review [id]` on `opus` at `xhigh`, the Session tab row, the toast (P1)
- [x] T004 gstack row: buttons for investigate, review, health, qa-only, retro when gstack is installed (P1)
- [ ] T005 The next command's reason names the highest-priority next-up spec (P2)
- [x] T006 Help, README and privacy.md for all of the above (P1)
- [ ] T007 Spec 052 from the per-tab audit findings (P1)
