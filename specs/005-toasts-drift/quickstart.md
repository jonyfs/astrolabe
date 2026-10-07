# Quickstart: validate 005-toasts-drift

```sh
claude plugin validate . && claude plugin test . && npx -p typescript@5 tsc -p .
```

Manual: ask Claude to tick a task in this feature's `tasks.md` without editing code; a drift
toast appears. Set `preset` to `full`, finish a phase, and a phase toast appears once.
