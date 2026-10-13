import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import os from "node:os";

/**
 * There is no cross-platform, cross-terminal URL scheme for "open a new
 * tab at this path" — clicking an OSC 8 link only ever asks the OS to
 * open a URL, and each terminal decides for itself what that means.
 *
 * macOS is the one platform where a reliable hand-off exists: a
 * `.command` file (an executable shell script the OS runs on open) can
 * drive iTerm2 or Terminal.app over AppleScript. Linux and Windows have
 * no equivalent that works without installing a custom URL-scheme
 * handler, which is too invasive for a statusline, so on those
 * platforms this returns null and the caller falls back to a plain
 * `file://` link that opens the system file manager.
 *
 * Supported: macOS + iTerm2, macOS + Terminal.app. Everything else
 * (Ghostty, Warp, kitty, WezTerm, VS Code's terminal, all of Linux and
 * Windows) gets the file-manager fallback.
 */
export function buildOpenTabScript(cwd, termProgram, platform = process.platform) {
  // Guard on the platform, not just the terminal name: TERM_PROGRAM is an
  // ordinary environment variable that can carry a macOS value on a Linux
  // box, and writing an osascript wrapper there would produce a file that
  // does nothing when clicked.
  if (platform !== "darwin") return null;

  const dir = cwd || process.cwd();
  const escaped = dir.replace(/'/g, `'\\''`);

  let body = null;
  if (termProgram === "iTerm.app") {
    body = `#!/bin/bash
osascript <<'APPLESCRIPT'
tell application "iTerm2"
  activate
  tell current window
    create tab with default profile
    tell current session to write text "cd '${escaped}'"
  end tell
end tell
tell application "Terminal"
  if (count of windows) > 0 then close front window
end tell
APPLESCRIPT
`;
  } else if (termProgram === "Apple_Terminal") {
    // `do script ... in front window` adds a new TAB to that window;
    // without a target window Terminal.app opens a new window instead.
    body = `#!/bin/bash
osascript <<'APPLESCRIPT'
tell application "Terminal"
  activate
  if (count of windows) > 0 then
    do script "cd '${escaped}'" in front window
  else
    do script "cd '${escaped}'"
  end if
end tell
APPLESCRIPT
`;
  } else {
    return null;
  }

  // Name the file after a hash of the directory, NOT the pid: every
  // statusline render is a fresh process with a fresh pid, so a
  // pid-based name would leave one abandoned temp file per render,
  // forever. Keyed by directory, the same session reuses one file and
  // the total is bounded by how many directories you actually work in.
  const key = createHash("sha256").update(`${termProgram}\0${dir}`).digest("hex").slice(0, 16);
  const file = path.join(os.tmpdir(), `claude-statusline-open-tab-${key}.command`);
  try {
    writeFileSync(file, body, { mode: 0o755 });
    return file;
  } catch {
    return null;
  }
}

/**
 * Returns a `file://` URL to an open-tab script for the current terminal,
 * or null when the platform/terminal combination has no reliable way to
 * open a tab (caller should fall back to a plain directory link).
 */
export function getOpenTabUrl(cwd) {
  const file = buildOpenTabScript(cwd, process.env.TERM_PROGRAM);
  return file ? pathToFileUrl(file) : null;
}

/**
 * Builds a `file://` URL from an absolute path. Windows paths need the
 * extra leading slash and forward slashes (`file:///C:/Users/...`), and
 * every platform needs characters like spaces and `#` percent-encoded.
 */
export function pathToFileUrl(absPath) {
  const normalized = absPath.replace(/\\/g, "/");
  const withSlash = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return `file://${encodeURI(withSlash).replace(/[?#]/g, (c) => "%" + c.charCodeAt(0).toString(16))}`;
}
