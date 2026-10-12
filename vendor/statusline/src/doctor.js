/**
 * `doctor`: what the statusline just read, where each value came from, how
 * old it is, and what it cost.
 *
 * Two rules shape this. It gathers through the same path the renderer
 * uses, so it cannot describe behaviour the renderer does not have. And
 * where a segment reads from cache, it reports both: the cached reading
 * the redraw would use, and a live probe run for the diagnostic's own
 * benefit. One column would have to pretend the two are the same thing,
 * and the whole point of the command is to show where they differ.
 */

import { readGateRuns, probeGateRuns } from "./gateRuns.js";
import { readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { gather, renderReadings, harnessProbes } from "./render.js";
import { detectHarness } from "./harness.js";
import { getCopilotQuota } from "./copilotQuota.js";
import { loadCopilotSettings, copilotPadding } from "./copilotSettings.js";
import { checkInstall, projectOverrides, harnessStatus } from "./install.js";
import { peekUpdateNotice, readBehaviour, updatesLine, REPO_ROOT as UPDATE_ROOT } from "./updateCheck.js";
import { repoKey, readEntry } from "./cache.js";
import { SEGMENT_ABOUT, SEGMENTS as REGISTRY } from "./segments.js";
import {
  getDirLabel,
  getDirUrl,
  getGitInfo,
  getPrInfo,
  getRemoteUrl,
  getCiStatus,
  probeGitInfo,
  probePrInfo,
  normalizePr,
} from "./git.js";
import {
  getActiveSkills,
  getActiveSkillsTrueCount,
  getActiveSkillsDetailed,
  getSessionActivity,
  subagentActivity,
} from "./skills.js";
import { mostRecentSkillEvent } from "./skillEvents.js";
import { getRtkSavings, probeRtkSavings } from "./rtk.js";
import {
  formatResetCountdown,
  MAX_PLAUSIBLE_SPEND_PERIOD_MS,
  abbreviate,
  cacheMinutesLeft,
  PROMPT_CACHE_CLOSING_S,
} from "./tokens.js";
import { getOpenTabUrl } from "./openTerminalTab.js";
import { isRenderable, ageMs, MAX_AGE_MS, SOURCE_BUDGET_MS, REFRESH_BUDGET_MS } from "./freshness.js";
import { displayWidth, PALETTES, colourEnabled, bgSeq, SEPARATOR_STYLES } from "./theme.js";
import { ROLE, LEGEND } from "./colourRoles.js";
import { terminalFor } from "./layout.js";
import { resolveLayout, repoConfig, terminalFlavor, resolveSettings, iconTier } from "./config.js";
import { resolveArrangement } from "./arrangement.js";

/**
 * How to describe each segment's value, and which reading feeds it.
 *
 * The row set itself comes from the registry, so a segment added there
 * shows up here without being listed twice. What lives in this table is
 * only the part the registry does not know: how to put a value into words.
 */
const DESCRIBE = {
  branch: ["git", (v) => (v?.detached ? `${v.branch} (detached)` : v?.branch)],
  worktreeState: ["git", (v) => (v ? `${v.changed} changed, ${v.untracked} untracked` : null)],
  conflicts: ["git", (v) => (v?.conflicts ? `${v.conflicts} unmerged` : null)],
  pr: ["pr", (v) => (v ? `#${v.number} ${v.review ?? "open"}${v.source ? ` (${v.source})` : ""}` : null)],
  repo: ["repo", (v) => (v?.owner ? `${v.owner}/${v.name}` : null)],
  ci: ["ci", (v) => (v ? `${v.conclusion ?? v.status} ${v.workflow ?? ""}`.trim() : null)],
  worktree: ["worktree", (v) => (v?.name ? `${v.name}${v.from ? ` from ${v.from}` : ""}` : null)],
  projectDir: ["projectDir", (v) => v ?? null],
  skills: ["skills", (v) => (v?.length ? v.join(", ") : null)],
  todo: ["activity", (v) => (v?.todos ? `${v.todos.done}/${v.todos.total}` : null)],
  activity: ["activity", (v) => (v ? (v.working ? "working" : "idle") : null)],
  model: ["model", (v) => v ?? null],
  effort: ["effort", (v) => v ?? null],
  context: ["context", (v) => (v === null ? "?%" : `${v}%`)],
  // Each window's row reports what its own chip draws: the level, and when
  // it comes back. They carried only the level while a third row described
  // both resets together; with the resets back on their own chips, the rows
  // follow (specs/017-line-legibility).
  fiveHour: ["fiveHour", (v, now, readings) => describeWindow(v, readings?.fiveHourReset?.value, now)],
  burnRate: ["samples", (v) => (v?.length ? `${v.length} samples` : null)],
  projection: ["samples", (v) => (v?.length ? `${v.length} samples` : null)],
  sevenDay: ["sevenDay", (v, now, readings) => describeWindow(v, readings?.sevenDayReset?.value, now)],
  promptCache: ["promptCache", (v) => describePromptCache(v)],
  spendLimit: [
    "spendLimit",
    (v, now, readings) =>
      v === null ? null : describeWindow(v, readings?.spendLimitReset?.value, now, { maxMs: MAX_PLAUSIBLE_SPEND_PERIOD_MS }),
  ],
  // One segment carrying both countdowns, so the diagnostic reports both. A
  // row that described only the 5-hour one named half of what is on the line.
  duration: ["sessionCost", (v) => (v?.durationMs ? `${Math.round(v.durationMs / 60000)}m` : null)],
  linesChanged: ["sessionCost", (v) => (v?.linesAdded === null ? null : `+${v?.linesAdded} -${v?.linesRemoved}`)],
  rtk: ["rtk", (v) => (v === null ? null : `${v}% saved`)],
  dir: ["dir", (v) => v ?? null],
  // The git gates running in this repository (specs/031-git-gate-rows).
  gates: ["gates", (v) => describeGates(v)],
  // Copilot CLI's credits and monthly quota (specs/033-copilot-parity).
  aiCredits: ["aiCredits", (v) => (v ? `${v.formatted} AI credits${v.max ? `, ${v.pct}% of a ${v.max} credit session limit` : ""}` : null)],
  premiumQuota: ["copilotQuota", (v) => describeQuota(v, "premium")],
  // Codex's other windows and credits (specs/037-codex-windows). The chip
  // draws the first window; the row names every one.
  codexWindow: [
    "codexWindow",
    (v, now) =>
      v?.length
        ? v
            .map((w) => `${w.label} ${describeWindow(Math.round(w.used_percentage), w.resets_at, now, { maxMs: w.window_minutes * 60_000 + 24 * 3600 * 1000 })}`)
            .join(", ")
        : null,
  ],
  codexCredits: ["codexCredits", (v) => (v ? `${v.balance} credits (rollout)` : null)],
  chatQuota: ["copilotQuota", (v) => describeQuota(v, "chat")],
};

/** One monthly quota as its chip draws it, with where the figure came from. */
function describeQuota(value, name) {
  const q = value?.quotas?.[name];
  if (!q) return null;
  return `${q.usedPct}% of ${q.entitlement} this month${q.full ? ", full" : ""}, resets ${value.resetDate ?? "on an unknown date"} (gh api /copilot_internal/user)`;
}

/** The segments only Copilot CLI's payload or account can fill. */
const COPILOT_ONLY = new Set(["allowAll", "premiumRequests", "aiCredits", "premiumQuota", "chatQuota"]);

/** The segments only a Codex rollout can fill (specs/037-codex-windows). */
const CODEX_ONLY = new Set(["codexWindow", "codexCredits"]);

/** Each running gate as its row names it: the hook, where, and whether it waits. */
function describeGates(runs) {
  if (!Array.isArray(runs) || !runs.length) return null;
  return runs.map((r) => `${r.hook} in ${r.worktree}${r.state === "waiting" ? " (waiting for gates.lock)" : ""}`).join(", ");
}

/**
 * The whole prompt-cache block, for the chip that shows only part of it and
 * only some of the time. Null when the chip is not drawn, so the row falls to
 * a reason instead of claiming a value that is not on the bar.
 */
function describePromptCache(pc) {
  if (!pc?.observed) return null;
  if (pc.state === "warm" && !pc.closing) return null;
  const parts = [pc.state, pc.ttl];
  if (pc.state === "warm") parts.push(`${cacheMinutesLeft(pc.secondsLeft)} left`);
  if (pc.state === "cold" && pc.recacheTokens !== null) parts.push(`${abbreviate(pc.recacheTokens)} to re-cache`);
  if (pc.cause) parts.push(pc.cause);
  if (pc.hitRatio !== null) parts.push(`${Math.round(pc.hitRatio * 100)}% hits`);
  if (pc.misses !== null) parts.push(`${pc.misses} ${pc.misses === 1 ? "miss" : "misses"}`);
  return parts.filter(Boolean).join(", ");
}

/** A usage window as its chip draws it: the level, and when it resets. */
function describeWindow(pct, resetsAt, now, bound) {
  const level = pct === null || pct === undefined ? "?%" : `${pct}%`;
  return `${level} · ${formatResetCountdown(resetsAt, now, bound) ?? "reset time unknown"}`;
}

const SEGMENTS = REGISTRY.map((row) => {
  const [reading, describe] = DESCRIBE[row.key] ?? [row.key, (v) => (v == null ? null : String(v))];
  return { ...row, reading, describe };
});

/** Segments whose value comes from cache, and the live probe for each. */
const LIVE_PROBES = {
  branch: (cwd) => probeGitInfo(cwd, REFRESH_BUDGET_MS.git),
  // The worktree segment reads the payload, not git, so there is no live
  // probe for it: running one compared a worktree name against a git
  // snapshot and printed whichever field happened to line up.
  worktreeState: (cwd) => probeGitInfo(cwd, REFRESH_BUDGET_MS.git),
  pr: (cwd) => normalizePr(probePrInfo(cwd, REFRESH_BUDGET_MS.gh), "gh"),
  rtk: (cwd) => probeRtkSavings(cwd, REFRESH_BUDGET_MS.rtk),
  gates: (cwd) => probeGateRuns(cwd, REFRESH_BUDGET_MS.gates).value?.runs ?? null,
};

/**
 * Why a segment is not on the line. The distinction that matters is
 * between "there is nothing to show here" and "the source failed", which
 * a blank line cannot express (FR-017).
 */
function absenceReason(segment, reading, readings, now) {
  if (COPILOT_ONLY.has(segment.key) && readings?.harness?.value !== "copilot") return "Copilot CLI only";
  if (CODEX_ONLY.has(segment.key) && reading?.value == null && readings?.harness?.value !== "codex") return "Codex CLI only";
  if (segment.key === "codexWindow" && reading?.value == null) return "Codex reports no window other than 5 hours and 7 days";
  if (segment.key === "codexCredits" && reading?.value == null) return "no credit balance in the rollout, or the credits are unlimited";
  if (!reading) return "no reading";
  if ((segment.key === "premiumQuota" || segment.key === "chatQuota") && !reading.error && !reading.value?.quotas?.[segment.key === "premiumQuota" ? "premium" : "chat"]) {
    return reading.value
      ? "the plan has no such monthly allowance, or it is unlimited"
      : "nothing cached yet, or gh is missing or signed out (the refresh runs every 5 minutes under Copilot)";
  }
  if (segment.key === "aiCredits" && reading.value == null) return "no AI credits used this session yet";
  if (reading.error) return `source failed: ${reading.error}`;
  if (segment.key === "promptCache") {
    const pc = reading.value;
    if (!pc) return "not in the payload: Claude Code 2.1.283+ sends it after the first response";
    if (!pc.observed) return "caching is not reported by this provider";
    if (pc.state === "warm" && !pc.closing) {
      const left = pc.secondsLeft === null ? "time left unknown" : `${cacheMinutesLeft(pc.secondsLeft)} left`;
      const window = pc.ttl ? `the ${PROMPT_CACHE_CLOSING_S[pc.ttl] / 60}m closing window` : "any closing window, with no TTL";
      return `warm, ${pc.ttl ?? "unknown TTL"}, ${left}: outside ${window}`;
    }
  }

  const inRepo = readings?.git?.value != null;
  if (Array.isArray(reading.value) && reading.value.length === 0) {
    return segment.key === "skills" ? "no skill used inside the activity window" : "nothing to show";
  }
  if (reading.value === null || reading.value === undefined) {
    if (["branch", "worktree", "remote"].includes(segment.key) && !inRepo) {
      return "not a git repository";
    }
    if (segment.key === "pr") {
      return inRepo
        ? "no open pull request for this branch, or nothing cached yet"
        : "not a git repository";
    }
    if (segment.key === "rtk") return "rtk not installed, or nothing cached yet";
    // Absent on most accounts, which is not a fault: say where it comes from
    // so nobody files a bug about a figure the payload never carries.
    if (segment.key === "spendLimit") {
      return "not in the payload: Claude Code reports a spend limit only behind a Claude gateway with spend limits";
    }
    if (segment.key === "effort") return "the payload carries no effort level";
    if (segment.key === "outputStyle") return "no output style set";
    return "nothing to show";
  }
  const age = ageMs(reading, now);
  if (age > MAX_AGE_MS[segment.key]) {
    return `value is ${Math.round(age / 1000)}s old, past its ${Math.round(MAX_AGE_MS[segment.key] / 1000)}s limit`;
  }
  if (segment.key === "outputStyle" && reading.value === "default") return "the default style is not worth a segment";
  if (segment.key === "worktreeState" && reading.value.changed === 0 && reading.value.untracked === 0) {
    return "a clean tree adds no counters";
  }
  return "not rendered";
}

/**
 * A payload if one is being piped in, and nothing if none is.
 *
 * The TTY guard is not enough on its own. Stdin can be a pipe or a socket
 * that is open and simply idle — a wrapper script, a CI step, `nohup`, an
 * editor's task runner — and waiting for an `end` that never comes means
 * `doctor` hangs forever printing nothing, which is the opposite of what a
 * diagnostic is for. One was found sleeping on this for eight hours.
 *
 * So the wait is bounded, and the clock restarts on every chunk: a real
 * payload arriving slowly still completes, and a stdin that stays silent is
 * taken as having nothing to say. Bounding it is safe here in a way it would
 * not be in `render`, because the payload is optional — the report is built
 * from live probes and an absent payload only costs the few rows that read
 * from it.
 */
const STDIN_QUIET_MS = 250;

async function readStdin({ quietMs = STDIN_QUIET_MS } = {}) {
  if (process.stdin.isTTY) return "";
  return new Promise((resolve) => {
    let data = "";
    let settled = false;
    let timer = null;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      process.stdin.pause();
      resolve(data);
    };
    const wait = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(finish, quietMs);
      // Never a reason on its own to keep the process alive.
      timer.unref?.();
    };
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
      wait();
    });
    process.stdin.on("end", finish);
    process.stdin.on("error", finish);
    wait();
  });
}

