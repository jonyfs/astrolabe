// What each tab of the /astrolabe pane says (contracts/pane.md). Pure: no $.
import { formatElapsed, cleanTaskText } from './spinner'
import { parseTasks } from './tasks-parser'
import type { ThemeRole } from './theme'
import type { Feature, SessionMemo, SpeckitState } from './types'

export type PaneRow = { key: string; text: string; role: ThemeRole; dim?: boolean }

const BAR_CELLS = 10
const NO_SPECKIT: PaneRow = { key: 'none', text: 'This project does not use Spec Kit.', role: 'muted' }

const width = (text: string): number => [...text].length
const cut = (text: string, room: number): string =>
  width(text) <= room ? text : room < 2 ? '' : `${[...text].slice(0, room - 1).join('').trimEnd()}…`

const markOf = (f: Feature): string => (f.phase === 'done' ? '●' : f.phase === 'abandoned' ? '○' : '◐')

const featureRow = (f: Feature, isActive: boolean, columns: number): PaneRow => {
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
  'feature-json-dangling': '.specify/feature.json points at a missing folder',
  'feature-json-malformed': '.specify/feature.json is not valid JSON',
} as const

export const specsRows = (state: SpeckitState, columns: number): PaneRow[] => {
  if (!state.present) return [NO_SPECKIT]
  if (state.features.length === 0) return [{ key: 'empty', text: 'No features yet. Run /speckit-specify.', role: 'muted' }]
  const rows = state.features.map(f => featureRow(f, state.active?.dir === f.dir, columns))
  if (state.activeWarning !== undefined) {
    const showing = state.active === undefined ? 'no feature' : `${state.active.id} (${state.active.source})`
    rows.push({ key: 'warning-active', text: `~ ${WARNING_TEXT[state.activeWarning]}; showing ${showing}`, role: 'current' })
  }
  for (const f of state.features) {
    if (f.warnings.includes('clarification-after-plan')) {
      rows.push({ key: `warning-${f.id}`, text: `! ${f.id}: [NEEDS CLARIFICATION] left after the plan`, role: 'current' })
    }
  }
  return rows
}

export const taskRows = (state: SpeckitState, memo: SessionMemo, rows: number, columns: number): PaneRow[] => {
  const active = state.active
  if (!state.present) return [NO_SPECKIT]
  if (active === undefined) return [{ key: 'none', text: 'No active feature.', role: 'muted' }]
  const tasks = state.activeTasks ?? parseTasks(memo.files[active.dir]?.tasks ?? '')
  if (tasks.length === 0) return [{ key: 'no-tasks', text: 'No tasks yet: this feature has no tasks.md, or it lists none.', role: 'muted' }]
  const open = tasks.filter(t => !t.isDone)
  const out: PaneRow[] = [{ key: 'count', text: `${tasks.length - open.length}/${tasks.length} done`, role: 'muted' }]
  if (open.length === 0) return [...out, { key: 'all-done', text: 'All tasks are ticked.', role: 'done' }]
  const room = Math.max(1, rows - 1)
  const shown = open.length <= room ? open : open.slice(0, room - 1)
  for (const [index, t] of shown.entries()) {
    const head = t.id === undefined ? '' : `${t.id} `
    out.push({ key: `task-${t.id ?? index}`, text: `${head}${cut(cleanTaskText(t.text), columns - width(head))}`.trimEnd(), role: 'text' })
  }
  if (shown.length < open.length) out.push({ key: 'more', text: `+${open.length - shown.length} more`, role: 'muted' })
  return out
}

export const sessionRows = (state: SpeckitState, now: number): PaneRow[] => {
  if (!state.present) return [NO_SPECKIT]
  const task = state.currentTask
  const pairs: Array<[string, string]> = [
    ['root', state.root ?? 'unknown'],
    ['constitution', state.constitution],
    ['active', state.active === undefined ? 'none' : `${state.active.id} ${state.active.name}`],
    ['chosen by', state.active?.source ?? 'none'],
    ['next', state.nextCommand ?? 'none'],
    ['running', state.runningSkill?.name ?? 'none'],
    ['analyzed', state.isAnalyzed ? 'yes' : 'no'],
    [
      'current task',
      task === undefined
        ? 'none'
        : `${task.id ?? cleanTaskText(task.text)}${task.startedAt === undefined ? '' : ` · ${formatElapsed(now - task.startedAt)}`}`,
    ],
  ]
  return pairs.map(([label, value]) => ({ key: `session-${label.replace(' ', '-')}`, text: `${label.padEnd(14)}${value}`, role: 'text' }))
}
