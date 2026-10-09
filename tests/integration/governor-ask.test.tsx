import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { installEngine, installTree, settleStatus, startSession } from '../helpers/fake-fs'

// Specs 015 and 017: when the governor holds or pauses, it refuses at once with the cautious
// default (a hook has 10 s, so it never waits for a person) and asks the person from a timer;
// the answer then acts on the queue and the pause.
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
  await settleStatus(session)
  return { session, asks, engine }
}

const opens = (asks: { opened: Array<{ id: string }> }) => asks.opened.filter(o => o.id === ASK_ID).length
const pickIn = async ($: never, value: string) => {
  const ui = await mountAsk($)
  await ui.select({ key: 'astrolabe-usage-choice', value })
  await ui.unmount()
  await flush()
}
/** The question opens from a timer once the refused call has returned. */
const questionOpens = async (session: { clock: { advance: (ms: number) => Promise<unknown> } }, asks: { opened: Array<{ id: string }> }, count = 1) => {
  for (let i = 0; i < 50 && opens(asks) < count; i += 1) {
    await session.clock.advance(0)
    await flush()
  }
}

describe('hold: refused at once, then the person is asked (015, 017)', () => {
  test('the call is refused without waiting for anyone; the pane lists the answers, the default first', async ($, on) => {
    const { session, asks } = await setup($ as never, on as never)
    await measure($ as never, reading(83))
    const refused = await $.tool.call(agent('a1'))
    expect(textOf(refused)).toContain('queued as q1')
    expect(textOf(refused)).toContain('The person is being asked')
    await questionOpens(session, asks)
    expect(asks.opened.find(o => o.id === ASK_ID)?.focus).toBe(true)
    const ui = await mountAsk($ as never)
    const body = (await ui.find({ key: 'astrolabe-usage-body' }))?.text ?? ''
    expect(body).toContain('🧭 usage 5h 83% (hold): a new subagent, "job a1". What now?')
    expect(body).toContain('the default goes ahead at')
    const drawn = JSON.stringify(await ui.drawn())
    for (const label of ['Queue it until', 'Run this one now', 'Allow subagents for 1 hour, one at a time', 'Drop this request']) {
      expect(drawn).toContain(label)
    }
    await ui.unmount()
  })

  test('Run this one now: Claude is told to send it again, and that one call goes through once', async ($, on) => {
    const { session, asks } = await setup($ as never, on as never)
    await measure($ as never, reading(83))
    await $.tool.call(agent('a1'))
    await questionOpens(session, asks)
    await pickIn($ as never, 'run')
    expect(session.submitted).toEqual([
      'The person let one queued subagent run now. Dispatch it again with the Agent tool, with this exact prompt:\njob a1: do a1',
    ])
    expect(isRefused(await $.tool.call(agent('a1')))).toBe(false)
    expect(textOf(await $.tool.call(agent('a1')))).toContain('queued as')
    expect(asks.closed).toContain(ASK_ID)
  })

  test('no answer for a minute: the pane closes, the default is remembered, and later calls are not asked', async ($, on) => {
    const { session, asks } = await setup($ as never, on as never)
    await measure($ as never, reading(83))
    await $.tool.call(agent('a1'))
    await questionOpens(session, asks)
    await session.clock.advance(60_000)
    await flush()
    expect(asks.closed).toContain(ASK_ID)
    const later = await $.tool.call(agent('a2'))
    expect(textOf(later)).toContain('queued as q2')
    expect(textOf(later)).not.toContain('The person is being asked')
    await session.clock.advance(0)
    await flush()
    expect(opens(asks)).toBe(1)
  })

  test('Allow subagents for 1 hour: the queue is sent again and new subagents run one at a time', async ($, on) => {
    const { session, asks } = await setup($ as never, on as never)
    await measure($ as never, reading(83, 6 * 3_600_000))
    await $.tool.call(agent('a1'))
    await questionOpens(session, asks)
    await pickIn($ as never, 'lift')
    expect(session.submitted[0]).toContain('1. job a1: do a1')
    expect(isRefused(await $.tool.call(agent('a2')))).toBe(false)
    await settleStatus(session)
    expect(session.last()).toContain('5h 83% throttle')
  })

  test('Drop this request: the call leaves the queue, and later calls are dropped while the band lasts', async ($, on) => {
    const { session, asks } = await setup($ as never, on as never)
    await measure($ as never, reading(83, 600_000))
    await $.tool.call(agent('a1'))
    await questionOpens(session, asks)
    await pickIn($ as never, 'drop')
    expect(textOf(await $.tool.call(agent('a2')))).toContain('dropped at your request')
    await session.clock.advance(700_000)
    await session.clock.settle()
    expect(session.submitted).toEqual([])
  })

  test('calls at once are all refused at once, and only one question opens', async ($, on) => {
    const { session, asks } = await setup($ as never, on as never)
    await measure($ as never, reading(83))
    const results = await Promise.all([$.tool.call(agent('a1')), $.tool.call(agent('a2')), $.tool.call(agent('a3'))])
    expect(results.every(isRefused)).toBe(true)
    await questionOpens(session, asks)
    await session.clock.advance(0)
    await flush()
    expect(opens(asks)).toBe(1)
  })

  test('leaving the band clears what was remembered', async ($, on) => {
    const { session, asks } = await setup($ as never, on as never)
    await measure($ as never, reading(83))
    await $.tool.call(agent('a1'))
    await questionOpens(session, asks)
    await session.clock.advance(60_000)
    await flush()
    await measure($ as never, reading(3))
    await measure($ as never, reading(84))
    await $.tool.call(agent('a2'))
    await questionOpens(session, asks, 2)
    expect(opens(asks)).toBe(2)
  })
})