export function buildReport(payload, { now = Date.now(), live = true, probe } = {}) {
  // The same probe set the renderer builds. Missing one here made the
  // diagnostic report a source failure for a segment that renders fine,
  // which is the diagnostic lying about the thing it exists to explain.
  const probes = probe || {
    getGitInfo,
    getPrInfo,
    getRemoteUrl,
    getCiStatus,
    getActiveSkills,
    getActiveSkillsTrueCount,
    subagentActivity,
    getSessionActivity,
    getRtkSavings,
    getDirUrl: (cwd) => getOpenTabUrl(cwd) || getDirUrl(cwd),
    // The diagnostic reports the update state; it neither starts a check nor
    // marks a one-time notice as seen.
    maybeStartUpdateCheck: () => false,
    getUpdateNotice: () => peekUpdateNotice(),
    // The gates the cache holds, without starting a lookup.
    getGateRuns: (cwd, opts) => readGateRuns(cwd, { ...opts, refresh: false }),
    // Copilot CLI's settings and its cached quota, again without a lookup
    // (specs/033-copilot-parity).
    copilotSettings: loadCopilotSettings,
    getCopilotQuota: (opts) => getCopilotQuota({ ...opts, refresh: false }),
  };

  const started = Date.now();
  const harness = detectHarness(payload);
  const copilotSettings = harness === "copilot" ? (probes.copilotSettings?.() ?? {}) : null;
  // Through the same harness switch the renderer uses, so a Copilot payload is
  // read from Copilot's session log here too.
  const readings = gather(payload, harnessProbes(probes, harness, payload), { now, copilotSettings });
  // The arrangement in force, so every line and order below describes the
  // bar this machine draws rather than the one the registry would draw.
  const layout = resolveLayout(readings.cwd);
  const resolved = resolveArrangement(REGISTRY, layout.arrangement, layout.origin);
  const placements = new Map(resolved.placements.map((p) => [p.key, p]));
  const terminal = terminalReport(harness, { settings: copilotSettings, ...(probes.readTty ? { readTty: probes.readTty } : {}) });
  const rendered = renderReadings(readings, payload, {
    tracking: false,
    now,
    maxWidth: terminal.columns,
    maxHeight: terminal.rows ?? Infinity,
    asRows: true,
    arrangement: layout.arrangement,
    arrangementOrigin: layout.origin,
  });
  const elapsedMs = Date.now() - started;

  const rows = SEGMENTS.map((segment) => {
    const reading = readings[segment.reading];
    const shown = isRenderable(segment.key, reading, now);
    const describe = segment.describe || ((v) => (v === null || v === undefined ? null : String(v)));
    const value = shown ? describe(reading.value, now, readings) : null;

    const placed = placements.get(segment.key) ?? segment;
    const row = {
      key: segment.key,
      line: placed.line,
      order: placed.order,
      priority: segment.priority,
      colour: segment.colour,
      arranged: placed.line !== segment.line || placed.order !== segment.order,
      on: placed.on !== false,
      rendered: Boolean(shown && value !== null && placed.on !== false),
      value: value ?? "—",
      source: reading?.source ?? "none",
      ageMs: Math.max(0, Math.round(ageMs(reading, now))),
      fresh: reading?.fresh ?? false,
      tookMs: reading?.tookMs ?? 0,
    };
    if (!row.rendered) {
      row.reason = row.on ? absenceReason(segment, reading, readings, now) : "switched off by the arrangement";
    }

    // FR-004/FR-005, specs/008-skills-line-completeness: which path
    // answered (hook vs the slower transcript fallback), and — for a
    // skill a caller might expect to see but doesn't — whether it merely
    // expired from the activity window or was never detected at all.
    if (segment.key === "skills") {
      const detailed = getActiveSkillsDetailed(payload?.transcript_path, 50, {
        now,
        sessionId: payload?.session_id,
      });
      row.tracking = {
        source: detailed.source === "hook" ? "hook" : "transcript fallback",
        truncated: detailed.truncated ?? false,
      };
      // With nothing currently active, say whether that's because the last
      // skill used simply expired (and when), or because none was ever
      // detected at all — the distinction User Story 3 asks for.
      if (!detailed.skills.length && payload?.session_id) {
        const last = mostRecentSkillEvent(payload.session_id);
        row.tracking.lastSeen = last ? { skill: last.skill, at: last.at, expired: true } : null;
      }
      if (row.reason) {
        const src = `source: ${row.tracking.source}`;
        row.reason = row.tracking.lastSeen
          ? `${row.reason} (${src}; ${row.tracking.lastSeen.skill} expired, last seen ${new Date(row.tracking.lastSeen.at).toISOString()})`
          : `${row.reason} (${src})`;
      }
    }

    if (live && LIVE_PROBES[segment.key]) {
      const at = Date.now();
      let probed = null;
      try {
        probed = LIVE_PROBES[segment.key](readings.cwd);
      } catch (err) {
        probed = null;
        row.liveError = err?.message || String(err);
      }
      row.live = probed === null ? "—" : describe(probed, now, readings) ?? "—";
      row.liveTookMs = Date.now() - at;
    }
    return row;
  });

  return {
    cwd: readings.cwd,
    elapsedMs,
    terminal,
    // Which arrangement is in force, where it came from, and every part of
    // it that was refused. A segment missing because somebody switched it
    // off is a different answer from one missing because its source failed,
    // and the diagnostic exists to tell those two apart.
    arrangement: {
      origin: resolved.origin,
      path: layout.path,
      name: resolved.name,
      error: layout.error ?? null,
      ignored: resolved.ignored,
    },
    // Why "no burn rate yet" is the answer during the first minute of a
    // session, without having to guess at it.
    samples: (readings.samples?.value ?? []).length,
    budgets: { redrawMs: 300, sources: SOURCE_BUDGET_MS, refresh: REFRESH_BUDGET_MS },
    // Numbered by what was printed, not by the four-line scheme: with no
    // skills the second printed row is line 3's content, and calling it
    // "line 2" in a diagnostic would be the diagnostic lying.
    // Reported by the line each row is, not by where it landed: with no
    // skills the second printed row is line 3, and calling it row 2 leaves
    // the reader matching widths against the wrong content.
    rows: rendered.map((entry, i) => ({ row: i + 1, line: entry.line, width: displayWidth(entry.text) })),
    segments: rows,
  };
}

