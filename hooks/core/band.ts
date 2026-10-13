// Lays out the band above the prompt: one row (065, board 1 and 2). Pure: no $.
// Returns segments, each with the theme role that colors it; the surface turns them into
// elements. The widest form that fits the columns left of the right-edge buttons wins, and
// the id, the current step and n/m are never dropped.
import { activeMark } from './status-text'
import { t, type Lang } from './i18n'
import { phaseShort } from './phase'
import { byPriority, type Priorities } from './spec-actions'
import { sectionOf } from './pane'
import type { ThemeRole } from './theme'
import { STATE_GLYPHS } from './glyphs'
import type { Feature, Phase, PullRequest, SpeckitState, Step } from './types'

export type Segment = {
  key: string
  text: string
  role: ThemeRole
  /** Drawn with a background of the role and the stronger-contrast foreground. */
  chip?: true
  bold?: true
  /** Drawn a shade lighter: the step finished in the last 30 seconds (065 #18). */
  bright?: true
  /** A path under the project root; the surface makes the segment a link. */
  href?: string
  /** The surface draws a button for it: `lift` lifts the hold for one hour, `task` opens the pane at that task (078). */
  action?: 'lift' | 'task'
}

const STEPS: readonly Step[] = ['constitution', 'specify', 'clarify', 'plan', 'tasks', 'implement']
const FEATURE_STEPS: readonly Phase[] = ['specify', 'clarify', 'plan', 'tasks', 'implement']

// A segment that is a button draws as `[ text ]`: four cells beyond its text.
const width = (segments: readonly Segment[]): number => segments.reduce((n, s) => n + [...s.text].length + (s.action === undefined ? 0 : 4), 0)

export const bandText = (segments: readonly Segment[]): string => segments.map(s => s.text).join('')

const gap = (key: string, text = ' '): Segment => ({ key: `gap-${key}`, text, role: 'muted' })

export type BandDensity = 'full' | 'compact' | 'minimal'
export type BandExtras = {
  /** How much the band shows (042 #20). */
  density?: BandDensity
  /** The worktree the active feature runs in, when it is another one (042 #18). */
  worktree?: string
  /** Cells the right-edge buttons take: the left side fits what is left. */
  reserved?: number
  /** The governor's state: at stop or ceiling the band says paused, at hold it says holding. */
  governor?: { band: 'ok' | 'throttle' | 'hold' | 'stop' | 'ceiling'; until?: string }
  /** How many agents and gates are live: counts only, the names are the live table's (065 #16). */
  live?: { agents: number; gates: number }
  /** The deciding window's text, kept by the idle and minimal bands (065 #20). */
  deciding?: { text: string; role: ThemeRole }
  /** The time the current task has run, from 200 columns. */
  taskElapsed?: string
  /** A phase finished in the last 30 seconds: the step chip brightens instead of a toast. */
  bright?: boolean
}

const inProgressOthers = (state: SpeckitState): Feature[] =>
  state.features.filter(f => f.dir !== state.active?.dir && f.phase !== 'done' && f.phase !== 'abandoned')

/** Names the features counted by the band's +N badge (052 #43). */
export const otherFeaturesCard = (state: SpeckitState, lang: Lang = 'en'): string | undefined => {
  const features = inProgressOthers(state)
  return features.length === 0 ? undefined : t(lang, 'band.otherFeatures', { features: features.map(f => `${f.id} ${f.name}`).join(', ') })
}

type Rail = { step: Step; name: string; file: string }

/** The steps of a track, in order, each with the file a click opens. */
const railOf = (feature: Feature, constitutionRatified: boolean): { done: Rail[]; current: Rail | undefined } => {
  const dir = feature.dir
  const file = (name: string) => `specs/${dir}/${name}`
  if (feature.track === 'quick') {
    // spec → tasks → impl (065 #11): the tasks live in spec.md.
    const hasTasks = feature.total > 0
    const done: Rail[] = [{ step: 'specify', name: 'spec', file: file('spec.md') }]
    if (hasTasks) done.push({ step: 'tasks', name: 'tasks', file: file('spec.md') })
    const current: Rail | undefined = feature.phase === 'done' ? undefined : hasTasks ? { step: 'implement', name: 'impl', file: file('spec.md') } : { step: 'tasks', name: 'tasks', file: file('spec.md') }
    return { done: feature.phase === 'done' ? [...done, { step: 'implement', name: 'impl', file: file('spec.md') }] : done, current }
  }
  const files: Record<string, string> = { specify: 'spec.md', clarify: 'spec.md', plan: 'plan.md', tasks: 'tasks.md', implement: 'tasks.md' }
  const index = feature.phase === 'done' ? FEATURE_STEPS.length : FEATURE_STEPS.indexOf(feature.phase)
  const done: Rail[] = FEATURE_STEPS.slice(0, Math.max(0, index)).map(p => ({ step: p as Step, name: p, file: file(files[p]!) }))
  const phase = FEATURE_STEPS[index]
  const current: Rail | undefined = phase === undefined || !constitutionRatified && false ? undefined : { step: phase as Step, name: phase, file: file(files[phase]!) }
  return { done, current }
}

