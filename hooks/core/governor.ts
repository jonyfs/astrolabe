// Usage governance policy (spec 008, contracts/governor.md). Pure: no $.
import type { QueuedAgent, UsageAnswer, UsageQuestion, UsageReading } from './types'

export type Band = 'ok' | 'throttle' | 'hold' | 'stop' | 'ceiling'
export type Decision = { band: Band; cap: number; highest?: { kind: string; percent: number; resetsAt?: string } }

const MAX_FANOUT = 6
const PROJECTION_WINDOW_MS = 30 * 60_000
const READ_ONLY = new Set(['Read', 'Grep', 'Glob', 'LS', 'NotebookRead', 'WebFetch', 'WebSearch', 'TodoWrite', 'Skill'])

const LABELS: Readonly<Record<string, string>> = { five_hour: '5h', seven_day: '7d' }
const labelOf = (kind: string): string => LABELS[kind] ?? kind.replace(/_/g, ' ')

/** Where the highest window will be at its reset, from the recent burn rate. */
const projected = (percent: number, resetsAt: string | undefined, history: ReadonlyArray<{ at: number; percent: number }>, now: number) => {
  const reset = resetsAt === undefined ? Number.NaN : Date.parse(resetsAt)
  const recent = history.filter(h => now - h.at <= PROJECTION_WINDOW_MS)
  const first = recent[0]
  const last = recent.at(-1)
  if (Number.isNaN(reset) || first === undefined || last === undefined || last.at <= first.at) return percent
  const rate = (last.percent - first.percent) / (last.at - first.at)
  return rate > 0 ? percent + rate * Math.max(0, reset - now) : percent
}

export const decide = (
  readings: readonly UsageReading[],
  history: ReadonlyArray<{ at: number; percent: number }>,
  override: { target: number; until: number } | undefined,
  now: number,
  /** Until when the owner let subagents through the hold, one at a time (015). */
  holdLift?: number,
): Decision => {
  const top = [...readings].sort((a, b) => b.percentUsed - a.percentUsed)[0]
  if (top === undefined) return { band: 'ok', cap: MAX_FANOUT }
  const p = top.percentUsed
  const highest = { kind: top.kind, percent: p, ...(top.resetsAt === undefined ? {} : { resetsAt: top.resetsAt }) }
  const lifted = override !== undefined && override.until > now ? override.target : undefined
  if (p >= (lifted ?? 90)) return { band: 'ceiling', cap: 0, highest }
  if (p >= (lifted ?? 88)) return { band: 'stop', cap: 0, highest }
  if (p >= 80) return holdLift !== undefined && holdLift > now ? { band: 'throttle', cap: 1, highest } : { band: 'hold', cap: 0, highest }
  const ahead = projected(p, top.resetsAt, history, now) >= 80
  if (p >= 60 || ahead) return { band: 'throttle', cap: p >= 70 || ahead ? 1 : 3, highest }
  return { band: 'ok', cap: MAX_FANOUT, highest }
}

export const usageSegment = (d: Decision): string | undefined => {
  if (d.highest === undefined) return undefined
  const text = `${labelOf(d.highest.kind)} ${Math.round(d.highest.percent)}%`
  return d.band === 'ok' ? text : `${text} ${d.band}`
}

export const isReadOnlyTool = (name: string): boolean => READ_ONLY.has(name)

export const isPaused = (d: Decision): boolean => d.band === 'stop' || d.band === 'ceiling'

export const refusal = (d: Decision, ctx: { queuedAs?: string; inFlight?: number; resetClock?: string }): string => {
  const usage = d.highest === undefined ? 'usage' : `usage ${labelOf(d.highest.kind)} ${Math.round(d.highest.percent)}%`
  const until = ctx.resetClock === undefined ? 'the reset' : ctx.resetClock
  if (isPaused(d)) return `🧭 ${usage} (${d.band}): paused until ${until}; only read-only tools run`
  if (d.band === 'throttle') {
    const n = ctx.inFlight ?? 0
    return `🧭 ${usage} (throttle, cap ${d.cap}): ${n} ${n === 1 ? 'subagent' : 'subagents'} running; queued as ${ctx.queuedAs ?? '?'}`
  }
  return `🧭 ${usage} (${d.band}): new subagents are queued until ${until}; queued as ${ctx.queuedAs ?? '?'}`
}

