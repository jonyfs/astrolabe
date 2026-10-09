// The only place colors live (Principle IX): Catppuccin roles per flavor. Pure: no $.
// Values are Catppuccin's palette: done green, current peach, accent mauve, pending
// overlay0, muted subtext0, bar empty surface1, blocked red.

export const ROLES = ['accent', 'text', 'muted', 'done', 'current', 'pending', 'barFill', 'barEmpty', 'blocked'] as const
export type ThemeRole = (typeof ROLES)[number]

/** One colour per kind of message, everywhere (054 #72): warnings peach, errors red, success green. */
export const STATUS_ROLE = { warning: 'current', error: 'blocked', success: 'done' } as const satisfies Record<string, ThemeRole>
export type Tokens = Readonly<Record<ThemeRole, string>>
export type FlavorName = 'mocha' | 'frappe' | 'macchiato' | 'latte' | 'colorblind'
export const COLORBLIND_MARKS: Partial<Record<ThemeRole, string>> = { done: '✓', current: '▲', pending: '○', blocked: '✖' }

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
  // Latte's subtext0, green, peach and blue fall under 4.5:1 on its base: darker shades of each (052 #48).
  latte: {
    accent: '#8839ef',
    text: '#4c4f69',
    muted: '#5c5f77',
    done: '#2a7a1c',
    current: '#b5470a',
    pending: '#9ca0b0',
    barFill: '#1859d6',
    barEmpty: '#bcc0cc',
    blocked: '#d20f39',
  },
  // High-luminance blue, teal, amber and vermilion stay distinct without relying on red/green hue.
  colorblind: {
    accent: '#d4a6e8',
    text: '#f2f2f2',
    muted: '#bdbdbd',
    done: '#6bd3a8',
    current: '#ffd166',
    pending: '#aebdca',
    barFill: '#77bdf2',
    barEmpty: '#454545',
    blocked: '#ff8a75',
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
  colorblind: { crust: '#151515', text: '#f2f2f2', surface1: '#454545', red: '#ff8a75', peach: '#ffd166', yellow: '#fff0a6', green: '#6bd3a8', sapphire: '#77bdf2', lavender: '#d4a6e8', mauve: '#d9a3c7', teal: '#5bd6ca' },
}

const luminance = (hex: string): number => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return 0
  const channels = [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = channels.map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

const contrastRatio = (a: string, b: string): number => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light! + 0.05) / (dark! + 0.05)
}

/** Select the footer chip foreground with the stronger contrast, independent of its flavor. */
export const chipForeground = (background: string): '#11111b' | '#eff1f5' =>
  contrastRatio(background, '#11111b') >= contrastRatio(background, '#eff1f5') ? '#11111b' : '#eff1f5'

/** A shade lighter (041 #5): a colour mixed toward white by `amount`, for a chip that just changed. */
export const lighten = (hex: string, amount: number): string => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount)
  return `#${[1, 3, 5].map(i => mix(Number.parseInt(hex.slice(i, i + 2), 16)).toString(16).padStart(2, '0')).join('')}`
}

/** The flavor name an options object picks; `theme` maps to latte or mocha by lightness. */
export const flavorOf = (options: Readonly<Record<string, unknown>>, isLight: boolean): FlavorName => {
  const name = options['flavor']
  if (name === 'theme') return isLight ? 'latte' : 'mocha'
  return typeof name === 'string' && name in FLAVORS ? (name as FlavorName) : 'mocha'
}
