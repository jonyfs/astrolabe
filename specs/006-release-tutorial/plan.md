# Implementation Plan: Tag-driven releases and the statusline-to-mod tutorial

**Branch**: `006-release-tutorial` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

## Summary

A POSIX shell script compares a tag with `plugin.json`'s version (no dependency: `sed` on
the one-line field). The release workflow runs it first, then the same three-OS matrix as CI
on the tagged commit, then `gh release create --generate-notes`. CI tests the script. The
tutorial is one Markdown page in `docs/tutorial/`, linking files of both repositories.

## Constitution Check

| Principle | Compliance | Status |
|---|---|---|
| I, II | English; README links the tutorial and documents releases; the tutorial pairs real files (II). | Pass |
| VI | The version check has a test run by CI. | Pass |
| XIV | Tag equals version, checked; release only from `vX.Y.Z` tags; the earlier tag-gate deferral is closed. The unpinned marketplace source stays in Complexity Tracking. | Pass |

## Project Structure

```text
scripts/check-release-version.sh       # <tag> -> exit 0 or 1 with a message
scripts/test-check-release-version.sh  # runs the cases; CI calls it
.github/workflows/release.yml
.github/workflows/ci.yml               # + the script test
docs/tutorial/README.md
README.md
```

## Complexity Tracking

| Item | Why needed | Simpler alternative rejected because |
|---|---|---|
| Marketplace `source: "./"` with no pinned ref | The repository is its own marketplace; `main` moves only through reviewed pull requests and tagged releases. | A pinned ref needs a release branch or a second marketplace repository, more process than a single-maintainer mod needs today. |
