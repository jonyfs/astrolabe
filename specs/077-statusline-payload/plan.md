# Implementation Plan: Send statusline the facts the mod already has

| Where | Change |
|---|---|
| `hooks/core/statusline-dep.ts` | `transcriptPathFor`, `cost` and `fast_mode` in `FooterPayload`; `startedAt`, `now`, `lines`, `fast` in `PayloadInput` |
| `hooks/register.tsx` | the refresh reads `CLAUDE_CONFIG_DIR` and `HOME`, and passes the three facts |
| `tests/core/statusline-dep.test.ts` | the unit cases (SC-001, SC-002) |
| `tests/integration/statusline-footer.test.tsx`, `tests/helpers/fake-fs.ts` | the renderer's stdin is recorded and asserted (SC-003) |
| `README.md`, `CHANGELOG.md` | what is sent |

No change to what is drawn by the native footer.
