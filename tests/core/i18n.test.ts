import { describe, expect, test } from 'claude-code/testing'

import { guessLang, langOf, LANGS, paneLabelWidth, t, type TextKey } from '../../hooks/core/i18n'

const KEYS: TextKey[] = ['pane.noSpeckit', 'pane.count', 'ask.hold', 'ask.extend', 'toast.moved', 'kpi.atResetValue', 'help.title', 'dash.currentStep']

describe('dictionaries (019)', () => {
  test('every language keeps every placeholder of every text', () => {
    const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort()
    for (const key of KEYS) {
      const en = placeholders(t('en', key))
      for (const lang of LANGS) expect(placeholders(t(lang, key))).toEqual(en)
    }
  })
  test('placeholders are filled', () => {
    expect(t('pt-BR', 'pane.count', { done: 9, total: 20 })).toBe('9/20 feitas')
    expect(t('es', 'ask.extend', { n: 91 })).toBe('Seguir 30 minutos más (techo 91%)')
    expect(t('fr', 'pane.more', { n: 3 })).toBe('+3 de plus')
  })
  test('the option wins, auto takes the guess, English otherwise', () => {
    expect(langOf('fr', 'pt-BR')).toBe('fr')
    expect(langOf('auto', 'pt-BR')).toBe('pt-BR')
    expect(langOf('auto', undefined)).toBe('en')
    expect(langOf(undefined, undefined)).toBe('en')
  })
})

describe('guessing the language of a prompt (019)', () => {
  test('the four languages', () => {
    expect(guessLang('crie uma aba no astrolabe que mostre os prs abertos e faça o merge')).toBe('pt-BR')
    expect(guessLang('crea una pestaña que muestre los pull requests abiertos, por favor')).toBe('es')
    expect(guessLang("ajoute un onglet avec les pull requests ouvertes et je veux aussi le statut")).toBe('fr')
    expect(guessLang('add a tab that shows the open pull requests and their CI status')).toBe('en')
  })
  test('one pane label column fits the longest Session, Dashboard and Help label in each language', () => {
    expect(LANGS.map(paneLabelWidth)).toEqual([18, 19, 18, 19])
  })
  test('too little to tell: undefined', () => {
    expect(guessLang('/astrolabe')).toBeUndefined()
    expect(guessLang('ok')).toBeUndefined()
    expect(guessLang('npm test')).toBeUndefined()
  })
})
