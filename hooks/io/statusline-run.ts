// Runs the vendored statusline and checks Node (spec 070 FR-006, FR-008). It takes a process
// runner built in register.tsx, so no `$` crosses this import (the engine refuses that).
import { isFallback, parseAnsiLines, plainOf, type Run } from '../core/statusline-dep'

export type RunProc = (
  argv: string[],
  init: { cwd?: string; env?: Record<string, string>; stdin?: string; timeoutMs?: number },
) => Promise<{ exitCode: number; stdout: string; stderr?: string }>

export const RENDER_BUDGET_MS = 3000
export const NODE_BUDGET_MS = 5000
const MIN_NODE_MAJOR = 18

/** `node --version` as ok, missing or older than 18. A process that cannot start is missing. */
export const nodeStatus = async (run: RunProc): Promise<'ok' | 'missing' | 'old'> => {
  try {
    const r = await run(['node', '--version'], { timeoutMs: NODE_BUDGET_MS })
    if (r.exitCode !== 0) return 'missing'
    const major = Number.parseInt(/v?(\d+)\./.exec(r.stdout.trim())?.[1] ?? '', 10)
    if (!Number.isFinite(major)) return 'missing'
    return major >= MIN_NODE_MAJOR ? 'ok' : 'old'
  } catch {
    return 'missing'
  }
}

export type RenderResult =
  | { ok: true; lines: Run[][]; ms: number }
  | { ok: false; reason: 'exit' | 'fallback' | 'timeout' | 'error'; ms: number }

/**
 * One render: the CLI with the payload on stdin and the environment additions, as an argv array.
 * Good only when it exits 0, prints something and is not its own fallback line.
 */
export const renderFooter = async (input: {
  run: RunProc
  cli: string
  payload: unknown
  env: Record<string, string>
  now: () => number
  cwd?: string
}): Promise<RenderResult> => {
  const started = input.now()
  try {
    const r = await input.run(['node', input.cli], {
      env: input.env,
      stdin: JSON.stringify(input.payload),
      timeoutMs: RENDER_BUDGET_MS,
      ...(input.cwd === undefined ? {} : { cwd: input.cwd }),
    })
    const ms = input.now() - started
    if (r.exitCode !== 0) return { ok: false, reason: 'exit', ms }
    const lines = parseAnsiLines(r.stdout)
    if (isFallback(plainOf(lines))) return { ok: false, reason: 'fallback', ms }
    return { ok: true, lines, ms }
  } catch (error) {
    const ms = input.now() - started
    return { ok: false, reason: /time|kill|abort/i.test(error instanceof Error ? error.message : String(error)) ? 'timeout' : 'error', ms }
  }
}
