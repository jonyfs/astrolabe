# Implementation Plan: Read the statusline runs output and failure contract

| Where | Change |
|---|---|
| `hooks/core/statusline-dep.ts` | `parseRunsOutput`, `SUPPORTED_CONTRACT`, `CLAUDE_STATUSLINE_OUTPUT=runs` in `statuslineEnv`, `contract-newer` in `SourceReason` and `chooseSource` |
| `hooks/io/statusline-run.ts` | `renderFooter` reads runs first, then ANSI; result carries `format`, `code`, `contract` |
| `hooks/register.tsx` | reason mapping on failure, `format` and `contract` in the footer health, a Setup row |
| `types/index.d.ts` | `FooterState.health.format`, `contract` |
| `hooks/core/i18n/*.ts` | `footer.fallback.contract-newer`, `footer.setup.format*` |
| `tool-tests/unit/statusline-contract.vitest.ts` | runs checks gated on the copy supporting the form |

No change to what is drawn.
