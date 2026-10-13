// The pane's four tabs, what each counts and which keys it offers (066, 078). Pure: no $.
import type { TextKey } from './i18n'
import { activeMark } from './status-text'
import type { PaneTab, SpeckitState } from './types'

// Tasks are items of a spec: they sit under it in the Specs tab, and `t` shows only them (078).
// The digits follow the tab order (078 FR-019).
export const TABS: ReadonlyArray<{ tab: PaneTab; label: TextKey; hotkey: string }> = [
  { tab: 'specs', label: 'tab.specs', hotkey: '1' },
  { tab: 'session', label: 'tab.session', hotkey: '2' },
  { tab: 'prs', label: 'tab.prs', hotkey: '3' },
  { tab: 'setup', label: 'tab.setup', hotkey: '4' },
]

/** A tab stored by an earlier version maps to its new tab; help is an overlay now (066 #21). */
export const legacyTab = (stored: string | undefined): PaneTab => {
  switch (stored) {
    case 'specs':
    case 'tasks':
      return 'specs'
    case 'session':
    case 'prs':
    case 'setup':
      return stored
    case 'dashboard':
      return 'session'
    case 'config':
    case 'models':
      return 'setup'
    default:
      return 'specs'
  }
}

/** Counts that wait on the person (066 #23): never a total, nothing when nothing waits. */
export const badgesOf = (input: {
  inProgress?: number
  openTasks?: number
  pulls?: number | undefined
  governor?: 'ok' | 'throttle' | 'hold' | 'stop' | 'ceiling'
}): Partial<Record<PaneTab, string>> => ({
  // One badge for specs and the active spec's open tasks: `2·11` (078 FR-014).
  ...(() => {
    const specs = input.inProgress === undefined || input.inProgress <= 0 ? undefined : String(input.inProgress)
    const tasks = input.openTasks === undefined || input.openTasks <= 0 ? undefined : String(input.openTasks)
    const badge = [specs, tasks].filter((x): x is string => x !== undefined).join('·')
    return badge === '' ? {} : { specs: badge }
  })(),
  ...(input.governor === 'hold' || input.governor === 'stop' || input.governor === 'ceiling' ? { session: '▲' } : {}),
  ...(input.pulls === undefined || input.pulls <= 0 ? {} : { prs: String(input.pulls) }),
})

export type LegendKey = 'filter' | 'status' | 'order' | 'view' | 'group' | 'priority' | 'advisor' | 'refresh' | 'copy' | 'clear' | 'tasks' | 'open' | 'tick' | 'use'
export type LegendPair = { id: LegendKey; hotkey: string; verb: string }

const FULL: Readonly<Record<LegendKey, string>> = {
  filter: 'filter',
  status: 'status',
  order: 'order',
  view: 'view',
  group: 'group',
  priority: 'priority',
  advisor: 'advisor',
  refresh: 'refresh',
  copy: 'copy kpis',
  clear: 'clear',
  tasks: 'tasks only',
  open: 'open all',
  tick: 'tick',
  use: 'use',
}
// The short forms keep the keys and shorten the words (066 #21, board 5).
const SHORT: Readonly<Record<LegendKey, string>> = {
  filter: 'find',
  status: 'stat',
  order: 'sort',
  view: 'view',
  group: 'grp',
  priority: 'prio',
  advisor: 'adv',
  refresh: 'ref',
  copy: 'copy',
  clear: 'clr',
  tasks: 'tasks',
  open: 'all',
  tick: 'tick',
  use: 'use',
}
const HOTKEY: Readonly<Record<LegendKey, string>> = { filter: 'f', status: 's', order: 'o', view: 'v', group: 'g', priority: 'p', advisor: 'a', refresh: 'r', copy: 'm', clear: 'c', tasks: 't', open: 'e', tick: 'x', use: 'u' }

const BY_TAB: Readonly<Record<PaneTab, readonly LegendKey[]>> = {
  // At most six keys a tab names (078 FR-015); the rest still work and the help overlay lists them.
  specs: ['filter', 'tasks', 'status', 'order', 'open', 'refresh'],
  session: ['copy', 'refresh'],
  prs: ['refresh'],
  setup: ['filter', 'refresh'],
}

export const legendOf = (tab: PaneTab, opts: { wide: boolean }): LegendPair[] =>
  BY_TAB[tab].map(id => ({ id, hotkey: HOTKEY[id], verb: (opts.wide ? FULL : SHORT)[id] }))

/**
 * What the person's Escape takes away first (078 FR-018): the help overlay on top, then the
 * filter, and only then the pane closes.
 */
export const escapeStep = (pane: { help?: true | undefined; filter?: string | undefined }): 'help' | 'filter' | 'close' =>
  pane.help === true ? 'help' : (pane.filter ?? '').trim() !== '' ? 'filter' : 'close'

const WHY = { 'feature.json': 'feature.json', branch: 'branch', latest: 'highest open spec' } as const

/** The pane's title: the active feature the way the band names it, and why it is active (066 #30). */
export const paneTitle = (state: Pick<SpeckitState, 'active' | 'activeWarning'> | undefined): string => {
  const base = '🧭 Astrolabe'
  if (state?.active === undefined) return base
  return `${base} · ${activeMark(state)} ${state.active.name} · ${WHY[state.active.source]}`
}