type Options = {
  /** The finished steps' marks; the last thing but the id and the step to go. */
  marks: boolean
  /** The `n/m` in the step chip; shed only when even the chip does not fit. */
  count: boolean
  names: boolean
  name: boolean
  bar: number
  percent: boolean
  title: 'full' | 'cut' | 'none'
  live: boolean
  task: boolean
  elapsed: boolean
}

const BAR_ROLE_EMPTY: ThemeRole = 'barEmpty'

const chipText = (feature: Feature, rail: Rail | undefined, blocked: boolean, running: boolean, withCount: boolean): { text: string; role: ThemeRole } => {
  if (feature.phase === 'done' || rail === undefined) return { text: ' ✓ done ', role: 'done' }
  if (blocked) return { text: ` ? clarify ${feature.clarifications ?? 0} `, role: 'blocked' }
  const count = withCount && feature.total > 0 && rail.step === 'implement' ? ` ${feature.done}/${feature.total}` : ''
  return { text: ` ▶ ${rail.name}${count}${running ? ' …' : ''} `, role: 'current' }
}

/** One form of the band for the options, or the pieces it would show. */
const build = (state: SpeckitState, feature: Feature, extras: BandExtras, o: Options, titleRoom: number): Segment[] => {
  const active = state.active!
  const ratified = state.constitution === 'ratified'
  const { done, current } = railOf(feature, ratified)
  const blocked = feature.warnings.includes('clarification-after-plan') && (feature.clarifications ?? 0) > 0
  const running = state.runningSkill?.step !== undefined && current !== undefined && state.runningSkill.step === current.step
  const idText = activeMark(state).replace(/^◆ /, '')
  const out: Segment[] = [{ key: 'id', text: ` ${idText} `, role: 'accent', chip: true, href: `specs/${feature.dir}/spec.md` }]
  if (o.name) {
    out.push(gap('name', ' '), { key: 'name', text: active.name, role: 'text', bold: true })
    const others = inProgressOthers(state).length
    if (others > 0) out.push(gap('others'), { key: 'others', text: `+${others}`, role: 'muted' })
    if (extras.worktree !== undefined) out.push(gap('worktree'), { key: 'worktree', text: `⎇ ${extras.worktree}`, role: 'muted' })
  }
  out.push(gap('rail', o.name ? (o.marks ? '  ' : ' ') : o.marks ? ' ' : ''))
  if (o.marks && !ratified) out.push({ key: 'mark-constitution', text: o.names ? '◐ constitution' : '◐', role: 'current', href: '.specify/memory/constitution.md' }, gap('constitution', o.names ? ' ' : ''))
  if (o.marks) done.forEach((r, i) => {
    if (i > 0 && o.names) out.push(gap(`step-${r.step}`))
    out.push({ key: `mark-${r.step}`, text: '✓', role: 'done', href: r.file })
    if (o.names) out.push(gap(`label-${r.step}`, ' '), { key: `label-${r.step}`, text: r.name, role: 'muted', href: r.file })
  })
  const chip = chipText(feature, current, blocked, running, o.count)
  if (o.marks && (done.length > 0 || !ratified)) out.push(gap('chip', ' '))
  out.push({ key: 'chip-step', text: chip.text, role: chip.role, chip: true, ...(extras.bright === true ? { bright: true as const } : {}) })
  if (running && current !== undefined) out.push({ key: `running-${current.step}`, text: '', role: 'accent' })
  if (o.bar > 0 && feature.total > 0) {
    // One heavy line: blue where done, dim where left (board 1, 2).
    const filled = Math.floor((feature.done * o.bar) / feature.total)
    out.push(gap('bar', ' '), { key: 'bar-fill', text: '━'.repeat(filled), role: 'barFill' }, { key: 'bar-empty', text: '━'.repeat(o.bar - filled), role: BAR_ROLE_EMPTY })
    if (o.percent) out.push(gap('percent'), { key: 'percent', text: `${Math.floor((feature.done * 100) / feature.total)}%`, role: 'muted' })
  }
  const governor = extras.governor
  const taskGap = o.percent && o.bar > 0 && feature.total > 0 ? '  ' : ' '
  if (o.task && governor !== undefined && (governor.band === 'stop' || governor.band === 'ceiling')) {
    out.push(gap('task', taskGap), { key: 'bar-sep', text: '│', role: 'pending' }, gap('paused'), { key: 'paused', text: `‖ paused until ${governor.until ?? '?'}`, role: 'blocked' }, gap('lift'), { key: 'lift', text: 'lift 1h', role: 'blocked', action: 'lift' })
  } else if (o.task && governor !== undefined && governor.band === 'hold') {
    out.push(gap('task', taskGap), { key: 'bar-sep', text: '│', role: 'pending' }, gap('paused'), { key: 'paused', text: '‖ holding new subagents', role: 'blocked' })
  } else if (o.task && state.currentTask?.id !== undefined && feature.phase !== 'done') {
    out.push(gap('task', taskGap), { key: 'bar-sep', text: '│', role: 'pending' }, gap('task-id'), { key: 'task-id', text: `▸ ${state.currentTask.id}`, role: 'current', action: 'task' })
    if (o.title !== 'none' && state.currentTask.text !== '') {
      const full = ` ${state.currentTask.text}`
      const title = o.title === 'full' ? full : titleRoom >= 4 ? (full.length > titleRoom ? `${full.slice(0, Math.max(1, titleRoom - 1)).trimEnd()}…` : full) : ''
      if (title !== '') out.push({ key: 'task-title', text: title, role: 'muted' })
      if (o.elapsed && extras.taskElapsed !== undefined) out.push({ key: 'task-elapsed', text: ` · ${extras.taskElapsed}`, role: 'muted' })
    }
  }
  if (o.live && extras.live !== undefined && (extras.live.agents > 0 || extras.live.gates > 0)) {
    const parts = [extras.live.agents > 0 ? `${extras.live.agents} agents` : '', extras.live.gates > 0 ? `${extras.live.gates} gates` : ''].filter(x => x !== '')
    out.push(gap('live', '  '), { key: 'live', text: parts.join(' · '), role: 'muted' })
  }
  if (extras.deciding !== undefined && extras.density === 'minimal') out.push(gap('deciding', '  '), { key: 'deciding', text: extras.deciding.text, role: extras.deciding.role })
  return out
}

