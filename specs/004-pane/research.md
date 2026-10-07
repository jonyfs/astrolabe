# Research: The /astrolabe pane

- `$.command.register({ name, description })` at `session.start`; `command.run` with matcher
  `{ command: 'astrolabe' }` answers `{ text }` (bundled example `pane.tsx`).
- `$.ui.open({ id, title })` opens a pane; a user-initiated open seats at any width, an unasked
  one from 144 columns (or 110 after a manual open), so the mod gates unasked opens itself.
- `Pane` props: `title`, `isFocused`, `bodyColumns`, `placement` (`dock | inline`), `scroll`;
  `e.viewport.rows` and `e.viewport.isFullscreen` when measured.
- Buttons with `hotkey` and `onPress`; a press raises `ui.press` and runs the plugin's closure,
  which may write `$.state` (writes are refused only while drawing).
- `session.start` carries no width; `AbovePrompt` renders carry `e.viewport`, so the last seen
  fullscreen width is noted there and acted on at `turn.complete`.
