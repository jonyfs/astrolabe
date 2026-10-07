import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'

// Spec 018 US1: the status entry is the footer that replaces the statusline.
const NOW = Date.UTC(2026, 9, 7, 12, 0)
const GIT = 'git status --porcelain=v2 --branch'
const PORCELAIN = '# branch.oid abc1234\n# branch.head main\n# branch.upstream origin/main\n# branch.ab +2 -0\n1 .M N... 1 1 1 a b x.ts\n? y.ts\n'
const measure = ($: never, extra: Record<string, unknown> = {}) =>
  ($ as unknown as { session: { measure: (e: never) => Promise<unknown> } }).session.measure({
    context: { window: 200_000, tokens: 122_000, percent: 61 },
    cost: { usd: 1.2 },
    rateLimits: [{ kind: 'five_hour', percentUsed: 42, resetsAt: new Date(NOW + 2 * 3600_000).toISOString() }],
    changed: ['rateLimits', 'context', 'cost'],
    ...extra,
  } as never)
const step = async ($: never, model: string, effort?: string, agentId?: string) => {
  const stream = ($ as unknown as { turn: { step: (e: never) => AsyncIterable<unknown> } }).turn.step({
    turnId: 't', index: 0, model, ...(effort === undefined ? {} : { effort }), messageCount: 1, ...(agentId === undefined ? {} : { agentId }),
  } as never)
  for await (const _ of stream) {
    // drain
  }
}
const withGit = { ...halfDone.tree, '/proj/.git/HEAD': 'ref: refs/heads/main\n' }

const setup = async ($: never, on: never, tree = halfDone.tree) => {
  const session = installTree(on, tree, '/proj')
  installEngine(on)
  ;(on as unknown as (event: string, hook: unknown) => void)('turn.step', async function* (_: unknown, e: { turnId: string; index: number }) {
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: null }
  })
  await session.clock.set(NOW)
  await startSession($, '/proj')
  return session
}

describe('the footer (018 US1)', () => {
  test('model and effort from the last main request, context and cost from the measure', { options: { icons: 'ascii' } }, async ($, on) => {
    const session = await setup($ as never, on as never)
    await step($ as never, 'claude-opus-5-5', 'high')
    await step($ as never, 'claude-haiku-4-5-20251001', 'low', 'sub-1')
    await measure($ as never)
    await completeTurn($)
    const text = session.last() ?? ''
    expect(text.startsWith('◆ 002 · implement 45% · 5h 42%')).toBe(true)
    expect(text).toContain('ctx 61%')
    expect(text).toContain('opus 5.5 high')
    expect(text).not.toContain('haiku')
    expect(text).toContain('$1.20')
  })

  test('git: one query per main turn, never while drawing; the counts show', { options: { icons: 'ascii' } }, async ($, on) => {
    const session = await setup($ as never, on as never, withGit)
    session.script.processes[GIT] = { stdout: PORCELAIN }
    await completeTurn($)
    expect(session.processes.filter(p => p === GIT).length).toBe(1)
    expect(session.last()).toContain('git:main ^2 ~2')
    await completeTurn($)
    expect(session.processes.filter(p => p === GIT).length).toBe(2)
  })

  test('a failing git leaves the branch read from the files', { options: { icons: 'ascii' } }, async ($, on) => {
    const session = await setup($ as never, on as never, withGit)
    await completeTurn($)
    expect(session.last()).toContain('git:main')
    expect(session.logs).toEqual([])
  })

  test('no git repository: no query and no git part', { options: { icons: 'ascii' } }, async ($, on) => {
    const session = await setup($ as never, on as never)
    await completeTurn($)
    expect(session.processes.filter(p => p.startsWith('git'))).toEqual([])
    expect(session.last()).not.toContain('git:')
  })

  test('the session duration grows', { options: { icons: 'ascii' } }, async ($, on) => {
    const session = await setup($ as never, on as never)
    await session.clock.advance(65 * 60_000)
    await completeTurn($)
    expect(session.last()).toContain('t 1h05m')
  })
})
