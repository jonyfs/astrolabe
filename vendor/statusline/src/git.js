import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import { plainText } from "./text.js";
import path from "node:path";
import { pathToFileUrl } from "./openTerminalTab.js";
import { SOURCE_BUDGET_MS, MAX_AGE_MS } from "./freshness.js";
import { repoKey, readEntry, writeEntry, shouldRefresh, spawnRefresh } from "./cache.js";

/**
 * Runs git with an argument array rather than a shell string.
 *
 * Nothing derived from the payload or the environment is ever interpolated
 * into a command: the working directory travels as `cwd`, and the
 * arguments are constants. A directory named with shell metacharacters
 * would otherwise be command injection, and quoting rules differ per
 * platform (Principle IX).
 */
function runGit(args, cwd, timeout = SOURCE_BUDGET_MS.git) {
  try {
    const text = execFileSync("git", args, {
      cwd,
      timeout,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    }).trim();
    return { text, timedOut: false };
  } catch (err) {
    // "git was too slow" and "this is not a repository" are different
    // answers. The first is worth a background refresh and a cached
    // snapshot; the second means there is nothing here to show and never
    // will be, so spawning a process for it would be waste.
    const timedOut = err?.killed === true || err?.code === "ETIMEDOUT" || err?.signal === "SIGTERM";
    return { text: null, timedOut };
  }
}

/** The text, for callers that do not care why it is missing. */
function gitText(args, cwd, timeout) {
  return runGit(args, cwd, timeout).text;
}

export function getDirLabel(cwd) {
  try {
    const dir = cwd || process.cwd();
    const base = path.basename(dir);
    // `path.basename("/")` is an empty string, and so is the basename of a
    // Windows drive root. Rendering that leaves the folder icon sitting
    // beside nothing at all, so the root is named as itself.
    if (base) return base;
    const parsed = path.parse(dir);
    return parsed.root || dir || "?";
  } catch {
    return "?";
  }
}

/**
 * `file://` URL for the working directory. Clicking it (terminals that
 * support OSC 8 hyperlinks) reveals the folder in the system file
 * manager on most terminals — there is no cross-terminal standard for
 * "open a new terminal window at this path" via a plain link.
 */
export function getDirUrl(cwd) {
  return pathToFileUrl(cwd || process.cwd());
}

/**
 * A remote may carry credentials in its userinfo (`https://user:token@host/...`).
 * The statusline turns the remote into a link, and a link that carries a token
 * puts the token on screen and into whatever the terminal does with a URL.
 */
function stripCredentials(host) {
  const at = host.indexOf("@");
  return at === -1 ? host : host.slice(at + 1);
}

export function normalizeRemoteToHttps(remote) {
  if (!remote) return null;
  // git@host:owner/repo.git
  let m = remote.match(/^git@([^:]+):(.+?)(\.git)?$/);
  if (m) return `https://${m[1]}/${m[2]}`;
  // ssh://git@host/owner/repo.git
  m = remote.match(/^ssh:\/\/git@([^/]+)\/(.+?)(\.git)?$/);
  if (m) return `https://${m[1]}/${m[2]}`;
  // https://host/owner/repo.git
  m = remote.match(/^https?:\/\/(.+?)(\.git)?$/);
  if (m) return `https://${stripCredentials(m[1])}`;
  return null;
}

/**
 * The origin URL, cached for a day. It is a separate git process from the
 * status call and a repository's origin effectively never changes, so
 * paying for it on every redraw buys nothing.
 */
export function getRemoteUrl(cwd, { now = Date.now() } = {}) {
  const key = repoKey(cwd);
  const entry = readEntry(key, "remote");
  if (entry && now - entry.at <= MAX_AGE_MS.remote) return entry.value;

  const remote = normalizeRemoteToHttps(gitText(["remote", "get-url", "origin"], cwd));
  writeEntry(key, "remote", remote, { now });
  return remote;
}

