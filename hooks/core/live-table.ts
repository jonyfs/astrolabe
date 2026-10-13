// The live table (069 #43, #44): agents, git gates, the prompt cache and usage limits as rows of
// one grid. Pure: no $. The adapter reads state and draws what `layoutLive` returns.
import { duration, resetIn } from './duration'
import { labelOf, type Band } from './governor'
import { t, type Lang } from './i18n'
import type { ThemeRole } from './theme'
import { usageRamp } from './usage-ramp'

export type LiveKind = 'agent' | 'gate' | 'cache' | 'limit'
export type LiveColumn = 'who' | 'where' | 'what' | 'now' | 'level' | 'size' | 'time'
export type LiveRow = {
  kind: LiveKind
  who: string
  where: string
  what: string
  now: string
  /** NOW draws in yellow: a gate waiting on the lock. */
  nowWarn?: true
  level?: { percent: number; role: ThemeRole; mark?: string }
  size: string
  time: string
}

/** The declared width of each column, in cells. */
export const LIVE_WIDTHS: Readonly<Record<LiveColumn, number>> = { who: 10, where: 16, what: 30, now: 20, level: 14, size: 6, time: 9 }
export const LIVE_ORDER: readonly LiveColumn[] = ['who', 'where', 'what', 'now', 'level', 'size', 'time']
/** The order columns leave as the width falls; WHO, WHAT and LEVEL never do. */
export const LIVE_DROP: readonly LiveColumn[] = ['size', 'time', 'now', 'where']
const KIND_ORDER: readonly LiveKind[] = ['agent', 'gate', 'cache', 'limit']
const PER_KIND = 3
const GAUGE_CELLS = 9
const RIGHT: ReadonlySet<LiveColumn> = new Set<LiveColumn>(['size', 'time'])

