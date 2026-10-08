---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick spec: Pull requests tab

**Created**: 2026-10-07 · **Source**: roadmap 032 in `docs/roadmap.md`, picked by the owner

Done in 0.32.0. Tests: `tests/integration/prs-tab.test.tsx`. Every action asks for a second press before `gh` runs.

## Tasks

- [x] T001 Open pull requests with labels, review state and CI checks (running, passed, failed), through `gh` on a timer
- [x] T002 A row opens the pull request in the browser
- [x] T003 Buttons to approve, update the branch from its base, and merge when GitHub allows it

## Fix in 0.32.1

- The state contract used an `import(...)` type, which `claude plugin validate` refuses (the
  contract must be self-contained); the row type is now written out in `types/index.d.ts`.
- A merge now passes `--match-head-commit` with the head commit the list showed, so a push between
  the read and the second press makes the merge fail instead of landing unseen commits.
