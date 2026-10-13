import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { canWrite, stateRoot } from "./paths.js";
import path from "node:path";
import os from "node:os";
import { pushSample } from "./samples.js";

/**
 * Marks segments that changed since the previous render, and cycles their
 * icon through a short frame sequence while the change is still recent.
 *
 * The honest constraint this is built around: a statusline is printed
 * once per render and then it is static text — there is no timer, no
 * redraw loop, and no way for this process to animate anything after it
 * exits. Frames therefore advance per render, and Claude Code re-renders
 * roughly every 5-6 seconds during activity (measured, not assumed). The
 * result reads as a slow pulse that draws the eye to what changed, not as
 * smooth motion, and if nothing triggers a re-render the icon simply
 * holds on its current frame.
 */

/**
 * Resolved per call rather than at import, the way the cache and the skill
 * events already do it. A path fixed at import time follows whichever home
 * directory the process started with, which is not the one a test running
 * against a throwaway HOME means.
 */
function statuslineDir() {
  return stateRoot();
}

function stateDir() {
  return path.join(statuslineDir(), "state");
}

/**
 * Directories swept alongside the animation state: the per-repository
 * cache and the per-session skill event files. All three are disposable,
 * so one sweep with one rule covers them.
 */
function sweptDirs() {
  return [
    stateDir(),
    path.join(statuslineDir(), "cache"),
    path.join(statuslineDir(), "skills"),
    // One roster file per session since 2026-09-06, so this directory grows
    // with sessions the way the others do and is swept on the same terms.
    path.join(statuslineDir(), "tasks"),
  ];
}
const HIGHLIGHT_MS = 30_000;

/**
 * How long each tracked value stays marked. A branch switch is over in a
 * moment; a CI result is worth two minutes (specs/048-state-feedback).
 */
const HOLD_MS = { branch: 10_000, model: 10_000, pr: 120_000, ci: 120_000, skills: HIGHLIGHT_MS };
const STALE_STATE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Which segments mark a change, and how.
 *
 * The mark is a colour shift rather than a sequence of icon frames. Colour
 * is preattentive: a brighter block is noticed before it is read, where a
 * swapped glyph has to be recognised, and it does not ask the reader to have
 * seen the previous frame. The segment keeps its own hue, so it still says
 * which segment it is.
 *
 * The list is short on purpose. Principle X, as amended, requires each
 * colour channel to carry one meaning, so these four are exactly the
 * segments the ramp does not touch. Ahead, behind and effort used to
 * animate; they now hold still, because their colour has no second meaning
 * to spare and their numbers speak for themselves.
 */
const HIGHLIGHTED = new Set(["branch", "pr", "skills", "model", "ci"]);

function sessionStateFile(sessionId) {
  const safe = String(sessionId || "default").replace(/[^A-Za-z0-9_-]/g, "_");
  return path.join(stateDir(), `${safe}.json`);
}

function loadState(sessionId) {
  try {
    return JSON.parse(readFileSync(sessionStateFile(sessionId), "utf8"));
  } catch {
    return null;
  }
}

/** Reads the saved sample history for a session, or an empty list. */
export function loadSamples(sessionId) {
  return loadState(sessionId)?.samples || [];
}

/**
 * Deletes state, cache and skill-event files untouched for a week. Without
 * this, every session Claude Code ever opened would leave a file behind
 * forever, and every repository ever visited would leave a cache.
 */
function pruneStaleState(now) {
  if (!canWrite()) return;
  for (const dir of sweptDirs()) {
    try {
      for (const name of readdirSync(dir)) {
        const file = path.join(dir, name);
        try {
          if (now - statSync(file).mtimeMs > STALE_STATE_MS) unlinkSync(file);
        } catch {
          // a file vanishing mid-sweep is fine
        }
      }
    } catch {
      // that directory does not exist yet
    }
  }
}

function saveState(sessionId, state) {
  if (!canWrite()) return;
  try {
    mkdirSync(stateDir(), { recursive: true });
    writeFileSync(sessionStateFile(sessionId), JSON.stringify(state));
  } catch {
    // best-effort: losing change tracking must never break the statusline
  }
}

/**
 * Compares the current snapshot against the previous render's and returns
 * `{ isChanged(key), iconFor(key, staticIcon) }`.
 *
 * Only discrete state is tracked. Usage percentages deliberately are not:
 * they tick up on nearly every render, so highlighting them would leave
 * the line permanently animated and the highlight would stop meaning
 * anything.
 */
export function trackChanges(sessionId, snapshot, { now = Date.now(), enabled = true, sample = null, samples = null } = {}) {
  if (!enabled) {
    return {
      isChanged: () => false,
      colourFor: (_key, base) => base,
      iconFor: (_key, staticIcon) => staticIcon,
      frame: 0,
      samples: [],
    };
  }

  const previous = loadState(sessionId);
  const changedAt = { ...(previous?.changedAt || {}) };
  const frame = ((previous?.frame ?? -1) + 1) % 4;

  for (const [key, value] of Object.entries(snapshot)) {
    const before = previous?.snapshot?.[key];
    // A first-ever render has nothing to compare against; treating every
    // value as "just changed" would light up the whole line on startup.
    if (previous && before !== value) changedAt[key] = now;
  }

  for (const [key, at] of Object.entries(changedAt)) {
    if (now - at > (HOLD_MS[key] ?? HIGHLIGHT_MS)) delete changedAt[key];
  }

  // The short history four segments read: a burn rate, a projection, a
  // trend, and the rule that the savings figure only renders once it has
  // moved. It rides in the file that already exists rather than a second
  // store, and is bounded so the file cannot grow.
  //
  // Callers that already built the history (e.g. the renderer's gather
  // phase, which needs it for the diagnostic too) pass it in directly;
  // otherwise we push one new sample onto the previous ring.
  let nextSamples;
  if (samples) {
    nextSamples = samples;
  } else if (sample) {
    nextSamples = pushSample(previous?.samples, { at: now, ...sample });
  } else {
    nextSamples = previous?.samples || [];
  }

  // Swept once per session, on its first render — deterministic, and
  // frequent enough given each session starts exactly once.
  if (!previous) pruneStaleState(now);

  saveState(sessionId, { snapshot, changedAt, frame, samples: nextSamples });

  return {
    isChanged: (key) => HIGHLIGHTED.has(key) && Object.hasOwn(changedAt, key),
    /** The session's own render counter, 0 to 3, advancing once per redraw. */
    frame,
    /**
     * The colour a segment renders in: its own, or a lighter version of it
     * while the change is still recent. A segment outside the highlighted
     * set always gets its own colour back.
     */
    // A changed segment is marked bold and underlined by the renderer
    // (`emphasis`), not recoloured: a colour shift borrowed another role's
    // meaning and disappeared under NO_COLOR (specs/041-colour-budget).
    colourFor: (_key, base) => base,
    /** Kept so a caller can still ask, and always answers with the icon. */
    iconFor: (_key, staticIcon) => staticIcon,
    /** The sample ring, for whatever wants to read a direction out of it. */
    samples: nextSamples,
  };
}
