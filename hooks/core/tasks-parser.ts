// Reads checkbox tasks out of a tasks.md. Pure: no $.
import type { Task } from './types'

const CHECKBOX = /^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/
const FENCE = /^\s*(```|~~~)/
const ID = /^\**(T\d+)\**(?=\s|$)/

export const parseTasks = (text: string): Task[] => {
  const tasks: Task[] = []
  let isFenced = false
  text.split(/\r?\n/).forEach((raw, index) => {
    if (FENCE.test(raw)) {
      isFenced = !isFenced
      return
    }
    if (isFenced) return
    const match = CHECKBOX.exec(raw)
    if (!match) return
    const rest = (match[2] ?? '').trim()
    const id = ID.exec(rest)?.[1]
    const body = id === undefined ? rest : rest.replace(ID, '').trim()
    tasks.push({ ...(id === undefined ? {} : { id }), text: body, isDone: match[1] !== ' ', line: index + 1 })
  })
  return tasks.some(t => t.id !== undefined) ? tasks.filter(t => t.id !== undefined) : tasks
}

export const currentTaskOf = (tasks: readonly Task[]): { id?: string; text: string } | undefined => {
  const open = tasks.find(t => !t.isDone)
  if (open === undefined) return undefined
  return open.id === undefined ? { text: open.text } : { id: open.id, text: open.text }
}
