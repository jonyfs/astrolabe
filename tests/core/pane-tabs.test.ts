import { describe, expect, test } from 'claude-code/testing'

import { badgesOf, legacyTab, legendOf, paneTitle, TABS } from '../../hooks/core/pane-tabs'

describe('five tabs (066 #21)', () => {
  test('Specs, Tasks, Session, PRs and Setup, on 1 to 5', () => {
    expect(TABS.map(t => [t.tab, t.hotkey])).toEqual([['specs', '1'], ['tasks', '2'], ['session', '3'], ['prs', '4'], ['setup', '5']])
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
  test('features in progress, open tasks of the active feature, open pull requests', () => {
    expect(badgesOf({ inProgress: 2, openTasks: 11, pulls: 1, governor: 'ok' })).toEqual({ specs: '2', tasks: '11', prs: '1' })
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
  test('Specs: filter, status, order, priority, advisor, refresh', () => {
    const pairs = legendOf('specs', { wide: true })
    expect(pairs.map(p => p.verb)).toEqual(['filter', 'status', 'order', 'priority', 'advisor', 'refresh'])
    expect(pairs.map(p => p.hotkey)).toEqual(['f', 's', 'o', 'p', 'a', 'r'])
  })
  test('no verb carries a hotkey prefix', () => {
    for (const tab of ['specs', 'tasks', 'session', 'prs', 'setup'] as const) {
      for (const pair of legendOf(tab, { wide: true })) expect(pair.verb).not.toMatch(/^[a-z?/]:|^[a-z] /)
    }
  })
  test('a narrow legend shortens verbs and keeps keys', () => {
    const wide = legendOf('specs', { wide: true })
    const narrow = legendOf('specs', { wide: false })
    expect(narrow.map(p => p.hotkey)).toEqual(wide.map(p => p.hotkey))
    expect(narrow.every((p, i) => [...p.verb].length <= [...wide[i]!.verb].length)).toBe(true)
  })
  test('Tasks and Setup have their own pairs', () => {
    expect(legendOf('tasks', { wide: true }).map(p => p.verb)).toEqual(['filter', 'refresh'])
    expect(legendOf('setup', { wide: true }).map(p => p.verb)).toEqual(['refresh'])
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