/**
 * The size the bar was fitted to, and whether it was read or assumed.
 *
 * Without the source, an old Claude Code that sets neither variable printed
 * "120 columns, Infinity rows" as if both had been measured. And `Infinity`
 * has no JSON form, so `--json` turned it into a bare `null` with nothing to
 * say why.
 */
export function terminalReport(harness = "claude", { readTty, settings = null, env = process.env, platform = process.platform } = {}) {
  // The same answer layout.js gives the renderer, so the line says what the
  // bar was fitted to. Under Copilot CLI that is `/dev/tty` less Copilot's
  // padding, since Copilot sets neither variable (specs/033-copilot-parity).
  const size = terminalFor(harness, { env, settings, platform, ...(readTty ? { readTty } : {}) });
  const rows = Number.isFinite(size.rows) ? size.rows : null;
  return {
    columns: size.columns,
    columnsSource: size.source,
    padding: size.source === "tty" ? copilotPadding(settings) : 0,
    rows,
    rowsSource: rows === null ? "unset" : size.source === "tty" ? "tty" : "LINES",
  };
}

/**
 * One harness found on the machine. For Copilot CLI it also says how often
 * Copilot re-runs the bar and whether its own footer still repeats it
 * (specs/033-copilot-parity), since both decide how the bar reads there.
 * For Codex it names whose item list is in place, and the colors and theme
 * (specs/034-codex-items).
 */
