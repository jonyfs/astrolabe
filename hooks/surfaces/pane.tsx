// The /astrolabe pane: a tab bar and the rows of the current tab. The engine follows $
// only inside register.tsx, so it passes the element table and the press handler in.
import type { ElementTable } from 'claude-code'

import type { PaneRow } from '../core/pane'
import type { Tokens } from '../core/theme'
import type { PaneTab } from '../core/types'

export const PANE_TABS: ReadonlyArray<{ tab: PaneTab; label: string; hotkey: string }> = [
  { tab: 'specs', label: 'Specs', hotkey: '1' },
  { tab: 'tasks', label: 'Tasks', hotkey: '2' },
  { tab: 'session', label: 'Session', hotkey: '3' },
  { tab: 'dashboard', label: 'Dashboard', hotkey: '4' },
]

export const paneTree = (
  { Box, Text, Button }: Pick<ElementTable<'terminal' | 'desktop'>, 'Box' | 'Text' | 'Button'>,
  tab: PaneTab,
  rows: readonly PaneRow[],
  tokens: Tokens,
  onSelect: (tab: PaneTab) => Promise<void>,
  /** A body drawn in place of the rows (the Dashboard, 018). */
  body?: ReturnType<ElementTable<'terminal'>['Box']>,
) => (
  <Box flexDirection="column">
    <Box key="astrolabe-pane-tabs" flexDirection="row">
      {PANE_TABS.map(t => (
        <Button
          key={`tab-${t.tab}`}
          label={t.label}
          hotkey={t.hotkey}
          variant={t.tab === tab ? 'primary' : 'secondary'}
          onPress={() => onSelect(t.tab)}
        />
      ))}
    </Box>
    <Box key="astrolabe-pane-body" flexDirection="column">
      {body ?? rows.map(row => (
        <Text color={tokens[row.role]} dimColor={row.dim === true} wrap="truncate-end">
          {row.text}
        </Text>
      ))}
    </Box>
  </Box>
)
