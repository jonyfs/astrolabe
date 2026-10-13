// The Specs tab as a tree (078): a spec row, its stories and its tasks under it. Pure: no $.
import { t as tr, type Lang } from './i18n'
import { cleanTaskText } from './spinner'
import { duration } from './duration'
import { STATE_GLYPHS } from './glyphs'
import { fileUrl } from './paths'
import { idWidth, padId } from './ids'
import { taskFiles } from './spec-actions'
import { parallelTasks } from './extensions'
import type { PaneRow } from './pane'
import type { Feature } from './types'

/** A task as the tree reads it: the line is optional, as the active tasks in the state carry it. */
export type TreeTask = { id?: string; text: string; isDone: boolean; line?: number; story?: string }
type Task = TreeTask

const width = (text: string): number => [...text].length
const cut = (text: string, room: number): string =>
  width(text) <= room ? text : room < 2 ? '' : `${[...text].slice(0, room - 1).join('').trimEnd()}…`

/** A test task: it writes tests, or names a tests/ path (board 3). */
export const TEST_TASK = /\b(?:write|add)\b[^.]*\btests?\b|\btests?\//i

/** A section heading as the story it names: `Phase 3: User Story 3 - Cart page (P1)` reads `US3 Cart page`. */
export const storyLabel = (heading: string): string => {
  const m = /User Story\s+(\d+)(?:\s*[-–—:]\s*(.+?))?(?:\s*\([^)]*\))?\s*$/i.exec(heading)
  if (m === null) return heading
  return m[2] === undefined ? `US${m[1]}` : `US${m[1]} ${m[2]}`
}

/** Which specs the person opened and folded; the active spec is open unless it was folded (078 FR-003). */
export type Fold = { opened?: readonly string[]; closed?: readonly string[] }

export const isOpen = (dir: string, activeDir: string | undefined, fold: Fold): boolean =>
  (fold.opened ?? []).includes(dir) || (dir === activeDir && !(fold.closed ?? []).includes(dir))

/** Enter on a spec: open it when folded, fold it when open. */
export const toggled = (dir: string, activeDir: string | undefined, fold: Fold): { opened: string[]; closed: string[] } => {
  const opened = new Set(fold.opened ?? [])
  const closed = new Set(fold.closed ?? [])
  if (isOpen(dir, activeDir, fold)) {
    opened.delete(dir)
    closed.add(dir)
  } else {
    closed.delete(dir)
    opened.add(dir)
  }
  return { opened: [...opened], closed: [...closed] }
}

/** `e`: every spec opens; pressed again, every spec folds but the active one (078 FR-009). */
export const allToggled = (dirs: readonly string[], activeDir: string | undefined, fold: Fold): { opened: string[]; closed: string[] } => {
  const everyOpen = dirs.every(dir => isOpen(dir, activeDir, fold))
  return everyOpen ? { opened: [], closed: dirs.filter(d => d !== activeDir) } : { opened: [...dirs], closed: [] }
}

/** The glyph in column 0 of a spec row: `▾` open, `▸` folded (078 FR-002). */
export const foldGlyph = (open: boolean): string => (open ? '▾' : '▸')

const BAR = 5
const bar = (done: number, total: number): { fill: string; rest: string } => {
  const filled = total > 0 ? Math.floor((done * BAR) / total) : 0
  return { fill: '▰'.repeat(filled), rest: '▱'.repeat(BAR - filled) }
}

/** What waits before a task (078 FR-039): a task named in its own words, or the open test task above it. */
const blockers = (open: readonly Task[], all: readonly Task[]): Map<string, string> => {
  const out = new Map<string, string>()
  const openIds = new Set(open.flatMap(t => (t.id === undefined ? [] : [t.id])))
  let lastTest: string | undefined
  let story: string | undefined
  for (const t of open) {
    if (t.story !== story) {
      story = t.story
      lastTest = undefined
    }
    if (t.id === undefined) continue
    const named = /\b(?:after|depends on|blocked by|needs)\s+(T\d+)\b/i.exec(t.text)?.[1]
    const isTest = TEST_TASK.test(cleanTaskText(t.text))
    const parallel = t.text.includes('[P]')
    if (named !== undefined && named !== t.id && openIds.has(named)) out.set(t.id, named)
    else if (!isTest && !parallel && lastTest !== undefined && all.some(x => x.id === lastTest && !x.isDone)) out.set(t.id, lastTest)
    if (isTest) lastTest = t.id
  }
  return out
}

