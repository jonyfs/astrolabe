import { describe, expect, test } from 'claude-code/testing'

import { featureJson, project, RATIFIED, spec } from '../fixtures/build'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'
import { installPaneEngine, installRenderEngine, mountPane } from '../helpers/render'

// Spec 021: time per task, the estimate, the week, and tasks done next to a turn's duration.
const NOW = Date.UTC(2026, 9, 7, 12, 0)
const tasksText = (done: number) =>
  Array.from({ length: 6 }, (_, i) => `- [${i < done ? 'x' : ' '}] T00${i + 1} task ${i + 1}`).join('\n') + '\n'

const setup = async ($: never, on: never) => {
  const tree = project({ constitution: RATIFIED, featureJson: featureJson('specs/002-b'), features: { '002-b': { spec: spec(), plan: true, tasks: tasksText(1) } } })
  const session = installTree(on, tree, '/proj')
  installEngine(on)
  installRenderEngine(on)
  installPaneEngine(on)
  await session.clock.set(NOW)
  await startSession($, '/proj')
  return { session, tree }
}
const turn = ($: never, durationMs: number) =>
  ($ as unknown as { turn: { complete: (e: never) => Promise<unknown> } }).turn.complete({ answer: '', durationMs, isAborted: false, turnId: `t${durationMs}`, reason: 'answer' } as never)

describe('time and history (021)', () => {
  test('a ticked task shows next to its turn; its time, the estimate and the week reach the Dashboard', async ($, on) => {
    const { session, tree } = await setup($ as never, on as never)
    await session.clock.advance(20 * 60_000)
    tree['/proj/specs/002-b/tasks.md'] = tasksText(2)
    await turn($ as never, 61_234)
    const ui = (await ($ as unknown as { ui: { mount: (t: never) => Promise<{ find: (q: { type?: string }) => Promise<{ text: string } | undefined>; drawn: () => Promise<unknown>; unmount: () => Promise<void> }> } }).ui.mount({
      plugin: 'astrolabe', surface: 'terminal', component: 'TurnDuration', props: { word: 'Baked', durationMs: 61_234 },
    } as never))
    expect(JSON.stringify(await ui.drawn())).toContain('Baked · 1 tasks done')
    await ui.unmount()
    expect(session.store.get('history')).toEqual({ '2026-W41': { tasks: 1, features: 0 } })
    const pane = await mountPane($ as never, 'terminal', 80, 60)
    await pane.press('tab-dashboard')
    const body = await pane.body()
    expect(body).toContain('slowest task  T002 · 20m')
    expect(body).toContain('estimate      about 1h20m for 4 open tasks')
    expect(body).toContain('this week     1 tasks, 0 features done')
    await pane.unmount()
  })

  test('a turn that ticked nothing leaves its line alone and writes nothing', async ($, on) => {
    const { session } = await setup($ as never, on as never)
    await turn($ as never, 5_000)
    expect(session.store.get('history')).toBeUndefined()
    await completeTurn($)
  })
})
