/**
 * OpenCode's `tui.json`, as install and uninstall edit it (specs/038-opencode).
 *
 * OpenCode loads TUI plugins listed in the `plugin` array of `tui.json` in its
 * global config directory, `$XDG_CONFIG_HOME/opencode` or `~/.config/opencode`.
 * An entry is a path or `[path, options]`. This plugin's entry is the absolute
 * path of `src/opencode/tui.tsx` in this clone.
 *
 * Install adds that entry, or replaces one pointing at another clone of this
 * plugin, and keeps every other key and entry. When install creates the file,
 * or rewrites one, it records what was there so uninstall can put the same
 * bytes back as long as nothing else changed (Principle IV).
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync, renameSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

export const OPENCODE_PLUGIN_PATH = fileURLToPath(new URL("./opencode/tui.tsx", import.meta.url));

export const opencodeConfigDir = (env = process.env) =>
  path.join(env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), "opencode");

/** `tui.json`, or `tui.jsonc` when only that one exists. */
export function opencodeTuiFile(env = process.env) {
  const dir = opencodeConfigDir(env);
  const json = path.join(dir, "tui.json");
  const jsonc = path.join(dir, "tui.jsonc");
  return !existsSync(json) && existsSync(jsonc) ? jsonc : json;
}

const recordFile = (home = os.homedir()) => path.join(home, ".claude", "statusline", "opencode-config.json");

function loadRecord() {
  try {
    return JSON.parse(readFileSync(recordFile(), "utf8"));
  } catch {
    return null;
  }
}

function saveRecord(record) {
  const file = recordFile();
  if (record === null) {
    if (existsSync(file)) unlinkSync(file);
    return;
  }
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(record, null, 2) + "\n");
}

/** The config object and whether comments were dropped. Throws on a file that is not a JSON object. */
export function readTuiConfig(file) {
  if (!existsSync(file)) return { config: null, raw: null, hadComments: false };
  const raw = readFileSync(file, "utf8");
  const stripped = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const config = JSON.parse(stripped.trim() || "{}");
  if (config === null || typeof config !== "object" || Array.isArray(config)) throw new Error(`${file} is not a config object.`);
  return { config, raw, hadComments: stripped !== raw };
}

const specOf = (entry) => (Array.isArray(entry) ? entry[0] : entry);

/** An entry that points at this plugin's file, in this clone or another. */
export function isOurEntry(entry) {
  const spec = specOf(entry);
  if (typeof spec !== "string") return false;
  const p = spec.startsWith("file://") ? fileURLToPath(spec) : spec;
  return p === OPENCODE_PLUGIN_PATH || /[\\/]src[\\/]opencode[\\/]tui\.tsx$/.test(p);
}

function writeAtomic(file, text) {
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, text);
  renameSync(tmp, file);
}

/**
 * Adds this plugin to OpenCode. `backup(file)` saves a copy before any write
 * and returns where. Returns what the CLI prints.
 */
export function installOpencode({ env = process.env, backup }) {
  const dir = opencodeConfigDir(env);
  if (!existsSync(dir)) return { ok: false, reason: `OpenCode is not set up here: ${dir} does not exist. Run opencode once, then install again.` };
  const file = opencodeTuiFile(env);
  let read;
  try {
    read = readTuiConfig(file);
  } catch (err) {
    return { ok: false, reason: `Could not read ${file}: ${err.message}` };
  }
  const config = read.config ?? { $schema: "https://opencode.ai/tui.json" };
  if (config.plugin !== undefined && !Array.isArray(config.plugin)) {
    return { ok: false, reason: `${file} has a "plugin" key that is not a list; install does not edit it.` };
  }
  const list = Array.isArray(config.plugin) ? config.plugin : [];
  const ours = list.filter(isOurEntry);
  if (ours.length === 1 && specOf(ours[0]) === OPENCODE_PLUGIN_PATH) {
    return { ok: true, harness: "opencode", file, entry: "present", plugin: OPENCODE_PLUGIN_PATH, notes: [] };
  }
  const entry = ours.length ? "updated" : "added";
  config.plugin = [...list.filter((e) => !isOurEntry(e)), OPENCODE_PLUGIN_PATH];
  const backupPath = read.raw !== null ? backup(file) : null;
  const text = JSON.stringify(config, null, 2) + "\n";
  writeAtomic(file, text);
  const previous = loadRecord();
  // The first install's original is the one to restore; a later install that
  // only points the entry at another clone keeps it.
  const record =
    previous && previous.file === file
      ? { ...previous, written: text }
      : { file, created: read.raw === null, original: read.raw, written: text };
  saveRecord(record);
  const notes = read.hadComments ? [`${file} had comments; they are in the backup and not in the rewritten file.`] : [];
  return { ok: true, harness: "opencode", file, backupPath, entry, plugin: OPENCODE_PLUGIN_PATH, notes };
}

/** Removes this plugin's entry from OpenCode's `tui.json`, and nothing else. */
export function uninstallOpencode({ env = process.env, backup }) {
  const file = opencodeTuiFile(env);
  if (!existsSync(file)) return { changed: false, reason: `${file} does not exist.` };
  let read;
  try {
    read = readTuiConfig(file);
  } catch (err) {
    return { changed: false, reason: `Could not read ${file}: ${err.message}` };
  }
  const list = Array.isArray(read.config.plugin) ? read.config.plugin : [];
  if (!list.some(isOurEntry)) return { changed: false, reason: `OpenCode's ${path.basename(file)} has no entry for this plugin.` };
  backup(file);
  const record = loadRecord();
  // Nothing changed since install: the file goes back to the bytes it had,
  // or away if install created it.
  if (record && record.file === file && record.written === read.raw) {
    if (record.created) unlinkSync(file);
    else writeAtomic(file, record.original);
    saveRecord(null);
    return { changed: true, file, removedFile: record.created };
  }
  const config = { ...read.config, plugin: list.filter((e) => !isOurEntry(e)) };
  writeAtomic(file, JSON.stringify(config, null, 2) + "\n");
  saveRecord(null);
  return { changed: true, file, removedFile: false };
}

/** OpenCode on this machine, and whether this plugin is in its `tui.json`. */
export function opencodeStatus({ env = process.env } = {}) {
  const dir = opencodeConfigDir(env);
  if (!existsSync(dir)) return null;
  const file = opencodeTuiFile(env);
  let configured = false;
  let current = false;
  try {
    const list = readTuiConfig(file).config?.plugin;
    if (Array.isArray(list)) {
      configured = list.some(isOurEntry);
      current = list.some((e) => specOf(e) === OPENCODE_PLUGIN_PATH);
    }
  } catch {
    configured = false;
  }
  return { harness: "opencode", home: dir, file, configured, current };
}
