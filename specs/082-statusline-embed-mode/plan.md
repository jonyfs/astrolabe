# Implementation Plan: Use statusline's embedding contract

| Where | Change |
|---|---|
| `hooks/core/statusline-dep.ts` | `parseOmit`, `joinDir`, `parseResolvedConfig`, `flavorMismatch`; `statuslineEnv` takes `mode`, `cacheDir`, `omit` |
| `hooks/io/statusline-run.ts` | `readResolvedConfig`: `node <cli> --print-config` with the render's environment and directory |
| `hooks/register.tsx` | reads `footerStatuslineMode` and `footerOmit`; the cache directory is `<CLAUDE_PLUGIN_DATA>/statusline-cache`; the resolved configuration is read at most once a minute, after a good render, and kept in the footer health |
| `types/index.d.ts` | `FooterState.health.embed` |
| `.claude-plugin/plugin.json`, `hooks/core/config-schema.ts` | the two options |
| `hooks/core/i18n/*.ts` | the Setup rows, in four languages |
| `scripts/sync-statusline.sh` | copies the render-only build when the source has one; always copies `fixtures/host/` and `scripts/host-fixtures.js` |
| `tests/core/statusline-dep.test.ts` | the pure cases (SC-001, SC-003) |
| `tests/integration/statusline-footer.test.tsx` | the environment and the Setup rows (SC-001, SC-002, SC-005) |
| `tool-tests/unit/statusline-fixtures.vitest.ts` (and the sync workflow step) | the shared fixtures through the vendored copy (SC-004) |
| `vendor/statusline/` | refreshed to 1.58.0 with the sync script (FR-001) |
| `README.md`, `CHANGELOG.md` | the two options, what a passive footer drops |

The cache directory is not created by the mod: statusline creates it on its first write. When
`CLAUDE_PLUGIN_DATA` is unset, passive mode sets no `CLAUDE_STATUSLINE_CACHE_DIR`, and the renderer
writes nothing, as its contract says. The native footer's drawing does not change.