export function harnessLine(h) {
  if (h.harness === "codex" && h.items !== undefined) return codexLine(h);
  const name = { copilot: "Copilot CLI", opencode: "OpenCode" }[h.harness] ?? "Codex";
  const base = `install: ${name} found at ${h.home}, ${h.configured ? "set up with this plugin" : `not set up (run install --harness ${h.harness})`}`;
  if (h.harness !== "copilot" || !h.configured) return base;
  const interval = h.refreshInterval ? `refreshes every ${h.refreshInterval}s` : "refreshes only on Copilot's own events";
  const footer = h.quietFooter
    ? "Copilot's footer quieted (install --harness copilot --no-quiet-footer restores it)"
    : "Copilot's footer repeats some of the bar (install --harness copilot --quiet-footer hides that)";
  return `${base}; ${interval}; ${footer}`;
}

const CODEX_ITEMS_TEXT = {
  current: "items: this plugin's 12, in the Claude bar's order",
  older: "items: an older list this plugin wrote (install --harness codex upgrades it)",
  user: "items: your own status_line, which install keeps",
  absent: null,
  unsafe: "items: config.toml defines tui in a form install does not edit",
};
const CODEX_COLORS_TEXT = {
  ours: "colors on (set by this plugin)",
  "yours-on": "colors on (your setting)",
  "yours-off": "colors off (your setting)",
  unset: "colors not set (install --harness codex turns them on)",
};

