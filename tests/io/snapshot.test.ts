import { describe, expect, test } from 'claude-code/testing'

import { findRoot } from '../../hooks/io/root'
import { readSnapshot } from '../../hooks/io/snapshot'
import { featureJson, project, RATIFIED, spec, tasks } from '../fixtures/build'
import { scenario as forty } from '../fixtures/forty-features'
import { treeFs } from '../helpers/fake-fs'

describe('findRoot', () => {
  test('walks up to the nearest directory holding .specify/', async () => {
    const { fs } = treeFs({ '/repo/.specify/': '', '/repo/packages/app/.specify/': '', '/repo/packages/app/src/x.ts': '' })
    expect(await findRoot(fs, '/repo/packages/app/src')).toBe('/repo/packages/app')
    expect(await findRoot(fs, '/repo/packages')).toBe('/repo')
  })
  test('stops at the filesystem root', async () => {
    const { fs } = treeFs({ '/a/b/c.txt': '' })
    expect(await findRoot(fs, '/a/b')).toBeUndefined()
  })
  test('handles Windows drive paths', async () => {
    const { fs } = treeFs({ 'c:/work/proj/.specify/': '', 'c:/work/proj/sub/': '' })
    expect(await findRoot(fs, 'C:\\work\\proj\\sub')).toBe('c:/work/proj')
  })
  test('walks Windows UNC paths without climbing above the share root', async () => {
    const { fs } = treeFs({ '//server/share/repo/.specify/': '', '//server/share/repo/packages/app/': '' })
    expect(await findRoot(fs, '\\\\server\\share\\repo\\packages\\app')).toBe('//server/share/repo')
  })
})

describe('readSnapshot (full)', () => {
  const tree = project({
    constitution: RATIFIED,
    featureJson: featureJson('specs/002-b'),
    features: {
      '002-b': { spec: spec(), plan: true, tasks: tasks(1, 1) },
      '001-a': { spec: spec() },
      '010-c': {},
    },
    extra: { 'specs/README.md': '# not a feature\n', 'specs/notes/x.md': 'x', 'specs/12-short/spec.md': 'x' },
  })

  test('lists only NNN-name directories, sorted by id', async () => {
    const { fs } = treeFs(tree)
    const snap = await readSnapshot(fs, '/proj', 'full')
    expect(snap.features.map(f => f.dir)).toEqual(['001-a', '002-b', '010-c'])
  })
  test('reads spec.md and tasks.md, and checks plan.md exists', async () => {
    const { fs } = treeFs(tree)
    const snap = await readSnapshot(fs, '/proj', 'full')
    expect(snap.features[1]).toEqual({ dir: '002-b', spec: spec(), plan: true, tasks: tasks(1, 1) })
    expect(snap.features[0]).toEqual({ dir: '001-a', spec: spec(), plan: false })
    expect(snap.features[2]).toEqual({ dir: '010-c', plan: false })
  })
  test('reads the constitution and feature.json', async () => {
    const { fs } = treeFs(tree)
    const snap = await readSnapshot(fs, '/proj', 'full')
    expect(snap.root).toBe('/proj')
    expect(snap.constitution).toBe(RATIFIED)
    expect(snap.featureJson).toEqual({ kind: 'ok', dir: '002-b' })
  })
  test('a missing specs/ directory is no features, not an error', async () => {
    const { fs } = treeFs(project({ constitution: RATIFIED }))
    const snap = await readSnapshot(fs, '/proj', 'full')
    expect(snap.features).toEqual([])
    expect(snap.featureJson).toEqual({ kind: 'missing' })
  })
  test('a read that rejects for a file that is gone counts as missing', async () => {
    const { fs } = treeFs(tree)
    const gone = { ...fs, read: (p: string) => (p.endsWith('tasks.md') ? Promise.reject(new Error('ENOENT')) : fs.read(p)), exists: async (p: string) => !p.endsWith('tasks.md') && fs.exists(p) }
    const snap = await readSnapshot(gone, '/proj', 'full')
    expect(snap.features[1]?.tasks).toBeUndefined()
    expect(snap.features[1]?.unreadable).toBeUndefined()
  })
})

