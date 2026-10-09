// Pictures for terminals that draw them (024 #5), and the animated dial's frames (024 #6).
// Pure: no $. Never throws.
import { base64, type Grid } from './cells'
import { burnRate, dial } from './dashboard'
import type { Tokens } from './theme'
import type { Phase, SessionStats } from './types'

const CELL_W = 8
const CELL_H = 16
const CYCLE: readonly Phase[] = ['specify', 'clarify', 'plan', 'tasks', 'implement', 'done']
const frameCache = new WeakMap<Tokens, Map<Phase | 'none', Span[][][]>>()

/**
 * Whether the Dashboard draws pictures: `on`, `off`, or `auto` (the default), which is kitty
 * and Ghostty outside tmux, as their own variables say. Other terminals keep the Raster.
 */
export const imagesFor = (option: unknown, env: Readonly<Record<string, string | undefined>>): boolean => {
  if (option === 'on') return true
  if (option === 'off') return false
  if (env['TMUX'] !== undefined && env['TMUX'] !== '') return false
  return (env['KITTY_WINDOW_ID'] ?? '') !== '' || env['TERM'] === 'xterm-kitty' || env['TERM_PROGRAM'] === 'ghostty'
}

const rgbOf = (hex: string): [number, number, number] => {
  const n = /^#[0-9a-f]{6}$/i.test(hex) ? Number.parseInt(hex.slice(1), 16) : 0x888888
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export type ChartImageOptions = { columns: number; rows: number; now: number; resetsAt?: string; tokens: Tokens }

/** The usage chart as RGBA pixels: grid lines every 25%, the readings as a line, the projection dashed. */
export const chartImage = (
  series: SessionStats['series'],
  o: ChartImageOptions,
): { rgba: string; width: number; height: number } | undefined => {
  if (series.length === 0 || o.columns < 10 || o.rows < 3) return undefined
  const width = Math.min(2048, o.columns * CELL_W)
  const height = Math.min(2048, o.rows * CELL_H)
  const px = new Uint8Array(width * height * 4)
  const dot = (x: number, y: number, rgb: [number, number, number], alpha = 255) => {
    const xi = Math.round(x)
    const yi = Math.round(y)
    if (xi < 0 || yi < 0 || xi >= width || yi >= height) return
    const i = (yi * width + xi) * 4
    px[i] = rgb[0]
    px[i + 1] = rgb[1]
    px[i + 2] = rgb[2]
    px[i + 3] = alpha
  }
  const yOf = (percent: number) => 2 + ((100 - Math.max(0, Math.min(100, percent))) * (height - 5)) / 100
  const muted = rgbOf(o.tokens.barEmpty)
  for (const level of [0, 25, 50, 75, 100]) for (let x = 0; x < width; x += 1) dot(x, yOf(level), muted, 160)
  const reset = o.resetsAt === undefined ? Number.NaN : Date.parse(o.resetsAt)
  const rate = burnRate(series)
  const hasProjection = !Number.isNaN(reset) && reset > o.now && rate !== undefined
  const plotW = hasProjection ? Math.floor(width * 0.7) : width - 1
  const points = series.slice(-Math.max(2, Math.floor(plotW / 4)))
  const xOf = (i: number) => (points.length === 1 ? plotW : (i * plotW) / (points.length - 1))
  const line = (x0: number, y0: number, x1: number, y1: number, rgb: [number, number, number], dashed: boolean) => {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))))
    for (let s = 0; s <= steps; s += 1) {
      if (dashed && Math.floor(s / 3) % 2 === 1) continue
      const x = x0 + ((x1 - x0) * s) / steps
      const y = y0 + ((y1 - y0) * s) / steps
      dot(x, y, rgb)
      dot(x, y + 1, rgb)
    }
  }
  const accent = rgbOf(o.tokens.accent)
  points.forEach((p, i) => {
    const next = points[i + 1]
    if (next !== undefined) line(xOf(i), yOf(p.percent), xOf(i + 1), yOf(next.percent), accent, false)
    for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 2; dy += 1) dot(xOf(i) + dx, yOf(p.percent) + dy, accent)
  })
  if (hasProjection) {
    const last = points.at(-1)!
    const end = Math.min(100, last.percent + (rate! * (reset - o.now)) / 3_600_000)
    line(xOf(points.length - 1), yOf(last.percent), width - 1, yOf(end), rgbOf(end >= 80 ? o.tokens.current : o.tokens.pending), true)
  }
  return { rgba: base64(px), width, height }
}

export type Span = { text: string; color?: string }

/** A grid as rows of text spans, one span per run of one color: what a Client can draw. */
export const spansOf = (g: Grid): Span[][] =>
  Array.from({ length: g.rows }, (_, y) => {
    const row: Span[] = []
    for (let x = 0; x < g.columns; x += 1) {
      const cell = g.cells[y * g.columns + x] ?? { ch: ' ' }
      const last = row.at(-1)
      if (last !== undefined && last.color === cell.fg) last.text += cell.ch
      else row.push({ text: cell.ch, ...(cell.fg === undefined ? {} : { color: cell.fg }) })
    }
    return row
  })

/** The dial's frames: the needle on each step from the first to the active one. */
export const dialFrames = (active: Phase | undefined, tokens: Tokens): Span[][][] => {
  const key = active ?? 'none'
  const cached = frameCache.get(tokens)?.get(key)
  if (cached !== undefined) return cached
  const at = active === undefined ? -1 : CYCLE.indexOf(active)
  const frames = at < 0 ? [spansOf(dial(active, tokens))] : CYCLE.slice(0, at + 1).map(step => spansOf(dial(step, tokens)))
  const colors = frameCache.get(tokens) ?? new Map<Phase | 'none', Span[][][]>()
  colors.set(key, frames)
  frameCache.set(tokens, colors)
  return frames
}