function codexLine(h) {
  const where = `install: Codex found at ${h.home}`;
  const parts = [];
  if (h.items === "absent") parts.push(`${where}, not set up (run install --harness codex)`);
  else if (h.configured) parts.push(`${where}, set up with this plugin`, CODEX_ITEMS_TEXT[h.items]);
  else parts.push(`${where}, ${CODEX_ITEMS_TEXT[h.items] ?? "not set up"}`);
  if (CODEX_COLORS_TEXT[h.colors]) parts.push(CODEX_COLORS_TEXT[h.colors]);
  if (h.theme) parts.push(`theme ${h.theme} (set by this plugin; install --harness codex --no-theme restores yours)`);
  if (h.pane) parts.push(codexPaneText(h.pane));
  return parts.join("; ");
}

/** `2m`, `3h`, `5d`: how long ago, for a pointer's age. */
function ago(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 48 * 3600) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

/** Whether the bar pane under Codex can run, and the last session a hook reported (specs/035-codex-pane). */
function codexPaneText(pane) {
  if (pane.tmux && pane.hook) {
    const last = pane.latest ? `last session ${pane.latest.session_id} ${ago(pane.latest.ageMs)} ago` : "no session reported yet";
    return `pane: ready (tmux ${pane.tmux}, SessionStart hook registered, ${last})`;
  }
  const tmux = pane.tmux ? `tmux ${pane.tmux}` : "tmux not found";
  const hook = pane.hook ? "SessionStart hook registered" : "hook not registered (install --harness codex --pane)";
  return `pane: ${tmux}; ${hook}`;
}

