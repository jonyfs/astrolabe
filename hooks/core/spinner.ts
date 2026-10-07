// The text the spinner adds after its word while Claude works on the active feature
// (contracts/spinner.md). Pure: no $.
import type { SessionMemo, SpeckitState } from './types'

const DEFAULT_BUDGET = 80
const ENGINE_COLUMNS = 40

const width = (text: string): number => [...text].length

export const cleanTaskText = (text: string): string =>
  text
    .replace(/\[(P|US\d+)\]/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim()

export const formatElapsed = (ms: number): string => {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

/** Whether this turn worked on the active feature: speckit-implement ran, or a tool touched it. */
const isWorkingOnActive = (state: SpeckitState, memo: SessionMemo): boolean =>
  memo.runningSkill?.step === 'implement' || (state.active !== undefined && memo.touched.includes(state.active.dir))

export const spinnerSuffix = (state: SpeckitState, memo: SessionMemo, now: number, columns?: number): string | undefined => {
  const task = state.currentTask
  if (!state.present || state.active === undefined || task === undefined || !(state.isWorkingOnActive ?? isWorkingOnActive(state, memo))) return undefined
  const budget = columns === undefined ? DEFAULT_BUDGET : columns - ENGINE_COLUMNS
  const head = task.id === undefined ? '… ' : `… ${task.id} · `
  const tail = task.startedAt === undefined ? '' : ` · ${formatElapsed(now - task.startedAt)}`
  const text = cleanTaskText(task.text)
  if (text === '') {
    const bare = task.id === undefined ? undefined : `… ${task.id}${tail}`
    return bare !== undefined && width(bare) <= budget ? bare : undefined
  }
  const full = `${head}${text}${tail}`
  if (width(full) <= budget) return full
  const room = budget - width(head) - width(tail)
  if (room >= 2) return `${head}${[...text].slice(0, room - 1).join('').trimEnd()}…${tail}`
  const bare = task.id === undefined ? undefined : `… ${task.id}${tail}`
  return bare !== undefined && width(bare) <= budget ? bare : undefined
}
