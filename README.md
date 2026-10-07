# 🧭 Astrolabe

A Claude Code mod that shows where your Spec Kit work stands and keeps your session under
its usage limits: a phase rail above the prompt, the next command to run, the task in
progress, a pane with every feature, toasts when something changes, buttons that install
updates, and a status entry with your fullest usage window.

![Astrolabe in a 180-column terminal](docs/images/overview-180.svg)

> **Version 0.8.1.** Every image in this README is a capture of the real mod running in Claude
> Code 2.1.292, made with `scripts/capture/scene.sh` in the demo project
> [docs/demo/](docs/demo/) (see [How the images are made](#how-the-images-are-made)).

## At a glance

| Where | What Astrolabe draws | Section |
|---|---|---|
| Above the prompt | The active feature, the six Spec Kit steps, a progress bar, and buttons for updates | [The band](#what-the-band-shows) |
| Under the prompt | `◆ 002 · implement 45% · 5h 42%`: feature, phase, progress, usage window | [The status entry](#what-the-status-entry-shows) |
| The hint line | `next: /speckit-implement · 11 tasks left` | [The prompt hint](#what-the-prompt-hint-shows) |
| The spinner | `… T011 · Show an empty-cart message · 1s` while Claude works on the feature | [The spinner](#what-the-spinner-says) |
| `/astrolabe` | A pane with Specs, Tasks and Session tabs | [The pane](#the-astrolabe-pane) |
| Toasts | A task ticked with no code edited; a phase finished | [Toasts](#toasts) |
| Tool calls | New subagents capped or held, the session paused near the limit | [Usage governance](#usage-governance) |

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
session, with no restart. To check it from a shell:

![claude plugin list](docs/images/cli-list.svg)

The two-step form does the same thing:

```text
/plugin marketplace add jonyfs/astrolabe
/plugin install astrolabe@astrolabe
```

From a shell it is the same two commands (a real capture, on a machine where Astrolabe was not
installed):

![claude plugin marketplace add and install](docs/images/cli-install.svg)

The four options start unset, which means their defaults (see [Options](#options)).

Installing changes no settings file by itself. Claude Code records the plugin and its
marketplace in `~/.claude/settings.json` (`enabledPlugins` and `extraKnownMarketplaces`),
the same as for any plugin, and the mod never writes there.

### Update and uninstall

```sh
claude plugin update astrolabe@astrolabe
```

![claude plugin update](docs/images/cli-update.svg)

Then type `/reload-plugins` in a running session, or start a new one. Astrolabe also checks
for its own new release once a day and offers a button for it (see
[Update notices](#update-notices)).

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
name in front of it:

```text
  ⚠ astrolabe: ◆ 002 · implement 45% · 7d 81% hold
```

Each part, from left to right:

| Part | Example | What it means |
|---|---|---|
| `⚠ astrolabe:` | | Drawn by Claude Code, not by the mod. It marks a line that a mod wrote, and it names the mod. |
| `◆` | | The Spec Kit marker. Every Astrolabe entry starts with it. |
| Feature id | `001` | The three-digit number of the active feature, from its folder name `specs/001-core-state/`. The Spec Kit part is at most 68 characters with the `⚠ astrolabe:` prefix, and the usage part adds at most 18 more, so it fits whole at 100 columns and wider; Claude Code cuts what does not fit. |
| `~` before the id | `~002` | The feature was guessed. `.specify/feature.json` exists but is broken or points at a folder that is not there, so Astrolabe fell back to the git branch or the newest open feature. Fix or delete `feature.json` and the `~` goes away. |
| Phase | `implement` | The first Spec Kit step this feature has not finished. See [Phases](#phases). |
| Percentage | `87%` | Ticked tasks out of all tasks in the feature's `tasks.md`, rounded down. 43 of 49 is `87%`. It appears only once `tasks.md` has tasks. |
| Running step | `· plan…` | A Spec Kit skill such as `/speckit-plan` was called during this turn. It disappears when the turn ends. |
| Usage window | `· 7d 81% hold` | The fuller of your 5-hour and weekly windows, and its band when it is not ok. See [Usage governance](#usage-governance). |

The other entries you may see:

| Entry | When |
|---|---|
| `◆ no Spec Kit` | No folder from the session's directory up to the filesystem root holds a `.specify/` directory. Nothing else is read. The band only shows update buttons, if any (image below). |
| `◆ no active feature · next: /speckit-specify` | Spec Kit is set up, but every feature is done or abandoned, or there are none yet. The command after `next:` is the one to run. |
| `◆ no active feature · next: /speckit-constitution` | Same, and the constitution is missing or still the unfilled template. |
| `◆ 003 · abandoned` | `feature.json` names a feature whose spec says `status: abandoned`. A percentage follows when it has tasks (`◆ 003 · abandoned 40%`). |
| `◆ 001 · done 100%` | `feature.json` names a finished feature. Run `/speckit-specify` for the next one. |
| `… · 5h 42%` | The fuller usage window, with its band when it is not ok (`5h 83% hold`). See [Usage governance](#usage-governance). |

![A folder without Spec Kit](docs/images/no-speckit.svg)

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

The band is the row directly above the prompt (the first row in the image at the top):

```text
◆ 002 shopping-cart  constitution ● specify ● clarify ● plan ● tasks ● implement ◐  ████░░░░░░ 9/20 45%
```

| Part | Example | What it means |
|---|---|---|
| Id and name | `◆ 002 band-hint` | The active feature, from `specs/002-band-hint/`. A `~` before the id means the feature was guessed, as in the status entry. |
| The rail | `constitution ● specify ● … implement ◐` | The six Spec Kit steps in order. `●` is finished, `◐` is the step the feature is in now, `○` is still ahead. The constitution is `●` once it is ratified; while it is missing or still the template it is `◐` and every later step is `○`. |
| `…` after a mark | `plan ◐…` | A Spec Kit skill for that step is running in this turn. |
| The bar | `███████░░░` | Ten cells, one per tenth of the tasks ticked, rounded down. It appears once `tasks.md` has tasks. |
| The count | `9/20 45%` | Ticked tasks, all tasks, and the percentage rounded down. |
| Update buttons | `updates: [ gstack 1.91.33.0 ]` | A second row when something has a newer version. See [Update notices](#update-notices). |

A finished feature shows every mark as `●` and a full bar. An abandoned feature named by
`feature.json` shows `◆ 003 name  abandoned` instead of the rail.

When the band is narrower, it drops detail in this order and never cuts the id: the labels of
the finished and later steps, then the name, then the bar, then the count, then everything
but `◆ 002`. In a 100-column terminal it looks like this:

![Astrolabe in a 100-column terminal](docs/images/narrow-100.svg)

The band shows nothing of its own when the project has no Spec Kit, when no feature is active
(the prompt hint then names the command to run), or while a survey uses the band. Whatever
other mods draw there stays.

## What the spinner says

While a turn works on the active feature, the spinner line names the task in progress and how
long it has been the current one:

![The spinner while Claude works on the feature](docs/images/spinner.svg)

Claude Code still draws its own word and, after Astrolabe's part, the turn's time and token
count. Astrolabe only adds the part after the word:

| Part | What it means |
|---|---|
| `T011` | The id of the first open task in the active feature's `tasks.md`. |
| The text | The task's text without the `[P]` and `[US1]` markers or backticks, cut with `…` when the terminal is narrow. The id is never cut. |
| `1s` | How long this task has been the first open one, counted from when Astrolabe first saw it this session: `45s`, `12m` or `1h 5m`. |

It shows only during a turn that works on the active feature, meaning `/speckit-implement` was
called, or Claude read or edited a file in the feature's folder during the turn. A read counts
from the moment it starts, so the narration shows early in a short turn. Other turns keep the
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

Five options appear in Claude Code's config menu (`/config`, then Astrolabe). Changing one
reloads the mod right away.

| Option | Values | Default | What it changes |
|---|---|---|---|
| `preset` | `minimal`, `compact`, `full` | `compact` | Where Astrolabe draws. `minimal` keeps only the status entry. `compact` adds the band, the prompt hint, the spinner narration and the drift alarm. `full` also opens the `/astrolabe` pane by itself on a wide fullscreen terminal, and shows phase toasts as well as the drift alarm. |
| `flavor` | `mocha`, `frappe`, `macchiato`, `latte` | `mocha` | The Catppuccin palette for the band. `latte` is the light one. |
| `checkUpdates` | `true`, `false` | `true` | The daily update check and its buttons (see [Update notices](#update-notices)). |
| `governUsage` | `true`, `false` | `true` | Usage governance (see [Usage governance](#usage-governance)). Off, the windows still show. |
| `askOnLimit` | `true`, `false` | `true` | Before it holds a subagent or pauses Claude, the governor asks you (see [Asked when it holds or pauses](#asked-when-it-holds-or-pauses)). Off, it holds and pauses without asking. |

You can also type `/plugin configure astrolabe@astrolabe` in a session, or set them from a
shell. Options you leave out keep their values:

```sh
claude plugin configure astrolabe@astrolabe                      # show the current values
echo '{"preset":"minimal","flavor":"latte"}' | claude plugin configure astrolabe@astrolabe --values-stdin
```

Colors are sent as hex values. On a terminal without truecolor, Claude Code decides how close a
color it can show.

![preset minimal](docs/images/preset-minimal.svg)

![flavor latte](docs/images/flavor-latte.svg)

The current values, from a shell:

![claude plugin configure](docs/images/cli-configure.svg)

## The /astrolabe pane

Type `/astrolabe` to open a pane with three tabs. In a fullscreen terminal it docks at the
right; otherwise it sits above the prompt. It opens with the keyboard on it, so `1`, `2` and
`3` switch tabs right away, and Esc closes it. Later, focus it again with a click or
`ctrl+x tab`. The tab you pick stays for the session.

**1 Specs** lists every feature:

![The pane, Specs tab](docs/images/pane-specs.svg)

`▸` marks the active feature. `●` is done, `◐` in progress, and `○` abandoned (drawn dim). Under
the list come warnings: a `~` line when the active feature was guessed because
`.specify/feature.json` is broken, and a `!` line for a spec that still has
`[NEEDS CLARIFICATION` after its plan exists.

**2 Tasks** lists the active feature's open tasks in file order, after a count:

![The pane, Tasks tab](docs/images/pane-tasks.svg)

When more tasks are open than the pane has rows, the last line says `+N more`. A feature with
no `tasks.md` yet says so.

**3 Session** shows how Astrolabe sees the project right now, and any updates:

![The pane, Session tab](docs/images/pane-session.svg)

`chosen by` is how the active feature was picked (`feature.json`, `branch` or `latest`).
`analyzed` says whether `/speckit-analyze` ran in this session.

With the `full` preset, the pane also opens by itself once per session, at the end of the
first turn, but only in a fullscreen terminal at least 144 columns wide. It never opens by
itself on a narrower or non-fullscreen terminal.

## Toasts

Astrolabe raises two short notices in Claude Code's toast area. Each marks a change, never a
turn, so they stay rare.

**Drift alarm** (presets `compact` and `full`). When Claude ticks a task in `tasks.md` but no
code file was edited in the turn, you see (captured after asking Claude to tick T010 and do
nothing else):

![The drift alarm toast](docs/images/toast-drift.svg)

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

To decide what is new, Astrolabe remembers each feature's last seen phase for the session.
The first check of a session only records the phases, so a change made between sessions does
not toast, and two sessions open on the same project each toast on their own. A Spec Kit skill that starts never toasts by itself; only the files count.

To turn the toasts off, pick the `minimal` preset, or `compact` to keep only the drift alarm.

## Update notices

Once a day, the first time a session starts or a turn ends on a new day, Astrolabe checks four
things in the background and adds a row of buttons under the band for anything that has a
newer version:

```text
updates: [ gstack 1.91.33.0 ][ specify 1.2.0 ][ Spec Kit skills 1.2.0 ][ astrolabe 0.8.0 ]
```

| Button | How Astrolabe knows | What a click does |
|---|---|---|
| gstack | `~/.claude/skills/gstack/bin/gstack-update-check` exists and reports `UPGRADE_AVAILABLE` (Astrolabe reads `HOME`, or `USERPROFILE` on Windows, to find it, and runs nothing when gstack is not installed) | Runs the `/gstack-upgrade` command, which upgrades gstack and reports itself. |
| specify | `specify self check` names a newer release | Runs `specify self upgrade`, then toasts `🧭 specify updated to 1.2.0`. |
| Spec Kit skills | `specify version` is newer than this project's `.specify/integrations/speckit.manifest.json` | The first click turns the button into `confirm: rewrite .claude/skills/speckit-*`. The second runs `specify init --here --integration claude --force` in the project, which rewrites the project's Spec Kit skills. |
| astrolabe | GitHub's latest release of jonyfs/astrolabe is newer than the installed version | Runs `claude plugin update astrolabe`, then toasts that you should run `/reload-plugins`. |

On a narrow terminal the row keeps the buttons that fit and ends with `+N` for the rest. The
last button, `hide`, dismisses every update shown; each one comes back only when a newer version
than the hidden one appears. A button disappears once its update succeeds. When one fails, a toast gives the first error
line and the command to run yourself. A tool that is not installed is simply skipped.

This is the one network call Astrolabe makes: a single request a day to
`https://api.github.com/repos/jonyfs/astrolabe/releases/latest`. The results are kept in the
mod's store with the date, so other sessions the same day show them without checking again.
With the `minimal` preset there is no band, so the updates are listed in the `/astrolabe` pane's
Session tab instead (without buttons). To turn the checks off, set `checkUpdates` to `false`;
then Astrolabe runs no process and makes no network call.

## What Astrolabe reads

Only files inside the Spec Kit root, the nearest folder above the session's directory that
holds `.specify/`. It never writes a project file. It runs processes and makes one network call
only for the daily update check (see [Update notices](#update-notices)), and only when you
click a button does anything get installed. Its own store (the plugin's JSON file under your
Claude Code configuration folder) keeps only the last update check and the updates you hid.

| File | Used for |
|---|---|
| `.specify/feature.json` (`feature_directory`) | The active feature, when it names an existing `specs/NNN-name/` folder. |
| `.specify/memory/constitution.md` | Whether the constitution is missing, still the template (it contains placeholders like `[PROJECT_NAME]`), or ratified. |
| `specs/NNN-name/spec.md` | The front matter and any `[NEEDS CLARIFICATION` markers. |
| `specs/NNN-name/plan.md` | Only whether it exists. |
| `specs/NNN-name/tasks.md` | The tasks. |
| `.git/HEAD` (or the `gitdir:` file of a worktree) | The current branch, read as a file. |

A `spec.md` or `tasks.md` that exists but cannot be read (its permissions, or a lock another
program holds) shows in the `/astrolabe` pane as `! 002: tasks.md exists but could not be read`,
and Astrolabe tries it again every turn until a read works. If the session read the file
before, Astrolabe keeps that text, so the phase does not jump back. A constitution that cannot
be read also keeps its last text, without a pane row.

### Which feature is active

1. `.specify/feature.json`, when its `feature_directory` names a folder under `specs/`
   that exists. Relative, absolute and Windows spellings all work.
2. Otherwise the git branch, when it is named like a feature folder (`002-band-hint`) and
   that folder exists.
3. Otherwise the highest-numbered feature that is neither done nor abandoned.

Spec Kit's `SPECIFY_FEATURE` and `SPECIFY_FEATURE_DIRECTORY` environment variables are
ignored: they are set in the shells Claude runs, not in Claude Code itself. Use `feature.json`
or the branch. The only environment variables Astrolabe reads are `HOME` and `USERPROFILE`, to
find gstack for the update check.

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

## Usage governance

Claude Code tells the mod how full your 5-hour and weekly windows are after every turn.
Astrolabe adds the window that decides to the status entry and acts on it:

```text
⚠ astrolabe: ◆ 002 · implement 45% · 5h 42%
⚠ astrolabe: ◆ 002 · implement 45% · 5h 83% hold
```

| Band | Window | New subagents (`Agent` calls) | Other tools |
|---|---|---|---|
| ok | below 60% | up to 6 at once | run |
| throttle | 60% to 80%, or a burn rate that would reach 80% before the reset | 3 at once below 70%, then 1 | run |
| hold | 80% or more, and down to 75% in the window that reached 80% | you are asked; by default refused and queued | run |
| stop | 88% or more | refused and queued | you are asked; by default only read-only tools (Read, Grep, Glob, LS, WebFetch, WebSearch, TodoWrite, Skill) |
| ceiling | 90% or more | refused and queued | you are asked; by default only read-only tools |

Each window is banded on its own and the one in the highest band decides, then the fuller one.
Once a window reaches 80%, it stays in hold until it falls below 75%, so usage that moves around
80% does not hold and release subagents again and again. When a window's reset time passes,
Astrolabe does not know the new percentage until Claude Code sends the next reading: the status
entry says `5h renewed` and subagents run one at a time until then.

A refused call tells Claude why and when the window resets, for example
`🧭 usage 5h 83% (hold): new subagents are queued until 14:00; queued as q1`. When the window
resets, or a new reading takes it out of hold, Astrolabe sends one prompt that lists the queued
subagents so Claude dispatches them again, and a paused session continues. A running subagent
is never stopped. The cap counts subagents running in the foreground; one started in the
background returns at once and is not counted.

Only you can lift stop and the ceiling, by typing the command yourself (a command sent by
Claude, a plugin or a script is refused):

```text
/astrolabe allow 95 2h
/astrolabe revoke
```

`allow` takes a target from 90 to 99 and a duration from `30m` to `12h`; it lasts until the
duration ends or the window resets. It lifts only the window that decided when you typed it, so
lifting the weekly window leaves the 5-hour window's stop and ceiling where they were. It does
not lift the hold at 80%; the question below can.

### Asked when it holds or pauses

When the governor queues a subagent at hold, or refuses one of Claude's tools at stop or the
ceiling, it refuses at once with the cautious answer and then asks you. Claude Code gives a hook
10 seconds, so the governor never makes Claude wait for you: Claude is told that you are being
asked and not to retry. The question opens in a pane with the keyboard on it. The arrows move
between the answers, Enter picks one, and the first answer, the cautious one, is already
selected:

```text
🧭 usage 7d 83% (hold): a new subagent, "Full review". What now?
❯ Queue it until Mon 07:00
  Run this one now
  Allow subagents for 1 hour, one at a time
  Drop this request
↑↓ to choose, Enter to pick. Esc or no answer: the default goes ahead at 12:01:00.
```

What each answer does:

| Answer | What happens |
|---|---|
| `Queue it until <reset>` | The subagent stays queued until the window resets. |
| `Run this one now` | It leaves the queue, and a prompt tells Claude to send it again; that one call goes through. |
| `Allow subagents for 1 hour, one at a time` | The queue is sent again, and new subagents run one at a time for the hour. |
| `Drop this request` | It leaves the queue; later subagents are dropped too while the band lasts. |
| `Pause until <reset>` | Claude stays paused until the window resets. |
| `Continue for 30 more minutes (ceiling 91%)` | The ceiling is raised for 30 minutes, and a prompt tells Claude to continue. |
| `Raise the ceiling to 95% for 2 hours` | The same, for 2 hours. |

Each ceiling is at least two points above current usage and at most 99%. An answer that cannot
raise the ceiling above current usage is left out. A prompt Astrolabe sends waits until Claude's
current turn ends.

If you do not answer within a minute, or you press Esc, the pane closes and the first answer
stands. The governor keeps that answer, and `Drop this request`, while the band lasts, so it does
not ask again for every call; it asks again once usage leaves the band and comes back. Only one
question is open at a time. Calls that arrive meanwhile are refused with the cautious answer too,
and the answer you pick covers them through the queue.

The pane needs 144 columns when nobody asked for it. On a narrower terminal the question shows
in Claude Code's own question dialog instead. That dialog stays open until you answer it, and
the answer applies whenever you give it.

Claude cannot pick an answer: it comes from your key press. Hooks and plugins you installed run
with your trust, though, and one that answers Claude Code's question dialog (a `PreToolUse` hook
on `AskUserQuestion`) could answer the narrow-terminal question for you. A session with no one at
the prompt (`claude -p`, the SDK) is never asked. A running subagent is never asked about and
never stopped. To turn the questions off, set `askOnLimit` to `false`.

`governUsage` and `askOnLimit` are plugin options. Anything that can run `claude plugin
configure` can change them, including Claude through Bash when you allow that command, so
review such a call before you approve it.

Off a subscription (an API key) there are no windows, so nothing is shown or refused. To keep
the readings but turn the governing off, set `governUsage` to `false`. If this project also
has the usage-governor skill's hooks installed, they govern too; keep one of the two.

The `/astrolabe` pane's Session tab shows the governor: the windows and the band, the subagents
running against the cap, the queue, an override and a lift with the time each one ends:

```text
usage         5h 42% · 7d 83%: hold
subagents     0 running, cap 0
queue         1 waiting: q1 Full review
override      ceiling 95% on 7d until 14:00
```

Astrolabe has the usage-governor skill's bands, caps, burn-rate projection, hysteresis,
per-window overrides, queue and resume, and it asks before it holds or pauses. It leaves out what
does not fit a mod:

- thresholds in a config file: the mod's options are plugin options, which anything that can run
  `claude plugin configure` can change;
- its own `/usage` probe: Claude Code sends the windows after every turn;
- a ramp for the queue after a reset: one subagent at a time until the next reading does that;
- a command line, an audit log, and Codex and Copilot.

## Where it works

| Surface | Draws |
|---|---|
| Terminal on Linux, macOS and Windows (Claude Code 2.1.287 or later) | Yes |
| Claude Desktop app, Code tab (2.1.286 or later) | Partly. Claude Code raises the band, the spinner and the pane there, and the status entry and toasts reach it, drawn with the app's own look. The prompt hint's `next:` text is not shown: Claude Code draws that part only in the terminal for now. Every image in this README comes from the terminal; none was captured in the app yet. |
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

## From a statusline to a mod

[docs/tutorial/README.md](docs/tutorial/README.md) teaches, in eight steps, how to turn a
classic `statusLine` command into a mod, with jonyfs/statusline as the worked example and this
repository as the result. Each step pairs the file in one with the file in the other.

## Development

```sh
claude plugin validate .
claude plugin test .
sh scripts/fetch-engine-types.sh          # once: the engine's declarations for the type check
npx -p typescript@5 tsc -p .
```

The type check needs the declarations Claude Code writes for mods. They are not part of the
plugin and are not committed: `scripts/fetch-engine-types.sh` downloads them into
`types/engine/` from this repository's `engine-types-2.1.292` pre-release, and CI does the
same. After a Claude Code update, `scripts/sync-engine-types.sh` copies the new declarations
from your machine and prints the `gh release create` line that publishes them.

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

## How the images are made

Every image is a real capture, never a drawing (Constitution Principle II):

```sh
scripts/capture/scene.sh overview-180 180 40 "$PWD/docs/demo" 30          # start claude in tmux, wait, capture
node scripts/capture/ansi-to-svg.mjs docs/images/overview-180.ansi docs/images/overview-180.svg --from "^◆ "
```

`scene.sh` starts `claude` in a tmux window of the given size, sends the keys you list (for
example `"/astrolabe" Enter 3 "keys:2"` to open the pane and show the Tasks tab), and saves
the screen with its colors. `ansi-to-svg.mjs` turns that into an SVG; `--from`, `--drop`,
`--crop` and `--cut` select the part to show. Inside tmux Claude Code draws with 256 colors,
so the images show the nearest match of each Catppuccin color. Lines from other status
providers (the author's own statusLine) and Claude Code's own usage notice are dropped, and
`--replace` shortens the author's home path to `~/src/astrolabe`; nothing else is edited.

## License

MIT. See [LICENSE](LICENSE).
