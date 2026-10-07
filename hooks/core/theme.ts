// The only place colors live (Principle IX): Catppuccin roles per flavor. Pure: no $.
// Values are Catppuccin's palette: done green, current peach, accent mauve, pending
// overlay0, muted subtext0, bar empty surface1.

export const ROLES = ['accent', 'text', 'muted', 'done', 'current', 'pending', 'barFill', 'barEmpty'] as const
export type ThemeRole = (typeof ROLES)[number]
export type Tokens = Readonly<Record<ThemeRole, string>>
export type FlavorName = 'mocha' | 'frappe' | 'macchiato' | 'latte'

export const FLAVORS: Readonly<Record<FlavorName, Tokens>> = {
  mocha: {
    accent: '#cba6f7',
    text: '#cdd6f4',
    muted: '#a6adc8',
    done: '#a6e3a1',
    current: '#fab387',
    pending: '#6c7086',
    barFill: '#89b4fa',
    barEmpty: '#45475a',
  },
  frappe: {
    accent: '#ca9ee6',
    text: '#c6d0f5',
    muted: '#a5adce',
    done: '#a6d189',
    current: '#ef9f76',
    pending: '#737994',
    barFill: '#8caaee',
    barEmpty: '#51576d',
  },
  macchiato: {
    accent: '#c6a0f6',
    text: '#cad3f5',
    muted: '#a5adcb',
    done: '#a6da95',
    current: '#f5a97f',
    pending: '#6e738d',
    barFill: '#8aadf4',
    barEmpty: '#494d64',
  },
  latte: {
    accent: '#8839ef',
    text: '#4c4f69',
    muted: '#6c6f85',
    done: '#40a02b',
    current: '#fe640b',
    pending: '#9ca0b0',
    barFill: '#1e66f5',
    barEmpty: '#bcc0cc',
  },
}

export const themeOf = (options: Readonly<Record<string, unknown>>): Tokens => {
  const name = options['flavor']
  return typeof name === 'string' && name in FLAVORS ? FLAVORS[name as FlavorName] : FLAVORS.mocha
}
