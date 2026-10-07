import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { installEngine, installTree, startSession } from '../helpers/fake-fs'

// Spec 015: before it holds or pauses, the governor asks the person, and goes ahead with the
// cautious default after a minute.
const NOW = Date.UTC(2026, 9, 7, 12, 0)
const ASK_ID = 'astrolabe-usage'
const reading = (percentUsed: number, resetInMs = 3_600_000) => ({ kind: 'five_hour', percentUsed, resetsAt: new Date(NOW + resetInMs).toISOString() })
const measure = ($: never, ...rateLimits: ReturnType<typeof reading>[]) =>
  ($ as unknown as { session: { measure: (e: never) => Promise<unknown> } }).session.measure({
    context: { window: 200_000 },
    rateLimits,
    changed: ['rateLimits'],
  } as never)
const agent = (id: string) => ({ tool: 'Agent', tool_use_id: id, description: `job ${id}`, prompt: `do ${id}`, subagent_type: 'general-purpose' }) as never
const bash = (id = 'b') => ({ tool: 'Bash', tool_use_id: id, command: 'ls' }) as never
const textOf = (r: unknown) => {
  const x = r as { deny?: string; text?: string; result?: { text?: string } }
  return String(x.deny ?? x.text ?? x.result?.text ?? '')
}
const isRefused = (r: unknown) => (r as { isError?: boolean }).isError === true || 'deny' in (r as object)

type AskUi = {
  find: (q: { key?: string }) => Promise<{ text: string } | undefined>
  drawn: () => Promise<unknown>
  select: (q: { key: string; value: string }) => Promise<unknown>
  unmount: () => Promise<void>
}

/** An engine that places panes (wide terminal) or not (narrow), and answers $.ui.ask with `asked`. */
const installAskEngine = (on: never, placed: boolean) => {
  let answerWith: (label: string) => void = () => undefined
  const answered = new Promise<string>(resolve => {
    answerWith = resolve
  })
  const seen = { opened: [] as Array<{ id: string; focus?: boolean }>, closed: [] as string[], asked: [] as string[], answer: (label: string) => answerWith(label) }
  const hook = on as unknown as (event: string, a: unknown, b?: unknown) => void
  hook('ui.open', (_: unknown, e: { id: string; focus?: boolean }) => {
    seen.opened.push(e)
    return { value: placed ? { isPlaced: true } : { isPlaced: false, reason: 'narrow' } }
  })
  hook('ui.close', (_: unknown, e: { id: string }) => {
    seen.closed.push(e.id)
    return { value: undefined }
  })
  hook('tool.call', { tool: 'AskUserQuestion' }, async (_: unknown, e: { questions: Array<{ question: string }> }) => {
    const question = String(e.questions[0]?.question ?? '')
    seen.asked.push(question)
    // Unanswered until the test answers: the person has not picked yet.
    return { result: { questions: e.questions, answers: { [question]: await answered } } }
  })
  return seen
}

const flush = async () => {
  for (let i = 0; i < 400; i += 1) await Promise.resolve()
}
const until = async (check: () => boolean) => {
  for (let i = 0; i < 20_000 && !check(); i += 1) await Promise.resolve()
}

const mountAsk = async ($: never) =>
  (await ($ as unknown as { ui: { mount: (t: never) => Promise<AskUi> } }).ui.mount({
    plugin: 'astrolabe',
    surface: 'terminal',
    component: 'Pane',
    requestId: ASK_ID,
    props: { title: '🧭 Astrolabe · usage', isFocused: true, bodyColumns: 80, placement: 'dock', scroll: { bodyRows: 10, top: 0 } },
    viewport: { columns: 160, rows: 40, isFullscreen: true },
  } as never)) as AskUi