/** Tokens as `812`, `12k` or `1.2M`. */
export const tokensText = (n: number | undefined): string => {
  if (n === undefined || !Number.isFinite(n) || n < 0) return ''
  if (n < 1000) return String(Math.round(n))
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`
  return `${(n / 1_000_000).toFixed(1)}M`
}

const tierOf = (model: string | undefined): string => /opus|sonnet|haiku/i.exec(model ?? '')?.[0]?.toLowerCase() ?? ''

export type LiveAgent = { id: string; engineId?: string; brief: string; type?: string; model?: string; step?: string; contextPercent?: number; tokens?: number; startedAt: number }

export const agentRows = (agents: readonly LiveAgent[], now: number): LiveRow[] => {
  const shared = new Map<string, number>()
  for (const a of agents) if (a.type !== undefined) shared.set(a.type, (shared.get(a.type) ?? 0) + 1)
  return agents.map(a => ({
    kind: 'agent' as const,
    who: tierOf(a.model),
    where: a.type === undefined || (shared.get(a.type) ?? 0) > 1 ? '' : a.type,
    what: a.brief,
    now: a.step ?? '',
    ...(a.contextPercent === undefined ? {} : { level: { percent: a.contextPercent, role: usageRamp(a.contextPercent).role, mark: usageRamp(a.contextPercent).mark } }),
    size: tokensText(a.tokens),
    time: duration(now - a.startedAt),
  }))
}

export type LiveGate = { pid: number; hook?: string; chain: string[]; where: string; startedAt: number; waiting?: true }

export const gateRows = (gates: readonly LiveGate[], now: number, lang: Lang = 'en'): LiveRow[] =>
  gates.map(g => ({
    kind: 'gate' as const,
    who: g.hook ?? 'gate',
    where: g.where,
    what: g.chain.join(' › '),
    now: g.waiting === true ? t(lang, 'live.waiting') : t(lang, 'live.running'),
    ...(g.waiting === true ? { nowWarn: true as const } : {}),
    size: '',
    time: duration(now - g.startedAt),
  }))

export type LiveCache = { at: number; tokens: number; ttlMs: number }

/** The cache in its last two minutes (ten for an hour entry) and once cold. */
export const cacheRows = (cache: LiveCache | undefined, now: number, lang: Lang = 'en'): LiveRow[] => {
  if (cache === undefined) return []
  const left = cache.at + cache.ttlMs - now
  const warnAt = cache.ttlMs >= 3_600_000 ? 600_000 : 120_000
  if (left > warnAt) return []
  const cold = left <= 0
  const percent = cold ? 0 : Math.round((left * 100) / cache.ttlMs)
  return [
    {
      kind: 'cache',
      who: 'cache',
      where: cache.ttlMs >= 3_600_000 ? '1h' : '5m',
      what: t(lang, cold ? 'live.cache.rewrite' : 'live.cache.reuse'),
      now: cold ? 'cold' : 'warm',
      level: { percent, role: cold ? 'blocked' : 'warn' },
      size: tokensText(cache.tokens),
      time: cold ? '' : duration(left),
    },
  ]
}

const BAND_CELL: Partial<Record<Band, { now: string; rule: 'live.rule.throttle' | 'live.rule.hold' | 'live.rule.stop' | 'live.rule.ceiling' }>> = {
  throttle: { now: 'cap', rule: 'live.rule.throttle' },
  hold: { now: 'hold', rule: 'live.rule.hold' },
  stop: { now: 'pause', rule: 'live.rule.stop' },
  ceiling: { now: 'pause', rule: 'live.rule.ceiling' },
}

export const LIMIT_FROM = 60

export const limitRows = (
  readings: ReadonlyArray<{ kind: string; percentUsed: number; resetsAt?: string }>,
  now: number,
  thresholds: Record<string, { hold?: number; stop?: number }>,
  band: Band,
  lang: Lang = 'en',
): LiveRow[] => {
  const live = readings.filter(r => (r.resetsAt === undefined || Date.parse(r.resetsAt) > now) && r.percentUsed >= LIMIT_FROM)
  const top = Math.max(0, ...readings.map(r => r.percentUsed))
  return live.map(r => {
    const ramp = usageRamp(r.percentUsed, thresholds[r.kind])
    const deciding = r.percentUsed === top && BAND_CELL[band] !== undefined ? BAND_CELL[band] : undefined
    return {
      kind: 'limit' as const,
      who: labelOf(r.kind),
      where: '',
      what: deciding === undefined ? '' : t(lang, deciding.rule),
      now: deciding?.now ?? '',
      level: { percent: Math.round(r.percentUsed), role: ramp.role, mark: ramp.mark },
      size: '',
      time: r.resetsAt === undefined ? '' : resetIn(r.resetsAt, now),
    }
  })
}

export type LiveRowsOption = 'agents' | 'gates' | 'both' | 'off'

export const liveRows = (input: {
  agents: readonly LiveAgent[]
  gates: readonly LiveGate[]
  cache: LiveCache | undefined
  readings: ReadonlyArray<{ kind: string; percentUsed: number; resetsAt?: string }>
  thresholds: Record<string, { hold?: number; stop?: number }>
  band: Band
  now: number
  option: LiveRowsOption
  lang?: Lang
}): LiveRow[] => {
  const lang = input.lang ?? 'en'
  const agents = input.option === 'agents' || input.option === 'both' ? agentRows(input.agents, input.now) : []
  const gates = input.option === 'gates' || input.option === 'both' ? gateRows(input.gates, input.now, lang) : []
  return [...agents, ...gates, ...cacheRows(input.cache, input.now, lang), ...limitRows(input.readings, input.now, input.thresholds, input.band, lang)]
}

/** The glyph of each kind, shared by the table above the prompt and the Session tab (078 FR-053). */
export const KIND_GLYPH: Readonly<Record<LiveKind, string>> = { agent: '◇', gate: '⛭', cache: '◌', limit: '◔' }

export type LiveLine = { kind: LiveKind; rule?: true; cells: Record<LiveColumn, string>; row?: LiveRow }
export type LiveLayout = {
  lines: LiveLine[]
  header: Record<LiveColumn, string>
  columns: LiveColumn[]
  widths: Record<LiveColumn, number>
  reservation: Partial<Record<LiveColumn, number>>
  /** Rows not drawn: the `+N` of each kind. */
  hidden: number
}

const HEADER: Record<LiveColumn, string> = { who: 'WHO', where: 'WHERE', what: 'WHAT', now: 'NOW', level: 'LEVEL', size: 'SIZE', time: 'TIME' }
const BLANK: Record<LiveColumn, string> = { who: '', where: '', what: '', now: '', level: '', size: '', time: '' }

/** A gauge of nine cells and the figure: `▰▰▰▱▱▱▱▱▱ 33%▵`. */
export const gaugeText = (level: NonNullable<LiveRow['level']>): string => {
  const filled = Math.max(0, Math.min(GAUGE_CELLS, Math.round((level.percent * GAUGE_CELLS) / 100)))
  return `${'▰'.repeat(filled)}${'▱'.repeat(GAUGE_CELLS - filled)} ${Math.round(level.percent)}%${level.mark ?? ''}`
}

const CONTROL = /[\u0000-\u001f\u007f-\u009f]/g

const clip = (text: string, width: number): string => {
  const chars = [...text.replace(CONTROL, '')]
  return chars.length <= width ? text : width <= 1 ? '…'.slice(0, width) : `${chars.slice(0, width - 1).join('')}…`
}

const plain = (text: string): string => text.replace(CONTROL, '')

const cellsOf = (row: LiveRow): Record<LiveColumn, string> => ({
  who: plain(row.who),
  where: plain(row.where),
  what: plain(row.what),
  now: plain(row.now),
  level: row.level === undefined ? '' : gaugeText(row.level),
  size: plain(row.size),
  time: plain(row.time),
})

/**
 * The grid for `columns` cells: rows grouped by kind (three each, then `+N`), columns dropped in
 * `LIVE_DROP` order, widths kept at the most each column has needed (`reservation`), and rows shed
 * gates first, then agents, when `maxRows` is short.
 */
export const layoutLive = (input: {
  rows: readonly LiveRow[]
  columns: number
  reservation: Partial<Record<LiveColumn, number>>
  maxRows?: number
  /** Every row, not three per kind: the Session tab lists them all (078). */
  all?: boolean
}): LiveLayout => {
  const groups = KIND_ORDER.map(kind => input.rows.filter(r => r.kind === kind))
  const fitsRows = (shed: ReadonlySet<LiveKind>): number => {
    const present = groups.filter((g, i) => g.length > 0 && !shed.has(KIND_ORDER[i]!))
    return present.reduce((sum, g) => sum + Math.min(g.length, PER_KIND) + (g.length > PER_KIND ? 1 : 0), 0) + Math.max(0, present.length - 1)
  }
  const shed = new Set<LiveKind>()
  if (input.maxRows !== undefined) {
    for (const kind of ['gate', 'agent'] as const) {
      if (fitsRows(shed) <= input.maxRows) break
      shed.add(kind)
    }
  }
  const lines: LiveLine[] = []
  let hidden = 0
  groups.forEach((group, i) => {
    const kind = KIND_ORDER[i]!
    if (group.length === 0 || shed.has(kind)) return
    if (lines.length > 0) lines.push({ kind, rule: true, cells: { ...BLANK } })
    for (const row of group.slice(0, input.all === true ? group.length : PER_KIND)) lines.push({ kind, cells: cellsOf(row), row })
    if (group.length > PER_KIND && input.all !== true) {
      hidden += group.length - PER_KIND
      lines.push({ kind, cells: { ...BLANK, what: `+${group.length - PER_KIND}` } })
    }
  })
  // The glyph and its space, then the columns with one cell between them.
  const taken = (cols: readonly LiveColumn[]) => 2 + cols.reduce((sum, c) => sum + LIVE_WIDTHS[c], 0) + (cols.length - 1)
  const visible = LIVE_ORDER.filter(() => true) as LiveColumn[]
  for (const drop of LIVE_DROP) {
    if (taken(visible) <= input.columns) break
    visible.splice(visible.indexOf(drop), 1)
  }
  const widths = { ...LIVE_WIDTHS }
  const reservation: Partial<Record<LiveColumn, number>> = { ...input.reservation }
  for (const column of LIVE_ORDER) {
    const needed = Math.max(HEADER[column].length, ...lines.map(l => [...l.cells[column]].length))
    const kept = Math.min(LIVE_WIDTHS[column], Math.max(reservation[column] ?? 0, needed))
    reservation[column] = kept
    widths[column] = kept
  }
  // Still too wide with only WHO, WHAT and LEVEL: WHAT gives way.
  const spare = input.columns - taken(visible.map(c => c)) + LIVE_WIDTHS.what - widths.what
  if (spare < 0) widths.what = Math.max(8, LIVE_WIDTHS.what + (input.columns - taken(visible)))
  const pad = (column: LiveColumn, text: string) => {
    const cut = clip(text, widths[column])
    return RIGHT.has(column) ? cut.padStart(widths[column]) : cut.padEnd(widths[column])
  }
  const shape = (cells: Record<LiveColumn, string>) => Object.fromEntries(LIVE_ORDER.map(c => [c, pad(c, cells[c])])) as Record<LiveColumn, string>
  return {
    lines: lines.map(l => (l.rule === true ? l : { ...l, cells: shape(l.cells) })),
    header: shape(HEADER),
    columns: visible,
    widths,
    reservation,
    hidden,
  }
}

export type ProcessRow = { pid: number; ppid: number; ageMs: number; command: string }

/** `ps -axo pid=,ppid=,etime=,command=`: `[[dd-]hh:]mm:ss` is the age. */
export const parseProcesses = (out: string): ProcessRow[] =>
  out.split(/\r?\n/).flatMap(line => {
    const m = /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.+?)\s*$/.exec(line)
    if (m === null) return []
    const [, pid, ppid, etime, command] = m
    const [dayPart, clockPart] = etime!.includes('-') ? etime!.split('-') : [undefined, etime!]
    const parts = clockPart!.split(':').map(Number)
    if (parts.some(n => !Number.isFinite(n))) return []
    const secs = parts.reduce((total, n) => total * 60 + n, 0)
    return [{ pid: Number(pid), ppid: Number(ppid), ageMs: (Number(dayPart ?? 0) * 86_400 + secs) * 1000, command: command! }]
  })

const HOOK_FILE = /(?:^|\/)(?:\.git\/hooks|\.husky|hooks)\/([a-z][a-z-]*)$/
const GATE_NAME = /^gates?[-_.]/
const baseName = (path: string): string => path.split('/').at(-1) ?? path

const INTERPRETERS = new Set(['sh', 'bash', 'zsh', 'dash', 'fish', 'env', 'node', 'bun', 'deno', 'python', 'python3', 'ruby', 'perl', 'npx', 'tsx'])

/** The file a command runs: the first word that is not an interpreter or a flag. */
const programOf = (command: string): string => {
  const words = command.split(/\s+/).filter(w => w !== '')
  return words.find(w => !w.startsWith('-') && !INTERPRETERS.has(baseName(w))) ?? words[0] ?? command
}

/** `*` matches any run of characters; no regular expression, so a pattern cannot backtrack. */
const globMatches = (pattern: string, text: string): boolean => {
  const parts = pattern.split('*')
  if (parts.length === 1) return pattern === text
  if (!text.startsWith(parts[0]!)) return false
  let at = parts[0]!.length
  const last = parts[parts.length - 1]!
  for (const part of parts.slice(1, -1)) {
    const found = text.indexOf(part, at)
    if (found < 0) return false
    at = found + part.length
  }
  return text.length - last.length >= at && text.endsWith(last)
}

const patternMatches = (file: string, patterns: readonly string[]): boolean =>
  patterns.some(p => globMatches(p, baseName(file)) || globMatches(p, file))

/**
 * Git hooks and gate scripts in a process list. A hook folds its descendants into one chain;
 * a gate script inside a hook is not counted twice. `lockPid` is the pid `gates.lock` names.
 */
export const detectGates = (
  rows: readonly ProcessRow[],
  options: { root: string; now: number; patterns?: readonly string[]; lockPid?: number },
): LiveGate[] => {
  const patterns = options.patterns ?? []
  const byParent = new Map<number, ProcessRow[]>()
  for (const r of rows) byParent.set(r.ppid, [...(byParent.get(r.ppid) ?? []), r])
  const isGateFile = (file: string): boolean => GATE_NAME.test(baseName(file)) || file.includes('/gates/') || patternMatches(file, patterns)
  const descendants = (pid: number): ProcessRow[] => (byParent.get(pid) ?? []).flatMap(c => [c, ...descendants(c.pid)])
  const claimed = new Set<number>()
  const out: LiveGate[] = []
  // Git runs a hook of the main repository by a relative path (`.git/hooks/pre-commit`) from the
  // folder it works in; an absolute path inside the root is yours too. Another path names the
  // repository folder it belongs to.
  const root = options.root.replace(/\/+$/, '')
  const where = (file: string): string => {
    if (!file.startsWith('/')) return '*'
    if (file === root || file.startsWith(`${root}/`)) return '*'
    const parts = file.split('/').filter(part => part !== '')
    const git = parts.indexOf('.git')
    return (git > 0 ? parts[git - 1] : parts.at(-3)) ?? '*'
  }
  for (const r of rows) {
    const file = programOf(r.command)
    const hook = HOOK_FILE.exec(file)?.[1]
    if (hook === undefined) continue
    const inner = descendants(r.pid)
    for (const d of inner) claimed.add(d.pid)
    claimed.add(r.pid)
    const names = inner.map(d => baseName(programOf(d.command)))
    out.push({
      pid: r.pid,
      hook,
      chain: names.length === 0 ? [hook] : [...new Set(names)],
      where: where(file),
      startedAt: options.now - r.ageMs,
      ...(options.lockPid === r.pid ? { waiting: true as const } : {}),
    })
  }
  for (const r of rows) {
    if (claimed.has(r.pid)) continue
    const file = programOf(r.command)
    if (!isGateFile(file)) continue
    // A gate script a gate script started is part of that one's chain.
    const parentGate = rows.find(p => p.pid === r.ppid && isGateFile(programOf(p.command)))
    if (parentGate !== undefined) continue
    const inner = descendants(r.pid).filter(d => isGateFile(programOf(d.command)))
    for (const d of inner) claimed.add(d.pid)
    out.push({
      pid: r.pid,
      chain: [baseName(file), ...inner.map(d => baseName(programOf(d.command)))],
      where: where(file),
      startedAt: options.now - r.ageMs,
      ...(options.lockPid === r.pid ? { waiting: true as const } : {}),
    })
  }
  return out
}

/** The layout as text rows, a header and a line per live row, for the Session tab (078 FR-053). */
export const liveTextRows = (layout: LiveLayout): Array<{ key: string; text: string; role: 'faint' | 'text' | 'current' }> => {
  if (layout.lines.length === 0) return []
  const cols = layout.columns
  return [
    { key: 'live-header', text: `  ${cols.map(c => layout.header[c]).join(' ')}`.trimEnd(), role: 'faint' },
    ...layout.lines.flatMap((line, i) =>
      line.rule === true
        ? []
        : [{ key: `live-${i}`, text: `${KIND_GLYPH[line.kind]} ${cols.map(c => line.cells[c]).join(' ')}`.trimEnd(), role: line.row?.nowWarn === true ? ('current' as const) : ('text' as const) }],
    ),
  ]
}
