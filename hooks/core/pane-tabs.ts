// The pane's five tabs, what each counts and which keys it offers (066). Pure: no $.
import type { TextKey } from './i18n'
import type { PaneTab } from './types'

export const TABS: ReadonlyArray<{ tab: PaneTab; label: TextKey; hotkey: string }> = [
  { tab: 'specs', label: 'tab.specs', hotkey: '1' },
  { tab: 'tasks', label: 'tab.tasks', hotkey: '2' },
  { tab: 'session', label: 'tab.session', hotkey: '3' },
  { tab: 'prs', label: 'tab.prs', hotkey: '4' },
  { tab: 'setup', label: 'tab.setup', hotkey: '5' },
]

/** A tab stored by an earlier version maps to its new tab; help is an overlay now (066 #21). */
export const legacyTab = (stored: string | undefined): PaneTab => {
  switch (stored) {
    case 'specs':
    case 'tasks':
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
  ...(input.inProgress === undefined || input.inProgress <= 0 ? {} : { specs: String(input.inProgress) }),
  ...(input.openTasks === undefined || input.openTasks <= 0 ? {} : { tasks: String(input.openTasks) }),
  ...(input.governor === 'hold' || input.governor === 'stop' || input.governor === 'ceiling' ? { session: '▲' } : {}),
  ...(input.pulls === undefined || input.pulls <= 0 ? {} : { prs: String(input.pulls) }),
})

export type LegendKey = 'filter' | 'status' | 'order' | 'priority' | 'advisor' | 'refresh' | 'copy' | 'clear'
export type LegendPair = { id: LegendKey; hotkey: string; verb: string }

const FULL: Readonly<Record<LegendKey, string>> = {
  filter: 'filter',
  status: 'status',
  order: 'order',
  priority: 'priority',
  advisor: 'advisor',
  refresh: 'refresh',
  copy: 'copy kpis',
  clear: 'clear',
}
// The short forms keep the keys and shorten the words (066 #21, board 5).
const SHORT: Readonly<Record<LegendKey, string>> = {
  filter: 'find',
  status: 'stat',
  order: 'sort',
  priority: 'prio',
  advisor: 'adv',
  refresh: 'ref',
  copy: 'copy',
  clear: 'clr',
}
const HOTKEY: Readonly<Record<LegendKey, string>> = { filter: 'f', status: 's', order: 'o', priority: 'p', advisor: 'a', refresh: 'r', copy: 'm', clear: 'c' }

const BY_TAB: Readonly<Record<PaneTab, readonly LegendKey[]>> = {
  specs: ['filter', 'status', 'order', 'priority', 'advisor', 'refresh'],
  tasks: ['filter', 'refresh'],
  session: ['copy', 'refresh'],
  prs: ['refresh'],
  setup: ['refresh'],
}

export const legendOf = (tab: PaneTab, opts: { wide: boolean }): LegendPair[] =>
  BY_TAB[tab].map(id => ({ id, hotkey: HOTKEY[id], verb: (opts.wide ? FULL : SHORT)[id] }))
