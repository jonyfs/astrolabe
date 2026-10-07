# Contract: update row and actions

Band row (preset with band): `updates: [gstack 1.91.33.0] [specify 1.2.0] [Spec Kit skills 1.2.0] [astrolabe 0.8.0]`
(Button keys `update-<id>`). While confirming the skills refresh, its label is
`confirm: rewrite .claude/skills/speckit-*`.

| Item | Click | Success toast | Failure toast |
|---|---|---|---|
| gstack | runs the `/gstack-upgrade` command | none (the skill reports) | `🧭 could not start /gstack-upgrade` |
| specify | `specify self upgrade` | `🧭 specify updated to <latest>` | `🧭 specify upgrade failed: <first line>; run specify self upgrade` |
| speckit-skills | 1st click confirms; 2nd runs `specify init --here --integration claude --force` in the root | `🧭 Spec Kit skills refreshed to <latest>` | `🧭 Spec Kit skills refresh failed: <first line>` |
| astrolabe | `claude plugin update astrolabe` | `🧭 Astrolabe updated to <latest>; run /reload-plugins` | `🧭 Astrolabe update failed: <first line>; run claude plugin update astrolabe` |
