# Implementation Plan: Usage governance

**Branch**: `008-usage-governance` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

## Summary

`hooks/core/governor.ts` is the policy: `decide(readings, history, override, now)` →
`{ band, cap, highest }`, `gateAgent`, `isReadOnlyTool`, `parseAllow`, `resumePrompt`,
`usageSegment`. `register.tsx` stores readings from `session.measure` in `$.state`
`astrolabe.usage`, gates `tool.call` (Agent, and all tools at stop), keeps the queue and the
in-flight count, schedules the resume with `$.clock.after`, and extends `/astrolabe` with
`allow` and `revoke`.

## Constitution Check

| Principle | Compliance | Status |
|---|---|---|
| III | New `$.state` key `usage`; the override is session state, never written to settings. | Pass |
| IV | Policy pure; `$` only in `register.tsx`. | Pass |
| VI | Tests first: the band table, gating, queue and resume, the owner check. | Pass |
| VII | Refusals carry a reason; nothing stops a running subagent. | Pass |
| XI | No readings, no gating. | Pass |
| XII | No reads on the draw path; no network. | Pass |
| XIV | Version 0.8.0. | Pass |

## Project Structure

```text
hooks/core/governor.ts   hooks/core/status-text.ts (+ usage segment)
hooks/register.tsx       types/index.d.ts (+ UsageState)   .claude-plugin/plugin.json (+ governUsage)
tests/core/governor.test.ts   tests/integration/governor.test.ts
```

## Complexity Tracking

| Item | Why needed | Simpler alternative rejected because |
|---|---|---|
| A `tool.call` hook without a matcher (stop and ceiling) | Pausing must refuse every non-read-only tool. | Listing tools by name misses MCP and plugin tools. The hook passes everything unchanged below stop. |
