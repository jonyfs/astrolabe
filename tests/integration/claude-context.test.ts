import { describe, expect, test } from 'claude-code/testing'

import { featureJson, project, spec, tasks } from '../fixtures/build'
import { scenario as halfDone } from '../fixtures/half-done'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'

// Spec 026: what Claude is told about the Spec Kit work.
const CONSTITUTION = '# Demo Constitution\n\n## Core Principles\n\n### I. Test First\n\nText.\n\n### II. Small Steps\n\nText.\n\n## Governance\n\n### Amendments\n'
const submit = ($: never, text: string) =>
  ($ as unknown as { prompt: { submit: (e: never) => Promise<unknown> } }).prompt.submit({ text, origin: { kind: 'composer' } } as never)

describe('context for Claude (026)', () => {
  test('T001: the active feature rides along with a prompt, once per change', async ($, on) => {
    const session = installTree(on, halfDone.tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    await submit($ as never, 'go on')
    await submit($ as never, 'and again')
    const sent = session.contexts.map(c => c.filter(t => t.startsWith('Astrolabe:')))
    expect(sent[0]).toEqual(['Astrolabe: the active Spec Kit feature is 002 band-hint, phase implement, 9 of 20 tasks done; the current task is T010 task 10; the next command is /speckit-implement.'])
    expect(sent[1]).toEqual([])
  })

  test('T001: claudeContext off sends nothing', { options: { claudeContext: false } }, async ($, on) => {
    const session = installTree(on, halfDone.tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    await submit($ as never, 'go on')
    expect(session.contexts.flat().filter(t => t.startsWith('Astrolabe:'))).toEqual([])
  })

  test('T002: a Spec Kit skill gets the constitution principles as a reminder', async ($, on) => {
    const tree = project({ constitution: CONSTITUTION, featureJson: featureJson('specs/001-a'), features: { '001-a': { spec: spec(), plan: true, tasks: tasks(0, 2) } } })
    installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    const result = (await $.tool.call({ tool: 'Skill', tool_use_id: 's1', skill: 'speckit-implement' } as never)) as { context?: readonly string[] }
    expect(result.context).toContain('Astrolabe: check this step against the constitution (.specify/memory/constitution.md): I. Test First; II. Small Steps.')
    const other = (await $.tool.call({ tool: 'Skill', tool_use_id: 's2', skill: 'humanizer' } as never)) as { context?: readonly string[] }
    expect((other.context ?? []).some(c => c.includes('constitution'))).toBe(false)
  })

  test('T005: /astrolabe ask answers through a fork of the session', async ($, on) => {
    const session = installTree(on, halfDone.tree, '/proj')
    installEngine(on)
    const asked: string[] = []
    on('model.fork', ($, e) => {
      asked.push((e as { prompt: string }).prompt)
      return { value: { isAnswered: true, text: 'T011 comes next; nothing blocks it.' } } as never
    })
    await startSession($, '/proj')
    await completeTurn($)
    const ran = (await $.command.run({ command: 'astrolabe', args: 'ask what is left?' } as never)) as { text?: string }
    expect(ran.text).toBe('🧭 asking about 002 band-hint…')
    await session.clock.advance(1000)
    expect(asked[0]).toContain('what is left?')
    expect(asked[0]).toContain('002 band-hint')
    expect(session.toasts.at(-1)).toBe('🧭 T011 comes next; nothing blocks it.')
  })
})
