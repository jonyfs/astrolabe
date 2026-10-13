import { describe, expect, test } from 'claude-code/testing'

import { FLAVORS } from '../../hooks/core/theme'
import { scenario as halfDone } from '../fixtures/half-done'
import { scenario as noSpeckit } from '../fixtures/no-speckit'
import { scenario as allDone } from '../fixtures/all-done'
import { scenario as worktree } from '../fixtures/branch-worktree'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'
import { drawBand, installRenderEngine, SURFACES } from '../helpers/render'

// 120 columns is the 100-column tier of board 2: marks only, a 9-cell bar, the task id.
const BAND_002 = ' 002  band-hint  ✓✓✓✓  ▶ implement 9/20  ━━━━━━━━━ │ ▸ T010'
// A terminal draws a link as its text and, without OSC 8, the address after it.
// The open-pane button ends the row (`≡ a`) and is not part of the rail.
const noLinks = (text: string) => text.replace(/file:\/\/\/[^\s✓]*?\.md/g, '').replace(/≡ a$/, '')

const colorsOf = (tree: unknown): string[] => {
  const out: string[] = []
  const walk = (node: unknown) => {
    if (node === null || typeof node !== 'object') return
    const n = node as { props?: { color?: unknown }; children?: unknown[] }
    if (typeof n.props?.color === 'string') out.push(n.props.color)
    for (const child of n.children ?? []) walk(child)
  }
  walk(tree)
  return out
}

describe('the band above the prompt (US1)', () => {
  for (const surface of SURFACES) {
    test(`${surface}: draws the rail and keeps the engine's own tree`, async ($, on) => {
      installTree(on, halfDone.tree, halfDone.cwd)
      installEngine(on)
      installRenderEngine(on)
      await startSession($, halfDone.cwd)
      const drawn = await drawBand($ as never, surface, 120)
      expect(noLinks(drawn.text)).toBe(BAND_002)
      expect(drawn.engineKept).toBe(true)
    })

    test(`${surface}: draws nothing of its own without Spec Kit, without an active feature, or under a survey`, async ($, on) => {
      installTree(on, { ...noSpeckit.tree, ...allDone.tree }, noSpeckit.cwd)
      installEngine(on)
      installRenderEngine(on)
      await startSession($, noSpeckit.cwd)
      const none = await drawBand($ as never, surface)
      expect([none.text, none.engineKept]).toEqual(['', true])
      await startSession($, allDone.cwd)
      expect((await drawBand($ as never, surface)).text).toBe('')
    })

    test(`${surface}: yields to a survey`, async ($, on) => {
      installTree(on, halfDone.tree, halfDone.cwd)
      installEngine(on)
      installRenderEngine(on)
      await startSession($, halfDone.cwd)
      const drawn = await drawBand($ as never, surface, 120, { hasSurvey: true })
      expect([drawn.text, drawn.engineKept]).toEqual(['', true])
    })

    test(`${surface}: drawing reads no file (SC-005)`, async ($, on) => {
      const session = installTree(on, halfDone.tree, halfDone.cwd)
      installEngine(on)
      installRenderEngine(on)
      await startSession($, halfDone.cwd)
      const before = session.counts.read + session.counts.exists + session.counts.list
      await drawBand($ as never, surface, 60)
      expect(session.counts.read + session.counts.exists + session.counts.list).toBe(before)
    })
  }
})

describe('the band always includes next(e) (065 #20, Principle VII)', () => {
  for (const surface of SURFACES) {
    test(`${surface}: the engine's own tree is kept at 80, 100, 144, 180 and 200 columns`, async ($, on) => {
      installTree(on, halfDone.tree, halfDone.cwd)
      installEngine(on)
      installRenderEngine(on)
      await startSession($, halfDone.cwd)
      for (const columns of [80, 100, 144, 180, 200]) {
        const drawn = await drawBand($ as never, surface, columns)
        expect({ columns, kept: drawn.engineKept, drew: drawn.text.includes(' 002 ') }).toEqual({ columns, kept: true, drew: true })
      }
    })
  }
})

describe('presets and flavors (US4)', () => {
  test('minimal draws no band', { options: { preset: 'minimal' } }, async ($, on) => {
    const session = installTree(on, halfDone.tree, halfDone.cwd)
    installEngine(on)
    installRenderEngine(on)
    await startSession($, halfDone.cwd)
    expect((await drawBand($ as never, 'terminal')).text).toBe('')
    expect(session.last()).toBe('◆ 002 impl 45%')
  })

  for (const flavor of ['mocha', 'latte', 'colorblind'] as const) {
    test(`${flavor}: every color comes from its token table`, { options: { flavor } }, async ($, on) => {
      installTree(on, halfDone.tree, halfDone.cwd)
      installEngine(on)
      installRenderEngine(on)
      await startSession($, halfDone.cwd)
      const colors = colorsOf((await drawBand($ as never, 'terminal')).tree)
      // A chip's foreground is the stronger-contrast of two fixed colours (chipForeground).
      const allowed = new Set([...Object.values(FLAVORS[flavor]), '#11111b', '#eff1f5'])
      expect(colors.length > 0).toBe(true)
      expect(colors.filter(c => !allowed.has(c))).toEqual([])
    })
  }
})

describe('the session runs in a linked worktree (054 #54)', () => {
  test('the band names that worktree', async ($, on) => {
    installTree(on, worktree.tree, worktree.cwd)
    installEngine(on)
    installRenderEngine(on)
    await startSession($, worktree.cwd)
    await completeTurn($)
    const band = await drawBand($ as never, 'terminal', 200)
    expect(band.text).toContain('⎇ proj-002')
    const tree = JSON.stringify(band.tree)
    expect(band.text).toContain('+1')
    expect(tree).toContain('astrolabe-other-features')
    expect(tree).toContain('003 spinner-narration')
  })
})