const setup = async ($: never, on: never, placed = true, isInteractive = true) => {
  const session = installTree(on, halfDone.tree, '/proj')
  const asks = installAskEngine(on, placed)
  const engine = installEngine(on)
  await session.clock.set(NOW)
  if (isInteractive) await startSession($, '/proj')
  else await ($ as unknown as { session: { start: (e: never) => Promise<unknown> } }).session.start({ cwd: '/proj', surface: 'terminal', isInteractive: false } as never)
  return { session, asks, engine }
}
const opens = (asks: { opened: Array<{ id: string }> }) => asks.opened.filter(o => o.id === ASK_ID).length

describe('hold: asked before a subagent is queued (FR-001, FR-003)', () => {
  test('a focused pane lists the answers, the default first; Run this one now lets it through', async ($, on) => {
    const { asks } = await setup($ as never, on as never)
    await measure($ as never, reading(83))
    const pending = $.tool.call(agent('a1'))
    await until(() => asks.opened.some(o => o.id === ASK_ID))
    expect(asks.opened.find(o => o.id === ASK_ID)?.focus).toBe(true)
    const ui = await mountAsk($ as never)
    const body = (await ui.find({ key: 'astrolabe-usage-body' }))?.text ?? ''
    expect(body).toContain('🧭 usage 5h 83% (hold): a new subagent, "job a1". What now?')
    expect(body).toContain('the default goes ahead at')
    const drawn = JSON.stringify(await ui.drawn())
    for (const label of ['Queue it until', 'Run this one now', 'Allow subagents for 1 hour, one at a time', 'Drop this request']) {
      expect(drawn).toContain(label)
    }
    await ui.select({ key: 'astrolabe-usage-choice', value: 'run' })
    await ui.unmount()
    expect(isRefused(await pending)).toBe(false)
    expect(asks.closed).toContain(ASK_ID)
  })

  test('no answer for a minute: the default queues it, and the next call queues without asking', async ($, on) => {
    const { session, asks } = await setup($ as never, on as never)
    await measure($ as never, reading(83))
    const pending = $.tool.call(agent('a1'))
    await until(() => asks.opened.length > 0)
    await session.clock.advance(60_000)
    const refused = await pending
    expect(textOf(refused)).toContain('(hold): new subagents are queued until')
    expect(textOf(refused)).toContain('queued as q1')
    expect(textOf(await $.tool.call(agent('a2')))).toContain('queued as q2')
    expect(asks.opened.filter(o => o.id === ASK_ID).length).toBe(1)
  })

  test('Allow subagents for 1 hour: this one and the next run without asking, one at a time', async ($, on) => {
    const { session, asks } = await setup($ as never, on as never)
    await measure($ as never, reading(83, 6 * 3_600_000))
    const pending = $.tool.call(agent('a1'))
    await until(() => asks.opened.length > 0)
    const ui = await mountAsk($ as never)
    await ui.select({ key: 'astrolabe-usage-choice', value: 'lift' })
    await ui.unmount()
    expect(isRefused(await pending)).toBe(false)
    expect(isRefused(await $.tool.call(agent('a2')))).toBe(false)
    expect(session.last()).toContain('5h 83% throttle')
    await session.clock.advance(3_600_000)
    await measure($ as never, reading(83, 6 * 3_600_000))
    const after = $.tool.call(agent('a3'))
    await until(() => asks.opened.filter(o => o.id === ASK_ID).length === 2)
    await session.clock.advance(60_000)
    expect(isRefused(await after)).toBe(true)
  })

  test('Drop this request: refused, nothing queued, and remembered for the band', async ($, on) => {
    const { session, asks } = await setup($ as never, on as never)
    await measure($ as never, reading(83, 600_000))
    const pending = $.tool.call(agent('a1'))
    await until(() => asks.opened.length > 0)
    const ui = await mountAsk($ as never)
    await ui.select({ key: 'astrolabe-usage-choice', value: 'drop' })
    await ui.unmount()
    expect(textOf(await pending)).toContain('dropped at your request')
    expect(textOf(await $.tool.call(agent('a2')))).toContain('dropped at your request')
    await session.clock.advance(700_000)
    await session.clock.settle()
    expect(session.submitted).toEqual([])
  })

  test('calls that arrive while the question is open wait for the same answer', async ($, on) => {
    const { asks } = await setup($ as never, on as never)
    await measure($ as never, reading(83))
    const first = $.tool.call(agent('a1'))
    await until(() => asks.opened.length > 0)
    const second = $.tool.call(agent('a2'))
    await flush()
    const ui = await mountAsk($ as never)
    await ui.select({ key: 'astrolabe-usage-choice', value: 'queue' })
    await ui.unmount()
    expect(textOf(await first)).toContain('queued as q1')
    expect(textOf(await second)).toContain('queued as q2')
    expect(asks.opened.filter(o => o.id === ASK_ID).length).toBe(1)
  })

  test('leaving the band clears what was remembered', async ($, on) => {
    const { session, asks } = await setup($ as never, on as never)
    await measure($ as never, reading(83))
    const pending = $.tool.call(agent('a1'))
    await until(() => asks.opened.length > 0)
    await session.clock.advance(60_000)
    await pending
    await measure($ as never, reading(3))
    await measure($ as never, reading(84))
    const again = $.tool.call(agent('a2'))
    await until(() => asks.opened.filter(o => o.id === ASK_ID).length === 2)
    await session.clock.advance(60_000)
    expect(isRefused(await again)).toBe(true)
  })
})

