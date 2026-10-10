// The /astrolabe pane: a tab bar and the rows of the current tab. The engine follows $
// only inside register.tsx, so it passes the element table and the press handler in.
import type { ElementTable, RenderNode } from 'claude-code'

import type { PaneRow } from '../core/pane'
import { t, type Lang, type TextKey } from '../core/i18n'
import { markText } from '../core/icons'
import { COLORBLIND_MARKS, type Tokens } from '../core/theme'
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
  footer?: {
    text: string
    pad: number
    columns: number
    /** The rule above the chips (041 #8): solid, thin or none. */
    separator?: 'solid' | 'thin' | 'none'
    /** The chips in rows: one row, or statusline's three lines (041 #1). */
    chips?: ReadonlyArray<ReadonlyArray<{ key: string; text: string; bg: string; fg: string; links?: ReadonlyArray<{ text: string; href: string }> }>>
    arrow?: string
  },
  /** What is above and below the rows shown, with the presses that scroll (038). */
  nav?: { above: number; below: number; up: () => Promise<void>; down: () => Promise<void>; labels: { more: string } },
  /** Counts beside the tab labels (043 #21) and the keys of the tab shown (043 #25). */
  extras: { badges?: Partial<Record<PaneTab, string>>; legend?: string; onClose?: () => Promise<void>; onFind?: () => Promise<void>; onPriority?: () => Promise<void>; onRunQueued?: (id: string) => Promise<void>; rowButtons?: ReadonlyArray<{ key: string; label: string; onPress: () => void }>; onAllowUsage?: () => Promise<void>; onRevokeUsage?: () => Promise<void>; status?: { label: string; onPress: () => Promise<void> }; columns?: number; marks?: 'unicode' | 'ascii' | 'words'; colorblind?: boolean; wrapLongNames?: boolean; Link?: ElementTable<'terminal'>['Link'] } = {},
) => {
  const Link = extras.Link
  // The pane's own marks in the set the icons option and the accessible mode pick (052 #49, #47).
  const m = (text: string) => markText(text, extras.marks ?? 'unicode')
  const linkScope = (row: PaneRow) => `astrolabe-spec-link-${row.key}`
  const rowHover = (row: PaneRow) =>
    tab === 'specs' && row.href !== undefined && row.selected !== true
      ? { scope: linkScope(row), underline: true }
      : undefined
  const rowLink = (row: PaneRow, key: string, href: string, label: string) => {
    if (Link === undefined) return null
    const node = <Link key={key} href={href} label={label} />
    if (tab !== 'specs' || row.href === undefined || row.selected === true) return node
    return <Box key={`${key}-hover`} display="none" hover={{ scope: linkScope(row), display: 'flex' }}>{node}</Box>
  }
  // The footer's chips draw their own links; `rowLink` wraps a PaneRow's hover, these stay plain (041 #6).
  const chipLink = (key: string, href: string, label: string) => {
    if (Link === undefined) return []
    return [<Link key={key} href={href} label={label} />]
  }
  return (
  <Box flexDirection="column">
    <Box key="astrolabe-pane-tabs" flexDirection="row">
      {PANE_TABS.map(item => (
        <Button
          key={`tab-${item.tab}`}
          label={
            // Below 80 columns a tab is its number and badge, so the row never wraps (052 #1).
            // The tab shown also gets ▸, beyond the button's colour (052 #2).
            `${item.tab === tab ? '▸ ' : ''}${
              extras.columns !== undefined && extras.columns < 80
                ? `${item.hotkey}${extras.badges?.[item.tab] === undefined ? '' : `·${extras.badges[item.tab]}`}`
                : extras.badges?.[item.tab] === undefined ? t(lang, item.label) : `${t(lang, item.label)} ${extras.badges[item.tab]}`
            }`
          }
          hotkey={item.hotkey}
          variant={item.tab === tab ? 'primary' : 'secondary'}
          onPress={() => onSelect(item.tab)}
        />
      ))}
      {/* h opens Help from any tab (052 #50). */}
      {tab !== 'help' && <Button key="help-key" label="? h" hotkey="h" plain onPress={() => onSelect('help')} />}
      {/* f focuses the filter (043 #23); ✕ closes the pane (043 #28). */}
      {extras.onFind !== undefined && <Button key="find" label={m('⌕ f')} hotkey="f" plain onPress={() => extras.onFind!()} />}
      {/* s cycles the status filter (054 #21). */}
      {extras.status !== undefined && <Button key="status-filter" label={`s ${extras.status.label}`} hotkey="s" plain onPress={() => extras.status!.onPress()} />}
      {/* p cycles the active spec's priority: normal, high, low (051). */}
      {extras.onPriority !== undefined && <Button key="priority" label={m('↑↓ p')} hotkey="p" plain onPress={() => extras.onPriority!()} />}
      {extras.onClose !== undefined && <Button key="close-pane" label={m('✕')} plain onPress={() => extras.onClose!()} />}
    </Box>
    <Box key="astrolabe-pane-body" flexDirection="column">
      {header}
      {nav !== undefined && nav.above > 0 && <Button key="scroll-up" label={`▲ ${nav.above} ${nav.labels.more} (k)`} hotkey="k" plain onPress={() => nav.up()} />}
      {body ??
        rows.flatMap(row => {
          const node = (
          row.label !== undefined && row.value !== undefined ? (
            <Box key={row.key} flexDirection="row">
              <Text color={row.selected === true ? tokens.accent : tokens[row.role]} dimColor={row.dim === true} bold={row.selected === true || row.bold === true}>
                {m(colorblindLabel(row, extras.colorblind))}
              </Text>
              <Text key={`${row.key}-value`} color={row.selected === true ? tokens.accent : tokens[row.role]} dimColor={row.dim === true} bold={row.selected === true || row.bold === true} wrap="wrap">
                {m(row.value)}
              </Text>
              {row.href !== undefined && Link !== undefined && <Text> </Text>}
              {row.href !== undefined && Link !== undefined && rowLink(row, `${row.key}-spec-link`, row.href, m('↗'))}
              {Link !== undefined && (row.links ?? []).map(link => rowLink(row, `link-${link.label}`, link.href, ` ${link.label}${m('↗')}`))}
              {row.action !== undefined && extras.onRunQueued !== undefined && (
                <Button
                  key={`queue-run-${row.action.id}`}
                  label={row.action.label}
                  hotkey={row.action.hotkey}
                  plain
                  onPress={() => extras.onRunQueued!(row.action!.id)}
                />
              )}
            </Box>
          ) : row.action !== undefined &&
            (row.action.kind === 'allow'
              ? extras.onAllowUsage !== undefined
              : row.action.kind === 'revoke'
                ? extras.onRevokeUsage !== undefined
                : extras.onRunQueued !== undefined) ? (
            <Box key={row.key} flexDirection="row">
              <Text color={tokens[row.role]} dimColor={row.dim === true} bold={row.bold === true} wrap={extras.wrapLongNames === true ? 'wrap' : 'truncate-end'}>
                {m(colorblindText(row, extras.colorblind))}
              </Text>
              <Button
                key={row.action.kind === undefined ? `queue-run-${row.action.id}` : `usage-${row.action.kind}`}
                label={row.action.label}
                hotkey={row.action.hotkey}
                plain
                onPress={() => row.action?.kind === 'allow'
                  ? extras.onAllowUsage!()
                  : row.action?.kind === 'revoke'
                    ? extras.onRevokeUsage!()
                    : extras.onRunQueued!(row.action!.id)}
              />
            </Box>
          ) : row.segments !== undefined ? (
            // Parts of the row in their own colours (052 #12).
            <Box flexDirection="row">
              {row.selected === true && <Text color={tokens.accent} bold>{m('❯ ')}</Text>}
              {row.segments.map(seg => (
                <Text color={tokens[seg.role]} dimColor={row.dim === true} hover={rowHover(row)}>
                  {m(seg.text)}
                </Text>
              ))}
              {row.href !== undefined && Link !== undefined && <Text> </Text>}
              {row.href !== undefined && Link !== undefined && rowLink(row, `${row.key}-spec-link`, row.href, m('↗'))}
              {Link !== undefined && (row.links ?? []).map(link => rowLink(row, `link-${link.label}`, link.href, ` ${link.label}${m('↗')}`))}
            </Box>
          ) : row.href !== undefined && Link !== undefined ? (
            <Box flexDirection="row">
              <Text color={row.selected === true ? tokens.accent : tokens[row.role]} dimColor={row.dim === true} bold={row.selected === true || row.bold === true} wrap={extras.wrapLongNames === true ? 'wrap' : 'truncate-end'} hover={rowHover(row)}>
                {m(`${row.selected === true ? '❯ ' : ''}${colorblindText(row, extras.colorblind)}`)}
              </Text>
              <Text> </Text>
              {rowLink(row, `${row.key}-spec-link`, row.href, m('↗'))}
              {(row.links ?? []).map(link => rowLink(row, `link-${link.label}`, link.href, ` ${link.label}${m('↗')}`))}
            </Box>
          ) : (
            <Text color={row.selected === true ? tokens.accent : tokens[row.role]} dimColor={row.dim === true} bold={row.selected === true || row.bold === true} wrap={extras.wrapLongNames === true ? 'wrap' : 'truncate-end'} hover={rowHover(row)}>
              {m(`${row.selected === true ? '❯ ' : ''}${colorblindText(row, extras.colorblind)}`)}
            </Text>
          )
          )
          // The review buttons sit under the spec they act on (the selected one).
          if (tab !== 'specs' || row.selected !== true || extras.rowButtons === undefined || extras.rowButtons.length === 0) return [node]
          return [
            node,
            <Box key={`${row.key}-buttons`} flexDirection="row">
              <Text>{'  '}</Text>
              {extras.rowButtons.map(button => (
                <Button key={button.key} label={button.label} plain onPress={() => button.onPress()} />
              ))}
            </Box>,
          ]
        })}
      {nav !== undefined && nav.below > 0 && <Button key="scroll-down" label={`▼ ${nav.below} ${nav.labels.more} (j)`} hotkey="j" plain onPress={() => nav.down()} />}
    </Box>
    {extras.legend === undefined ? null : (
      <Box key="astrolabe-pane-legend">
        <Text color={tokens.muted} dimColor wrap="truncate-end">
          {m(extras.legend)}
        </Text>
      </Box>
    )}
    {footer === undefined ? null : (
      <Box flexDirection="column">
        {Array.from({ length: footer.pad }, () => (
          <Text> </Text>
        ))}
        <Box key="astrolabe-pane-footer" flexDirection="column">
          {footer.separator === 'none' ? null : (
            <Text color={tokens.pending}>{(footer.separator === 'thin' ? '┄' : '─').repeat(Math.max(1, footer.columns))}</Text>
          )}
          {footer.chips === undefined || footer.chips.length === 0 ? (
            <Text color={tokens.muted} wrap="truncate-end">
              {footer.text}
            </Text>
          ) : (
            // statusline's Powerline rows (039, 041 #1): solid chips, an arrow cut from the two backgrounds.
            footer.chips.map((chips, rowIndex) => (
              <Box key={`footer-chip-row-${rowIndex}`} flexDirection="row">
                {chips.flatMap((chip, i) => {
                  const next = chips[i + 1]
                  const arrow = footer.arrow ?? ''
                  const links = Link === undefined ? [] : chip.links ?? []
                  let cursor = 0
                  const linked = links.flatMap((link, linkIndex) => {
                    const at = chip.text.indexOf(link.text, cursor)
                    if (at < 0) return []
                    const before = chip.text.slice(cursor, at)
                    cursor = at + link.text.length
                    return [
                      ...(before === '' ? [] : [<Text key={`chip-${chip.key}-before-${linkIndex}`} color={chip.fg} backgroundColor={chip.bg} bold>{`${linkIndex === 0 ? ' ' : ''}${before}`}</Text>]),
                      ...chipLink(`chip-${chip.key}-link-${linkIndex}`, link.href, link.text),
                    ]
                  })
                  const after = chip.text.slice(cursor)
                  return [
                    ...(linked.length === 0
                      ? [<Text key={`chip-${chip.key}`} color={chip.fg} backgroundColor={chip.bg} bold>{` ${chip.text} `}</Text>]
                      : [...linked, ...(after === '' ? [] : [<Text key={`chip-${chip.key}-after`} color={chip.fg} backgroundColor={chip.bg} bold>{`${after} `}</Text>])]),
                    ...(arrow === ''
                      ? next === undefined ? [] : [<Text> </Text>]
                      : [next === undefined ? <Text color={chip.bg}>{arrow}</Text> : <Text color={chip.bg} backgroundColor={next.bg}>{arrow}</Text>]),
                  ]
                })}
              </Box>
            ))
          )}
        </Box>
      </Box>
    )}
  </Box>
)
}

const colorblindLabel = (row: PaneRow, enabled: boolean | undefined): string => {
  if (!enabled) return row.label ?? ''
  const mark = COLORBLIND_MARKS[row.role]
  return mark === undefined || row.text.startsWith(mark) ? row.label ?? '' : `${mark} ${row.label ?? ''}`
}

const colorblindText = (row: PaneRow, enabled: boolean | undefined): string => {
  if (!enabled || row.key.startsWith('feature-') || row.key.startsWith('task-')) return row.text
  const mark = COLORBLIND_MARKS[row.role]
  return mark === undefined || row.text.startsWith(mark) ? row.text : `${mark} ${row.text}`
}
