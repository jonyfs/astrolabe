// The Dashboard's animated dial (024 #6): a surface module that sweeps the needle from the
// first Spec Kit step to the active one, once, then holds the still dial. No $ here.
import type { ClientModule } from 'claude-code'

type Span = { text: string; color?: string }
type Props = { frames: Span[][][] }
type State = { frame: number }

const FRAME_MS = 160

const DialClient: ClientModule<Props, State> = (props, surface) => {
  const { Box, Text } = surface.elements
  const frames = props.frames
  if (surface.state === undefined) {
    surface.setState({ frame: 0 })
    if (frames.length > 1) {
      let frame = 0
      const stop = surface.every(FRAME_MS, () => {
        frame += 1
        if (frame >= frames.length - 1) stop()
        surface.setState({ frame: Math.min(frame, frames.length - 1) })
      })
    }
  }
  const rows = frames[Math.min(surface.state?.frame ?? 0, frames.length - 1)] ?? []
  return (
    <Box flexDirection="column">
      {rows.map(row => (
        <Box flexDirection="row">
          {row.map(span => (span.color === undefined ? <Text>{span.text}</Text> : <Text color={span.color}>{span.text}</Text>))}
        </Box>
      ))}
    </Box>
  )
}

export default DialClient
