// Lays out the band above the prompt (contracts/band.md). Pure: no $.
// Returns segments, each with the theme role that colors it; the surface turns them
// into elements. The first form that fits `columns` wins; an id is never cut.
import { t, type Lang } from './i18n'
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

const progress = (feature: Feature, withBar: boolean): Segment[] => {
  if (feature.total === 0) return []
  const filled = Math.floor((feature.done * BAR_CELLS) / feature.total)
  const percent = Math.floor((feature.done * 100) / feature.total)
  const bar: Segment[] = withBar
    ? [
        gap('bar', '  '),
        { key: 'bar-fill', text: '█'.repeat(filled), role: 'barFill' },
        { key: 'bar-empty', text: '░'.repeat(BAR_CELLS - filled), role: 'barEmpty' },
      ]
    : []
  return [...bar, gap('count'), { key: 'count', text: `${feature.done}/${feature.total} ${percent}%`, role: 'text' }]
}

export const bandSegments = (state: SpeckitState, columns: number): Segment[] => {
  const active = state.active
  if (!state.present || active === undefined) return []
  const feature = state.features.find(f => f.dir === active.dir)
  const id: Segment = { key: 'id', text: `◆ ${state.activeWarning === undefined ? '' : '~'}${active.id}`, role: 'accent' }
  const name: Segment[] = [gap('name'), { key: 'name', text: active.name, role: 'text' }]
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
