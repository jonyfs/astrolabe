// Usage governance policy (spec 008, contracts/governor.md). Pure: no $.
import { t, type Lang } from './i18n'
import type { QueuedAgent, UsageAnswer, UsageQuestion, UsageReading, UsageState } from './types'

export type Band = 'ok' | 'throttle' | 'hold' | 'stop' | 'ceiling'
export type Decision = { band: Band; cap: number; highest?: { kind: string; percent: number; resetsAt?: string; renewed?: true } }

const MAX_FANOUT = 6
const PROJECTION_WINDOW_MS = 30 * 60_000
const READ_ONLY = new Set(['Read', 'Grep', 'Glob', 'LS', 'NotebookRead', 'WebFetch', 'WebSearch', 'TodoWrite', 'Skill'])

/** A window kind, short: `five_hour` is `5h`, `seven_day_opus` is `7d opus` (022 per-model windows). */
export const labelOf = (kind: string): string =>
  kind.replace(/^five_hour(_|$)/, '5h$1').replace(/^seven_day(_|$)/, '7d$1').replace(/_/g, ' ')

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

/** The window that entered hold, kept for the hysteresis down to 75% (016). */
export type Held = { kind: string; resetsAt?: string }

const RANK: Readonly<Record<Band, number>> = { ok: 0, throttle: 1, hold: 2, stop: 3, ceiling: 4 }
const REOPEN_BELOW = 75
const SAME_RESET_MS = 5 * 60_000

/** A window whose reset time has passed has renewed: its percentage is unknown until the next reading. */
const isRenewed = (r: UsageReading, now: number): boolean => r.resetsAt !== undefined && Date.parse(r.resetsAt) <= now

const sameWindow = (r: UsageReading, held: Held): boolean => {
  if (r.kind !== held.kind) return false
  if (r.resetsAt === undefined || held.resetsAt === undefined) return r.resetsAt === held.resetsAt
  return Math.abs(Date.parse(r.resetsAt) - Date.parse(held.resetsAt)) <= SAME_RESET_MS
}

const highestOf = (r: UsageReading): NonNullable<Decision['highest']> => ({
  kind: r.kind,
  percent: r.percentUsed,
  ...(r.resetsAt === undefined ? {} : { resetsAt: r.resetsAt }),
})

/**
 * Bands every window against its own thresholds (an override lifts only its own window) and
 * binds on the one in the highest band, then the fuller one (016). A held window stays held
 * down to 75%; a renewed window caps subagents at 1 until it is read again.
 */
export const decide = (
  readings: readonly UsageReading[],
  history: ReadonlyArray<{ at: number; percent: number }>,
  override: { target: number; until: number; kind?: string } | undefined,
  now: number,
  /** Until when the owner let subagents through the hold, one at a time (015). */
  holdLift?: number,
  held?: Held,
): Decision => {
  const live = readings.filter(r => !isRenewed(r, now))
  const renewed = readings.filter(r => isRenewed(r, now))
  const isOverride = override !== undefined && override.until > now
  const bandOf = (r: UsageReading): Band => {
    const lifted = isOverride && (override.kind === undefined || override.kind === r.kind) ? override.target : undefined
    const p = r.percentUsed
    if (p >= (lifted ?? 90)) return 'ceiling'
    if (p >= (lifted ?? 88)) return 'stop'
    if (p >= 80 || (held !== undefined && p >= REOPEN_BELOW && sameWindow(r, held))) return 'hold'
    return 'ok'
  }
  const binding = live
    .map(r => ({ r, band: bandOf(r) }))
    .filter(x => x.band !== 'ok')
    .sort((a, b) => RANK[b.band] - RANK[a.band] || b.r.percentUsed - a.r.percentUsed)[0]
  if (binding !== undefined) {
    const highest = highestOf(binding.r)
    if (binding.band === 'hold' && holdLift !== undefined && holdLift > now) return { band: 'throttle', cap: 1, highest }
    return { band: binding.band, cap: 0, highest }
  }
  const top = [...live].sort((a, b) => b.percentUsed - a.percentUsed)[0]
  const fresh = renewed[0]
  if (top === undefined) return fresh === undefined ? { band: 'ok', cap: MAX_FANOUT } : { band: 'throttle', cap: 1, highest: { ...highestOf(fresh), renewed: true } }
  const p = top.percentUsed
  const ahead = projected(p, top.resetsAt, history, now) >= 80
  const band: Band = p >= 60 || ahead ? 'throttle' : 'ok'
  const cap = band === 'ok' ? MAX_FANOUT : p >= 70 || ahead ? 1 : 3
  if (fresh === undefined) return { band, cap, highest: highestOf(top) }
  // A renewed window may already be full again: one subagent at a time until it is read.
  return { band: 'throttle', cap: 1, highest: band === 'ok' ? { ...highestOf(fresh), renewed: true } : highestOf(top) }
}

