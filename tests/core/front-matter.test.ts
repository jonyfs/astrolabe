import { describe, expect, test } from 'claude-code/testing'

import { parseFrontMatter } from '../../hooks/core/front-matter'

describe('parseFrontMatter', () => {
  test('reads track and status', () => {
    expect(parseFrontMatter('---\ntrack: quick\nstatus: done\n---\n# Spec\n')).toEqual({ track: 'quick', status: 'done' })
  })
  test('accepts quotes and extra spaces', () => {
    expect(parseFrontMatter("---\n  track :  'full'  \nstatus: \"abandoned\"\n---\n")).toEqual({
      track: 'full',
      status: 'abandoned',
    })
  })
  test('ignores unknown keys and values', () => {
    expect(parseFrontMatter('---\ntrack: huge\nstatus: shipped\nowner: me\n---\n')).toEqual({})
  })
  test('needs --- on the very first line', () => {
    expect(parseFrontMatter('\n---\nstatus: done\n---\n')).toEqual({})
    expect(parseFrontMatter('# Spec\n---\nstatus: done\n---\n')).toEqual({})
  })
  test('needs a closing --- line', () => {
    expect(parseFrontMatter('---\nstatus: done\n# no end\n')).toEqual({})
  })
  test('accepts CRLF and a trailing comment', () => {
    expect(parseFrontMatter('---\r\nstatus: active # active | done | abandoned\r\n---\r\n')).toEqual({ status: 'active' })
  })
  test('no front matter is empty', () => {
    expect(parseFrontMatter('# Spec\n')).toEqual({})
    expect(parseFrontMatter('')).toEqual({})
  })
})

describe('the front matter block the spec template emits (FR-026)', () => {
  test('parses to track full and status active', () => {
    const header = '---\ntrack: full # quick | full\nstatus: active # active | done | abandoned\n---\n\n# Feature Specification: [FEATURE NAME]\n'
    expect(parseFrontMatter(header)).toEqual({ track: 'full', status: 'active' })
  })
})
