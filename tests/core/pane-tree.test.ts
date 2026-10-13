import { describe, expect, test } from 'claude-code/testing'

import { gateDots, sectionBar, specsRows } from '../../hooks/core/pane'
import { allToggled, breadcrumb, doTaskSuggestion, foldGlyph, isOpen, questionSuggestion, questionsIn, spaced, tickSuggestion, toggled, withChildren } from '../../hooks/core/pane-tree'
import { pullsBySpec, specOfBranch } from '../../hooks/core/pulls'
import { nextLevelText, projectHeader } from '../../hooks/core/session-usage'
import { changedSettingsJson, LOOK_PRESETS, optionConflicts, presetMatching } from '../../hooks/core/setup-extras'
import { familyOf, skillModelFor, withOverride, SKILL_MODELS } from '../../hooks/core/skill-models'
import { liveTextRows, layoutLive } from '../../hooks/core/live-table'
import type { Feature, SpeckitState } from '../../hooks/core/types'

const f = (id: string, name: string, phase: Feature['phase'], done: number, total: number, extra: Partial<Feature> = {}): Feature => ({ id, name, dir: `${id}-${name}`, phase, done, total, warnings: [], ...extra })

describe('folds (078 FR-003, FR-004, FR-009)', () => {
  test('the active spec is open unless it was folded; others open only when opened', () => {
    expect(isOpen('002-a', '002-a', {})).toBe(true)
    expect(isOpen('002-a', '002-a', { closed: ['002-a'] })).toBe(false)
    expect(isOpen('003-b', '002-a', {})).toBe(false)
    expect(isOpen('003-b', '002-a', { opened: ['003-b'] })).toBe(true)
  })
  test('toggling flips the state and keeps the lists apart', () => {
    const first = toggled('003-b', '002-a', {})
    expect(first).toEqual({ opened: ['003-b'], closed: [] })
    expect(toggled('003-b', '002-a', first)).toEqual({ opened: [], closed: ['003-b'] })
    expect(toggled('002-a', '002-a', {})).toEqual({ opened: [], closed: ['002-a'] })
  })
  test('open all, then fold all but the active one', () => {
    const dirs = ['001-x', '002-a', '003-b']
    const all = allToggled(dirs, '002-a', {})
    expect(all).toEqual({ opened: dirs, closed: [] })
    expect(allToggled(dirs, '002-a', all)).toEqual({ opened: [], closed: ['001-x', '003-b'] })
  })
  test('the glyph is ▾ open and ▸ folded', () => {
    expect([foldGlyph(true), foldGlyph(false)]).toEqual(['▾', '▸'])
  })
})

describe('the tree around the rows (078 FR-002, FR-096)', () => {
  const rows = [
    { key: 'section-active', text: 'Active 1', role: 'muted' as const },
    { key: 'feature-002', text: '▾ ◆ 002 a', role: 'accent' as const },
    { key: 'feature-003', text: '▸ · 003 b', role: 'text' as const },
  ]
  const features = [f('002', 'a', 'implement', 1, 2), f('003', 'b', 'plan', 0, 0)]
  test('an open spec gets its children right under its row', () => {
    const out = withChildren(rows, features, x => x.id === '002', x => [{ key: `kid-${x.id}`, text: '    ○ T001', role: 'text' }])
    expect(out.map(r => r.key)).toEqual(['section-active', 'feature-002', 'kid-002', 'feature-003'])
  })
  test('a roomy list leaves a blank row before a spec that follows another row, not under a heading', () => {
    expect(spaced(rows).map(r => r.key)).toEqual(['section-active', 'feature-002', 'gap-feature-003', 'feature-003'])
  })
})

describe('questions and suggestions (078 FR-008, FR-045)', () => {
  test('the open questions of a spec', () => {
    expect(questionsIn('# S\n[NEEDS CLARIFICATION: which login?]\ntext [NEEDS CLARIFICATION: how long]\n')).toEqual(['which login?', 'how long'])
    expect(questionsIn(undefined)).toEqual([])
  })
  test('the tick goes to the prompt box for Claude, with the file and the line', () => {
    expect(tickSuggestion({ dir: '002-a' }, { id: 'T011', line: 12, text: 'Show it' })).toBe('Tick T011 in specs/002-a/tasks.md (line 12): Show it')
    expect(doTaskSuggestion({ dir: '002-a' }, { id: 'T011', text: 'Show it' })).toBe('Implement T011 of specs/002-a/tasks.md: Show it')
    expect(questionSuggestion('002-a\nwhich login?')).toContain('specs/002-a/spec.md')
  })
  test('the breadcrumb follows the selected row', () => {
    expect(breadcrumb({ spec: '002', story: 'US2', task: 'T012' })).toBe('Specs › 002 › US2 › T012')
    expect(breadcrumb({ spec: '002' })).toBe('Specs › 002')
  })
})

