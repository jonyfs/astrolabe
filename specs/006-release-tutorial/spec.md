---
track: full # quick | full
status: active # active | done | abandoned
---

# Feature Specification: Tag-driven releases and the statusline-to-mod tutorial

**Feature Branch**: `006-release-tutorial`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "006-release-tutorial: tag-driven release with the version check,
the complete README and the statusline-to-mod tutorial (design doc spec sequence, item 6)"

## Overview

A release happens only from a version tag, and only when the tag matches `plugin.json`'s
version and every check passes again on the tagged commit. A tutorial in `docs/tutorial/`
teaches how to turn a classic `statusLine` command into a mod, step by step, with
jonyfs/statusline as the worked example and Astrolabe as the result.

## Clarifications

### Session 2026-10-07

The user asked for the flow to run without stopping; each recommended answer was accepted.

- Q: Which tag format? → A: `vX.Y.Z`, as v0.1.0 used and Principle XIV states; the
  `astrolabe--vX.Y.Z` tags of `claude plugin tag` are not used.
- Q: How are release notes written? → A: GitHub's generated notes, with the install line on
  top.
- Q: Does the marketplace pin a release? → A: Not yet: a repository that is its own
  marketplace installs what `main` holds, and `main` moves only through reviewed pull requests
  and tagged releases. The README says so; the Complexity Tracking row stays.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Release from a tag (Priority: P1)

1. **Given** `plugin.json` at `0.6.0`, **When** the maintainer pushes tag `v0.6.0`, **Then** CI
   re-runs validate, tests and the type check on Ubuntu, macOS and Windows for that commit,
   and creates the GitHub release `v0.6.0` with generated notes.
2. **Given** tag `v0.6.1` while `plugin.json` says `0.6.0`, **Then** the workflow fails before
   any release and says both versions.
3. **Given** a tag that is not `vX.Y.Z`, **Then** nothing runs.

### User Story 2 - Learn to turn a statusline into a mod (Priority: P2)

1. **Given** someone who knows `statusLine` commands, **When** they read
   `docs/tutorial/README.md` in order, **Then** each step names the file in jonyfs/statusline
   and the file in this repository that does the same job, and ends with something they can
   run.
2. **Given** the eight steps of the design doc's outline, **Then** all eight are covered.

## Requirements *(mandatory)*

- **FR-001**: `.github/workflows/release.yml` MUST run only on tags matching `v*.*.*`.
- **FR-002**: It MUST check, before anything else, that the tag without `v` equals
  `plugin.json`'s `version`, using `scripts/check-release-version.sh`, and fail otherwise with
  both values in the message.
- **FR-003**: It MUST re-run `claude plugin validate .`, `claude plugin test .` and the type
  check on the three operating systems with the pinned Claude Code before releasing.
- **FR-004**: It MUST create the release with `gh release create <tag> --generate-notes` and
  the install line in the notes.
- **FR-005**: CI MUST test `scripts/check-release-version.sh` (a matching tag passes, a
  different one fails).
- **FR-006**: `docs/tutorial/README.md` MUST cover the design doc's eight steps, each pairing
  the statusline file with the Astrolabe file, with links.
- **FR-007**: The README MUST link the tutorial and describe how a release is cut.

## Success Criteria *(mandatory)*

- **SC-001**: A mismatched tag never produces a release.
- **SC-002**: Every step of the tutorial links an existing file in both repositories.

## Assumptions

- Publishing to the official plugin directory stays a form the owner submits.
