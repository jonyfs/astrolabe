// The Specs list as a surface module (080). It draws the rows it is given, keeps the selection as
// local state so the arrows answer at once, and posts what the hooks must apply. It gets keys only
// after a click on it gives it the focus (the engine's rule); Escape returns the focus. No $ here.
import type { ClientModule } from 'claude-code'

import type { ClientProps, ClientRow } from '../core/pane-client'

type State = { sel?: string; seen?: string }

const KEYS = new Set(['t', 'e', 'x', 'u', 'p', 'a', 's', 'o', 'c', 'r'])

const SpecsClient: ClientModule<ClientProps, State> = (props, surface) => {
  const { Box, Text, Button, Link } = surface.elements
  const selectable = props.rows.filter(row => row.i === 1)
  // The hooks' selection wins when the props changed; otherwise the local one, which moved first.
  const state = surface.state
  const sel = state !== undefined && state.seen === props.sel && state.sel !== undefined ? state.sel : props.sel
  const at = Math.max(0, selectable.findIndex(row => row.k === sel))
  const current: ClientRow | undefined = selectable[at]
  const select = (row: ClientRow | undefined) => {
    if (row === undefined) return
    surface.setState({ sel: row.k, seen: props.sel })
    surface.post({ op: 'select', key: row.k })
  }
  // The spec a task row belongs to: its key is `task-<dir>-<id>`, a spec's is `feature-<id>`.
  const specOf = (row: ClientRow): ClientRow | undefined => {
    if (!row.k.startsWith('task-')) return undefined
    let found: ClientRow | undefined
    for (const r of props.rows) {
      if (r.k === row.k) break
      if (r.k.startsWith('feature-')) found = r
    }
    return found
  }
  surface.onKey(event => {
    if (event.ctrl === true || event.meta === true) return
    switch (event.key) {
      case 'up':
        if (at > 0) select(selectable[at - 1])
        else surface.post({ op: 'page', by: -1 })
        return
      case 'down':
        if (at < selectable.length - 1) select(selectable[at + 1])
        else surface.post({ op: 'page', by: 1 })
        return
      case 'right':
        if (current !== undefined) surface.post({ op: 'fold', key: current.k, mode: 'open' })
        return
      case 'left': {
        if (current === undefined) return
        const parent = specOf(current)
        if (parent !== undefined) select(parent)
        else surface.post({ op: 'fold', key: current.k, mode: 'close' })
        return
      }
      case 'return':
        if (current !== undefined) surface.post({ op: 'fold', key: current.k, mode: 'toggle' })
        return
      case 'pageup':
        surface.post({ op: 'page', by: -1 })
        return
      case 'pagedown':
        surface.post({ op: 'page', by: 1 })
        return
      case 'home':
        surface.post({ op: 'home' })
        return
      case 'end':
        surface.post({ op: 'end' })
        return
      case 'tab':
        surface.post({ op: 'tab', by: event.shift === true ? -1 : 1 })
        return
      default:
        if (KEYS.has(event.key)) surface.post({ op: 'act', key: event.key })
    }
  })
  return (
    <Box flexDirection="column">
      {props.rows.map(row => {
        const isSel = row.k === (current?.k ?? sel)
        const bg = row.h === 1 ? { backgroundColor: props.bg } : {}
        const color = isSel ? props.accent : row.c
        const colorProp = color === undefined ? {} : { color }
        const lead = isSel && row.i === 1 ? <Text color={props.accent} bold>{'❯ '}</Text> : null
        const body =
          row.s === undefined ? (
            <Text {...colorProp} {...bg} bold={isSel || row.b === 1} wrap="truncate-end">{row.t}</Text>
          ) : (
            row.s.map((part, i) => <Text key={`${row.k}-s${i}`} {...(part.c === undefined ? {} : { color: part.c })} wrap="truncate-end">{part.t}</Text>)
          )
        // A press on a row selects it, the way a click on a list row does.
        const content = (
          <Box key={row.k} flexDirection="row">
            {lead}
            {body}
            {row.l === undefined ? null : <Text> </Text>}
            {(row.l ?? []).map((link, i) => <Link key={`${row.k}-l${i}`} href={link.h} label={link.l} />)}
            {row.a === undefined ? null : <Button key={`${row.k}-a`} label={row.a.label} plain onPress={() => surface.post({ op: 'action', kind: row.a!.kind, id: row.a!.id })} />}
            {row.y === undefined ? null : <Button key={`${row.k}-y`} label="⧉" plain onPress={() => surface.post({ op: 'copy', text: row.y! })} />}
          </Box>
        )
        return row.k.startsWith('block-') ? (
          <Button key={row.k} label={row.t} plain onPress={() => surface.post({ op: 'block', key: row.k.slice('block-'.length) })} />
        ) : (
          content
        )
      })}
    </Box>
  )
}

export default SpecsClient
