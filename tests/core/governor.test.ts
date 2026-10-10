import { describe, expect, test } from 'claude-code/testing'

import { decide, holdQuestion, isReadOnlyTool, nextBand, nextHeld, parseAllow, pauseQuestion, refusal, resumePrompt, stateText, usageRows, usageSegment, whenOf } from '../../hooks/core/governor'

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
    expect(resumePrompt([], '5h now 3%', 'T010 task 10 in 002 band-hint')).toBe('Usage window renewed (5h now 3%). Continue the work that was paused.\nThe work stopped at T010 task 10 in 002 band-hint.')
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

describe('questions before a hold or a pause (015)', () => {
  test('hold: queue first (the default), then run, lift for an hour, drop', () => {
    const q = holdQuestion(decide([r(83, 'seven_day')], [], undefined, NOW), 'Full review', 'Mon 07:00')
    expect(q.kind).toBe('hold')
    expect(q.text).toBe('🧭 usage 7d 83% (hold): a new subagent, "Full review". What now?')
    expect(q.options).toEqual([
      { value: 'queue', label: 'Queue it until Mon 07:00' },
      { value: 'run', label: 'Run this one now' },
      { value: 'lift', label: 'Allow subagents for 1 hour, one at a time' },
      { value: 'drop', label: 'Drop this request' },
    ])
    expect(q.fallback).toBe('queue')
  })

  test('pause: pause first (the default), then 30 minutes and 2 hours with their ceilings', () => {
    const q = pauseQuestion(decide([r(89)], [], undefined, NOW), 'Bash', '14:00')
    expect(q.text).toBe('🧭 usage 5h 89% (stop): Claude wants to run Bash. What now?')
    expect(q.options).toEqual([
      { value: 'pause', label: 'Pause until 14:00' },
      { value: 'extend', label: 'Continue for 30 more minutes (ceiling 91%)', target: 91 },
      { value: 'raise', label: 'Raise the ceiling to 95% for 2 hours', target: 95 },
    ])
    expect(q.fallback).toBe('pause')
  })

  test('ceilings stay two points above usage, at most 99, and vanish when they cannot', () => {
    const at = (p: number) => pauseQuestion(decide([r(p)], [], undefined, NOW), 'Edit').options.map(o => o.target)
    expect(at(90)).toEqual([undefined, 92, 95])
    expect(at(94.5)).toEqual([undefined, 96, 96])
    expect(at(98)).toEqual([undefined, 99, 99])
    expect(at(99)).toEqual([undefined])
    expect(pauseQuestion(decide([r(91)], [], undefined, NOW), 'Edit').options[0]?.label).toBe('Pause until the reset')
  })

  test('a hold lift turns hold into throttle with cap 1 until it ends; stop is untouched', () => {
    const lift = NOW + 3600_000
    expect([decide([r(83)], [], undefined, NOW, lift)].map(d => [d.band, d.cap])).toEqual([['throttle', 1]])
    expect(decide([r(83)], [], undefined, NOW, NOW - 1).band).toBe('hold')
    expect(decide([r(89)], [], undefined, NOW, lift).band).toBe('stop')
  })
})

