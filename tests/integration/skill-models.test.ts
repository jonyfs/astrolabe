import { describe, expect, test } from 'claude-code/testing'

import { skillModelFor } from '../../hooks/core/skill-models'
import { scenario as halfDone } from '../fixtures/half-done'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'

// Spec 030: model and effort per skill.
const step = async ($: never) => {
  const stream = ($ as unknown as { turn: { step: (e: never) => AsyncIterable<unknown> } }).turn.step({ turnId: 't', index: 0, model: 'claude-opus-5-5', effort: 'high', messageCount: 1 } as never)
  for await (const _ of stream) {
    // drain
  }
}
const setup = async ($: never, on: never) => {
  installTree(on, halfDone.tree, '/proj')
  installEngine(on)
  const seen: Array<{ model: string; effort?: unknown }> = []
  ;(on as unknown as (event: string, hook: unknown) => void)('turn.step', async function* (_: unknown, e: { turnId: string; index: number; model: string; effort?: unknown }) {
    seen.push({ model: e.model, effort: e.effort })
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: null }
  })
  await startSession($, '/proj')
  return seen
}

describe('model per skill (030)', () => {
  test('the table knows Spec Kit and gstack skills, with or without a prefix', () => {
    expect(skillModelFor('speckit-tasks')?.model).toBe('claude-sonnet-5-5')
    expect(skillModelFor('gstack:review')?.model).toBe('claude-opus-5-5')
    expect(skillModelFor('speckit.plan')?.effort).toBe('high')
    expect(skillModelFor('unknown-skill')).toBeUndefined()
  })
  test('off by default: the request keeps its model', async ($, on) => {
    const seen = await setup($ as never, on as never)
    await $.tool.call({ tool: 'Skill', tool_use_id: 's1', skill: 'speckit-tasks' } as never)
    await step($ as never)
    expect(seen.at(-1)).toEqual({ model: 'claude-opus-5-5', effort: 'high' })
  })
  test('auto: while speckit-tasks runs, Sonnet at medium; after the turn, the session model', { options: { skillModels: 'auto' } }, async ($, on) => {
    const seen = await setup($ as never, on as never)
    await $.tool.call({ tool: 'Skill', tool_use_id: 's1', skill: 'speckit-tasks' } as never)
    await step($ as never)
    expect(seen.at(-1)).toEqual({ model: 'claude-sonnet-5-5', effort: 'medium' })
    await completeTurn($)
    await step($ as never)
    expect(seen.at(-1)).toEqual({ model: 'claude-opus-5-5', effort: 'high' })
  })
})