/**
 * Parses `git status --porcelain=v2 --branch -z`.
 *
 * One call replaces the four this used to make: 31.7 ms against 131.2 ms,
 * measured over 20 runs each. It also answers a question the old approach
 * could not. `git rev-list @{u}...HEAD` fails when there is no upstream,
 * and the failure was being read as "0 ahead, 0 behind", so a branch with
 * no upstream looked exactly like one in sync. Porcelain v2 emits
 * `# branch.ab` only when an upstream exists, so the two are now distinct:
 * `ahead` and `behind` are null rather than 0 (FR-012).
 */
export function parsePorcelainV2(text) {
  if (text === null || text === undefined) return null;
  const records = text.split("\0").filter(Boolean);

  let head = null;
  let oid = null;
  let upstream = null;
  let ahead = null;
  let behind = null;
  let changed = 0;
  let staged = 0;
  let removed = 0;
  let untracked = 0;
  let conflicts = 0;
  let skipNext = false;

  for (const record of records) {
    if (skipNext) {
      // The path a rename came from, emitted as its own NUL-separated
      // field right after the `2 ` record. It is not a second change.
      skipNext = false;
      continue;
    }
    // A ref name reaches the bar and a Powerline segment, so it goes through
    // the same boundary as every other value that came from outside.
    if (record.startsWith("# branch.oid ")) oid = plainText(record.slice(13));
    else if (record.startsWith("# branch.head ")) head = plainText(record.slice(14));
    else if (record.startsWith("# branch.upstream ")) upstream = plainText(record.slice(18));
    else if (record.startsWith("# branch.ab ")) {
      const m = record.slice(12).trim().match(/^\+(\d+)\s+-(\d+)$/);
      if (m) {
        ahead = Number(m[1]);
        behind = Number(m[2]);
      }
    } else if (record.startsWith("? ")) untracked++;
    // An unmerged path is a conflict, not an ordinary change. Counting it as
    // one understated a state that stops everything until it is resolved.
    else if (record.startsWith("u ")) conflicts++;
    else if (record.startsWith("1 ") || record.startsWith("2 ")) {
      changed++;
      // `XY`: X is the index, Y the working tree. A dot is no change there.
      const x = record[2];
      const y = record[3];
      if (x && x !== ".") staged++;
      if (x === "D" || y === "D") removed++;
      if (record.startsWith("2 ")) skipNext = true;
    }
    // `! ` records are ignored files, which the statusline does not count.
  }

  if (!head && !oid) return null;
  const detached = head === "(detached)";
  return {
    branch: detached ? oid?.slice(0, 7) ?? "detached" : head,
    detached,
    oid,
    upstream,
    ahead,
    behind,
    changed,
    staged,
    removed,
    untracked,
    conflicts,
  };
}

/**
 * The working-tree snapshot.
 *
 * Normally this is a fresh call taking about 30 ms. In a repository big
 * enough that git cannot answer inside its budget (5,000 modified files
 * measured at 812 ms, and no flag combination brings that down), the
 * redraw uses the cached snapshot and starts a detached refresh instead of
 * stalling. The cached snapshot is at most 5 seconds old, which is inside
 * the one-redraw allowance for working-tree state.
 *
 * This deliberately never fetches: the statusline re-renders every few
 * seconds, and hitting the network that often would be hostile to both the
 * user's connection and the remote. So `behind` means "commits you have
 * already fetched but not merged", not "commits that exist on the remote
 * right now".
 */
