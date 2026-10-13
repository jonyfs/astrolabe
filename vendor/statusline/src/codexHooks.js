/**
 * This plugin's SessionStart hook in Codex's `hooks.json` (specs/035-codex-pane).
 *
 * The file is shared: other tools keep their hooks there too. Codex trusts
 * each hook by its place, `<file>:<event>:<group>:<hook>`, and by a hash of
 * its command, so adding a hook in front of another one would move the other
 * one's place and Codex would ask the person to trust it again. Ours is
 * therefore always appended as the last SessionStart group, and the command
 * stays the same across updates. Removing it takes out only its own group.
 *
 * The file is JSON. It is parsed and written back with two-space indentation,
 * which is the form Codex and the tools seen on this machine write, so the
 * rest of the file comes back byte for byte.
 */

export const CODEX_HOOK_EVENT = "SessionStart";

/** Seconds Codex waits for the hook. Writing one small file takes milliseconds. */
export const CODEX_HOOK_TIMEOUT_SECONDS = 10;

/** This plugin's hook, from any clone: the CLI script with the `codex-hook` subcommand. */
export function isOurHookCommand(command) {
  return /cli\.js"?\s+codex-hook\s*$/.test(String(command ?? ""));
}

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** The parsed file. Empty text is an empty file. Throws on anything that is not a hooks object. */
export function parseHooks(text = "") {
  if (!String(text).trim()) return { hooks: {} };
  const doc = JSON.parse(text);
  if (!isObject(doc)) throw new Error("hooks.json is not a JSON object");
  if (doc.hooks === undefined) doc.hooks = {};
  if (!isObject(doc.hooks)) throw new Error("hooks.json has a `hooks` key that is not an object");
  return doc;
}

const serialize = (doc) => JSON.stringify(doc, null, 2) + "\n";

function* ourHooks(doc) {
  for (const [event, groups] of Object.entries(doc.hooks)) {
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
      if (!isObject(group) || !Array.isArray(group.hooks)) continue;
      for (const hook of group.hooks) if (isObject(hook) && isOurHookCommand(hook.command)) yield { event, group, hook };
    }
  }
}

/** Whether the file has this plugin's hook. False for a file that does not parse. */
export function hasCodexHook(text = "") {
  try {
    return !ourHooks(parseHooks(text)).next().done;
  } catch {
    return false;
  }
}

/**
 * Adds the hook, or points an existing one at `command`. `state` is `added`,
 * `present` (already this command) or `updated` (another clone's path).
 */
export function addCodexHook(text, command) {
  const doc = parseHooks(text);
  const found = ourHooks(doc).next();
  if (!found.done) {
    if (found.value.hook.command === command) return { text: serialize(doc), state: "present" };
    found.value.hook.command = command;
    return { text: serialize(doc), state: "updated" };
  }
  const groups = Array.isArray(doc.hooks[CODEX_HOOK_EVENT]) ? doc.hooks[CODEX_HOOK_EVENT] : [];
  groups.push({ hooks: [{ type: "command", command, timeout: CODEX_HOOK_TIMEOUT_SECONDS }] });
  doc.hooks[CODEX_HOOK_EVENT] = groups;
  return { text: serialize(doc), state: "added" };
}

/**
 * Takes out every hook of this plugin, then any group or event it leaves
 * empty. `empty` says whether nothing is left in the file at all.
 */
export function removeCodexHook(text) {
  const doc = parseHooks(text);
  let removed = 0;
  for (const [event, groups] of Object.entries(doc.hooks)) {
    if (!Array.isArray(groups)) continue;
    let touched = false;
    const kept = [];
    for (const group of groups) {
      if (!isObject(group) || !Array.isArray(group.hooks)) {
        kept.push(group);
        continue;
      }
      const left = group.hooks.filter((h) => !(isObject(h) && isOurHookCommand(h.command)));
      if (left.length === group.hooks.length) {
        kept.push(group);
        continue;
      }
      removed += group.hooks.length - left.length;
      touched = true;
      if (left.length) kept.push({ ...group, hooks: left });
    }
    if (!touched) continue;
    if (kept.length) doc.hooks[event] = kept;
    else delete doc.hooks[event];
  }
  const empty = Object.keys(doc).length === 1 && Object.keys(doc.hooks).length === 0;
  return { text: removed ? serialize(doc) : text, removed, empty };
}
