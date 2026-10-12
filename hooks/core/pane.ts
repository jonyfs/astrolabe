// What each tab of the /astrolabe pane says (contracts/pane.md). Pure: no $.
import { t as tr, type Lang, type TextKey } from './i18n'
import { formatElapsed, cleanTaskText } from './spinner'
import { parallelTasks } from './extensions'
import { ageOf } from './pulls'
import { fileUrl } from './paths'
import { byPriority, priorityMark, taskFiles, type Priorities, type Priority } from './spec-actions'
import { parseTasks } from './tasks-parser'
import { groupOpenTasks } from './task-groups'
import { STATE_GLYPHS } from './glyphs'
import { phaseShort } from './phase'
import { duration } from './duration'
import { idWidth, padId } from './ids'
import { blockLabel, blocksOf, checksLine, checksOf, countsOf, countsText, groupKeyOf, loadingRuns, runLabel, type SpecGroup, type SpecView } from './specs-scale'
import { STATUS_ROLE, type ThemeRole } from './theme'
import type { Feature, SessionMemo, SpeckitState } from './types'

/** A row; `segments`, when given, colour parts of `text` (which stays their join) (052 #12). */
export type PaneRow = { key: string; text: string; role: ThemeRole; bold?: boolean; selected?: boolean; label?: string; value?: string; action?: { id: string; label: string; hotkey?: string; kind?: 'allow' | 'revoke' | 'update' }; copy?: string; href?: string; links?: ReadonlyArray<{ label: string; href: string }>; segments?: ReadonlyArray<{ text: string; role: ThemeRole }> }

const BAR_CELLS = 10
const noSpeckit = (lang: Lang): PaneRow => ({ key: 'none', text: tr(lang, 'pane.noSpeckit'), role: 'muted' })

const width = (text: string): number => [...text].length
const cut = (text: string, room: number): string =>
  width(text) <= room ? text : room < 2 ? '' : `${[...text].slice(0, room - 1).join('').trimEnd()}…`

const markOf = (f: Feature): string => (f.phase === 'done' ? '●' : f.phase === 'abandoned' ? '○' : '◐')

/** What a row shows besides the feature: the name column's width and the skill running on it (044). */
type RowContext = { nameWidth: number; countWidth: number; idWidth?: number; running?: string; priority?: Priority; worktrees?: readonly string[]; wrapLongNames?: boolean; lang: Lang; now: number }

/** One colour per phase, the rail's (054 #71). */
const PHASE_ROLE: Partial<Record<Feature['phase'], ThemeRole>> = { specify: 'muted', clarify: 'current', plan: 'barFill', tasks: 'accent', implement: 'current', done: 'done' }

/** Below this width the pane is compact (054 #69): one column, no bars. */
export const COMPACT_COLUMNS = 60

