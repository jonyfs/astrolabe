# Research: releases and tutorial

- jonyfs/statusline's `.github/workflows/release.yml` runs on `v*.*.*` tags, re-verifies on
  three OSes and then releases; it stopped tagging at v1.3.0 while `package.json` reached
  1.34.0, the drift FR-002 prevents.
- Statusline files that map to Astrolabe: `bin/cli.js` (stdin JSON in, ANSI out) →
  `hooks/register.tsx` (events in, trees out); `src/render.js` and `src/segments.js` →
  `hooks/core/status-text.ts`, `hooks/core/band.ts` and `hooks/surfaces/`; `src/theme.js` →
  `hooks/core/theme.ts`; `src/install.js` (edits `settings.json`) →
  `.claude-plugin/marketplace.json` (nothing to edit); `.github/workflows/release.yml` → the
  same file here.
- `plugin.json` keeps `"version": "X.Y.Z"` on one line (written with two-space JSON), so a
  `sed` extraction is enough and needs no `jq` or Node.
