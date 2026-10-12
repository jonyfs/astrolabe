# Quickstart: validating the five-tab pane

```sh
claude plugin test .
claude plugin validate .
npm test
```

Expected: the pane has Specs, Tasks, Session, PRs and Setup; `?` (as `h`) opens help over the current tab; a stored `dashboard` or `config` opens Session or Setup; badges show only what waits; every tab renders on terminal and desktop at 60, 80 and 100 pane columns.
