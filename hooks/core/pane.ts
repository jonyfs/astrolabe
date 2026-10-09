// What each tab of the /astrolabe pane says (contracts/pane.md). Pure: no $.
import { t as tr, type Lang, type TextKey } from './i18n'
import { formatElapsed, cleanTaskText } from './spinner'
import { parallelTasks } from './extensions'
import { fileUrl } from './paths'
import { byPriority, priorityMark, type Priorities, type Priority } from './spec-actions'
import { parseTasks } from './tasks-parser'
import { STATUS_ROLE, type ThemeRole } from './theme'
import type { Feature, SessionMemo, SpeckitState } from './types'

/** A row; `segments`, when given, colour parts of `text` (which stays their join) (052 #12). */
export type PaneRow = { key: string; text: string; role: ThemeRole; dim?: boolean; bold?: boolean; selected?: boolean; label?: string; value?: string; action?: { id: string; label: string; hotkey: string; kind?: 'allow' | 'revoke' }; href?: string; links?: ReadonlyArray<{ label: string; href: string }>; segments?: ReadonlyArray<{ text: string; role: ThemeRole }> }

const BAR_CELLS = 10
const noSpeckit = (lang: Lang): PaneRow => ({ key: 'none', text: tr(lang, 'pane.noSpeckit'), role: 'muted' })

const width = (text: string): number => [...text].length
const cut = (text: string, room: number): string =>
  width(text) <= room ? text : room < 2 ? '' : `${[...text].slice(0, room - 1).join('').trimEnd()}…`

const markOf = (f: Feature): string => (f.phase === 'done' ? '●' : f.phase === 'abandoned' ? '○' : '◐')

/** What a row shows besides the feature: the name column's width and the skill running on it (044). */
type RowContext = { nameWidth: number; countWidth: number; idWidth?: number; running?: string; priority?: Priority; worktrees?: readonly string[]; wrapLongNames?: boolean }

/** One colour per phase, the rail's (054 #71). */
const PHASE_ROLE: Partial<Record<Feature['phase'], ThemeRole>> = { specify: 'muted', clarify: 'current', plan: 'barFill', tasks: 'accent', implement: 'current', done: 'done' }

/** Below this width the pane is compact (054 #69): one column, no bars. */
export const COMPACT_COLUMNS = 60

