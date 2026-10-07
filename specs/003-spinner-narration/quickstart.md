# Quickstart: validate 003-spinner-narration

```sh
claude plugin validate . && claude plugin test . && npx -p typescript@5 tsc -p .
```

Manual: in this repository, ask Claude to tick a task in `specs/003-spinner-narration/tasks.md`
(or run `/speckit-implement`); while the turn runs, the spinner reads
`<word>… T00N · <task> · <elapsed>`.