/** The held window after a reading: entered at 80%, kept down to 75%, forgotten once renewed. */
export const nextHeld = (readings: readonly UsageReading[], held: Held | undefined, now: number): Held | undefined => {
  const live = readings.filter(r => !isRenewed(r, now))
  const top = live.filter(r => r.percentUsed >= 80).sort((a, b) => b.percentUsed - a.percentUsed)[0]
  if (top !== undefined) return { kind: top.kind, ...(top.resetsAt === undefined ? {} : { resetsAt: top.resetsAt }) }
  if (held === undefined) return undefined
  return live.some(r => sameWindow(r, held) && r.percentUsed >= REOPEN_BELOW) ? held : undefined
}

export const usageSegment = (d: Decision, lang: Lang = 'en'): string | undefined => {
  if (d.highest === undefined) return undefined
  if (d.highest.renewed === true) return `${labelOf(d.highest.kind)} ${t(lang, 'status.renewed')}`
  const text = `${labelOf(d.highest.kind)} ${Math.round(d.highest.percent)}%`
  return d.band === 'ok' ? text : `${text} ${d.band}`
}

export const isReadOnlyTool = (name: string): boolean => READ_ONLY.has(name)

export const isPaused = (d: Decision): boolean => d.band === 'stop' || d.band === 'ceiling'