export type ChildrenContext = {
  columns: number
  lang: Lang
  now: number
  root?: string
  /** The spec being worked on is the active one. */
  isActive: boolean
  /** Only the active spec's tasks, full height (078 FR-005): no cap on the rows. */
  tasksOnly: boolean
  currentTask?: { id?: string; text: string; startedAt?: number }
  times: ReadonlyArray<{ dir: string; id: string; ms: number }>
  /** The lowercase words of the filter (078 FR-007): tasks that do not match drop out. */
  words?: string
  /** The `[NEEDS CLARIFICATION: …]` lines of the spec (078 FR-045), when the spec is loaded. */
  questions?: readonly string[]
  /** Open and total checklist items of the spec, as the last story (078 FR-044). */
  checklist?: { open: number; total: number }
  /** Cap on open tasks drawn per spec; the rest folds into `… n more`. */
  cap?: number
  /** A long task wraps to two lines on a wide pane (078 FR-046). */
  wrap?: boolean
}

const OPEN_CAP = 8

/** The rows under a spec: questions, the pinned current task, then each story with its tasks (078 FR-002). */
export const specChildren = (feature: Feature, tasks: readonly Task[], ctx: ChildrenContext): PaneRow[] => {
  const out: PaneRow[] = []
  const lang = ctx.lang
  const taskFile = ctx.root === undefined ? undefined : `${ctx.root}/specs/${feature.dir}/${feature.track === 'quick' ? 'spec.md' : 'tasks.md'}`
  const words = (ctx.words ?? '').trim()
  // A task id is matched only by a word that looks like one (`t12`): `002` names a spec, not T002.
  const matches = (t: Task): boolean => words === '' || t.text.toLowerCase().includes(words) || (/^t\d+$/.test(words) && (t.id ?? '').toLowerCase().includes(words))

  // Open questions come first, each with an action that asks Claude to resolve it (078 FR-045).
  const questions = ctx.questions ?? []
  if (questions.length > 0 && words === '') {
    out.push({ key: `questions-${feature.dir}`, text: `  ? ${tr(lang, 'tree.questions', { n: questions.length })}`, role: 'current' })
    for (const [i, q] of questions.entries()) {
      out.push({ key: `question-${feature.dir}-${i}`, text: cut(`    ? ${q}`, ctx.columns - 8), role: 'current', action: { id: `${feature.dir}\n${q}`, label: tr(lang, 'tree.ask'), kind: 'ask' } })
    }
  }

  const open = tasks.filter(t => !t.isDone)
  const blocked = blockers(open, tasks)
  const ids = idWidth(tasks.flatMap(t => (t.id === undefined ? [] : [t.id])), 0)
  const current = ctx.isActive ? ctx.currentTask : undefined
  const isCurrent = (t: Task): boolean => current !== undefined && t.id !== undefined && current.id === t.id

  // The pace of the tasks done so far, from the session's times (045 #47): what an open task is likely to take.
  const samples = ctx.times.filter(x => x.dir === feature.dir && x.ms > 0)
  const pace = samples.length >= 2 ? Math.round(samples.reduce((n, x) => n + x.ms, 0) / samples.length) : undefined
  const wide = ctx.columns >= 100

  const taskRow = (t: Task, index: number, indent: number, bracket?: string): PaneRow[] => {
    const rows: PaneRow[] = []
    const cur = isCurrent(t)
    const key = `task-${feature.dir}-${t.id ?? index}`
    const pad = ' '.repeat(indent)
    const head = `${pad}${cur ? '▶' : '○'} ${t.id === undefined ? '' : `${padId(t.id, ids)} `}`
    const isP = t.text.includes('[P]')
    const isTest = TEST_TASK.test(cleanTaskText(t.text))
    const after = t.id === undefined ? undefined : blocked.get(t.id)
    const covers = isTest && t.id !== undefined ? [...blocked.entries()].find(([, by]) => by === t.id)?.[0] : undefined
    const ran = cur && current?.startedAt !== undefined ? duration(ctx.now - current.startedAt) : ''
    const edge = [
      isTest && !cur ? (covers === undefined ? tr(lang, 'tasks.tag.test') : `${tr(lang, 'tasks.tag.test')} → ${covers}`) : '',
      after === undefined ? '' : `${STATE_GLYPHS.paused} ${tr(lang, 'tree.after', { id: after })}`,
      bracket ?? (isP ? 'P' : ''),
      ran === '' || ran === '?' ? '' : `${STATE_GLYPHS.elapsed} ${ran}`,
      !cur && wide && pace !== undefined && after === undefined ? `≈${duration(pace)}` : '',
    ].filter(x => x !== '').join(' ')
    const room = taskFile === undefined || t.line === undefined ? ctx.columns : ctx.columns - 3
    const text = cleanTaskText(t.text)
    const space = room - width(head) - (edge === '' ? 0 : width(edge) + 2)
    // On a wide pane a long task wraps to a second line instead of being cut (078 FR-046).
    const wraps = ctx.wrap === true && width(text) > space && space > 12
    const first = wraps ? text.slice(0, text.lastIndexOf(' ', space) > 0 ? text.lastIndexOf(' ', space) : space) : cut(text, space)
    const body = `${head}${first}`.trimEnd()
    const line = edge === '' ? body : `${body}${' '.repeat(Math.max(2, room - width(body) - width(edge)))}${edge}`
    rows.push({
      key,
      text: line,
      role: cur ? 'current' : 'text',
      ...(cur ? { bold: true, highlight: true as const } : {}),
      task: { dir: feature.dir, ...(t.id === undefined ? {} : { id: t.id }), ...(t.line === undefined ? {} : { line: t.line }), text: cleanTaskText(t.text), ...(t.story === undefined ? {} : { story: storyLabel(t.story).split(' ')[0]! }) },
      ...(taskFile === undefined || t.line === undefined ? {} : { href: `${fileUrl(taskFile)}#L${t.line}` }),
    })
    if (wraps) rows.push({ key: `${key}-wrap`, text: `${pad}    ${cut(text.slice(first.length).trim(), ctx.columns - indent - 4)}`, role: 'faint' })
    // The files the current task names and the test that covers it, in the same block (078 FR-037).
    if (cur) {
      const files = taskFiles(t.text)
      if (files.length > 0) {
        rows.push({
          key: `${key}-files`,
          text: cut(`${pad}    ${files.join(' · ')}`, ctx.columns),
          role: 'faint',
          highlight: true,
          ...(ctx.root === undefined ? {} : { fileLinks: files.map(file => ({ label: file, href: fileUrl(`${ctx.root}/${file}`) })) }),
        })
      }
      const test = tasks.find(x => x.id !== undefined && x.id !== t.id && TEST_TASK.test(cleanTaskText(x.text)) && taskFiles(x.text).some(f => files.includes(f)))
      if (test !== undefined) rows.push({ key: `${key}-test`, text: cut(`${pad}    ${tr(lang, 'tree.covered', { id: test.id ?? '' })}${test.isDone ? ' ✓' : ''}`, ctx.columns), role: 'faint', highlight: true })
    }
    return rows
  }

  // A [P] run is bracketed at the right edge and offers one action under it (078 FR-038).
  const run = parallelTasks(tasks)
  const inRun = (t: Task | undefined): boolean => t !== undefined && t.id !== undefined && run.includes(t.id)
  const bracketOf = (t: Task): string | undefined => {
    if (!inRun(t)) return undefined
    const at = open.indexOf(t)
    const before = inRun(open[at - 1])
    const after = inRun(open[at + 1])
    return before && after ? '┤ P' : before ? '┘ P' : after ? '┐ P' : 'P'
  }

  // The pinned task: the current one, kept first under its spec (078 FR-012).
  const pinned = open.filter(isCurrent).filter(matches)
  const shownOpen = open.filter(t => !isCurrent(t) && matches(t))
  const cap = ctx.tasksOnly ? Number.POSITIVE_INFINITY : (ctx.cap ?? OPEN_CAP)
  for (const t of pinned) out.push(...taskRow(t, tasks.indexOf(t), 2, bracketOf(t)))

  // Open tasks by story, in file order: a heading with a bar, the story's done tasks folded in one line.
  const stories: Array<{ story: string | undefined; line: number; tasks: Task[] }> = []
  for (const t of shownOpen) {
    const last = stories.at(-1)
    if (last !== undefined && last.story === t.story) last.tasks.push(t)
    else stories.push({ story: t.story, line: t.line ?? 0, tasks: [t] })
  }
  let drawn = 0
  let hidden = 0
  const folded: string[] = []
  for (const group of stories) {
    const inStory = group.story === undefined ? tasks.filter(x => x.story === undefined) : tasks.filter(x => x.story === group.story)
    const done = inStory.filter(x => x.isDone)
    if (group.story !== undefined) {
      const b = bar(done.length, inStory.length)
      const label = `  ${storyLabel(group.story)}`
      const tail = ` ${b.fill}${b.rest} ${done.length}/${inStory.length}`
      const head = cut(label, ctx.columns - width(tail))
      out.push({
        key: `story-${feature.dir}-${group.line}`,
        text: `${head}${tail}`,
        role: 'muted',
        bold: true,
        segments: [
          { text: head, role: 'muted' },
          { text: ' ', role: 'muted' },
          { text: b.fill, role: done.length === inStory.length ? 'done' : 'barFill' },
          { text: b.rest, role: 'barEmpty' },
          { text: ` ${done.length}/${inStory.length}`, role: 'muted' },
        ],
      })
    }
    // The story's done tasks fold to one line, with what they took (078 FR-011).
    const ids = done.flatMap(x => (x.id === undefined ? [] : [x.id]))
    if (ids.length > 0) {
      const took = ctx.times.filter(x => x.dir === feature.dir && ids.includes(x.id)).reduce((n, x) => n + x.ms, 0)
      out.push({ key: `done-${feature.dir}-${group.line}`, text: cut(`    ✓ ${tr(lang, 'tree.done', { n: ids.length, ids: ids.length === 1 ? ids[0]! : `${ids[0]}…${ids.at(-1)}` })}${took > 0 ? ` · ${duration(took)}` : ''}`, ctx.columns), role: 'faint' })
    }
    for (const [i, t] of group.tasks.entries()) {
      if (drawn >= cap) {
        hidden += 1
        continue
      }
      const rows = taskRow(t, tasks.indexOf(t), 4, bracketOf(t))
      out.push(...rows)
      drawn += 1
      if (run.length >= 2 && t.id === run.at(-1)) {
        out.push({ key: `parallel-${feature.dir}`, text: `    ⇉ ${tr(lang, 'tree.parallel', { n: run.length })}`, role: 'accent', action: { id: `${feature.dir}\n${run.join('\n')}`, label: tr(lang, 'tree.runThese'), kind: 'parallel' } })
      }
    }
  }
  if (hidden > 0) out.push({ key: `more-${feature.dir}`, text: `    ${tr(lang, 'tree.more', { n: hidden })}`, role: 'muted' })

  // Stories with nothing open left fold together at the end (078 FR-011).
  const openStories = new Set(stories.map(g => g.story))
  const finished = tasks.filter(t => t.isDone && !openStories.has(t.story) && words === '')
  for (const t of finished) if (t.id !== undefined) folded.push(t.id)
  if (folded.length > 0) out.push({ key: `done-rest-${feature.dir}`, text: cut(`    ✓ ${tr(lang, 'tree.done', { n: folded.length, ids: folded.length === 1 ? folded[0]! : `${folded[0]}…${folded.at(-1)}` })}`, ctx.columns), role: 'faint' })
  if (tasks.length === 0 && questions.length === 0 && ctx.isActive) out.push({ key: `no-tasks-${feature.dir}`, text: `    ${tr(lang, 'tree.noTasks')}`, role: 'muted' })
  if (tasks.length > 0 && open.length === 0 && words === '') out.push({ key: `all-done-${feature.dir}`, text: `    ✓ ${tr(lang, 'pane.allTicked')}`, role: 'done' })

  // The checklist is the last story (078 FR-044): its open count, linked to the spec's checklists folder.
  if (ctx.checklist !== undefined && ctx.checklist.open > 0 && words === '') {
    out.push({
      key: `checklist-${feature.dir}`,
      text: `  ${tr(lang, 'tree.checklist', { open: ctx.checklist.open, total: ctx.checklist.total })}`,
      role: 'current',
      ...(ctx.root === undefined ? {} : { href: fileUrl(`${ctx.root}/specs/${feature.dir}/checklists`) }),
    })
  }
  return out
}

