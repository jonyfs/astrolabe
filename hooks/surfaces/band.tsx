// The band above the prompt: segments to elements. The engine follows $ only inside
// register.tsx, so it resolves the element table there and passes it in.
import type { ElementTable } from 'claude-code'

import { stepOf, type Segment } from '../core/band'
import { fileUrl } from '../core/paths'
import { chipForeground, lighten, type ThemeRole, type Tokens } from '../core/theme'

type BandElements = Pick<ElementTable<'terminal' | 'desktop'>, 'Box' | 'Text'> & {
  Client?: ElementTable<'terminal'>['Client']
  Button?: ElementTable<'terminal' | 'desktop'>['Button']
  Link?: ElementTable<'terminal' | 'desktop'>['Link']
}

/** What sits at the right edge of the band row: the update button and the hide button (065 #12, #19). */
export type BandEdge = {
  /** Opens the pane: `a` once the band has the focus (025 #41). */
  open?: { label: string; onPress: () => Promise<void> }
  /** `plain` draws the label without brackets, as the 80-column row does (board 2). */
  update?: { label: string; onPress: () => Promise<void>; plain?: boolean }
  /** The branch's pull request, from 200 columns: `PR #41 ✓`, a link when it has a page (board 2). */
  pr?: { label: string; mark: string; role: ThemeRole; href?: string }
  hide?: { label: string; onPress: () => Promise<void> }
  /** The lift button of a paused or holding band. */
  onLift?: () => Promise<void>
  /** The project root, to turn a segment's path into a link. */
  root?: string
}

/** Cells the right-edge buttons take, each drawn as `[ label ]`. */
export const edgeWidth = (edge: BandEdge): number =>
  [edge.open, edge.update, edge.hide].reduce((n, b) => (b === undefined ? n : n + [...b.label].length + (b === edge.update && edge.update.plain === true ? 1 : 5)), 0) +
  (edge.pr === undefined ? 0 : [...edge.pr.label].length + [...edge.pr.mark].length + 3)

export const bandRow = (
  { Box, Text, Client, Button, Link }: BandElements,
  segments: readonly Segment[],
  tokens: Tokens,
  /** One card per rail step, shown while the pointer is on that step (024 #10). */
  cards: ReadonlyArray<{ step: string; text: string }> = [],
  /** Off in the accessible mode (025 #48): no hover styles, no cards. */
  hover = true,
  /** The names behind the +N badge, shown while its text is hovered (052 #43). */
  otherFeatures?: string,
  edge: BandEdge = {},
  /** The band dims after ten idle minutes (042 #19). */
  dim = false,
) => {
  const steps = new Set(segments.map(stepOf).filter(s => s !== undefined))
  const draw = (segment: Segment) => {
    const base = tokens[segment.role]
    const color = segment.bright === true ? lighten(base, 0.25) : base
    const text = segment.chip === true ? (
      <Text key={segment.key} color={chipForeground(color)} backgroundColor={color} bold wrap="truncate-end" {...(dim ? { dimColor: true } : {})}>
        {segment.text}
      </Text>
    ) : (
      <Text key={segment.key} color={color} {...(segment.bold === true ? { bold: true } : {})} {...(dim ? { dimColor: true } : {})} wrap="truncate-end">
        {segment.text}
      </Text>
    )
    if (segment.action === 'lift' && Button !== undefined && edge.onLift !== undefined) {
      return <Button key="band-lift" label={segment.text} onPress={() => edge.onLift!()} />
    }
    if (segment.href !== undefined && Link !== undefined && edge.root !== undefined && segment.text.trim() !== '') {
      return (
        <Link key={`${segment.key}-link`} href={fileUrl(`${edge.root}/${segment.href}`)}>
          {text}
        </Link>
      )
    }
    return text
  }
  const row = (
    <Box key="astrolabe-band" flexDirection="row">
      {segments.map(segment => {
        // The running ellipsis animates on the renderer (042 #12); the text fallback stays for the terminal.
        if (segment.key.startsWith('running-') && Client !== undefined) {
          return <Client key={segment.key} module="./dots-client.tsx" props={{ color: tokens[segment.role] }} />
        }
        const step = stepOf(segment)
        if (segment.key === 'others' && hover) {
          return (
            <Text key={segment.key} color={tokens[segment.role]} wrap="truncate-end" hover={{ scope: 'astrolabe-other-features', bold: true, underline: true }}>
              {segment.text}
            </Text>
          )
        }
        if (step !== undefined && hover && segment.key.startsWith('label-')) {
          return (
            <Text key={segment.key} color={tokens[segment.role]} wrap="truncate-end" hover={{ scope: `astrolabe-step-${step}`, bold: true, underline: true }}>
              {segment.text}
            </Text>
          )
        }
        return draw(segment)
      })}
      <Box flexGrow={1} />
      {edge.pr === undefined ? null : (
        <Box key="band-pr" flexDirection="row">
          {edge.pr.href !== undefined && Link !== undefined ? <Link key="band-pr-link" href={edge.pr.href} label={edge.pr.label} /> : <Text color={tokens.muted}>{edge.pr.label}</Text>}
          <Text color={tokens[edge.pr.role]}>{` ${edge.pr.mark} `}</Text>
        </Box>
      )}
      {Button !== undefined && edge.open !== undefined && <Button key="open-pane" label={edge.open.label} hotkey="a" onPress={() => edge.open!.onPress()} />}
      {Button !== undefined && edge.open !== undefined && edge.update !== undefined && <Text> </Text>}
      {Button !== undefined && edge.update !== undefined && <Button key="band-update" label={edge.update.label} {...(edge.update.plain === true ? { plain: true as const } : {})} onPress={() => edge.update!.onPress()} />}
      {Button !== undefined && edge.hide !== undefined && <Text> </Text>}
      {Button !== undefined && edge.hide !== undefined && <Button key="updates-hide" label={edge.hide.label} onPress={() => edge.hide!.onPress()} />}
    </Box>
  )
  const shown = hover ? cards.filter(card => steps.has(card.step as never)) : []
  const showOthers = hover && otherFeatures !== undefined && segments.some(segment => segment.key === 'others')
  if (shown.length === 0 && !showOthers) return row
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
      {showOthers && (
        <Box display="none" hover={{ scope: 'astrolabe-other-features', display: 'flex' }}>
          <Text color={tokens.muted} wrap="wrap">
            {otherFeatures}
          </Text>
        </Box>
      )}
    </Box>
  )
}
