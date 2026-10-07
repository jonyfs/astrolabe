# Data model: The /astrolabe pane

- `$.state` `astrolabe.pane`: `{ tab: 'specs' | 'tasks' | 'session'; autoOpened: boolean }`.
- Row: `{ key, cells: Array<{ text, role, dim? }> }` produced by the view models.
- Module variable `lastWide: boolean` (not state): whether the last band draw reported a
  fullscreen viewport of at least 144 columns.
