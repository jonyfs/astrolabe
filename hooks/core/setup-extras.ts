// What the Setup tab adds to the option list (078 G): look presets, conflicts between options and
// the settings as JSON. Pure: no $.
import type { Lang, TextKey } from './i18n'
import { t } from './i18n'

export type LookPresetName = 'minimal' | 'balanced' | 'full'

/** The look options each preset sets (078 FR-075); icons, flavor and language stay as they are. */
export const LOOK_PRESETS: Readonly<Record<LookPresetName, Readonly<Record<string, string>>>> = {
  minimal: { preset: 'minimal', bandDensity: 'minimal', footerLines: '1', footerSeparator: 'none', liveRows: 'off' },
  balanced: { preset: 'compact', bandDensity: 'compact', footerLines: '1', footerSeparator: 'thin', liveRows: 'agents' },
  full: { preset: 'full', bandDensity: 'full', footerLines: '3', footerSeparator: 'solid', liveRows: 'both' },
}

/** The preset a set of values matches, if any. */
export const presetMatching = (values: Readonly<Record<string, unknown>>): LookPresetName | undefined =>
  (Object.entries(LOOK_PRESETS) as Array<[LookPresetName, Readonly<Record<string, string>>]>).find(([, set]) => Object.entries(set).every(([k, v]) => values[k] === v))?.[0]

/** Options that cancel each other, named on the row they have no effect on (078 FR-082). */
export const optionConflicts = (values: Readonly<Record<string, unknown>>, lang: Lang = 'en'): Array<{ field: string; text: string }> => {
  const out: Array<{ field: string; text: string }> = []
  const say = (field: string, key: TextKey, params: Record<string, string> = {}) => out.push({ field, text: t(lang, key, params) })
  if (values['footerIn'] === 'status' && values['footerSource'] === 'statusline') say('footerSource', 'conflict.footerSource')
  if (values['footerIn'] === 'status' && values['footerLines'] === '3') say('footerLines', 'conflict.footerLines')
  if (values['preset'] === 'minimal' && values['bandDensity'] !== undefined && values['bandDensity'] !== 'minimal') say('bandDensity', 'conflict.bandMinimal')
  if (values['accessible'] === true && values['images'] === 'on') say('images', 'conflict.accessibleImages')
  if (values['accessible'] === true && values['icons'] !== undefined && values['icons'] !== 'ascii' && values['icons'] !== 'auto') say('icons', 'conflict.accessibleIcons')
  return out
}

/** The options that differ from their value now, as JSON for another machine (078 FR-081). */
export const changedSettingsJson = (draft: Readonly<Record<string, string | number | boolean>>): string =>
  JSON.stringify(Object.fromEntries(Object.entries(draft).map(([k, v]) => [k.replace(/^astrolabe\./, ''), v])), null, 2)

/** Where an option is described (078 FR-078). */
export const OPTIONS_README = 'https://github.com/jonyfs/astrolabe#options'

/** What Enter does on a selected option (079): a boolean flips, a choice takes the next one, the rest stays. */
export const nextOptionValue = (
  row: { kind: string; options?: readonly string[] | undefined; isLocked?: boolean | undefined },
  current: string | number | boolean,
): string | number | boolean | undefined => {
  if (row.isLocked === true) return undefined
  if (row.kind === 'boolean') return current !== true
  if (row.kind === 'choice' && row.options !== undefined && row.options.length > 0) {
    const at = row.options.indexOf(String(current))
    return row.options[(at + 1) % row.options.length]
  }
  return undefined
}
