#!/usr/bin/env node
// Turns a terminal capture with ANSI colors (tmux capture-pane -e -p) into an SVG image, so
// the README shows the real mod instead of drawings (Constitution Principle II).
// Usage: node scripts/capture/ansi-to-svg.mjs <in.ansi> <out.svg> [--title "..."] [--crop a:b]
import { readFileSync, writeFileSync } from 'node:fs'

const CELL_W = 8.4
const CELL_H = 18
const PAD = 14
const BAR = 26
const BG = '#1e1e2e'
const FG = '#cdd6f4'
// xterm 16-color palette, Catppuccin mocha flavored, for 30-37/90-97 and 256-color 0-15.
const BASE16 = ['#45475a', '#f38ba8', '#a6e3a1', '#f9e2af', '#89b4fa', '#f5c2e7', '#94e2d5', '#bac2de',
  '#585b70', '#f38ba8', '#a6e3a1', '#f9e2af', '#89b4fa', '#f5c2e7', '#94e2d5', '#a6adc8']

const color256 = n => {
  if (n < 16) return BASE16[n]
  if (n >= 232) { const v = 8 + (n - 232) * 10; return `rgb(${v},${v},${v})` }
  const i = n - 16
  const c = x => (x === 0 ? 0 : 55 + x * 40)
  return `rgb(${c(Math.floor(i / 36))},${c(Math.floor(i / 6) % 6)},${c(i % 6)})`
}

const escapeXml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Parses ANSI text into lines of styled runs. */
export const parseAnsi = text => {
  const lines = []
  let style = { fg: undefined, bg: undefined, bold: false, dim: false, underline: false, inverse: false }
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const runs = []
    let i = 0
    let buf = ''
    const flush = () => { if (buf) runs.push({ text: buf, ...style }); buf = '' }
    while (i < raw.length) {
      const m = /^\x1b\[([0-9;:]*)m/.exec(raw.slice(i))
      if (m) {
        flush()
        const codes = m[1] === '' ? [0] : m[1].split(/[;:]/).map(Number)
        for (let k = 0; k < codes.length; k += 1) {
          const c = codes[k]
          if (c === 0) style = { fg: undefined, bg: undefined, bold: false, dim: false, underline: false, inverse: false }
          else if (c === 1) style = { ...style, bold: true }
          else if (c === 2) style = { ...style, dim: true }
          else if (c === 4) style = { ...style, underline: true }
          else if (c === 7) style = { ...style, inverse: true }
          else if (c === 22) style = { ...style, bold: false, dim: false }
          else if (c === 24) style = { ...style, underline: false }
          else if (c === 27) style = { ...style, inverse: false }
          else if (c >= 30 && c <= 37) style = { ...style, fg: BASE16[c - 30] }
          else if (c >= 90 && c <= 97) style = { ...style, fg: BASE16[c - 90 + 8] }
          else if (c >= 40 && c <= 47) style = { ...style, bg: BASE16[c - 40] }
          else if (c >= 100 && c <= 107) style = { ...style, bg: BASE16[c - 100 + 8] }
          else if (c === 39) style = { ...style, fg: undefined }
          else if (c === 49) style = { ...style, bg: undefined }
          else if ((c === 38 || c === 48) && codes[k + 1] === 5) {
            const v = color256(codes[k + 2]); style = c === 38 ? { ...style, fg: v } : { ...style, bg: v }; k += 2
          } else if ((c === 38 || c === 48) && codes[k + 1] === 2) {
            const v = `rgb(${codes[k + 2]},${codes[k + 3]},${codes[k + 4]})`
            style = c === 38 ? { ...style, fg: v } : { ...style, bg: v }; k += 4
          }
        }
        i += m[0].length
        continue
      }
      // CSI sequences, OSC (hyperlinks) ended by BEL or ST, and charset switches carry no text.
      const other = /^\x1b(\[[0-9;?]*[A-Za-z]|\][^\x07\x1b]*(\x07|\x1b\\)|[()][A-Z0-9])/.exec(raw.slice(i))
      if (other) { i += other[0].length; continue }
      buf += raw[i]
      i += 1
    }
    flush()
    // Trailing blanks only widen the image.
    while (runs.length > 0 && runs.at(-1).text.trim() === '' && !runs.at(-1).bg) runs.pop()
    if (runs.length > 0) runs[runs.length - 1] = { ...runs.at(-1), text: runs.at(-1).bg ? runs.at(-1).text : runs.at(-1).text.trimEnd() }
    lines.push(runs)
  }
  while (lines.length > 0 && lines.at(-1).every(r => r.text.trim() === '')) lines.pop()
  return lines
}

