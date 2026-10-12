/**
 * Which coding agent is running the bar (specs/029-multi-harness).
 *
 * GitHub Copilot CLI runs a status line command the way Claude Code does,
 * with its own payload. Its loader exports `COPILOT_CLI_BINARY_VERSION` to the
 * command, and its payload alone carries `ai_used`; either is enough. The
 * Copilot-only chips (premium requests, allow-all) do not need this: they
 * show whenever their fields are present. Anything else is Claude Code.
 *
 * Codex CLI sends nothing: the payload a `codex` block marks is one this
 * plugin built from Codex's rollout (src/codexRollout.js, specs/035-codex-pane).
 * OpenCode sends nothing either: an `opencode` block marks a payload its TUI
 * plugin built from OpenCode's state (src/opencodePayload.js, specs/038-opencode).
 */
const block = (payload, key) =>
  payload && typeof payload === "object" && payload[key] && typeof payload[key] === "object" && !Array.isArray(payload[key]);

export function detectHarness(payload, env = process.env) {
  if (block(payload, "codex")) return "codex";
  if (block(payload, "opencode")) return "opencode";
  if (env?.COPILOT_CLI_BINARY_VERSION) return "copilot";
  if (payload && typeof payload === "object" && "ai_used" in payload) return "copilot";
  return "claude";
}
