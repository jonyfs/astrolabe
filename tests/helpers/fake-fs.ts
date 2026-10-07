// An in-memory file system for tests: the test environment has no real one.
import type { On } from 'claude-code'
import { mock, type MockClock } from 'claude-code/testing'

import { normalizePath, parentDir } from '../../hooks/core/paths'
import type { Fs, FsEntryKind } from '../../hooks/io/fs-port'
import type { Held } from '../../hooks/io/reconcile'

/** POSIX or drive paths to file contents. A key ending in `/` is an empty directory. */
export type Tree = Record<string, string>

export type Fixture = {
  cwd: string
  tree: Tree
}

export type Counts = { read: number; list: number; exists: number; stat: number; reads: string[] }

type Index = { files: Map<string, string>; dirs: Set<string> }

// Tests mutate trees in place, so the index is cached per tree and rebuilt only when the
// tree's entries change (the 40-feature fixtures make hundreds of calls).
const indexCache = new WeakMap<Tree, { signature: string; index: Index }>()
const indexTree = (tree: Tree): Index => {
  const signature = Object.entries(tree)
    .map(([k, v]) => `${k}\u0000${v}`)
    .join('\u0001')
  const cached = indexCache.get(tree)
  if (cached !== undefined && cached.signature === signature) return cached.index
  const index = buildIndex(tree)
  indexCache.set(tree, { signature, index })
  return index
}

const buildIndex = (tree: Tree): Index => {
  const files = new Map<string, string>()
  const dirs = new Set<string>()
  const addParents = (path: string) => {
    for (let p = parentDir(path); p !== undefined; p = parentDir(p)) dirs.add(p)
  }
  for (const [key, text] of Object.entries(tree)) {
    const path = normalizePath(key)
    if (key.endsWith('/')) {
      dirs.add(path)
    } else {
      files.set(path, text)
    }
    addParents(path)
  }
  return { files, dirs }
}

const childrenOf = (index: Index, dir: string) => {
  const prefix = dir.endsWith('/') ? dir : `${dir}/`
  const seen = new Map<string, FsEntryKind>()
  for (const f of index.files.keys()) {
    if (!f.startsWith(prefix)) continue
    const [name, ...rest] = f.slice(prefix.length).split('/')
    if (name) seen.set(name, rest.length > 0 ? 'dir' : 'file')
  }
  for (const d of index.dirs) {
    if (!d.startsWith(prefix)) continue
    const [name] = d.slice(prefix.length).split('/')
    if (name) seen.set(name, 'dir')
  }
  return [...seen].map(([name, kind]) => ({ name, kind }))
}

const newCounts = (): Counts => ({ read: 0, list: 0, exists: 0, stat: 0, reads: [] })

/** An Fs port over a tree, for io unit tests. The tree is read live, so tests may edit it. */
export const treeFs = (tree: Tree): { fs: Fs; counts: Counts } => {
  const counts = newCounts()
  const fs: Fs = {
    read: async path => {
      counts.read += 1
      const p = normalizePath(path)
      counts.reads.push(p)
      const text = indexTree(tree).files.get(p)
      if (text === undefined) throw new Error(`ENOENT: ${p}`)
      return text
    },
    list: async path => {
      counts.list += 1
      const index = indexTree(tree)
      const p = normalizePath(path)
      if (!index.dirs.has(p)) throw new Error(`ENOENT: ${p}`)
      return childrenOf(index, p)
    },
    exists: async path => {
      counts.exists += 1
      const index = indexTree(tree)
      const p = normalizePath(path)
      return index.files.has(p) || index.dirs.has(p)
    },
  }
  return { fs, counts }
}

/** A scripted answer for one process.run argv (joined with spaces), or a refusal. */
export type ProcessScript = Record<string, { exitCode?: number; stdout?: string; stderr?: string } | 'missing'>

export type Session = {
  counts: Counts
  /** Every text the plugin passed to $.ui.status, in order. */
  statuses: Array<string | undefined>
  /** Calls the plugin must never make. */
  forbidden: string[]
  last: () => string | undefined
  /** The last value the plugin wrote to astrolabe.speckit. */
  held: () => Held | undefined
  /** Lines the plugin sent to $.ui.log (its caught failures). */
  logs: string[]
  clock: MockClock
  /** Every process the plugin ran, as argv joined with spaces. */
  processes: string[]
  /** Every URL the plugin fetched. */
  fetches: string[]
  /** Every plain prompt the plugin submitted. */
  submitted: string[]
  /** Every slash command the plugin ran, as `/name`. */
  prompts: string[]
  /** Script process.run answers and http.fetch answers for a test. */
  script: { processes: ProcessScript; http: Record<string, { status: number; text: string }> }
  /** Every toast the plugin raised, in order. */
  toasts: string[]
  /** The plugin's $.store, in memory. */
  store: Map<string, unknown>
}

/**
 * Registers test hooks beneath the plugin that answer $.fs, $.session.cwd,
 * session.start, turn.complete and $.ui.status from `tree`, and record what the
 * plugin did. Register before the test's first call on $.
 */