/** The layout tier of a width: what the full form shows at 200, 144, 100 and below (board 2). */
const tierOf = (columns: number, density: BandDensity | undefined): Options => {
  const effective = density === 'minimal' ? 80 : density === 'compact' ? Math.min(columns, 100) : columns
  if (effective >= 200) return { marks: true, count: true, names: true, name: true, bar: 20, percent: true, title: 'full', live: true, task: true, elapsed: true }
  if (effective >= 144) return { marks: true, count: true, names: true, name: true, bar: 13, percent: false, title: 'cut', live: true, task: true, elapsed: false }
  if (effective >= 100) return { marks: true, count: true, names: false, name: true, bar: 9, percent: false, title: 'none', live: false, task: true, elapsed: false }
  return { marks: true, count: true, names: false, name: false, bar: 0, percent: false, title: 'none', live: false, task: true, elapsed: false }
}

/** The branch's pull request at the band's right edge, from 200 columns of a full band (board 2). */
export const bandPr = (
  pr: Pick<PullRequest, 'number' | 'checks'> | undefined,
  columns: number,
  density?: BandDensity,
): { label: string; mark: string; role: ThemeRole } | undefined => {
  if (pr === undefined || columns < 200 || density === 'compact' || density === 'minimal') return undefined
  const mark = pr.checks === 'pass' ? '✓' : pr.checks === 'fail' ? '✖' : pr.checks === 'pending' ? STATE_GLYPHS.elapsed : ''
  const role: ThemeRole = pr.checks === 'pass' ? 'done' : pr.checks === 'fail' ? 'blocked' : 'current'
  return { label: `PR #${pr.number}`, mark, role }
}

