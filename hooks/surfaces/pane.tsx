// The /astrolabe pane: a tab bar and the rows of the current tab. The engine follows $
// only inside register.tsx, so it passes the element table and the press handler in.
import type { ElementTable, RenderNode } from 'claude-code'

import type { PaneRow } from '../core/pane'
import { t, type Lang, type TextKey } from '../core/i18n'
import type { Tokens } from '../core/theme'
import type { PaneTab } from '../core/types'

export const PANE_TABS: ReadonlyArray<{ tab: PaneTab; label: TextKey; hotkey: string }> = [
  { tab: 'specs', label: 'tab.specs', hotkey: '1' },
  { tab: 'tasks', label: 'tab.tasks', hotkey: '2' },
  { tab: 'session', label: 'tab.session', hotkey: '3' },
  { tab: 'dashboard', label: 'tab.dashboard', hotkey: '4' },
  { tab: 'help', label: 'tab.help', hotkey: '5' },
  { tab: 'config', label: 'tab.config', hotkey: '6' },
  { tab: 'prs', label: 'tab.prs', hotkey: '7' },
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
  /** Drawn above the rows: the filter, the summary, the diff (024). */
  header: readonly RenderNode[] = [],
  /** The footer under every tab (035), after `pad` blank rows that hold it at the bottom. */
  footer?: { text: string; pad: number; columns: number; chips?: ReadonlyArray<{ key: string; text: string; bg: string; fg: string }>; arrow?: string },
  /** What is above and below the rows shown, with the presses that scroll (038). */
  nav?: { above: number; below: number; up: () => Promise<void>; down: () => Promise<void>; labels: { more: string } },
  /** Counts beside the tab labels (043 #21) and the keys of the tab shown (043 #25). */
  extras: { badges?: Partial<Record<PaneTab, string>>; legend?: string; onClose?: () => Promise<void>; onFind?: () => Promise<void>; onPriority?: () => Promise<void>; Link?: ElementTable<'terminal'>['Link'] } = {},
) => {
  const Link = extras.Link
  return (
  <Box flexDirection="column">
    <Box key="astrolabe-pane-tabs" flexDirection="row">
      {PANE_TABS.map(item => (
        <Button
          key={`tab-${item.tab}`}
          label={extras.badges?.[item.tab] === undefined ? t(lang, item.label) : `${t(lang, item.label)} ${extras.badges[item.tab]}`}
          hotkey={item.hotkey}
          variant={item.tab === tab ? 'primary' : 'secondary'}
          onPress={() => onSelect(item.tab)}
        />
      ))}
      {/* f focuses the filter (043 #23); ✕ closes the pane (043 #28). */}
      {extras.onFind !== undefined && <Button key="find" label="⌕ f" hotkey="f" plain onPress={() => extras.onFind!()} />}
      {/* p cycles the active spec's priority: normal, high, low (051). */}
      {extras.onPriority !== undefined && <Button key="priority" label="↑↓ p" hotkey="p" plain onPress={() => extras.onPriority!()} />}
      {extras.onClose !== undefined && <Button key="close-pane" label="✕" plain onPress={() => extras.onClose!()} />}
    </Box>
    <Box key="astrolabe-pane-body" flexDirection="column">
      {header}
      {nav !== undefined && nav.above > 0 && <Button key="scroll-up" label={`▲ ${nav.above} ${nav.labels.more} (k)`} hotkey="k" plain onPress={() => nav.up()} />}
      {body ??
        rows.map(row =>
          row.href !== undefined && Link !== undefined ? (
            <Box flexDirection="row">
              <Text color={tokens[row.role]} dimColor={row.dim === true} wrap="truncate-end">
                {row.text}
              </Text>
              <Text> </Text>
              <Link href={row.href} label="↗" />
            </Box>
          ) : (
            <Text color={tokens[row.role]} dimColor={row.dim === true} wrap="truncate-end">
              {row.text}
            </Text>
          ),
        )}
      {nav !== undefined && nav.below > 0 && <Button key="scroll-down" label={`▼ ${nav.below} ${nav.labels.more} (j)`} hotkey="j" plain onPress={() => nav.down()} />}
    </Box>
    {extras.legend === undefined ? null : (
      <Box key="astrolabe-pane-legend">
        <Text color={tokens.muted} dimColor wrap="truncate-end">
          {extras.legend}
        </Text>
      </Box>
    )}
    {footer === undefined ? null : (
      <Box flexDirection="column">
        {Array.from({ length: footer.pad }, () => (
          <Text> </Text>
        ))}
        <Box key="astrolabe-pane-footer" flexDirection="column">
          <Text color={tokens.pending}>{'─'.repeat(Math.max(1, footer.columns))}</Text>
          {footer.chips === undefined || footer.chips.length === 0 ? (
            <Text color={tokens.muted} wrap="truncate-end">
              {footer.text}
            </Text>
          ) : (
            // statusline's Powerline row (039): solid chips, an arrow cut from the two backgrounds.
            <Box flexDirection="row">
              {footer.chips.flatMap((chip, i) => {
                const next = footer.chips?.[i + 1]
                const arrow = footer.arrow ?? ''
                return [
                  <Text key={`chip-${chip.key}`} color={chip.fg} backgroundColor={chip.bg} bold>
                    {` ${chip.text} `}
                  </Text>,
                  ...(arrow === ''
                    ? next === undefined ? [] : [<Text> </Text>]
                    : [next === undefined ? <Text color={chip.bg}>{arrow}</Text> : <Text color={chip.bg} backgroundColor={next.bg}>{arrow}</Text>]),
                ]
              })}
            </Box>
          )}
        </Box>
      </Box>
    )}
  </Box>
)
}