const widthOf = s => [...s].length

export const toSvg = (lines, title) => {
  const cols = Math.max(20, ...lines.map(l => l.reduce((n, r) => n + widthOf(r.text), 0)))
  const w = Math.ceil(cols * CELL_W + PAD * 2)
  const h = Math.ceil(lines.length * CELL_H + PAD * 2 + BAR)
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="ui-monospace, 'SF Mono', Menlo, Consolas, monospace" font-size="14">`,
    `<rect width="${w}" height="${h}" rx="8" fill="${BG}"/>`,
    `<circle cx="16" cy="13" r="5" fill="#f38ba8"/><circle cx="32" cy="13" r="5" fill="#f9e2af"/><circle cx="48" cy="13" r="5" fill="#a6e3a1"/>`,
    title ? `<text x="${w / 2}" y="17" fill="#a6adc8" font-size="12" text-anchor="middle">${escapeXml(title)}</text>` : '',
  ]
  lines.forEach((runs, row) => {
    let col = 0
    const y = PAD + BAR + row * CELL_H
    for (const r of runs) {
      const n = widthOf(r.text)
      const fg = r.inverse ? (r.bg ?? BG) : (r.fg ?? FG)
      const bg = r.inverse ? (r.fg ?? FG) : r.bg
      if (bg) out.push(`<rect x="${(PAD + col * CELL_W).toFixed(1)}" y="${y}" width="${(n * CELL_W).toFixed(1)}" height="${CELL_H}" fill="${bg}"/>`)
      if (r.text.trim() !== '') {
        const attrs = [`fill="${fg}"`, r.bold ? 'font-weight="bold"' : '', r.dim ? 'opacity="0.6"' : '', r.underline ? 'text-decoration="underline"' : '']
        out.push(`<text x="${(PAD + col * CELL_W).toFixed(1)}" y="${y + 13}" ${attrs.filter(Boolean).join(' ')} xml:space="preserve" textLength="${(n * CELL_W).toFixed(1)}" lengthAdjust="spacingAndGlyphs">${escapeXml(r.text)}</text>`)
      }
      col += n
    }
  })
  out.push('</svg>')
  return out.filter(Boolean).join('\n') + '\n'
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [input, output, ...rest] = process.argv.slice(2)
  const title = rest[rest.indexOf('--title') + 1] && rest.includes('--title') ? rest[rest.indexOf('--title') + 1] : undefined
  const crop = rest.includes('--crop') ? rest[rest.indexOf('--crop') + 1].split(':').map(Number) : undefined
  const from = rest.includes('--from') ? new RegExp(rest[rest.indexOf('--from') + 1]) : undefined
  const drop = rest.includes('--drop') ? new RegExp(rest[rest.indexOf('--drop') + 1]) : undefined
  const cut = rest.includes('--cut') ? Number(rest[rest.indexOf('--cut') + 1]) : undefined
  const plain = runs => runs.map(r => r.text).join('')
  let lines = parseAnsi(readFileSync(input, 'utf8'))
  if (crop) lines = lines.slice(crop[0], crop[1])
  if (from) lines = lines.slice(Math.max(0, lines.findIndex(l => from.test(plain(l)))))
  if (drop) lines = lines.filter(l => !drop.test(plain(l)))
  // --cut N keeps only columns from N on (the docked pane at the right of the screen).
  if (cut !== undefined) {
    lines = lines.map(runs => {
      const kept = []
      let col = 0
      for (const r of runs) {
        const chars = [...r.text]
        const start = Math.max(0, cut - col)
        if (start < chars.length) kept.push({ ...r, text: chars.slice(start).join('') })
        col += chars.length
      }
      return kept
    })
  }
  writeFileSync(output, toSvg(lines, title))
  console.log(`wrote ${output} (${lines.length} lines)`)
}
