// Icon sets for the footer, the band and the pane (spec 018). Pure: no $.
// Nerd Font glyphs are Private Use Area code points: text only, never Raster cells.
import type { RenderSurface } from 'claude-code'

export const ICON_KEYS = ['speckit', 'branch', 'ahead', 'behind', 'changed', 'conflict', 'stash', 'worktree', 'pr', 'ciPass', 'ciFail', 'ciPending', 'model', 'context', 'window', 'cost', 'clock', 'burn'] as const
export type IconKey = (typeof ICON_KEYS)[number]
export type IconSetName = 'nerd' | 'emoji' | 'ascii'
export type Icons = Readonly<Record<IconKey, string>>

const SETS: Readonly<Record<IconSetName, Icons>> = {
  nerd: {
    speckit: '', // nf-fa-sitemap
    branch: '', // powerline branch
    ahead: '↑',
    behind: '↓',
    changed: '', // nf-fa-pencil_square_o
    conflict: '', // nf-fa-warning
    stash: '', // nf-fa-inbox
    worktree: '', // nf-fa-tree
    pr: '', // nf-oct-git_pull_request
    ciPass: '✓',
    ciFail: '✗',
    ciPending: '…',
    model: '', // nf-fa-microchip
    context: '', // nf-fa-database
    window: '', // nf-fa-hourglass_half
    cost: '', // nf-fa-dollar
    clock: '', // nf-fa-clock_o
    burn: '', // nf-fa-fire
  },
  emoji: {
    speckit: '🧭',
    branch: '🌿',
    ahead: '↑',
    behind: '↓',
    changed: '📝',
    conflict: '⚠',
    stash: '📦',
    worktree: '🌳',
    pr: '🔀',
    ciPass: '✓',
    ciFail: '✗',
    ciPending: '…',
    model: '🤖',
    context: '🧠',
    window: '⏳',
    cost: '💰',
    clock: '⏱',
    burn: '🔥',
  },
  ascii: {
    speckit: '*',
    branch: 'git:',
    ahead: '^',
    behind: 'v',
    changed: '~',
    conflict: '!',
    stash: 'stash:',
    worktree: 'wt:',
    pr: 'PR',
    ciPass: 'ok',
    ciFail: 'x',
    ciPending: '..',
    model: '',
    context: 'ctx',
    window: '',
    cost: '$',
    clock: 't',
    burn: 'burn',
  },
}

/** The set an `icons` option value picks on a surface: `auto` is Nerd Font in the terminal only. */
export const iconsFor = (option: unknown, surface: RenderSurface | null | undefined): IconSetName =>
  option === 'nerd' || option === 'emoji' || option === 'ascii' ? option : surface === 'terminal' ? 'nerd' : 'emoji'

export const iconSet = (name: IconSetName): Icons => SETS[name]

// The pane's own marks (052 #49, #47): drawn as is, as ASCII with the ascii icon set, or
// spelled out in the accessible mode. Box-drawing runs (the footer's rule) are left alone.
const MARKS: ReadonlyArray<[string, string, string]> = [
  ['▸', '>', 'active:'],
  ['◆', '*', ''],
  ['●', '#', 'done:'],
  ['◐', '*', 'open:'],
  ['○', 'o', 'later:'],
  ['↑', '^', 'priority high:'],
  ['↓', 'v', 'priority low:'],
  ['⇉', '=>', 'parallel:'],
  ['┌', '/', 'parallel:'],
  ['│', '|', 'parallel:'],
  ['└', '\\', 'parallel:'],
  ['↗', '->', 'open spec.md'],
  ['✕', 'x', 'close'],
  ['⏱', 't', 'running for'],
  ['⟳', '~', 'running'],
  ['✓', '+', 'done:'],
  ['☐', '[ ]', 'open checklist items:'],
  ['⑂', 'wt:', 'worktree'],
  ['⌕', '/', 'find'],
  ['█', '#', ''],
  ['░', '.', ''],
]

/** A pane text in the marks a set draws: `unicode` as is, `ascii`, or `words` spelled out. */
export const markText = (text: string, set: 'unicode' | 'ascii' | 'words'): string => {
  if (set === 'unicode') return text
  let out = text
  for (const [glyph, ascii, word] of MARKS) {
    if (!out.includes(glyph)) continue
    if (set === 'ascii' || word === '') out = out.split(glyph).join(ascii)
    else out = out.split(glyph).join(word)
  }
  return out
}
