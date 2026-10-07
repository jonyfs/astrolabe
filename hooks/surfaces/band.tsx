// The band above the prompt: segments to elements. The engine follows $ only inside
// register.tsx, so it resolves the element table there and passes it in.
import type { ElementTable } from 'claude-code'

import type { Segment } from '../core/band'
import type { Tokens } from '../core/theme'
import { fitUpdateButtons } from '../core/updates'

export const bandRow = (
  { Box, Text }: Pick<ElementTable<'terminal' | 'desktop'>, 'Box' | 'Text'>,
  segments: readonly Segment[],
  tokens: Tokens,
) => (
  <Box key="astrolabe-band" flexDirection="row">
    {segments.map(segment => (
      <Text color={tokens[segment.role]} wrap="truncate-end">
        {segment.text}
      </Text>
    ))}
  </Box>
)

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
  labels: { next: string; copy: string },
) => (
  <Box key="astrolabe-next" flexDirection="row">
    <Text color={tokens.muted}>{`${labels.next}: `}</Text>
    <Button key="next-run" label={`▶ ${command}`} onPress={() => onRun()} />
    {columns >= 60 && <Text> </Text>}
    {columns >= 60 && <Button key="next-copy" label={labels.copy} onPress={press => onCopy(press.surface)} />}
  </Box>
)
