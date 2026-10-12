/** @jsxImportSource @opentui/solid */
/**
 * The bar inside OpenCode (specs/038-opencode).
 *
 * OpenCode runs no status line command, but it loads TUI plugins listed in its
 * `tui.json`, and `app_bottom` is drawn under the prompt on every screen. This
 * plugin takes a snapshot of OpenCode's own state, turns it into the payload
 * Claude Code would have sent (src/opencodePayload.js), runs this clone's
 * renderer on it in a child process and draws the result as coloured text.
 *
 * The renderer runs outside OpenCode because it calls git and gh with blocking
 * calls; inside OpenCode's process those would freeze its screen on every
 * redraw. One render runs at a time, with a deadline. A failed or slow render
 * keeps the last good bar on screen, and OpenCode never waits on it.
 */
import { createSignal, For } from "solid-js"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { opencodePayload } from "../opencodePayload.js"
import { parseAnsi } from "./ansi.js"

const CLI = fileURLToPath(new URL("../../bin/cli.js", import.meta.url))
/** A render that has not answered by then is killed; the last bar stays. */
const DEADLINE_MS = 4000
/** Events arrive in bursts while a turn streams; one render answers a burst. */
const DEBOUNCE_MS = 250
/** Git, the clock and the countdowns move without an OpenCode event. */
const SLOW_CLOCK_MS = 10_000
/** How often the plugin checks whether the session or the width changed. */
const WATCH_MS = 1000

/** The events after which the bar can say something new. */
const EVENTS = [
  "session.status",
  "session.updated",
  "session.idle",
  "message.updated",
  "message.removed",
  "todo.updated",
  "session.diff",
]

const tui = async (api, options) => {
  const node = typeof options?.node === "string" && options.node ? options.node : "node"
  const [lines, setLines] = createSignal([])
  let running = false
  let again = false
  let timer = null
  let lastKey = ""

  const sessionID = () => {
    const route = api.route?.current
    return route?.name === "session" && typeof route.params?.sessionID === "string" ? route.params.sessionID : null
  }

  const width = () => {
    const w = api.renderer?.width ?? api.renderer?.terminalWidth ?? process.stdout.columns
    return Number.isFinite(w) && w > 20 ? Math.floor(w) - 2 : 118
  }

  const snapshot = () => {
    const state = api.state
    const id = sessionID()
    const get = (fn) => {
      try {
        return id ? fn(id) : undefined
      } catch {
        return undefined
      }
    }
    return {
      version: api.app?.version,
      directory: state?.path?.directory,
      worktree: state?.path?.worktree,
      branch: state?.vcs?.branch,
      providers: state?.provider,
      session: get((s) => state.session.get(s)),
      messages: get((s) => state.session.messages(s)),
      status: get((s) => state.session.status(s)),
      todos: get((s) => state.session.todo(s)),
    }
  }

  const render = () => {
    if (running) {
      again = true
      return
    }
    running = true
    let payload
    try {
      payload = opencodePayload(snapshot())
    } catch {
      running = false
      return
    }
    let out = ""
    let done = false
    const finish = (ok) => {
      if (done) return
      done = true
      clearTimeout(kill)
      running = false
      if (ok && out.trim()) setLines(parseAnsi(out))
      if (again) {
        again = false
        schedule()
      }
    }
    let child
    try {
      child = spawn(node, [CLI, "render"], {
        cwd: payload.cwd || process.cwd(),
        env: { ...process.env, COLUMNS: String(width()), LINES: "40" },
        stdio: ["pipe", "pipe", "ignore"],
        windowsHide: true,
      })
    } catch {
      running = false
      return
    }
    const kill = setTimeout(() => {
      try {
        child.kill()
      } catch {}
      finish(false)
    }, DEADLINE_MS)
    child.stdout.setEncoding("utf8")
    child.stdout.on("data", (chunk) => (out += chunk))
    child.on("error", () => finish(false))
    child.on("close", (code) => finish(code === 0))
    child.stdin.on("error", () => {})
    child.stdin.end(JSON.stringify(payload))
  }

  const schedule = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      render()
    }, DEBOUNCE_MS)
  }

  for (const type of EVENTS) {
    try {
      api.event.on(type, schedule)
    } catch {}
  }
  const watch = setInterval(() => {
    const key = `${sessionID() ?? ""}|${width()}`
    if (key !== lastKey) {
      lastKey = key
      schedule()
    }
  }, WATCH_MS)
  const clock = setInterval(schedule, SLOW_CLOCK_MS)
  api.lifecycle.onDispose(() => {
    clearInterval(watch)
    clearInterval(clock)
    if (timer) clearTimeout(timer)
  })
  schedule()

  api.slots.register({
    slots: {
      app_bottom() {
        return (
          <box flexDirection="column" flexShrink={0} paddingLeft={1}>
            <For each={lines()}>
              {(line) => (
                <text>
                  <For each={line}>
                    {(run) => <span style={{ fg: run.fg ?? undefined, bg: run.bg ?? undefined }}>{run.text}</span>}
                  </For>
                </text>
              )}
            </For>
          </box>
        )
      },
    },
  })
}

export default { id: "statusline-plugin", tui }
