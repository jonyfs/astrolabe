/**
 * Per-repository settings, for the one case environment variables cannot
 * cover: a monorepo and a scratch repository wanting different bars.
 *
 * The file is optional, small, and read once per redraw. Environment
 * variables still win, which is item F4's chosen form: they stay the
 * mechanism, and this only fills in where nobody has set one.
 *
 * A file in the home directory is ignored. Configuration that lives in a
 * repository travels to everyone who clones it, and `~` is not a project.
 */

import { cachedBackgroundIsLight } from "./terminalBackground.js";
import { readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const FILENAME = ".statusline.json";

/**
 * Only these keys are read. Anything else in the file is ignored. `gates`
 * holds the patterns that name this repository's gate scripts
 * (specs/036-direct-gates); `gateRuns.js` reads it in the detached refresh.
 */
const KNOWN = ["flavor", "ascii", "separator", "skillWindowMin", "layout", "gates", "branchPrefixes", "contextBands"];

/** Where a person's own arrangement lives, when they have one. */
const USER_LAYOUT = ["\u002eclaude", "statusline", "layout.json"];

/**
 * Walks up from `cwd` looking for the file, stopping at the filesystem root
 * or the home directory, whichever comes first.
 */
function findConfigFile(cwd) {
  const home = os.homedir();
  let dir = cwd;
  for (let depth = 0; depth < 64; depth++) {
    if (dir === home) return null;
    const candidate = path.join(dir, FILENAME);
    try {
      return { path: candidate, text: readFileSync(candidate, "utf8") };
    } catch {
      // not here; keep walking
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

/**
 * The repository's settings, or an empty object. A file that cannot be read
 * or parsed is not an error: it means no settings, the same as no file.
 */
export function repoConfig(cwd = process.cwd()) {
  const found = findConfigFile(cwd);
  if (!found) return {};
  try {
    const parsed = JSON.parse(found.text);
    const out = {};
    for (const key of KNOWN) {
      if (parsed[key] !== undefined) out[key] = parsed[key];
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Reads and parses a JSON file, or answers with nothing.
 *
 * A file that cannot be read or parsed is not an error here, for the same
 * reason it is not one in `repoConfig`: a statusline that refuses to draw
 * because somebody mistyped a brace is worse than one that draws the default
 * and says so when asked.
 */
function readJson(file) {
  try {
    return { value: JSON.parse(readFileSync(file, "utf8")), path: file, error: null };
  } catch (err) {
    return { value: null, path: file, error: err?.code === "ENOENT" ? null : err?.message || String(err) };
  }
}

/**
 * Which arrangement is in force, and where it came from.
 *
 * Four ranks, highest first, and the first one found wins whole. They do not
 * merge: half of one arrangement on top of half of another is a bar nobody
 * designed, and neither of the two people who wrote them would recognise it.
 *
 * The order mirrors `resolveSettings` below, so the project has one rule
 * rather than two. The repository beating the person is deliberate: a
 * repository that ships an arrangement is making a statement about that
 * project, which is what the file was created for, and anyone who disagrees
 * has the environment variable above it.
 */
export function resolveLayout(cwd = process.cwd(), env = process.env) {
  return withOmitted(resolveLayoutFile(cwd, env), env);
}

/** The keys `CLAUDE_STATUSLINE_OMIT` names, in order, without blanks or repeats. */
export function omittedKeys(env = process.env) {
  const raw = String(env.CLAUDE_STATUSLINE_OMIT ?? "");
  return [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
}

/**
 * Puts the omit list on top of the arrangement in force, as `{ on: false }`
 * entries. It wins over `on: true` and leaves lines and order alone, so the
 * rest of the bar is what the arrangement already drew (specs/058-omit-list).
 */
function withOmitted(layout, env) {
  const keys = omittedKeys(env);
  if (!keys.length) return layout;
  const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  // A file the arrangement code would step aside from as a whole (not an
  // object, or a version this build does not know) would take the omit list
  // with it. The list stands alone then, and the reason is kept for `doctor`.
  const usable =
    isObject(layout.arrangement) &&
    (layout.arrangement.version === undefined || layout.arrangement.version === 1) &&
    (layout.arrangement.segments === undefined || isObject(layout.arrangement.segments));
  const base = usable ? layout.arrangement : { version: 1 };
  // No prototype, so a name like `__proto__` is an entry like any other and
  // `doctor` reports it as no such segment.
  const segments = Object.assign(Object.create(null), isObject(base.segments) ? base.segments : {});
  for (const key of keys) {
    const entry = isObject(segments[key]) ? segments[key] : {};
    segments[key] = { ...entry, on: false };
  }
  const hadFile = layout.arrangement !== null && layout.arrangement !== undefined;
  return {
    ...layout,
    arrangement: { ...base, segments },
    origin: layout.origin === "default" ? "CLAUDE_STATUSLINE_OMIT" : layout.origin,
    error: layout.error ?? (hadFile && !usable ? "the arrangement was not understood; CLAUDE_STATUSLINE_OMIT still applies" : null),
  };
}

function resolveLayoutFile(cwd, env) {
  if (env.CLAUDE_STATUSLINE_LAYOUT) {
    const read = readJson(env.CLAUDE_STATUSLINE_LAYOUT);
    // The path is kept even when nothing was read, so the diagnostic can say
    // "you pointed me at this and it is not there" rather than falling
    // silently back to a default the person did not ask for.
    return {
      arrangement: read.value,
      origin: read.value === null ? "default" : "env",
      path: read.path,
      error: read.error,
    };
  }

  const repo = findConfigFile(cwd);
  if (repo) {
    try {
      const parsed = JSON.parse(repo.text);
      if (parsed.layout !== undefined) {
        return { arrangement: parsed.layout, origin: "repo", path: repo.path, error: null };
      }
    } catch (err) {
      return { arrangement: null, origin: "default", path: repo.path, error: err?.message || String(err) };
    }
  }

  const userFile = path.join(os.homedir(), ...USER_LAYOUT);
  const read = readJson(userFile);
  if (read.value !== null || read.error) {
    return { arrangement: read.value, origin: read.value === null ? "default" : "user", path: userFile, error: read.error };
  }

  return { arrangement: null, origin: "default", path: null, error: null };
}

/**
 * Which column of the glyph table the bar draws: `nerd`, `emoji` or `plain`.
 *
 * `CLAUDE_STATUSLINE_ASCII=1` is the stronger request and means `plain`
 * whatever else is set. A value that is none of the three leaves the default
 * and is handed back as `unknown` so `doctor` can name it, rather than being
 * guessed at (Principle X, the emoji tier).
 */
export function iconTier({ env = process.env, asciiArrows = false } = {}) {
  if (asciiArrows) return { tier: "plain", source: "ASCII" };
  const raw = String(env.CLAUDE_STATUSLINE_ICONS ?? "").trim().toLowerCase();
  if (raw === "nerd" || raw === "emoji" || raw === "plain") return { tier: raw, source: "CLAUDE_STATUSLINE_ICONS" };
  if (raw) return { tier: "nerd", source: "default", unknown: env.CLAUDE_STATUSLINE_ICONS };
  return { tier: "nerd", source: "default" };
}

/**
 * The flavor the terminal's own background suggests, or null.
 *
 * `COLORFGBG` is `foreground;background`, sometimes with a middle field, and
 * a background of 7 or 15 is the light end of the ANSI palette. Only a light
 * answer is acted on: a dark one is what the default already draws, and a
 * missing or malformed value says nothing. The render path does not ask the
 * terminal (OSC 11), because the command's output is captured, not typed
 * into, and a reply could not be read inside the redraw budget.
 */
export function terminalFlavor(env = process.env) {
  const parts = String(env.COLORFGBG || "").split(";");
  if (parts.length >= 2) {
    const background = Number(parts[parts.length - 1]);
    return background === 7 || background === 15 ? "latte" : null;
  }
  // Nothing in the environment: the answer `install` or `doctor` got from the
  // terminal itself, remembered per terminal. Never asked for from here.
  return cachedBackgroundIsLight(env) === true ? "latte" : null;
}

/**
 * The settings a render should use: an environment variable when one is
 * set, then the repository's file, then the default.
 */
export function resolveSettings(cwd = process.cwd(), env = process.env) {
  const file = repoConfig(cwd);
  const chosen = env.CLAUDE_STATUSLINE_FLAVOR || file.flavor;
  const terminal = chosen ? null : terminalFlavor(env);
  return {
    flavor: chosen || terminal || "mocha",
    asciiArrows: env.CLAUDE_STATUSLINE_ASCII === "1" || file.ascii === true,
    separator: env.CLAUDE_STATUSLINE_SEPARATOR || file.separator || null,
    skillWindowMin: env.CLAUDE_STATUSLINE_SKILL_WINDOW_MIN || file.skillWindowMin || null,
  };
}