describe('gates and section bars (078 FR-027, FR-031)', () => {
  test('five dots, then the gates that are not passed by name', () => {
    const state = { constitution: 'ratified' as const, isAnalyzed: false }
    expect(gateDots(state, { clarifications: 2, checklist: { open: 1, total: 3 }, total: 4, warnings: [] })).toBe('  gates ●○○●○ · clarify ✗2 · checklist ✗1 · analyze –')
    expect(gateDots({ ...state, isAnalyzed: true }, { total: 4, warnings: [] })).toBe('  gates ●●○●● · checklist –')
  })
  test('a section bar needs two specs and counts states', () => {
    const list = [f('001', 'a', 'done', 3, 3), f('002', 'b', 'implement', 1, 4), f('003', 'c', 'plan', 0, 0), f('004', 'd', 'plan', 0, 0)]
    expect(sectionBar([list[0]!], undefined)).toBe('')
    expect(sectionBar(list, undefined)).toHaveLength(8)
    expect(sectionBar(list, undefined)).toMatch(/^█{2}/)
  })
  test('a spec with a pull request carries PR #n and its checks', () => {
    const st: SpeckitState = { present: true, root: '/p', constitution: 'ratified', features: [f('002', 'a', 'implement', 1, 4)], isAnalyzed: false, active: { dir: '002-a', id: '002', name: 'a', source: 'feature.json' } }
    const rows = specsRows(st, 120, 'en', {}, {}, false, [], false, 'status', undefined, { pulls: { '002-a': { number: 41, checks: 'pass' } } })
    expect(rows.find(r => r.key === 'feature-002')?.text).toContain('PR #41 ✓')
  })
  test('a branch belongs to the spec whose folder or id it starts with', () => {
    const features = [{ id: '002', dir: '002-cart' }, { id: '003', dir: '003-order' }]
    expect(specOfBranch('002-cart', features)).toBe('002-cart')
    expect(specOfBranch('feature/003-order', features)).toBe('003-order')
    expect(specOfBranch('main', features)).toBeUndefined()
    expect(pullsBySpec([{ number: 41, branch: '002-cart', checks: 'fail' }, { number: 42, branch: '002-cart', checks: 'pass' }], features)).toEqual({ '002-cart': { number: 41, checks: 'fail' } })
  })
})

describe('the Session tab (078 FR-049, FR-050)', () => {
  test('the next level above the deciding window', () => {
    expect(nextLevelText(50)).toBe('throttle at 60% (10 points away)')
    expect(nextLevelText(85)).toBe('stop at 88% (3 points away)')
    expect(nextLevelText(95)).toBeUndefined()
  })
  test('the project is a header: root with branch, constitution with the active spec, one now row', () => {
    const rows = [
      { key: 'session-root', text: 'root          /p', role: 'text', label: 'root          ', value: '/p' },
      { key: 'session-constitution', text: 'constitution  ✓ ratified', role: 'text', label: 'constitution  ', value: '✓ ratified · active by feature.json' },
      { key: 'session-active', text: 'active        002 a', role: 'text', label: 'active        ', value: '002 a' },
      { key: 'session-next', text: 'next          /speckit-plan', role: 'text', label: 'next          ', value: '/speckit-plan' },
      { key: 'session-running', text: 'running       none', role: 'text', label: 'running       ', value: 'none' },
    ]
    const out = projectHeader(rows, { now: 'now', labelWidth: 14, branch: 'main' })
    expect(out.map(r => r.key)).toEqual(['session-root', 'session-constitution', 'session-now'])
    expect(out[0]?.value).toBe('/p · ⎇ main')
    expect(out[1]?.value).toBe('✓ ratified · active by feature.json · 002 a')
    expect(out[2]?.value).toBe('next /speckit-plan · running none')
  })
  test('the live table as text rows, with a header', () => {
    const layout = layoutLive({ rows: [{ kind: 'agent', who: 'a1', where: 'src', what: 'edit x', now: '1m', size: '', time: '', nowWarn: false } as never], columns: 100, reservation: {}, all: true })
    const text = liveTextRows(layout)
    expect(text[0]?.key).toBe('live-header')
    expect(text[1]?.text.startsWith('◇ a1')).toBe(true)
  })
})

describe('Setup (078 FR-075, FR-077, FR-081, FR-082)', () => {
  test('a preset sets the look options and is recognised again', () => {
    expect(presetMatching({ ...LOOK_PRESETS.minimal })).toBe('minimal')
    expect(presetMatching({ ...LOOK_PRESETS.full, footerLines: '1' })).toBeUndefined()
  })
  test('options that cancel each other are named on the row they do nothing for', () => {
    const names = optionConflicts({ footerIn: 'status', footerSource: 'statusline', footerLines: '3', preset: 'minimal', bandDensity: 'full', accessible: true, images: 'on' }).map(c => c.field)
    expect(names).toEqual(['footerSource', 'footerLines', 'bandDensity', 'images'])
    expect(optionConflicts({ footerIn: 'pane', footerSource: 'statusline' })).toEqual([])
  })
  test('the changed options as JSON for another machine', () => {
    expect(JSON.parse(changedSettingsJson({ 'astrolabe.preset': 'full', 'astrolabe.checkUpdates': false }))).toEqual({ preset: 'full', checkUpdates: false })
  })
  test('a skill keeps the family and effort the person chose, over the built-in table', () => {
    expect(familyOf(SKILL_MODELS['speckit-plan']!.model)).toBe('opus')
    const changed = skillModelFor('speckit-plan', { 'speckit-plan': { model: 'haiku', effort: 'low' } })
    expect(familyOf(changed!.model)).toBe('haiku')
    expect(changed?.effort).toBe('low')
    expect(withOverride('speckit-plan', undefined, {})).toBeUndefined()
    expect(skillModelFor('gstack:review')?.effort).toBe('high')
  })
})