export function terminalLine(t) {
  const columns =
    t.columnsSource === "default"
      ? `${t.columns} columns (COLUMNS not set, using the default)`
      : t.columnsSource === "tty"
        ? `${t.columns} columns (read from /dev/tty: Copilot CLI sets no COLUMNS${t.padding ? `; less its padding of ${t.padding}` : ""})`
        : `${t.columns} columns`;
  const rows = t.rows === null ? "rows unknown (LINES not set, every line drawn)" : `${t.rows} rows`;
  return `terminal: ${columns}, ${rows}`;
}

/**
 * The colour flavor a render here would use, and where the name came from.
 *
 * The renderer falls back to mocha for a name it does not know, which is the
 * right thing for a bar but leaves a typo invisible: "dracula" draws mocha
 * and nothing anywhere says so. This is where it gets said. The lookup order
 * is resolveSettings's: the variable, then the repository's file.
 */
export function flavorStatus(cwd = process.cwd(), env = process.env) {
  const fromEnv = env.CLAUDE_STATUSLINE_FLAVOR;
  const fromFile = fromEnv ? undefined : repoConfig(cwd).flavor;
  const fromTerminal = fromEnv || fromFile ? null : terminalFlavor(env);
  const name = fromEnv || fromFile || fromTerminal || "mocha";
  const source = fromEnv
    ? "from CLAUDE_STATUSLINE_FLAVOR"
    : fromFile
      ? "from .statusline.json"
      : fromTerminal
        ? "from the terminal background (COLORFGBG)"
        : "default";
  const known = Object.hasOwn(PALETTES, name);
  return {
    name,
    source,
    known,
    line: known ? `flavor: ${name} (${source})` : `flavor: unknown "${name}" (${source}), using mocha`,
  };
}

