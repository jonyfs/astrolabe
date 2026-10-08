# Privacy: what Astrolabe reads, keeps and sends

Astrolabe runs inside Claude Code on your machine. It has no server and sends no telemetry. This page
lists everything it touches; the code in `hooks/` is the place to check it.

## What it reads

- Your Spec Kit files: `.specify/feature.json`, `.specify/memory/constitution.md`,
  `.specify/extensions.yml`, and under `specs/` each feature's `spec.md`, `plan.md` (whether it
  exists), `tasks.md` and `checklists/*.md`. A finished feature's summary (`featureSummary`) also
  reads its `spec.md` and `tasks.md` in full.
- Git: the `HEAD` file to find the branch, then `git status --porcelain=v2 --branch
  --show-stash` and `git worktree list --porcelain` after a turn. In each other worktree it reads
  only the feature its branch names.
- GitHub, through `gh`, and only when you ask for it: `gh pr view` for the footer's pull request
  (the `pullRequest` option) and `gh pr list` for the PRs tab while it is open.
- Its own install: `.claude-plugin/plugin.json` in its folder, to see whether a newer version is
  on disk (`autoReload`).
- Environment variables: `HOME` and `USERPROFILE` (to find gstack), and `KITTY_WINDOW_ID`,
  `TERM`, `TERM_PROGRAM` and `TMUX` (to tell whether the terminal draws pictures), and `NO_COLOR`
  (to draw the footer without colours).
- What Claude Code tells every plugin: usage windows, context size, cost, the model and effort
  of each request, the tools that run and the prompts you type. Astrolabe reads the prompts you type
  only to guess your language and to add its context line.

## What it keeps

In Claude Code's session state (gone when the session ends): the Spec Kit state it drew, the
session's counts, the governor's queue and log, the pane's tab, filter and scroll.

In Claude Code's plugin store on your machine (kept across sessions):

| Key | What |
|---|---|
| `updates`, `updates:hidden` | The last update check and the versions you hid |
| `history` | Tasks and features finished per week |
| `days` | Tasks ticked per day, the last 14 days |
| `reloaded` | The last version it reloaded for |
| `welcomed` | The version that showed the first-run toast |
| `summaries` | Finished features' summaries, when `featureSummary` is on |

## What it sends

- To GitHub: one request a day to `https://api.github.com/repos/jonyfs/astrolabe/releases/latest`
  for the update check (`checkUpdates`). It carries no data about you or your project.
- To Claude, through Claude Code: with `claudeContext` on, one line about the active feature
  next to your prompt, and the constitution's principle names when a Spec Kit skill runs; with
  `featureSummary` on, a finished feature's spec and tasks to `haiku`; with `/astrolabe ask`, your
  question to a fork of the session. These go through your own Claude Code session and account,
  like any prompt you type.
- To `gh` and `git`: the commands above, run in your project folder. Approve, update branch and
  merge run only after you press the button twice.

Nothing else leaves your machine. To turn a part off, use its option in `/config` or the Config
tab: `checkUpdates`, `claudeContext`, `featureSummary`, `pullRequest` and `autoReload`.
