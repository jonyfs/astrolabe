import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { clockOf } from '../../hooks/core/governor'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'
import { installPaneEngine, installRenderEngine, mountPane } from '../helpers/render'

const NOW = Date.UTC(2026, 9, 7, 12, 0)
const reading = (percentUsed: number, resetInMs = 3_600_000) => ({ kind: 'five_hour', percentUsed, resetsAt: new Date(NOW + resetInMs).toISOString() })
const measure = ($: never, ...rateLimits: ReturnType<typeof reading>[]) =>
  ($ as unknown as { session: { measure: (e: never) => Promise<unknown> } }).session.measure({
    context: { window: 200_000 },
    rateLimits,
    changed: ['rateLimits'],
  } as never)
const agent = (id: string) => ({ tool: 'Agent', tool_use_id: id, description: `job ${id}`, prompt: `do ${id}`, subagent_type: 'general-purpose' }) as never
const bash = { tool: 'Bash', tool_use_id: 'b', command: 'ls' } as never
const read = { tool: 'Read', tool_use_id: 'r', file_path: '/proj/README.md' } as never
const textOf = (r: unknown) => {
  const x = r as { deny?: string; text?: string; result?: { text?: string } }
  return String(x.deny ?? x.text ?? x.result?.text ?? '')
}
const isRefused = (r: unknown) => (r as { isError?: boolean }).isError === true || 'deny' in (r as object)

const setup = async ($: never, on: never) => {
  const session = installTree(on, halfDone.tree, '/proj')
  const engine = installEngine(on)
  await session.clock.set(NOW)
  await startSession($, '/proj')
  return { session, engine }
}

describe('windows in the status entry (US1)', () => {
  test('the highest window joins the status entry', async ($, on) => {
    const { session } = await setup($ as never, on as never)
    await measure($ as never, reading(42))
    // The footer (018) carries the window's reset time.
    const at = clockOf(new Date(NOW + 3_600_000).toISOString())
    expect(session.last()).toBe(`◆ 002 · implement 45% · 5h 42% (${at})`)
    await measure($ as never, reading(83))
    expect(session.last()).toBe(`◆ 002 · implement 45% · 5h 83% hold (${at})`)
  })
  test('no readings: nothing added, nothing refused', async ($, on) => {
    const { session } = await setup($ as never, on as never)
    await measure($ as never)
    expect(session.last()).toBe('◆ 002 · implement 45%')
    expect(isRefused(await $.tool.call(agent('a1')))).toBe(false)
  })
})

describe('fan-out under the cap (US2)', () => {
  test('throttle at 72% lets one foreground subagent run, queues the second', async ($, on) => {
    const { engine } = await setup($ as never, on as never)
    await measure($ as never, reading(72))
    engine.holdAgents()
    const first = $.tool.call(agent('a1'))
    for (let i = 0; i < 200; i += 1) await Promise.resolve()
    const second = await $.tool.call(agent('a2'))
    expect(isRefused(second)).toBe(true)
    expect(textOf(second)).toContain('(throttle, cap 1): 1 subagent running; queued as q1')
    engine.releaseAgents()
    expect(isRefused(await first)).toBe(false)
    expect(isRefused(await $.tool.call(agent('a3')))).toBe(false)
  })

  test('hold queues every new subagent; the reset submits one resume prompt', async ($, on) => {
    const { session } = await setup($ as never, on as never)
    await measure($ as never, reading(83, 600_000))
    const refused = await $.tool.call(agent('a1'))
    expect(textOf(refused)).toContain('(hold): new subagents are queued until')
    await $.tool.call(agent('a2'))
    await session.clock.advance(700_000)
    await session.clock.settle()
    expect(session.submitted).toEqual([
      'Usage window renewed (5h reset). Re-dispatch these queued subagents with the Agent tool, one at a time:\n1. job a1: do a1\n2. job a2: do a2\nThe work stopped at T010 task 10 in 002 band-hint.',
    ])
    await session.clock.advance(700_000)
    expect(session.submitted.length).toBe(1)
  })

  test('a new reading below hold releases the queue at once', async ($, on) => {
    const { session } = await setup($ as never, on as never)
    await measure($ as never, reading(83))
    await $.tool.call(agent('a1'))
    await measure($ as never, reading(3))
    expect(session.submitted[0]).toContain('1. job a1: do a1')
  })
})

describe('pause and the owner ceiling (US3)', () => {
  test('stop refuses non-read-only tools and keeps Read', async ($, on) => {
    await setup($ as never, on as never)
    await measure($ as never, reading(89))
    const refused = await $.tool.call(bash)
    expect(textOf(refused)).toContain('(stop): paused until')
    expect(isRefused(await $.tool.call(read))).toBe(false)
  })

  test('/astrolabe allow from the user lifts stop and ceiling; from elsewhere it is refused', async ($, on) => {
    const { session } = await setup($ as never, on as never)
    await measure($ as never, reading(91))
    const fromSdk = await $.command.run({ command: 'astrolabe', args: 'allow 95 2h', origin: { kind: 'sdk' } } as never)
    expect(textOf(fromSdk)).toContain('only you can')
    expect(isRefused(await $.tool.call(bash))).toBe(true)
    const fromUser = await $.command.run({ command: 'astrolabe', args: 'allow 95 2h', origin: { kind: 'composer' } } as never)
    expect(textOf(fromUser)).toContain('stop and ceiling raised to 95%')
    expect(isRefused(await $.tool.call(bash))).toBe(false)
    expect(isRefused(await $.tool.call(agent('a1')))).toBe(true)
    expect(session.last()).toContain('5h 91% hold')
    await $.command.run({ command: 'astrolabe', args: 'revoke', origin: { kind: 'composer' } } as never)
    expect(isRefused(await $.tool.call(bash))).toBe(true)
  })

  test('governUsage off: nothing is refused, the window still shows', { options: { governUsage: false } }, async ($, on) => {
    const { session } = await setup($ as never, on as never)
    await measure($ as never, reading(95))
    expect(isRefused(await $.tool.call(bash))).toBe(false)
    expect(isRefused(await $.tool.call(agent('a1')))).toBe(false)
    expect(session.last()).toContain('5h 95% ceiling')
  })

  test('a turn still reconciles while paused', async ($, on) => {
    const { session } = await setup($ as never, on as never)
    await measure($ as never, reading(89))
    await completeTurn($)
    expect(session.logs).toEqual([])
  })
})

