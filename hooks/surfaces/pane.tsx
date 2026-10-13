// The /astrolabe pane: a tab bar and the rows of the current tab. The engine follows $
// only inside register.tsx, so it passes the element table and the press handler in.
import type { ElementTable, RenderNode } from 'claude-code'

import type { PaneRow } from '../core/pane'
import { t, type Lang, type TextKey } from '../core/i18n'
import { markText } from '../core/icons'
import { hotkeyOf } from '../core/keys'
import { COLORBLIND_MARKS, type Tokens } from '../core/theme'
import { isLinkable } from '../core/statusline-dep'
import { legendOf } from '../core/pane-tabs'
import { TABS } from '../core/pane-tabs'
import type { PaneTab } from '../core/types'

export const PANE_TABS = TABS

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
    chips?: ReadonlyArray<ReadonlyArray<{ key: string; text: string; bg: string; fg: string; full?: string; /** One sentence for the hover row under the chips (068 #50). */ explain?: string; links?: ReadonlyArray<{ text: string; href: string }> }>>
    arrow?: string
    /** The lines statusline drew under the native lead, as styled runs (070). */
    lines?: ReadonlyArray<ReadonlyArray<{ text: string; fg?: string; bg?: string; bold?: true; dim?: true; underline?: true; href?: string }>>
    /** Why the footer is not statusline's, one dim row (070). */
    notice?: string
  },
  /** What is above and below the rows shown, with the presses that scroll (038). */
  nav?: { above: number; below: number; up: () => Promise<void>; down: () => Promise<void>; /** `g`: back to the first row (078 FR-017). */ top?: () => Promise<void>; labels: { more: string } },
  /** Counts beside the tab labels (043 #21) and the keys of the tab shown (043 #25). */
  extras: { view?: { label: string; onPress: () => Promise<void> }; group?: { label: string; onPress: () => Promise<void> }; onToggleBlock?: (key: string) => Promise<void>; help?: boolean; onHelp?: () => Promise<void>; onUpdate?: (id: string) => Promise<void>; badges?: Partial<Record<PaneTab, string>>; legend?: string; onClose?: () => Promise<void>; onFind?: () => Promise<void>; onCopy?: (text: string) => Promise<void>; onRefresh?: () => Promise<void>; onCopyKpis?: () => Promise<void>; showKeys?: boolean; sort?: { label: string; onPress: () => Promise<void> }; onClear?: () => Promise<void>; onPriority?: () => Promise<void>; onRunQueued?: (id: string) => Promise<void>; rowButtons?: ReadonlyArray<{ key: string; label: string; hotkey?: string; onPress: () => void }>; rowDetail?: string; onLiftBand?: () => Promise<void>; taskActions?: ReadonlyArray<{ key: string; label: string; onPress: () => void }>; rowDescription?: string; onCloseReady?: (dirs: string[]) => void; onReconcile?: (id: string) => void; onAsk?: (id: string) => void; onFold?: (id: string) => void; onFinding?: (id: string) => void; onSpecify?: (id: string) => void; preset?: { label: string; onPress: () => Promise<void> }; onParallel?: (id: string) => void; tasksOnly?: { label: string; onPress: () => Promise<void> }; openAll?: { label: string; onPress: () => Promise<void> }; onAllowUsage?: () => Promise<void>; onRevokeUsage?: () => Promise<void>; status?: { label: string; onPress: () => Promise<void> }; columns?: number; marks?: 'unicode' | 'ascii' | 'words'; colorblind?: boolean; wrapLongNames?: boolean; Link?: ElementTable<'terminal'>['Link'] } = {},
) => {
  const Link = extras.Link
  // The pane's own marks in the set the icons option and the accessible mode pick (052 #49, #47).
  const m = (text: string) => markText(text, extras.marks ?? 'unicode')
  // A scope is 1 to 64 characters: a long task key is shortened with a hash of the whole key (078).
  const linkScope = (row: PaneRow) => {
    const whole = `astrolabe-spec-link-${row.key}`
    if (whole.length <= 64) return whole
    let hash = 5381
    for (const ch of row.key) hash = ((hash * 33) ^ ch.charCodeAt(0)) >>> 0
    return `astrolabe-spec-link-${row.key.slice(0, 30)}-${hash.toString(36)}`
  }
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
      {/* A thin accent bar while the keys go to the pane (078 FR-020). */}
      {extras.showKeys === true && <Text color={tokens.accent}>▌</Text>}
      {PANE_TABS.map(item => {
        // Below 80 columns a tab is its number and badge, so the row never wraps (052 #1).
        // The tab shown is the primary button; `▸` stays for the colorblind flavor (052 #2).
        const text = `${extras.colorblind === true && item.tab === tab ? '▸ ' : ''}${extras.showKeys === true && (extras.columns === undefined || extras.columns >= 80) ? `${item.hotkey} ` : ''}${
          extras.columns !== undefined && extras.columns < 80
            ? `${item.hotkey}${extras.badges?.[item.tab] === undefined ? '' : `:${extras.badges[item.tab]}`}`
            : extras.badges?.[item.tab] === undefined ? t(lang, item.label) : `${t(lang, item.label)} ${extras.badges[item.tab]}`
        }`
        // The tab shown keeps its button (primary, in the accent colour) so every tab stays pressable.
        return <Button key={`tab-${item.tab}`} label={text} hotkey={item.hotkey} variant={item.tab === tab ? 'primary' : 'secondary'} onPress={() => onSelect(item.tab)} />
      })}
      <Box flexGrow={1} />
      {extras.onHelp !== undefined && <Button key="help-key" label={extras.help === true ? 'close' : 'help'} hotkey={hotkeyOf('?')} plain onPress={() => extras.onHelp!()} />}
      {extras.onHelp !== undefined && <Text> </Text>}
      {extras.onClose !== undefined && <Button key="close-pane" label={m('✕')} plain onPress={() => extras.onClose!()} />}
    </Box>
    {/* The legend row (066 #22): the tab's keys as plain buttons, each drawing its own hotkey, so no label carries one. */}
    <Box key="astrolabe-pane-keys" flexDirection="row">
      {(() => {
        const pairs = legendOf(tab, { wide: extras.columns === undefined || extras.columns >= 80 })
        const verb = (id: string) => pairs.find(p => p.id === id)?.verb
        return (
          <Box key="astrolabe-pane-keys-row" flexDirection="row">
            {extras.onFind !== undefined && <Button key="find" label={m(verb('filter') ?? 'filter')} hotkey={hotkeyOf('/')} plain onPress={() => extras.onFind!()} />}
            {extras.onFind !== undefined && <Text> </Text>}
            {extras.tasksOnly !== undefined && <Button key="tasks-only" label={extras.tasksOnly.label} hotkey="t" plain onPress={() => extras.tasksOnly!.onPress()} />}
            {extras.tasksOnly !== undefined && <Text> </Text>}
            {extras.status !== undefined && <Button key="status-filter" label={extras.status.label} hotkey="s" plain onPress={() => extras.status!.onPress()} />}
            {extras.status !== undefined && <Text> </Text>}
            {extras.sort !== undefined && <Button key="sort" label={extras.sort.label} hotkey="o" plain onPress={() => extras.sort!.onPress()} />}
            {extras.sort !== undefined && <Text> </Text>}
            {extras.openAll !== undefined && <Button key="open-all" label={extras.openAll.label} hotkey="e" plain onPress={() => extras.openAll!.onPress()} />}
            {extras.openAll !== undefined && <Text> </Text>}
            {extras.view !== undefined && <Button key="view" label={extras.view.label} hotkey="v" plain onPress={() => extras.view!.onPress()} />}
            {extras.view !== undefined && <Text> </Text>}
            {extras.group !== undefined && <Button key="group" label={extras.group.label} hotkey="g" plain onPress={() => extras.group!.onPress()} />}
            {extras.group !== undefined && <Text> </Text>}
            {extras.preset !== undefined && <Button key="preset" label={extras.preset.label} hotkey="m" plain onPress={() => extras.preset!.onPress()} />}
            {extras.preset !== undefined && <Text> </Text>}
            {extras.onClear !== undefined && <Button key="clear-filter" label={verb('clear') ?? 'clear'} hotkey="c" plain onPress={() => extras.onClear!()} />}
            {extras.onClear !== undefined && <Text> </Text>}
            {extras.onRefresh !== undefined && verb('refresh') !== undefined && <Button key="refresh" label={verb('refresh')!} hotkey="r" plain onPress={() => extras.onRefresh!()} />}
            {extras.onCopyKpis !== undefined && verb('copy') !== undefined && <Text> </Text>}
            {extras.onCopyKpis !== undefined && verb('copy') !== undefined && <Button key="copy-kpis" label={verb('copy')!} hotkey="m" plain onPress={() => extras.onCopyKpis!()} />}
          </Box>
        )
      })()}
    </Box>
    <Box key="astrolabe-pane-body" flexDirection="column">
      {header}
      {nav !== undefined && nav.above > 0 && <Button key="scroll-up" label={`▲ ${nav.above} ${nav.labels.more} (k)`} hotkey="k" plain onPress={() => nav.up()} />}
      {nav !== undefined && nav.above > 0 && <Button key="page-back" label="⇞ b" hotkey="b" plain onPress={() => nav.up()} />}
      {nav !== undefined && nav.above > 0 && nav.top !== undefined && extras.group === undefined && <Button key="to-top" label="⤒" hotkey="g" plain onPress={() => nav.top!()} />}
      {rows.flatMap(row => {
          const node = (
          row.fileLinks !== undefined && Link !== undefined ? (
            // The files a task names, each its own link (078 FR-042).
            <Box key={row.key} flexDirection="row">
              <Text {...(row.highlight === true ? { backgroundColor: tokens.barEmpty } : {})}>{row.text.match(/^\s*/)?.[0] ?? ''}</Text>
              {row.fileLinks.map((link, i) => (
                <Link key={`${row.key}-file-${i}`} href={link.href} label={`${link.label} `} />
              ))}
            </Box>
          ) : row.key.startsWith('block-') && extras.onToggleBlock !== undefined ? (
            <Button key={row.key} label={m(row.text)} plain onPress={() => extras.onToggleBlock!(row.key.slice('block-'.length))} />
          ) : row.copy !== undefined && extras.onCopy !== undefined ? (
            <Box key={row.key} flexDirection="row">
              <Text color={tokens[row.role]} wrap="truncate-end">{m(row.text)}</Text>
              <Button key={`${row.key}-copy`} label={m('⧉')} plain onPress={() => extras.onCopy!(row.copy!)} />
            </Box>
          ) : row.label !== undefined && row.value !== undefined ? (
            <Box key={row.key} flexDirection="row">
              <Text color={row.selected === true ? tokens.accent : tokens[row.role]} bold={row.selected === true || row.bold === true}>
                {m(colorblindLabel(row, extras.colorblind))}
              </Text>
              <Text key={`${row.key}-value`} color={row.selected === true ? tokens.accent : tokens[row.role]} bold={row.selected === true || row.bold === true} wrap="wrap">
                {m(row.value)}
              </Text>
              {row.href !== undefined && Link !== undefined && <Text> </Text>}
              {row.href !== undefined && Link !== undefined && rowLink(row, `${row.key}-spec-link`, row.href, m('↗'))}
              {Link !== undefined && (row.links ?? []).map(link => rowLink(row, `link-${link.label}`, link.href, ` ${link.label}${m('↗')}`))}
              {row.action !== undefined && row.action.kind === 'update' && extras.onUpdate !== undefined && (
                <Button
                  key={`update-${row.action.id}`}
                  label={row.action.label}
                  plain
                  onPress={() => extras.onUpdate!(row.action!.id)}
                />
              )}
              {row.action !== undefined && row.action.kind === 'fold' && extras.onFold !== undefined && (
                <Button key={`${row.key}-action`} label={row.action.label} plain onPress={() => extras.onFold!(row.action!.id)} />
              )}
              {row.action !== undefined && row.action.kind === 'finding' && extras.onFinding !== undefined && (
                <Button key={`${row.key}-action`} label={row.action.label} plain onPress={() => extras.onFinding!(row.action!.id)} />
              )}
              {row.action !== undefined && row.action.kind !== 'update' && row.action.kind !== 'fold' && row.action.kind !== 'finding' && extras.onRunQueued !== undefined && (
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
            (row.action.kind === 'lift'
              ? extras.onLiftBand !== undefined
              : row.action.kind === 'close'
              ? extras.onCloseReady !== undefined
              : row.action.kind === 'reconcile'
              ? extras.onReconcile !== undefined
              : row.action.kind === 'specify'
              ? extras.onSpecify !== undefined
              : row.action.kind === 'ask'
              ? extras.onAsk !== undefined
              : row.action.kind === 'parallel'
              ? extras.onParallel !== undefined
              : row.action.kind === 'allow'
              ? extras.onAllowUsage !== undefined
              : row.action.kind === 'revoke'
                ? extras.onRevokeUsage !== undefined
                : row.action.kind === 'update'
                  ? extras.onUpdate !== undefined
                  : extras.onRunQueued !== undefined) ? (
            <Box key={row.key} flexDirection="row">
              <Text color={tokens[row.role]} bold={row.bold === true} wrap={extras.wrapLongNames === true ? 'wrap' : 'truncate-end'}>
                {m(colorblindText(row, extras.colorblind))}
              </Text>
              <Button
                key={row.action.kind === undefined ? `queue-run-${row.action.id}` : row.action.kind === 'update' ? `update-${row.action.id}` : row.action.kind === 'close' ? 'close-ready' : row.action.kind === 'reconcile' ? `reconcile-${row.key}` : row.action.kind === 'ask' || row.action.kind === 'parallel' || row.action.kind === 'specify' ? `${row.key}-action` : `usage-${row.action.kind}`}
                label={row.action.label}
                hotkey={row.action.hotkey}
                plain
                onPress={() => row.action?.kind === 'lift'
                  ? extras.onLiftBand!()
                  : row.action?.kind === 'close'
                  ? extras.onCloseReady!(row.action.id.split('\n'))
                  : row.action?.kind === 'reconcile'
                  ? extras.onReconcile!(row.action.id)
                  : row.action?.kind === 'specify'
                  ? extras.onSpecify!(row.action.id)
                  : row.action?.kind === 'ask'
                  ? extras.onAsk!(row.action.id)
                  : row.action?.kind === 'parallel'
                  ? extras.onParallel!(row.action.id)
                  : row.action?.kind === 'allow'
                  ? extras.onAllowUsage!()
                  : row.action?.kind === 'revoke'
                    ? extras.onRevokeUsage!()
                    : row.action?.kind === 'update'
                      ? extras.onUpdate!(row.action.id)
                      : extras.onRunQueued!(row.action!.id)}
              />
            </Box>
          ) : row.segments !== undefined ? (
            // Parts of the row in their own colours (052 #12).
            <Box flexDirection="row">
              {row.selected === true && <Text color={tokens.accent} bold>{m('❯ ')}</Text>}
              {row.segments.map(seg => (
                <Text color={tokens[seg.role]} wrap={extras.wrapLongNames === true ? 'wrap' : 'truncate-end'} hover={rowHover(row)}>
                  {m(seg.text)}
                </Text>
              ))}
              {row.href !== undefined && Link !== undefined && <Text> </Text>}
              {row.href !== undefined && Link !== undefined && rowLink(row, `${row.key}-spec-link`, row.href, m('↗'))}
              {Link !== undefined && (row.links ?? []).map(link => rowLink(row, `link-${link.label}`, link.href, ` ${link.label}${m('↗')}`))}
            </Box>
          ) : row.href !== undefined && Link !== undefined ? (
            <Box flexDirection="row">
              <Text color={row.selected === true ? tokens.accent : tokens[row.role]} {...(row.highlight === true ? { backgroundColor: tokens.barEmpty } : {})} bold={row.selected === true || row.bold === true} wrap={extras.wrapLongNames === true ? 'wrap' : 'truncate-end'} hover={rowHover(row)}>
                {m(`${row.selected === true ? '❯ ' : ''}${colorblindText(row, extras.colorblind)}`)}
              </Text>
              <Text> </Text>
              {rowLink(row, `${row.key}-spec-link`, row.href, m('↗'))}
              {(row.links ?? []).map(link => rowLink(row, `link-${link.label}`, link.href, ` ${link.label}${m('↗')}`))}
            </Box>
          ) : (
            <Text color={row.selected === true ? tokens.accent : tokens[row.role]} {...(row.highlight === true ? { backgroundColor: tokens.barEmpty } : {})} bold={row.selected === true || row.bold === true} wrap={extras.wrapLongNames === true ? 'wrap' : 'truncate-end'} hover={rowHover(row)}>
              {m(`${row.selected === true ? '❯ ' : ''}${colorblindText(row, extras.colorblind)}`)}
            </Text>
          )
          )
          // The review buttons sit under the spec they act on (the selected one).
          if (tab !== 'specs' || row.selected !== true || extras.rowButtons === undefined || extras.rowButtons.length === 0) return [node]
          return [
            node,
            ...(extras.rowDetail === undefined ? [] : [<Text key={`${row.key}-detail`} color={tokens.text} backgroundColor={tokens.barEmpty} wrap="truncate-end">{`    ${m(extras.rowDetail)}`}</Text>]),
            ...(extras.rowDescription === undefined ? [] : [<Text key={`${row.key}-description`} color={tokens.faint} wrap="truncate-end">{`    ${m(extras.rowDescription)}`}</Text>]),
            <Box key={`${row.key}-buttons`} flexDirection="row">
              <Text>{'  '}</Text>
              {extras.rowButtons.map(button => (
                <Button key={button.key} label={button.label} {...(button.hotkey === undefined ? {} : { hotkey: button.hotkey })} plain onPress={() => button.onPress()} />
              ))}
            </Box>,
          ]
        })}
      {body}
      {(extras.taskActions ?? []).map(action => (
        <Button key={action.key} label={m(action.label)} plain onPress={() => action.onPress()} />
      ))}
      {nav !== undefined && nav.below > 0 && <Button key="scroll-down" label={`▼ ${nav.below} ${nav.labels.more} (j)`} hotkey="j" plain onPress={() => nav.down()} />}
    </Box>
    {extras.legend === undefined ? null : (
      <Box key="astrolabe-pane-legend">
        <Text color={tokens.faint} wrap="truncate-end">
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
                      ...(before === '' ? [] : [<Text key={`chip-${chip.key}-before-${linkIndex}`} color={chip.fg} backgroundColor={chip.bg} bold {...(chip.explain === undefined ? {} : { hover: { scope: `astrolabe-chip-${chip.key}`, underline: true } })}>{`${linkIndex === 0 ? ' ' : ''}${before}`}</Text>]),
                      ...chipLink(`chip-${chip.key}-link-${linkIndex}`, link.href, link.text),
                    ]
                  })
                  const after = chip.text.slice(cursor)
                  return [
                    ...(linked.length === 0
                      ? [
                          <Text key={`chip-${chip.key}`} color={chip.fg} backgroundColor={chip.bg} bold {...(chip.full === undefined && chip.explain === undefined ? {} : { hover: { scope: `astrolabe-chip-${chip.key}`, underline: true } })}>{` ${chip.text} `}</Text>,
                          // A chip cut to fit shows its whole text above the row on hover (052 #45).
                          ...(chip.full === undefined
                            ? []
                            : [
                                <Box key={`chip-${chip.key}-full`} position="absolute" bottom={1} left={0} display="none" hover={{ scope: `astrolabe-chip-${chip.key}`, display: 'flex' }}>
                                  <Text color={chip.fg} backgroundColor={chip.bg} bold>{` ${chip.full} `}</Text>
                                </Box>,
                              ]),
                        ]
                      : [...linked, ...(after === '' ? [] : [<Text key={`chip-${chip.key}-after`} color={chip.fg} backgroundColor={chip.bg} bold {...(chip.explain === undefined ? {} : { hover: { scope: `astrolabe-chip-${chip.key}`, underline: true } })}>{`${after} `}</Text>])]),
                    ...(arrow === ''
                      ? next === undefined ? [] : [<Text> </Text>]
                      : [next === undefined ? <Text color={chip.bg}>{arrow}</Text> : <Text color={chip.bg} backgroundColor={next.bg}>{arrow}</Text>]),
                  ]
                })}
              </Box>
            ))
          )}
          {footer.lines === undefined
            ? null
            : footer.lines.map((line, lineIndex) => (
                <Box key={`footer-statusline-${lineIndex}`} flexDirection="row">
                  {line.map((run, i) =>
                    isLinkable(run) && Link !== undefined ? (
                      <Link key={`sl-${lineIndex}-${i}`} href={run.href!} label={run.text} />
                    ) : (
                      <Text
                        key={`sl-${lineIndex}-${i}`}
                        {...(run.fg === undefined ? {} : { color: run.fg })}
                        {...(run.bg === undefined ? {} : { backgroundColor: run.bg })}
                        {...(run.bold === undefined ? {} : { bold: true })}
                        {...(run.dim === undefined ? {} : { dimColor: true })}
                        {...(run.underline === undefined ? {} : { underline: true })}
                      >
                        {run.text}
                      </Text>
                    ),
                  )}
                </Box>
              ))}
          {footer.notice === undefined ? null : (
            <Text color={tokens.faint} wrap="truncate-end">{`↳ ${footer.notice}`}</Text>
          )}
          {/* One sentence for the chip under the pointer (068 #50), hidden until a chip is hovered. */}
          {(footer.chips ?? []).flatMap(row => row).filter(chip => chip.explain !== undefined).map(chip => (
            <Box key={`chip-${chip.key}-explain`} display="none" hover={{ scope: `astrolabe-chip-${chip.key}`, display: 'flex' }}>
              <Text color={tokens.faint} wrap="truncate-end">{`↳ ${chip.explain}`}</Text>
            </Box>
          ))}
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
