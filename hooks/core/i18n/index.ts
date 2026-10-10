// The person-facing texts in four languages (spec 019), and a guess at the person's language
// from what they type. Texts Claude reads (refusals, resume prompts) stay in English. Pure: no $.

import { EN, type Dictionary, type TextKey } from './en'
import { ES } from './es'
import { FR } from './fr'
import { PT_BR } from './pt-br'

export type { TextKey }
export const LANGS = ['en', 'pt-BR', 'es', 'fr'] as const
export type Lang = (typeof LANGS)[number]

const DICTIONARIES: Readonly<Record<Lang, Dictionary>> = { en: EN, 'pt-BR': PT_BR, es: ES, fr: FR }

/** The text for `key` in `lang`, with each `{name}` replaced from `params`. */
export const t = (lang: Lang, key: TextKey, params: Readonly<Record<string, string | number>> = {}): string =>
  DICTIONARIES[lang][key].replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole))

const PANE_LABEL_KEYS: readonly TextKey[] = [
  'session.root', 'session.constitution', 'session.active', 'session.chosenBy', 'session.next',
  'session.running', 'session.analyzed', 'session.currentTask', 'session.otherRoots',
  'session.hooksBefore', 'session.hooksAfter', 'session.extensions', 'session.branch',
  'session.summary', 'session.advisor', 'session.review', 'session.update',
  'kpi.turns', 'kpi.toolCalls', 'kpi.drifts', 'kpi.subagents', 'kpi.context', 'kpi.session',
  'kpi.burn', 'kpi.compactions', 'kpi.waited', 'kpi.pace', 'kpi.turnsPerTask',
  'kpi.contextPerTask', 'kpi.atReset', 'kpi.slowest', 'kpi.estimate', 'kpi.weekdays',
  'kpi.weeks', 'kpi.week', 'kpi.specToDone',
  'tab.specs', 'tab.tasks', 'tab.session', 'tab.dashboard', 'tab.help', 'tab.config', 'tab.prs',
  'gate.constitution', 'gate.clarify', 'gate.checklist', 'gate.tasks', 'gate.analyze',
]

/** The shared label column in Session, Dashboard and Help, sized for the longest label. */
export const paneLabelWidth = (lang: Lang): number =>
  Math.max(
    ...PANE_LABEL_KEYS.map(key => [...t(lang, key)].length),
    ...['state', 'usage', 'subagents', 'queue', 'override', 'lift', 'pace', 'next band',
      'constitution', 'specify', 'clarify', 'plan', 'tasks', 'implement',
      'Spec Kit', 'gstack', 'Astrolabe', '5h', '7d'].map(label => [...label].length),
  )

/** The `language` option: a language, or `auto` (the guess from the person's prompts). */
export const langOf = (option: unknown, guessed: Lang | undefined): Lang =>
  option === 'en' || option === 'pt-BR' || option === 'es' || option === 'fr' ? option : (guessed ?? 'en')

const WORDS: Readonly<Record<Lang, readonly string[]>> = {
  en: ['the', 'and', 'to', 'of', 'is', 'that', 'for', 'it', 'with', 'this', 'please', 'what', 'can', 'you', 'add', 'make', 'should'],
  'pt-BR': ['que', 'não', 'para', 'com', 'uma', 'um', 'os', 'você', 'isso', 'mais', 'está', 'faça', 'crie', 'como', 'também', 'então', 'agora', 'aqui', 'pode', 'tudo', 'deve', 'ser'],
  es: ['el', 'que', 'los', 'las', 'una', 'por', 'para', 'con', 'es', 'qué', 'haz', 'crea', 'puedes', 'también', 'ahora', 'aquí', 'todo', 'pero', 'muy', 'debe'],
  fr: ['le', 'les', 'des', 'et', 'est', 'pas', 'pour', 'avec', 'dans', 'vous', 'je', 'une', 'du', 'ce', 'cette', 'fais', 'peux', 'aussi', 'maintenant', 'tout'],
}
const MARKS: Readonly<Record<Lang, RegExp>> = { en: /(?!)/, 'pt-BR': /ção|ções|ã|õ|ê/g, es: /ñ|¿|¡|ción|ciones/g, fr: /è|ç|œ|ê|à |\bqu'|\bl'|\bd'/g }

/**
 * A guess at the language a prompt is written in, from common words and marks; undefined
 * when the text says too little (a command, a path, a few words).
 */
export const guessLang = (text: string): Lang | undefined => {
  const lower = text.toLowerCase()
  const words = lower.split(/[^\p{L}']+/u).filter(w => w !== '')
  const scores = LANGS.map(lang => {
    const set = new Set(WORDS[lang])
    const hits = words.filter(w => set.has(w)).length
    const marks = (lower.match(MARKS[lang]) ?? []).length
    return { lang, score: hits + marks * 2 }
  }).sort((a, b) => b.score - a.score)
  const best = scores[0]!
  const second = scores[1]!
  return best.score >= 2 && best.score > second.score ? best.lang : undefined
}
