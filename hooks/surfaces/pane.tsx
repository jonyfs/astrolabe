// The /astrolabe pane: a tab bar and the rows of the current tab. The engine follows $
// only inside register.tsx, so it passes the element table and the press handler in.
import type { ElementTable } from 'claude-code'

import type { PaneRow } from '../core/pane'
import { t, type Lang, type TextKey } from '../core/i18n'
import type { Tokens } from '../core/theme'
import type { PaneTab } from '../core/types'

export const PANE_TABS: ReadonlyArray<{ tab: PaneTab; label: TextKey; hotkey: string }> = [
  { tab: 'specs', label: 'tab.specs', hotkey: '1' },
  { tab: 'tasks', label: 'tab.tasks', hotkey: '2' },
  { tab: 'session', label: 'tab.session', hotkey: '3' },
  { tab: 'dashboard', label: 'tab.dashboard', hotkey: '4' },
]

export const paneTree = (
  { Box, Text, Button }: Pick<ElementTable<'terminal' | 'desktop'>, 'Box' | 'Text' | 'Button'>,
  tab: PaneTab,
  rows: readonly PaneRow[],
  tokens: Tokens,
  onSelect: (tab: PaneTab) => Promise<void>,
  /** A body drawn in place of the rows (the Dashboard, 018). */
  body?: ReturnType<ElementTable<'terminal'>['Box']>,
  lang: Lang = 'en',
) => (
  <Box flexDirection="column">
    <Box key="astrolabe-pane-tabs" flexDirection="row">
      {PANE_TABS.map(item => (
        <Button
          key={`tab-${item.tab}`}
          label={t(lang, item.label)}
          hotkey={item.hotkey}
          variant={item.tab === tab ? 'primary' : 'secondary'}
          onPress={() => onSelect(item.tab)}
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
