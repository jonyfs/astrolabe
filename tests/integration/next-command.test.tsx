import { describe, expect, test } from 'claude-code/testing'

import { featureJson, project, RATIFIED, spec } from '../fixtures/build'
import { scenario as halfDone } from '../fixtures/half-done'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'
import { drawBand, installRenderEngine } from '../helpers/render'

// Spec 020a: act on the next Spec Kit command (roadmap #13, #14, #40, #45).
const setup = async ($: never, on: never, tree = halfDone.tree) => {
  const session = installTree(on, tree, '/proj')
  installEngine(on)
  const handed = installRenderEngine(on)
  await startSession($, '/proj')
  return { session, handed }
}
type BandUi = { find: (q: { key?: string }) => Promise<{ text: string } | undefined>; press: (q: { key: string }) => Promise<unknown>; unmount: () => Promise<void> }
const mountBand = async ($: never, columns = 120) =>
  (await ($ as unknown as { ui: { mount: (t: never) => Promise<BandUi> } }).ui.mount({
    plugin: 'astrolabe',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: { bodyColumns: columns, hasSurvey: false },
    viewport: { columns, rows: 40, isFullscreen: false },
  } as never)) as BandUi

describe('the next command (020a)', () => {
  test('the band has a button that runs it and one that copies it', async ($, on) => {
    const { session } = await setup($ as never, on as never)
    const ui = await mountBand($ as never)
    expect((await ui.find({ key: 'astrolabe-next' }))?.text).toContain('/speckit-implement')
    await ui.press({ key: 'next-run' })
    expect(session.prompts).toContain('/speckit-implement')
    await ui.press({ key: 'next-copy' })
    expect(session.copied).toEqual(['/speckit-implement'])
    await ui.unmount()
  })

  test('narrow: the copy button goes first, the run button stays', async ($, on) => {
    await setup($ as never, on as never)
    const ui = await mountBand($ as never, 50)
    const row = (await ui.find({ key: 'astrolabe-next' }))?.text ?? ''
    expect(row).toContain('/speckit-implement')
    expect(row).not.toContain('copy')
    await ui.unmount()
  })

  test('/astrolabe next runs it; without a next command it says so', async ($, on) => {
    const { session } = await setup($ as never, on as never)
    const ran = (await $.command.run({ command: 'astrolabe', args: 'next', origin: { kind: 'composer' } } as never)) as { text?: string }
    expect(ran.text).toContain('/speckit-implement')
    // Started from a timer, once /astrolabe itself has answered.
    await session.clock.advance(0)
    expect(session.prompts).toContain('/speckit-implement')
  })

  test('a new next command is proposed in the empty prompt box, once', async ($, on) => {
    const tree = project({ constitution: RATIFIED, featureJson: featureJson('specs/001-a'), features: { '001-a': { spec: spec() } } })
    const { session } = await setup($ as never, on as never, tree)
    expect(session.suggested).toEqual(['/speckit-plan'])
    await completeTurn($)
    expect(session.suggested).toEqual(['/speckit-plan'])
    tree['/proj/specs/001-a/plan.md'] = '# Plan\n'
    await completeTurn($)
    expect(session.suggested).toEqual(['/speckit-plan', '/speckit-tasks'])
  })

  test('minimal draws no next row and proposes nothing', { options: { preset: 'minimal' } }, async ($, on) => {
    const { session, handed } = await setup($ as never, on as never)
    expect(session.suggested).toEqual([])
    void handed
    const drawn = await drawBand($ as never, 'terminal')
    expect(drawn.text).toBe('')
  })
})
