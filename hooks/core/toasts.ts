const MAX_TOAST_LENGTH = 119

/** Adds the shared compass and preserves overflow for the Session tab. */
export const formatToast = (text: string, details: string): { text: string; full?: string } => {
  const full = `🧭 ${text.trim().replace(/^🧭\s*/u, '')}`
  if (full.length <= MAX_TOAST_LENGTH) return { text: full }
  const suffix = `… ${details}`
  let preview = ''
  for (const character of full) {
    if (preview.length + character.length + suffix.length > MAX_TOAST_LENGTH) break
    preview += character
  }
  return { text: `${preview}${suffix}`, full }
}
