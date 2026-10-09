import { describe, expect, test } from 'claude-code/testing'

import { featureJson, project, RATIFIED, spec, tasks } from '../fixtures/build'
import { scenario as halfDone } from '../fixtures/half-done'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'
import { installPaneEngine, installRenderEngine, mountPane } from '../helpers/render'

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

  test('054 #93: a drift alarm is included in Claude context once, after the task is marked done', async ($, on) => {
    const tree = project({
      constitution: RATIFIED,
      featureJson: featureJson('specs/001-a'),
      features: { '001-a': { spec: spec(), plan: true, tasks: '- [ ] T001 Write the parser\n- [ ] T002 Add tests\n' } },
    })
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    tree['/proj/specs/001-a/tasks.md'] = '- [x] T001 Write the parser\n- [ ] T002 Add tests\n'
    await $.tool.call({
      tool: 'Edit',
      tool_use_id: 'tick',
      file_path: '/proj/specs/001-a/tasks.md',
      old_string: '- [ ] T001 Write the parser',
      new_string: '- [x] T001 Write the parser',
    } as never)
    await completeTurn($)
    await submit($ as never, 'continue')
    const driftContext = session.contexts.flat().find(text => text.includes('tasks.md and code may have drifted'))
    expect(driftContext).toContain('T001 in 001-a was marked done without matching code edits')
    await submit($ as never, 'continue again')
    expect(session.contexts.flat().filter(text => text.includes('tasks.md and code may have drifted'))).toHaveLength(1)
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

  test('052 #44: long toast text is bounded and its full text is in the Session tab', async ($, on) => {
    const session = installTree(on, halfDone.tree, '/proj')
    installEngine(on)
    installRenderEngine(on)
    installPaneEngine(on)
    const answer = 'T011 comes next; nothing blocks it. '.repeat(5)
    on('model.fork', () => ({ value: { isAnswered: true, text: answer } }) as never)
    await startSession($, '/proj')
    await completeTurn($)
    await $.command.run({ command: 'astrolabe', args: 'ask what is left?' } as never)
    await session.clock.advance(1000)
    const toast = session.toasts.at(-1) ?? ''
    expect(toast.startsWith('🧭 ')).toBe(true)
    expect(toast.length < 120).toBe(true)
    expect(toast).toContain('full text in /astrolabe → Session')
    const pane = await mountPane($ as never, 'terminal')
    await pane.press('tab-session')
    expect(await pane.body()).toContain(`🧭 ${answer.trim()}`)
    await pane.unmount()
  })
})

describe('a summary when a feature finishes (026 #53)', () => {
  test('featureSummary on: one haiku call, a toast, the Session tab row', { options: { featureSummary: true } }, async ($, on) => {
    const tree = project({ constitution: RATIFIED, featureJson: featureJson('specs/001-a'), features: { '001-a': { spec: spec(), plan: true, tasks: tasks(1, 1) } } })
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    const asked: string[] = []
    on('model.complete', ($, e) => {
      asked.push((e as { model: string }).model)
      return { value: { isAnswered: true, text: 'Delivers a. Nothing open.' } } as never
    })
    await startSession($, '/proj')
    tree['/proj/specs/001-a/tasks.md'] = tasks(2, 0)
    await completeTurn($)
    await session.clock.advance(1000)
    expect(asked).toEqual(['haiku'])
    expect(session.toasts.at(-1)).toBe('🧭 001 a is done: its summary is in the Session tab of /astrolabe')
    expect((session.store.get('summaries') as Record<string, string>)['001-a']).toBe('Delivers a. Nothing open.')
  })
  test('off by default: no model call', async ($, on) => {
    const tree = project({ constitution: RATIFIED, featureJson: featureJson('specs/001-a'), features: { '001-a': { spec: spec(), plan: true, tasks: tasks(1, 1) } } })
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    let calls = 0
    on('model.complete', () => {
      calls += 1
      return { value: { isAnswered: true, text: 'x' } } as never
    })
    await startSession($, '/proj')
    tree['/proj/specs/001-a/tasks.md'] = tasks(2, 0)
    await completeTurn($)
    await session.clock.advance(1000)
    expect(calls).toBe(0)
  })
})

describe('a prompt naming another feature (054 #91)', () => {
  test('Claude is told which feature is active', async ($, on) => {
    const tree: Record<string, string> = project({ constitution: RATIFIED, featureJson: featureJson('specs/002-b'), features: { '001-a': { spec: spec(), plan: true, tasks: tasks(2, 2) }, '002-b': { spec: spec(), plan: true, tasks: tasks(2, 0) } } })
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($ as never, '/proj')
    await $.prompt.submit({ text: 'fix the bug in 001', origin: { kind: 'composer' } } as never)
    expect(session.contexts.flat().some(c => c.includes('this prompt names feature 001 a, but the active one is 002 b'))).toBe(true)
  })
})