const featureRow = (f: Feature, isActive: boolean, columns: number, ctx: RowContext): PaneRow => {
  // Not read yet in a large project (040): a mark and no phase until its batch lands.
  if (f.warnings.includes('loading')) return { key: `feature-${f.id}`, text: `${isActive ? '▸' : ' '} … ${f.id.padEnd(ctx.idWidth ?? 0)} ${f.name}`, role: 'muted', dim: true }
  // `↑` high, `↓` low in the space before the id (051).
  // Ids padded to the widest, so every name starts in one column (054 #25).
  const head = `${isActive ? '▸' : ' '} ${markOf(f)}${priorityMark(ctx.priority)}${f.id.padEnd(ctx.idWidth ?? 0)} `
  const percent = f.total > 0 ? `${Math.floor((f.done * 100) / f.total)}%`.padStart(4) : ''
  const count = f.total > 0 ? `${f.done}/${f.total}`.padStart(ctx.countWidth) : ''
  const filled = f.total > 0 ? Math.floor((f.done * BAR_CELLS) / f.total) : 0
  const bar = f.total > 0 ? `${'█'.repeat(filled)}${'░'.repeat(BAR_CELLS - filled)}` : ''
  const role: ThemeRole = isActive ? 'accent' : f.phase === 'done' ? 'done' : f.phase === 'abandoned' ? 'muted' : 'text'
  const dim = f.phase === 'abandoned' ? { dim: true } : {}
  // Chips for open questions and checklist items (044 #39).
  const chips = [
    f.clarifications !== undefined && f.clarifications > 0 ? `?${f.clarifications}` : '',
    f.checklist !== undefined && f.checklist.open > 0 && f.phase !== 'done' && f.phase !== 'abandoned' ? `☐${f.checklist.open}` : '',
  ].filter(c => c !== '')
  // The worktrees working on this feature (054 #49).
  const trees = ctx.worktrees === undefined || ctx.worktrees.length === 0 ? '' : `  ⑂ ${ctx.worktrees.join(', ')}`
  const running = `${chips.length === 0 ? '' : `  ${chips.join(' ')}`}${trees}${ctx.running === undefined ? '' : `  ⟳ ${ctx.running}`}`
  const name = (ctx.wrapLongNames === true ? f.name : cut(f.name, ctx.nameWidth)).padEnd(ctx.nameWidth)
  const phase = f.phase.padEnd(9)
  // Columns line up across rows (044); narrower panes drop the bar, then the count, then cut the name.
  const forms = [
    `${head}${name}  ${phase}  ${bar.padEnd(BAR_CELLS)}  ${count} ${percent}${running}`,
    `${head}${name}  ${phase}  ${count} ${percent}${running}`,
    `${head}${name}  ${phase} ${percent}`,
  ].map(text => text.trimEnd())
  // A compact pane under 60 columns never draws bars (054 #69), even when a short name leaves room.
  const fitting = forms.slice(columns < COMPACT_COLUMNS ? 1 : 0).find(text => width(text) <= columns)
  // The widest form in colour (052 #12, 054 #71): the phase in its rail colour, the bar in its own.
  if (fitting !== undefined && fitting === forms[0] && f.total > 0 && f.phase !== 'abandoned') {
    const fillRole: ThemeRole = f.done >= f.total ? 'done' : 'barFill'
    const segments = [
      { text: `${head}${name}  `, role },
      { text: phase, role: PHASE_ROLE[f.phase] ?? role },
      { text: '  ', role },
      { text: '█'.repeat(filled), role: fillRole },
      { text: '░'.repeat(BAR_CELLS - filled), role: 'barEmpty' as ThemeRole },
      { text: `  ${count} ${percent}${running}`.trimEnd(), role },
    ]
    return { key: `feature-${f.id}`, text: fitting, role, ...dim, segments }
  }
  if (fitting !== undefined) return { key: `feature-${f.id}`, text: fitting, role, ...dim }
  const tail = `  ${f.phase}${percent === '' ? '' : ` ${percent.trim()}`}`
  const cutName = ctx.wrapLongNames === true ? f.name : cut(f.name, columns - width(head) - width(tail))
  const text = cutName === '' ? `${head.trimEnd()}${tail}` : `${head}${cutName}${tail}`
  return { key: `feature-${f.id}`, text, role, ...dim }
}

/** Which section a feature belongs to (044): working on it, next up, done, abandoned. */
export const sectionOf = (f: Pick<Feature, 'phase' | 'dir' | 'done'>, activeDir: string | undefined): 'progress' | 'next' | 'done' | 'abandoned' =>
  f.phase === 'done' ? 'done' : f.phase === 'abandoned' ? 'abandoned' : f.dir === activeDir || f.done > 0 || f.phase === 'implement' ? 'progress' : 'next'

const WARNING_TEXT = {
  'feature-json-dangling': 'pane.jsonDangling',
  'feature-json-malformed': 'pane.jsonMalformed',
} as const

/** The active feature's gates (054 #56): constitution, clarifications, checklist, tasks, analyze. */
export const gatesText = (state: Pick<SpeckitState, 'constitution' | 'isAnalyzed'>, f: Pick<Feature, 'clarifications' | 'checklist' | 'total' | 'warnings'>, lang: Lang = 'en'): string => {
  const mark = (ok: boolean | undefined, n?: number) => (ok === undefined ? '–' : ok ? '✓' : n === undefined ? '✗' : `✗${n}`)
  const open = f.checklist?.open ?? 0
  return [
    `${tr(lang, 'gate.title')}`,
    `${tr(lang, 'gate.constitution')} ${mark(state.constitution === 'ratified')}`,
    `${tr(lang, 'gate.clarify')} ${mark((f.clarifications ?? 0) === 0 && !f.warnings.includes('clarification-after-plan'), f.clarifications)}`,
    `${tr(lang, 'gate.checklist')} ${mark(f.checklist === undefined ? undefined : open === 0, open)}`,
    `${tr(lang, 'gate.tasks')} ${mark(f.total > 0 ? true : undefined)}`,
    `${tr(lang, 'gate.analyze')} ${mark(state.isAnalyzed ? true : undefined)}`,
  ].join('  ')
}

