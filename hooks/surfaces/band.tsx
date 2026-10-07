// The band above the prompt: segments to elements. The engine follows $ only inside
// register.tsx, so it resolves the element table there and passes it in.
import type { ElementTable } from 'claude-code'

import type { Segment } from '../core/band'
import type { Tokens } from '../core/theme'

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
) => (
  <Box key="astrolabe-updates" flexDirection="row">
    <Text color={tokens.muted}>updates: </Text>
    {buttons.map(b => (
      <Button key={b.key} label={b.label} onPress={() => onPress(b.key)} />
    ))}
  </Box>
)