/**
 * The icon tier a render here would draw, and where the choice came from.
 * An unknown value of `CLAUDE_STATUSLINE_ICONS` is named, because the bar
 * falls back to the Nerd Font tier and nothing else would say so.
 */
export function iconStatus(env = process.env) {
  const asciiArrows = env.CLAUDE_STATUSLINE_ASCII === "1";
  const { tier, source, unknown } = iconTier({ env, asciiArrows });
  const from = source === "default" ? "default" : source === "ASCII" ? "from CLAUDE_STATUSLINE_ASCII" : "from CLAUDE_STATUSLINE_ICONS";
  const event = tier === "nerd" && env.CLAUDE_STATUSLINE_EVENT_EMOJI === "1" ? ", event emoji on" : "";
  return {
    tier,
    source,
    unknown: unknown ?? null,
    line: unknown !== undefined
      ? `icons: unknown "${unknown}" (CLAUDE_STATUSLINE_ICONS), using nerd`
      : `icons: ${tier} (${from})${event}`,
  };
}

/**
 * The separator style a render here would draw, and where it came from. An
 * unknown name is returned as such: the bar draws the arrow and nothing else
 * would say so.
 */
export function separatorStatus(env = process.env) {
  const raw = env.CLAUDE_STATUSLINE_SEPARATOR;
  if (!raw) return { style: "arrow", unknown: null, line: "separator: arrow (default)" };
  if (SEPARATOR_STYLES.includes(raw)) {
    return { style: raw, unknown: null, line: `separator: ${raw} (from CLAUDE_STATUSLINE_SEPARATOR)` };
  }
  return {
    style: "arrow",
    unknown: raw,
    line: `separator: unknown "${raw}" (CLAUDE_STATUSLINE_SEPARATOR), using arrow`,
  };
}

function pad(text, width) {
  const value = String(text);
  if (value.length > width - 1) return value.slice(0, width - 2) + "… ";
  return value + " ".repeat(width - value.length);
}

export function formatReport(report) {
  const header = [
    pad("segment", 17),
    pad("line", 6),
    pad("pri", 5),
    pad("shown", 6),
    pad("value", 36),
    pad("source", 11),
    pad("age", 8),
    pad("cost", 8),
    pad("live", 28),
  ].join("");

  const rows = report.segments.map((row) => {
    const live = row.live === undefined ? "" : `${row.live} (${row.liveTookMs} ms)`;
    return [
      pad(row.key, 17),
      pad(`${row.line}${row.arranged ? "*" : ""}`, 6),
      pad(row.priority, 5),
      pad(row.rendered ? "yes" : "no", 6),
      pad(row.rendered ? row.value : row.reason, 36),
      pad(row.source, 11),
      pad(`${(row.ageMs / 1000).toFixed(1)}s`, 8),
      pad(`${row.tookMs} ms`, 8),
      pad(live, 28),
    ].join("");
  });

  const widths = report.rows.map((l) => `line ${l.line}: ${l.width} columns`).join(", ");
  const a = report.arrangement;
  const arrangementLine =
    a.origin === "default"
      ? `arrangement: default${a.path ? ` (nothing usable at ${a.path})` : ""}${a.error ? `: ${a.error}` : ""}`
      : `arrangement: ${a.name ? `"${a.name}" ` : ""}from ${a.origin}${a.path ? ` (${a.path})` : ""}`;
  const ignoredLines = a.ignored.map(
    (entry) => `  ignored ${entry.what}${entry.key ? ` on ${entry.key}` : ""}: ${entry.reason}`
  );
  const installLines = !report.install
    ? []
    : report.install.error
      ? [`install: ~/.claude/settings.json could not be read: ${report.install.error}`]
      : report.install.length === 0
      ? ["install: this plugin is not in settings.json"]
      : report.install.every((c) => c.ok)
        ? [`install: ${report.install.map((c) => c.entry).join(", ")} intact`]
        : report.install
            .filter((c) => !c.ok)
            .map((c) => `install: ${c.entry} is broken: ${c.problem}. Run \`update\` or \`install\` again.`);
  const overrideLines = (report.overrides ?? []).map(
    (o) => `install: ${o.file} sets its own statusLine, and Claude Code uses it here instead of this one (${o.command})`
  );
  return [
    ...installLines,
    ...overrideLines,
    ...(report.harnesses ?? []).map((h) => harnessLine(h)),
    ...(report.updates ? [report.updates] : []),
    `working directory: ${report.cwd}`,
    arrangementLine,
    ...ignoredLines,
    `redraw: ${report.elapsedMs} ms of a ${report.budgets.redrawMs} ms budget`,
    ...(report.flavor ? [report.flavor.line] : []),
    ...(report.icons ? [report.icons.line] : []),
    ...(report.separator ? [report.separator.line] : []),
    terminalLine(report.terminal),
    `history: ${report.samples} samples (a rate needs 5 spanning a minute)`,
    `rendered ${widths}`,
    "",
    header,
    "-".repeat(header.length),
    ...rows,
  ].join("\n");
}