/** A feature's own warnings, drawn under its row (052 #14). */
const featureWarnings = (f: Feature, lang: Lang): PaneRow[] => {
  const rows: PaneRow[] = []
  // Blocking first: a file that cannot be read, then a missing spec, then open questions and checklists (054 #29).
  for (const file of ['spec', 'tasks'] as const) {
    if (f.warnings.includes(`unreadable-${file}`)) {
      rows.push({ key: `warning-${f.id}-${file}`, text: tr(lang, 'pane.unreadable', { id: f.id, file: `${file}.md` }), role: STATUS_ROLE.error })
    }
  }
  if (f.warnings.includes('no-spec')) rows.push({ key: `nospec-${f.id}`, text: tr(lang, 'pane.noSpec', { id: f.id, dir: f.dir }), role: 'current' })
  if (f.warnings.includes('clarification-after-plan')) {
    rows.push({ key: `warning-${f.id}`, text: tr(lang, 'pane.clarifyLeft', { id: f.id }), role: 'current' })
  }
  if (f.clarifications !== undefined && !f.warnings.includes('clarification-after-plan')) {
    rows.push({ key: `questions-${f.id}`, text: tr(lang, 'pane.questions', { id: f.id, n: f.clarifications }), role: 'current' })
  }
  if (f.checklist !== undefined && f.checklist.open > 0 && f.phase !== 'done' && f.phase !== 'abandoned') {
    rows.push({ key: `checklist-${f.id}`, text: tr(lang, 'pane.checklist', { id: f.id, open: f.checklist.open, total: f.checklist.total }), role: 'current' })
  }
  return rows
}

