# 🧭 Astrolabe

A Claude Code mod that shows where your session is and where it is heading: the
project, git and model state from a classic status line, live Spec Kit progress, and
usage-window governance that keeps subagent fan-out under your plan limits.

> **Status: v0.6.0.** Astrolabe draws a band above the prompt with the Spec Kit phase rail,
> the next command at the end of the prompt hint, the task in progress on the spinner line, an
> entry in the status line, a pane you open with `/astrolabe`, and two kinds of toast. Usage
> governance arrives in a later release (see [Roadmap](#roadmap)). Progress is tracked as Spec Kit features under `specs/`.

## Why "Astrolabe"

An astrolabe is a handheld instrument that astronomers and navigators used for centuries.
You sight a star or the sun through it, read how high the body stands above the horizon,
and from that one reading work out the time of day and where you are. Its front plate,
the rete, is a rotating map of the sky laid over the fixed coordinates of one place.

The mod does the same job for a coding session. It reads altitude: how full the context
window is, and how far the 5-hour and weekly usage windows have climbed. It turns those
readings into time: when each window resets and, at the current burn rate, when you would
reach 80%. It gives your position: the directory, branch and pull request, and which Spec
Kit feature you are in and at which phase (specify, clarify, plan, tasks, implement).

Navigators also steered by the astrolabe, and the mod acts on its readings too. When a
usage window gets high it slows down or queues new subagent dispatches, and it resumes
them after the reset.

The emoji is 🧭 because Unicode has no astrolabe. The compass is the closest navigation
instrument it offers, and the repository, the mod and its messages all use it.

## Install

You need Claude Code 2.1.292 or later (`claude --version`). In a Claude Code terminal
session, type:

```text
/plugin install astrolabe --marketplace jonyfs/astrolabe
```

Claude Code asks `Add marketplace?`. Answer `y`, pick the user scope with Enter, and you
see `Installed astrolabe. Plugin is now active.` The status entry appears in that same
session, with no restart.

The two-step form does the same thing:

```text
/plugin marketplace add jonyfs/astrolabe
/plugin install astrolabe@astrolabe
```

Installing changes no settings file by itself. Claude Code records the plugin and its
marketplace in `~/.claude/settings.json` (`enabledPlugins` and `extraKnownMarketplaces`),
the same as for any plugin, and the mod never writes there.

### Update and uninstall

```sh
claude plugin update astrolabe@astrolabe
```

Then type `/reload-plugins` in a running session, or start a new one.

```sh
claude plugin uninstall astrolabe@astrolabe
claude plugin marketplace remove astrolabe
```

### Install from a local clone

To try a working copy, add the folder as a marketplace. Claude Code then reads the plugin
from that folder, so edits show after `/reload-plugins`:

```sh
git clone https://github.com/jonyfs/astrolabe ~/src/astrolabe
claude plugin marketplace add ~/src/astrolabe
claude plugin install astrolabe@astrolabe
```

For a one-off session without installing, run `claude --plugin-dir ~/src/astrolabe`.

## What the status entry shows

Astrolabe adds one entry to the status line under the prompt. Claude Code puts the mod's
name in front of it, so in a terminal it looks like this (a real capture, see
[docs/screens/001-status-100.txt](docs/screens/001-status-100.txt)):

```text
  ⚠ astrolabe: ◆ 001 · implement 87%
```

Each part, from left to right:

| Part | Example | What it means |
|---|---|---|
| `⚠ astrolabe:` | | Drawn by Claude Code, not by the mod. It marks a line that a mod wrote, and it names the mod. |
| `◆` | | The Spec Kit marker. Every Astrolabe entry starts with it. |
| Feature id | `001` | The three-digit number of the active feature, from its folder name `specs/001-core-state/`. Every entry is at most 68 characters with the `⚠ astrolabe:` prefix, so it fits whole at 80 columns and wider. |
| `~` before the id | `~002` | The feature was guessed. `.specify/feature.json` exists but is broken or points at a folder that is not there, so Astrolabe fell back to the git branch or the newest open feature. Fix or delete `feature.json` and the `~` goes away. |
| Phase | `implement` | The first Spec Kit step this feature has not finished. See [Phases](#phases). |
| Percentage | `87%` | Ticked tasks out of all tasks in the feature's `tasks.md`, rounded down. 43 of 49 is `87%`. It appears only once `tasks.md` has tasks. |
| Running step | `· plan…` | A Spec Kit skill such as `/speckit-plan` was called during this turn. It disappears when the turn ends. |

The other entries you may see:

| Entry | When |
|---|---|
| `◆ no Spec Kit` | No folder from the session's directory up to the filesystem root holds a `.specify/` directory. Nothing else is read. |
| `◆ no active feature · next: /speckit-specify` | Spec Kit is set up, but every feature is done or abandoned, or there are none yet. The command after `next:` is the one to run. |
| `◆ no active feature · next: /speckit-constitution` | Same, and the constitution is missing or still the unfilled template. |
| `◆ 003 · abandoned` | `feature.json` names a feature whose spec says `status: abandoned`. A percentage follows when it has tasks (`◆ 003 · abandoned 40%`). |
| `◆ 001 · done 100%` | `feature.json` names a finished feature. Run `/speckit-specify` for the next one. |

### Phases

The phase is read from the files on disk, top to bottom; the first rule that matches wins.

| Rule | Phase | What to run next |
|---|---|---|
| `spec.md` front matter says `status: abandoned` | `abandoned` | `/speckit-specify` for a new feature |
| `spec.md` front matter says `status: done` | `done` | `/speckit-specify` |
| No `spec.md` | `specify` | `/speckit-specify` |
| Front matter says `track: quick` | `implement` | `/speckit-implement`, until you set `status: done` |
| No `plan.md`, and `spec.md` still has `[NEEDS CLARIFICATION` | `clarify` | `/speckit-clarify` |
| No `plan.md` | `plan` | `/speckit-plan` |
| No `tasks.md`, or no tasks in it | `tasks` | `/speckit-tasks` |
| Some tasks open | `implement` | `/speckit-analyze` before the first tick in a session, then `/speckit-implement` |
| All ticked, front matter says `status: active` | `implement` (100%) | Set `status: done` when you agree it is finished |
| All ticked | `done` | `/speckit-specify` |

### When it updates

Astrolabe reads every feature once when the session starts. At the end of each turn it
re-reads `feature.json`, the constitution, the `specs/` listing, the active feature, and any
other feature a tool touched during the turn, so a box you tick in another editor shows up
when the next turn ends. While a turn runs, an edit or write by Claude to `spec.md`,
`plan.md` or `tasks.md` updates the entry right after that tool call.

A project with 40 features costs one full read per session and a handful of file reads per
turn.

## What the band shows

The band is the row directly above the prompt. A real capture at 180 columns
([docs/screens/002-band-180.txt](docs/screens/002-band-180.txt)):

```text
◆ 002 band-hint  constitution ● specify ● clarify ● plan ● tasks ● implement ◐  ███████░░░ 14/18 77%
```

| Part | Example | What it means |
|---|---|---|
| Id and name | `◆ 002 band-hint` | The active feature, from `specs/002-band-hint/`. A `~` before the id means the feature was guessed, as in the status entry. |
| The rail | `constitution ● specify ● … implement ◐` | The six Spec Kit steps in order. `●` is finished, `◐` is the step the feature is in now, `○` is still ahead. The constitution is `●` once it is ratified; while it is missing or still the template it is `◐` and every later step is `○`. |
| `…` after a mark | `plan ◐…` | A Spec Kit skill for that step is running in this turn. |
| The bar | `███████░░░` | Ten cells, one per tenth of the tasks ticked, rounded down. It appears once `tasks.md` has tasks. |
| The count | `14/18 77%` | Ticked tasks, all tasks, and the percentage rounded down. |

A finished feature shows every mark as `●` and a full bar. An abandoned feature named by
`feature.json` shows `◆ 003 name  abandoned` instead of the rail.

When the band is narrower, it drops detail in this order and never cuts the id: the labels of
the finished and later steps, then the name, then the bar, then the count, then everything
but `◆ 002`. In a 100-column terminal it looks like this
([docs/screens/002-band-100.txt](docs/screens/002-band-100.txt)):

```text
◆ 002 band-hint  ● ● ● ● ● implement ◐  ███████░░░ 14/18 77%
```

The band shows nothing of its own when the project has no Spec Kit, when no feature is active
(the prompt hint then names the command to run), or while a survey uses the band. Whatever
other mods draw there stays.

## What the spinner says

While a turn works on the active feature, the spinner line names the task in progress and how
long it has been the current one:

```text
Sauteing… T014 · Write the parser tests in tests/core/x.test.ts · 3m
```

Claude Code still draws its own word and, after Astrolabe's part, the turn's time and token
count. Astrolabe only adds the part after the word:

| Part | What it means |
|---|---|
| `T014` | The id of the first open task in the active feature's `tasks.md`. |
| The text | The task's text without the `[P]` and `[US1]` markers or backticks, cut with `…` when the terminal is narrow. The id is never cut. |
| `3m` | How long this task has been the first open one, counted from when Astrolabe first saw it this session: `45s`, `12m` or `1h 5m`. |

It shows only during a turn that works on the active feature, meaning `/speckit-implement` was
called or a tool edited a file in the feature's folder during the turn. Other turns keep the
plain spinner. When Claude Code shows its own message on the spinner (while compacting, for
example), that message wins.

## What the prompt hint shows

While the prompt is empty, Astrolabe adds the next Spec Kit command to the end of Claude
Code's hint line, after whatever is already there:

```text
⏵⏵ auto mode on (shift+tab to cycle) · next: /speckit-implement · 4 tasks left
```

The command is the one in the [Phases](#phases) table. In the implement phase it also counts
the tasks left. It disappears as soon as you type.

## Options

Two options appear in Claude Code's config menu (`/config`, then Astrolabe). Changing one
reloads the mod right away.

| Option | Values | Default | What it changes |
|---|---|---|---|
| `preset` | `minimal`, `compact`, `full` | `compact` | Where Astrolabe draws. `minimal` keeps only the status entry. `compact` adds the band, the prompt hint, the spinner narration and the drift alarm. `full` also opens the `/astrolabe` pane by itself on a wide fullscreen terminal, and shows phase toasts as well as the drift alarm. |
| `flavor` | `mocha`, `frappe`, `macchiato`, `latte` | `mocha` | The Catppuccin palette for the band. `latte` is the light one. |

You can also type `/plugin configure astrolabe@astrolabe` in a session, or set them from a
shell. Options you leave out keep their values:

```sh
claude plugin configure astrolabe@astrolabe                      # show the current values
echo '{"preset":"minimal","flavor":"latte"}' | claude plugin configure astrolabe@astrolabe --values-stdin
```

Colors are sent as hex values. On a terminal without truecolor, Claude Code decides how close a
color it can show.

## The /astrolabe pane

Type `/astrolabe` to open a pane with three tabs. In a fullscreen terminal it docks at the
right; otherwise it sits above the prompt. To use the keys, focus it with a click or
`ctrl+x tab`, then press `1`, `2` or `3`. The tab you pick stays for the session.

**1 Specs** lists every feature (real capture,
[docs/screens/004-pane-specs.txt](docs/screens/004-pane-specs.txt)):

```text
[ Specs ][ Tasks ][ Session ]
  ● 001 core-state  done  ██████████ 100%
  ◐ 002 band-hint  implement  █████████░ 94%
▸ ◐ 004 pane  implement  ███████░░░ 72%
```

`▸` marks the active feature. `●` is done, `◐` in progress, and `○` abandoned (drawn dim). Under
the list come warnings: a `~` line when the active feature was guessed because
`.specify/feature.json` is broken, and a `!` line for a spec that still has
`[NEEDS CLARIFICATION` after its plan exists.

**2 Tasks** lists the active feature's open tasks in file order, after a count
([docs/screens/004-pane-tasks.txt](docs/screens/004-pane-tasks.txt)):

```text
8/11 done
T009 README: the command, each tab with an example, hotkeys, the unasked-open r…
T010 Run validate, tests and tsc; capture the pane in tmux into docs/screens/00…
```

When more tasks are open than the pane has rows, the last line says `+N more`.

**3 Session** shows how Astrolabe sees the project right now:

```text
root          /Users/me/src/astrolabe
constitution  ratified
active        004 pane
chosen by     feature.json
next          /speckit-implement
running       none
analyzed      yes
current task  T009 · 4m
```

`chosen by` is how the active feature was picked (`feature.json`, `branch` or `latest`).
`analyzed` says whether `/speckit-analyze` ran in this session.

With the `full` preset, the pane also opens by itself once per session, at the end of the
first turn, but only in a fullscreen terminal at least 144 columns wide. It never opens by
itself on a narrower or non-fullscreen terminal.

## Toasts

Astrolabe raises two short notices in Claude Code's toast area. Each marks a change, never a
turn, so they stay rare.

**Drift alarm** (presets `compact` and `full`). When Claude ticks a task in `tasks.md` but no
code file was edited since the previous tick (or since the session started), you see:

```text
🧭 T014 was ticked with no code edited since the last tick
```

If the task names files, at least one of them has to have been edited, or the toast lists them:

```text
🧭 T014 was ticked, but none of its files were edited: tests/core/parser.test.ts
```

A code file is any file inside the Spec Kit root that is not under `specs/` or `.specify/`,
edited with Edit, Write or NotebookEdit, by Claude or by a subagent. The check covers one turn:
any code edit in the turn covers every tick in it, and a turn raises the alarm at most once. It
stays quiet when a Bash or Agent call happened in the turn, because the mod cannot see what
those changed. A box you tick in your own editor never raises it.

Two limits to know: edits outside the Spec Kit root (code beside a nested `.specify/` in a
monorepo) are not seen, and in a batch of parallel tool calls a tick that runs before its code
edit raises the alarm.

**Phase toast** (preset `full` only). When the files on disk show that a feature moved to a
later phase, you see it once per session:

```text
🧭 002 band-hint moved to tasks · next: /speckit-tasks
🧭 002 band-hint is done · next: /speckit-specify
```

To decide what is new, Astrolabe keeps each feature's last seen phase in its own store (the
plugin's JSON file under your Claude Code configuration folder). That is the only thing it
stores. The first check of each session only updates it, so a change made between sessions
does not toast. A Spec Kit skill that starts never toasts by itself; only the files count.

To turn the toasts off, pick the `minimal` preset, or `compact` to keep only the drift alarm.

## What Astrolabe reads

Only files inside the Spec Kit root, the nearest folder above the session's directory that
holds `.specify/`. It never writes a project file, never runs a process and makes no network
calls. Its only write is the phase baseline in its own store (see [Toasts](#toasts)).

| File | Used for |
|---|---|
| `.specify/feature.json` (`feature_directory`) | The active feature, when it names an existing `specs/NNN-name/` folder. |
| `.specify/memory/constitution.md` | Whether the constitution is missing, still the template (it contains placeholders like `[PROJECT_NAME]`), or ratified. |
| `specs/NNN-name/spec.md` | The front matter and any `[NEEDS CLARIFICATION` markers. |
| `specs/NNN-name/plan.md` | Only whether it exists. |
| `specs/NNN-name/tasks.md` | The tasks. |
| `.git/HEAD` (or the `gitdir:` file of a worktree) | The current branch, read as a file. |

### Which feature is active

1. `.specify/feature.json`, when its `feature_directory` names a folder under `specs/`
   that exists. Relative, absolute and Windows spellings all work.
2. Otherwise the git branch, when it is named like a feature folder (`002-band-hint`) and
   that folder exists.
3. Otherwise the highest-numbered feature that is neither done nor abandoned.

Spec Kit's `SPECIFY_FEATURE` and `SPECIFY_FEATURE_DIRECTORY` environment variables are
ignored, because a mod cannot read environment variables. Use `feature.json` or the branch.

### Tasks

A task is a line that starts with `-` or `*`, a space and a checkbox: `- [ ]`, `- [x]` or
`- [X]`. Both `x` and `X` count as done (`/speckit-implement` writes `[X]`). Indented
checkboxes count. Lines inside fenced code blocks do not.

```markdown
- [X] T001 Create the manifests
- [ ] T002 [P] [US1] Write the parser tests
  - [ ] T003 Nested tasks count too
- [ ] fix the typo        <- ignored: this file has task ids, and this line has none
```

When any task in the file carries an id (`T001`), lines without one are skipped, so a
stray checklist in the same file does not change the count.

### Front matter

A spec can say what it is instead of letting Astrolabe guess. Put this at the very top of
`spec.md`:

```yaml
---
track: full    # quick | full
status: active # active | done | abandoned
---
```

`status: done` and `status: abandoned` win over every other rule. `track: quick` keeps a
spec with no plan or tasks in `implement`. This repository's spec template already adds the
block to new specs.

## Where it works

| Surface | Draws |
|---|---|
| Terminal on Linux, macOS and Windows (Claude Code 2.1.287 or later) | Yes |
| Claude Desktop app, Code tab (2.1.286 or later) | Yes |
| VS Code extension, `claude -p`, cloud sessions | No. The mod's hooks run but nothing is drawn, and nothing errors. |

CI runs the tests on Ubuntu, macOS and Windows for every pull request.

Astrolabe replaces jonyfs/statusline. It does not set `statusLine`, so if you still have a
classic status line command configured, both show.

## Troubleshooting

- **Nothing appears.** Check `claude --version` (2.1.292 or later) and
  `claude plugin list` (`astrolabe@astrolabe`, enabled). Mods draw only in the terminal and
  the Desktop app's Code tab.
- **The wrong feature shows, or a `~`.** Open `.specify/feature.json`. Its
  `feature_directory` must name a folder under `specs/` that exists, for example
  `"specs/002-band-hint"`.
- **A tick does not show.** The entry follows the disk at the end of each turn. Send any
  prompt and wait for the turn to end.
- **See what the mod did.** Run `claude --debug`. Any error Astrolabe caught is written to the
  debug log as a line starting with `astrolabe:`. While a plugin folder is hot-reloaded, the
  transcript also shows a dim line when a hook was skipped.

## Roadmap

These are designed and planned, one Spec Kit feature each:

| Release | Adds |
|---|---|
| 007 | Once a day, clickable notices when gstack, the Spec Kit CLI or Astrolabe has an update |

Usage governance (the bands below, from the usage-governor skill) also lands in a later
release:

| Band | Highest window | What happens to new subagent dispatches |
|---|---|---|
| ok | below 60% | up to 6 at once |
| throttle | 60% to 80%, or on pace to cross 80% before the reset | cap of 3, then 1 |
| hold | 80% or more | denied and queued |
| stop | 88% or more | denied and queued; the session pauses and resumes at the reset |
| ceiling | 90% or more | only read-only tools until the owner lifts it |

The design study shows the planned presets and states. It is a design drawing, not a
capture of the mod: [docs/design/study.html](docs/design/study.html) (rendered:
[docs/design/study.png](docs/design/study.png)).

## From a statusline to a mod

[docs/tutorial/README.md](docs/tutorial/README.md) teaches, in eight steps, how to turn a
classic `statusLine` command into a mod, with jonyfs/statusline as the worked example and this
repository as the result. Each step pairs the file in one with the file in the other.

## Development

```sh
claude plugin validate .
claude plugin test .
npx -p typescript@5 tsc -p .
```

`scripts/sync-engine-types.sh` refreshes `types/engine/claude-code.d.ts`, the engine's own
declarations used for the type check, after a Claude Code update.

### Releasing

A release comes only from a tag `vX.Y.Z` equal to `plugin.json`'s `version`. Bump the version
in a pull request, merge it, then tag `main`:

```sh
sh scripts/check-release-version.sh v0.6.0   # the same check the release workflow runs
git tag -a v0.6.0 -m "Astrolabe v0.6.0"
git push origin v0.6.0
```

The release workflow checks the tag against `plugin.json`, runs validation, tests and the type
check again on Ubuntu, macOS and Windows, and creates the GitHub release with generated notes.
A tag that does not match never produces a release.

Installs follow `main`: the repository is its own marketplace, and `main` changes only through
reviewed pull requests and tagged releases.

### Process

Every change starts as a Spec Kit feature under `specs/` and goes through
`/speckit-specify`, `/speckit-clarify`, `/speckit-plan`, `/speckit-tasks`,
`/speckit-analyze` and `/speckit-implement`, test first. The rules are in
[.specify/memory/constitution.md](.specify/memory/constitution.md). Everything in this
repository is written in English.

## License

MIT. See [LICENSE](LICENSE).
