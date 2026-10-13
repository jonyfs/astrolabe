import { describe, expect, test } from 'claude-code/testing'

import { badgesOf, escapeStep, legacyTab, legendOf, paneTitle, TABS } from '../../hooks/core/pane-tabs'

describe('four tabs (066 #21, 078 FR-001)', () => {
  test('Specs, Session, PRs and Setup, on 1 to 4: the digits follow the tab order', () => {
    expect(TABS.map(t => [t.tab, t.hotkey])).toEqual([['specs', '1'], ['session', '2'], ['prs', '3'], ['setup', '4']])
  })

  test('a stored Tasks tab opens Specs, where the tasks are now', () => {
    expect(legacyTab('tasks')).toBe('specs')
  })

  test('a stored tab of the old eight maps to its new tab', () => {
    expect(legacyTab('dashboard')).toBe('session')
    expect(legacyTab('config')).toBe('setup')
    expect(legacyTab('models')).toBe('setup')
    expect(legacyTab('help')).toBe('specs')
    expect(legacyTab('prs')).toBe('prs')
    expect(legacyTab('session')).toBe('session')
    expect(legacyTab('nonsense')).toBe('specs')
    expect(legacyTab(undefined)).toBe('specs')
  })
})

describe('badges count what needs the person (066 #23)', () => {
  test('no badge when nothing waits', () => {
    expect(badgesOf({ inProgress: 0, openTasks: 0, pulls: 0, governor: 'ok' })).toEqual({})
    expect(badgesOf({ governor: 'throttle' })).toEqual({})
  })
  test('one badge for specs in progress and the open tasks of the active spec, and open pull requests (078 FR-014)', () => {
    expect(badgesOf({ inProgress: 2, openTasks: 11, pulls: 1, governor: 'ok' })).toEqual({ specs: '2·11', prs: '1' })
    expect(badgesOf({ inProgress: 2, openTasks: 0 })).toEqual({ specs: '2' })
    expect(badgesOf({ inProgress: 0, openTasks: 4 })).toEqual({ specs: '4' })
  })
  test('Session shows ▲ only while the governor holds or pauses, never a total', () => {
    expect(badgesOf({ governor: 'hold' })).toEqual({ session: '▲' })
    expect(badgesOf({ governor: 'stop' })).toEqual({ session: '▲' })
    expect(badgesOf({ governor: 'ceiling' })).toEqual({ session: '▲' })
    expect(Object.values(badgesOf({ inProgress: 3, openTasks: 4, pulls: 5, governor: 'hold' }))).not.toContain('12')
  })
  test('a PR count of undefined (not read yet) shows nothing', () => {
    expect(badgesOf({ pulls: undefined })).toEqual({})
  })
})

describe('the legend row holds key-verb pairs (066 #22)', () => {
  test('Specs names six keys: filter, tasks only, status, order, open all, refresh (078 FR-015)', () => {
    const pairs = legendOf('specs', { wide: true })
    expect(pairs.map(p => p.verb)).toEqual(['filter', 'tasks only', 'status', 'order', 'open all', 'refresh'])
    expect(pairs.map(p => p.hotkey)).toEqual(['f', 't', 's', 'o', 'e', 'r'])
  })
  test('no tab names more than six keys', () => {
    for (const tab of ['specs', 'session', 'prs', 'setup'] as const) expect(legendOf(tab, { wide: true }).length).toBeLessThanOrEqual(6)
  })
  test('no verb carries a hotkey prefix', () => {
    for (const tab of ['specs', 'session', 'prs', 'setup'] as const) {
      for (const pair of legendOf(tab, { wide: true })) expect(pair.verb).not.toMatch(/^[a-z?/]:|^[a-z] /)
    }
  })
  test('a narrow legend shortens verbs and keeps keys', () => {
    const wide = legendOf('specs', { wide: true })
    const narrow = legendOf('specs', { wide: false })
    expect(narrow.map(p => p.hotkey)).toEqual(wide.map(p => p.hotkey))
    expect(narrow.every((p, i) => [...p.verb].length <= [...wide[i]!.verb].length)).toBe(true)
  })
  test('Setup, Session and PRs have their own pairs', () => {
    expect(legendOf('setup', { wide: true }).map(p => p.verb)).toEqual(['filter', 'refresh'])
    expect(legendOf('session', { wide: true }).map(p => p.verb)).toEqual(['copy kpis', 'refresh'])
    expect(legendOf('prs', { wide: true }).map(p => p.verb)).toEqual(['refresh'])
  })
})

describe('the pane title says why the spec is active (066 #30)', () => {
  const active = (source: 'feature.json' | 'branch' | 'latest', over: Record<string, unknown> = {}) =>
    ({ present: true, constitution: 'ratified', features: [], isAnalyzed: false, active: { dir: '002-band-hint', id: '002', name: 'band-hint', source }, ...over }) as never

  test('feature.json, the branch, or the highest open spec', () => {
    expect(paneTitle(active('feature.json'))).toBe('🧭 Astrolabe · ◆ 002 band-hint · feature.json')
    expect(paneTitle(active('branch'))).toBe('🧭 Astrolabe · ◆ 002 band-hint · branch')
    expect(paneTitle(active('latest'))).toBe('🧭 Astrolabe · ◆ 002 band-hint · highest open spec')
  })
  test('a guessed feature keeps the ~', () => {
    expect(paneTitle(active('latest', { activeWarning: 'feature-json-dangling' }))).toBe('🧭 Astrolabe · ◆ ~002 band-hint · highest open spec')
  })
  test('without an active feature the title is the name alone', () => {
    expect(paneTitle({ present: true, constitution: 'ratified', features: [], isAnalyzed: false } as never)).toBe('🧭 Astrolabe')
  })
})

describe('Esc is layered (078 FR-018)', () => {
  test('the help overlay goes first, then the filter, then the pane closes', () => {
    expect(escapeStep({ help: true, filter: 'cart' })).toBe('help')
    expect(escapeStep({ filter: 'cart' })).toBe('filter')
    expect(escapeStep({ filter: '   ' })).toBe('close')
    expect(escapeStep({})).toBe('close')
  })
})
