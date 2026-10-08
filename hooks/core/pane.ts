// What each tab of the /astrolabe pane says (contracts/pane.md). Pure: no $.
import { t as tr, type Lang } from './i18n'
import { formatElapsed, cleanTaskText } from './spinner'
import { parallelTasks } from './extensions'
import { parseTasks } from './tasks-parser'
import type { ThemeRole } from './theme'
import type { Feature, SessionMemo, SpeckitState } from './types'

export type PaneRow = { key: string; text: string; role: ThemeRole; dim?: boolean }

const BAR_CELLS = 10
const noSpeckit = (lang: Lang): PaneRow => ({ key: 'none', text: tr(lang, 'pane.noSpeckit'), role: 'muted' })

const width = (text: string): number => [...text].length
const cut = (text: string, room: number): string =>
  width(text) <= room ? text : room < 2 ? '' : `${[...text].slice(0, room - 1).join('').trimEnd()}…`

const markOf = (f: Feature): string => (f.phase === 'done' ? '●' : f.phase === 'abandoned' ? '○' : '◐')

const featureRow = (f: Feature, isActive: boolean, columns: number): PaneRow => {
  // Not read yet in a large project (040): a mark and no phase until its batch lands.
  if (f.warnings.includes('loading')) return { key: `feature-${f.id}`, text: `${isActive ? '▸' : ' '} … ${f.id} ${f.name}`, role: 'muted', dim: true }
  const head = `${isActive ? '▸' : ' '} ${markOf(f)} ${f.id} `
  const percent = f.total > 0 ? ` ${Math.floor((f.done * 100) / f.total)}%` : ''
  const filled = f.total > 0 ? Math.floor((f.done * BAR_CELLS) / f.total) : 0
  const bar = f.total > 0 ? `  ${'█'.repeat(filled)}${'░'.repeat(BAR_CELLS - filled)}` : ''
  const role: ThemeRole = isActive ? 'accent' : f.phase === 'done' ? 'done' : f.phase === 'abandoned' ? 'muted' : 'text'
  const dim = f.phase === 'abandoned' ? { dim: true } : {}
  const forms = [`${head}${f.name}  ${f.phase}${bar}${percent}`, `${head}${f.name}  ${f.phase}${percent}`]
  const fitting = forms.find(text => width(text) <= columns)
  if (fitting !== undefined) return { key: `feature-${f.id}`, text: fitting, role, ...dim }
  const tail = `  ${f.phase}${percent}`
  const name = cut(f.name, columns - width(head) - width(tail))
  const text = name === '' ? `${head.trimEnd()}${tail}` : `${head}${name}${tail}`
  return { key: `feature-${f.id}`, text, role, ...dim }
}

const WARNING_TEXT = {
  'feature-json-dangling': 'pane.jsonDangling',
  'feature-json-malformed': 'pane.jsonMalformed',
} as const

export const specsRows = (state: SpeckitState, columns: number, lang: Lang = 'en'): PaneRow[] => {
  if (!state.present) return [noSpeckit(lang)]
  if (state.features.length === 0) return [{ key: 'empty', text: tr(lang, 'pane.noFeatures'), role: 'muted' }]
  const rows = state.features.map(f => featureRow(f, state.active?.dir === f.dir, columns))
  if (state.activeWarning !== undefined) {
    const showing = state.active === undefined ? tr(lang, 'pane.noFeature') : `${state.active.id} (${state.active.source})`
    rows.push({ key: 'warning-active', text: tr(lang, 'pane.showing', { why: tr(lang, WARNING_TEXT[state.activeWarning]), showing }), role: 'current' })
  }
  for (const f of state.features) {
    if (f.warnings.includes('clarification-after-plan')) {
      rows.push({ key: `warning-${f.id}`, text: tr(lang, 'pane.clarifyLeft', { id: f.id }), role: 'current' })
    }
    if (f.clarifications !== undefined && !f.warnings.includes('clarification-after-plan')) {
      rows.push({ key: `questions-${f.id}`, text: tr(lang, 'pane.questions', { id: f.id, n: f.clarifications }), role: 'current' })
    }
    if (f.checklist !== undefined && f.checklist.open > 0 && f.phase !== 'done' && f.phase !== 'abandoned') {
      rows.push({ key: `checklist-${f.id}`, text: tr(lang, 'pane.checklist', { id: f.id, open: f.checklist.open, total: f.checklist.total }), role: 'current' })
    }
    for (const file of ['spec', 'tasks'] as const) {
      if (f.warnings.includes(`unreadable-${file}`)) {
        rows.push({ key: `warning-${f.id}-${file}`, text: tr(lang, 'pane.unreadable', { id: f.id, file: `${file}.md` }), role: 'current' })
      }
    }
  }
  return rows
}

