# Pre-submission audit: Astrolabe 0.8.1

Date: 2026-10-07. Scope: quality, performance, UX and resource use of the mod on `main`, and
what the Claude plugin directory needs before Astrolabe is submitted. Checked against the
directory's [pre-submission checklist](https://claude.com/docs/plugins/pre-submission-checklist)
and the entries in `anthropics/claude-plugins-official`.

No stronger-model subagent review ran for this audit: the usage governor held subagents (the
weekly window was above 80%). Findings come from tests, live captures and measurements in the
session that made them.

## Fixed during the audit

| Area | Finding | Fix |
|---|---|---|
| Resources | The session state carried the full text of every spec, tasks file and the constitution: about 100 KB in this repository, over 500 KB with 40 features. It was rewritten on every Bash, Agent, Edit, Write and Skill call and read on every band, hint, spinner and pane redraw. | Spec 009 (#12): compacted memo in its own key that no drawing reads; no write when nothing changed (a second Bash call in a turn now writes nothing, tested). |
| Correctness | Two writers finishing out of order could leave the drawn state older than the memo. | Spec 009: the state carries its memo version; an older one never replaces a newer one. |
| Correctness | At 88% and above, the governor refused the tools of subagents already running, stopping them. | #9. |
| UX | The update buttons overflowed narrow terminals. | #10. |
| Reach | UNC paths (`\\server\share`, `\\wsl.localhost`) showed `◆ no Spec Kit`; symlinked feature folders were skipped. | #11. |
| UX | A finished feature showed `! [NEEDS CLARIFICATION] left after the plan` because its spec quoted the marker in backticks. | Spec 010 (#13): markers in code no longer count. |
| UX | `/astrolabe` opened the pane without the keyboard; `1`, `2`, `3` did nothing until `ctrl+x tab`, which the update button's focus stop made worse. | Spec 010: the typed command opens it focused, Esc closes it; an unasked open never takes focus. |
| UX | A feature without `tasks.md` showed `0/0 done`. | Spec 010: it says there are no tasks yet. |
| Docs | The README had no images and claimed git and model state the mod does not draw. | Spec 010: every surface shown with captures of the real mod. |
| Tests | A 40-feature test was failing on `main` (7.7 s against a 5 s limit). | Spec 009: the test fake caches its index (about 1.8 s). |

## Measurements

- Tests: 318 pass on Ubuntu, macOS and Windows (CI); `claude plugin validate` and `tsc` clean.
- Reads per turn on a 40-feature project: the active feature's `spec.md` and `tasks.md`,
  `feature.json`, the constitution, one listing, 4 `exists` checks (tested exactly).
- Deriving 100 features with 200 tasks each: about 30 ms in the test engine, and only at
  session start.
- Network: one request a day (GitHub releases API), off with `checkUpdates: false`.
- Processes: up to three a day for the update check (`gstack-update-check` through `sh`,
  `specify self check`, `specify version`), and only on a click to install.

## Directory checklist

| Check | Result |
|---|---|
| `plugin.json` at the plugin folder, name, version, description, author | Pass |
| Name `astrolabe` not taken, not reserved | Pass |
| README of 40+ words, LICENSE | Pass |
| No `.DS_Store`, binaries, symlinks, LFS, submodules | Pass |
| 512 files or fewer | Pass (about 270) |
| Every non-image file under 256 KiB | Pass since 0.9.0 (spec 011 moved `types/engine/claude-code.d.ts`, 789 KB, out of the repository) |
| Readable source, behaviour disclosed in the README | Pass (network call, processes, store and tool refusals are documented) |

## Decisions for the owner before submitting

1. ~~The vendored engine declarations~~: done in spec 011 (0.9.0). CI fetches them from the
   `engine-types-2.1.292` pre-release; they are no longer committed or shipped.
2. **`governUsage` defaults to on.** For directory users, a third-party plugin that refuses tool
   calls from 88% and submits a resume prompt by itself is a strong default. Consider `false`.
3. **`checkUpdates` defaults to on.** Since spec 012 it no longer starts a shell: gstack's check
   runs only when the script exists. It still runs `specify` daily for people without Spec Kit's
   CLI (the call fails and is skipped). Kept on; consider `false` for the directory.
4. ~~Update buttons cannot be dismissed~~: done in spec 012 (a `hide` button).
5. **Astrolabe would be the first mod in the directory.** None of the 315 plugins listed today is
   a hooks module, so expect closer human review.

## Still open

- **Desktop app images**: Claude Code documents that it raises the band, the spinner and the pane
  in the Desktop app's Code tab, but no capture from the app exists. It needs the app open on
  `docs/demo/`.
- **Spinner narration starts late**: it shows only after `/speckit-implement` runs or a tool
  touches the feature in the turn, so in a short turn it appears for a second or two.
- **Two governors in this repository**: the usage-governor skill's hooks in
  `.claude/settings.local.json` and Astrolabe both gate tool calls here. Keep one.
- Smaller items from the 001 and 005 reviews: an unreadable file counts as missing, and two
  sessions on one root share a baseline. (Stale features are now dropped from the baseline.)
- The constitution's Principle V says the module cannot read environment variables; Claude Code
  2.1.292 offers `$.env.get`. The rule it supports still holds (`SPECIFY_FEATURE` is not read),
  but the stated reason needs a PATCH amendment through `/speckit-constitution`.
