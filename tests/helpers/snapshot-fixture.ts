// The surfaces drawn from one fixed project, per flavor and width (064 SC-001). Pure: it
// imports only hooks/core, so the mod tests and scripts/update-snapshots.ts build the same
// object. Colours are the flavor's own hex values, so a role that loses its colour, or a
// literal one, changes the snapshot.
// Reset times print as a weekday and a clock in the machine's time zone, so the snapshots are
// taken in UTC: the golden file is the same on every machine.
const nodeProcess = (globalThis as { process?: { env: Record<string, string | undefined> } }).process
if (nodeProcess !== undefined) nodeProcess.env['TZ'] = 'UTC'
import { layoutLive, liveRows } from '../../hooks/core/live-table'
import { bandSegments, type Segment } from '../../hooks/core/band'
import { footerChips, footerText } from '../../hooks/core/footer'
import { iconSet } from '../../hooks/core/icons'
import { specsRows, taskRows } from '../../hooks/core/pane'
import { formatStatus } from '../../hooks/core/status-text'
import { CHIPS, FLAVORS, type FlavorName } from '../../hooks/core/theme'
import { emptyMemo, type Feature, type SpeckitState } from '../../hooks/core/types'

export const FLAVOR_NAMES = ['mocha', 'latte', 'frappe', 'macchiato', 'colorblind'] as const satisfies readonly FlavorName[]
export const WIDTHS = [80, 100, 144, 200] as const
export const NOW = Date.UTC(2026, 9, 12, 12, 0)

const feature = (id: string, name: string, phase: Feature['phase'], done: number, total: number, over: Partial<Feature> = {}): Feature =>
  ({ id, name, dir: `${id}-${name}`, phase, done, total, warnings: [], ...over }) as Feature

const features: Feature[] = [
  feature('001', 'core-state', 'done', 10, 10),
  feature('002', 'band-hint', 'implement', 9, 20),
  feature('064', 'design-tokens', 'plan', 0, 0),
  feature('1000', 'long-numbered-feature-name', 'tasks', 0, 12),
]

export const fixtureState = (): SpeckitState =>
  ({
    present: true,
    root: '/proj',
    constitution: 'ratified',
    features,
    active: { dir: '002-band-hint', id: '002', name: 'band-hint', source: 'feature.json' },
    isAnalyzed: true,
    activeTasks: [
      { id: 'T009', text: 'Write the cart test', isDone: true, line: 9 },
      { id: 'T010', text: 'Show an empty-cart message', isDone: false, line: 10 },
      { id: 'T011', text: 'Add the checkout button', isDone: false, line: 11 },
    ],
    currentTask: { id: 'T010', text: 'Show an empty-cart message' },
  }) as unknown as SpeckitState

const fiveHour = new Date(NOW + 2 * 3_600_000 + 9 * 60_000).toISOString()
const sevenDay = new Date(NOW + 3 * 86_400_000).toISOString()

/** `text|#hex` per drawn segment or row, one list per surface. */
export const surfacesOf = (flavor: FlavorName, columns: number): Record<string, string[]> => {
  const tokens = FLAVORS[flavor]
  const chips = CHIPS[flavor]
  const state = fixtureState()
  const withRole = (items: readonly { text: string; role: keyof typeof tokens }[]) => items.map(i => `${i.text}|${tokens[i.role]}`)
  const band = (bandSegments(state, columns) as Segment[]).map(s => ({ text: s.text, role: s.role }))
  const footerInput = {
    speckit: () => '◆ 002 · implement 45%',
    readings: [
      { kind: 'five_hour', percentUsed: 42, resetsAt: fiveHour },
      { kind: 'seven_day', percentUsed: 81, resetsAt: sevenDay },
    ],
    context: { percent: 61 },
    model: 'claude-opus-5-5',
    effort: 'high',
    git: { branch: 'main', ahead: 2, behind: 1, changed: 3, conflicts: 0 },
    startedAt: NOW - 65 * 60_000,
    now: NOW,
    icons: iconSet('ascii'),
    columns,
  }
  // The live table (069): two agents, a gate, a cold cache and a limit at 81%.
  const live = layoutLive({
    columns,
    reservation: {},
    rows: liveRows({
      agents: [
        { id: 'a', brief: 'Review the spec', type: 'Explore', model: 'claude-opus-5-5', step: 'reading', contextPercent: 33, tokens: 12_400, startedAt: NOW - 252_000 },
        { id: 'b', brief: 'Write the tests', type: 'Plan', model: 'claude-sonnet-5-5', startedAt: NOW - 40_000 },
      ],
      gates: [{ pid: 9, hook: 'pre-commit', chain: ['gates.sh', 'review.test.sh'], where: '*', startedAt: NOW - 14_000 }],
      cache: { at: NOW - 400_000, tokens: 182_000, ttlMs: 300_000 },
      readings: [{ kind: 'seven_day', percentUsed: 81, resetsAt: sevenDay }],
      thresholds: {},
      band: 'hold',
      now: NOW,
      option: 'both',
    }),
  })
  const kindRole = { agent: 'accent', gate: 'current', cache: 'muted', limit: 'accent' } as const
  const liveRowsOut = [
    `${live.columns.map(c => live.header[c]).join(' ')}|${tokens.faint}`,
    ...live.lines.map(l => `${l.rule === true ? '─' : live.columns.map(c => l.cells[c]).join(' ')}|${tokens[l.rule === true ? 'pending' : (l.row?.level?.role ?? kindRole[l.kind])]}`),
  ]
  return {
    band: withRole(band),
    live: liveRowsOut,
    status: [formatStatus(state, columns)],
    footer: [footerText(footerInput), ...footerChips(footerInput).map(c => `${c.text}|${chips[c.colour] ?? '?'}`)],
    pane: withRole([
      ...specsRows(state, columns),
      ...taskRows(state, emptyMemo(), NOW, columns, 'en', NOW),
    ]),
  }
}

export const allSurfaces = (): Record<string, string[]> => {
  const out: Record<string, string[]> = {}
  for (const flavor of FLAVOR_NAMES) {
    for (const columns of WIDTHS) {
      for (const [surface, rows] of Object.entries(surfacesOf(flavor, columns))) out[`${flavor}/${columns}/${surface}`] = rows
    }
  }
  return out
}
