// What the session memo keeps of each file (spec 009): only what derivation reads, so the
// memo stays small however large the specs are. Pure: no $.
import { hasClarification } from './clarification'
import { classifyConstitution } from './constitution'
import { parseTasks } from './tasks-parser'
import type { FeatureFiles } from './types'

const CLARIFICATION = '[NEEDS CLARIFICATION'

/** The front matter block, then a clarification marker when the spec still has one. */
export const compactSpec = (text: string): string => {
  const lines = text.split(/\r?\n/)
  const end = lines[0]?.trim() === '---' ? lines.findIndex((l, i) => i > 0 && l.trimEnd() === '---') : -1
  const front = end > 0 ? `${lines.slice(0, end + 1).join('\n')}\n` : ''
  return hasClarification(text) ? `${front}${CLARIFICATION}]\n` : front
}

/** The task lines alone, re-written in one canonical form. */
export const compactTasks = (text: string): string =>
  parseTasks(text)
    .map(t => `- [${t.isDone ? 'x' : ' '}] ${t.id === undefined ? '' : `${t.id} `}${t.text}\n`)
    .join('')

/** A stand-in that classifies like the constitution: missing, template or ratified. */
export const compactConstitution = (text: string | undefined): string | undefined => {
  if (text === undefined) return undefined
  return classifyConstitution(text) === 'template' ? '[TEMPLATE]' : ''
}

export const compactFiles = (files: FeatureFiles): FeatureFiles =>
  files.compact === true
    ? files
    : {
        dir: files.dir,
        plan: files.plan,
        ...(files.spec === undefined ? {} : { spec: compactSpec(files.spec) }),
        ...(files.tasks === undefined ? {} : { tasks: compactTasks(files.tasks) }),
        compact: true,
      }
