/**
 * The colour budget of Principle I, as data.
 *
 * One token, one meaning, wherever it appears. `ROLE` names what each token
 * stands for, and `SEGMENT_COLOURS` says which roles each segment may fill
 * itself with and which it may colour an icon in. `src/render.js` takes its
 * tokens from here, so a colour name is written once, and a test fails when a
 * token is claimed by two roles or a segment reaches for a colour it was not
 * given (specs/041-colour-budget).
 */

/** Role name to the one token that carries it. */
export const ROLE = {
  critical: "red", // the critical band, merge conflicts, a failed run's icon
  attention: "peach", // the warn band, allow-all, gates, a forecast limit, a warm cache closing (icon)
  modified: "yellow", // icon: CI running; text: the modified file count
  healthy: "green", // icon: passed, working, lines added, a gauge in the ok band; text: staged count, relief
  merged: "mauve", // a pull request that was merged
  identity: "lavender", // the branch and the model
  open: "blue", // a pull request that is open
  money: "teal", // spend, credits, rtk savings
  cold: "sapphire", // a cold cache, todo, commits behind upstream (text)
  skills: "flamingo", // every skill alike
  neutral: "surface0", // the fill of everything that is only state
};

const GAUGE = { fill: ["neutral", "attention", "critical"], icon: ["healthy"], tone: ["critical"] };

/** Segment key to the roles its fill, icon and tone may take. */
export const SEGMENT_COLOURS = {
  dir: { fill: ["neutral"] },
  repo: { fill: ["neutral"] },
  projectDir: { fill: ["neutral"] },
  branch: { fill: ["identity"] },
  worktree: { fill: ["neutral"] },
  conflicts: { fill: ["critical"] },
  worktreeState: { fill: ["neutral"], icon: ["healthy"] },
  linesChanged: { fill: ["neutral"], icon: ["healthy"] },
  pr: { fill: ["open", "merged", "neutral"] },
  ci: { fill: ["neutral"], icon: ["healthy", "modified", "critical"] },
  update: { fill: ["neutral"] },
  gates: { fill: ["attention"] },
  skills: { fill: ["skills"] },
  todo: { fill: ["cold"] },
  activity: { fill: ["neutral", "attention"], icon: ["healthy"] },
  vim: { fill: ["neutral"] },
  model: { fill: ["identity"] },
  // Effort is the model's own property: it takes the model's colour, so the two
  // read as one block (specs/044-chip-copy).
  effort: { fill: ["identity"] },
  fastMode: { fill: ["neutral"] },
  allowAll: { fill: ["attention"] },
  premiumRequests: { fill: ["neutral"] },
  context: GAUGE,
  fiveHour: GAUGE,
  burnRate: { fill: ["neutral"] },
  sevenDay: GAUGE,
  codexWindow: GAUGE,
  codexCredits: { fill: ["money"] },
  premiumQuota: GAUGE,
  chatQuota: GAUGE,
  spendLimit: GAUGE,
  promptCache: { fill: ["cold", "neutral"], icon: ["attention"] },
  duration: { fill: ["neutral"] },
  aiCredits: { fill: ["money", "neutral", "attention", "critical"], icon: ["healthy"], tone: ["critical"] },
  rtk: { fill: ["money"] },
};

/** The legend `doctor --explain` prints: role, token and the one thing it means. */
export const LEGEND = [
  ["critical", "a gauge in its critical band, merge conflicts"],
  ["attention", "a gauge in its warn band, allow-all, gates, a forecast limit, a cache about to go cold"],
  ["modified", "CI running (icon), the modified file count (text)"],
  ["healthy", "passed, working, lines added (icon); the staged count (text); a gauge with room"],
  ["merged", "a pull request that was merged"],
  ["identity", "the branch and the model"],
  ["open", "a pull request that is open"],
  ["money", "spend, credits, rtk savings"],
  ["cold", "a cold prompt cache, todo, commits behind"],
  ["skills", "every skill, alike"],
  ["neutral", "plain state: directory, repository, working tree, healthy gauges"],
];
