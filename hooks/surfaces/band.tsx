// The band above the prompt: segments to elements. The engine follows $ only inside
// register.tsx, so it resolves the element table there and passes it in.
import type { ElementTable } from 'claude-code'

import { stepOf, type Segment } from '../core/band'
import type { Tokens } from '../core/theme'
import { fitUpdateButtons } from '../core/updates'

export const bandRow = (
  { Box, Text }: Pick<ElementTable<'terminal' | 'desktop'>, 'Box' | 'Text'>,
  segments: readonly Segment[],
  tokens: Tokens,
  /** One card per rail step, shown while the pointer is on that step (024 #10). */
  cards: ReadonlyArray<{ step: string; text: string }> = [],
  /** Off in the accessible mode (025 #48): no hover styles, no cards. */
  hover = true,
) => {
  const steps = new Set(segments.map(stepOf).filter(s => s !== undefined))
  const row = (
    <Box key="astrolabe-band" flexDirection="row">
      {segments.map(segment => {
        const step = stepOf(segment)
        return step === undefined || !hover ? (
          <Text color={tokens[segment.role]} wrap="truncate-end">
            {segment.text}
          </Text>
        ) : (
          <Text color={tokens[segment.role]} wrap="truncate-end" hover={{ scope: `astrolabe-step-${step}`, bold: true, underline: true }}>
            {segment.text}
          </Text>
        )
      })}
    </Box>
  )
  const shown = hover ? cards.filter(card => steps.has(card.step as never)) : []
  if (shown.length === 0) return row
  return (
    <Box flexDirection="column">
      {row}
      {shown.map(card => (
        <Box display="none" hover={{ scope: `astrolabe-step-${card.step}`, display: 'flex' }}>
          <Text color={tokens.muted} wrap="truncate-end">
            {card.text}
          </Text>
        </Box>
      ))}
    </Box>
  )
}

/** The second band row (spec 007): one Button per available update. */
export const updatesRow = (
  { Box, Text, Button }: Pick<ElementTable<'terminal' | 'desktop'>, 'Box' | 'Text' | 'Button'>,
  buttons: ReadonlyArray<{ key: string; label: string }>,
  tokens: Tokens,
  onPress: (key: string) => Promise<void>,
  columns: number,
  onHide: () => Promise<void>,
  hideLabel = 'hide',
) => {
  // The hide button ("[ hide ]", 8 cells) always stays at the end of the row.
  const { shown, more } = fitUpdateButtons(buttons.map(b => b.label), columns - 9)
  return (
    <Box key="astrolabe-updates" flexDirection="row">
      <Text color={tokens.muted}>updates: </Text>
      {buttons.slice(0, shown).map(b => (
        <Button key={b.key} label={b.label} onPress={() => onPress(b.key)} />
      ))}
      {more > 0 && <Text color={tokens.muted}>{` +${more}`}</Text>}
      <Text> </Text>
      <Button key="updates-hide" label={hideLabel} onPress={() => onHide()} />
    </Box>
  )
}

/** The next Spec Kit command (020a): a button that runs it and, when there is room, one that copies it. */
export const nextRow = (
  { Box, Text, Button }: Pick<ElementTable<'terminal' | 'desktop'>, 'Box' | 'Text' | 'Button'>,
  command: string,
  tokens: Tokens,
  onRun: () => Promise<void>,
  onCopy: (surface: string) => Promise<void>,
  columns: number,
  labels: { next: string; copy: string; pane: string },
  /** Opens the pane (025 #41): `a` once the band has the focus (ctrl+x tab). */
  onOpen?: () => Promise<void>,
  /** Why this command is next, shown while the pointer is on its button (042 #14). */
  reason?: string,
) => (
  <Box flexDirection="column">
  <Box key="astrolabe-next" flexDirection="row">
    <Text color={tokens.muted}>{`${labels.next}: `}</Text>
    {/* The first focus stop, so Enter runs it once the band has the keyboard (042 #15). */}
    <Button key="next-run" label={`▶ ${command}`} hotkey="n" autoFocus onPress={() => onRun()} {...(reason === undefined ? {} : { hover: { scope: 'astrolabe-next-reason', bold: true } })} />
    {columns >= 60 && <Text> </Text>}
    {columns >= 60 && <Button key="next-copy" label={labels.copy} hotkey="c" onPress={press => onCopy(press.surface)} />}
    {onOpen !== undefined && columns >= 70 && <Text> </Text>}
    {onOpen !== undefined && columns >= 70 && <Button key="open-pane" label={labels.pane} hotkey="a" onPress={() => onOpen()} />}
  </Box>
  {reason !== undefined && (
    <Box key="astrolabe-next-reason" display="none" hover={{ scope: 'astrolabe-next-reason', display: 'flex' }}>
      <Text color={tokens.muted} wrap="truncate-end">
        {reason}
      </Text>
    </Box>
  )}
  </Box>
)
