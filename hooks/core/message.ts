// One message prefix (064 #8): `astrolabe ✓ …` for a success or a state, `astrolabe ▲ …` for
// a warning, `astrolabe ⬆ …` for a new version (072, board 5). No `astrolabe:` variant, no
// compass. Pure: no $.
import { STATE_GLYPHS } from './glyphs'

export type MessageKind = 'ok' | 'warn' | 'update'

const MARK: Readonly<Record<MessageKind, string>> = { ok: '✓', warn: STATE_GLYPHS.warning, update: '⬆' }

/** A text without any prefix this mod has used: the compass, `astrolabe:` or the marked form. */
export const withoutPrefix = (text: string): string =>
  text
    .trim()
    .replace(/^🧭\s*/u, '')
    .replace(/^astrolabe\s*(?:[✓▲⬆]|:)\s*/i, '')

export const message = (kind: MessageKind, text: string): string => `astrolabe ${MARK[kind]} ${withoutPrefix(text)}`
