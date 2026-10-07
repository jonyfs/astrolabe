# Data model: Phase toasts and the drift alarm

- Store `baseline:<root>`: `Record<dir, Phase>`.
- Memo `window`: `{ edits: string[]; sawShell: boolean }` (relative paths of code edits; any
  Bash or Agent call). `toasted: string[]` (`dir:phase` keys). `baselined: boolean`.
- Toast: `{ key: string; text: string }`.
