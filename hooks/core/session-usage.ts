// The Session tab's usage block beyond the bars (071, board 4): the note on the deciding
// window, the 24 hour trend and the governor box's state. Pure: no $.
import { duration } from './duration'
import { sparkline } from './dashboard'
import type { Band } from './governor'
import type { UsageReading } from './types'

const LEVELS: ReadonlyArray<[number, 'throttle' | 'hold' | 'stop' | 'ceiling']> = [[60, 'throttle'], [80, 'hold'], [88, 'stop'], [90, 'ceiling']]
const HOUR_MS = 3_600_000

/**
 * The next governor level the deciding window reaches before its reset at the pace of the
 * recent readings: `stop 88% in ≈3h`; undefined when it will not, or without a pace.
 */
export const deciderNote = (
  readings: readonly UsageReading[],
  history: ReadonlyArray<{ at: number; percent: number }>,
  now: number,
): string | undefined => {
  const top = [...readings]
    .filter(r => r.resetsAt === undefined || Date.parse(r.resetsAt) > now)
    .sort((a, b) => b.percentUsed - a.percentUsed)[0]
  const first = history[0]
  const last = history.at(-1)
  if (top === undefined || first === undefined || last === undefined || last.at <= first.at) return undefined
  const rate = (last.percent - first.percent) / (last.at - first.at)
  const ahead = LEVELS.find(([at]) => at > top.percentUsed)
  if (rate <= 0 || ahead === undefined) return undefined
  const ms = (ahead[0] - top.percentUsed) / rate
  const reset = top.resetsAt === undefined ? Number.NaN : Date.parse(top.resetsAt)
  if (!Number.isNaN(reset) && now + ms >= reset) return undefined
  const span = duration(Math.max(1, Math.round(ms / 60_000)) * 60_000)
  return `${ahead[1]} ${ahead[0]}% in ≈${span}`
}

/**
 * The last 24 hours of the binding window: one block per hour (the latest reading of the hour,
 * carried forward), `┄` cells towards the reset at the recent pace, then the label.
 */
export const trend24h = (input: {
  series: ReadonlyArray<{ at: number; percent: number; sevenDay?: number }>
  now: number
  resetsAt?: string
}): string | undefined => {
  const { series, now } = input
  const points = series.filter(p => p.at <= now && now - p.at < 24 * HOUR_MS)
  if (points.length < 3) return undefined
  const valueOf = (p: { percent: number; sevenDay?: number }) => p.sevenDay ?? p.percent
  const cells: number[] = []
  let carried = valueOf(points[0]!)
  for (let h = 23; h >= 0; h -= 1) {
    const from = now - (h + 1) * HOUR_MS
    const to = now - h * HOUR_MS
    const inHour = points.filter(p => p.at > from && p.at <= to)
    if (inHour.length > 0) carried = valueOf(inHour[inHour.length - 1]!)
    cells.push(carried)
  }
  const first = points[0]!
  const last = points[points.length - 1]!
  const reset = input.resetsAt === undefined ? Number.NaN : Date.parse(input.resetsAt)
  const rate = last.at > first.at ? (valueOf(last) - valueOf(first)) / (last.at - first.at) : 0
  const dashes = !Number.isNaN(reset) && reset > now && rate > 0 ? Math.max(1, Math.min(8, Math.round((reset - now) / HOUR_MS))) : 0
  return `${sparkline(cells)}${'┄'.repeat(dashes)}  now${dashes > 0 ? ' → reset' : ''}`
}

/** When the governor box shows and which of its buttons: lift while held or paused, revoke with an override. */
export const governorBoxState = (input: { band: Band; queued: number; override: boolean; lift: boolean }): { show: boolean; lift: boolean; revoke: boolean } => {
  const held = input.band === 'hold' || input.band === 'stop' || input.band === 'ceiling'
  return {
    show: held || input.queued > 0 || input.override || input.lift,
    lift: held,
    revoke: input.override,
  }
}

