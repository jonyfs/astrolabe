import { describe, expect, test } from 'claude-code/testing'

import {
  agentRows,
  cacheRows,
  detectGates,
  gateRows,
  LIVE_DROP,
  LIVE_WIDTHS,
  layoutLive,
  limitRows,
  liveRows,
  parseProcesses,
  type LiveRow,
} from '../../hooks/core/live-table'

const NOW = Date.UTC(2026, 9, 12, 12, 0)

const agent = (over: Partial<Parameters<typeof agentRows>[0][number]> = {}) => ({ id: 'a1', brief: 'Review the spec', model: 'claude-opus-5-5', startedAt: NOW - 252_000, ...over })

describe('rows (069 #43)', () => {
  test('an agent: tier, type, brief, step, gauge, tokens and age; absent facts stay blank', () => {
    const [row] = agentRows([agent({ type: 'Explore', step: 'reading', contextPercent: 33, tokens: 12_400 })], NOW)
    expect(row).toMatchObject({ kind: 'agent', who: 'opus', where: 'Explore', what: 'Review the spec', now: 'reading', size: '12k', time: '4m12s' })
    expect(row?.level?.percent).toBe(33)
    const [bare] = agentRows([agent()], NOW)
    expect(bare).toMatchObject({ where: '', now: '', size: '' })
    expect(bare?.level).toBeUndefined()
  })
  test('a type two agents share is blank for both', () => {
    const rows = agentRows([agent({ id: 'a', type: 'Explore' }), agent({ id: 'b', type: 'Explore' }), agent({ id: 'c', type: 'Plan' })], NOW)
    expect(rows.map(r => r.where)).toEqual(['', '', 'Plan'])
  })
  test('a gate: hook or gate, the chain, running or waiting in yellow, its age', () => {
    const rows = gateRows(
      [
        { pid: 10, hook: 'pre-commit', chain: ['gates.sh', 'review-cycle.test.sh'], where: '*', startedAt: NOW - 14_000 },
        { pid: 11, chain: ['gates.sh'], where: 'review', startedAt: NOW - 3_000, waiting: true },
      ],
      NOW,
    )
    expect(rows[0]).toMatchObject({ kind: 'gate', who: 'pre-commit', where: '*', what: 'gates.sh › review-cycle.test.sh', now: 'running', time: '14s', size: '' })
    expect(rows[1]).toMatchObject({ who: 'gate', now: 'waiting for gates.lock', nowWarn: true })
  })
  test('the cache shows in its last two minutes and once cold, never while it has time', () => {
    const at = NOW - 4 * 60_000 - 10_000
    expect(cacheRows({ at: NOW - 60_000, tokens: 90_000, ttlMs: 300_000 }, NOW)).toEqual([])
    const [warm] = cacheRows({ at, tokens: 182_000, ttlMs: 300_000 }, NOW)
    expect(warm).toMatchObject({ kind: 'cache', who: 'cache', where: '5m', now: 'warm', size: '182k', time: '50s' })
    const [cold] = cacheRows({ at: NOW - 400_000, tokens: 182_000, ttlMs: 300_000 }, NOW)
    expect(cold).toMatchObject({ now: 'cold', time: '' })
    expect(cacheRows(undefined, NOW)).toEqual([])
  })
  test('a limit shows from 60% with the ramp mark and its reset', () => {
    const readings = [
      { kind: 'five_hour', percentUsed: 59, resetsAt: new Date(NOW + 3_600_000).toISOString() },
      { kind: 'seven_day', percentUsed: 84, resetsAt: new Date(NOW + 2 * 86_400_000).toISOString() },
    ]
    const rows = limitRows(readings, NOW, {}, 'hold')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ kind: 'limit', who: '7d', now: 'hold' })
    expect(rows[0]?.level).toMatchObject({ percent: 84, mark: '▴', role: 'blocked' })
    expect(rows[0]?.time).toMatch(/^[A-Z][a-z]{2} \d\d:\d\d$/)
    expect(limitRows([{ kind: 'five_hour', percentUsed: 60, resetsAt: new Date(NOW + 3_600_000).toISOString() }], NOW, {}, 'ok')[0]).toMatchObject({ who: '5h', now: '', time: '1h00m' })
  })
  test('liveRows honours the option: agents, gates, both or off; cache and limits stay', () => {
    const input = {
      agents: [agent()],
      gates: [{ pid: 1, chain: ['gates.sh'], where: '*', startedAt: NOW - 1000 }],
      cache: { at: NOW - 400_000, tokens: 1000, ttlMs: 300_000 },
      readings: [],
      thresholds: {},
      band: 'ok' as const,
      now: NOW,
    }
    const kinds = (rows: LiveRow[]) => rows.map(r => r.kind)
    expect(kinds(liveRows({ ...input, option: 'both' }))).toEqual(['agent', 'gate', 'cache'])
    expect(kinds(liveRows({ ...input, option: 'agents' }))).toEqual(['agent', 'cache'])
    expect(kinds(liveRows({ ...input, option: 'gates' }))).toEqual(['gate', 'cache'])
    expect(kinds(liveRows({ ...input, option: 'off' }))).toEqual(['cache'])
  })
})

const row = (kind: LiveRow['kind'], n: number, over: Partial<LiveRow> = {}): LiveRow => ({ kind, who: `w${n}`, where: '', what: `${kind} ${n}`, now: 'running', size: '', time: '1s', ...over })