export const refusal = (d: Decision, ctx: { queuedAs?: string; inFlight?: number; resetClock?: string }): string => {
  const usage = usageText(d)
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

/** The prompt that sends one queued subagent again after the person chose to run it now (017). */
export const runPrompt = (q: QueuedAgent): string =>
  `The person let one queued subagent run now. Dispatch it again with the Agent tool, with this exact prompt:\n${q.description}: ${q.prompt}`

export const resumePrompt = (queue: readonly QueuedAgent[], usage: string, where?: string): string =>
  [
    ...(queue.length === 0
      ? [`Usage window renewed (${usage}). Continue the work that was paused.`]
      : [
          `Usage window renewed (${usage}). Re-dispatch these queued subagents with the Agent tool, one at a time:`,
          ...queue.map((q, i) => `${i + 1}. ${q.description}: ${q.prompt}`),
        ]),
    // Where the work stopped (026 #52), so the resumed turn does not have to look for it.
    ...(where === undefined ? [] : [`The work stopped at ${where}.`]),
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
  d.highest === undefined
    ? 'usage'
    : d.highest.renewed === true
      ? `usage ${labelOf(d.highest.kind)} renewed`
      : `usage ${labelOf(d.highest.kind)} ${Math.round(d.highest.percent)}%`

/** A ceiling at least `floor`, two points above usage, at most 99; undefined when that is not above usage. */
const ceilingFor = (percent: number, floor: number): number | undefined => {
  const target = Math.min(99, Math.max(floor, Math.floor(percent) + 2))
  return target > percent ? target : undefined
}

export const holdQuestion = (d: Decision, description: string, resetClock?: string, lang: Lang = 'en'): Question => ({
  kind: 'hold',
  text: t(lang, 'ask.hold', { usage: usageText(d), band: d.band, description }),
  options: [
    { value: 'queue', label: t(lang, 'ask.queue', { at: resetClock ?? t(lang, 'ask.theReset') }) },
    { value: 'run', label: t(lang, 'ask.run') },
    { value: 'lift', label: t(lang, 'ask.lift') },
    { value: 'drop', label: t(lang, 'ask.drop') },
  ],
  fallback: 'queue',
})

export const pauseQuestion = (d: Decision, tool: string, resetClock?: string, lang: Lang = 'en'): Question => {
  const percent = d.highest?.percent ?? 0
  const extend = ceilingFor(percent, 91)
  const raise = ceilingFor(percent, 95)
  return {
    kind: 'pause',
    text: t(lang, 'ask.pause', { usage: usageText(d), band: d.band, tool }),
    options: [
      { value: 'pause', label: t(lang, 'ask.pauseUntil', { at: resetClock ?? t(lang, 'ask.theReset') }) },
      ...(extend === undefined ? [] : [{ value: 'extend', label: t(lang, 'ask.extend', { n: extend }), target: extend }]),
      ...(raise === undefined ? [] : [{ value: 'raise', label: t(lang, 'ask.raise', { n: raise }), target: raise }]),
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

/** The pane's Session tab rows for the governor (016): label, value. Empty with nothing to say. */
export const usageRows = (usage: UsageState, now: number): Array<[string, string]> => {
  const isOverride = usage.override !== undefined && usage.override.until > now
  const isLift = usage.holdLift !== undefined && usage.holdLift > now
  if (usage.readings.length === 0 && usage.queue.length === 0 && !isOverride && !isLift) return []
  const d = decide(usage.readings, usage.history, usage.override, now, usage.holdLift, usage.held)
  const windows = usage.readings
    .map(r => (isRenewed(r, now) ? `${labelOf(r.kind)} renewed` : `${labelOf(r.kind)} ${Math.round(r.percentUsed)}%`))
    .join(' · ')
  const clock = (at: number) => clockOf(new Date(at).toISOString()) ?? '?'
  return [
    ...(windows === '' ? [] : [['usage', `${windows}: ${d.band}`] as [string, string]]),
    ['subagents', `${usage.inFlight} running, cap ${d.cap}`],
    ...(usage.queue.length === 0
      ? []
      : [['queue', `${usage.queue.length} waiting: ${usage.queue.map(q => `${q.id} ${q.description}`).join(', ')}`] as [string, string]]),
    ...(isOverride && usage.override !== undefined
      ? [
          [
            'override',
            `ceiling ${usage.override.target}% on ${usage.override.kind === undefined ? 'every window' : labelOf(usage.override.kind)} until ${clock(usage.override.until)}`,
          ] as [string, string],
        ]
      : []),
    ...(isLift && usage.holdLift !== undefined ? [['lift', `subagents one at a time until ${clock(usage.holdLift)}`] as [string, string]] : []),
    ...((pace => (pace === undefined ? [] : [['pace', pace] as [string, string]]))(paceRow(usage.readings, usage.history, now))),
  ]
}

/** Where the deciding window should be at its reset, at the pace of the recent readings (022 #32). */
export const paceRow = (
  readings: readonly UsageReading[],
  history: ReadonlyArray<{ at: number; percent: number }>,
  now: number,
  lang: Lang = 'en',
): string | undefined => {
  const top = [...readings].sort((a, b) => b.percentUsed - a.percentUsed)[0]
  const first = history[0]
  const last = history.at(-1)
  const reset = top?.resetsAt === undefined ? Number.NaN : Date.parse(top.resetsAt)
  if (top === undefined || first === undefined || last === undefined || last.at <= first.at || Number.isNaN(reset) || reset <= now) return undefined
  const rate = (last.percent - first.percent) / (last.at - first.at)
  if (rate <= 0) return undefined
  const at = Math.min(100, Math.round(top.percentUsed + rate * (reset - now)))
  return t(lang, 'pace.value', { window: labelOf(top.kind), p: at, at: clockOf(top.resetsAt) ?? '' })
}
