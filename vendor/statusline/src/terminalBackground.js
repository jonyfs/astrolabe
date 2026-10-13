/**
 * The terminal's own background, asked once and remembered.
 *
 * An OSC 11 query is answered on the terminal's input, which is the stream
 * Claude Code is reading while the bar renders, so the render path must never
 * ask: the reply would land in the prompt. `install` and `doctor` own an
 * interactive terminal for the length of the command, so they ask, with a short
 * timeout and raw mode, and write the answer to the user cache. A render reads
 * that file after the environment, the repository file and `COLORFGBG`
 * (specs/051-review-fixes).
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const CACHE = () => path.join(os.homedir(), ".claude", "statusline", "terminal-background.json");

/** Which terminal an answer was given for, so another one does not reuse it. */
export const terminalId = (env = process.env) => [env.TERM_PROGRAM, env.TERM, env.COLORTERM].filter(Boolean).join("|");

/** `rgb:RRRR/GGGG/BBBB` (two to four hex digits a channel) to 0-255 channels, or null. */
export function parseOsc11(reply) {
  const m = /rgb:([0-9a-f]{1,4})\/([0-9a-f]{1,4})\/([0-9a-f]{1,4})/i.exec(String(reply));
  if (!m) return null;
  const channel = (hex) => Math.round((parseInt(hex, 16) / (16 ** hex.length - 1)) * 255);
  return { r: channel(m[1]), g: channel(m[2]), b: channel(m[3]) };
}

/** Whether a background is light, by relative luminance. */
export function isLight({ r, g, b }) {
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) > 0.4;
}

/** The remembered answer for this terminal: `true` light, `false` dark, `null` unknown. */
export function cachedBackgroundIsLight(env = process.env) {
  try {
    const saved = JSON.parse(readFileSync(CACHE(), "utf8"));
    if (saved?.terminal !== terminalId(env) || typeof saved.light !== "boolean") return null;
    return saved.light;
  } catch {
    return null;
  }
}

/**
 * Asks the terminal for its background and remembers it. Only on a real
 * terminal, only for a short while, and never throws: an unanswered query is
 * an unknown background, which the bar already handles.
 */
export async function refreshTerminalBackground({ timeoutMs = 400, stdin = process.stdin, stdout = process.stdout, env = process.env } = {}) {
  if (!stdin.isTTY || !stdout.isTTY || typeof stdin.setRawMode !== "function") return null;
  return new Promise((resolve) => {
    let buffer = "";
    const wasRaw = stdin.isRaw;
    const done = (value) => {
      clearTimeout(timer);
      stdin.removeListener("data", onData);
      try {
        stdin.setRawMode(Boolean(wasRaw));
        stdin.pause();
      } catch {
        // the terminal went away; nothing to restore
      }
      resolve(value);
    };
    const onData = (chunk) => {
      buffer += chunk.toString("utf8");
      // The query is followed by a device attributes request, which every
      // terminal answers and answers in order. Its reply says the colour reply
      // is either here or never coming, so nothing is left to arrive late and
      // land in the prompt after this command has exited.
      if (/\x1b\[\?[0-9;]*c/.test(buffer)) {
        const rgb = parseOsc11(buffer);
        if (!rgb) return done(null);
        const light = isLight(rgb);
        try {
          mkdirSync(path.dirname(CACHE()), { recursive: true });
          writeFileSync(CACHE(), JSON.stringify({ light, rgb, terminal: terminalId(env), at: Date.now() }));
        } catch {
          // an unwritable cache is a missing cache
        }
        done({ light, rgb });
      }
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    try {
      stdin.setRawMode(true);
      stdin.resume();
      stdin.on("data", onData);
      stdout.write("\x1b]11;?\x1b\\\x1b[c");
    } catch {
      done(null);
    }
  });
}
