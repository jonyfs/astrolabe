// Reads checkbox tasks out of a tasks.md. Pure: no $.
import type { Task } from './types'

const CHECKBOX = /^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/
const FENCE = /^\s*(```|~~~)/
const ID = /^\**(T\d+)\**[:.]?(?=\s|$)/
const HEADING = /^#{2,4}\s+(.+?)\s*#*$/

/** The task list without its ticks (054 #59): changes when a task is added, removed or reworded, not when one is ticked. */
export const tasksFingerprint = (text: string | undefined): string => {
  let hash = 5381
  for (const t of parseTasks(text ?? '')) for (const ch of `${t.id ?? ''} ${t.text}\n`) hash = ((hash * 33) ^ ch.charCodeAt(0)) >>> 0
  return hash.toString(36)
}

export const parseTasks = (text: string): Task[] => {
  const tasks: Task[] = []
  let fence: string | undefined
  let hasId = false
  let story: string | undefined
  const lines = text.split('\n')
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index] ?? ''
    // Cheap filters first: most lines hold neither a fence nor a checkbox.
    if (raw.includes('```') || raw.includes('~~~')) {
      const marker = FENCE.exec(raw)?.[1]
      if (marker !== undefined && (fence === undefined || fence === marker)) {
        fence = fence === undefined ? marker : undefined
        continue
      }
    }
    if (fence === undefined && raw.startsWith('#')) {
      const heading = HEADING.exec(raw.trimEnd())?.[1]
      if (heading !== undefined) story = heading
      continue
    }
    if (fence !== undefined || !raw.includes('[')) continue
    const match = CHECKBOX.exec(raw.endsWith('\r') ? raw.slice(0, -1) : raw)
    if (!match) continue
    const rest = (match[2] ?? '').trim()
    const idMatch = rest.startsWith('T') || rest.startsWith('*') ? ID.exec(rest) : null
    const isDone = match[1] !== ' '
    if (idMatch === null) {
      tasks.push({ text: rest, isDone, line: index + 1, ...(story === undefined ? {} : { story }) })
    } else {
      hasId = true
      tasks.push({ id: idMatch[1] ?? '', text: rest.slice(idMatch[0].length).trim(), isDone, line: index + 1, ...(story === undefined ? {} : { story }) })
    }
  }
  return hasId ? tasks.filter(t => t.id !== undefined) : tasks
}

export const currentTaskOf = (tasks: readonly Task[]): { id?: string; text: string } | undefined => {
  const open = tasks.find(t => !t.isDone)
  if (open === undefined) return undefined
  return open.id === undefined ? { text: open.text } : { id: open.id, text: open.text }
}
