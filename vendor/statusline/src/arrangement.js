/**
 * Resolving an arrangement over the segment registry.
 *
 * The registry in `src/segments.js` says what the bar draws by default and,
 * more importantly, what cannot be argued with: a segment's priority decides
 * what survives an 80-column terminal, and its colour channel decides what a
 * colour on the bar means. Both are decisions Principle II requires to be
 * taken once, in a diff.
 *
 * An arrangement is allowed the other three, and all three are position:
 * whether a segment is on, which line it sits on, and where in that line it
 * goes. Those are what somebody reading the bar every day has an opinion
 * about, and none of them can produce a bar that lies.
 *
 * Alignment was briefly a fourth, added on 2026-09-02 so a right-margin
 * design could be expressed, and taken out again the same day. The registry
 * had declared an alignment on one segment for months and no render path
 * ever honoured it, so the field would have been a setting the file accepted
 * and the bar ignored. A right margin is a renderer change, and it can come
 * back as one.
 *
 * Nothing here touches the filesystem. The file is found and read in
 * `src/config.js`; this takes the parsed object and answers what the
 * renderer should draw, together with every part of the file it refused and
 * why, so the diagnostic can explain itself rather than failing silently.
 */

/** The only arrangement version this build understands. */
export const ARRANGEMENT_VERSION = 1;

/** The lines a segment may be placed on, per Principle II. */
const LINES = [1, 2, 3, 4];

const isPlainObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * The registry rows, untouched, as placements. What no arrangement, an empty
 * arrangement and a rejected arrangement all resolve to.
 */
function defaults(registry) {
  return registry.map((row, index) => ({ ...row, on: true, index }));
}

/** Placement order: the arranged order, then the registry's, then the key. */
function comparePlacements(a, b) {
  if (a.line !== b.line) return a.line - b.line;
  if (a.order !== b.order) return a.order - b.order;
  if (a.index !== b.index) return a.index - b.index;
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}

/**
 * What the bar should draw.
 *
 * @param {Array} registry     Rows from `src/segments.js`
 * @param {object|null} arrangement  The parsed file, or nothing
 * @param {string} origin      Where it came from, for the diagnostic
 * @returns {{placements: Array, ignored: Array, origin: string, name: string|null}}
 */
export function resolveArrangement(registry, arrangement, origin = "default") {
  const ignored = [];
  const byKey = new Map(registry.map((row, index) => [row.key, index]));

  if (arrangement === null || arrangement === undefined) {
    return { placements: defaults(registry).sort(comparePlacements), ignored, origin: "default", name: null };
  }

  if (!isPlainObject(arrangement)) {
    ignored.push({ what: "file", reason: "not an object" });
    return { placements: defaults(registry).sort(comparePlacements), ignored, origin: "default", name: null };
  }

  // An unknown version means a file written for a build that knows something
  // this one does not. Applying the parts it happens to recognise would draw
  // a bar nobody designed, so the whole file steps aside.
  if (arrangement.version !== undefined && arrangement.version !== ARRANGEMENT_VERSION) {
    ignored.push({ what: "version", value: arrangement.version, reason: "unknown arrangement version" });
    return { placements: defaults(registry).sort(comparePlacements), ignored, origin: "default", name: null };
  }

  const entries = arrangement.segments;
  if (entries !== undefined && !isPlainObject(entries)) {
    ignored.push({ what: "segments", reason: "not an object" });
    return { placements: defaults(registry).sort(comparePlacements), ignored, origin, name: null };
  }

  const placements = defaults(registry);
  const placementByKey = new Map(placements.map((p) => [p.key, p]));

  for (const [key, entry] of Object.entries(entries ?? {})) {
    if (!byKey.has(key)) {
      ignored.push({ what: "segment", key, reason: "no such segment" });
      continue;
    }
    if (!isPlainObject(entry)) {
      ignored.push({ what: "segment", key, reason: "entry is not an object" });
      continue;
    }

    const placement = placementByKey.get(key);

    if (entry.on !== undefined) {
      if (typeof entry.on === "boolean") placement.on = entry.on;
      else ignored.push({ what: "on", key, value: entry.on, reason: "not a boolean" });
    }

    if (entry.line !== undefined) {
      if (LINES.includes(entry.line)) placement.line = entry.line;
      else ignored.push({ what: "line", key, value: entry.line, reason: "not a line the bar has" });
    }

    if (entry.order !== undefined) {
      if (typeof entry.order === "number" && Number.isFinite(entry.order)) placement.order = entry.order;
      else ignored.push({ what: "order", key, value: entry.order, reason: "not a number" });
    }
  }

  return {
    placements: placements.sort(comparePlacements),
    ignored,
    origin,
    name: typeof arrangement.name === "string" ? arrangement.name : null,
  };
}

/** The placements on one line, in order, with the off ones already gone. */
export function placementsForLine(resolved, line) {
  return resolved.placements.filter((p) => p.on && p.line === line);
}

/** Every key the arrangement leaves on, for a quick "is anything left" check. */
export function activeKeys(resolved) {
  return resolved.placements.filter((p) => p.on).map((p) => p.key);
}
