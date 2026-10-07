// Maps a Skill tool call to a Spec Kit step (FR-017). Pure: no $.
import type { SkillHint, Step } from './types'

const STEPS: Readonly<Record<string, Step>> = {
  'speckit-constitution': 'constitution',
  'speckit-specify': 'specify',
  'speckit-clarify': 'clarify',
  'speckit-plan': 'plan',
  'speckit-tasks': 'tasks',
  'speckit-implement': 'implement',
}

/** A skill may be named bare or with a plugin prefix (`spec-kit:speckit-plan`). */
export const skillHint = (name: string): SkillHint | undefined => {
  const bare = name.trim().replace(/^\/+/, '').split(':').at(-1) ?? ''
  if (bare === 'speckit-analyze') return { analyze: true }
  const step = STEPS[bare]
  return step === undefined ? undefined : { step }
}