describe('stop and ceiling: refused at once, then the person is asked (015, 017)', () => {
  test('Continue for 30 more minutes raises the ceiling and tells Claude to continue', async ($, on) => {
    const { session, asks } = await setup($ as never, on as never)
    await measure($ as never, reading(89))
    const refused = await $.tool.call(bash())
    expect(textOf(refused)).toContain('(stop): paused until')
    await questionOpens(session, asks)
    const ui = await mountAsk($ as never)
    expect((await ui.find({ key: 'astrolabe-usage-body' }))?.text).toContain('Claude wants to run Bash. What now?')
    await ui.select({ key: 'astrolabe-usage-choice', value: 'extend' })
    await ui.unmount()
    await flush()
    expect(session.submitted[0]).toContain('Continue the work that was paused')
    expect(isRefused(await $.tool.call(bash('b2')))).toBe(false)
    await settleStatus(session)
    expect(session.last()).toContain('5h 89% hold')
  })

  test('Pause until the reset (the default) is remembered: later calls are refused without asking', async ($, on) => {
    const { session, asks } = await setup($ as never, on as never)
    await measure($ as never, reading(89))
    await $.tool.call(bash())
    await questionOpens(session, asks)
    await pickIn($ as never, 'pause')
    const later = await $.tool.call(bash('b2'))
    expect(textOf(later)).toContain('(stop): paused until')
    expect(textOf(later)).not.toContain('The person is being asked')
    expect(opens(asks)).toBe(1)
  })

  test('a running subagent is never asked about, nor stopped', async ($, on) => {
    const { session, asks } = await setup($ as never, on as never)
    await measure($ as never, reading(89))
    expect(isRefused(await $.tool.call({ tool: 'Bash', tool_use_id: 'sb', command: 'npm test', agentId: 'a-1' } as never))).toBe(false)
    await session.clock.advance(0)
    await flush()
    expect(asks.opened).toEqual([])
  })
})

describe('narrow terminal: the engine dialog asks instead (015, 017)', () => {
  test('a dialog answer applies whenever it comes, even after the minute', async ($, on) => {
    const { session, asks } = await setup($ as never, on as never, false)
    await measure($ as never, reading(83))
    expect(textOf(await $.tool.call(agent('a1')))).toContain('queued as q1')
    for (let i = 0; i < 50 && asks.asked.length === 0; i += 1) {
      await session.clock.advance(0)
      await flush()
    }
    expect(asks.asked[0]).toContain('(hold): a new subagent, "job a1". What now?')
    await session.clock.advance(60_000)
    await flush()
    asks.answer('Allow subagents for 1 hour, one at a time')
    await flush()
    await settleStatus(session)
    await until(() => session.last()?.includes('throttle') === true)
    expect(isRefused(await $.tool.call(agent('a2')))).toBe(false)
  })
})

describe('no one asked', () => {
  test('-p or the SDK: refused at once, never asked', async ($, on) => {
    const { session, asks } = await setup($ as never, on as never, true, false)
    await measure($ as never, reading(83))
    expect(textOf(await $.tool.call(agent('a1')))).toContain('queued as q1')
    await measure($ as never, reading(89))
    expect(textOf(await $.tool.call(bash()))).toContain('(stop): paused until')
    await session.clock.advance(0)
    await flush()
    expect(asks.opened).toEqual([])
  })

  test('askOnLimit off: queues and pauses as before', { options: { askOnLimit: false } }, async ($, on) => {
    const { session, asks } = await setup($ as never, on as never)
    await measure($ as never, reading(83))
    expect(textOf(await $.tool.call(agent('a1')))).toContain('queued as q1')
    await measure($ as never, reading(89))
    expect(textOf(await $.tool.call(bash()))).toContain('(stop): paused until')
    await session.clock.advance(0)
    await flush()
    expect(asks.opened).toEqual([])
    expect(asks.asked).toEqual([])
  })
})
