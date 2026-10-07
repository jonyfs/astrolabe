// Tells a ratified constitution from Spec Kit's template. Pure: no $.
import type { ConstitutionState } from './types'

const PLACEHOLDER = /\[[A-Z][A-Z0-9_]+\]/

export const classifyConstitution = (text: string | undefined): ConstitutionState => {
  if (text === undefined) return 'missing'
  return PLACEHOLDER.test(text) ? 'template' : 'ratified'
}