describe('running subagents are never stopped (SC-001)', () => {
  test('at stop, a running subagent keeps its tools; the main thread is paused', async ($, on) => {
    await setup($ as never, on as never)
    await measure($ as never, reading(89))
    const fromSubagent = await $.tool.call({ tool: 'Bash', tool_use_id: 'sb', command: 'npm test', agentId: 'a-1' } as never)
    expect(isRefused(fromSubagent)).toBe(false)
    expect(isRefused(await $.tool.call(bash))).toBe(true)
  })
  test('a subagent asking for another subagent at hold is still queued', async ($, on) => {
    await setup($ as never, on as never)
    await measure($ as never, reading(83))
    const nested = await $.tool.call({ ...(agent('n1') as object), agentId: 'a-1' } as never)
    expect(isRefused(nested)).toBe(true)
  })
})

describe('parity with the usage-governor skill (016)', () => {
  const sevenDay = (percentUsed: number) => ({ kind: 'seven_day', percentUsed, resetsAt: new Date(NOW + 5 * 24 * 3600_000).toISOString() })

  test('hysteresis: the queue waits until usage drops below 75%, not 80%', { options: { askOnLimit: false } }, async ($, on) => {
    const { session } = await setup($ as never, on as never)
    await measure($ as never, reading(83))
    await $.tool.call(agent('a1'))
    await measure($ as never, reading(77))
    expect(session.submitted).toEqual([])
    expect(session.last()).toContain('5h 77% hold')
    await measure($ as never, reading(74))
    expect(session.submitted[0]).toContain('1. job a1: do a1')
  })

  test('/astrolabe allow lifts only the window that was full', async ($, on) => {
    await setup($ as never, on as never)
    await measure($ as never, reading(91))
    await $.command.run({ command: 'astrolabe', args: 'allow 95 2h', origin: { kind: 'composer' } } as never)
    expect(isRefused(await $.tool.call(bash))).toBe(false)
    await measure($ as never, reading(50), sevenDay(91))
    expect(isRefused(await $.tool.call(bash))).toBe(true)
  })

  test('after the reset time, before a new reading, subagents run one at a time', { options: { askOnLimit: false } }, async ($, on) => {
    const { session, engine } = await setup($ as never, on as never)
    await measure($ as never, reading(95, 600_000))
    await session.clock.advance(700_000)
    expect(session.last()).toContain('5h renewed')
    engine.holdAgents()
    const first = $.tool.call(agent('a1'))
    for (let i = 0; i < 200; i += 1) await Promise.resolve()
    expect(textOf(await $.tool.call(agent('a2')))).toContain('(throttle, cap 1)')
    engine.releaseAgents()
    expect(isRefused(await first)).toBe(false)
  })

  test('a reset resumes nothing while another window still pauses', { options: { askOnLimit: false } }, async ($, on) => {
    const { session } = await setup($ as never, on as never)
    await measure($ as never, reading(91, 600_000), sevenDay(89))
    expect(textOf(await $.tool.call(agent('a1')))).toContain('(ceiling): paused until')
    await session.clock.advance(700_000)
    await session.clock.settle()
    expect(session.submitted).toEqual([])
    expect(session.last()).toContain('7d 89% stop')
    expect(textOf(await $.tool.call(bash))).toContain('usage 7d 89% (stop): paused until')
  })

  test('a refusal names a renewed window, not its stale percentage', { options: { askOnLimit: false } }, async ($, on) => {
    const { session, engine } = await setup($ as never, on as never)
    await measure($ as never, reading(95, 600_000))
    await session.clock.advance(700_000)
    engine.holdAgents()
    const first = $.tool.call(agent('a1'))
    for (let i = 0; i < 200; i += 1) await Promise.resolve()
    expect(textOf(await $.tool.call(agent('a2')))).toContain('usage 5h renewed (throttle, cap 1)')
    engine.releaseAgents()
    await first
  })

  test('the pane\'s Session tab shows the governor', async ($, on) => {
    const session = installTree(on, halfDone.tree, '/proj')
    installEngine(on)
    installRenderEngine(on as never)
    installPaneEngine(on as never)
    await session.clock.set(NOW)
    await startSession($, '/proj')
    await measure($ as never, reading(42), sevenDay(83))
    const ui = await mountPane($ as never, 'terminal')
    await ui.press('tab-session')
    const body = await ui.body()
    expect(body).toContain('usage         5h 42% · 7d 83%: hold')
    expect(body).toContain('subagents     0 running, cap 0')
    await ui.unmount()
    expect(session.logs).toEqual([])
  })
})