const buildSpecsRows = (
  state: SpeckitState,
  columns: number,
  lang: Lang = 'en',
  priorities: Priorities = {},
  /** Feature id to the worktrees working on it (054 #49). */
  worktrees: Readonly<Record<string, readonly string[]>> = {},
  /** Fold Done and Abandoned past three features to their heading (052 #10, #11). */
  fold = false,
  worktreeRows: ReadonlyArray<{ name: string; id: string; featureName: string; phase: string; done: number; total: number; status: string }> = [],
  wrapLongNames = false,
): PaneRow[] => {
  if (!state.present) return [noSpeckit(lang)]
  if (state.features.length === 0) return [{ key: 'empty', text: tr(lang, 'pane.noFeatures'), role: 'muted' }]
  const activeDir = state.active?.dir
  const ctx = {
    idWidth: Math.max(0, ...state.features.map(f => width(f.id)), ...worktreeRows.map(w => width(w.id))),
    nameWidth: wrapLongNames ? Math.max(...state.features.map(f => width(f.name)), ...worktreeRows.map(w => width(w.featureName))) : Math.min(24, Math.max(...state.features.map(f => width(f.name)), ...worktreeRows.map(w => width(w.featureName)))),
    countWidth: Math.max(0, ...state.features.filter(f => f.total > 0).map(f => width(`${f.done}/${f.total}`)), ...worktreeRows.filter(w => w.total > 0).map(w => width(`${w.done}/${w.total}`))),
  }
  const running = state.runningSkill?.name
  const rows: PaneRow[] = []
  const shown = new Set<string>()
  // Sections by status (044), each only when it has features.
  for (const section of ['progress', 'next', 'done', 'abandoned'] as const) {
    // Within a section, high priority first and low last (051).
    const inSection = byPriority(state.features.filter(f => sectionOf(f, activeDir) === section), priorities)
    if (inSection.length === 0) continue
    const folded = fold && (section === 'done' || section === 'abandoned') && inSection.length > 3 && !inSection.some(f => f.dir === activeDir)
    rows.push({ key: `section-${section}`, text: `${tr(lang, `pane.section.${section}`)} (${inSection.length})${folded ? ` · ${tr(lang, 'pane.folded.section', { status: section })}` : ''}`, role: 'muted', bold: true })
    if (folded) continue
    for (const f of inSection) {
      const row = featureRow(f, activeDir === f.dir, columns - 2, { ...ctx, wrapLongNames, ...(running !== undefined && f.dir === activeDir ? { running } : {}), ...(priorities[f.id] === undefined ? {} : { priority: priorities[f.id] }), ...(worktrees[f.id] === undefined ? {} : { worktrees: worktrees[f.id] }) })
      // A link to the feature's spec.md (044 #35).
      const root = state.root
      // Its plan.md and tasks.md too, once they exist (054 #77); a quick spec keeps its tasks in spec.md.
      const hasPlan = f.phase === 'tasks' || f.phase === 'implement' || f.phase === 'done'
      const hasTasks = f.total > 0 && f.track !== 'quick'
      const links = root === undefined ? [] : [...(hasPlan ? [{ label: 'plan', href: fileUrl(`${root}/specs/${f.dir}/plan.md`) }] : []), ...(hasTasks ? [{ label: 'tasks', href: fileUrl(`${root}/specs/${f.dir}/tasks.md`) }] : [])]
      rows.push(root === undefined || f.warnings.includes('loading') ? row : { ...row, href: fileUrl(`${root}/specs/${f.dir}/spec.md`), ...(links.length === 0 ? {} : { links }) })
      // The active feature's gates under its row (054 #56): each ✓, ✗ with a count, or – not yet.
      if (activeDir === f.dir && f.phase !== 'done' && f.phase !== 'abandoned' && !f.warnings.includes('loading')) {
        rows.push({ key: 'gates', text: cut(gatesText(state, f, lang), columns), role: 'muted' })
      }
      rows.push(...featureWarnings(f, lang))
      shown.add(f.dir)
    }
  }
  // One feature in two worktrees: their work will collide (054 #52).
  for (const [id, trees] of Object.entries(worktrees)) {
    if (trees.length > 1) rows.push({ key: `warning-worktrees-${id}`, text: tr(lang, 'pane.worktreeClash', { id, list: trees.join(', ') }), role: 'current' })
  }
  for (const tree of worktreeRows) {
    const head = `  ⑂${tree.id.padEnd(ctx.idWidth ?? 0)} `
    const name = (wrapLongNames ? tree.featureName : cut(tree.featureName, ctx.nameWidth)).padEnd(ctx.nameWidth)
    const phase = tree.phase.padEnd(9)
    const count = tree.total > 0 ? `${tree.done}/${tree.total}`.padStart(ctx.countWidth) : ''
    rows.push({ key: `worktree-${tree.name}`, text: `${head}${name}  ${phase}${count === '' ? '' : `  ${count}`}${tree.status}`, role: 'muted' })
  }
  // feature.json names a finished feature while the branch names another one (044 #34).
  const active = state.features.find(f => f.dir === activeDir)
  const onBranch = state.branchFeature === undefined ? undefined : state.features.find(f => f.dir === state.branchFeature)
  if (state.active?.source === 'feature.json' && active?.phase === 'done' && onBranch !== undefined && onBranch.dir !== activeDir && onBranch.phase !== 'done') {
    rows.push({ key: 'warning-stale', text: tr(lang, 'pane.stale', { done: `${active.id} ${active.name}`, branch: `${onBranch.id} ${onBranch.name}`, dir: onBranch.dir }), role: 'current' })
  }
  if (state.activeWarning !== undefined) {
    const showing = state.active === undefined ? tr(lang, 'pane.noFeature') : `${state.active.id} (${state.active.source})`
    rows.push({ key: 'warning-active', text: tr(lang, 'pane.showing', { why: tr(lang, WARNING_TEXT[state.activeWarning]), showing }), role: 'current' })
  }
  // Warnings of features in folded sections still show, at the end (052 #14).
  for (const f of state.features) if (!shown.has(f.dir)) rows.push(...featureWarnings(f, lang))
  return rows
}

