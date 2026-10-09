import { describe, expect, test } from 'claude-code/testing'

import { paneLabelWidth } from '../../hooks/core/i18n'
import { featureJson, project, RATIFIED, spec } from '../fixtures/build'
import { scenario as halfDone } from '../fixtures/half-done'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'
import { installPaneEngine, installRenderEngine, mountPane } from '../helpers/render'

// Spec 018 US3: the Dashboard tab.
const NOW = Date.UTC(2026, 9, 7, 12, 0)
const measure = ($: never, percentUsed: number) =>
  ($ as unknown as { session: { measure: (e: never) => Promise<unknown> } }).session.measure({
    context: { window: 200_000, tokens: 122_000, percent: 61 },
    cost: { usd: 1.2 },
    rateLimits: [{ kind: 'five_hour', percentUsed, resetsAt: new Date(NOW + 2 * 3600_000).toISOString() }],
    changed: ['rateLimits'],
  } as never)

const setup = async ($: never, on: never) => {
  const session = installTree(on, halfDone.tree, '/proj')
  installEngine(on)
  installRenderEngine(on)
  installPaneEngine(on)
  await session.clock.set(NOW)
  await startSession($, '/proj')
  return session
}

const scripted = async ($: never, session: Awaited<ReturnType<typeof setup>>) => {
  for (let i = 0; i < 3; i += 1) {
    await ($ as unknown as { tool: { call: (e: never) => Promise<unknown> } }).tool.call({ tool: 'Read', tool_use_id: `r${i}`, file_path: '/proj/README.md' } as never)
    await session.clock.advance(6 * 60_000)
    await measure($, 40 + i * 5)
    await completeTurn($ as never)
  }
}

describe('the Dashboard tab (018 US3)', () => {
  test('054 #32: records and shows each feature duration from Specify to done', async ($, on) => {
    const tree = project({
      constitution: RATIFIED,
      featureJson: featureJson('specs/001-tracked'),
      features: { '001-tracked': {} },
    })
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    installRenderEngine(on)
    installPaneEngine(on)
    await session.clock.set(NOW)
    await startSession($ as never, '/proj')
    expect(session.store.get('feature-durations:/proj')).toMatchObject({ '001-tracked': { startedAt: NOW } })

    await session.clock.advance(2 * 3_600_000)
    tree['/proj/specs/001-tracked/spec.md'] = spec('track: full')
    tree['/proj/specs/001-tracked/plan.md'] = '# Plan\n'
    tree['/proj/specs/001-tracked/tasks.md'] = '- [x] T001 delivered\n'
    await completeTurn($ as never)

    expect(session.store.get('feature-durations:/proj')).toMatchObject({ '001-tracked': { ms: 2 * 3_600_000 } })
    const ui = await mountPane($ as never, 'terminal', 100, 60)
    await ui.press('tab-dashboard')
    expect(await ui.body()).toContain('spec → done')
    expect(await ui.body()).toContain('001 tracked · 2h00m')
    await ui.unmount()
  })

  test('terminal: the charts are Rasters, the KPIs match the session', async ($, on) => {
    const session = await setup($ as never, on as never)
    await scripted($ as never, session)
    const ui = await mountPane($ as never, 'terminal', 80, 60)
    await ui.press('tab-dashboard')
    const body = await ui.body()
    const gap = (label: string) => ' '.repeat(paneLabelWidth('en') - label.length)
    expect(body).toContain(`turns${gap('turns')}3`)
    // KPI chips first (046 #51).
    expect(body).toContain(' tasks 9/20 │')
    expect(body).toContain('context 61%')
    expect(body).toContain(`tool calls${gap('tool calls')}3`)
    expect(body).toContain('002 band-hint: 9/20 tasks done')
    // The rest is below: the body scrolls under a pinned footer (038).
    expect(body).toMatch(/▼ \d+ more \(j\)/)
    await ui.press('scroll-down')
    const below = await ui.body()
    expect(`${body}${below}`).toContain(`context${gap('context')}61%`)
    expect(`${body}${below}`).toContain('● a reading · │ the climb between readings')
    expect(`${body}${below}`).not.toContain('$1.20')
    expect(below).toContain(`burn rate${gap('burn rate')}50 points an hour`)
    expect(below).toMatch(/▲ \d+ more \(k\)/)
    expect(session.counts.reads.length).toBeGreaterThan(0)
    const reads = session.counts.read
    await ui.press('tab-specs')
    await ui.press('tab-dashboard')
    expect(session.counts.read).toBe(reads)
    await ui.unmount()
  })

  test('ascii: the dial and the chart as text', { options: { icons: 'ascii' } }, async ($, on) => {
    const session = await setup($ as never, on as never)
    await scripted($ as never, session)
    const ui = await mountPane($ as never, 'terminal', 80, 60)
    await ui.press('tab-dashboard')
    const body = await ui.body()
    expect(body).toContain('* implement')
    expect(body).toContain('v plan')
    expect(body).toContain('Current step: implement')
    expect(body).toContain('100%|')
    await ui.unmount()
  })

  test('no reading yet: the chart says so', async ($, on) => {
    await setup($ as never, on as never)
    const ui = await mountPane($ as never, 'desktop', 80, 60)
    await ui.press('tab-dashboard')
    expect(await ui.body()).toContain('No usage reading yet: send a prompt; the reading comes after the turn.')
    await ui.unmount()
  })
})
