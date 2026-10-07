import { describe, expect, test } from 'claude-code/testing'

import { classifyConstitution } from '../../hooks/core/constitution'

describe('classifyConstitution', () => {
  test('missing file', () => {
    expect(classifyConstitution(undefined)).toBe('missing')
  })
  test('template placeholders', () => {
    expect(classifyConstitution('# [PROJECT_NAME] Constitution\n')).toBe('template')
    expect(classifyConstitution('### [PRINCIPLE_1_NAME]\n')).toBe('template')
  })
  test('ratified text, including checkbox-like and partial markers', () => {
    expect(classifyConstitution('# Astrolabe Constitution\n- [X] done\n- [P] parallel\n[NEEDS CLARIFICATION: x]')).toBe(
      'ratified',
    )
  })
})
