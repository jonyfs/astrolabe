// One verb per key across the pane's tabs (064 #7). Pure: no $.
// A Button takes one digit or one lowercase letter as its hotkey, so `?` and `/` press
// through the letters `h` and `f`: the table names both and the label shows the pair.

export type KeyVerb = {
  key: string
  verb: string
  /** The letter a Button uses when `key` is not a digit or a lowercase letter. */
  hotkey?: string
}

export const KEY_VERBS: readonly KeyVerb[] = [
  { key: 'r', verb: 'refresh' },
  { key: 'q', verb: 'run queued' },
  { key: '?', verb: 'help', hotkey: 'h' },
  { key: '/', verb: 'filter', hotkey: 'f' },
  { key: 'c', verb: 'clear' },
  { key: 'o', verb: 'order' },
  { key: 'p', verb: 'priority' },
  { key: 'a', verb: 'advisor' },
  { key: 'space', verb: 'page' },
  { key: 'esc', verb: 'close' },
]

/** The key as a Button hotkey: the key itself, or its letter. */
export const hotkeyOf = (key: string): string => KEY_VERBS.find(k => k.key === key)?.hotkey ?? key

/** The entry a key or its alias letter names. */
export const verbOf = (key: string): KeyVerb | undefined => KEY_VERBS.find(k => k.key === key || k.hotkey === key)

/**
 * The letters a queued run takes, in order: `q` first. The pane's own buttons (h f r s p o m
 * c k j b l v) are never among them.
 */
export const QUEUE_HOTKEYS = 'qadegituwxyz'