const featureRow = (f: Feature, isActive: boolean, columns: number, ctx: RowContext): PaneRow => {
  // Not read yet in a large project (040): a mark and no phase until its batch lands.
  if (f.warnings.includes('loading')) return { key: `feature-${f.id}`, text: `${isActive ? '▸' : ' '} … ${padId(f.id, ctx.idWidth ?? 0)} ${f.name}`, role: 'faint' }
  // `↑` high, `↓` low in the space before the id (051).
  // Ids padded to the widest, so every name starts in one column (054 #25).
  const head = `${isActive ? '▸' : ' '} ${markOf(f)}${priorityMark(ctx.priority)}${padId(f.id, ctx.idWidth ?? 0)} `
  // A figure the files do not give prints ?, never 0% or a blank (067 #37): from the tasks phase on, a spec has tasks.
  const unknown = f.total === 0 && (f.phase === 'tasks' || f.phase === 'implement' || f.phase === 'done')
  const percent = f.total > 0 ? `${Math.floor((f.done * 100) / f.total)}%`.padStart(4) : unknown ? '?%'.padStart(4) : ''
  const count = f.total > 0 ? `${f.done}/${f.total}`.padStart(ctx.countWidth) : unknown ? '?'.padStart(ctx.countWidth) : ''
  const filled = f.total > 0 ? Math.floor((f.done * BAR_CELLS) / f.total) : 0
  const bar = f.total > 0 ? `${'█'.repeat(filled)}${'░'.repeat(BAR_CELLS - filled)}` : ''
  // Abandoned rows read in the faint text role (064 #2), not a dimmed one: a colour that is checked.
  const role: ThemeRole = isActive ? 'accent' : f.phase === 'done' ? 'done' : f.phase === 'abandoned' ? 'faint' : 'text'
  // Chips for open questions and checklist items (044 #39).
  const chips = [
    f.clarifications !== undefined && f.clarifications > 0 ? `?${f.clarifications}` : '',
    f.checklist !== undefined && f.checklist.open > 0 && f.phase !== 'done' && f.phase !== 'abandoned' ? `☐${f.checklist.open}` : '',
  ].filter(c => c !== '')
  // The worktrees working on this feature (054 #49).
  const trees = ctx.worktrees === undefined || ctx.worktrees.length === 0 ? '' : `  ⑂ ${ctx.worktrees.join(', ')}`
  const running = `${chips.length === 0 ? '' : `  ${chips.join(' ')}`}${trees}${ctx.running === undefined ? '' : `  ⟳ ${ctx.running}`}`
  // The age of the spec's last change (044 #37).
  const updated = f.updatedAt !== undefined ? `  ${tr(ctx.lang, 'pane.updated', { age: ageOf(Date.parse(f.updatedAt), ctx.now) })}` : ''
  const name = (ctx.wrapLongNames === true ? f.name : cut(f.name, ctx.nameWidth)).padEnd(ctx.nameWidth)
  const phase = f.phase.padEnd(9)
  // Columns line up across rows (044); narrower panes drop the bar, then the count, then cut the name.
  const forms = [
    `${head}${name}  ${phase}  ${bar.padEnd(BAR_CELLS)}  ${count} ${percent}${running}${updated}`,
    `${head}${name}  ${phase}  ${count} ${percent}${running}${updated}`,
    `${head}${name}  ${phase} ${percent}${updated}`,
    // The phase's short form (064 #6) before the name is cut.
    `${head}${name}  ${phaseShort(f.phase)} ${percent}`,
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
      { text: `  ${count} ${percent}${running}${updated}`.trimEnd(), role },
    ]
    return { key: `feature-${f.id}`, text: fitting, role, segments }
  }
  if (fitting !== undefined) return { key: `feature-${f.id}`, text: fitting, role }
  const tail = `  ${phaseShort(f.phase)}${percent === '' ? '' : ` ${percent.trim()}`}`
  const cutName = ctx.wrapLongNames === true ? f.name : cut(f.name, columns - width(head) - width(tail))
  const text = cutName === '' ? `${head.trimEnd()}${tail}` : `${head}${cutName}${tail}`
  return { key: `feature-${f.id}`, text, role }
}