let specsRowsCache: { key: string; rows: PaneRow[] } | undefined

/** Reuse the Specs rows until the memo version or any drawing input changes (054 #3). */
export const specsRows = (
  state: SpeckitState,
  columns: number,
  lang: Lang = 'en',
  priorities: Priorities = {},
  worktrees: Readonly<Record<string, readonly string[]>> = {},
  fold = false,
  worktreeRows: ReadonlyArray<{ name: string; id: string; featureName: string; phase: string; done: number; total: number; status: string }> = [],
  wrapLongNames = false,
): PaneRow[] => {
  if (state.memoVersion === undefined) return buildSpecsRows(state, columns, lang, priorities, worktrees, fold, worktreeRows, wrapLongNames)
  const key = JSON.stringify([
    state.root,
    state.memoVersion,
    state.present,
    state.active?.dir,
    state.features.map(feature => [
      feature.id,
      feature.name,
      feature.dir,
      feature.phase,
      feature.done,
      feature.total,
      feature.track,
      feature.warnings,
      feature.clarifications,
      feature.checklist,
    ]),
    columns,
    lang,
    priorities,
    worktrees,
    fold,
    worktreeRows,
    wrapLongNames,
  ])
  if (specsRowsCache?.key === key) return specsRowsCache.rows
  const rows = buildSpecsRows(state, columns, lang, priorities, worktrees, fold, worktreeRows, wrapLongNames)
  specsRowsCache = { key, rows }
  return rows
}

/** The next Specs row selected by the pane's arrow keys (054 #66). */
export const moveSpecSelection = (
  rows: readonly { key: string; index: number }[],
  selected: string | undefined,
  by: number,
): string | undefined => {
  if (rows.length === 0 || by === 0) return undefined
  const found = rows.findIndex(row => row.key === selected)
  const from = found < 0 ? 0 : found
  const delta = Math.sign(by) * Math.max(1, Math.round(Math.abs(by)))
  const to = Math.max(0, Math.min(rows.length - 1, from + delta))
  return to === from && found >= 0 ? undefined : rows[to]?.key
}