describe('parity with the usage-governor skill (016)', () => {
  const PAST = new Date(NOW - 60_000).toISOString()
  const held = { kind: 'five_hour', resetsAt: IN_2H }

  test('hysteresis: once held, the same window stays held down to 75%', () => {
    expect(decide([r(78)], [], undefined, NOW, undefined, held).band).toBe('hold')
    expect(decide([r(75)], [], undefined, NOW, undefined, held).band).toBe('hold')
    expect([decide([r(74)], [], undefined, NOW, undefined, held)].map(d => [d.band, d.cap])).toEqual([['throttle', 1]])
    expect(decide([r(78, 'seven_day')], [], undefined, NOW, undefined, held).band).toBe('throttle')
  })

  test('the held window is kept from 80% down to 75%, and forgotten below, or once it renews', () => {
    expect(nextHeld([r(81)], undefined, NOW)).toEqual(held)
    expect(nextHeld([r(77)], held, NOW)).toEqual(held)
    expect(nextHeld([r(74)], held, NOW)).toBeUndefined()
    expect(nextHeld([r(77)], undefined, NOW)).toBeUndefined()
    const renewed = new Date(NOW + 7 * 24 * 3600_000).toISOString()
    expect(nextHeld([r(77, 'five_hour', renewed)], held, NOW)).toBeUndefined()
    expect(nextHeld([r(77, 'five_hour', PAST)], held, NOW)).toBeUndefined()
  })

  test('an override lifts only the window it was given for', () => {
    const override = { target: 95, until: NOW + 3600_000, kind: 'seven_day' }
    expect(decide([r(91), r(92, 'seven_day')], [], override, NOW).band).toBe('ceiling')
    const d = decide([r(50), r(92, 'seven_day')], [], override, NOW)
    expect([d.band, d.highest?.kind]).toEqual(['hold', 'seven_day'])
    expect(decide([r(91)], [], { target: 95, until: NOW + 3600_000 }, NOW).band).toBe('hold')
  })

  test('the binding window is the one in the highest band, then the fuller one', () => {
    const override = { target: 95, until: NOW + 3600_000, kind: 'seven_day' }
    const d = decide([r(89), r(93, 'seven_day')], [], override, NOW)
    expect([d.band, d.highest?.kind]).toEqual(['stop', 'five_hour'])
  })

  test('a window past its reset has renewed: unknown, so subagents run one at a time', () => {
    const d = decide([r(95, 'five_hour', PAST)], [], undefined, NOW)
    expect([d.band, d.cap, d.highest?.kind]).toEqual(['throttle', 1, 'five_hour'])
    expect(decide([r(95, 'five_hour', PAST), r(30, 'seven_day')], [], undefined, NOW).cap).toBe(1)
    expect(decide([r(95, 'five_hour', PAST), r(85, 'seven_day')], [], undefined, NOW).band).toBe('hold')
    expect(usageSegment(decide([r(95, 'five_hour', PAST)], [], undefined, NOW))).toBe('5h renewed')
  })

  test('the pane rows: windows, queue, override and lift', () => {
    const rows = usageRows(
      {
        readings: [r(42), r(83, 'seven_day')],
        history: [],
        inFlight: 1,
        queue: [{ id: 'q1', description: 'Review', prompt: 'x' }],
        override: { target: 95, until: NOW + 3600_000, kind: 'seven_day' },
        holdLift: NOW + 1800_000,
        paused: false,
      },
      NOW,
    )
    expect(rows.map(([label]) => label)).toEqual(['state', 'usage', 'subagents', 'queue', 'override', 'lift'])
    expect(rows[0]?.[1]).toBe('slowing down (7d at 83%): at most 1 subagent at a time')
    expect(rows[1]?.[1]).toBe('5h 42% · 7d 83%: throttle')
    expect(rows[2]?.[1]).toBe('1 running, cap 1')
    expect(rows[3]?.[1]).toBe('q1 Review · /astrolabe run q1')
    expect(rows[4]?.[1]).toMatch(/^ceiling 95% on 7d until \d\d:\d\d, in \d+(h\d\d)?m$/)
    expect(rows[5]?.[1]).toMatch(/^subagents one at a time until \d\d:\d\d, in \d+(h\d\d)?m$/)
    expect(usageRows({ readings: [], history: [], inFlight: 0, queue: [], paused: false }, NOW)).toEqual([])
  })

  test('047: the state in plain words and the time to the next band', () => {
    expect(stateText(decide([r(83)], [], undefined, NOW))).toMatch(/^holding \(5h at 83%\): new subagents wait until \d\d:\d\d; other tools run$/)
    expect(stateText(decide([r(92)], [], undefined, NOW))).toMatch(/^paused \(5h at 92%\): only read-only tools run until /)
    expect(stateText(decide([r(20)], [], undefined, NOW))).toBe('all clear (5h at 20%): up to 6 subagents at a time')
    const history = [{ at: NOW - 3_600_000, percent: 50 }, { at: NOW, percent: 70 }]
    expect(nextBand([{ kind: 'five_hour', percentUsed: 70, resetsAt: new Date(NOW + 5 * 3_600_000).toISOString() }], history, NOW)).toBe('hold at 80% in about 30m at this pace')
    expect(nextBand([{ kind: 'five_hour', percentUsed: 70, resetsAt: new Date(NOW + 10 * 60_000).toISOString() }], history, NOW)).toBe('hold at 80%: not before the reset at this pace')
    expect(nextBand([r(70)], [], NOW)).toBeUndefined()
  })
})

describe('whenOf: a time reads clock then distance (052 #29)', () => {
  test('the future says in, the past says ago', () => {
    const now = new Date(2026, 9, 10, 12, 0).getTime()
    expect(whenOf(new Date(2026, 9, 10, 14, 13).getTime(), now)).toBe('14:13, in 2h13m')
    expect(whenOf(new Date(2026, 9, 10, 12, 45).getTime(), now)).toBe('12:45, in 45m')
    expect(whenOf(new Date(2026, 9, 10, 11, 55).getTime(), now)).toBe('11:55, 5m ago')
  })
})

describe('a gateway spend limit ramps like the windows (047 #69)', () => {
  test('spend_limit takes the same bands and reads as "spend limit"', () => {
    const band = (p: number) => decide([r(p, 'spend_limit')], [], undefined, NOW)
    expect([band(42), band(72), band(83), band(89), band(91)].map(d => d.band)).toEqual(['ok', 'throttle', 'hold', 'stop', 'ceiling'])
    expect(usageSegment(band(83))).toBe('spend limit 83% hold')
  })
  test('past 100 on an exceeded limit reads full and stays at the ceiling', () => {
    const d = decide([r(104.5, 'spend_limit')], [], undefined, NOW)
    expect(d.band).toBe('ceiling')
    expect(usageSegment(d)).toBe('spend limit full ceiling')
  })
})
