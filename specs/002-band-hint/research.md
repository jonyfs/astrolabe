# Research: Band, prompt hint, presets and themes

Checked against Claude Code 2.1.292 with a spike plugin.

## R1. Render tests
- **Decision**: mount with `$.ui.mount({ plugin, surface, component, props })`; a test hook
  beneath answers `ui.render` with a tree (`const { Box } = $.ui.resolve(e); return <Box key="engine" />`).
- **Rationale**: the bottom must return a tree element; `null` or `undefined` are refused
  ("returned something that is not a tree element"). `ui.find({ text })` and `ui.find({ key })`
  locate elements; keys survive on `Box`, not on `Text`, so segments are wrapped in keyed boxes.

## R2. Keeping neighbours
- **Decision**: the band returns `<Box flexDirection="column">{row}{await next(e)}</Box>`; the
  hint returns `next({ ...e, props: { ...e.props, tail } })`.
- **Rationale**: the spike showed the engine's own tree inside ours, and `tail` keeps the
  engine's hint line and its pills (types: "The terminal keeps the engine's line").

## R3. Options
- **Decision**: `userConfig` fields of `type: "string"` with `options` and `default` become
  pickers; `register(on, options)` receives them with defaults filled; tests pass
  `test(name, { options }, body)`. Validated and run in the spike.

## R4. Colors
- **Decision**: `Color` accepts hex strings; tokens hold Catppuccin hex values. How a terminal
  without truecolor shows them is the engine's choice; the README says so.

## R5. Width
- **Decision**: lay out by `e.props.bodyColumns` (the band's own cells, excluding the engine's
  `[-]`), counting code points; every glyph used (`◆ ● ◐ ○ █ ░ …`) is one cell wide.
