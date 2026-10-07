# Contract: governor

| Band | Highest window | New `Agent` | Other tools |
|---|---|---|---|
| ok | < 60% | allowed | allowed |
| throttle | 60–80% (or projected ≥ 80% before reset) | cap 3 below 70%, cap 1 from 70% or projected | allowed |
| hold | ≥ 80% | refused and queued | allowed |
| stop | ≥ 88% (or override target) | refused and queued | only read-only |
| ceiling | ≥ 90% (or override target) | refused and queued | only read-only |

Status segment: `5h 42%` (ok), `5h 72% throttle`, `5h 83% hold`, `5h 89% stop`, `5h 91% ceiling`.

Refusals:
- `🧭 usage 5h 83% (hold): new subagents are queued until 04:09; queued as q1`
- `🧭 usage 5h 72% (throttle, cap 1): 1 subagent running; queued as q2`
- `🧭 usage 5h 89% (stop): paused until 04:09; only read-only tools run`

Resume prompt: `Usage window renewed (5h now 3%). Re-dispatch these queued subagents: 1. <description>: <prompt>` …

Owner command: `/astrolabe allow 95 2h`, `/astrolabe revoke`.