export const bandSegments = (state: SpeckitState, columns: number, extras: BandExtras = {}): Segment[] => {
  const active = state.active
  if (!state.present || active === undefined) return []
  const feature = state.features.find(f => f.dir === active.dir)
  const room = Math.max(0, columns - (extras.reserved ?? 0))
  if (feature === undefined) return [{ key: 'id', text: ` ${activeMark(state).replace(/^◆ /, '')} `, role: 'accent', chip: true }]
  if (feature.phase === 'abandoned') {
    const id: Segment = { key: 'id', text: ` ${activeMark(state).replace(/^◆ /, '')} `, role: 'accent', chip: true, href: `specs/${feature.dir}/spec.md` }
    const label: Segment[] = [gap('abandoned', '  '), { key: 'abandoned', text: 'abandoned', role: 'muted' }]
    const name: Segment[] = [gap('name', ' '), { key: 'name', text: active.name, role: 'text', bold: true }]
    return ([[id, ...name, ...label], [id, ...label], [id]] as Segment[][]).find(form => width(form) <= room) ?? []
  }
  const start = tierOf(columns, extras.density)
  // Further shedding, in the board's drop order: title, live counts, step names, name, bar.
  const steps: Array<(o: Options) => Options> = [
    o => ({ ...o, elapsed: false }),
    o => ({ ...o, title: o.title === 'full' ? 'cut' : 'none' }),
    o => ({ ...o, title: 'none' }),
    o => ({ ...o, live: false }),
    o => ({ ...o, names: false }),
    o => ({ ...o, name: false }),
    o => ({ ...o, percent: false }),
    o => ({ ...o, bar: 0 }),
    o => ({ ...o, task: false }),
    o => ({ ...o, marks: false }),
    o => ({ ...o, count: false }),
  ]
  let o = start
  const tryFit = (opts: Options): Segment[] | undefined => {
    const bare = build(state, feature, extras, { ...opts, title: opts.title === 'cut' ? 'none' : opts.title }, 0)
    if (opts.title === 'cut') {
      const without = width(bare)
      const roomForTitle = room - without - 1
      if (roomForTitle >= 4) {
        const form = build(state, feature, extras, opts, roomForTitle)
        if (width(form) <= room) return form
      }
      return width(bare) <= room ? bare : undefined
    }
    const form = build(state, feature, extras, opts, 0)
    return width(form) <= room ? form : undefined
  }
  let form = tryFit(o)
  for (const step of steps) {
    if (form !== undefined) break
    o = step(o)
    form = tryFit(o)
  }
  if (form !== undefined) return form
  // Nothing fits: the id, then the id alone is cut by the caller's row.
  const idOnly: Segment[] = [{ key: 'id', text: ` ${activeMark(state).replace(/^◆ /, '')} `, role: 'accent', chip: true, href: `specs/${feature.dir}/spec.md` }]
  return width(idOnly) <= room ? idOnly : []
}

/** The hover card of each rail step (024 #10): what the step is for and how many features are in it. */
export const stepCards = (features: readonly Feature[], lang: Lang = 'en'): Array<{ step: Step; text: string }> =>
  STEPS.map(step => {
    const n = features.filter(f => f.phase === step).length
    const about = t(lang, `card.${step}`)
    if (step === 'constitution') return { step, text: `${step}: ${about}` }
    const count = n === 0 ? t(lang, 'card.none') : n === 1 ? t(lang, 'card.one') : t(lang, 'card.many', { n })
    return { step, text: `${step}: ${about} · ${count}` }
  })

/** The rail step a segment belongs to, by its key (`label-plan`, `mark-plan`, `running-plan`). */
export const stepOf = (segment: Segment): Step | undefined => {
  const m = /^(?:label|mark|running)-(.+)$/.exec(segment.key)
  return m !== null && (STEPS as readonly string[]).includes(m[1]!) ? (m[1] as Step) : undefined
}

/** Why the next command is next (042 #14), shown while the pointer is on its button. */
export const nextReason = (state: SpeckitState, lang: Lang = 'en', priorities: Priorities = {}): string | undefined => {
  const command = state.nextCommand
  if (command === undefined) return undefined
  const feature = state.features.find(f => f.dir === state.active?.dir)
  const step = command.replace(/^\/speckit-/, '')
  if (step === 'implement' && feature !== undefined) return t(lang, 'reason.implement', { n: feature.total - feature.done })
  if (step === 'specify' && feature !== undefined && feature.phase !== 'specify') {
    if (feature.phase === 'done') {
      const next = byPriority(state.features.filter(f => sectionOf(f, feature.dir) === 'next'), priorities)[0]
      if (next !== undefined) return t(lang, 'reason.specifyNextPriority', { feature: `${next.id} ${next.name}`, priority: priorities[next.id] ?? 'normal' })
    }
    return t(lang, 'reason.specifyNext')
  }
  return (['constitution', 'specify', 'clarify', 'plan', 'tasks', 'analyze'] as const).includes(step as never) ? t(lang, `reason.${step}` as never) : undefined
}
