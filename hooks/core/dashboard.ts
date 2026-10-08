// The Dashboard tab (spec 018): the astrolabe dial, features by phase, usage over the
// session and the session's KPIs. Charts are cell grids (cells.ts). Pure: no $.
import { blank, put, write, type Grid } from './cells'
import { labelOf } from './governor'
import { t as tr, type Lang } from './i18n'
import type { Tokens } from './theme'
import type { Feature, Phase, SessionStats } from './types'

const CYCLE: readonly Phase[] = ['specify', 'clarify', 'plan', 'tasks', 'implement', 'done']

/** Where each step sits around the dial, and the needle that points at it from the centre. */
const SPOTS: Readonly<Record<string, { needle: string; nx: number; ny: number; side: 'top' | 'left' | 'right' | 'bottom'; y: number }>> = {
  specify: { needle: '↑', nx: 20, ny: 2, side: 'top', y: 0 },
  clarify: { needle: '↗', nx: 22, ny: 2, side: 'right', y: 2 },
  plan: { needle: '↘', nx: 22, ny: 4, side: 'right', y: 4 },
  tasks: { needle: '↓', nx: 20, ny: 4, side: 'bottom', y: 6 },
  implement: { needle: '↙', nx: 18, ny: 4, side: 'left', y: 4 },
  done: { needle: '↖', nx: 18, ny: 2, side: 'left', y: 2 },
}

/** An astrolabe: the Spec Kit cycle as a ring, the active step marked and pointed at. */
export const dial = (active: Phase | undefined, tokens: Tokens): Grid => {
  const g = blank(40, 7)
  const ring = tokens.muted
  write(g, 13, 1, `╭${'─'.repeat(13)}╮`, ring)
  for (const y of [2, 3, 4]) {
    put(g, 13, y, '│', ring)
    put(g, 27, y, '│', ring)
  }
  write(g, 13, 5, `╰${'─'.repeat(13)}╯`, ring)
  put(g, 20, 3, '✦', tokens.accent)
  const at = active === undefined ? -1 : CYCLE.indexOf(active)
  for (const [i, step] of CYCLE.entries()) {
    const spot = SPOTS[step]!
    const isActive = i === at
    const mark = isActive ? '●' : at >= 0 && i < at ? '✓' : '○'
    const color = isActive ? tokens.current : at >= 0 && i < at ? tokens.done : tokens.pending
    const label = `${mark} ${step}`
    const x = spot.side === 'left' ? 12 - label.length : spot.side === 'right' ? 29 : 20 - Math.floor(label.length / 2)
    write(g, x, spot.y, label, color)
    if (isActive) put(g, spot.nx, spot.ny, spot.needle, tokens.current)
  }
  return g
}

/** One bar per phase that has features, scaled to the widest, the count after it. */
export const phaseBars = (features: readonly Feature[], width: number, tokens: Tokens, activePhase?: Phase): Grid | undefined => {
  if (width < 20) return undefined
  const order: Phase[] = [...CYCLE, 'abandoned']
  const counts = order.map(p => [p, features.filter(f => f.phase === p).length] as const).filter(([, n]) => n > 0)
  if (counts.length === 0) return undefined
  const max = Math.max(...counts.map(([, n]) => n))
  const room = width - 10 - String(max).length - 1
  const rows = counts.map(([phase, n]) => ({ phase, n, bar: Math.max(1, Math.round((n * room) / max)) }))
  const columns = Math.max(...rows.map(r => 10 + r.bar + 1 + String(r.n).length))
  const g = blank(columns, rows.length)
  rows.forEach((r, y) => {
    const color = r.phase === 'done' ? tokens.done : r.phase === activePhase ? tokens.current : r.phase === 'abandoned' ? tokens.pending : tokens.barFill
    write(g, 0, y, r.phase.padEnd(10), tokens.text)
    write(g, 10, y, '█'.repeat(r.bar), color)
    write(g, 10 + r.bar + 1, y, String(r.n), tokens.muted)
  })
  return g
}

