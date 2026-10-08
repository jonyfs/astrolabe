// The only place colors live (Principle IX): Catppuccin roles per flavor. Pure: no $.
// Values are Catppuccin's palette: done green, current peach, accent mauve, pending
// overlay0, muted subtext0, bar empty surface1, blocked red.

export const ROLES = ['accent', 'text', 'muted', 'done', 'current', 'pending', 'barFill', 'barEmpty', 'blocked'] as const
export type ThemeRole = (typeof ROLES)[number]
export type Tokens = Readonly<Record<ThemeRole, string>>
export type FlavorName = 'mocha' | 'frappe' | 'macchiato' | 'latte'

/** Claude Code's own theme keys (024 #11): a tree that names them follows light and dark. */
export const THEME_TOKENS: Tokens = {
  accent: 'claude',
  text: 'text',
  muted: 'subtle',
  done: 'success',
  current: 'warning',
  pending: 'inactive',
  barFill: 'suggestion',
  barEmpty: 'subtle',
  blocked: 'error',
}

/** Whether the tokens are theme keys, which a Raster or an Svg cannot take: they need RGB. */
export const isThemeKeys = (tokens: Tokens): boolean => !tokens.accent.startsWith('#')

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
    blocked: '#f38ba8',
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
    blocked: '#e78284',
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
    blocked: '#ed8796',
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
    blocked: '#d20f39',
  },
}

export const themeOf = (options: Readonly<Record<string, unknown>>): Tokens => {
  const name = options['flavor']
  if (name === 'theme') return THEME_TOKENS
  return typeof name === 'string' && name in FLAVORS ? FLAVORS[name as FlavorName] : FLAVORS.mocha
}

/** statusline's chip colours per flavor (039), and the dark text a chip carries. */
export const CHIPS: Readonly<Record<FlavorName, Readonly<Record<string, string>>>> = {
  mocha: { crust: '#11111b', text: '#cdd6f4', surface1: '#45475a', red: '#f38ba8', peach: '#fab387', yellow: '#f9e2af', green: '#a6e3a1', sapphire: '#74c7ec', lavender: '#b4befe', mauve: '#cba6f7', teal: '#94e2d5' },
  frappe: { crust: '#232634', text: '#c6d0f5', surface1: '#51576d', red: '#e78284', peach: '#ef9f76', yellow: '#e5c890', green: '#a6d189', sapphire: '#85c1dc', lavender: '#babbf1', mauve: '#ca9ee6', teal: '#81c8be' },
  macchiato: { crust: '#181926', text: '#cad3f5', surface1: '#494d64', red: '#ed8796', peach: '#f5a97f', yellow: '#eed49f', green: '#a6da95', sapphire: '#7dc4e4', lavender: '#b7bdf8', mauve: '#c6a0f6', teal: '#8bd5ca' },
  latte: { crust: '#dce0e8', text: '#4c4f69', surface1: '#bcc0cc', red: '#d20f39', peach: '#fe640b', yellow: '#df8e1d', green: '#40a02b', sapphire: '#209fb5', lavender: '#7287fd', mauve: '#8839ef', teal: '#179299' },
}

/** The flavor name an options object picks; `theme` maps to latte or mocha by lightness. */
export const flavorOf = (options: Readonly<Record<string, unknown>>, isLight: boolean): FlavorName => {
  const name = options['flavor']
  if (name === 'theme') return isLight ? 'latte' : 'mocha'
  return typeof name === 'string' && name in FLAVORS ? (name as FlavorName) : 'mocha'
}
