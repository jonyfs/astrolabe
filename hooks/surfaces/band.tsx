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