/** The `[NEEDS CLARIFICATION: …]` lines of a spec (078 FR-045). */
export const questionsIn = (spec: string | undefined): string[] =>
  spec === undefined
    ? []
    : [...spec.matchAll(/\[NEEDS CLARIFICATION:?\s*([^\]]*)\]/gi)].map(m => (m[1] ?? '').trim()).filter(q => q !== '')

/** What the prompt box gets to tick a task: Astrolabe writes nothing to the project (spec 051). */
export const tickSuggestion = (feature: Pick<Feature, 'dir'>, task: { id?: string; line?: number; text: string }): string =>
  `Tick ${task.id ?? 'the task'} in specs/${feature.dir}/tasks.md${task.line === undefined ? '' : ` (line ${task.line})`}: ${task.text}`

/** What the prompt box gets to start a task. */
export const doTaskSuggestion = (feature: Pick<Feature, 'dir'>, task: { id?: string; text: string }): string =>
  `Implement ${task.id ?? 'this task'} of specs/${feature.dir}/tasks.md: ${task.text}`

/** What the prompt box gets to settle an open question of a spec. */
export const questionSuggestion = (id: string): string => {
  const [dir = '', ...rest] = id.split('\n')
  return `Resolve this open question in specs/${dir}/spec.md and replace its [NEEDS CLARIFICATION] marker with the answer: ${rest.join(' ')}`
}