/** Holds and pauses the log recorded since `since`. */
export const todayCounts = (log: ReadonlyArray<{ at: number; text: string }>, since: number): { holds: number; pauses: number } => {
  let holds = 0
  let pauses = 0
  for (const entry of log) {
    if (entry.at < since) continue
    if (/\((?:stop|ceiling)\)/.test(entry.text)) pauses += 1
    else if (/\((?:hold|throttle)\)/.test(entry.text)) holds += 1
  }
  return { holds, pauses }
}

/** The chips of the active feature, one row (board 4): tasks, minutes per task, turns, cost. A chip with no data is left out. */
export const sessionChips = (input: {
  done: number
  total: number
  taskTimes: ReadonlyArray<{ ms: number }>
  turns: number
  cost?: number
}): string[] => [
  ...(input.total > 0 ? [`${input.done}/${input.total} tasks`] : []),
  ...(input.taskTimes.length > 0 ? [`${Math.max(1, Math.round(input.taskTimes.reduce((n, x) => n + x.ms, 0) / input.taskTimes.length / 60_000))}m/task`] : []),
  ...(input.turns > 0 ? [`${input.turns} turns`] : []),
  ...(input.cost !== undefined && input.cost > 0 ? [`$${input.cost.toFixed(2)}`] : []),
]

/** The next level above the deciding window's figure: `hold at 80% (30 points away)` (078 FR-049). */
export const nextLevelText = (percent: number): string | undefined => {
  const ahead = LEVELS.find(([at]) => at > percent)
  return ahead === undefined ? undefined : `${ahead[1]} at ${ahead[0]}% (${Math.round(ahead[0] - percent)} points away)`
}

type ProjectRow = { key: string; text: string; role: string; label?: string; value?: string; href?: string; action?: unknown }

/**
 * The project as a header (078 FR-050): the root with its branch on one row, the constitution with
 * the active spec on the next, and what runs now on a third; the eight rows it replaces are gone.
 * `now` is the label of the third row.
 */
export const projectHeader = <R extends ProjectRow>(rows: readonly R[], opts: { now: string; labelWidth: number; branch?: string; branchHref?: string }): R[] => {
  const get = (key: string) => rows.find(r => r.key === key)
  const join = (...parts: Array<string | undefined>) => parts.filter((p): p is string => p !== undefined && p !== '').join(' · ')
  const root = get('session-root')
  const constitution = get('session-constitution')
  const merged = new Map<string, R>()
  if (root !== undefined) {
    const value = join(root.value, opts.branch === undefined ? undefined : `⎇ ${opts.branch}`)
    merged.set('session-root', { ...root, value, text: `${root.label ?? ''}${value}`, ...(opts.branchHref === undefined ? {} : { href: opts.branchHref }) })
  }
  if (constitution !== undefined) {
    const value = join(constitution.value, get('session-active')?.value)
    merged.set('session-constitution', { ...constitution, value, text: `${constitution.label ?? ''}${value}` })
  }
  const now = [get('session-next'), get('session-running'), get('session-analyzed'), get('session-current-task')].filter((r): r is R => r !== undefined)
  const nowValue = now.map(r => `${(r.label ?? '').trim()} ${r.value ?? ''}`.trim()).join(' · ')
  const label = opts.now.padEnd(opts.labelWidth)
  const drop = new Set(['session-active', 'session-next', 'session-running', 'session-analyzed', 'session-current-task', 'session-branch'])
  const out: R[] = []
  for (const row of rows) if (!drop.has(row.key)) out.push(merged.get(row.key) ?? row)
  if (nowValue !== '') {
    // After the chips row when there is one, else after the constitution and its principles.
    const chips = out.findIndex(r => r.key === 'session-chips')
    const lastOfConstitution = out.reduce((at, r, i) => (r.key === 'session-constitution' || r.key.startsWith('session-principle-') ? i : at), -1)
    const nowRow = { key: 'session-now', text: `${label}${nowValue}`, role: 'text', label, value: nowValue } as unknown as R
    out.splice(chips >= 0 ? chips + 1 : lastOfConstitution + 1, 0, nowRow)
  }
  return out
}
