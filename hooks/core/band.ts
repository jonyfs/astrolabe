// Lays out the band above the prompt (contracts/band.md). Pure: no $.
// Returns segments, each with the theme role that colors it; the surface turns them
// into elements. The first form that fits `columns` wins; an id is never cut.
import { activeMark } from './status-text'
import { t, type Lang } from './i18n'
import { byPriority, type Priorities } from './spec-actions'
import { sectionOf } from './pane'
import type { ThemeRole } from './theme'
import type { Feature, Phase, SpeckitState, Step } from './types'

export type Segment = { key: string; text: string; role: ThemeRole }

const STEPS: readonly Step[] = ['constitution', 'specify', 'clarify', 'plan', 'tasks', 'implement']
const FEATURE_STEPS: readonly Phase[] = ['specify', 'clarify', 'plan', 'tasks', 'implement']
const BAR_CELLS = 10

type Mark = '●' | '◐' | '○'
const ROLE: Readonly<Record<Mark, ThemeRole>> = { '●': 'done', '◐': 'current', '○': 'pending' }

const width = (segments: readonly Segment[]): number => segments.reduce((n, s) => n + [...s.text].length, 0)

export const bandText = (segments: readonly Segment[]): string => segments.map(s => s.text).join('')

const marksOf = (state: SpeckitState, feature: Feature): Record<Step, Mark> => {
  const isRatified = state.constitution === 'ratified'
  const index = feature.phase === 'done' ? FEATURE_STEPS.length : FEATURE_STEPS.indexOf(feature.phase)
  const marks = { constitution: isRatified ? '●' : '◐' } as Record<Step, Mark>
  FEATURE_STEPS.forEach((step, i) => {
    marks[step as Step] = !isRatified ? '○' : i < index ? '●' : i === index ? '◐' : '○'
  })
  return marks
}

const gap = (key: string, text = ' '): Segment => ({ key: `gap-${key}`, text, role: 'muted' })

/** The rail, with every label or only the current step's. */
const rail = (state: SpeckitState, feature: Feature, allLabels: boolean): Segment[] => {
  const marks = marksOf(state, feature)
  const running = state.runningSkill?.step
  // Blocked (042 #13): clarifications left after the plan turn the current step red with a `?`.
  const blocked = feature.warnings.includes('clarification-after-plan')
  const out: Segment[] = []
  STEPS.forEach((step, i) => {
    const mark = marks[step]
    const isStuck = blocked && mark === '◐'
    if (i > 0) out.push(gap(`step-${step}`))
    if (allLabels || mark === '◐') {
      out.push({ key: `label-${step}`, text: step, role: isStuck ? 'blocked' : mark === '◐' ? 'current' : 'muted' }, gap(`label-${step}`))
    }
    out.push({ key: `mark-${step}`, text: isStuck ? '?' : mark, role: isStuck ? 'blocked' : ROLE[mark] })
    if (running === step) out.push({ key: `running-${step}`, text: '…', role: 'accent' })
  })
  return out
}

const step = (feature: Feature): Segment => ({
  key: 'step',
  text: `${feature.phase === 'done' ? '●' : '◐'} ${feature.phase}`,
  role: feature.phase === 'done' ? 'done' : 'current',
})

/** The bar's fill color by the share left (042 #16): red when mostly left, green when nearly done. */
const barRole = (feature: Feature): ThemeRole => {
  if (feature.total === 0) return 'barFill'
  const share = feature.done / feature.total
  return share >= 2 / 3 ? 'done' : share >= 1 / 3 ? 'current' : 'blocked'
}

const progress = (feature: Feature, withBar: boolean): Segment[] => {
  if (feature.total === 0) return []
  const filled = Math.floor((feature.done * BAR_CELLS) / feature.total)
  const percent = Math.floor((feature.done * 100) / feature.total)
  const bar: Segment[] = withBar
    ? [
        gap('bar', '  '),
        { key: 'bar-fill', text: '█'.repeat(filled), role: barRole(feature) },
        { key: 'bar-empty', text: '░'.repeat(BAR_CELLS - filled), role: 'barEmpty' },
      ]
    : []
  return [...bar, gap('count'), { key: 'count', text: `${feature.done}/${feature.total} ${percent}%`, role: 'text' }]
}

export type BandDensity = 'full' | 'compact' | 'minimal'
export type BandExtras = {
  /** How much the band shows (042 #20). */
  density?: BandDensity
  /** The worktree the active feature runs in, when it is another one (042 #18). */
  worktree?: string
}

const inProgressOthers = (state: SpeckitState): Feature[] =>
  state.features.filter(f => f.dir !== state.active?.dir && f.phase !== 'done' && f.phase !== 'abandoned')

/** Names the features counted by the band's +N badge (052 #43). */
export const otherFeaturesCard = (state: SpeckitState, lang: Lang = 'en'): string | undefined => {
  const features = inProgressOthers(state)
  return features.length === 0 ? undefined : t(lang, 'band.otherFeatures', { features: features.map(f => `${f.id} ${f.name}`).join(', ') })
}

export const bandSegments = (state: SpeckitState, columns: number, extras: BandExtras = {}): Segment[] => {
  const active = state.active
  if (!state.present || active === undefined) return []
  const feature = state.features.find(f => f.dir === active.dir)
  const id: Segment = { key: 'id', text: activeMark(state), role: 'accent' }
  // Other features in progress (042 #17) and the worktree the active one runs in (042 #18).
  const others = inProgressOthers(state).length
  const tags: Segment[] = [
    ...(others === 0 ? [] : [gap('others'), { key: 'others', text: `+${others}`, role: 'muted' as const }]),
    ...(extras.worktree === undefined ? [] : [gap('worktree'), { key: 'worktree', text: `⑂ ${extras.worktree}`, role: 'muted' as const }]),
  ]
  const name: Segment[] = [gap('name'), { key: 'name', text: active.name, role: 'text' }, ...tags]
  let forms: Segment[][]
  if (feature === undefined) {
    forms = [[id]]
  } else if (feature.phase === 'abandoned') {
    const label: Segment[] = [gap('abandoned', '  '), { key: 'abandoned', text: 'abandoned', role: 'muted' }]
    forms = [[id, ...name, ...label], [id, ...label], [id]]
  } else {
    const lead = gap('rail', '  ')
    forms = [
      [id, ...name, lead, ...rail(state, feature, true), ...progress(feature, true)],
      [id, ...name, lead, ...rail(state, feature, false), ...progress(feature, true)],
      [id, lead, ...rail(state, feature, false), ...progress(feature, true)],
      [id, lead, ...rail(state, feature, false), ...progress(feature, false)],
      // The compact band (024 #12): the current step and the count, which say more than the rail alone.
      [id, lead, step(feature), ...progress(feature, false)],
      [id, lead, ...rail(state, feature, false)],
      [id, lead, step(feature)],
      [id],
    ]
  }
  // Step names only from 100 columns; below, the hover cards name the steps (042 #11).
  if (feature !== undefined && feature.phase !== 'abandoned' && columns < 100) forms = forms.slice(1)
  // compact starts at the current step and the count; minimal at the id and the step (042 #20).
  if (feature !== undefined && feature.phase !== 'abandoned' && extras.density === 'compact') forms = forms.slice(-4)
  if (feature !== undefined && feature.phase !== 'abandoned' && extras.density === 'minimal') forms = forms.slice(-2)
  return forms.find(form => width(form) <= columns) ?? []
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