export const taskRows = (state: SpeckitState, memo: SessionMemo, rows: number, columns: number, lang: Lang = 'en'): PaneRow[] => {
  const active = state.active
  if (!state.present) return [noSpeckit(lang)]
  if (active === undefined) return [{ key: 'none', text: tr(lang, 'pane.noActive'), role: 'muted' }]
  const tasks = state.activeTasks ?? parseTasks(memo.files[active.dir]?.tasks ?? '')
  if (tasks.length === 0) return [{ key: 'no-tasks', text: tr(lang, 'pane.noTasks'), role: 'muted' }]
  const open = tasks.filter(t => !t.isDone)
  const out: PaneRow[] = [{ key: 'count', text: tr(lang, 'pane.count', { done: tasks.length - open.length, total: tasks.length }), role: 'muted' }]
  if (open.length === 0) return [...out, { key: 'all-done', text: tr(lang, 'pane.allTicked'), role: 'done' }]
  // A run of [P] tasks at the head can go to subagents at once (020c #19).
  const parallel = parallelTasks(tasks)
  if (parallel.length > 0) out.push({ key: 'parallel', text: tr(lang, 'pane.parallel', { ids: parallel.join(', ') }), role: 'accent' })
  const room = Math.max(1, rows - 1)
  const shown = open.length <= room ? open : open.slice(0, room - 1)
  for (const [index, t] of shown.entries()) {
    const head = t.id === undefined ? '' : `${t.id} `
    out.push({ key: `task-${t.id ?? index}`, text: `${head}${cut(cleanTaskText(t.text), columns - width(head))}`.trimEnd(), role: 'text' })
  }
  if (shown.length < open.length) out.push({ key: 'more', text: tr(lang, 'pane.more', { n: open.length - shown.length }), role: 'muted' })
  return out
}

export const sessionRows = (state: SpeckitState, now: number, lang: Lang = 'en'): PaneRow[] => {
  if (!state.present) {
    const roots = state.otherRoots === undefined ? [] : [{ key: 'session-other-roots', text: `${tr(lang, 'session.otherRoots').padEnd(14)}${state.otherRoots.join(', ')} (/astrolabe root <folder>)`, role: 'text' as const }]
    return [noSpeckit(lang), ...roots]
  }
  const task = state.currentTask
  const none = tr(lang, 'word.none')
  const pairs: Array<[string, string, string]> = [
    ['root', tr(lang, 'session.root'), state.root ?? tr(lang, 'word.unknown')],
    ['constitution', tr(lang, 'session.constitution'), state.constitution],
    ['active', tr(lang, 'session.active'), state.active === undefined ? none : `${state.active.id} ${state.active.name}`],
    ['chosen-by', tr(lang, 'session.chosenBy'), state.active?.source ?? none],
    ['next', tr(lang, 'session.next'), state.nextCommand ?? none],
    ['running', tr(lang, 'session.running'), state.runningSkill?.name ?? none],
    ['analyzed', tr(lang, 'session.analyzed'), state.isAnalyzed ? tr(lang, 'word.yes') : tr(lang, 'word.no')],
    [
      'current-task',
      tr(lang, 'session.currentTask'),
      task === undefined
        ? none
        : `${task.id ?? cleanTaskText(task.text)}${task.startedAt === undefined ? '' : ` · ${formatElapsed(now - task.startedAt)}`}`,
    ],
  ]
  if (state.otherRoots !== undefined) pairs.push(['other-roots', tr(lang, 'session.otherRoots'), `${state.otherRoots.join(', ')} (/astrolabe root <folder>)`])
  if (state.nextHooks !== undefined && state.nextHooks.before.length > 0) pairs.push(['hooks-before', tr(lang, 'session.hooksBefore'), state.nextHooks.before.join(', ')])
  if (state.nextHooks !== undefined && state.nextHooks.after.length > 0) pairs.push(['hooks-after', tr(lang, 'session.hooksAfter'), state.nextHooks.after.join(', ')])
  return pairs.map(([key, label, value]) => ({ key: `session-${key}`, text: `${label.padEnd(14)}${value}`, role: 'text' }))
}

/**
 * A window over units of known height (038): from `offset`, as many units as fit in `room` rows,
 * keeping a row for each arrow that says more is above or below. Never empty while units remain.
 */
export const windowUnits = (heights: readonly number[], offset: number, room: number): { start: number; end: number } => {
  const n = heights.length
  if (heights.reduce((a, b) => a + b, 0) <= room) return { start: 0, end: n }
  const start = Math.max(0, Math.min(n - 1, Math.floor(offset)))
  const space = room - (start > 0 ? 1 : 0)
  let end = start
  let used = 0
  while (end < n) {
    const below = end + 1 < n ? 1 : 0
    if (used + heights[end]! + below > space) break
    used += heights[end]!
    end += 1
  }
  return { start, end: Math.max(end, start + 1) }
}
