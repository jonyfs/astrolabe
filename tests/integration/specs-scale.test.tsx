import { describe, expect, test } from 'claude-code/testing'

import { featureJson, project, RATIFIED, spec, tasks } from '../fixtures/build'
import { installEngine, installTree, startSession } from '../helpers/fake-fs'
import { installPaneEngine, installRenderEngine, mountPane } from '../helpers/render'

// Spec 067: 60 specs (two blocks; session start reads them all, and the core tests take 140), a
// duplicated id, a done spec with open tasks, a dangling feature.json.
const big = (extra: Record<string, { spec?: string; plan?: boolean; tasks?: string }> = {}, json = featureJson('specs/055-active')) => {
  const features: Record<string, { spec?: string; plan?: boolean; tasks?: string }> = {}
  for (let i = 1; i <= 60; i += 1) {
    const id = String(i).padStart(3, '0')
    features[`${id}-spec-${i}`] =
      i === 55
        ? { spec: spec('status: active'), plan: true, tasks: tasks(2, 4) }
        : i % 25 === 0
          ? { spec: spec('status: active'), plan: true, tasks: tasks(4, 0) }
          : { spec: spec('status: done'), plan: true, tasks: tasks(3, 0) }
  }
  delete features['055-spec-55']
  features['055-active'] = { spec: spec('status: active'), plan: true, tasks: tasks(2, 4) }
  return project({ constitution: RATIFIED, featureJson: json, features: { ...features, ...extra } })
}

const open = async ($: never, on: never, tree = big()) => {
  const session = installTree(on, tree, '/proj')
  installEngine(on)
  installRenderEngine(on)
  installPaneEngine(on)
  await startSession($, '/proj')
  return session
}

describe('the Specs tab at 60 specs (067)', () => {
  test('Focus is the default: a summary, the specs that need you, Done counted per block', async ($, on) => {
    await open($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 80, 40, 60)
    const body = await ui.body()
    expect(body).toContain('60 specs')
    expect(body).toContain('to close')
    expect(body).toContain('Done 57 ▸ 001–050 ')
    expect(body).toContain('055')
    // Ready to close lists the active specs whose tasks are all ticked (067 #32).
    expect(body).toContain('Ready to close 2')
    // 60 rows are not drawn: only the ones that need attention.
    expect((body.match(/spec-\d+/g) ?? []).length).toBeLessThan(10)
    await ui.unmount()
  })

  test('v shows every spec in blocks of 50, folded; the active spec opens its block', async ($, on) => {
    await open($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 80, 40, 60)
    await ui.press('view')
    const body = await ui.body()
    expect(body).toContain('001–050')
    expect(body).toContain('051–100')
    // The block that holds the active spec is open; the other is folded.
    expect(body).toMatch(/▾ 051–100/)
    expect(body).toMatch(/▸ 001–050/)
    expect(body).toContain('055')
    await ui.unmount()
  })

  test('a duplicated id keeps both folders, marked, and the checks row says so', async ($, on) => {
    const tree = big({ '029-twin': { spec: spec('status: done'), plan: true, tasks: tasks(3, 0) }, '028-late': { spec: spec('status: done'), plan: true, tasks: tasks(1, 29) } })
    await open($ as never, on as never, tree)
    const ui = await mountPane($ as never, 'terminal', 100, 40, 400)
    await ui.press('view')
    await ui.press('block-001–050')
    const body = await ui.body()
    expect(body).toContain('▲')
    expect(body).toContain('id×2')
    expect(body).toMatch(/028 done with 1\/30 ticked/)
    // Both ids are used twice: the line says so once for the pair.
    expect(body).toMatch(/ids 028 and 029 used twice/)
    await ui.unmount()
  })

  test('a dangling feature.json is a check', async ($, on) => {
    const small = project({ constitution: RATIFIED, featureJson: featureJson('specs/999-gone'), features: { '001-a': { spec: spec('status: done'), plan: true, tasks: tasks(2, 0) }, '002-b': { spec: spec(), plan: true, tasks: tasks(1, 2) } } })
    await open($ as never, on as never, small)
    const ui = await mountPane($ as never, 'terminal', 100, 40, 40)
    expect(await ui.body()).toContain('feature.json names a folder that is not there')
    await ui.unmount()
  })

  test('drawing reads no file (Principle XII)', async ($, on) => {
    const session = await open($ as never, on as never)
    // The first draw reads docs/roadmap.md once (044 #40) and caches it; the rest reads nothing.
    const first = await mountPane($ as never, 'terminal', 80)
    await first.body()
    await first.unmount()
    const reads = session.counts.read + session.counts.exists + session.counts.list
    const ui = await mountPane($ as never, 'terminal', 80)
    await ui.body()
    await ui.press('view')
    await ui.body()
    await ui.unmount()
    expect(session.counts.read + session.counts.exists + session.counts.list).toBe(reads)
  })

  test('a # jump opens the block of the id and selects it', async ($, on) => {
    await open($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 40, 60)
    await ui.input({ key: 'astrolabe-filter', text: '#05', kind: 'change' })
    expect(await ui.body()).toContain('# 05 → 050')
    await ui.input({ key: 'astrolabe-filter', text: '#05', kind: 'submit' })
    const body = await ui.body()
    expect(body).toMatch(/▾ 001–050/)
    expect(body).toContain('050')
    await ui.unmount()
  })
})

describe('closing a spec (067 #32)', () => {
  test('the selected spec has a close button that suggests the front-matter edit', async ($, on) => {
    const tree = project({
      constitution: RATIFIED,
      featureJson: featureJson('specs/007-ready'),
      features: { '007-ready': { spec: spec('status: active'), plan: true, tasks: tasks(4, 0) } },
    })
    const session = await open($ as never, on as never, tree)
    const ui = await mountPane($ as never, 'terminal', 100, 40, 40)
    await ui.press('close-spec')
    expect(session.suggested.at(-1)).toBe('Set `status: done` in the front matter of specs/007-ready/spec.md (every task of 007 is ticked).')
    await ui.unmount()
  })
})
