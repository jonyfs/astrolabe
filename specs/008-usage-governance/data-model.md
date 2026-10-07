# Data model: Usage governance

`$.state` `astrolabe.usage`:

| Field | Type |
|---|---|
| `readings` | `Array<{ kind, percentUsed, resetsAt? }>` |
| `history` | `Array<{ at: number; percent: number }>` (highest window, last 10) |
| `inFlight` | `number` |
| `queue` | `Array<{ id: string; description: string; prompt: string; subagentType?: string }>` |
| `override` | `{ target: number; until: number } \| undefined` |
| `paused` | `boolean` |
