// Time per task, the finish estimate and the weekly history (spec 021). Pure: no $.

export type TaskTime = { dir: string; id: string; ms: number }
export type Weeks = Record<string, { tasks: number; features: number }>

const WEEKS_KEPT = 12

/** The `count` slowest tasks of a feature. */
export const slowest = (times: readonly TaskTime[], dir: string, count: number): TaskTime[] =>
  times
    .filter(t => t.dir === dir)
    .sort((a, b) => b.ms - a.ms)
    .slice(0, count)

/** The feature's average time per task times its open tasks; undefined without both. */
export const estimateLeft = (times: readonly TaskTime[], dir: string, open: number): number | undefined => {
  const own = times.filter(t => t.dir === dir)
  if (own.length === 0 || open === 0) return undefined
  return Math.round(own.reduce((sum, t) => sum + t.ms, 0) / own.length) * open
}

/** When the open tasks, at the feature's pace, end after the window's reset (045 #50): the time left, else undefined. */
export const pastReset = (times: readonly TaskTime[], dir: string, open: number, resetsAt: string | undefined, now: number): number | undefined => {
  const left = estimateLeft(times, dir, open)
  const reset = resetsAt === undefined ? Number.NaN : Date.parse(resetsAt)
  if (left === undefined || Number.isNaN(reset) || reset <= now || now + left <= reset) return undefined
  return left
}

/** The ISO 8601 week of a time, as `2026-W41` (weeks start on Monday, in UTC). */
export const weekKey = (at: number): string => {
  const d = new Date(at)
  const day = (d.getUTCDay() + 6) % 7
  const thursday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day + 3)
  const year = new Date(thursday).getUTCFullYear()
  const week = 1 + Math.floor((thursday - Date.UTC(year, 0, 4)) / (7 * 86_400_000) + ((new Date(Date.UTC(year, 0, 4)).getUTCDay() + 6) % 7) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

/** Adds a week's counts, keeping the last 12 weeks. */
export const addWeek = (weeks: Weeks, key: string, tasks: number, features: number): Weeks => {
  const before = weeks[key] ?? { tasks: 0, features: 0 }
  const next: Weeks = { ...weeks, [key]: { tasks: before.tasks + tasks, features: before.features + features } }
  const keys = Object.keys(next).sort()
  return Object.fromEntries(keys.slice(-WEEKS_KEPT).map(k => [k, next[k]!]))
}
