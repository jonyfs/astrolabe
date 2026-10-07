// Whether a spec still asks a question: a `[NEEDS CLARIFICATION` marker outside code. A marker
// quoted in backticks or inside a fenced block is documentation, not a question. Pure: no $.
const MARKER = '[NEEDS CLARIFICATION'

export const hasClarification = (text: string): boolean => {
  if (!text.includes(MARKER)) return false
  const prose = text
    .replace(/^(\s*)(```|~~~)[^\n]*\n[\s\S]*?^\s*\2[^\n]*$/gm, '')
    .replace(/`[^`\n]*`/g, '')
  return prose.includes(MARKER)
}
