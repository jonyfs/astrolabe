# Quickstart: validating Band and Status

```sh
claude plugin test .          # core and adapter tests
claude plugin validate .
npm test                      # Node scans
```

Expected: the band tests match the rows of board 2 at 200, 144, 100 and 80 columns; the status lead tests match the status row under each; `next(e)` is present at every width; with a quick-track spec the rail is `spec → tasks → impl`; with a paused governor the band reads `‖ paused until 07:00` and offers `lift 1h`.

Manual: `claude --plugin-dir .` in `docs/demo`, resize the terminal through 200, 144, 100 and 80 columns.