/** Points an hour from the first to the last reading; undefined with fewer than two. */
export const burnRate = (series: SessionStats['series']): number | undefined => {
  const first = series[0]
  const last = series.at(-1)
  if (first === undefined || last === undefined || last.at <= first.at) return undefined
  return ((last.percent - first.percent) * 3_600_000) / (last.at - first.at)
}

export type ChartOptions = { width: number; height: number; resetsAt?: string; now: number; tokens: Tokens }

/**
 * A line chart in the manner of asciichart: a 0 to 100% axis, the readings as dots joined
 * by vertical strokes, and a dotted projection to the reset at the current burn rate.
 */
export const usageChart = (series: SessionStats['series'], o: ChartOptions): Grid | undefined => {
  if (series.length === 0 || o.width < 30 || o.height < 3) return undefined
  const g = blank(o.width, o.height)
  const rowOf = (percent: number) => Math.round(((100 - Math.max(0, Math.min(100, percent))) * (o.height - 1)) / 100)
  for (let y = 0; y < o.height; y += 1) {
    const value = Math.round(100 - (y * 100) / (o.height - 1))
    write(g, 0, y, `${String(value).padStart(3)}${y === o.height - 1 ? '┼' : '┤'}`, o.tokens.muted)
  }
  const plot = o.width - 5
  const reset = o.resetsAt === undefined ? Number.NaN : Date.parse(o.resetsAt)
  const rate = burnRate(series)
  const hasProjection = !Number.isNaN(reset) && reset > o.now && rate !== undefined
  const pointCols = hasProjection ? Math.max(2, Math.floor(plot * 0.7)) : plot
  const points = series.slice(-pointCols)
  let prev: number | undefined
  points.forEach((p, i) => {
    const x = 5 + i
    const y = rowOf(p.percent)
    if (prev !== undefined && prev !== y) {
      for (let r = Math.min(prev, y) + 1; r < Math.max(prev, y); r += 1) put(g, x, r, '│', o.tokens.barFill)
    }
    put(g, x, y, '●', o.tokens.accent)
    prev = y
  })
  if (hasProjection) {
    const last = points.at(-1)!
    const end = last.percent + (rate! * (reset - o.now)) / 3_600_000
    const from = 5 + points.length
    const span = o.width - from
    for (let i = 0; i < span; i += 1) {
      const value = last.percent + ((end - last.percent) * (i + 1)) / span
      put(g, from + i, rowOf(value), '·', value >= 80 ? o.tokens.current : o.tokens.pending)
    }
  }
  return g
}