/** The refusal for a subagent the owner chose to drop (015). */
export const dropped = (d: Decision): string => `🧭 ${usageText(d)} (${d.band}): dropped at your request; nothing was queued`

export const resumePrompt = (queue: readonly QueuedAgent[], usage: string): string =>
  queue.length === 0
    ? `Usage window renewed (${usage}). Continue the work that was paused.`
    : [
        `Usage window renewed (${usage}). Re-dispatch these queued subagents with the Agent tool, one at a time:`,
        ...queue.map((q, i) => `${i + 1}. ${q.description}: ${q.prompt}`),
      ].join('\n')

export const parseAllow = (args: string): { allow: { target: number; ms: number } } | { revoke: true } | undefined => {
  const text = args.trim()
  if (text === 'revoke') return { revoke: true }
  const m = /^allow\s+(\d{2})\s+(\d+)(m|h)$/.exec(text)
  if (m === null) return undefined
  const target = Number(m[1])
  const ms = Number(m[2]) * (m[3] === 'h' ? 3_600_000 : 60_000)
  if (target < 90 || target > 99 || ms < 30 * 60_000 || ms > 12 * 3_600_000) return undefined
  return { allow: { target, ms } }
}

export type Answer = UsageAnswer
export type Question = UsageQuestion

/** How long a question waits for the person before its default goes ahead. */
export const ASK_MS = 60_000
export const HOLD_LIFT_MS = 3_600_000
export const EXTEND_MS = 30 * 60_000
export const RAISE_MS = 2 * 3_600_000

const usageText = (d: Decision): string =>
  d.highest === undefined ? 'usage' : `usage ${labelOf(d.highest.kind)} ${Math.round(d.highest.percent)}%`

/** A ceiling at least `floor`, two points above usage, at most 99; undefined when that is not above usage. */
const ceilingFor = (percent: number, floor: number): number | undefined => {
  const target = Math.min(99, Math.max(floor, Math.floor(percent) + 2))
  return target > percent ? target : undefined
}

export const holdQuestion = (d: Decision, description: string, resetClock?: string): Question => ({
  kind: 'hold',
  text: `🧭 ${usageText(d)} (${d.band}): a new subagent, "${description}". What now?`,
  options: [
    { value: 'queue', label: `Queue it until ${resetClock ?? 'the reset'}` },
    { value: 'run', label: 'Run this one now' },
    { value: 'lift', label: 'Allow subagents for 1 hour, one at a time' },
    { value: 'drop', label: 'Drop this request' },
  ],
  fallback: 'queue',
})

export const pauseQuestion = (d: Decision, tool: string, resetClock?: string): Question => {
  const percent = d.highest?.percent ?? 0
  const extend = ceilingFor(percent, 91)
  const raise = ceilingFor(percent, 95)
  return {
    kind: 'pause',
    text: `🧭 ${usageText(d)} (${d.band}): Claude wants to run ${tool}. What now?`,
    options: [
      { value: 'pause', label: `Pause until ${resetClock ?? 'the reset'}` },
      ...(extend === undefined ? [] : [{ value: 'extend', label: `Continue for 30 more minutes (ceiling ${extend}%)`, target: extend }]),
      ...(raise === undefined ? [] : [{ value: 'raise', label: `Raise the ceiling to ${raise}% for 2 hours`, target: raise }]),
    ],
    fallback: 'pause',
  }
}

/** HH:MM in local time for an ISO timestamp, or undefined. */
export const clockOf = (iso: string | undefined): string | undefined => {
  if (iso === undefined) return undefined
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return undefined
  const d = new Date(t)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
