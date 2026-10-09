// The band's animated running ellipsis (042 #12): a surface module that cycles the dot
// count while the pointer-less renderer ticks, so the static `…` segment blinks. No $ here.
import type { ClientModule } from 'claude-code'

type Props = { color?: string }
type State = { frame: number }

const FRAMES = ['…', '··', '···']
const FRAME_MS = 300

const DotsClient: ClientModule<Props, State> = (props, surface) => {
  const { Text } = surface.elements
  if (surface.state === undefined) {
    surface.setState({ frame: 0 })
    let frame = 0
    surface.every(FRAME_MS, () => {
      frame = (frame + 1) % FRAMES.length
      surface.setState({ frame })
    })
  }
  const text = FRAMES[surface.state?.frame ?? 0] ?? '…'
  return props.color === undefined ? <Text>{text}</Text> : <Text color={props.color}>{text}</Text>
}

export default DotsClient