const duration = (ms: number) => {
  const m = Math.max(0, Math.floor(ms / 60_000))
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}m`
}

/** The KPI rows, label then value; a value the session does not have is left out. */
export const kpiRows = (
  stats: SessionStats,
  binding: { kind: string; percent: number; resetsAt?: string } | undefined,
  now: number,
  lang: Lang = 'en',
): Array<[string, string]> => {
  const rows: Array<[string, string]> = [
    [tr(lang, 'kpi.turns'), String(stats.turns)],
    [tr(lang, 'kpi.toolCalls'), String(stats.toolCalls)],
    [tr(lang, 'kpi.drifts'), String(stats.drifts)],
    [tr(lang, 'kpi.subagents'), tr(lang, 'kpi.subagentsValue', { run: stats.agentsRun, queued: stats.agentsQueued })],
  ]
  if (stats.context !== undefined) rows.push([tr(lang, 'kpi.context'), `${Math.round(stats.context.percent)}%`])
  rows.push([tr(lang, 'kpi.session'), duration(now - stats.startedAt)])
  // Pace (054 #31, #33): tasks ticked an hour, and turns per ticked task to see when Claude spins.
  const ticked = (stats.turnTicks ?? []).reduce((sum, t) => sum + t.n, 0)
  const hours = (now - stats.startedAt) / 3_600_000
  if (ticked > 0 && hours > 0) rows.push([tr(lang, 'kpi.pace'), tr(lang, 'kpi.paceValue', { n: (ticked / hours).toFixed(1) })])
  if (ticked > 0) rows.push([tr(lang, 'kpi.turnsPerTask'), (stats.turns / ticked).toFixed(1)])
  if (stats.compactions !== undefined) rows.push([tr(lang, 'kpi.compactions'), tr(lang, 'kpi.compactionsValue', { n: stats.compactions.n, freed: stats.compactions.freed })])
  const rate = burnRate(stats.series)
  if (rate !== undefined) rows.push([tr(lang, 'kpi.burn'), tr(lang, 'kpi.burnValue', { n: Math.round(rate) })])
  const reset = binding?.resetsAt === undefined ? Number.NaN : Date.parse(binding.resetsAt)
  if (binding !== undefined && rate !== undefined && !Number.isNaN(reset) && reset > now) {
    const at = Math.min(100, Math.max(0, binding.percent + (rate * (reset - now)) / 3_600_000))
    rows.push([tr(lang, 'kpi.atReset'), tr(lang, 'kpi.atResetValue', { window: labelOf(binding.kind), p: Math.round(at) })])
  }
  return rows
}

/** The Dashboard's first row (046 #51): tasks done, burn rate and context, as short chips; a level ramps the colour (052 #30). */
export const kpiChips = (
  stats: SessionStats | undefined,
  feature: Feature | undefined,
  lang: Lang = 'en',
  /** The deciding window and now, for where it lands at its reset (054 #23). */
  binding?: { kind: string; percent: number; resetsAt?: string },
  now?: number,
): Array<{ text: string; level?: number }> => {
  const out: Array<{ text: string; level?: number }> = []
  if (feature !== undefined && feature.total > 0) out.push({ text: tr(lang, 'chip.tasks', { done: feature.done, total: feature.total }) })
  const rate = stats === undefined ? undefined : burnRate(stats.series)
  // A burn of 30 points an hour empties a window in a little over 3 hours: that is red.
  if (rate !== undefined) out.push({ text: tr(lang, 'chip.burn', { n: Math.round(rate) }), level: Math.min(100, Math.round(rate * 3)) })
  if (stats?.context !== undefined) out.push({ text: `${tr(lang, 'kpi.context')} ${Math.round(stats.context.percent)}%`, level: stats.context.percent })
  const reset = binding?.resetsAt === undefined ? Number.NaN : Date.parse(binding.resetsAt)
  if (binding !== undefined && rate !== undefined && now !== undefined && !Number.isNaN(reset) && reset > now) {
    const at = Math.min(100, Math.max(0, Math.round(binding.percent + (rate * (reset - now)) / 3_600_000)))
    out.push({ text: tr(lang, 'chip.atReset', { window: labelOf(binding.kind), p: at }), level: at })
  }
  return out
}

/** One sparkline row per window and for the context (046 #53, #57), from the last 24 readings that carry it. */
export const trendRows = (series: SessionStats['series'], lang: Lang = 'en'): Array<[string, string]> => {
  const recent = series.slice(-24)
  const rows: Array<[string, string]> = []
  const line = (label: string, values: number[]) => {
    if (values.length >= 2) rows.push([label, `${sparkline(values)} ${Math.round(values.at(-1)!)}%`])
  }
  line('5h', recent.flatMap(p => (p.fiveHour === undefined ? [] : [p.fiveHour])))
  line('7d', recent.flatMap(p => (p.sevenDay === undefined ? [] : [p.sevenDay])))
  line(tr(lang, 'kpi.context'), recent.flatMap(p => (p.context === undefined ? [] : [p.context])))
  return rows
}

const BLOCKS = '▁▂▃▄▅▆▇█'

/** A sparkline of percentages, one block per point (022 #25). */
export const sparkline = (values: readonly number[]): string =>
  values.map(v => BLOCKS[Math.min(7, Math.max(0, Math.round((Math.max(0, Math.min(100, v)) * 7) / 100)))]).join('')
