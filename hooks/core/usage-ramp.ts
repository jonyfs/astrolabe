// One usage ramp for context, 5h, 7d and the spend limit (064 #1). Pure: no $.
// Below 60 a value reads done with no mark; from 60 yellow with ▵; from the window's hold
// level (80 by default) blocked with ▴; at 100 or more `full` is printed beside the reset.
import type { ThemeRole } from './theme'

export type RampLevel = 'ok' | 'warn' | 'block'
export type UsageRamp = {
  level: RampLevel
  role: ThemeRole
  /** The statusline chip colour of the same level. */
  chip: 'green' | 'yellow' | 'red'
  mark: '' | '▵' | '▴'
  full: boolean
}

export const WARN_AT = 60
export const BLOCK_AT = 80

const OK: UsageRamp = { level: 'ok', role: 'done', chip: 'green', mark: '', full: false }
const WARN: UsageRamp = { level: 'warn', role: 'warn', chip: 'yellow', mark: '▵', full: false }
const BLOCK: UsageRamp = { level: 'block', role: 'blocked', chip: 'red', mark: '▴', full: false }

/** The level of a usage percent; `thresholds.hold` is the window's own block level (047 #66). */
export const usageRamp = (percent: number | undefined, thresholds?: { hold?: number; stop?: number }): UsageRamp => {
  if (percent === undefined || !Number.isFinite(percent)) return OK
  const blockAt = thresholds?.hold ?? BLOCK_AT
  const warnAt = Math.min(WARN_AT, blockAt)
  const base = percent >= blockAt ? BLOCK : percent >= warnAt ? WARN : OK
  return percent >= 100 ? { ...base, full: true } : base
}
