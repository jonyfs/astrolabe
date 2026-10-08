// The Spec Kit command that moves the active feature forward (FR-021). Pure: no $.
import type { ConstitutionState, Feature, Phase } from './types'

export type NextCommandInput = {
  present: boolean
  constitution: ConstitutionState
  active?: Pick<Feature, 'phase' | 'done'>
  isAnalyzed: boolean
}

const BY_PHASE: Partial<Record<Phase, string>> = {
  specify: '/speckit-specify',
  clarify: '/speckit-clarify',
  plan: '/speckit-plan',
  tasks: '/speckit-tasks',
}

export const nextCommand = (input: NextCommandInput): string | undefined => {
  if (!input.present) return undefined
  if (input.constitution !== 'ratified') return '/speckit-constitution'
  const active = input.active
  if (active === undefined || active.phase === 'done' || active.phase === 'abandoned') return '/speckit-specify'
  const byPhase = BY_PHASE[active.phase]
  if (byPhase !== undefined) return byPhase
  return active.done === 0 && !input.isAnalyzed ? '/speckit-analyze' : '/speckit-implement'
}

/** The feature that moved to done between two reads (054 #90), for the retro suggestion. */
export const justFinished = <F extends Pick<Feature, 'dir' | 'phase'>>(before: readonly F[], after: readonly F[]): F | undefined =>
  after.find(f => f.phase === 'done' && before.some(b => b.dir === f.dir && b.phase !== 'done'))