export async function runDoctor({ json = false, now = Date.now() } = {}) {
  const raw = await readStdin();
  let payload = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = {};
  }

  const report = buildReport(payload, { now });
  report.install = readInstallChecks();
  // The process directory, not the payload's: the render command resolves
  // its settings from there, and this line has to name what it used.
  report.flavor = flavorStatus(process.cwd());
  report.icons = iconStatus();
  report.separator = separatorStatus();
  // A project statusLine wins over the user's, so a person in that project
  // sees another bar and this one looks broken (specs/028-cross-platform).
  report.overrides = projectOverrides(payload?.workspace?.project_dir || payload?.cwd || process.cwd());
  report.harnesses = harnessStatus();
  report.updates = updatesLine(readEntry(repoKey(UPDATE_ROOT), "update")?.value, readBehaviour(), now);
  return json ? JSON.stringify(report, null, 2) : formatReport(report);
}

/**
 * This plugin's entries in the real settings file, checked for paths that
 * no longer exist. Read here rather than in `buildReport`, which the tests
 * call and which must not depend on the machine running them.
 *
 * A missing file and an unreadable one are different answers. No file means
 * nothing was installed, which is the empty list. A file that will not parse
 * is reported with the reason, because Claude Code cannot read it either.
 * Both used to return null, and doctor then printed no install line at all.
 */
function readInstallChecks() {
  const file = path.join(os.homedir(), ".claude", "settings.json");
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch (err) {
    if (err?.code === "ENOENT") return [];
    return { error: err?.message || String(err) };
  }
  try {
    return checkInstall(JSON.parse(text));
  } catch (err) {
    return { error: err?.message || String(err) };
  }
}

/**
 * What each colour means, one line each, with a swatch in that colour.
 *
 * The budget is only useful to a reader who can learn it without opening the
 * constitution. The swatch is drawn through the same emitters as the bar, in
 * the palette a render here would use, so it is the colour the person sees
 * and falls away with `NO_COLOR` like every other colour.
 */
export function colourLegend(cwd = process.cwd(), env = process.env) {
  const { flavor } = resolveSettings(cwd, env);
  const palette = PALETTES[flavor] ?? PALETTES.mocha;
  const names = LEGEND.map(([role]) => ROLE[role]);
  const width = Math.max(...names.map((n) => n.length));
  return LEGEND.map(([role, meaning]) => {
    const token = ROLE[role];
    const swatch = colourEnabled() ? `${bgSeq(palette[token])}  \x1b[0m ` : "";
    return `  ${swatch}${token.padEnd(width)}  ${meaning}`;
  });
}

/**
 * What every segment shows, one line each.
 *
 * The bar cannot be asked directly: a terminal has no hover, and the
 * statusline is printed once by a process that exits. This is where the
 * question goes instead, and the composer page asks the same list on hover
 * (specs/019-explaining-a-segment).
 *
 * Ordered by line and then by position, so the list reads in the order the
 * eye meets the segments rather than alphabetically.
 */
export function explainSegments() {
  const rows = [...REGISTRY].sort((a, b) => a.line - b.line || a.order - b.order);
  const width = Math.max(...rows.map((r) => r.key.length));
  const out = [];
  let line = null;
  for (const row of rows) {
    if (row.line !== line) {
      line = row.line;
      out.push(`${out.length ? "\n" : ""}line ${line}`);
    }
    out.push(`  ${row.key.padEnd(width)}  ${SEGMENT_ABOUT[row.key] ?? "(undescribed)"}`);
  }
  out.push("", "colours", ...colourLegend());
  return out.join("\n");
}