describe('layout (069 #43)', () => {
  test('rows group agents, gates, cache, limits with a rule between kinds; at most three then +N', () => {
    const rows = [row('limit', 1), row('agent', 1), row('agent', 2), row('agent', 3), row('agent', 4), row('agent', 5), row('gate', 1), row('cache', 1)]
    const out = layoutLive({ rows, columns: 180, reservation: {} })
    const body = out.lines.map(l => (l.rule ? '─' : l.kind))
    expect(body).toEqual(['agent', 'agent', 'agent', 'agent', '─', 'gate', '─', 'cache', '─', 'limit'])
    expect(out.lines[3]?.cells.what.trim()).toBe('+2')
    expect(out.hidden).toBe(2)
  })
  test('nothing live draws nothing', () => {
    expect(layoutLive({ rows: [], columns: 180, reservation: {} }).lines).toEqual([])
  })
  test('a column keeps the width it first needed, and never exceeds its declared one', () => {
    const long = row('agent', 1, { what: 'x'.repeat(24) })
    const first = layoutLive({ rows: [long], columns: 180, reservation: {} })
    expect(first.reservation.what).toBe(24)
    const second = layoutLive({ rows: [row('agent', 2, { what: 'short' })], columns: 180, reservation: first.reservation })
    expect(second.widths.what).toBe(24)
    const huge = layoutLive({ rows: [row('agent', 3, { what: 'y'.repeat(80) })], columns: 180, reservation: second.reservation })
    expect(huge.widths.what).toBe(LIVE_WIDTHS.what)
    expect(huge.lines[0]?.cells.what.endsWith('…')).toBe(true)
  })
  test('blank cells are blank, never 0; size and time align right', () => {
    const out = layoutLive({ rows: [row('agent', 1, { size: '12k', time: '4m12s' })], columns: 180, reservation: {} })
    const cells = out.lines[0]!.cells
    expect(cells.size).toBe('12k'.padStart(out.widths.size))
    expect(cells.time).toBe('4m12s'.padStart(out.widths.time))
    expect(out.lines[0]!.cells.where).toBe(''.padEnd(out.widths.where))
  })
  test('columns drop SIZE, TIME, NOW, WHERE as width falls; WHO, WHAT and LEVEL stay', () => {
    expect([...LIVE_DROP]).toEqual(['size', 'time', 'now', 'where'])
    const rows = [row('agent', 1, { size: '12k', where: 'Explore', level: { percent: 40, role: 'done' } })]
    const shown = (columns: number) => layoutLive({ rows, columns, reservation: {} }).columns
    expect(shown(180)).toEqual(['who', 'where', 'what', 'now', 'level', 'size', 'time'])
    expect(shown(100)).toEqual(['who', 'where', 'what', 'now', 'level'])
    expect(shown(80)).toEqual(['who', 'where', 'what', 'level'])
    expect(shown(60)).toEqual(['who', 'what', 'level'])
  })
  test('on a short window gate rows go first, then agent rows', () => {
    const rows = [row('agent', 1), row('agent', 2), row('gate', 1), row('cache', 1), row('limit', 1)]
    const kinds = (maxRows: number) => layoutLive({ rows, columns: 180, reservation: {}, maxRows }).lines.filter(l => !l.rule).map(l => l.kind)
    expect(kinds(10)).toEqual(['agent', 'agent', 'gate', 'cache', 'limit'])
    expect(kinds(6)).toEqual(['agent', 'agent', 'cache', 'limit'])
    expect(kinds(3)).toEqual(['cache', 'limit'])
  })
})

describe('gate detection (069 #44)', () => {
  const ps = [
    '  100     1    05:12 /usr/bin/zsh',
    '  200   100       14 /repo/.git/hooks/pre-commit',
    '  201   200       13 /bin/sh /repo/scripts/gates.sh',
    '  202   201       12 /bin/sh /repo/scripts/review-cycle.test.sh',
    '  300   100       40 bash /repo/tools/gate-lint.sh',
    '  400   100     2:03 node server.js',
    '  500   100     1:00 bash /repo/gates/check.sh',
  ].join('\n')
  test('parses pid, parent, age and command', () => {
    const rows = parseProcesses(ps)
    expect(rows[1]).toEqual({ pid: 200, ppid: 100, ageMs: 14_000, command: '/repo/.git/hooks/pre-commit' })
    expect(rows[5]?.ageMs).toBe(123_000)
  })
  test('a hook folds its descendants into one chain; a script run directly is a gate', () => {
    const gates = detectGates(parseProcesses(ps), { root: '/repo', now: NOW })
    expect(gates.map(g => [g.hook, g.chain])).toEqual([
      ['pre-commit', ['gates.sh', 'review-cycle.test.sh']],
      [undefined, ['gate-lint.sh']],
      [undefined, ['check.sh']],
    ])
    expect(gates[0]).toMatchObject({ pid: 200, where: '*', startedAt: NOW - 14_000 })
  })
  test('project patterns add gates; a process that is no gate is left out', () => {
    const gates = detectGates(parseProcesses(ps), { root: '/repo', now: NOW, patterns: ['server.js'] })
    expect(gates.map(g => g.chain[0])).toContain('server.js')
    expect(detectGates(parseProcesses('  1 0 1 node app.js'), { root: '/repo', now: NOW })).toEqual([])
  })
  test('the pid named by gates.lock reads as waiting', () => {
    const gates = detectGates(parseProcesses(ps), { root: '/repo', now: NOW, lockPid: 300 })
    expect(gates.find(g => g.pid === 300)?.waiting).toBe(true)
    expect(gates.find(g => g.pid === 200)?.waiting).toBeUndefined()
  })
})
