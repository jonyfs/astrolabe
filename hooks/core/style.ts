// Writing-style sections for Claude's system prompt (029 humanize, 031 terse). Pure: no $.
// The texts are fixed, so the section never changes mid-session and the prompt cache holds.

/** A shorter take on the humanizer rules (029): plain prose without the marks of generated text. */
export const HUMANIZE = `When you write prose in this project (docs, READMEs, specs, commit messages, PR descriptions, comments, replies):
- Say what a thing does, plainly. No hype, no "robust", "seamless", "powerful", "leverage", "delve", "crucial", "comprehensive".
- No filler openers or closers ("Great question", "I hope this helps", "In conclusion").
- Prefer short, active sentences. Name the subject and the verb; cut hedges ("may potentially", "it is worth noting").
- No em dashes; use a comma, a colon or a new sentence.
- No rule-of-three padding, no "not just X, but Y", no rhetorical questions as headings.
- Lists only when the content is a list; otherwise paragraphs.
- Keep facts, numbers, names, code and links exactly as they are.`

const TERSE: Readonly<Record<'lite' | 'full', string>> = {
  lite: `Answer briefly: lead with the answer, keep only the reasoning the reader needs, no preamble or recap. Code, commands, paths and error text stay exact.`,
  full: `Answer tersely: the answer first, then only what is needed to act on it. Drop articles, filler, pleasantries and hedging where meaning survives; fragments are fine. Never drop "not", "never", "no" or "only". Code, commands, paths, numbers and error text stay exact. Write files, commits and PR text in normal prose.`,
}

/** The sections the options ask for, by stable id. */
export const styleSections = (humanize: boolean, terse: unknown): Array<{ id: string; text: string; scope: 'session' }> => [
  ...(humanize ? [{ id: 'astrolabe:humanize', text: HUMANIZE, scope: 'session' as const }] : []),
  ...(terse === 'lite' || terse === 'full' ? [{ id: 'astrolabe:terse', text: TERSE[terse], scope: 'session' as const }] : []),
]
