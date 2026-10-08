// Tells a ratified constitution from Spec Kit's template. Pure: no $.
import type { ConstitutionState } from './types'

const PLACEHOLDER = /\[[A-Z][A-Z0-9_]+\]/

export const classifyConstitution = (text: string | undefined): ConstitutionState => {
  if (text === undefined) return 'missing'
  return PLACEHOLDER.test(text) ? 'template' : 'ratified'
}

/** The `###` headings under `## Core Principles` with their 1-based line, at most 22 (054 #83). */
export const principleHeadings = (text: string): Array<{ name: string; line: number }> => {
  const lines = text.split(/\r?\n/)
  const start = lines.findIndex(l => /^##\s+Core Principles\s*$/i.test(l.trim()))
  if (start < 0) return []
  const out: Array<{ name: string; line: number }> = []
  for (let i = start + 1; i < lines.length && out.length < 22; i += 1) {
    const l = lines[i]!.trim()
    if (/^##\s/.test(l)) break
    if (/^###\s/.test(l)) out.push({ name: l.replace(/^###\s+/, ''), line: i + 1 })
  }
  return out
}
