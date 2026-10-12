# Data Model: Pane in Five Tabs

- `PaneTab`: `'specs' | 'tasks' | 'session' | 'prs' | 'setup'`.
- `PaneState.help?: true`: the help overlay is on.
- `TabSpec`: `{ tab, label, hotkey }` for the five tabs.
- `legacyTab(stored: string): PaneTab`: maps `dashboard`, `config`, `models`, `help` and unknown values.
- `badgesOf(input) -> Partial<Record<PaneTab, string>>`: counts that wait on the person.
- `legendOf(tab, width) -> Array<{ key: string; verb: string }>`: the key-verb pairs of a tab.
- `sectionOrder`: `active, progress, early, close, next, done, abandoned`.
- `emptyState(tab, state) -> string`: what fills the tab and the command that does.