describe('several calls at once (FR-006)', () => {
  test('"Run this one now" runs only the call that asked; the other is asked in turn', async ($, on) => {
    const { session, asks } = await setup($ as never, on as never)
    await measure($ as never, reading(83))
    const first = $.tool.call(agent('a1'))
    await until(() => opens(asks) === 1)
    const second = $.tool.call(agent('a2'))
    await flush()
    const ui = await mountAsk($ as never)
    await ui.select({ key: 'astrolabe-usage-choice', value: 'run' })
    await ui.unmount()
    expect(isRefused(await first)).toBe(false)
    await until(() => opens(asks) === 2)
    await session.clock.advance(60_000)
    expect(textOf(await second)).toContain('queued as q1')
  })

  test('a lift lets the calls through one at a time, the rest queue under cap 1', async ($, on) => {
    const { asks, engine } = await setup($ as never, on as never)
    await measure($ as never, reading(83))
    engine.holdAgents()
    const calls = [$.tool.call(agent('a1')), $.tool.call(agent('a2')), $.tool.call(agent('a3'))]
    await until(() => opens(asks) === 1)
    await flush()
    const ui = await mountAsk($ as never)
    await ui.select({ key: 'astrolabe-usage-choice', value: 'lift' })
    await ui.unmount()
    const later = await Promise.all(calls.slice(1))
    expect(later.map(textOf).every(t => t.includes('(throttle, cap 1)'))).toBe(true)
    engine.releaseAgents()
    expect(isRefused(await calls[0])).toBe(false)
    expect(opens(asks)).toBe(1)
  })

  test('a tool at stop never takes the answer of an open hold question', async ($, on) => {
    const { asks } = await setup($ as never, on as never)
    await measure($ as never, reading(83))
    const subagent = $.tool.call(agent('a1'))
    await until(() => opens(asks) === 1)
    await measure($ as never, reading(89))
    const shell = $.tool.call(bash())
    await flush()
    let ui = await mountAsk($ as never)
    await ui.select({ key: 'astrolabe-usage-choice', value: 'lift' })
    await ui.unmount()
    await subagent
    await until(() => opens(asks) === 2)
    ui = await mountAsk($ as never)
    expect((await ui.find({ key: 'astrolabe-usage-body' }))?.text).toContain('Claude wants to run Bash')
    await ui.select({ key: 'astrolabe-usage-choice', value: 'pause' })
    await ui.unmount()
    expect(textOf(await shell)).toContain('(stop): paused until')
  })
})

