# Host fixtures

Payloads and the plain text the renderer draws for them, for a program that
embeds the renderer and wants to check its copy against this one.

- `payloads/*.json`: status payloads. None needs a repository, a transcript or
  the clock, so the rows do not depend on the machine.
- `expected/<payload>.<width>.txt`: the text of each line of the runs form
  (`CLAUDE_STATUSLINE_OUTPUT=runs`), trailing blanks trimmed, at 80, 100, 144
  and 200 columns.

The environment they were made in is in `scripts/host-fixtures.js`
(`fixtureEnv`): passive mode, updates off, flavor `mocha`, truecolor, `TZ=UTC`,
`COLUMNS` set to the width, a throwaway `HOME` (and `USERPROFILE`), and a working directory
of its own outside any project. The git-dependent chips (branch, working tree, lines changed,
pull request) are not drawn: the payloads name a directory that is not a repository. A host that renders the same
payloads in that environment with its copy of `bin/cli.js` must get the same
rows. `node scripts/make-host-fixtures.js` rewrites the expected files, and the
suite fails when they move without it.
