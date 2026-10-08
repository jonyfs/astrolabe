---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick spec: The advisor reviews a spec

**Created**: 2026-10-08 · **Source**: the owner asked to call the advisor to review a spec from Astrolabe

## Root cause of the gap

The advisor is a server tool the API runs inside the main model's request (`serverToolUses`
in `turn.step`). A mod cannot call it: no `tool.call` chain runs for it. Astrolabe can ask
Claude to call it, and can see each call in the step's result.

## Tasks

- [x] T001 `/astrolabe advisor [id]`, typed by the person, sends one prompt asking Claude to read the spec's files and call the advisor, editing nothing (P1)
- [x] T002 An `advisor review` button on the Specs tab, beside gstack's skills, for the active feature (P1)
- [x] T003 Each advisor run counted from `turn.step`'s `serverToolUses`, shown in the Session tab with the last time (P1)
- [x] T004 The advisor's answer captured into the Session tab like `/astrolabe review`'s findings (P2)