const elapsed = (ms: number): string => {
  const minutes = Math.max(0, Math.floor(ms / 60_000))
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}m`
}

export const taskRows = (state: SpeckitState, memo: SessionMemo, rows: number, columns: number, lang: Lang = 'en', now?: number): PaneRow[] => {
  const active = state.active
  if (!state.present) return [noSpeckit(lang)]
  if (active === undefined) return [{ key: 'none', text: tr(lang, 'pane.noActive'), role: 'muted' }]
  const tasks = state.activeTasks ?? parseTasks(memo.files[active.dir]?.tasks ?? '')
  if (tasks.length === 0) return [{ key: 'no-tasks', text: tr(lang, 'pane.noTasks'), role: 'muted' }]
  const open = tasks.filter(t => !t.isDone)
  // Which feature these are, its phase and its count (052 #17).
  const phase = state.features.find(f => f.dir === active.dir)?.phase
  const count = tr(lang, 'pane.count', { done: tasks.length - open.length, total: tasks.length })
  const out: PaneRow[] = [{ key: 'count', text: cut([`${active.id} ${active.name}`, phase, count].filter(x => x !== undefined).join(' · '), columns), role: 'muted' }]
  if (open.length === 0) return [...out, { key: 'all-done', text: tr(lang, 'pane.allTicked'), role: 'done' }]
  // Done tasks folded under one row (045 #41).
  const done = tasks.filter(t => t.isDone && t.id !== undefined).map(t => t.id!)
  // The fold row counts what it folds (052 #23).
  if (done.length > 0) out.push({ key: 'done-folded', text: cut(tr(lang, 'pane.folded', { n: done.length, ids: done.length === 1 ? done[0]! : `${done[0]}…${done.at(-1)}` }), columns), role: 'done', dim: true })
  const room = Math.max(1, rows - 1)
  const shown = open.length <= room ? open : open.slice(0, room - 1)
  // A run of [P] tasks at the head can go to subagents at once (020c #19); the line drops when
  // brackets already draw a run of two or more (052 #21).
  const parallel = parallelTasks(tasks)
  const bracketed = shown.some((t, i) => t.text.includes('[P]') && shown[i + 1]?.text.includes('[P]') === true)
  if (parallel.length > 0 && !bracketed) out.push({ key: 'parallel', text: tr(lang, 'pane.parallel', { ids: parallel.join(', ') }), role: 'accent' })
  // [P] tasks (045 #43): a run of them is bracketed, a lone one is marked ⇉.
  const isP = (i: number) => shown[i]?.text.includes('[P]') === true
  const groupOf = (i: number): string => {
    if (!isP(i)) return ''
    const before = isP(i - 1)
    const after = isP(i + 1)
    return before && after ? '│ ' : before ? '└ ' : after ? '┌ ' : '⇉ '
  }
  // Ids padded to the widest shown, so the text column lines up (052 #22).
  const idWidth = Math.max(0, ...shown.map(t => t.id?.length ?? 0))
  let story: string | undefined
  // Each task links to its line (054 #78); a quick spec keeps its tasks in spec.md.
  const taskFile = state.root === undefined ? undefined : `${state.root}/specs/${active.dir}/${state.features.find(f => f.dir === active.dir)?.track === 'quick' ? 'spec.md' : 'tasks.md'}`
  for (const [index, t] of shown.entries()) {
    // The user story a run of tasks belongs to (045 #44).
    if (t.story !== undefined && t.story !== story) {
      story = t.story
      // Each story carries its own count (052 #18).
      const inStory = tasks.filter(x => x.story === t.story)
      out.push({ key: `story-${t.line ?? index}`, text: cut(`${t.story} · ${inStory.filter(x => x.isDone).length}/${inStory.length}`, columns), role: 'muted' })
    }
    // The task being worked on (045 #42): marked, with how long it has run.
    const current = state.currentTask
    const isCurrent = current !== undefined && t.id !== undefined && current.id === t.id
    const ran = isCurrent && now !== undefined && current.startedAt !== undefined ? elapsed(now - current.startedAt) : ''
    const tail = ran === '' ? '' : `  ⏱ ${ran}`
    const head = `${isCurrent ? '▸ ' : ''}${groupOf(index)}${t.id === undefined ? '' : `${t.id.padEnd(idWidth)} `}`
    out.push({ key: `task-${t.id ?? index}`, text: `${head}${cut(cleanTaskText(t.text), columns - width(head) - width(tail))}`.trimEnd() + tail, role: isCurrent ? 'current' : 'text', ...(taskFile === undefined || t.line === undefined ? {} : { href: `${fileUrl(taskFile)}#L${t.line}` }) })
  }
  if (shown.length < open.length) out.push({ key: 'more', text: tr(lang, 'pane.more', { n: open.length - shown.length }), role: 'muted' })
  return out
}

