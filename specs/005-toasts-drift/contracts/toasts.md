# Contract: toast texts

| When | Text |
|---|---|
| moved to a later phase | `🧭 <id> <name> moved to <phase> · next: <command>` |
| reached done | `🧭 <id> <name> is done · next: /speckit-specify` |
| drift, no files named | `🧭 <task id> was ticked with no code edited since the last tick` |
| drift, files named | `🧭 <task id> was ticked, but none of its files were edited: <path>[, <path>…]` |

A task without an id is named by its first 40 characters in quotes.
