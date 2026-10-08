import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { installEngine, installTree, startSession } from '../helpers/fake-fs'

// Specs 029 and 031: writing-style sections in Claude's system prompt.
const compose = ($: never) =>
  ($ as unknown as { prompt: { compose: (e: never) => Promise<{ sections: Array<{ id: string; text: string; scope: string }> }> } }).prompt.compose({
    model: 'claude-opus-5-5', promptModel: 'claude-opus-5-5', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [],
  } as never)
const setup = async ($: never, on: never) => {
  installTree(on, halfDone.tree, '/proj')
  installEngine(on)
  ;(on as unknown as (event: string, hook: unknown) => void)('prompt.compose', () => ({ sections: [{ id: 'core:identity', text: 'You are Claude.', scope: 'shared' }] }))
  await startSession($, '/proj')
}

describe('writing style (029, 031)', () => {
  test('off by default: the system prompt is untouched', async ($, on) => {
    await setup($ as never, on as never)
    expect((await compose($ as never)).sections.map(s => s.id)).toEqual(['core:identity'])
  })
  test('humanize and terse full add one session section each, last', { options: { humanize: true, terse: 'full' } }, async ($, on) => {
    await setup($ as never, on as never)
    const sections = (await compose($ as never)).sections
    expect(sections.map(s => s.id)).toEqual(['core:identity', 'astrolabe:humanize', 'astrolabe:terse'])
    expect(sections.every(s => s.id === 'core:identity' || s.scope === 'session')).toBe(true)
    expect(sections[1]?.text).toContain('No em dashes')
    expect(sections[2]?.text).toContain('Never drop "not"')
  })
})
