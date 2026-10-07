// A grid of terminal cells that a chart is drawn into once and shown three ways (spec 018):
// a Raster on the terminal, an Svg on the remote surfaces, plain text anywhere. Pure: no $.

export type Cell = { ch: string; fg?: string; bg?: string }
export type Grid = { columns: number; rows: number; cells: Cell[] }

export const blank = (columns: number, rows: number): Grid => ({
  columns,
  rows,
  cells: Array.from({ length: columns * rows }, () => ({ ch: ' ' })),
})

/** One character at (x, y); outside the grid it is ignored. */
export const put = (g: Grid, x: number, y: number, ch: string, fg?: string, bg?: string): void => {
  if (x < 0 || y < 0 || x >= g.columns || y >= g.rows) return
  g.cells[y * g.columns + x] = { ch, ...(fg === undefined ? {} : { fg }), ...(bg === undefined ? {} : { bg }) }
}

/** A string from (x, y) to the right, one character per cell. */
export const write = (g: Grid, x: number, y: number, text: string, fg?: string, bg?: string): void => {
  ;[...text].forEach((ch, i) => put(g, x + i, y, ch, fg, bg))
}

const DEFAULT = 0x01000000
const rgb = (hex: string | undefined): number => (hex === undefined || !/^#[0-9a-f]{6}$/i.test(hex) ? DEFAULT : Number.parseInt(hex.slice(1), 16))
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export const base64 = (bytes: Uint8Array): string => {
  // Built in chunks, so a picture's few hundred kilobytes never grow one string a byte at a time.
  const chunks: string[] = []
  for (let start = 0; start < bytes.length; start += 3 * 4096) {
    let out = ''
    const end = Math.min(bytes.length, start + 3 * 4096)
    for (let i = start; i < end; i += 3) {
      const a = bytes[i] ?? 0
      const b = i + 1 < end ? bytes[i + 1] : undefined
      const c = i + 2 < end ? bytes[i + 2] : undefined
      const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0)
      out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]! + (b === undefined ? '=' : B64[(n >> 6) & 63]!) + (c === undefined ? '=' : B64[n & 63]!)
    }
    chunks.push(out)
  }
  return chunks.join('')
}

/** RasterProps.cells: standard base64 of little-endian u32 triplets [codePoint, fg, bg], row-major. */
export const encodeRaster = (g: Grid): string => {
  const words = new Uint32Array(g.cells.length * 3)
  g.cells.forEach((cell, i) => {
    words[i * 3] = cell.ch.codePointAt(0) ?? 0x20
    words[i * 3 + 1] = rgb(cell.fg)
    words[i * 3 + 2] = rgb(cell.bg)
  })
  const bytes = new Uint8Array(words.buffer)
  // Little-endian by definition: rewrite on a big-endian host.
  if (new Uint8Array(Uint32Array.of(1).buffer)[0] !== 1) {
    for (let i = 0; i < bytes.length; i += 4) bytes.subarray(i, i + 4).reverse()
  }
  return base64(bytes)
}

const ASCII: Readonly<Record<string, string>> = {
  '█': '#', '▇': '#', '▆': '#', '▅': '=', '▄': '=', '▃': '-', '▂': '_', '▁': '_', '░': '.', '▒': ':', '▓': '%',
  '─': '-', '━': '-', '│': '|', '┃': '|', '╭': '+', '╮': '+', '╰': '+', '╯': '+', '┤': '|', '├': '|', '┼': '+', '┬': '+', '┴': '+',
  '●': '*', '○': 'o', '◉': '@', '✦': '*', '✓': 'v', '·': '.', '•': '*', '↑': '^', '↓': 'v', '↗': '/', '↘': '\\', '↙': '/', '↖': '\\', '▲': '^', '▼': 'v', '▸': '>', '◆': '*',
}

/** The grid as text rows; `ascii` maps blocks, box drawing and marks to plain characters. */
export const toText = (g: Grid, ascii = false): string[] =>
  Array.from({ length: g.rows }, (_, y) =>
    g.cells
      .slice(y * g.columns, (y + 1) * g.columns)
      .map(c => (ascii ? (ASCII[c.ch] ?? (/^[\x20-\x7e]$/.test(c.ch) ? c.ch : '?')) : c.ch))
      .join(''),
  )

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const CELL_W = 8
const CELL_H = 16

/** An Svg of the grid: one text span per run of one color, monospace cells of 8 by 16. */
export const toSvg = (g: Grid, defaultFg: string): string => {
  const lines: string[] = []
  for (let y = 0; y < g.rows; y += 1) {
    const row = g.cells.slice(y * g.columns, (y + 1) * g.columns)
    const spans: string[] = []
    let start = 0
    while (start < row.length) {
      const fg = row[start]!.fg ?? defaultFg
      let end = start
      while (end < row.length && (row[end]!.fg ?? defaultFg) === fg) end += 1
      const text = row.slice(start, end).map(c => c.ch).join('')
      if (text.trim() !== '') spans.push(`<tspan x="${start * CELL_W}" fill="${fg}">${escape(text)}</tspan>`)
      start = end
    }
    if (spans.length > 0) lines.push(`<text y="${(y + 1) * CELL_H - 4}" xml:space="preserve">${spans.join('')}</text>`)
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.columns * CELL_W} ${g.rows * CELL_H}" font-family="ui-monospace, Menlo, monospace" font-size="13">${lines.join('')}</svg>`
}