describe('readSnapshot: feature.json spellings', () => {
  const at = async (raw: string) => {
    const { fs } = treeFs(project({ featureJson: raw, features: { '002-b': {} } }))
    return (await readSnapshot(fs, '/proj', 'full')).featureJson
  }
  test('relative, ./ and absolute spellings name the same directory', async () => {
    expect(await at(featureJson('specs/002-b'))).toEqual({ kind: 'ok', dir: '002-b' })
    expect(await at(featureJson('./specs/002-b/'))).toEqual({ kind: 'ok', dir: '002-b' })
    expect(await at(featureJson('/proj/specs/002-b'))).toEqual({ kind: 'ok', dir: '002-b' })
    expect(await at(featureJson('specs\\002-b'))).toEqual({ kind: 'ok', dir: '002-b' })
  })
  test('a directory outside specs/NNN-* is kept as written, so it resolves as dangling', async () => {
    expect(await at(featureJson('docs/thing'))).toEqual({ kind: 'ok', dir: 'docs/thing' })
  })
  test('invalid JSON, a non-object or a non-string directory is malformed', async () => {
    expect(await at('{ not json')).toEqual({ kind: 'malformed' })
    expect(await at('[]')).toEqual({ kind: 'malformed' })
    expect(await at('{"feature_directory": 2}')).toEqual({ kind: 'malformed' })
    expect(await at('{}')).toEqual({ kind: 'malformed' })
  })
})

describe('readSnapshot (partial, FR-016)', () => {
  test('on 40 features, re-reads feature.json, constitution, the listing and only the named dirs', async () => {
    const { fs, counts } = treeFs(forty.tree)
    const full = await readSnapshot(fs, '/proj', 'full')
    const previous = Object.fromEntries(full.features.map(f => [f.dir, f]))
    counts.read = 0
    counts.exists = 0
    counts.list = 0
    counts.reads.length = 0
    const touched = ['040-feature-40', '007-feature-7']
    const snap = await readSnapshot(fs, '/proj', { dirs: touched }, previous)
    expect(snap.features.length).toBe(40)
    // the specs/ listing, and one checklists/ listing per touched feature (020b)
    expect(counts.list).toBe(3)
    // feature.json, constitution, plus spec.md and tasks.md per touched feature
    expect(counts.read).toBe(2 + 2 * touched.length)
    // plan.md per touched feature (no .git in this fixture: the branch walk is counted separately)
    const featureReads = counts.reads.filter(p => p.includes('/specs/'))
    expect(featureReads.every(p => touched.some(d => p.includes(d)))).toBe(true)
  })
  test('a feature missing from previous is read even when not named', async () => {
    const { fs } = treeFs(forty.tree)
    const snap = await readSnapshot(fs, '/proj', { dirs: [] }, {})
    expect(snap.features.every(f => f.spec !== undefined)).toBe(true)
  })
  test('an edit made outside any tool call shows up once its dir is re-read', async () => {
    const tree = { ...forty.tree }
    const { fs } = treeFs(tree)
    const full = await readSnapshot(fs, '/proj', 'full')
    const previous = Object.fromEntries(full.features.map(f => [f.dir, f]))
    tree['/proj/specs/040-feature-40/tasks.md'] = '- [X] T001 a\n'
    const stale = await readSnapshot(fs, '/proj', { dirs: [] }, previous)
    const fresh = await readSnapshot(fs, '/proj', { dirs: ['040-feature-40'] }, previous)
    expect(stale.features[39]?.tasks).not.toBe('- [X] T001 a\n')
    expect(fresh.features[39]?.tasks).toBe('- [X] T001 a\n')
  })
})

describe('readSnapshot: symlinked feature folders', () => {
  test('a feature folder listed as a link is read like a folder', async () => {
    const { fs } = treeFs(project({ features: { '001-a': { spec: spec() } } }))
    const linked = {
      ...fs,
      list: async (p: string) => {
        const entries = await fs.list(p)
        return p.endsWith('/specs') ? [...entries, { name: '002-linked', kind: 'other' as const, isLink: true }] : entries
      },
      exists: async (p: string) => (p.includes('002-linked') ? p.endsWith('002-linked') || p.endsWith('spec.md') : fs.exists(p)),
      read: async (p: string) => (p.endsWith('002-linked/spec.md') ? '# Linked\n' : fs.read(p)),
    }
    const snap = await readSnapshot(linked, '/proj', 'full')
    expect(snap.features.map(f => f.dir)).toEqual(['001-a', '002-linked'])
    expect(snap.features[1]?.spec).toBe('# Linked\n')
  })
  test('a link to nothing is ignored', async () => {
    const { fs } = treeFs(project({ features: { '001-a': { spec: spec() } } }))
    const dangling = {
      ...fs,
      list: async (p: string) => {
        const entries = await fs.list(p)
        return p.endsWith('/specs') ? [...entries, { name: '003-gone', kind: 'other' as const, isLink: true }] : entries
      },
    }
    expect((await readSnapshot(dangling, '/proj', 'full')).features.map(f => f.dir)).toEqual(['001-a'])
  })
  test('Windows-rooted feature links are read using normalized paths', async () => {
    const root = 'c:/work/proj'
    const { fs } = treeFs(project({ root, features: { '001-a': { spec: spec() } } }))
    const linked = {
      ...fs,
      list: async (p: string) => {
        const entries = await fs.list(p)
        return p === `${root}/specs` ? [...entries, { name: '002-linked', kind: 'other' as const, isLink: true }] : entries
      },
      exists: async (p: string) => (p === `${root}/specs/002-linked` ? true : fs.exists(p)),
      read: async (p: string) => (p === `${root}/specs/002-linked/spec.md` ? '# Linked on Windows\n' : fs.read(p)),
    }

    const snap = await readSnapshot(linked, 'C:\\work\\proj', 'full')
    expect(snap.root).toBe('C:\\work\\proj')
    expect(snap.features.map(f => f.dir)).toEqual(['001-a', '002-linked'])
    expect(snap.features[1]?.spec).toBe('# Linked on Windows\n')
  })
})

