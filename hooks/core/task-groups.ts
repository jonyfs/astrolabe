/** The parts of a task the groups read. */
type Task = { id?: string | undefined; text: string }

/** Where an open task stands in the Tasks tab (054 #27). */
export type TaskGroup = 'current' | 'next' | 'blocked' | 'later'

const ID = /\bT\d{2,4}\b/gi
const DEPENDS = /\b(?:depends on|after|blocked by|requires)\b([^.;\n]*)/i

/** The open task ids a task's text says it waits for: "depends on T003 and T004". */
const waitsFor = (task: Task, openIds: ReadonlySet<string>, selfIndex: number, order: ReadonlyMap<string, number>): string[] => {
  const clause = DEPENDS.exec(task.text)?.[1]
  if (clause === undefined) return []
  const ids = (clause.match(ID) ?? []).map(id => id.toUpperCase())
  return ids.filter(id => openIds.has(id) && (order.get(id) ?? Number.POSITIVE_INFINITY) < selfIndex)
}

/**
 * Groups the open tasks, in file order: the one being worked on, the next one to start (with the
 * [P] run it opens), the ones that wait for an earlier open task, and the rest.
 */
export const groupOpenTasks = (open: readonly Task[], currentId: string | undefined): Array<{ task: Task; group: TaskGroup }> => {
  const order = new Map<string, number>()
  open.forEach((task, index) => {
    if (task.id !== undefined) order.set(task.id.toUpperCase(), index)
  })
  const openIds = new Set(order.keys())
  let nextTaken = false
  let inNextRun = false
  return open.map((task, index) => {
    if (currentId !== undefined && task.id === currentId) return { task, group: 'current' as const }
    if (waitsFor(task, openIds, index, order).length > 0) {
      inNextRun = false
      return { task, group: 'blocked' as const }
    }
    const parallel = task.text.includes('[P]')
    if (!nextTaken) {
      nextTaken = true
      inNextRun = parallel
      return { task, group: 'next' as const }
    }
    if (inNextRun && parallel) return { task, group: 'next' as const }
    inNextRun = false
    return { task, group: 'later' as const }
  })
}