export function getGitInfo(cwd, { now = Date.now(), budgetMs = SOURCE_BUDGET_MS.git } = {}) {
  const args = ["--no-optional-locks", "status", "--porcelain=v2", "--branch", "-z"];
  const key = repoKey(cwd);

  // What the last attempt cost here. A repository that answers in 30 ms is
  // asked again on every redraw, because a branch switch should show up
  // immediately. One that has already proved it cannot answer inside the
  // budget is not asked during a redraw at all, snapshot or not: paying the
  // whole budget on every redraw, only to abandon the call and read the
  // cache anyway, spends 150 ms to learn nothing.
  //
  // The measurement is refreshed by the detached process, which runs with a
  // generous budget, so a repository that becomes small again returns to
  // the fast path on its own.
  const costEntry = readEntry(key, "gitCost");
  const knownSlow = typeof costEntry?.value === "number" && costEntry.value >= budgetMs;
  if (knownSlow) {
    const cached = readEntry(key, "git");
    if (cached && now - cached.at <= MAX_AGE_MS.git) {
      if (shouldRefresh("git", cached, now)) spawnRefresh(key, "git", cwd, { now });
      return cached.value;
    }
    // No usable snapshot. Asking git live here is the call this repository
    // is known to lose: it spends the whole budget and still has nothing to
    // show. The refresh is what can answer, and its lock keeps it to one.
    spawnRefresh(key, "git", cwd, { now });
    return null;
  }

  const started = Date.now();
  const result = runGit(args, cwd, budgetMs);
  const snapshot = parsePorcelainV2(result.text);
  const tookMs = Date.now() - started;
  if (!costEntry || Math.abs(costEntry.value - tookMs) > budgetMs / 4) {
    writeEntry(key, "gitCost", tookMs, { now });
  }

  if (snapshot) {
    // Only write when the snapshot actually moved, or when the stored one
    // is halfway to expiring. Writing on every redraw would put a file
    // write on the fast path for no gain: the value it would store is the
    // one being returned anyway.
    const stored = readEntry(key, "git");
    if (!stored || now - stored.at > MAX_AGE_MS.git / 2 || JSON.stringify(stored.value) !== JSON.stringify(snapshot)) {
      writeEntry(key, "git", snapshot, { now });
    }
    return snapshot;
  }

  // Not a repository: nothing to show, and nothing a background process
  // could find later either.
  if (!result.timedOut) return null;

  // Git was too slow. Use the last snapshot if there is a usable one, and
  // either way start the refresh that will have an answer ready for the
  // next redraw. Without this last spawn, a repository whose very first
  // redraw times out would never get a cache at all, and would pay the
  // whole budget on every redraw for the rest of the session.
  const entry = readEntry(key, "git");
  spawnRefresh(key, "git", cwd, { now });
  if (entry && now - entry.at <= MAX_AGE_MS.git) return entry.value;
  return null;
}

/**
 * Whether `cwd` sits inside a git repository, from the file system alone.
 *
 * getGitInfo answering null does not mean "not a repository": it also means
 * `git status` ran past its budget and the snapshot had expired, which is
 * exactly what happens while a pre-commit gate is compiling and testing. The
 * readings that only need to know a repository is here (the gates, the pull
 * request, CI) ask this instead, so they do not switch off on an idle redraw
 * under load. A `.git` directory, or the `.git` file a linked worktree or a
 * submodule has, in `cwd` or any directory above it is the same thing git
 * itself looks for first. A handful of stat calls, no process.
 */
export function isRepository(cwd) {
  if (typeof cwd !== "string" || cwd === "") return false;
  let dir = path.resolve(cwd);
  for (;;) {
    try {
      const found = statSync(path.join(dir, ".git"), { throwIfNoEntry: false });
      if (found && (found.isDirectory() || found.isFile())) return true;
    } catch {
      // An unreadable directory says nothing either way; keep walking up.
    }
    const parent = path.dirname(dir);
    if (parent === dir) return false;
    dir = parent;
  }
}

/**
 * One shape for a pull request, whichever source answered.
 *
 * The payload sends `{number, url, review_state, kind}`; `gh pr view` sends
 * `{number, state, isDraft, url}`. They describe the same thing in different
 * words, and the renderer should not have to know which one it got.
 *
 * A draft is a review state rather than a separate flag, because that is
 * what the payload calls it and it is the more useful reading: what matters
 * is where the request stands, and "draft" is one of the places it can be.
 */
