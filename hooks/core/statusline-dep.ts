// The vendored statusline as the footer (spec 070): the payload the mod sends it, the parser of
// what it prints, the failure rules and the choice of source. Pure: no $.
import { textWidth } from './footer'

/** A piece of text with the style the renderer gave it. `fg` and `bg` are `#rrggbb` or `ansi:0..15`. */
export type Run = { text: string; fg?: string; bg?: string; bold?: true; dim?: true; underline?: true; href?: string }

const ESC = '\x1b'
const BEL = '\x07'
const LINK_SCHEMES = /^(?:https?|file):/i

const hex = (n: number): string => n.toString(16).padStart(2, '0')
const rgb = (r: number, g: number, b: number): string => `#${hex(r)}${hex(g)}${hex(b)}`

/** xterm's 256-colour palette beyond the 16 named colours. */
const color256 = (n: number): string | undefined => {
  if (!Number.isInteger(n) || n < 0 || n > 255) return undefined
  if (n < 16) return `ansi:${n}`
  if (n >= 232) {
    const v = 8 + (n - 232) * 10
    return rgb(v, v, v)
  }
  const i = n - 16
  const c = (x: number) => (x === 0 ? 0 : 55 + x * 40)
  return rgb(c(Math.floor(i / 36)), c(Math.floor(i / 6) % 6), c(i % 6))
}

type Style = { fg?: string; bg?: string; bold?: true; dim?: true; underline?: true }

/** Applies one SGR parameter list to a style. Attributes the footer does not draw are ignored. */
const applySgr = (style: Style, params: string): Style => {
  const next: Style = { ...style }
  const codes = params === '' ? ['0'] : params.split(';')
  for (let i = 0; i < codes.length; i += 1) {
    const raw = codes[i]!
    // `4:4` is a curly underline: an underline here.
    const code = raw.includes(':') ? Number(raw.split(':')[0]) : Number(raw)
    if (!Number.isFinite(code)) continue
    if (code === 0) {
      delete next.fg
      delete next.bg
      delete next.bold
      delete next.dim
      delete next.underline
    } else if (code === 1) next.bold = true
    else if (code === 2) next.dim = true
    else if (code === 22) {
      delete next.bold
      delete next.dim
    } else if (code === 4) {
      if (raw.startsWith('4:0')) delete next.underline
      else next.underline = true
    } else if (code === 24) delete next.underline
    else if (code === 39) delete next.fg
    else if (code === 49) delete next.bg
    else if ((code >= 30 && code <= 37) || (code >= 90 && code <= 97)) next.fg = `ansi:${code >= 90 ? code - 90 + 8 : code - 30}`
    else if ((code >= 40 && code <= 47) || (code >= 100 && code <= 107)) next.bg = `ansi:${code >= 100 ? code - 100 + 8 : code - 40}`
    else if (code === 38 || code === 48) {
      const key = code === 38 ? 'fg' : 'bg'
      const mode = Number(codes[i + 1])
      if (mode === 5) {
        const c = color256(Number(codes[i + 2]))
        if (c !== undefined) next[key] = c
        i += 2
      } else if (mode === 2) {
        const [r, g, b] = [Number(codes[i + 2]), Number(codes[i + 3]), Number(codes[i + 4])]
        if ([r, g, b].every(v => Number.isInteger(v) && v >= 0 && v <= 255)) next[key] = rgb(r!, g!, b!)
        i += 4
      }
    }
  }
  return next
}

const styleKey = (s: Style, href: string | undefined): string => JSON.stringify([s.fg, s.bg, s.bold, s.dim, s.underline, href])

/** One line of output into runs. */
const parseLine = (line: string): Run[] => {
  const runs: Run[] = []
  let style: Style = {}
  let href: string | undefined
  let buf = ''
  const flush = () => {
    if (buf === '') return
    const last = runs[runs.length - 1]
    const run: Run = { text: buf, ...style, ...(href === undefined ? {} : { href }) }
    if (last !== undefined && styleKey(last, last.href) === styleKey(run, run.href)) last.text += buf
    else runs.push(run)
    buf = ''
  }
  let i = 0
  while (i < line.length) {
    const ch = line[i]!
    if (ch === ESC) {
      const next = line[i + 1]
      if (next === '[') {
        // CSI: parameters, then a final byte. Only `m` (SGR) is kept.
        let j = i + 2
        while (j < line.length && !/[@-~]/.test(line[j]!)) j += 1
        if (j >= line.length) break
        if (line[j] === 'm') {
          flush()
          style = applySgr(style, line.slice(i + 2, j))
        }
        i = j + 1
        continue
      }
      if (next === ']') {
        // OSC: up to BEL or ESC \. An unterminated one runs to the end of the line, dropped.
        let j = i + 2
        let end = -1
        let after = line.length
        while (j < line.length) {
          if (line[j] === BEL) {
            end = j
            after = j + 1
            break
          }
          if (line[j] === ESC && line[j + 1] === '\\') {
            end = j
            after = j + 2
            break
          }
          j += 1
        }
        if (end >= 0) {
          const body = line.slice(i + 2, end)
          if (body.startsWith('8;')) {
            flush()
            const uri = body.slice(body.indexOf(';', 2) + 1)
            href = uri !== '' && LINK_SCHEMES.test(uri) ? uri : undefined
          }
        }
        i = after
        continue
      }
      // Any other escape: the ESC and its next character.
      i += next === undefined ? 1 : 2
      continue
    }
    // Other control characters are dropped.
    if (ch < ' ' || ch === '\x7f') {
      i += 1
      continue
    }
    buf += ch
    i += 1
  }
  flush()
  return runs
}

