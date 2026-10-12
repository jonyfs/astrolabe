/** The two owners of the footer under the prompt (spec 050 #97). */
export type FooterOwner = 'astrolabe' | 'statusline'

/** True when settings.json sets a `statusLine` command that runs jonyfs/statusline. */
export const statuslineConfigured = (settings: string | undefined): boolean => {
  if (settings === undefined) return false
  try {
    const parsed = JSON.parse(settings) as { statusLine?: { command?: unknown } } | null
    const command = parsed?.statusLine?.command
    return typeof command === 'string' && /statusline/i.test(command)
  } catch {
    return false
  }
}

/** A stored or typed pick; undefined for anything but the two owners. */
export const parseFooterOwner = (value: unknown): FooterOwner | undefined => {
  const text = typeof value === 'string' ? value.trim() : ''
  return text === 'astrolabe' || text === 'statusline' ? text : undefined
}

/** Who draws the footer, and whether the person still has to be asked once. */
export const footerOwnerOf = (stored: FooterOwner | undefined, configured: boolean): { owner: FooterOwner; ask: boolean } =>
  stored === undefined ? { owner: 'astrolabe', ask: configured } : { owner: stored, ask: false }
