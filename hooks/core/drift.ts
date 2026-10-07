// The drift alarm (FR-003 to FR-005): a task ticked with no code edited since the
// previous tick. Pure: no $.
import { parseTasks } from './tasks-parser'
import type { DriftWindow, Task } from './types'

const keyOf = (t: Task): string => t.id ?? t.text

/** Tasks that were open in `before` and are ticked in `after`. */
export const newlyTicked = (before: string | undefined, after: string | undefined): Task[] => {
  if (before === undefined || after === undefined) return []
  const open = new Set(parseTasks(before).filter(t => !t.isDone).map(keyOf))
  return parseTasks(after).filter(t => t.isDone && open.has(keyOf(t)))
}

const PATHISH = /^(?:\.\/)?[\w@.-]+(?:\/[\w@.-]+)*$/
const looksLikePath = (token: string): boolean =>
  PATHISH.test(token) && (token.includes('/') || /\.[A-Za-z][A-Za-z0-9]{0,5}$/.test(token)) && !/^\d+(\.\d+)+$/.test(token)

/** File paths a task text names: backticked tokens and bare tokens with a slash or an extension. */
export const namedPaths = (text: string): string[] => {
  const found: string[] = []
  const add = (raw: string) => {
    const token = raw.replace(/^\.\//, '').replace(/[.,;:]+$/, '')
    if (looksLikePath(token) && !found.includes(token)) found.push(token)
  }
  for (const m of text.matchAll(/`([^`\s]+)`/g)) add(m[1] ?? '')
  const bare = text.replace(/`[^`]*`/g, ' ')
  for (const word of bare.split(/\s+/)) if (word.includes('/') || /\.[A-Za-z]{1,6}[.,;:]?$/.test(word)) add(word)
  return found.filter(p => p.includes('/') || /\.(?:[a-z]{1,6})$/i.test(p)).filter(p => !/^(?:e\.g|i\.e)\.?$/i.test(p))
}

export const withEdit = (window: DriftWindow, path: string): DriftWindow =>
  window.edits.includes(path) ? window : { ...window, edits: [...window.edits, path] }

export const withShell = (window: DriftWindow): DriftWindow => (window.sawShell ? window : { ...window, sawShell: true })

const nameOf = (t: Task): string => {
  if (t.id !== undefined) return t.id
  const chars = [...t.text]
  return `"${chars.length > 40 ? `${chars.slice(0, 40).join('')}…` : t.text}"`
}

const matches = (edit: string, named: string): boolean => edit === named || edit.endsWith(`/${named}`) || named.endsWith(`/${edit}`)

/** The drift toast text for a newly ticked task, or undefined when the window shows work. */
export const detectDrift = (task: Task, window: DriftWindow): string | undefined => {
  if (window.sawShell) return undefined
  const named = namedPaths(task.text)
  if (named.length > 0) {
    const isEdited = named.some(p => window.edits.some(e => matches(e, p)))
    return isEdited ? undefined : `🧭 ${nameOf(task)} was ticked, but none of its files were edited: ${named.join(', ')}`
  }
  return window.edits.length === 0 ? `🧭 ${nameOf(task)} was ticked with no code edited since the last tick` : undefined
}
