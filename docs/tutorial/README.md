# From a statusLine command to a mod

This tutorial turns a classic Claude Code status line into a mod. The worked example is
[jonyfs/statusline](https://github.com/jonyfs/statusline), a `statusLine` command written in
Node.js, and the result is this repository, Astrolabe. Each step names the file in the
statusline that does a job and the file here that does the same job as a mod, and ends with
something you can run.

You need Claude Code 2.1.292 or later. Mods draw in the terminal (2.1.287 or later) and in the
Desktop app's Code tab (2.1.286 or later).

## 1. Two models

A `statusLine` command is a program Claude Code runs again for every update. It reads the
session as JSON on stdin and prints lines of ANSI text. The statusline's entry point is
[bin/cli.js](https://github.com/jonyfs/statusline/blob/main/bin/cli.js): it reads stdin,
renders, prints, and exits. Nothing survives between two runs except what it writes to disk.

A mod is a module Claude Code loads once and keeps alive. It does not print anything. It
registers hooks on events (`session.start`, `tool.call`, `turn.complete`, `ui.render`, …) and
answers them. To draw, it returns a tree of elements (`Box`, `Text`, `Button`) for a place the
engine offers, or passes a string to `$.ui.status`. Astrolabe's entry point is
[hooks/register.tsx](../../hooks/register.tsx).

The difference that matters most: a command is told the state every time, while a mod watches
what happens and keeps its own state between events, in `$.state` for the session and
`$.store` across sessions.

Try it: run `claude --plugin-dir .` in a clone of this repository and look under the prompt.

## 2. Mapping the pieces

| Job | statusline (command) | Astrolabe (mod) |
|---|---|---|
| Entry point | [bin/cli.js](https://github.com/jonyfs/statusline/blob/main/bin/cli.js) reads stdin and prints | [hooks/register.tsx](../../hooks/register.tsx) wires events to the core and the surfaces |
| Rendering | [src/render.js](https://github.com/jonyfs/statusline/blob/main/src/render.js) and [src/segments.js](https://github.com/jonyfs/statusline/blob/main/src/segments.js) build ANSI lines | [hooks/core/status-text.ts](../../hooks/core/status-text.ts) and [hooks/core/band.ts](../../hooks/core/band.ts) build text and segments; [hooks/surfaces/band.tsx](../../hooks/surfaces/band.tsx) turns them into elements |
| Colors | [src/theme.js](https://github.com/jonyfs/statusline/blob/main/src/theme.js) holds ANSI codes | [hooks/core/theme.ts](../../hooks/core/theme.ts) holds hex tokens per Catppuccin flavor |
| Reading the project | [src/git.js](https://github.com/jonyfs/statusline/blob/main/src/git.js) runs git | [hooks/io/git-branch.ts](../../hooks/io/git-branch.ts) reads `.git/HEAD` through `$.fs`, no process |
| Installing | [src/install.js](https://github.com/jonyfs/statusline/blob/main/src/install.js) edits `~/.claude/settings.json` | [.claude-plugin/marketplace.json](../../.claude-plugin/marketplace.json): the marketplace installs it, nothing is edited |
| Releasing | [.github/workflows/release.yml](https://github.com/jonyfs/statusline/blob/main/.github/workflows/release.yml) | [.github/workflows/release.yml](../../.github/workflows/release.yml), which also checks the tag against `plugin.json` |

The data comes from different places too. The command gets fields such as `context_window`,
`cost` and `rate_limits` on stdin. A mod reads `$.session` and the inputs of the events it
hooks. Astrolabe reads Spec Kit's files at `session.start` and `turn.complete`, and takes early
hints from `tool.call`.

## 3. Manifests

A mod is a plugin with three small files:

- [.claude-plugin/plugin.json](../../.claude-plugin/plugin.json): name, version, description,
  the options (`userConfig`) and the `types` contract for its `$.state`.
- [hooks/hooks.json](../../hooks/hooks.json): `{ "modules": ["./register.tsx"] }`, one path.
- [.claude-plugin/marketplace.json](../../.claude-plugin/marketplace.json): makes the repository
  its own marketplace with one entry whose `source` is `"./"`.

The `types` file, [types/index.d.ts](../../types/index.d.ts), must stand alone: an `import` in
it makes the engine refuse the plugin. Declare the state types there and import them from it.

Try it: `claude plugin validate .` lists what the module hooks and calls and everything the
engine would refuse.

## 4. A first drawing that keeps its neighbours

The band above the prompt is shared by every mod. Astrolabe's `AbovePrompt` hook always puts
`await next(e)` among its children, so what other mods draw there stays, and returns `next(e)`
alone when it has nothing to show. The prompt hint is rewritten through its `tail` prop, which
keeps Claude Code's own line. Both hooks are at the end of
[hooks/register.tsx](../../hooks/register.tsx).

Two engine rules shape the code:

- `$` may only be used inside functions declared in the same file as `register`. Passing `$`
  to an imported function, or through a curried helper, makes the module fail to load. So the
  surfaces in [hooks/surfaces/](../../hooks/surfaces/) receive the element table from
  `$.ui.resolve(e)`, never `$`.
- A render hook may read `$.state`, which subscribes it, but may not write. Writes happen in
  event hooks and button handlers, and every write redraws the readers.

Try it: open a session in a Spec Kit project and look above the prompt.

## 5. Tests

`claude plugin test .` runs every `*.test.ts` against the engine itself, with no file system,
network or process. Astrolabe's tests answer `fs.*`, `session.*`, `ui.status` and the other
engine calls from in-memory fixture trees
([tests/helpers/fake-fs.ts](../../tests/helpers/fake-fs.ts),
[tests/fixtures/](../../tests/fixtures/)). Render tests mount a site with `$.ui.mount` on both
`terminal` and `desktop` ([tests/helpers/render.tsx](../../tests/helpers/render.tsx)).

The statusline's tests feed JSON to the command and compare text
([scripts/tests/](https://github.com/jonyfs/statusline/tree/main/scripts/tests)). The mod's
tests raise events and read what the plugin handed to the engine.

Try it: `claude plugin test .`.

## 6. The local loop

`claude --plugin-dir .` loads the working copy for one session and reloads it when a file is
saved. To keep it installed while you work, add the folder as a marketplace; Claude Code then
reads the plugin from the folder and `/reload-plugins` picks up edits:

```sh
claude plugin marketplace add ~/src/astrolabe
claude plugin install astrolabe@astrolabe
```

Run `claude --debug` to see the lines the engine writes when a hook fails or a tree is refused.

## 7. Publishing

Commit, push, and tag. In this repository a `vX.Y.Z` tag runs
[.github/workflows/release.yml](../../.github/workflows/release.yml), which checks the tag
against `plugin.json`'s `version`
([scripts/check-release-version.sh](../../scripts/check-release-version.sh)), runs the checks
again on three operating systems and creates the GitHub release. Anyone can then install with
one line:

```text
/plugin install astrolabe --marketplace jonyfs/astrolabe
```

## 8. What does not carry over

- A mod draws nothing in the VS Code extension, in `claude -p` or in cloud sessions. Its hooks
  still run there. A `statusLine` command draws in more places, so keep it if you need those.
- A plugin cannot set `statusLine`, so installing a mod never replaces a status line command a
  user configured; both show.
- A mod has no environment variables and no Node: everything goes through `$`.