export function normalizePr(raw, source) {
  if (!raw || typeof raw.number !== "number") return null;
  // `gh` reports a review decision and a state; the payload reports one word.
  // The decision maps onto the same words the payload uses, so the review mark
  // appears from either source (specs/052-review-round-two).
  const decision = { APPROVED: "approved", CHANGES_REQUESTED: "changes_requested", REVIEW_REQUIRED: "review_required" }[
    String(raw.reviewDecision ?? "").toUpperCase()
  ];
  const stateWord = raw.state ? String(raw.state).toLowerCase() : null;
  const review = raw.isDraft ? "draft" : raw.review_state || decision || stateWord;
  return {
    prState: raw.isDraft ? "draft" : stateWord,
    comments: typeof raw.comments === "number" && raw.comments > 0 ? raw.comments : null,
    number: raw.number,
    url: raw.url ?? null,
    review,
    kind: raw.kind === "mr" ? "mr" : "pr",
    // `gh` sends label objects (`{name, color, ...}`); the payload and any
    // MR source already send plain names. Only the name is kept — colour
    // and id are not the statusline's to carry (specs/006, data-model.md).
    labels: Array.isArray(raw.labels) ? raw.labels.map((l) => plainText(typeof l === "string" ? l : l?.name)).filter(Boolean) : [],
    source,
  };
}

/**
 * The repository's web URL, from the identity the payload parsed out of the
 * origin remote. Absent outside a repository, or with no origin configured,
 * in which case `getRemoteUrl` is still there to ask git directly.
 */
export function repoUrlFromPayload(repo) {
  if (!repo?.host || !repo.owner || !repo.name) return null;
  return `https://${repo.host}/${repo.owner}/${repo.name}`;
}

/**
 * Pull request state, read from cache only.
 *
 * `gh pr view` costs 540 ms on a warm network and its whole timeout when
 * the CLI is unauthenticated or the network is unreachable. Neither fits
 * in a 300 ms redraw, so the redraw reads the last known value and starts
 * a detached refresh when it is halfway to expiring. With nothing cached
 * yet, the segment is simply absent until the first refresh lands.
 */
export function getPrInfo(cwd, { now = Date.now(), branch = null } = {}) {
  const key = repoKey(cwd);
  const entry = readEntry(key, "pr");
  if (shouldRefresh("pr", entry, now)) spawnRefresh(key, "pr", cwd, { now });
  if (!entry || now - entry.at > MAX_AGE_MS.pr) return null;
  // A value cached under another branch describes another branch's pull
  // request. The cache is per repository, so this is the only thing standing
  // between a branch switch and a pull request number that belongs elsewhere.
  if (branch && entry.value?.branch && entry.value.branch !== branch) return null;
  // "This branch has no pull request" is stored as `{ branch }` alone, so the
  // next branch switch can still be told apart. That is a marker, not a pull
  // request, and passing it on rendered "PR #undefined".
  if (typeof entry.value?.number !== "number") return null;
  return entry.value;
}

/**
 * Whether the last pull request lookup failed and nothing has answered since.
 *
 * A failed lookup caches nothing, so without this the bar cannot tell "this
 * branch has no pull request" from "`gh` is missing, signed out or offline",
 * and draws the same blank for both. The refresh writes a marker when a lookup
 * fails and clears it when one answers; the marker expires with the pull
 * request cache itself (specs/048-state-feedback).
 */
export function getPrLookupFailed(cwd, { now = Date.now() } = {}) {
  const entry = readEntry(repoKey(cwd), "prFailed");
  return Boolean(entry?.value) && now - entry.at <= MAX_AGE_MS.pr;
}

/**
 * The branch a lookup applies to, so a cached answer can be refused once the
 * branch has moved on. `gh` always asks about the checked-out branch, and the
 * cache is keyed by repository, so without this a pull request from the branch
 * you just left keeps its slot on the line.
 *
 * A detached HEAD has no branch name, and `rev-parse --abbrev-ref` says
 * `HEAD` there. That is not a branch, and treating it as one would match
 * every detached checkout against every other.
 */
export function currentBranch(cwd, timeout = SOURCE_BUDGET_MS.git) {
  const name = gitText(["rev-parse", "--abbrev-ref", "HEAD"], cwd, timeout);
  return !name || name === "HEAD" ? null : name;
}

/**
 * The live `gh` call, with the difference between the two ways it can come
 * back empty: this branch has no pull request, or the lookup did not run.
 *
 * They are not the same answer. "No pull request" is a fact worth caching,
 * since it clears whatever the previous branch left there. "The lookup
 * failed" is not, and overwriting a good value with it would make a network
 * hiccup look like a closed pull request.
 */
