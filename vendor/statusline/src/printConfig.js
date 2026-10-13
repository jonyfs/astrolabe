/**
 * What the renderer would use for a directory, as data (specs/059-print-config).
 *
 * Read-only by construction: it calls the resolvers a render calls and reads
 * no payload, starts no process and writes no file.
 */

import { readFileSync } from "node:fs";
import { resolveSettings, resolveLayout, iconTier, repoConfig, terminalFlavor, omittedKeys } from "./config.js";
import { PALETTES, separatorStyle, contrastHigh, colourDepth, colourEnabled } from "./theme.js";
import { CONTRACT } from "./runs.js";
import { isPassive, cacheRoot } from "./paths.js";

/** The package version, read from the file beside `src/`. */
export function packageVersion() {
  try {
    const file = new URL("../package.json", import.meta.url);
    return JSON.parse(readFileSync(file, "utf8")).version ?? "unknown";
  } catch {
    return "unknown";
  }
}

/** `statusline 1.56.0 (contract 1)`, or the same as an object. */
export function versionDocument() {
  return { contract: CONTRACT, version: packageVersion() };
}

export function resolvedConfig(cwd = process.cwd(), env = process.env) {
  const settings = resolveSettings(cwd, env);
  const layout = resolveLayout(cwd, env);
  const tier = iconTier({ env, asciiArrows: settings.asciiArrows });
  const repo = repoConfig(cwd);
  const flavorSource = env.CLAUDE_STATUSLINE_FLAVOR ? "env" : repo.flavor ? "repo" : terminalFlavor(env) ? "terminal" : "default";
  return {
    contract: CONTRACT,
    version: packageVersion(),
    // A name no palette has is drawn as mocha, and says so.
    flavor: PALETTES[settings.flavor] ? settings.flavor : "mocha",
    ...(PALETTES[settings.flavor] ? {} : { flavorRequested: String(settings.flavor) }),
    flavorSource,
    ramp: String(env.CLAUDE_STATUSLINE_RAMP ?? "").toLowerCase() === "cvd" ? "cvd" : "default",
    contrast: contrastHigh(env) ? "high" : "normal",
    glyphs: tier.tier,
    ascii: settings.asciiArrows === true,
    // The render swaps the emoji tier to the ASCII separator unless one was named.
    separator: separatorStyle({
      asciiArrows: settings.asciiArrows || (tier.tier === "emoji" && !env.CLAUDE_STATUSLINE_SEPARATOR && !settings.separator),
      style: settings.separator ?? env.CLAUDE_STATUSLINE_SEPARATOR,
    }),
    colourDepth: colourEnabled() ? colourDepth(env) : "none",
    layout: { origin: layout.origin, path: layout.path ?? null, omitted: omittedKeys(env) },
    passive: isPassive(env),
    cacheDir: cacheRoot(env),
  };
}
