// One message prefix (064 #8): `astrolabe ✓ …` for a success or a state, `astrolabe ▲ …` for
// a warning. No `astrolabe:` variant, no compass. Pure: no $.
import { STATE_GLYPHS } from './glyphs'

export type MessageKind = 'ok' | 'warn'

const MARK: Readonly<Record<MessageKind, string>> = { ok: '✓', warn: STATE_GLYPHS.warning }

/** A text without any prefix this mod has used: the compass, `astrolabe:` or the marked form. */
export const withoutPrefix = (text: string): string =>
  text
    .trim()
    .replace(/^🧭\s*/u, '')
    .replace(/^astrolabe\s*(?:[✓▲]|:)\s*/i, '')

export const message = (kind: MessageKind, text: string): string => `astrolabe ${MARK[kind]} ${withoutPrefix(text)}`
