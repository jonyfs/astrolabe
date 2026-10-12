import { describe, expect, test } from 'claude-code/testing'
import { footerOwnerOf, parseFooterOwner, statuslineConfigured } from '../../hooks/modules/footer-owner'

// Spec 050 T001 (#97): who owns the footer when jonyfs/statusline is installed.
describe('statuslineConfigured', () => {
  test('a statusLine command that runs jonyfs/statusline counts', () => {
    const settings = JSON.stringify({ statusLine: { type: 'command', command: 'bash ~/.claude/statusline/statusline.sh' } })
    expect(statuslineConfigured(settings)).toBe(true)
  })
  test('another statusLine command does not', () => {
    const settings = JSON.stringify({ statusLine: { type: 'command', command: 'echo hi' } })
    expect(statuslineConfigured(settings)).toBe(false)
  })
  test('no statusLine, bad JSON and no file are all false', () => {
    expect(statuslineConfigured('{}')).toBe(false)
    expect(statuslineConfigured('{nope')).toBe(false)
    expect(statuslineConfigured(undefined)).toBe(false)
  })
})

describe('parseFooterOwner', () => {
  test('reads the two picks and nothing else', () => {
    expect(parseFooterOwner('astrolabe')).toBe('astrolabe')
    expect(parseFooterOwner(' statusline ')).toBe('statusline')
    expect(parseFooterOwner('both')).toBeUndefined()
    expect(parseFooterOwner(undefined)).toBeUndefined()
  })
})

describe('footerOwnerOf', () => {
  test('a stored pick wins, and an unset one asks only while statusline is configured', () => {
    expect(footerOwnerOf('statusline', false)).toEqual({ owner: 'statusline', ask: false })
    expect(footerOwnerOf('astrolabe', true)).toEqual({ owner: 'astrolabe', ask: false })
    expect(footerOwnerOf(undefined, true)).toEqual({ owner: 'astrolabe', ask: true })
    expect(footerOwnerOf(undefined, false)).toEqual({ owner: 'astrolabe', ask: false })
  })
})
