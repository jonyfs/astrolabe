import { describe, expect, test } from 'claude-code/testing'

import {
  featureDirOf,
  joinPath,
  normalizePath,
  parentDir,
  relativeTo,
  specsLocation,
} from '../../hooks/core/paths'

describe('normalizePath', () => {
  test('turns backslashes into forward slashes', () => {
    expect(normalizePath('C:\\proj\\specs\\002-x\\tasks.md')).toBe('c:/proj/specs/002-x/tasks.md')
  })
  test('drops a trailing slash but keeps a root', () => {
    expect(normalizePath('/proj/specs/')).toBe('/proj/specs')
    expect(normalizePath('/')).toBe('/')
    expect(normalizePath('C:\\')).toBe('c:/')
  })
  test('collapses repeated separators and ./ segments', () => {
    expect(normalizePath('/proj//specs/./002-x')).toBe('/proj/specs/002-x')
    expect(normalizePath('./specs/002-x')).toBe('specs/002-x')
  })
  test('lowercases only the drive letter', () => {
    expect(normalizePath('D:/Work/Proj')).toBe('d:/Work/Proj')
  })
})

describe('joinPath and parentDir', () => {
  test('join with POSIX and drive roots', () => {
    expect(joinPath('/proj', 'specs', '002-x')).toBe('/proj/specs/002-x')
    expect(joinPath('/', '.specify')).toBe('/.specify')
    expect(joinPath('c:/', '.specify')).toBe('c:/.specify')
    expect(joinPath('c:/proj/', '.git')).toBe('c:/proj/.git')
  })
  test('parent of a path, undefined at the root', () => {
    expect(parentDir('/proj/sub')).toBe('/proj')
    expect(parentDir('/proj')).toBe('/')
    expect(parentDir('/')).toBeUndefined()
    expect(parentDir('c:/proj')).toBe('c:/')
    expect(parentDir('c:/')).toBeUndefined()
  })
})

describe('relativeTo', () => {
  test('absolute path under the root', () => {
    expect(relativeTo('/proj', '/proj/specs/002-x/tasks.md')).toBe('specs/002-x/tasks.md')
  })
  test('outside the root is undefined', () => {
    expect(relativeTo('/proj', '/project/specs/002-x/tasks.md')).toBeUndefined()
    expect(relativeTo('/proj', '/other/x')).toBeUndefined()
  })
  test('relative paths are taken as relative to the root', () => {
    expect(relativeTo('/proj', 'specs/002-x/spec.md')).toBe('specs/002-x/spec.md')
  })
  test('Windows roots compare case-insensitively with either separator', () => {
    expect(relativeTo('c:/Proj', 'C:\\PROJ\\specs\\002-x\\tasks.md')).toBe('specs/002-x/tasks.md')
  })
  test('POSIX roots compare case-sensitively', () => {
    expect(relativeTo('/Proj', '/proj/specs/x')).toBeUndefined()
  })
})

describe('featureDirOf and specsLocation', () => {
  test('finds the feature directory for absolute, relative and Windows paths', () => {
    expect(featureDirOf('/proj', '/proj/specs/002-x/tasks.md')).toBe('002-x')
    expect(featureDirOf('/proj', 'specs/002-x/plan.md')).toBe('002-x')
    expect(featureDirOf('c:/proj', 'C:\\proj\\specs\\002-x\\tasks.md')).toBe('002-x')
    expect(featureDirOf('/proj', '/proj/specs/002-x')).toBe('002-x')
  })
  test('is undefined outside specs/NNN-*', () => {
    expect(featureDirOf('/proj', '/proj/src/index.ts')).toBeUndefined()
    expect(featureDirOf('/proj', '/proj/specs/README.md')).toBeUndefined()
    expect(featureDirOf('/proj', '/proj/specs/02-x/spec.md')).toBeUndefined()
    expect(featureDirOf('/proj', '/elsewhere/specs/002-x/spec.md')).toBeUndefined()
  })
  test('specsLocation names the file inside the feature', () => {
    expect(specsLocation('/proj', '/proj/specs/002-x/tasks.md')).toEqual({ dir: '002-x', file: 'tasks.md' })
    expect(specsLocation('/proj', '/proj/specs/002-x/contracts/a.md')).toEqual({
      dir: '002-x',
      file: 'contracts/a.md',
    })
  })
})
