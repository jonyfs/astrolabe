/**
 * Text that came from outside, made safe to put on the bar.
 *
 * Everything the bar draws that it did not write itself arrives as text from
 * somewhere else: a model name and a session name from the payload, a brief
 * and a step from a subagent tick, a skill name from the hook, a branch name
 * and a pull request's labels from git and gh. None of those places promises
 * the text is printable, and the bar's own output is a stream of escape
 * sequences, so a control character in a value is not a display glitch — it
 * is a command the terminal runs.
 *
 * Two things went wrong before this existed, both measured rather than
 * imagined:
 *
 * A newline in any of those values split one bar line into two. The contract
 * with Claude Code is three lines; a value decided how many there were, and a
 * width guard that measures lines individually then measured a 340-column
 * line as if it fit in 120.
 *
 * A raw `U+001B` passed straight through to the terminal. `\x1b[2J` in a
 * skill name clears the reader's screen, and a half-written OSC 8 sequence in
 * a description can swallow the text after it into a hyperlink. The bar emits
 * its own colour and link escapes on purpose; a value's escapes are not the
 * bar's, and cannot be told apart downstream.
 *
 * So: C0 and C1 control characters go, `U+007F` goes, and any run of
 * whitespace becomes one space. A space rather than nothing, because a tab or
 * a newline in a description is separating two words and deleting it would
 * join them.
 *
 * This is a boundary, not a policy about what text is allowed. Anything
 * printable survives untouched, including the wide and Ambiguous characters
 * `displayWidth` exists to measure.
 */

// C0 (U+0000-U+001F), DEL (U+007F), and C1 (U+0080-U+009F). C1 is included
// because a terminal decoding Latin-1 reads U+009B as a CSI introducer, which
// makes it an escape by another spelling.
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/g;

/**
 * A string with no control characters and no runs of whitespace, or null.
 *
 * Null for anything that is not a string, and for a string with nothing left
 * after cleaning, so every caller's existing "this field is absent" path
 * handles a field that was present and unusable.
 */
export function plainText(value) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(CONTROL, " ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned : null;
}
