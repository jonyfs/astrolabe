# Data model: Band, prompt hint, presets and themes

## Segment (band layout output)

| Field | Type | Meaning |
|---|---|---|
| `key` | `string` | Stable key for tests: `id`, `name`, `step-<step>`, `bar`, `count`, `label`. |
| `text` | `string` | What is drawn. |
| `role` | `ThemeRole` | Which token colors it. |

The row is the segments joined in order; their total width is at most `bodyColumns`.

## ThemeRole and tokens

`'accent' | 'text' | 'muted' | 'done' | 'current' | 'pending' | 'barFill' | 'barEmpty'`, each a
hex per flavor (`mocha`, `frappe`, `macchiato`, `latte`).

## Preset

| Field | Type |
|---|---|
| `status`, `band`, `hint`, `spinner` | `boolean` |
| `pane` | `'command' \| 'auto'` |
| `toasts` | `'none' \| 'drift' \| 'all'` |

| Preset | status | band | hint | spinner | pane | toasts |
|---|---|---|---|---|---|---|
| minimal | yes | no | no | no | command | none |
| compact | yes | yes | yes | yes | command | drift |
| full | yes | yes | yes | yes | auto | all |

Spinner, pane and toasts are declared now and used by 003 to 005.
