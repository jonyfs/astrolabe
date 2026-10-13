/**
 * How the bar shortens the names it is given: a branch's prefix, and a name
 * cut to fit (specs/044-chip-copy).
 *
 * The part of a branch name that tells two branches apart is its middle and
 * its end, not `feature/`, and a cut that keeps only the start throws away
 * the part a person looks for. Everything here measures columns, since an
 * emoji or a CJK name is two columns a character.
 */

import { displayWidth } from "./theme.js";

/** The prefixes shortened when a repository names no map of its own. */
export const DEFAULT_BRANCH_PREFIXES = { "feature/": "f/", "fix/": "x/" };

/** The widest a branch name is drawn, in columns, before it is cut. */
export const BRANCH_COLUMNS = 28;

/**
 * The branch with its prefix abbreviated by `map`: the longest prefix that
 * matches, and only when something follows it. An empty value removes the
 * prefix. A value that is not a string is ignored rather than guessed at.
 */
export function abbreviateBranch(name, map = DEFAULT_BRANCH_PREFIXES) {
  if (typeof name !== "string" || !map || typeof map !== "object") return name;
  const prefixes = Object.keys(map)
    .filter((p) => p && typeof map[p] === "string" && name.startsWith(p) && name.length > p.length)
    .sort((a, b) => b.length - a.length);
  return prefixes.length ? map[prefixes[0]] + name.slice(prefixes[0].length) : name;
}

/**
 * `label`, or its head and tail joined by `…` when it is wider than
 * `columns`. The tail gets the extra column when the room is odd, since the
 * end of a branch is what distinguishes it.
 */
export function cutMiddle(label, columns) {
  if (displayWidth(label) <= columns) return label;
  const chars = [...label];
  const room = Math.max(2, columns - displayWidth("…"));
  const headRoom = Math.floor(room / 2);
  const tailRoom = room - headRoom;
  const take = (list, budget) => {
    const out = [];
    let width = 0;
    for (const ch of list) {
      const next = width + displayWidth(ch);
      if (next > budget) break;
      out.push(ch);
      width = next;
    }
    return out;
  };
  const head = take(chars, headRoom).join("");
  const tail = take([...chars].reverse(), tailRoom).reverse().join("");
  return `${head}…${tail}`;
}