/** The renderer's output as lines of runs; blank trailing lines are dropped. */
export const parseAnsiLines = (out: string): Run[][] => {
  const lines = out.replace(/\r/g, '').split('\n').map(parseLine)
  while (lines.length > 0 && lines[lines.length - 1]!.every(r => r.text.trim() === '')) lines.pop()
  return lines
}

/** Each line's text without style. */
export const plainOf = (lines: readonly (readonly Run[])[]): string[] => lines.map(line => line.map(r => r.text).join(''))

const FALLBACKS = ['statusline unavailable', 'statusline needs node']

/** The CLI prints its own failure line and exits 0: that, or nothing, is a failure. */
export const isFallback = (plain: readonly string[]): boolean => {
  const text = plain.join('\n').toLowerCase()
  if (text.trim() === '') return true
  return FALLBACKS.some(f => text.includes(f))
}

/** The runs contract this build reads (statusline spec 056). A higher number is not read. */
export const SUPPORTED_CONTRACT = 1

export type RunsOutput =
  | { kind: 'runs'; contract: number; lines: Run[][] }
  | { kind: 'error'; contract: number; code: string; message: string }
  | { kind: 'newer'; contract: number }
  | { kind: 'ansi' }

const HEX = /^#[0-9a-fA-F]{6}$/
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/g

const asRun = (value: unknown): Run | undefined => {
  if (typeof value !== 'object' || value === null) return undefined
  const v = value as Record<string, unknown>
  if (typeof v['text'] !== 'string') return undefined
  const text = v['text'].replace(CONTROL, '')
  if (text === '') return undefined
  const run: Run = { text }
  if (typeof v['fg'] === 'string' && HEX.test(v['fg'])) run.fg = v['fg'].toLowerCase()
  if (typeof v['bg'] === 'string' && HEX.test(v['bg'])) run.bg = v['bg'].toLowerCase()
  if (v['bold'] === true) run.bold = true
  if (v['dim'] === true) run.dim = true
  if (v['underline'] === true) run.underline = true
  if (typeof v['href'] === 'string' && LINK_SCHEMES.test(v['href'])) run.href = v['href']
  return run
}

/**
 * What the renderer printed when it was asked for runs (statusline spec 056). Anything that is not
 * a JSON object with a `contract` is the ANSI text an older copy prints, so one reader serves both.
 */
export const parseRunsOutput = (stdout: string): RunsOutput => {
  const trimmed = stdout.trim()
  if (!trimmed.startsWith('{')) return { kind: 'ansi' }
  let value: unknown
  try {
    value = JSON.parse(trimmed)
  } catch {
    return { kind: 'ansi' }
  }
  if (typeof value !== 'object' || value === null) return { kind: 'ansi' }
  const v = value as Record<string, unknown>
  const contract = v['contract']
  if (typeof contract !== 'number' || !Number.isInteger(contract)) return { kind: 'ansi' }
  if (contract > SUPPORTED_CONTRACT) return { kind: 'newer', contract }
  const error = v['error']
  if (typeof error === 'object' && error !== null) {
    const e = error as Record<string, unknown>
    return { kind: 'error', contract, code: typeof e['code'] === 'string' ? e['code'] : 'internal', message: typeof e['message'] === 'string' ? e['message'].replace(CONTROL, '') : '' }
  }
  const raw = v['lines']
  if (!Array.isArray(raw)) return { kind: 'error', contract, code: 'internal', message: 'no lines in the runs output' }
  const lines = raw.map(line => (Array.isArray(line) ? line.flatMap(r => asRun(r) ?? []) : []))
  while (lines.length > 0 && lines[lines.length - 1]!.every(r => r.text.trim() === '')) lines.pop()
  return { kind: 'runs', contract, lines }
}

/** The payload fields the mod can fill, in statusLine's shapes. Absent facts are left out. */
export type FooterPayload = {
  session_id?: string
  cwd?: string
  transcript_path?: string
  workspace?: { current_dir: string; project_dir: string }
  model?: { id?: string; display_name?: string }
  effort?: string
  context_window?: { used_percentage?: number; context_window_size?: number }
  rate_limits?: Partial<Record<'five_hour' | 'seven_day', { used_percentage: number; resets_at?: number }>>
}

