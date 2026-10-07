# Contract: band and hint text

## Band, widest form

`◆ <~?id> <name>  constitution <m> specify <m> clarify <m> plan <m> tasks <m> implement <m>  <bar> <done>/<total> <pct>%`

`<m>` is `●`, `◐` or `○`, followed by `…` for the running step. The bar and count appear only
when the feature has tasks. An abandoned feature draws `◆ <id> <name> abandoned`.

## Degradation order (first that fits wins)

1. all labels
2. only the current step labelled: `● ● ● ● ● implement ◐`
3. without the name
4. without the bar
5. without the count
6. `◆ <id>` alone
7. nothing (the band passes)

## Hint tail

| State | `tail` |
|---|---|
| draft typed, no Spec Kit, preset without hint, no next command | unchanged |
| phase `implement` with N open tasks | `next: /speckit-implement · N tasks left` |
| otherwise | `next: <command>` |
