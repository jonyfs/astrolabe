# Quickstart: validate 002-band-hint

```sh
claude plugin validate .
claude plugin test .
npx -p typescript@5 tsc -p .
```

Manual: open a session in this repository (the plugin is installed from the folder
marketplace, so `/reload-plugins` picks up edits). Above the prompt the band shows the rail for
002; the empty prompt's hint ends with `next: /speckit-…`. In `/config`, set Astrolabe's
`preset` to `minimal` and the band and hint go away; set `flavor` to `latte` and the colors
change.
