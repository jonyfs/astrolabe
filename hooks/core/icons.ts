// Icon sets for the footer, the band and the pane (spec 018). Pure: no $.
// Nerd Font glyphs are Private Use Area code points: text only, never Raster cells.
import type { RenderSurface } from 'claude-code'

export const ICON_KEYS = ['speckit', 'branch', 'ahead', 'behind', 'changed', 'conflict', 'stash', 'worktree', 'pr', 'ciPass', 'ciFail', 'ciPending', 'model', 'context', 'window', 'cost', 'clock'] as const
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
  },
}

/** The set an `icons` option value picks on a surface: `auto` is Nerd Font in the terminal only. */
export const iconsFor = (option: unknown, surface: RenderSurface | null | undefined): IconSetName =>
  option === 'nerd' || option === 'emoji' || option === 'ascii' ? option : surface === 'terminal' ? 'nerd' : 'emoji'

export const iconSet = (name: IconSetName): Icons => SETS[name]
