// The Session tab's usage block (066, board 4): context, 5h and 7d as 20-cell bars with a tick
// at each governor level, the figure with its ramp mark, and when the window resets. Pure: no $.
import { duration, resetIn } from './duration'
import { labelOf } from './governor'
import type { PaneRow } from './pane'
import { usageRamp } from './usage-ramp'
import type { UsageReading } from './types'

const CELLS = 20
const DEFAULT = { cap: 60, hold: 80, stop: 88 } as const

const cellOf = (percent: number): number => Math.min(CELLS - 1, Math.max(0, Math.round((percent / 100) * CELLS)))

const bar = (percent: number, ticks: readonly number[]): string => {
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * CELLS)
  const cells: string[] = Array.from({ length: CELLS }, (_, i) => (i < filled ? '▰' : '▱'))
  for (const level of ticks) cells[cellOf(level)] = '┊'
  return cells.join('')
}

export const usageBarRows = (input: {
  readings: readonly UsageReading[]
  context?: { percent: number }
  thresholds?: Record<string, { hold?: number; stop?: number }>
  now: number
}): PaneRow[] => {
  const { readings, context, thresholds, now } = input
  if (readings.length === 0 && context === undefined) return []
  const rows: PaneRow[] = [{ key: 'usage-head', text: `Usage  ${DEFAULT.cap} cap · ${DEFAULT.hold} hold · ${DEFAULT.stop} pause`, role: 'muted', bold: true }]
  const label = (text: string) => text.padEnd(4)
  if (context !== undefined) {
    const ramp = usageRamp(context.percent)
    rows.push({ key: 'usage-bar-ctx', text: `${label('ctx')} ${bar(context.percent, [DEFAULT.cap, DEFAULT.hold, DEFAULT.stop])}  ${Math.round(context.percent)}%`, role: ramp.role })
  }
  for (const r of readings) {
    const own = thresholds?.[r.kind]
    const hold = own?.hold ?? DEFAULT.hold
    const stop = own?.stop ?? DEFAULT.stop
    const ramp = usageRamp(r.percentUsed, own)
    const left = r.resetsAt === undefined ? undefined : Date.parse(r.resetsAt) - now
    const at = left === undefined || left <= 0 ? '' : `  resets ${left < 86_400_000 ? duration(left) : resetIn(r.resetsAt, now)}`
    const figure = ramp.full ? 'full' : `${Math.round(r.percentUsed)}%`
    rows.push({
      key: `usage-bar-${r.kind}`,
      text: `${label(labelOf(r.kind))} ${bar(r.percentUsed, [DEFAULT.cap, hold, stop])}  ${figure}${ramp.mark}${at}`,
      role: ramp.role,
    })
  }
  return rows
}
