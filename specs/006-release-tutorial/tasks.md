---
description: "Task list for 006-release-tutorial"
---

# Tasks: Tag-driven releases and the statusline-to-mod tutorial

**Tests**: the version check has a test (Principle VI).

## Phase 1: User Story 1 - releases (P1)

- [X] T001 [US1] Write the failing test `scripts/test-check-release-version.sh` for the three cases of contracts/release.md
- [X] T002 [US1] Write `scripts/check-release-version.sh` until T001 passes
- [X] T003 [US1] Add the script test to `.github/workflows/ci.yml`
- [X] T004 [US1] Write `.github/workflows/release.yml`: `v*.*.*` tags only, version check first, the three-OS verify matrix with the pinned Claude Code, then `gh release create --generate-notes` with the install line

## Phase 2: User Story 2 - tutorial (P2)

- [X] T005 [US2] Write `docs/tutorial/README.md`: the eight steps of the design doc, each pairing a jonyfs/statusline file with the Astrolabe file, each ending with something to run; humanize the prose
- [X] T006 [US2] Check every link in the tutorial resolves (both repositories)

## Phase 3: Polish

- [X] T007 README: link the tutorial; a "Releasing" section; bump `plugin.json` to `0.6.0`
- [X] T008 Run validate, tests, tsc and the script test
- [ ] T009 Full review with a stronger model; apply the fixes; mark `status: done`
