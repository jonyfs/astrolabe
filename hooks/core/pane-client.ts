// What the Specs list hands its Client surface module (080): rows as plain data under the engine's
// limits, and the one decision of whether a Client draws the list at all. Pure: no $.
import type { PaneRow } from './pane'
import type { ThemeRole } from './theme'

/** One row as the module draws it: the text, its colour, and what a press or a key on it does. */
export type ClientRow = {
  /** The row's key: `feature-002`, `task-002-band-T011`, `block-001–050`. */
  k: string
  /** The text drawn, marks already in the set in use. */
  t: string
  /** A colour, as the tokens give it. */
  c?: string
  b?: 1
  /** Drawn on a background: the current task's block. */
  h?: 1
  /** The arrow keys can stand on it. */
  i?: 1
  /** Parts of the row in their own colours; the join of `t` of each is `t`. */
  s?: Array<{ t: string; c?: string }>
  /** The row's own link and the ones after it (`plan`, `tasks`). */
  l?: Array<{ l: string; h: string }>
  /** A button at the end of the row: what it says and what the hooks do with it. */
  a?: { kind: string; id: string; label: string }
  /** A copy button's text. */
  y?: string
}

/** What the module receives. */
export type ClientProps = {
  rows: ClientRow[]
  /** The key the hooks have selected. */
  sel?: string
  /** The accent colour, for the selection mark. */
  accent: string
  /** The background of a highlighted row. */
  bg: string
  /** The faint colour, for the legend row. */
  faint: string
}

/** The engine's bounds are 100,000 characters of props; the module keeps well under (FR-004). */
export const MAX_CLIENT_ROWS = 200
export const MAX_CLIENT_CHARS = 80_000

/** The rows as plain data, or undefined when they are too many or too long for a Client. */
export const clientRows = (
  rows: readonly PaneRow[],
  ctx: { color: (row: PaneRow) => string | undefined; text: (row: PaneRow) => string; part: (text: string) => string; segColor: (role: ThemeRole) => string | undefined },
  selectable: ReadonlySet<string>,
): ClientRow[] | undefined => {
  if (rows.length > MAX_CLIENT_ROWS) return undefined
  const out: ClientRow[] = rows.map(row => {
    const c = ctx.color(row)
    return {
      k: row.key,
      t: ctx.text(row),
      ...(c === undefined ? {} : { c }),
      ...(row.bold === true ? { b: 1 as const } : {}),
      ...(row.highlight === true ? { h: 1 as const } : {}),
      ...(selectable.has(row.key) ? { i: 1 as const } : {}),
      ...(row.segments === undefined ? {} : { s: row.segments.map(seg => ({ t: ctx.part(seg.text), ...(ctx.segColor(seg.role) === undefined ? {} : { c: ctx.segColor(seg.role)! }) })) }),
      ...(row.href === undefined && (row.links ?? []).length === 0 ? {} : { l: [...(row.href === undefined ? [] : [{ l: '↗', h: row.href }]), ...(row.links ?? []).map(link => ({ l: ` ${link.label}↗`, h: link.href }))] }),
      ...(row.action === undefined ? {} : { a: { kind: row.action.kind ?? 'run', id: row.action.id, label: row.action.label } }),
      ...(row.copy === undefined ? {} : { y: row.copy }),
    }
  })
  return JSON.stringify(out).length > MAX_CLIENT_CHARS ? undefined : out
}

/** The ops the module posts and the hooks apply (FR-002, FR-003). */
export type ClientOp =
  | { op: 'select'; key: string }
  | { op: 'fold'; key: string; mode: 'toggle' | 'open' | 'close' }
  | { op: 'page'; by: -1 | 1 }
  | { op: 'home' }
  | { op: 'end' }
  | { op: 'tab'; by: -1 | 1 }
  | { op: 'act'; key: string }
  | { op: 'action'; kind: string; id: string }
  | { op: 'block'; key: string }
  | { op: 'copy'; text: string }

/** Validates what a Client posted: it is code's input, not a fact (the engine says so). */
export const parseClientOp = (data: unknown): ClientOp | undefined => {
  if (typeof data !== 'object' || data === null) return undefined
  const d = data as Record<string, unknown>
  // Newlines separate the parts of an action's id (a folder list, a task run); other controls never pass.
  const str = (v: unknown, max = 200, lines = false): string | undefined =>
    typeof v === 'string' && v.length <= max && !(lines ? /[\u0000-\u0009\u000b-\u001f]/ : /[\u0000-\u001f]/).test(v) ? v : undefined
  switch (d['op']) {
    case 'select': {
      const key = str(d['key'])
      return key === undefined ? undefined : { op: 'select', key }
    }
    case 'fold': {
      const key = str(d['key'])
      const mode = d['mode']
      return key === undefined || (mode !== 'toggle' && mode !== 'open' && mode !== 'close') ? undefined : { op: 'fold', key, mode }
    }
    case 'page':
      return d['by'] === 1 || d['by'] === -1 ? { op: 'page', by: d['by'] } : undefined
    case 'tab':
      return d['by'] === 1 || d['by'] === -1 ? { op: 'tab', by: d['by'] } : undefined
    case 'home':
      return { op: 'home' }
    case 'end':
      return { op: 'end' }
    case 'act': {
      const key = str(d['key'], 1)
      return key === undefined || !/^[a-z]$/.test(key) ? undefined : { op: 'act', key }
    }
    case 'action': {
      const kind = str(d['kind'], 20)
      const id = str(d['id'], 2000, true)
      return kind === undefined || id === undefined ? undefined : { op: 'action', kind, id }
    }
    case 'block': {
      const key = str(d['key'])
      return key === undefined ? undefined : { op: 'block', key }
    }
    case 'copy': {
      const text = str(d['text'], 500)
      return text === undefined ? undefined : { op: 'copy', text }
    }
    default:
      return undefined
  }
}