/** The breadcrumb the pane's title follows (078 FR-024): `Specs › 002 › US2 › T012`. */
export const breadcrumb = (parts: { spec?: string; story?: string; task?: string }): string =>
  ['Specs', parts.spec, parts.story, parts.task].filter((x): x is string => x !== undefined && x !== '').join(' › ')

/** The rows with each open spec's children right under its row (078 FR-002). */
export const withChildren = (
  rows: readonly PaneRow[],
  features: readonly Feature[],
  isOpenFeature: (f: Feature) => boolean,
  childrenOf: (f: Feature) => PaneRow[],
): PaneRow[] => {
  const byKey = new Map<string, Feature>(features.map(f => [`feature-${f.id}`, f]))
  const out: PaneRow[] = []
  for (const row of rows) {
    out.push(row)
    const f = byKey.get(row.key.replace(/~\d+$/, ''))
    if (f !== undefined && !f.warnings.includes('loading') && isOpenFeature(f)) out.push(...childrenOf(f))
  }
  return out
}

/** A blank row before each spec that follows another row of the list, for the roomy density (078 FR-096). */
export const spaced = (rows: readonly PaneRow[]): PaneRow[] => {
  const out: PaneRow[] = []
  for (const [i, row] of rows.entries()) {
    const before = rows[i - 1]
    if (i > 0 && before !== undefined && row.key.startsWith('feature-') && !before.key.startsWith('section-') && !before.key.startsWith('block-')) out.push({ key: `gap-${row.key}`, text: ' ', role: 'faint' })
    out.push(row)
  }
  return out
}
