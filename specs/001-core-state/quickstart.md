# Quickstart: validate 001-core-state

## Prerequisites

- Claude Code 2.1.292 or later (`claude --version`).
- Node.js for `npx` (type check only).

## Automated checks

```sh
claude plugin validate .
claude plugin test .
npx -p typescript@5 tsc -p .
```

Expected: validation passes (warnings allowed), every test passes, `tsc` prints nothing.

## Manual check from the working copy

```sh
claude --plugin-dir .
```

In this repository the status line under the prompt shows `◆ 001 · implement <n>%` while
this feature is being implemented. Tick a task in `specs/001-core-state/tasks.md` from
another editor, send any prompt, and the percentage changes when the turn ends.

In a directory without `.specify/` (for example `/tmp`), the entry reads `◆ no Spec Kit`.

## Install check (after the release)

```text
/plugin install astrolabe --marketplace jonyfs/astrolabe
```

Answer `y` to `Add marketplace?`, pick the user scope, and the entry appears in the same
session. Confirm that `git status` in `~/.claude` (or a diff of `settings.json`) shows no
change made by the mod.

## Local marketplace check (before the release)

```text
/plugin marketplace add /Users/jony/repositorios/ai/astrolabe
/plugin install astrolabe@astrolabe
```

The plugin is read from the folder itself, so `/reload-plugins` picks up edits.
