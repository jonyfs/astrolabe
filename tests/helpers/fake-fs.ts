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

const indexTree = (tree: Tree): Index => {
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
}

/**
 * Registers test hooks beneath the plugin that answer $.fs, $.session.cwd,
 * session.start, turn.complete and $.ui.status from `tree`, and record what the
 * plugin did. Register before the test's first call on $.
 */
export const installTree = (on: On, tree: Tree, cwd: string): Session => {
  const { fs, counts } = treeFs(tree)
  const statuses: Array<string | undefined> = []
  const forbidden: string[] = []
  const logs: string[] = []
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
    const p = normalizePath(e.path)
    const kind = index.files.has(p) ? 'file' : index.dirs.has(p) ? 'dir' : undefined
    return kind === undefined ? deny : { value: { kind, size: 0, mtimeMs: 0, isLink: false } }
  })
  on('fs.write', ($, e) => {
    forbidden.push(`fs.write ${e.path}`)
    return deny
  })
  on('store.set', ($, e) => {
    forbidden.push(`store.set ${e.key}`)
    return { value: undefined }
  })
  on('env.get', ($, e) => {
    forbidden.push(`env.get ${e.name}`)
    return { value: undefined }
  })
  let held: Held | undefined
  on('state.set', ($, e, next) => {
    if (e.plugin === 'astrolabe' && e.key === 'speckit') held = e.value as Held
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

  return { counts, statuses, forbidden, last: () => statuses.at(-1), held: () => held, logs, clock }
}

/** Answers turn.complete and tool.call beneath the plugin, as the engine would. */
export const installEngine = (on: On) => {
  on('turn.complete', () => ({ text: '' }))
  on('tool.call', () => ({ result: { text: 'ok' } }) as never)
}

let turn = 0
export const completeTurn = ($: { turn: { complete: (e: never) => Promise<unknown> } }) =>
  $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: `t${++turn}`, reason: 'answer' } as never)

export const startSession = ($: { session: { start: (e: never) => Promise<unknown> } }, cwd: string) =>
  $.session.start({ cwd, surface: 'terminal', isInteractive: true } as never)
