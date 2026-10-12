/**
 * The chip the bar draws when it cannot render.
 *
 * A neutral chip with its own icon rather than bare text, so that a failure
 * reads as the bar saying so and not as a stray string where the bar was
 * (specs/048-state-feedback). It imports nothing: it runs when everything
 * else has failed, and `bin/cli.js` carries a copy for the same reason.
 */
export function unavailableChip(env = process.env) {
  const plain = env.CLAUDE_STATUSLINE_ASCII === "1";
  const text = ` ${plain ? "!" : "\u{F00E8}"} statusline unavailable `;
  const noColour = env.NO_COLOR !== undefined && env.NO_COLOR !== "";
  if (noColour) return text;
  const cap = plain ? "▸" : "\u{E0B0}";
  return `\x1b[48;2;49;50;68m\x1b[38;2;255;255;255m${text}\x1b[0m\x1b[38;2;49;50;68m${cap}\x1b[0m`;
}
