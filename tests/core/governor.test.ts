import { describe, expect, test } from 'claude-code/testing'

import { decide, isReadOnlyTool, parseAllow, refusal, resumePrompt, usageSegment } from '../../hooks/core/governor'

const NOW = Date.UTC(2026, 9, 7, 12, 0)
const IN_2H = new Date(NOW + 2 * 3600_000).toISOString()
const r = (percentUsed: number, kind = 'five_hour', resetsAt = IN_2H) => ({ kind, percentUsed, resetsAt })

describe('decide (FR-002)', () => {
  test('bands by the highest window', () => {
    const band = (p: number) => decide([r(p), r(10, 'seven_day')], [], undefined, NOW)
    expect([band(42), band(65), band(72), band(80), band(88), band(90)].map(d => [d.band, d.cap])).toEqual([
      ['ok', 6],
      ['throttle', 3],
      ['throttle', 1],
      ['hold', 0],
      ['stop', 0],
      ['ceiling', 0],
    ])
    expect(decide([r(20), r(85, 'seven_day')], [], undefined, NOW).highest?.kind).toBe('seven_day')
  })
  test('no readings: ok with no highest window', () => {
    expect(decide([], [], undefined, NOW)).toEqual({ band: 'ok', cap: 6 })
  })
  test('a burn rate that projects 80% before the reset caps at 1', () => {
    const history = [
      { at: NOW - 20 * 60_000, percent: 45 },
      { at: NOW, percent: 55 },
    ]
    const d = decide([r(55)], history, undefined, NOW)
    expect([d.band, d.cap]).toEqual(['throttle', 1])
  })
  test('the owner override moves stop and ceiling, not hold, until it ends', () => {
    const override = { target: 95, until: NOW + 3600_000 }
    expect(decide([r(91)], [], override, NOW).band).toBe('hold')
    expect(decide([r(96)], [], override, NOW).band).toBe('ceiling')
    expect(decide([r(91)], [], { target: 95, until: NOW - 1 }, NOW).band).toBe('ceiling')
  })
})

describe('texts', () => {
  test('usage segment', () => {
    expect(usageSegment(decide([r(42)], [], undefined, NOW))).toBe('5h 42%')
    expect(usageSegment(decide([r(83.4)], [], undefined, NOW))).toBe('5h 83% hold')
    expect(usageSegment(decide([r(12), r(72, 'seven_day')], [], undefined, NOW))).toBe('7d 72% throttle')
    expect(usageSegment(decide([], [], undefined, NOW))).toBeUndefined()
  })
  test('refusals name the band, the reset and the queue id', () => {
    const hold = decide([r(83)], [], undefined, NOW)
    expect(refusal(hold, { queuedAs: 'q1', resetClock: '14:00' })).toBe('🧭 usage 5h 83% (hold): new subagents are queued until 14:00; queued as q1')
    const throttle = decide([r(72)], [], undefined, NOW)
    expect(refusal(throttle, { queuedAs: 'q2', inFlight: 1 })).toBe('🧭 usage 5h 72% (throttle, cap 1): 1 subagent running; queued as q2')
    const stop = decide([r(89)], [], undefined, NOW)
    expect(refusal(stop, { resetClock: '14:00' })).toBe('🧭 usage 5h 89% (stop): paused until 14:00; only read-only tools run')
  })
  test('resume prompt lists the queue', () => {
    expect(resumePrompt([{ id: 'q1', description: 'Review 002', prompt: 'Review it' }], '5h now 3%')).toBe(
      'Usage window renewed (5h now 3%). Re-dispatch these queued subagents with the Agent tool, one at a time:\n1. Review 002: Review it',
    )
    expect(resumePrompt([], '5h now 3%')).toBe('Usage window renewed (5h now 3%). Continue the work that was paused.')
  })
})

describe('owner command and read-only tools', () => {
  test('parseAllow', () => {
    expect(parseAllow('allow 95 2h')).toEqual({ allow: { target: 95, ms: 7_200_000 } })
    expect(parseAllow('allow 92 45m')).toEqual({ allow: { target: 92, ms: 2_700_000 } })
    expect(parseAllow('revoke')).toEqual({ revoke: true })
    for (const bad of ['allow 85 2h', 'allow 100 2h', 'allow 95 10m', 'allow 95 13h', 'allow', 'please']) {
      expect(parseAllow(bad)).toBeUndefined()
    }
  })
  test('isReadOnlyTool', () => {
    expect(['Read', 'Grep', 'Glob', 'LS', 'WebSearch', 'Skill'].every(isReadOnlyTool)).toBe(true)
    expect(['Bash', 'Edit', 'Write', 'Agent', 'mcp__x__y'].some(isReadOnlyTool)).toBe(false)
  })
})
