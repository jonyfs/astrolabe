import { describe, expect, test } from 'claude-code/testing'

import { astrolabeUpdate, compareVersions, isDue, localDay, parseCliVersion, parseGstackCheck, parseSelfCheck, releaseNotesUrl, skillsUpdate, skillsVersusCli, updateLabel } from '../../hooks/core/updates'

describe('parsers', () => {
  test('gstack-update-check', () => {
    expect(parseGstackCheck('UPGRADE_AVAILABLE 1.91.32.0 1.91.33.0\n')).toEqual({ id: 'gstack', installed: '1.91.32.0', latest: '1.91.33.0' })
    expect(parseGstackCheck('')).toBeUndefined()
    expect(parseGstackCheck('UP_TO_DATE 1.91.33.0')).toBeUndefined()
  })
  test('specify self check', () => {
    expect(parseSelfCheck('Up to date: 1.1.1')).toBeUndefined()
    expect(parseSelfCheck('Update available: 1.1.1 -> 1.2.0\nRun specify self upgrade')).toEqual({ id: 'specify', installed: '1.1.1', latest: '1.2.0' })
    expect(parseSelfCheck('something odd')).toBeUndefined()
  })
  test('specify version', () => {
    expect(parseCliVersion('│     CLI Version    1.1.1      │\n│ OS ...')).toBe('1.1.1')
    expect(parseCliVersion('no version')).toBeUndefined()
  })
})

describe('comparisons', () => {
  test('compareVersions by numeric parts, any length, ignoring a v', () => {
    expect([compareVersions('1.2.0', '1.10.0'), compareVersions('v0.7.0', '0.7.0'), compareVersions('1.91.33.0', '1.91.32.9')]).toEqual([-1, 0, 1])
  })
  test('astrolabe from the latest release tag', () => {
    expect(astrolabeUpdate('0.7.0', '{"tag_name":"v0.8.0"}')).toEqual({ id: 'astrolabe', installed: '0.7.0', latest: '0.8.0' })
    expect(astrolabeUpdate('0.7.0', '{"tag_name":"v0.7.0"}')).toBeUndefined()
    expect(astrolabeUpdate('0.7.0', 'not json')).toBeUndefined()
  })
  test('project skills behind the CLI', () => {
    expect(skillsUpdate('{"version": "1.1.1"}', '1.2.0')).toEqual({ id: 'speckit-skills', installed: '1.1.1', latest: '1.2.0' })
    expect(skillsUpdate('{"version": "1.2.0"}', '1.2.0')).toBeUndefined()
    expect(skillsUpdate(undefined, '1.2.0')).toBeUndefined()
  })
})

describe('days', () => {
  test('localDay formats the local date and isDue compares days', () => {
    const noon = new Date(2026, 9, 7, 12, 0, 0).getTime()
    expect(localDay(noon)).toBe('2026-10-07')
    expect(isDue(undefined, '2026-10-07')).toBe(true)
    expect(isDue({ checkedOn: '2026-10-06', items: [] }, '2026-10-07')).toBe(true)
    expect(isDue({ checkedOn: '2026-10-07', items: [] }, '2026-10-07')).toBe(false)
  })
})

describe('labels', () => {
  test('one label per item, and the confirm label', () => {
    expect(updateLabel({ id: 'gstack', installed: '1', latest: '2' }, false)).toBe('gstack 2')
    expect(updateLabel({ id: 'speckit-skills', installed: '1', latest: '2' }, false)).toBe('Spec Kit skills 2')
    expect(updateLabel({ id: 'speckit-skills', installed: '1', latest: '2' }, true)).toBe('confirm: rewrite .claude/skills/speckit-*')
  })
})

import { bandUpdateLabel } from '../../hooks/core/updates'

describe('release notes links (054 #82)', () => {
  test('Astrolabe and Spec Kit have a page; gstack has none', () => {
    expect(releaseNotesUrl({ id: 'astrolabe', latest: 'v0.95.0' })).toBe('https://github.com/jonyfs/astrolabe/releases/tag/v0.95.0')
    expect(releaseNotesUrl({ id: 'specify', latest: '0.4.2' })).toBe('https://github.com/github/spec-kit/releases/tag/v0.4.2')
    expect(releaseNotesUrl({ id: 'speckit-skills', latest: '0.4.2' })).toBe('https://github.com/github/spec-kit/releases/tag/v0.4.2')
    expect(releaseNotesUrl({ id: 'gstack', latest: '1.2.0' })).toBeUndefined()
  })
})

describe('the skills against the CLI (054 #98)', () => {
  test('both versions and which one is behind', () => {
    expect(skillsVersusCli('{"version":"0.4.0"}', '0.4.2')).toEqual({ skills: '0.4.0', cli: '0.4.2', behind: 'skills' })
    expect(skillsVersusCli('{"version":"0.5.0"}', '0.4.2')).toEqual({ skills: '0.5.0', cli: '0.4.2', behind: 'cli' })
    expect(skillsVersusCli('{"version":"0.4.2"}', '0.4.2')?.behind).toBe('none')
    expect(skillsVersusCli(undefined, '0.4.2')).toBeUndefined()
  })
})

describe('one update button on the band (065 #19)', () => {
  test('one update keeps its name and version from 200 columns, the name from 144 (board 2)', () => {
    expect(bandUpdateLabel(['gstack 1.91.33'], 200)).toBe('⬆ gstack 1.91.33')
    expect(bandUpdateLabel(['gstack 1.91.33'], 144)).toBe('⬆ gstack')
    expect(bandUpdateLabel(['astrolabe 0.136.0…'], 150)).toBe('⬆ astrolabe')
    expect(bandUpdateLabel(['gstack 1.91.33'], 100)).toBe('⬆1')
    expect(bandUpdateLabel(['gstack 1.91.33'], 80)).toBe('⬆1')
  })
  test('two or more collapse into one button with a count', () => {
    expect(bandUpdateLabel(['gstack 1.91.33', 'specify 1.2.0'], 200)).toBe('⬆ 2')
    expect(bandUpdateLabel(['a', 'b', 'c'], 80)).toBe('⬆3')
  })
  test('nothing pending, no button', () => {
    expect(bandUpdateLabel([], 200)).toBeUndefined()
  })
})
