import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'

describe('a whole session changes nothing on disk (FR-028, FR-014; 005 FR-002)', () => {
  test('no fs.write, no env.get, and nothing in $.store', async ($, on) => {
    const session = installTree(on, halfDone.tree, halfDone.cwd)
    installEngine(on)
    await startSession($, halfDone.cwd)
    await $.tool.call({ tool: 'Skill', tool_use_id: 's', skill: 'speckit-implement' } as never)
    await $.tool.call({ tool: 'Edit', tool_use_id: 'e', file_path: '/proj/specs/002-band-hint/tasks.md', old_string: 'a', new_string: 'b' } as never)
    await $.tool.call({ tool: 'Write', tool_use_id: 'w', file_path: '/proj/src/x.ts', content: 'x' } as never)
    await completeTurn($)
    expect(session.forbidden).toEqual([])
    expect([...session.store.keys()]).toEqual(['welcomed'])
    expect(session.logs).toEqual([])
  })
})

describe('with phase toasts on (preset full)', () => {
  test('$.store stays empty: the phase baseline lives in the session (013)', { options: { preset: 'full' } }, async ($, on) => {
    const session = installTree(on, halfDone.tree, halfDone.cwd)
    installEngine(on)
    await startSession($, halfDone.cwd)
    await completeTurn($)
    expect(session.forbidden).toEqual([])
    expect([...session.store.keys()]).toEqual(['welcomed'])
  })
})
