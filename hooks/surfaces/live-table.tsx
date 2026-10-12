// The live table above the prompt (069): the layout's cells as aligned text, one Text per cell
// so a cell takes its own role. The engine follows $ only inside register.tsx, so the element
// table is passed in.
import type { ElementTable } from 'claude-code'

import type { LiveColumn, LiveKind, LiveLayout } from '../core/live-table'
import type { ThemeRole, Tokens } from '../core/theme'

type Elements = Pick<ElementTable<'terminal' | 'desktop'>, 'Box' | 'Text'>

/** The glyph and role of each kind: agents lavender, gates peach, the cache teal, limits accent. */
const KIND: Record<LiveKind, { glyph: string; role: ThemeRole }> = {
  agent: { glyph: '◇', role: 'accent' },
  gate: { glyph: '⛭', role: 'current' },
  cache: { glyph: '◌', role: 'muted' },
  limit: { glyph: '◔', role: 'accent' },
}

export const liveTable = ({ Box, Text }: Elements, layout: LiveLayout, tokens: Tokens, width: number) => {
  if (layout.lines.length === 0) return null
  const cols = layout.columns
  const cell = (column: LiveColumn, text: string, role: ThemeRole, key: string) => (
    <Text key={key} color={tokens[role]} wrap="truncate-end">{`${text} `}</Text>
  )
  return (
    <Box key="astrolabe-live-table" flexDirection="column" width={width}>
      <Box key="live-header" flexDirection="row">
        <Text color={tokens.faint}>{'  '}</Text>
        {cols.map(c => cell(c, layout.header[c], 'faint', `h-${c}`))}
      </Box>
      {layout.lines.map((line, i) => {
        if (line.rule === true) return <Text key={`live-rule-${i}`} color={tokens.pending}>{'─'.repeat(Math.max(1, width))}</Text>
        const kind = KIND[line.kind]
        return (
          <Box key={`live-${i}`} flexDirection="row">
            <Text color={tokens[kind.role]}>{`${kind.glyph} `}</Text>
            {cols.map(c => {
              const role: ThemeRole =
                c === 'now' && line.row?.nowWarn === true ? 'warn' : c === 'level' && line.row?.level !== undefined ? line.row.level.role : c === 'who' ? kind.role : 'text'
              return cell(c, line.cells[c], role, `c-${i}-${c}`)
            })}
          </Box>
        )
      })}
    </Box>
  )
}