export const sessionRows = (state: SpeckitState, now: number, lang: Lang = 'en', labelWidth = 14): PaneRow[] => {
  if (!state.present) {
    const roots: PaneRow[] = []
    if (state.otherRoots !== undefined) {
      const label = tr(lang, 'session.otherRoots').padEnd(labelWidth)
      const value = `${state.otherRoots.join(', ')} (/astrolabe root <folder>)`
      roots.push({ key: 'session-other-roots', text: `${label}${value}`, role: 'text', label, value })
    }
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
  const broken = state.extensionsError
  if (broken !== undefined) pairs.push(['extensions', tr(lang, 'session.extensions'), tr(lang, 'session.extensionsBroken', { line: broken.line, reason: tr(lang, `ext.${broken.reason}` as TextKey) })])
  const rows: PaneRow[] = pairs.map(([key, name, value]) => {
    const label = name.padEnd(labelWidth)
    return { key: `session-${key}`, text: `${label}${value}`, role: key === 'extensions' ? 'blocked' : 'text', label, value }
  })
  // Each principle under the constitution row, linked to its heading (054 #83).
  const path = state.root === undefined ? undefined : `${state.root}/.specify/memory/constitution.md`
  const principles: PaneRow[] = (state.principles ?? []).map((p, i) => ({ key: `session-principle-${i}`, text: `${''.padEnd(labelWidth)}${p.name}`, role: 'text', dim: true, ...(path === undefined ? {} : { href: `${fileUrl(path)}#L${p.line}` }) }))
  const at = rows.findIndex(r => r.key === 'session-constitution') + 1
  return [...rows.slice(0, at), ...principles, ...rows.slice(at)]
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

export type StatusFilter = 'all' | 'progress' | 'next' | 'done' | 'abandoned'
const STATUS_CYCLE: Readonly<Record<StatusFilter, StatusFilter>> = { all: 'progress', progress: 'next', next: 'done', done: 'abandoned', abandoned: 'all' }

/** The next status the Specs tab's `s` shows (054 #21): all, in progress, next up, done, abandoned. */
export const nextStatus = (status: StatusFilter | undefined): StatusFilter => STATUS_CYCLE[status ?? 'all']

/**
 * The features a filter keeps (054 #21): words match the id or name, and `is:done`,
 * `is:progress`, `is:next` or `is:abandoned` keep one status; `status` does the same from `s`.
 */
export const filterFeatures = <F extends Pick<Feature, 'id' | 'name' | 'phase' | 'dir' | 'done'>>(
  features: readonly F[],
  filter: string | undefined,
  activeDir: string | undefined,
  status: StatusFilter = 'all',
): F[] => {
  const tokens = (filter ?? '').trim().toLowerCase().split(/\s+/).filter(x => x !== '')
  const is = tokens.find(x => x.startsWith('is:'))?.slice(3)
  const words = tokens.filter(x => !x.startsWith('is:')).join(' ')
  const wanted = is === 'progress' || is === 'next' || is === 'done' || is === 'abandoned' ? is : status === 'all' ? undefined : status
  return features.filter(f => (words === '' || `${f.id} ${f.name}`.toLowerCase().includes(words)) && (wanted === undefined || sectionOf(f, activeDir) === wanted))
}

/** The Help tab's rows: sections filter as units, and links stay clickable (052 #36, 054 #81). */
export const helpRows = (text: string, filter?: string, lang: Lang = 'en'): PaneRow[] => {
  const sections = new Map<string, string>([
    [tr(lang, 'help.block.commands'), 'commands'],
    [tr(lang, 'help.block.keys'), 'keys'],
    [tr(lang, 'help.block.options'), 'options'],
    [tr(lang, 'help.marks'), 'marks'],
    [tr(lang, 'help.block.footer'), 'footer'],
    [tr(lang, 'help.glossary'), 'steps'],
    [tr(lang, 'help.block.models'), 'models'],
  ])
  const rows = text.split('\n').map((line, i): PaneRow => {
    const link = /\s(https:\/\/\S+)$/.exec(line)?.[1]
    const section = sections.get(line)
    const text = section === 'steps' ? tr(lang, 'help.block.steps') : section === 'marks' ? tr(lang, 'help.block.marks') : line
    return {
      key: section === undefined ? `help-${i}` : `help-section-${section}`,
      text,
      role: i === 0 || !line.startsWith(' ') ? 'accent' : 'text',
      ...(link === undefined ? {} : { href: link }),
    }
  })
  const needle = (filter ?? '').trim().toLowerCase()
  if (needle === '') return rows
  const shown: PaneRow[] = []
  let heading: PaneRow | undefined
  let contents: PaneRow[] = []
  const flush = () => {
    if (heading === undefined) {
      shown.push(...contents.filter(row => row.text.toLowerCase().includes(needle)))
    } else {
      const matches = contents.filter(row => row.text.toLowerCase().includes(needle))
      if (heading.text.toLowerCase().includes(needle)) shown.push(heading, ...contents)
      else if (matches.length > 0) shown.push(heading, ...matches)
    }
    heading = undefined
    contents = []
  }
  for (const row of rows) {
    if (row.role === 'accent') {
      flush()
      heading = row
    } else contents.push(row)
  }
  flush()
  return shown
}