export { SECTIONS, displaySectionOf, type Section } from './sections'
import { SECTIONS, displaySectionOf } from './sections'

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
  sort: SpecSort = 'status',
  scale?: ScaleOptions,
): PaneRow[] => {
  if (!state.present) return [noSpeckit(lang)]
  if (state.features.length === 0) return [{ key: 'empty', text: tr(lang, 'pane.noFeatures'), role: 'muted' }]
  const activeDir = state.active?.dir
  const ctx = {
    idWidth: idWidth([...state.features.map(f => f.id), ...worktreeRows.map(w => w.id)]),
    nameWidth: wrapLongNames ? Math.max(...state.features.map(f => width(f.name)), ...worktreeRows.map(w => width(w.featureName))) : Math.min(24, Math.max(...state.features.map(f => width(f.name)), ...worktreeRows.map(w => width(w.featureName)))),
    countWidth: Math.max(0, ...state.features.filter(f => f.total > 0).map(f => width(`${f.done}/${f.total}`)), ...worktreeRows.filter(w => w.total > 0).map(w => width(`${w.done}/${w.total}`))),
  }
  const running = state.runningSkill?.name
  const rows: PaneRow[] = []
  const shown = new Set<string>()
  const checks = checksOf(state, scale?.planMissing)
  const checkDirs = new Set(checks.flatMap(c => (c.dir === undefined ? [] : [c.dir])))
  const idCount = new Map<string, number>()
  for (const f of state.features) idCount.set(f.id, (idCount.get(f.id) ?? 0) + 1)
  const seenIds = new Map<string, number>()
  /** One feature's rows: the row with its links, the gates of the active one, its warnings and checks. */
  const featureBlock = (f: Feature): PaneRow[] => {
    const out: PaneRow[] = []
    const now = Date.now()
    const row = featureRow(f, activeDir === f.dir, columns - 2, { ...ctx, wrapLongNames, ...(running !== undefined && f.dir === activeDir ? { running } : {}), ...(priorities[f.id] === undefined ? {} : { priority: priorities[f.id]! }), ...(worktrees[f.id] === undefined ? {} : { worktrees: worktrees[f.id]! }), lang, now })
    // A link to the feature's spec.md (044 #35).
    const root = state.root
    // Its plan.md and tasks.md too, once they exist (054 #77); a quick spec keeps its tasks in spec.md.
    const hasPlan = f.phase === 'tasks' || f.phase === 'implement' || f.phase === 'done'
    const hasTasks = f.total > 0 && f.track !== 'quick'
    const links = root === undefined ? [] : [...(hasPlan ? [{ label: 'plan', href: fileUrl(`${root}/specs/${f.dir}/plan.md`) }] : []), ...(hasTasks ? [{ label: 'tasks', href: fileUrl(`${root}/specs/${f.dir}/tasks.md`) }] : [])]
    let placed: PaneRow = root === undefined || f.warnings.includes('loading') ? row : { ...row, href: fileUrl(`${root}/specs/${f.dir}/spec.md`), ...(links.length === 0 ? {} : { links }) }
    // Two folders with one id stay two rows (067 #34): the second takes a key of its own, both are marked.
    if ((idCount.get(f.id) ?? 1) > 1) {
      const nth = seenIds.get(f.id) ?? 0
      seenIds.set(f.id, nth + 1)
      const mark = `  ▲ id×${idCount.get(f.id)}`
      placed = {
        ...placed,
        key: nth === 0 ? placed.key : `${placed.key}~${nth}`,
        text: `${placed.text}${mark}`,
        ...(placed.segments === undefined ? {} : { segments: [...placed.segments, { text: mark, role: 'current' as const }] }),
      }
    }
    out.push(placed)
    // The active feature's gates under its row (054 #56): each ✓, ✗ with a count, or – not yet.
    if (activeDir === f.dir && f.phase !== 'done' && f.phase !== 'abandoned' && !f.warnings.includes('loading')) {
      out.push({ key: 'gates', text: cut(gatesText(state, f, lang), columns), role: 'muted' })
    }
    out.push(...featureWarnings(f, lang))
    // Each check also sits under its own spec's row (067 #33).
    for (const c of checks) {
      if (c.dir === f.dir && c.kind !== 'duplicate-id') out.push({ key: `check-${c.kind}-${f.id}`, text: cut(`▲ ${c.text}`, columns), role: 'current' })
    }
    shown.add(f.dir)
    return out
  }
  // Specs not read yet show as one row per run (067 #36), never a blank.
  const placeholder = (run: { from: string; to: string }): PaneRow => ({
    key: `loading-${run.from}`,
    text: cut(`· ${runLabel(run)} ${tr(lang, 'pane.notRead')}`, columns),
    role: 'faint',
  })
  const effective: SpecView | undefined = scale?.view ?? (state.features.length > 12 ? 'focus' : undefined)
  if (effective !== undefined) {
    const group: SpecGroup = scale?.group ?? 'status'
    const open = new Set(scale?.open ?? [])
    const sorted = (list: readonly Feature[]) => byPriority(sortFeatures([...list], sort), priorities)
    const loaded = state.features.filter(f => !f.warnings.includes('loading'))
    const counts = countsOf(state.features, activeDir, checkDirs)
    // The summary: how many specs and where they stand, as one stacked bar (067 #31).
    const bySection = (s: string) => state.features.filter(f => displaySectionOf(f, activeDir) === s).length
    const closeN = bySection('close')
    const early = bySection('early') + bySection('next')
    const progressN = bySection('progress') + bySection('active')
    const cells = 20
    const total = Math.max(1, state.features.length)
    const take = (n: number) => Math.round((n / total) * cells)
    const doneCells = take(counts.done)
    const closeCells = take(closeN)
    const progressCells = take(progressN)
    const earlyCells = Math.max(0, Math.min(cells - doneCells - closeCells - progressCells, take(early)))
    rows.push({
      key: 'scale-summary',
      text: `${state.features.length} specs ${'█'.repeat(doneCells)}${'▓'.repeat(closeCells)}${'▒'.repeat(progressCells)}${'░'.repeat(earlyCells)} ▶${progressN} · ${early} early · ${closeN} to close · ✓${counts.done}`,
      role: 'muted',
      segments: [
        { text: `${state.features.length} specs `, role: 'muted' },
        { text: '█'.repeat(doneCells), role: 'done' },
        { text: '▓'.repeat(closeCells), role: 'current' },
        { text: '▒'.repeat(progressCells), role: 'barFill' },
        { text: '░'.repeat(earlyCells), role: 'barEmpty' },
        { text: ` ▶${progressN} · ${early} early · ${closeN} to close · ✓${counts.done}`, role: 'muted' },
      ],
    })
    const line = checksLine(checks)
    if (line !== undefined) rows.push({ key: 'scale-checks', text: cut(line, columns), role: 'current' })
    // What Claude touched this session (067 #40).
    const touched = (scale?.touched ?? []).flatMap(dir => state.features.filter(f => f.dir === dir))
    if (touched.length > 0) {
      rows.push({ key: 'section-touched', text: `${tr(lang, 'pane.section.touched')} (${touched.length})`, role: 'muted', bold: true })
      for (const f of touched) rows.push(...featureBlock(f))
    }
    const runs = loadingRuns(state.features)
    if (effective === 'focus') {
      for (const section of ['active', 'progress', 'early', 'close'] as const) {
        const inSection = sorted(loaded.filter(f => displaySectionOf(f, activeDir) === section && !touched.includes(f)))
        if (inSection.length === 0) continue
        rows.push({ key: `section-${section}`, text: `${tr(lang, `pane.section.${section}`)} (${inSection.length})`, role: 'muted', bold: true })
        for (const f of inSection) rows.push(...featureBlock(f))
      }
      for (const run of runs) rows.push(placeholder(run))
      const doneBlocks = blocksOf(state.features.filter(f => displaySectionOf(f, activeDir) === 'done'), ctx.idWidth)
      if (doneBlocks.length > 0) {
        rows.push({ key: 'scale-done', text: cut(`${tr(lang, 'pane.section.done')} ${counts.done} ▸ ${doneBlocks.map(b => `${b.label} ${b.features.length}`).join(' · ')}`, columns), role: 'done' })
      }
      const nextN = bySection('next')
      if (nextN > 0) rows.push({ key: 'scale-next', text: `${tr(lang, 'pane.section.next')} ${nextN}`, role: 'muted' })
      const abandoned = bySection('abandoned')
      if (abandoned > 0) rows.push({ key: 'scale-abandoned', text: `${tr(lang, 'pane.section.abandoned')} ${abandoned}`, role: 'faint' })
    } else {
      // Every spec, in blocks of 50 by id (or by the grouping), opened and folded (067 #31).
      const headings = group === 'status'
        ? blocksOf(loaded, ctx.idWidth).map(b => ({ key: b.label, label: b.label, features: b.features }))
        : [...new Set(loaded.map(f => groupKeyOf(group, f, activeDir, priorities[f.id])))].map(k => ({ key: k, label: k, features: loaded.filter(f => groupKeyOf(group, f, activeDir, priorities[f.id]) === k) }))
      for (const h of headings) {
        const isOpen = open.has(h.key) || h.features.some(f => f.dir === activeDir)
        const c = countsOf(h.features, activeDir, checkDirs)
        rows.push({ key: `block-${h.key}`, text: cut(`${isOpen ? '▾' : '▸'} ${h.label} ${countsText(c)}`.trimEnd(), columns), role: 'muted', bold: true })
        if (!isOpen) continue
        for (const f of sorted(h.features)) rows.push(...featureBlock(f))
      }
      for (const run of runs) rows.push(placeholder(run))
    }
  } else {
    // A small project keeps the plain sections (044), in a fixed order (066 #25).
    const runsDone = new Set<string>()
    const runs = loadingRuns(state.features)
    for (const section of SECTIONS) {
      // Within a section, high priority first and low last (051).
      const inSection = byPriority(sortFeatures(state.features.filter(f => displaySectionOf(f, activeDir) === section), sort), priorities)
      if (inSection.length === 0) continue
      const folded = fold && (section === 'done' || section === 'abandoned') && inSection.length > 3 && !inSection.some(f => f.dir === activeDir)
      rows.push({ key: `section-${section}`, text: `${tr(lang, `pane.section.${section}`)} (${inSection.length})${folded ? ` · ${tr(lang, 'pane.folded.section', { status: section })}` : ''}`, role: 'muted', bold: true })
      if (folded) continue
      for (const f of inSection) {
        if (f.warnings.includes('loading')) {
          const run = runs.find(r => r.dirs.includes(f.dir))
          if (run !== undefined && !runsDone.has(run.from)) {
            runsDone.add(run.from)
            rows.push(placeholder(run))
          }
          shown.add(f.dir)
          continue
        }
        rows.push(...featureBlock(f))
      }
    }
    if (checks.length > 0 && scale !== undefined) {
      const line = checksLine(checks)
      if (line !== undefined) rows.unshift({ key: 'scale-checks', text: cut(line, columns), role: 'current' })
    }
  }
  // One feature in two worktrees: their work will collide (054 #52).
  for (const [id, trees] of Object.entries(worktrees)) {
    if (trees.length > 1) rows.push({ key: `warning-worktrees-${id}`, text: tr(lang, 'pane.worktreeClash', { id, list: trees.join(', ') }), role: 'current' })
  }
  for (const tree of worktreeRows) {
    const head = `  ⑂${padId(tree.id, ctx.idWidth ?? 0)} `
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
  sort: SpecSort = 'status',
  /** docs/roadmap.md's text, read by the caller (io is not pure); absent when none. */
  roadmap?: string,
  scale?: ScaleOptions,
): PaneRow[] => {
  if (state.memoVersion === undefined) return buildSpecsRows(state, columns, lang, priorities, worktrees, fold, worktreeRows, wrapLongNames, sort, scale)
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
    sort,
    roadmap,
    scale,
  ])
  if (specsRowsCache?.key === key) return specsRowsCache.rows
  const rows = buildSpecsRows(state, columns, lang, priorities, worktrees, fold, worktreeRows, wrapLongNames, sort, scale)
  // Roadmap view (044 #40): show items from docs/roadmap.md not yet specs.
  if (roadmap !== undefined) {
    const roadmapRows = parseRoadmap(roadmap, state.features, columns, lang)
    if (roadmapRows.length > 0) rows.push(...roadmapRows)
  }
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

