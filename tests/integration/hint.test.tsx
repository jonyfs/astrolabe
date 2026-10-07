import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { scenario as noSpeckit } from '../fixtures/no-speckit'
import { scenario as specOnly } from '../fixtures/spec-only'
import { installEngine, installTree, startSession } from '../helpers/fake-fs'
import { drawHint, installRenderEngine, SURFACES } from '../helpers/render'

describe('the prompt hint tail (US3)', () => {
  for (const surface of SURFACES) {
    test(`${surface}: implement names the command and the tasks left`, async ($, on) => {
      installTree(on, halfDone.tree, halfDone.cwd)
      installEngine(on)
      const handed = installRenderEngine(on)
      await startSession($, halfDone.cwd)
      expect(await drawHint($ as never, handed, surface)).toBe('next: /speckit-implement · 11 tasks left')
      expect(await drawHint($ as never, handed, surface, true)).toBeUndefined()
    })
  }
  test('plan phase names /speckit-plan', async ($, on) => {
    installTree(on, specOnly.tree, specOnly.cwd)
    installEngine(on)
    const handed = installRenderEngine(on)
    await startSession($, specOnly.cwd)
    expect(await drawHint($ as never, handed, 'terminal')).toBe('next: /speckit-plan')
  })
  test('no Spec Kit leaves the hint alone', async ($, on) => {
    installTree(on, noSpeckit.tree, noSpeckit.cwd)
    installEngine(on)
    const handed = installRenderEngine(on)
    await startSession($, noSpeckit.cwd)
    expect(await drawHint($ as never, handed, 'terminal')).toBeUndefined()
  })
  test('minimal leaves the hint alone', { options: { preset: 'minimal' } }, async ($, on) => {
    installTree(on, halfDone.tree, halfDone.cwd)
    installEngine(on)
    const handed = installRenderEngine(on)
    await startSession($, halfDone.cwd)
    expect(await drawHint($ as never, handed, 'terminal')).toBeUndefined()
  })
})
