# Research: Clickable update notices

- `gstack-update-check` prints `UPGRADE_AVAILABLE <installed> <latest>` (observed:
  `UPGRADE_AVAILABLE 1.91.32.0 1.91.33.0`) and nothing when current.
- `specify self check` prints `Up to date: 1.1.1` when current; `specify version` prints a box
  with `CLI Version    1.1.1`; the project manifest `.specify/integrations/speckit.manifest.json`
  holds `"version": "1.1.1"`.
- `/gstack-upgrade` is an interactive skill (git pull, ./setup); `$.prompt.submit({ text })`
  queues it as a prompt.
- `specify init --here --integration claude --force` refreshes project skills.
- `claude plugin update <plugin>` updates a plugin; a running session applies it after
  `/reload-plugins`.
- APIs: `$.process.run(argv, { cwd })` → `{ exitCode, stdout, stderr }`; `$.http.fetch(url)` →
  `{ status, ok, text }`; `$.clock.after(ms, fn)`; the installed version is in
  `${$.plugin.root}/.claude-plugin/plugin.json`. The module has no environment variables, so
  `$HOME` is expanded by `sh`; on Windows `sh` may be missing and the gstack item is skipped.