/** A section heading as the story it names: `Phase 3: User Story 3 - Cart page (P1)` reads `US3 Cart page`. */
export const storyLabel = (heading: string): string => {
  const m = /User Story\s+(\d+)(?:\s*[-–—:]\s*(.+?))?(?:\s*\([^)]*\))?\s*$/i.exec(heading)
  if (m === null) return heading
  return m[2] === undefined ? `US${m[1]}` : `US${m[1]} ${m[2]}`
}

export const taskRows = (
  state: SpeckitState,
  memo: SessionMemo,
  rows: number,
  columns: number,
  lang: Lang = 'en',
  now?: number,
  /** What the done tasks took, from the session (045 #47). */
  times: ReadonlyArray<{ dir: string; id: string; ms: number }> = [],
): PaneRow[] => {
  const active = state.active
  if (!state.present) return [noSpeckit(lang)]
  if (active === undefined) return [{ key: 'none', text: tr(lang, 'pane.noActive'), role: 'muted' }]
  const tasks = state.activeTasks ?? parseTasks(memo.files[active.dir]?.tasks ?? '')
  const open = tasks.filter(t => !t.isDone)
  // Which feature these are, its phase and its count (052 #17).
  const phase = state.features.find(f => f.dir === active.dir)?.phase
  const count = tr(lang, 'pane.count', { done: tasks.length - open.length, total: tasks.length })
  // What is left at the pace of the tasks done so far this session (066 #9 of the board): two samples at least.
  const samples = times.filter(x => x.dir === active.dir && x.ms > 0)
  const estimate = samples.length >= 2 && open.length > 0 ? tr(lang, 'pane.estimate', { time: duration(Math.round(samples.reduce((n, x) => n + x.ms, 0) / samples.length) * open.length) }) : undefined
  const out: PaneRow[] = [{ key: 'count', text: cut([`${active.id} ${active.name}`, phase, count, estimate].filter(x => x !== undefined).join(' · '), columns), role: 'muted' }]
  if (tasks.length === 0) {
    let requirementsShown = false
    // Quick specs show their Requirements as a checklist (045 #49).
    const feature = state.features.find(f => f.dir === active.dir)
    const spec = memo.files[active.dir]?.spec
    const requirements = feature?.track === 'quick' && spec !== undefined && spec.includes('## Requirements')
      ? spec.split(/\r?\n/)
      : undefined
    if (requirements) {
      const requirementsIndex = requirements.findIndex(line => /^##\s+Requirements/i.test(line))
      const tasksIndex = requirements.findIndex(line => /^##\s+Tasks\s*$/i.test(line))
      if (requirementsIndex >= 0 && tasksIndex > requirementsIndex) {
        const reqLines = requirements.slice(requirementsIndex + 1, tasksIndex).filter(l => /^\s*[-*+]\s+\[[ xX]\]/.test(l))
        if (reqLines.length > 0) {
          const reqTasks = reqLines.map((l, i) => ({ line: parseTasks(reqLines.join('\n'))[i]?.line ?? 0, text: l, isDone: /^\s*\[x\]/i.test(l) }))
          // Show Requirements as a checklist
          const requirementsText = reqTasks.map((t, i) => `${t.isDone ? '☑' : '☐'} ${t.text}`).join('\n')
          out.push({ key: 'requirements', text: cut(`${tr(lang, 'pane.requirements')}:`, columns), role: 'muted' })
          out.push({ key: 'requirements-list', text: requirementsText, role: 'text' })
          requirementsShown = true
        }
      }
    }
    if (!requirementsShown) return [{ key: 'no-tasks', text: tr(lang, 'pane.noTasks'), role: 'muted' }]
  }
  if (open.length === 0) return [...out, { key: 'all-done', text: tr(lang, 'pane.allTicked'), role: 'done' }]
  // Done tasks folded under one row (045 #41).
  const done = tasks.filter(t => t.isDone && t.id !== undefined).map(t => t.id!)
  // The fold row counts what it folds (052 #23).
  // The time they took, from the session's task times (045 #47).
  const took = times.filter(x => x.dir === active.dir && done.includes(x.id)).reduce((sum, x) => sum + x.ms, 0)
  const tookText = took > 0 ? ` · ${duration(took)}` : ''
  if (done.length > 0) out.push({ key: 'done-folded', text: cut(`${tr(lang, 'pane.folded', { n: done.length, ids: done.length === 1 ? done[0]! : `${done[0]}…${done.at(-1)}` })}${tookText}`, columns), role: 'faint' })
  const room = Math.max(1, rows - 1)
  const shown = open.length <= room ? open : open.slice(0, room - 1)
  // A run of [P] tasks at the head can go to subagents at once (020c #19); the line drops when
  // brackets already draw a run of two or more (052 #21).
  const parallel = parallelTasks(tasks)
  const bracketed = shown.some((t, i) => t.text.includes('[P]') && shown[i + 1]?.text.includes('[P]') === true)
  if (parallel.length > 0 && !bracketed) out.push({ key: 'parallel', text: tr(lang, 'pane.parallel', { ids: parallel.join(', ') }), role: 'accent' })
  // [P] tasks (045 #43): a run of them is bracketed, a lone one is marked ⇉.
  const isP = (i: number) => shown[i]?.text.includes('[P]') === true
  // A run draws a bracket at the right edge (┐ ┤ ┘ with P); a lone one is a P (066, board 3).
  const bracketOf = (i: number): string => {
    if (!isP(i)) return ''
    const before = isP(i - 1)
    const after = isP(i + 1)
    return before && after ? '┤ P' : before ? '┘ P' : after ? '┐ P' : 'P'
  }
  // Ids padded to the widest shown, so the text column lines up (052 #22).
  const taskIdWidth = idWidth(shown.flatMap(t => (t.id === undefined ? [] : [t.id])), 0)
  let story: string | undefined
  // The tasks by where they stand: current, next, blocked by an earlier open one, later (054 #27).
  // Headers show only when the shown tasks fall in more than one group.
  const grouped = groupOpenTasks(shown, state.currentTask?.id)
  const groupHeaders = new Set(grouped.map(g => g.group)).size > 1
  let lastGroup: string | undefined
  // Each task links to its line (054 #78); a quick spec keeps its tasks in spec.md.
  const taskFile = state.root === undefined ? undefined : `${state.root}/specs/${active.dir}/${state.features.find(f => f.dir === active.dir)?.track === 'quick' ? 'spec.md' : 'tasks.md'}`
  for (const [index, t] of shown.entries()) {
    const group = grouped[index]!.group
    if (groupHeaders && group !== lastGroup) {
      lastGroup = group
      out.push({ key: `group-${group}-${index}`, text: cut(tr(lang, `tasks.group.${group}` as TextKey), columns), role: 'muted' })
    }
    // The user story a run of tasks belongs to (045 #44).
    if (t.story !== undefined && t.story !== story) {
      story = t.story
      // Each story carries its own count (052 #18).
      const inStory = tasks.filter(x => x.story === t.story)
      out.push({ key: `story-${t.line ?? index}`, text: cut(`${storyLabel(t.story)} ${inStory.filter(x => x.isDone).length}/${inStory.length}`, columns), role: 'muted' })
    }
    // The task being worked on (045 #42): marked, with how long it has run.
    const current = state.currentTask
    const isCurrent = current !== undefined && t.id !== undefined && current.id === t.id
    const ran = isCurrent && now !== undefined && current.startedAt !== undefined ? duration(now - current.startedAt) : ''
    const clock = ran === '' ? bracketOf(index) : `${STATE_GLYPHS.elapsed} ${ran}`
    const head = `${isCurrent ? '▸ ' : ''}${t.id === undefined ? '' : `${padId(t.id, taskIdWidth)} `}`
    // The ◷ sits at the right edge, the current row in bold (052 #20).
    const body = `${head}${cut(cleanTaskText(t.text), columns - width(head) - width(clock) - (clock === '' ? 0 : 2))}`.trimEnd()
    const line = clock === '' ? body : `${body}${' '.repeat(Math.max(2, columns - width(body) - width(clock)))}${clock}`
    const named = isCurrent ? taskFiles(t.text) : []
    out.push({ key: `task-${t.id ?? index}`, text: line, role: isCurrent ? 'current' : 'text', ...(isCurrent ? { bold: true } : {}), ...(taskFile === undefined || t.line === undefined ? {} : { href: `${fileUrl(taskFile)}#L${t.line}` }) })
    // The files the current task names, under it (045 #45).
    if (named.length > 0) out.push({ key: `task-files-${t.id ?? index}`, text: cut(`    ${tr(lang, 'pane.taskFiles', { files: named.join(', ') })}`, columns), role: 'muted' })
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
  const principles: PaneRow[] = (state.principles ?? []).map((p, i) => ({ key: `session-principle-${i}`, text: `${''.padEnd(labelWidth)}${p.name}`, role: 'faint', ...(path === undefined ? {} : { href: `${fileUrl(path)}#L${p.line}` }) }))
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

/** How features order within a section (061): the files' order, most done first, or by name. */
/** How the Specs tab is laid out at scale (067): the view, the open blocks, the grouping, what Claude touched. */
export type ScaleOptions = {
  view?: SpecView
  open?: readonly string[]
  group?: SpecGroup
  touched?: readonly string[]
  /** Files plan.md names that are not there, by feature dir, from the reconcile's own reads. */
  planMissing?: Readonly<Record<string, readonly string[]>>
}

export type SpecSort = 'status' | 'progress' | 'name'
const SORT_CYCLE: Readonly<Record<SpecSort, SpecSort>> = { status: 'progress', progress: 'name', name: 'status' }
export const nextSort = (sort: SpecSort | undefined): SpecSort => SORT_CYCLE[sort ?? 'status']
const sortFeatures = <F extends Pick<Feature, 'name' | 'done' | 'total'>>(features: readonly F[], sort: SpecSort): F[] =>
  sort === 'status'
    ? [...features]
    : [...features].sort((a, b) =>
        sort === 'name'
          ? a.name.localeCompare(b.name)
          : (b.total === 0 ? 0 : b.done / b.total) - (a.total === 0 ? 0 : a.done / a.total))

export type StatusFilter = 'all' | 'progress' | 'next' | 'done' | 'abandoned'
const STATUS_CYCLE: Readonly<Record<StatusFilter, StatusFilter>> = { all: 'progress', progress: 'next', next: 'done', done: 'abandoned', abandoned: 'all' }

/** The next status the Specs tab's `s` shows (054 #21): all, in progress, next up, done, abandoned. */
export const nextStatus = (status: StatusFilter | undefined): StatusFilter => STATUS_CYCLE[status ?? 'all']

/**
 * The features a filter keeps (054 #21): words match the id or name, and `is:done`,
 * `is:progress`, `is:next` or `is:abandoned` keep one status; `status` does the same from `s`.
 */
/** What the Specs filter box understands (061): words, plus `key:value` tokens. */
export type SpecFilter = {
  words: string
  /** `is:progress|next|done|abandoned`, or `is:active` for the active feature. */
  is?: 'progress' | 'next' | 'done' | 'abandoned' | 'active'
  phase?: string
  has: Array<'questions' | 'checklist' | 'warning' | 'worktree'>
  track?: 'quick' | 'full'
  prio?: 'high' | 'low'
}

const PHASES = ['specify', 'clarify', 'plan', 'tasks', 'implement', 'done', 'abandoned']

/** The tokens of a filter string: `phase:plan has:questions track:quick prio:high is:active auth`. */
export const parseSpecFilter = (filter: string | undefined): SpecFilter => {
  const tokens = (filter ?? '').trim().toLowerCase().split(/\s+/).filter(x => x !== '')
  const out: SpecFilter = { words: '', has: [] }
  const words: string[] = []
  for (const token of tokens) {
    const [key, value = ''] = token.split(':', 2) as [string, string?]
    if (key === 'is' && ['progress', 'next', 'done', 'abandoned', 'active'].includes(value)) out.is = value as SpecFilter['is']
    else if (key === 'phase' && PHASES.includes(value)) out.phase = value
    else if (key === 'has' && ['questions', 'checklist', 'warning', 'worktree'].includes(value)) out.has.push(value as SpecFilter['has'][number])
    else if (key === 'track' && (value === 'quick' || value === 'full')) out.track = value
    else if (key === 'prio' && (value === 'high' || value === 'low')) out.prio = value
    else words.push(token)
  }
  out.words = words.join(' ')
  return out
}

/** The filter's tokens as chips for the row under the box (061): `phase:plan`, `has:questions`. */
export const filterChips = (filter: string | undefined, status: StatusFilter = 'all'): string[] => {
  const f = parseSpecFilter(filter)
  return [
    ...(status === 'all' ? [] : [`status:${status}`]),
    ...(f.is === undefined ? [] : [`is:${f.is}`]),
    ...(f.phase === undefined ? [] : [`phase:${f.phase}`]),
    ...f.has.map(h => `has:${h}`),
    ...(f.track === undefined ? [] : [`track:${f.track}`]),
    ...(f.prio === undefined ? [] : [`prio:${f.prio}`]),
    ...(f.words === '' ? [] : [`"${f.words}"`]),
  ]
}

/**
 * How many rows `text` takes at `columns`, counting each wrapped line: a long paragraph is
 * several rows, not one. The pane reserves its footer's rows from this, so a miscount pushes the
 * footer off the last rows.
 */
export const wrappedRows = (text: string, columns: number): number =>
  text.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(width(line) / Math.max(1, columns))), 0)

type Filterable = Pick<Feature, 'id' | 'name' | 'phase' | 'dir' | 'done'> & Partial<Pick<Feature, 'warnings' | 'track' | 'clarifications' | 'checklist'>>

export const filterFeatures = <F extends Filterable>(
  features: readonly F[],
  filter: string | undefined,
  activeDir: string | undefined,
  status: StatusFilter = 'all',
  context: { priorities?: Priorities; worktrees?: Readonly<Record<string, readonly string[]>> } = {},
): F[] => {
  const f = parseSpecFilter(filter)
  const wanted = f.is === 'active' ? undefined : f.is ?? (status === 'all' ? undefined : status)
  return features.filter(x => {
    if (f.words !== '' && !`${x.id} ${x.name}`.toLowerCase().includes(f.words)) return false
    if (wanted !== undefined && sectionOf(x, activeDir) !== wanted) return false
    if (f.is === 'active' && x.dir !== activeDir) return false
    if (f.phase !== undefined && x.phase !== f.phase) return false
    if (f.track !== undefined && (x.track ?? 'full') !== f.track) return false
    if (f.prio !== undefined && (context.priorities?.[x.id] ?? 'normal') !== f.prio) return false
    for (const h of f.has) {
      if (h === 'questions' && !((x.clarifications ?? 0) > 0)) return false
      if (h === 'checklist' && !((x.checklist?.open ?? 0) > 0)) return false
      if (h === 'warning' && !((x.warnings ?? []).length > 0)) return false
      if (h === 'worktree' && !((context.worktrees?.[x.id] ?? []).length > 0)) return false
    }
    return true
  })
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
    [tr(lang, 'help.block.health'), 'health'],
  ])
  const rows = text.split('\n').map((line, i): PaneRow => {
    const link = /\s(https:\/\/\S+)$/.exec(line)?.[1]
    const section = sections.get(line)
    const text = section === 'steps' ? tr(lang, 'help.block.steps') : section === 'marks' ? tr(lang, 'help.block.marks') : line
    // A command copies itself on press (052 #37): the words before the gap, optional parts dropped.
    const command = /^ {2}\//.test(line) ? line.trim().split(/\s{2,}/)[0]!.replace(/\s*\[[^\]]*\]/g, '') : undefined
    return {
      key: section === undefined ? `help-${i}` : `help-section-${section}`,
      text,
      role: i === 0 || !line.startsWith(' ') ? 'accent' : 'text',
      ...(link === undefined ? {} : { href: link }),
      ...(command === undefined || !/^\/astrolabe\b/.test(command) ? {} : { copy: command }),
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

/** Parses docs/roadmap.md and returns rows for the roadmap view (044 #40). */
export const parseRoadmap = (roadmap: string, features: readonly Feature[], columns: number, lang: Lang): PaneRow[] => {
  const existingDirs = new Set(features.map(f => f.dir))
  const rows: PaneRow[] = []
  const lines = roadmap.split('\n')
  let inSpecTable = false
  let inAddedTable = false
  for (const line of lines) {
    if (/^\| \d+ \|/.test(line) && !/^\| Spec \|/.test(line)) {
      const parts = line.split('|').map(p => p.trim()).filter(p => p !== '')
      if (parts.length >= 3) {
        const specNum = parts[0]
        if (specNum === undefined) continue
        const theme = parts[1]
        const what = parts[2]
        // Check if this spec already exists as a feature
        if (!existingDirs.has(specNum.padStart(3, '0') + '-') && !existingDirs.has(specNum + '-')) {
          rows.push({ key: `roadmap-${specNum}`, text: cut(`  ${specNum}  ${theme}: ${what}`, columns), role: 'muted' })
        }
      }
    }
  }
  if (rows.length > 0) {
    rows.unshift({ key: 'roadmap-header', text: tr(lang, 'pane.roadmap'), role: 'muted', bold: true })
  }
  return rows
}
