// Presets are data (Principle X): which places each one draws in. Pure: no $.
// Spinner, pane and toasts are declared now and used by features 003 to 005.

export type Preset = {
  status: boolean
  band: boolean
  hint: boolean
  spinner: boolean
  pane: 'command' | 'auto'
  toasts: 'none' | 'drift' | 'all'
}

export type PresetName = 'minimal' | 'compact' | 'full'

export const PRESETS: Readonly<Record<PresetName, Preset>> = {
  minimal: { status: true, band: false, hint: false, spinner: false, pane: 'command', toasts: 'none' },
  compact: { status: true, band: true, hint: true, spinner: true, pane: 'command', toasts: 'drift' },
  full: { status: true, band: true, hint: true, spinner: true, pane: 'auto', toasts: 'all' },
}

export const presetOf = (options: Readonly<Record<string, unknown>>): Preset => {
  const name = options['preset']
  return typeof name === 'string' && name in PRESETS ? PRESETS[name as PresetName] : PRESETS.compact
}