describe('no one at the prompt (-p, SDK)', () => {
  test('queues and pauses at once, without asking', async ($, on) => {
    const { asks } = await setup($ as never, on as never, true, false)
    await measure($ as never, reading(83))
    expect(textOf(await $.tool.call(agent('a1')))).toContain('queued as q1')
    await measure($ as never, reading(89))
    expect(textOf(await $.tool.call(bash()))).toContain('(stop): paused until')
    expect(asks.opened).toEqual([])
  })
})

describe('stop and ceiling: asked before the main thread pauses (FR-002)', () => {
  test('Continue for 30 more minutes raises the ceiling for 30 minutes and lets the tool run', async ($, on) => {
    const { session, asks } = await setup($ as never, on as never)
    await measure($ as never, reading(89))
    const pending = $.tool.call(bash())
    await until(() => asks.opened.length > 0)
    const ui = await mountAsk($ as never)
    const body = (await ui.find({ key: 'astrolabe-usage-body' }))?.text ?? ''
    expect(body).toContain('Claude wants to run Bash. What now?')
    await ui.select({ key: 'astrolabe-usage-choice', value: 'extend' })
    await ui.unmount()
    expect(isRefused(await pending)).toBe(false)
    expect(isRefused(await $.tool.call(bash('b2')))).toBe(false)
    expect(session.last()).toContain('5h 89% hold')
    await session.clock.advance(30 * 60_000 + 1)
    const later = $.tool.call(bash('b3'))
    await until(() => asks.opened.filter(o => o.id === ASK_ID).length === 2)
    await session.clock.advance(60_000)
    expect(isRefused(await later)).toBe(true)
  })

  test('Pause until the reset (the default) refuses this call and the next ones without asking', async ($, on) => {
    const { asks } = await setup($ as never, on as never)
    await measure($ as never, reading(89))
    const pending = $.tool.call(bash())
    await until(() => asks.opened.length > 0)
    const ui = await mountAsk($ as never)
    await ui.select({ key: 'astrolabe-usage-choice', value: 'pause' })
    await ui.unmount()
    expect(textOf(await pending)).toContain('(stop): paused until')
    expect(textOf(await $.tool.call(bash('b2')))).toContain('(stop): paused until')
    expect(asks.opened.filter(o => o.id === ASK_ID).length).toBe(1)
  })

  test('a running subagent is never asked about, nor stopped', async ($, on) => {
    const { asks } = await setup($ as never, on as never)
    await measure($ as never, reading(89))
    expect(isRefused(await $.tool.call({ tool: 'Bash', tool_use_id: 'sb', command: 'npm test', agentId: 'a-1' } as never))).toBe(false)
    expect(asks.opened).toEqual([])
  })
})

describe('narrow terminal: the engine dialog asks instead (FR-003, FR-004)', () => {
  test('the dialog answer applies; a late lift still applies after the default went ahead', async ($, on) => {
    const { session, asks } = await setup($ as never, on as never, false)
    await measure($ as never, reading(83))
    const pending = $.tool.call(agent('a1'))
    await until(() => asks.asked.length > 0)
    expect(asks.asked[0]).toContain('(hold): a new subagent, "job a1". What now?')
    await session.clock.advance(60_000)
    expect(textOf(await pending)).toContain('queued as q1')
    asks.answer('Allow subagents for 1 hour, one at a time')
    await until(() => session.last()?.includes('throttle') === true)
    expect(isRefused(await $.tool.call(agent('a2')))).toBe(false)
  })
})

describe('askOnLimit off (FR-008)', () => {
  test('queues and pauses at once, as before', { options: { askOnLimit: false } }, async ($, on) => {
    const { asks } = await setup($ as never, on as never)
    await measure($ as never, reading(83))
    expect(textOf(await $.tool.call(agent('a1')))).toContain('queued as q1')
    await measure($ as never, reading(89))
    expect(textOf(await $.tool.call(bash()))).toContain('(stop): paused until')
    expect(asks.opened).toEqual([])
    expect(asks.asked).toEqual([])
  })
})
