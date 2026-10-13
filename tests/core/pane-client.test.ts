import { describe, expect, test } from 'claude-code/testing'

import { clientRows, MAX_CLIENT_ROWS, parseClientOp } from '../../hooks/core/pane-client'
import type { PaneRow } from '../../hooks/core/pane'

const ctx = { color: (row: PaneRow) => `#${row.role}`, text: (row: PaneRow) => row.text, part: (t: string) => t, segColor: (role: string) => `#${role}` }

describe('the rows a Client is handed (080 FR-004)', () => {
  test('rows become plain data with their colour, links and action', () => {
    const rows: PaneRow[] = [
      { key: 'feature-002', text: '▾ ◆ 002 a', role: 'accent', href: 'file:///p/spec.md', links: [{ label: 'plan', href: 'file:///p/plan.md' }] },
      { key: 'close-all', text: '  001 002', role: 'muted', action: { id: '001-a\n002-b', label: 'ask Claude to close', kind: 'close' } },
    ]
    const out = clientRows(rows, ctx, new Set(['feature-002']))!
    expect(out[0]).toMatchObject({ k: 'feature-002', t: '▾ ◆ 002 a', c: '#accent', i: 1, l: [{ l: '↗', h: 'file:///p/spec.md' }, { l: ' plan↗', h: 'file:///p/plan.md' }] })
    expect(out[1]?.a).toEqual({ kind: 'close', id: '001-a\n002-b', label: 'ask Claude to close' })
    expect(out[1]?.i).toBeUndefined()
  })
  test('too many rows, or too many characters, draw as the tree does', () => {
    const many: PaneRow[] = Array.from({ length: MAX_CLIENT_ROWS + 1 }, (_, i) => ({ key: `r${i}`, text: 'x', role: 'text' as const }))
    expect(clientRows(many, ctx, new Set())).toBeUndefined()
    const long: PaneRow[] = Array.from({ length: 150 }, (_, i) => ({ key: `r${i}`, text: 'y'.repeat(600), role: 'text' as const }))
    expect(clientRows(long, ctx, new Set())).toBeUndefined()
  })
})

describe('what a Client posted is input, not fact (080 FR-003)', () => {
  test('known ops pass, with their fields checked', () => {
    expect(parseClientOp({ op: 'fold', key: 'feature-002', mode: 'toggle' })).toEqual({ op: 'fold', key: 'feature-002', mode: 'toggle' })
    expect(parseClientOp({ op: 'page', by: 1 })).toEqual({ op: 'page', by: 1 })
    expect(parseClientOp({ op: 'act', key: 'x' })).toEqual({ op: 'act', key: 'x' })
    expect(parseClientOp({ op: 'home' })).toEqual({ op: 'home' })
  })
  test('anything else is dropped', () => {
    expect(parseClientOp(undefined)).toBeUndefined()
    expect(parseClientOp({ op: 'fold', key: 'feature-002', mode: 'explode' })).toBeUndefined()
    expect(parseClientOp({ op: 'page', by: 5 })).toBeUndefined()
    expect(parseClientOp({ op: 'act', key: 'xx' })).toBeUndefined()
    expect(parseClientOp({ op: 'act', key: 'X' })).toBeUndefined()
    expect(parseClientOp({ op: 'select', key: 'a\u0007b' })).toBeUndefined()
    expect(parseClientOp({ op: 'action', kind: 'close', id: '001-a\n002-b' })).toEqual({ op: 'action', kind: 'close', id: '001-a\n002-b' })
    expect(parseClientOp({ op: 'action', kind: 'close', id: 'a\u001bb' })).toBeUndefined()
    expect(parseClientOp({ op: 'rm -rf' })).toBeUndefined()
  })
})