export function probePrResult(cwd, timeout = 5000) {
  const branch = currentBranch(cwd);
  try {
    const out = execFileSync("gh", ["pr", "view", "--json", "number,state,isDraft,url,labels,reviewDecision,comments"], {
      cwd,
      timeout,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const pr = JSON.parse(out);
    return {
      state: "found",
      value: {
        number: pr.number,
        state: pr.state,
        isDraft: pr.isDraft,
        url: pr.url,
        labels: pr.labels,
        reviewDecision: pr.reviewDecision,
        comments: Array.isArray(pr.comments) ? pr.comments.length : null,
        branch,
      },
    };
  } catch (err) {
    const stderr = String(err?.stderr ?? "");
    // `gh` says so in words, and its exit code does not distinguish this from
    // an authentication failure or an unreachable network.
    if (/no (open )?pull requests? found/i.test(stderr)) return { state: "none", value: null, branch };
    return { state: "failed", value: null, branch };
  }
}

/** The pull request itself, for `doctor` and for anything that only wants the value. */
export function probePrInfo(cwd, timeout = 5000) {
  return probePrResult(cwd, timeout).value;
}

/** The live git snapshot, used by the detached refresh and by `doctor`. */
export function probeGitInfo(cwd, timeout) {
  return parsePorcelainV2(
    gitText(["--no-optional-locks", "status", "--porcelain=v2", "--branch", "-z"], cwd, timeout)
  );
}

/**
 * The last CI run's conclusion for the checked-out branch, from `gh run list`.
 *
 * `--branch` is what makes that sentence true. Without it `gh` answers with
 * the repository's most recent run whatever branch it belongs to, so a branch
 * that was never pushed inherited main's green tick — a tick about work that
 * is not the work on screen.
 *
 * A network call, so it never runs during a redraw: it lives behind the
 * same detached refresh the pull request lookup uses, and a value older
 * than its maximum age disappears rather than going stale. A green tick
 * that is actually ten minutes old is worse than no tick.
 */
export function probeCiResult(cwd, timeout = 5000) {
  const branch = currentBranch(cwd);
  // With no branch name there is nothing to scope the query to, and an
  // unscoped answer is the bug this exists to fix.
  if (!branch) return { state: "none", value: null, branch: null };
  try {
    const out = execFileSync(
      "gh",
      ["run", "list", "--branch", branch, "--limit", "1", "--json", "conclusion,status,workflowName"],
      { cwd, timeout, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], windowsHide: true }
    );
    const [run] = JSON.parse(out);
    // An empty list is an answer: this branch has no run. Caching it clears
    // whatever the previous branch left behind.
    if (!run) return { state: "none", value: null, branch };
    return {
      state: "found",
      value: {
        conclusion: run.conclusion || null,
        status: run.status || null,
        workflow: run.workflowName || null,
        branch,
      },
      branch,
    };
  } catch {
    return { state: "failed", value: null, branch };
  }
}

/** The run itself, for `doctor`. */
export function probeCiStatus(cwd, timeout = 5000) {
  return probeCiResult(cwd, timeout).value;
}

/** CI status, read from cache only, refreshed in the background. */
export function getCiStatus(cwd, { now = Date.now(), branch = null } = {}) {
  const key = repoKey(cwd);
  const entry = readEntry(key, "ci");
  if (shouldRefresh("ci", entry, now)) spawnRefresh(key, "ci", cwd, { now });
  if (!entry || now - entry.at > (MAX_AGE_MS.ci ?? 60_000)) return null;
  // Same rule as the pull request: a run from another branch says nothing
  // about this one.
  if (branch && entry.value?.branch && entry.value.branch !== branch) return null;
  // A branch with no run is stored as `{ branch }` alone. With neither a
  // status nor a conclusion it is not a run, and rendering it as one drew a
  // red "CI failed" on a branch that had never been built.
  if (entry.value?.status == null && entry.value?.conclusion == null) return null;
  return entry.value;
}
