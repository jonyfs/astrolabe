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
  test('a read that rejects counts as a missing file', async () => {
    const { fs } = treeFs(tree)
    const failing = { ...fs, read: (p: string) => (p.endsWith('tasks.md') ? Promise.reject(new Error('EACCES')) : fs.read(p)) }
    const snap = await readSnapshot(failing, '/proj', 'full')
    expect(snap.features[1]?.tasks).toBeUndefined()
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
    expect(counts.list).toBe(1)
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