export type PayloadInput = {
  rateLimits: ReadonlyArray<{ kind: string; percentUsed: number; resetsAt?: string }>
  context?: { percent?: number; window?: number; tokens?: number }
  sessionId?: string
  cwd?: string
  transcriptPath?: string
  model?: { id?: string; displayName?: string }
  effort?: string
}

export const buildPayload = (input: PayloadInput): FooterPayload => {
  const out: FooterPayload = {}
  if (input.sessionId !== undefined) out.session_id = input.sessionId
  if (input.cwd !== undefined) {
    out.cwd = input.cwd
    out.workspace = { current_dir: input.cwd, project_dir: input.cwd }
  }
  if (input.transcriptPath !== undefined) out.transcript_path = input.transcriptPath
  if (input.model !== undefined && (input.model.id !== undefined || input.model.displayName !== undefined)) {
    out.model = {
      ...(input.model.id === undefined ? {} : { id: input.model.id }),
      ...(input.model.displayName === undefined ? {} : { display_name: input.model.displayName }),
    }
  }
  if (input.effort !== undefined) out.effort = input.effort
  const ctx = input.context
  if (ctx !== undefined && (ctx.percent !== undefined || ctx.window !== undefined)) {
    out.context_window = {
      ...(ctx.percent === undefined ? {} : { used_percentage: ctx.percent }),
      ...(ctx.window === undefined ? {} : { context_window_size: ctx.window }),
    }
  }
  const limits: NonNullable<FooterPayload['rate_limits']> = {}
  for (const r of input.rateLimits) {
    if (r.kind !== 'five_hour' && r.kind !== 'seven_day') continue
    const at = r.resetsAt === undefined ? Number.NaN : Date.parse(r.resetsAt)
    const prev = limits[r.kind]
    if (prev !== undefined && prev.used_percentage >= r.percentUsed) continue
    limits[r.kind] = { used_percentage: r.percentUsed, ...(Number.isFinite(at) ? { resets_at: at / 1000 } : {}) }
  }
  if (Object.keys(limits).length > 0) out.rate_limits = limits
  return out
}

/** The environment additions of FR-006; the host's own environment stays underneath. */
export const statuslineEnv = (input: { columns: number; lines: number; flavor: string; ascii: boolean }): Record<string, string> => ({
  COLUMNS: String(Math.max(20, Math.floor(input.columns))),
  LINES: String(Math.max(1, Math.floor(input.lines))),
  COLORTERM: 'truecolor',
  CLAUDE_STATUSLINE_UPDATES: 'off',
  CLAUDE_STATUSLINE_DEBUG: '0',
  // The data form (statusline spec 056); a copy that does not know it prints ANSI and is read as before.
  CLAUDE_STATUSLINE_OUTPUT: 'runs',
  ...(input.flavor === 'theme' ? {} : { CLAUDE_STATUSLINE_FLAVOR: input.flavor }),
  ...(input.ascii ? { CLAUDE_STATUSLINE_ASCII: '1' } : {}),
})

export type SourceReason = 'native-chosen' | 'colorblind' | 'node-missing' | 'node-old' | 'no-copy' | 'renderer-failed' | 'contract-newer'

/** Who draws the pane footer and, when it is not the one chosen, why. */
export const chooseSource = (input: {
  choice: 'statusline' | 'native'
  flavor: string
  node: 'ok' | 'missing' | 'old'
  copy: boolean
  failing: boolean
  /** The copy answered with a contract number this build does not read. */
  contractNewer?: boolean
}): { source: 'statusline' | 'native'; reason?: SourceReason } => {
  if (input.choice === 'native') return { source: 'native', reason: 'native-chosen' }
  if (input.flavor === 'colorblind') return { source: 'native', reason: 'colorblind' }
  if (input.node === 'missing') return { source: 'native', reason: 'node-missing' }
  if (input.node === 'old') return { source: 'native', reason: 'node-old' }
  if (!input.copy) return { source: 'native', reason: 'no-copy' }
  if (input.contractNewer === true) return { source: 'native', reason: 'contract-newer' }
  if (input.failing) return { source: 'native', reason: 'renderer-failed' }
  return { source: 'statusline' }
}

/** Keeps whole characters up to `columns` cells, in order, never splitting a run's style or link. */
export const cutRuns = (runs: readonly Run[], columns: number): Run[] => {
  const out: Run[] = []
  let used = 0
  for (const run of runs) {
    if (used >= columns) break
    let text = ''
    for (const ch of run.text) {
      const w = textWidth(ch)
      if (used + w > columns) {
        used = columns
        break
      }
      text += ch
      used += w
    }
    if (text !== '') out.push({ ...run, text })
  }
  return out
}
