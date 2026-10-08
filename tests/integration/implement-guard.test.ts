import { describe, expect, test } from 'claude-code/testing'

import { scenario as clarify } from '../fixtures/clarify-pending'
import { scenario as halfDone } from '../fixtures/half-done'
import { installEngine, installTree, startSession } from '../helpers/fake-fs'

// 054 #57: /speckit-implement is refused once while the spec still asks a question.
const implement = (id: string) => ({ tool: 'Skill', tool_use_id: id, skill: 'speckit-implement' }) as never

describe('implement guard (054 #57)', () => {
  test('the first implement call on a spec with open clarifications is refused with the fix', async ($, on) => {
    installTree(on, structuredClone(clarify.tree), '/proj')
    installEngine(on)
    await startSession($, '/proj')
    const first = (await $.tool.call(implement('s1'))) as { deny?: string }
    expect(first.deny).toBe('Astrolabe: feature 001 auth still has 1 open [NEEDS CLARIFICATION] marker in spec.md. Run /speckit-clarify first. To implement anyway, call /speckit-implement again.')
    const second = (await $.tool.call(implement('s2'))) as { deny?: string }
    expect(second.deny).toBeUndefined()
  })

  test('a spec without open questions is not refused', async ($, on) => {
    installTree(on, structuredClone(halfDone.tree), '/proj')
    installEngine(on)
    await startSession($, '/proj')
    const result = (await $.tool.call(implement('s1'))) as { deny?: string }
    expect(result.deny).toBeUndefined()
  })

  test('other skills pass on a spec with open clarifications', async ($, on) => {
    installTree(on, structuredClone(clarify.tree), '/proj')
    installEngine(on)
    await startSession($, '/proj')
    const result = (await $.tool.call({ tool: 'Skill', tool_use_id: 's1', skill: 'speckit-clarify' } as never)) as { deny?: string }
    expect(result.deny).toBeUndefined()
  })
})
