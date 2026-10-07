import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'
import { drawSpinner, installRenderEngine, SURFACES } from '../helpers/render'

const implement = { tool: 'Skill', tool_use_id: 's', skill: 'speckit-implement' } as never
const editActive = { tool: 'Edit', tool_use_id: 'e', file_path: '/proj/specs/002-band-hint/plan.md', old_string: 'a', new_string: 'b' } as never

describe('the spinner narrates the current task (US1)', () => {
  for (const surface of SURFACES) {
    test(`${surface}: after /speckit-implement, until the turn ends`, async ($, on) => {
      const session = installTree(on, halfDone.tree, halfDone.cwd)
      installEngine(on)
      const handed = installRenderEngine(on)
      await startSession($, halfDone.cwd)
      expect(await drawSpinner($ as never, handed, surface)).toBeUndefined()
      await session.clock.advance(125_000)
      await $.tool.call(implement)
      expect(await drawSpinner($ as never, handed, surface)).toBe('… T010 · task 10 · 2m')
      await completeTurn($)
      expect(await drawSpinner($ as never, handed, surface)).toBeUndefined()
    })

    test(`${surface}: an Edit under the active feature counts, and the engine's message wins`, async ($, on) => {
      installTree(on, halfDone.tree, halfDone.cwd)
      installEngine(on)
      const handed = installRenderEngine(on)
      await startSession($, halfDone.cwd)
      await $.tool.call(editActive)
      expect(await drawSpinner($ as never, handed, surface)).toBe('… T010 · task 10 · 0s')
      expect(await drawSpinner($ as never, handed, surface, undefined, 'Compacting')).toBeUndefined()
    })
  }

  test('a narrow terminal shortens the text, never the id', async ($, on) => {
    installTree(on, halfDone.tree, halfDone.cwd)
    installEngine(on)
    const handed = installRenderEngine(on)
    await startSession($, halfDone.cwd)
    await $.tool.call(implement)
    expect(await drawSpinner($ as never, handed, 'terminal', 61)).toBe('… T010 · task 10 · 0s')
    expect(await drawSpinner($ as never, handed, 'terminal', 60)).toBe('… T010 · task… · 0s')
    expect(await drawSpinner($ as never, handed, 'terminal', 58)).toBe('… T010 · tas… · 0s')
    expect(await drawSpinner($ as never, handed, 'terminal', 50)).toBeUndefined()
  })

  test('minimal leaves the spinner alone', { options: { preset: 'minimal' } }, async ($, on) => {
    installTree(on, halfDone.tree, halfDone.cwd)
    installEngine(on)
    const handed = installRenderEngine(on)
    await startSession($, halfDone.cwd)
    await $.tool.call(implement)
    expect(await drawSpinner($ as never, handed, 'terminal')).toBeUndefined()
  })

  test('drawing reads no file (SC-003)', async ($, on) => {
    const session = installTree(on, halfDone.tree, halfDone.cwd)
    installEngine(on)
    const handed = installRenderEngine(on)
    await startSession($, halfDone.cwd)
    await $.tool.call(implement)
    const before = session.counts.read + session.counts.exists + session.counts.list
    await drawSpinner($ as never, handed, 'terminal')
    expect(session.counts.read + session.counts.exists + session.counts.list).toBe(before)
  })
})
