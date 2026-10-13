/**
 * GitHub Copilot CLI's own settings file, as the bar and the installer read it
 * (specs/029-multi-harness, specs/033-copilot-parity).
 *
 * Copilot keeps them in `$COPILOT_HOME/settings.json`, `~/.copilot` by default.
 * Its other files carry line and block comments, so this reads past them. The
 * installer needs to know when a file did not parse; the redraw only wants
 * whatever it can get, and an unreadable file is the same as an empty one.
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";

export const copilotHome = (env = process.env) => env.COPILOT_HOME || path.join(os.homedir(), ".copilot");

export const copilotSettingsFile = (env = process.env) => path.join(copilotHome(env), "settings.json");

/**
 * The settings object and whether comments were dropped. Throws on a file that
 * is not a JSON object, so the installer can refuse to rewrite it.
 */
export function readCopilotSettings(file) {
  if (!existsSync(file)) return { settings: {}, hadComments: false };
  const raw = readFileSync(file, "utf8");
  const stripped = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const parsed = JSON.parse(stripped.trim() || "{}");
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(`${file} is not a settings object.`);
  return { settings: parsed, hadComments: stripped !== raw };
}

/** The settings for a redraw: `{}` when the file is missing or unreadable. */
export function loadCopilotSettings(env = process.env) {
  try {
    return readCopilotSettings(copilotSettingsFile(env)).settings;
  } catch {
    return {};
  }
}

/**
 * The spaces Copilot adds to the left of every line (`statusLine.padding`).
 * Its own reader does `+(padding || 0)`; anything that is not a whole number
 * of columns is treated as none here, rather than guessed at.
 */
export function copilotPadding(settings) {
  const n = Number(settings?.statusLine?.padding ?? 0);
  return Number.isInteger(n) && n > 0 ? n : 0;
}