export const installTree = (on: On, tree: Tree, cwd: string, seed: Record<string, unknown> = {}): Session => {
  const { fs: rawFs, counts } = treeFs(tree)
  // On a Windows host the engine resolves a POSIX path such as /proj/x against the
  // current drive (D:\proj\x) before a hook sees it. A tree written with POSIX roots
  // is matched by dropping that drive again.
  const isPosixTree = Object.keys(tree).every(key => key.startsWith('/'))
  const toTree = (path: string) => (isPosixTree ? normalizePath(path).replace(/^[a-z]:(?=\/)/, '') : path)
  const fs: Fs = {
    read: path => rawFs.read(toTree(path)),
    list: path => rawFs.list(toTree(path)),
    exists: path => rawFs.exists(toTree(path)),
  }
  const statuses: Array<string | undefined> = []
  const forbidden: string[] = []
  const logs: string[] = []
  const toasts: string[] = []
  const store = new Map<string, unknown>(Object.entries(seed))
  const deny = { deny: 'ENOENT' } as const
  const clock = mock.clock(on)

  on('fs.read', async ($, e) => {
    try {
      return { value: await fs.read(e.path) }
    } catch {
      return deny
    }
  })
  on('fs.list', async ($, e) => {
    try {
      const entries = await fs.list(e.path ?? cwd)
      return { value: entries.map(x => ({ ...x, size: 0, mtimeMs: 0, isLink: false })) }
    } catch {
      return deny
    }
  })
  on('fs.exists', async ($, e) => ({ value: await fs.exists(e.path) }))
  on('fs.stat', async ($, e) => {
    counts.stat += 1
    const index = indexTree(tree)
    const p = normalizePath(toTree(e.path))
    const kind = index.files.has(p) ? 'file' : index.dirs.has(p) ? 'dir' : undefined
    return kind === undefined ? deny : { value: { kind, size: 0, mtimeMs: 0, isLink: false } }
  })
  on('fs.write', ($, e) => {
    forbidden.push(`fs.write ${e.path}`)
    return deny
  })
  on('store.get', ($, e) => ({ value: store.get(e.key) }))
  on('store.set', ($, e) => {
    store.set(e.key, JSON.parse(JSON.stringify(e.value)))
    return { value: undefined }
  })
  on('store.delete', ($, e) => {
    store.delete(e.key)
    return { value: undefined }
  })
  on('store.keys', () => ({ value: [...store.keys()] }))
  const processes: string[] = []
  const fetches: string[] = []
  const prompts: string[] = []
  const submitted: string[] = []
  const script: Session['script'] = { processes: {}, http: {} }
  on('process.run', ($, e) => {
    const line = e.argv.join(' ')
    processes.push(line)
    const answer = script.processes[line]
    if (answer === undefined || answer === 'missing') return { deny: `ENOENT: ${e.argv[0]}` }
    return { value: { exitCode: answer.exitCode ?? 0, stdout: answer.stdout ?? '', stderr: answer.stderr ?? '', isStdoutTruncated: false, isStderrTruncated: false } } as never
  })
  on('http.fetch', ($, e) => {
    fetches.push(e.url)
    const answer = script.http[e.url]
    if (answer === undefined) return { deny: 'offline' }
    return { value: { status: answer.status, ok: answer.status < 400, headers: {}, text: answer.text } } as never
  })
  on('prompt.submit', ($, e) => {
    submitted.push(e.text)
    return { text: e.text } as never
  })
  on('command.run', ($, e) => {
    prompts.push(`/${e.command}`)
    return { text: 'ran' } as never
  })
  on('ui.toast', ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('env.get', ($, e) => {
    forbidden.push(`env.get ${e.name}`)
    return { value: undefined }
  })
  let held: Held | undefined
  let heldState: Held['state'] | undefined
  let heldMemo: Held['memo'] | undefined
  on('state.set', ($, e, next) => {
    if (e.plugin === 'astrolabe' && e.key === 'speckit') heldState = e.value as Held['state']
    if (e.plugin === 'astrolabe' && e.key === 'memo') heldMemo = e.value as Held['memo']
    held = heldState === undefined || heldMemo === undefined ? undefined : { state: heldState, memo: heldMemo }
    return next(e)
  })
  on('ui.log', ($, e) => {
    logs.push(e.text)
    return { value: undefined }
  })
  on('session.cwd', () => ({ value: cwd }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('ui.status', ($, e) => {
    statuses.push(e.text)
    return { value: undefined }
  })

  return { counts, statuses, forbidden, last: () => statuses.at(-1), held: () => held, logs, clock, toasts, store, processes, fetches, prompts, submitted, script }
}

/** Answers turn.complete and tool.call beneath the plugin, as the engine would. */
export const installEngine = (on: On) => {
  const commands: string[] = []
  on('command.register', ($, e) => {
    commands.push(e.name)
    return { value: undefined } as never
  })
  on('turn.complete', () => ({ text: '' }))
  on('session.measure', ($, e) => ({ changed: e.changed }) as never)
  // Agent calls can be held in flight to exercise the fan-out cap.
  const held: Array<() => void> = []
  let holdAgents = false
  on('tool.call', async ($, e) => {
    if (e.tool === 'Agent' && holdAgents) await new Promise<void>(resolve => held.push(resolve))
    return { result: { text: 'ok' } } as never
  })
  return {
    commands,
    holdAgents: () => {
      holdAgents = true
    },
    releaseAgents: () => {
      holdAgents = false
      for (const resolve of held.splice(0)) resolve()
    },
  }
}

let turn = 0
export const completeTurn = ($: { turn: { complete: (e: never) => Promise<unknown> } }) =>
  $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: `t${++turn}`, reason: 'answer' } as never)

export const startSession = ($: { session: { start: (e: never) => Promise<unknown> } }, cwd: string) =>
  $.session.start({ cwd, surface: 'terminal', isInteractive: true } as never)
