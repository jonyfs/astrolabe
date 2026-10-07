// Whether a spec still asks a question: a `[NEEDS CLARIFICATION` marker outside code. A marker
// quoted in backticks or inside a fenced block is documentation, not a question. Pure: no $.
const MARKER = '[NEEDS CLARIFICATION'

const proseOf = (text: string): string =>
  text.replace(/^(\s*)(```|~~~)[^\n]*\n[\s\S]*?^\s*\2[^\n]*$/gm, '').replace(/`[^`\n]*`/g, '')

export const hasClarification = (text: string): boolean => text.includes(MARKER) && proseOf(text).includes(MARKER)

/** How many `[NEEDS CLARIFICATION` markers a spec has outside code (020b). */
export const clarificationCount = (text: string): number => (text.includes(MARKER) ? proseOf(text).split(MARKER).length - 1 : 0)

/** Open and total checkbox items across a feature's checklist files (020b). */
export const checklistCounts = (texts: readonly string[]): { open: number; total: number } => {
  let open = 0
  let total = 0
  for (const text of texts) {
    for (const line of text.split(/\r?\n/)) {
      const m = /^\s*[-*+]\s+\[([ xX])\]/.exec(line)
      if (m === null) continue
      total += 1
      if (m[1] === ' ') open += 1
    }
  }
  return { open, total }
}