describe('readSnapshot: a file that exists but cannot be read (013)', () => {
  const tree = project({
    constitution: RATIFIED,
    featureJson: featureJson('specs/002-b'),
    features: { '002-b': { spec: spec(), plan: true, tasks: tasks(1, 1) } },
  })
  const failing = (fs: ReturnType<typeof treeFs>['fs'], name: string) => ({
    ...fs,
    read: (p: string) => (p.endsWith(name) ? Promise.reject(new Error('EACCES')) : fs.read(p)),
  })

  test('is marked unreadable, not missing', async () => {
    const { fs } = treeFs(tree)
    const snap = await readSnapshot(failing(fs, 'tasks.md'), '/proj', 'full')
    expect(snap.features[0]?.tasks).toBeUndefined()
    expect(snap.features[0]?.unreadable).toEqual(['tasks.md'])
    expect(snap.features[0]?.spec).toBeDefined()
  })

  test('keeps the last text read, so the phase does not go back', async () => {
    const { fs } = treeFs(tree)
    const first = await readSnapshot(fs, '/proj', 'full')
    const previous = Object.fromEntries(first.features.map(f => [f.dir, f]))
    const snap = await readSnapshot(failing(fs, 'spec.md'), '/proj', { dirs: ['002-b'] }, previous)
    expect(snap.features[0]?.spec).toBe(first.features[0]?.spec)
    expect(snap.features[0]?.unreadable).toEqual(['spec.md'])
  })

  test('a constitution that cannot be read keeps the last one', async () => {
    const { fs } = treeFs(tree)
    const snap = await readSnapshot(failing(fs, 'constitution.md'), '/proj', 'full', {}, { constitution: RATIFIED })
    expect(snap.constitution).toBe(RATIFIED)
  })

  test('a readable file clears the mark', async () => {
    const { fs } = treeFs(tree)
    const bad = await readSnapshot(failing(fs, 'tasks.md'), '/proj', 'full')
    const previous = Object.fromEntries(bad.features.map(f => [f.dir, f]))
    const snap = await readSnapshot(fs, '/proj', { dirs: ['002-b'] }, previous)
    expect(snap.features[0]?.unreadable).toBeUndefined()
  })
})

describe('quick specs keep their tasks in spec.md (021 fix)', () => {
  const quick = (status: string) => `---\ntrack: quick\nstatus: ${status}\n---\n\n# Quick spec\n\n## Tasks\n\n- [X] T001 one\n- [ ] T002 two\n- [ ] T003 three\n\n## Notes\n\n- [ ] not a task: outside the Tasks section\n`
  test('without tasks.md, the Tasks section of a quick spec is the task list', async () => {
    const { fs } = treeFs(project({ features: { '012-q': { spec: quick('active') } } }))
    const snap = await readSnapshot(fs, '/proj', 'full')
    expect(snap.features[0]?.tasks).toBe('- [X] T001 one\n- [ ] T002 two\n- [ ] T003 three\n')
  })
  test('a tasks.md wins; a full spec keeps its section to itself', async () => {
    const both = treeFs(project({ features: { '012-q': { spec: quick('active'), tasks: '- [ ] T009 real\n' } } }))
    expect((await readSnapshot(both.fs, '/proj', 'full')).features[0]?.tasks).toBe('- [ ] T009 real\n')
    const full = treeFs(project({ features: { '013-f': { spec: '# Spec\n\n## Tasks\n\n- [ ] T001 x\n' } } }))
    expect((await readSnapshot(full.fs, '/proj', 'full')).features[0]?.tasks).toBeUndefined()
  })
})
