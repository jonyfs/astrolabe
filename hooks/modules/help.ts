import { CHANGES, VERSION } from '../core/version'
import { SKILL_MODELS } from '../core/skill-models'
import { type PaneTab } from '../core/types'
import { footerText } from '../core/footer'
import { iconSet } from '../core/icons'
import { paneLabelWidth, t, type Lang, type TextKey } from '../core/i18n'

/** The options whose values the Help tab lists. */
export const OPTION_NAMES = ['preset', 'flavor', 'icons', 'language', 'bandDensity', 'checkUpdates', 'governUsage', 'observeUsage', 'askOnLimit', 'pullRequest', 'images', 'autoReload', 'footerIn', 'footerLines', 'footerSeparator', 'accessible', 'claudeContext', 'featureSummary', 'humanize', 'terse', 'skillModels'] as const

// /astrolabe help (025, roadmap #39): the commands, the pane's tabs and their keys, in the
// person's language (019).
export const helpFooterPreview = (name: 'nerd' | 'emoji' | 'ascii', lang: Lang): string => {
  const now = Date.UTC(2026, 0, 1)
  return `  ${name.padEnd(6)} ${footerText({
    speckit: () => '◆ 002 · implement 45%',
    readings: [{ kind: 'five_hour', percentUsed: 42, resetsAt: new Date(now + 2 * 3_600_000).toISOString() }],
    context: { percent: 43 },
    model: 'claude-sonnet-4-5',
    git: { branch: 'main', ahead: 1, behind: 0, changed: 2, conflicts: 0 },
    startedAt: now - 60_000,
    now,
    icons: iconSet(name),
    columns: 200,
    lang,
  })}`
}

export const buildHelp = (lang: Lang, optionsSeen: Readonly<Record<string, unknown>>, health: readonly string[] = []): string => {
  const labelWidth = paneLabelWidth(lang)
  return [
    t(lang, 'help.title'),
    // What this version changed (048 #80).
    t(lang, 'help.changes', { version: VERSION, changes: CHANGES }),
    t(lang, 'help.block.commands'),
    `  /astrolabe                  ${t(lang, 'help.open')}`,
    `  /astrolabe help             ${t(lang, 'help.help')}`,
    `  /astrolabe next             ${t(lang, 'help.next')}`,
    `  /astrolabe status           ${t(lang, 'help.status')}`,
    `  /astrolabe ask <question>   ${t(lang, 'help.ask')}`,
    `  /astrolabe root <folder>    ${t(lang, 'help.root')}`,
    `  /astrolabe allow <90-99> <30m-12h>   ${t(lang, 'help.allow')}`,
    `  /astrolabe revoke           ${t(lang, 'help.revoke')}`,
    `  /astrolabe run <id>         ${t(lang, 'help.run')}`,
    `  /astrolabe doctor           ${t(lang, 'help.doctor')}`,
    `  /astrolabe priority <id> <high|normal|low>   ${t(lang, 'help.priority')}`,
    `  /astrolabe review [id]      ${t(lang, 'help.review')}`,
    `  /astrolabe advisor [id]     ${t(lang, 'help.advisor')}`,
    `  /astrolabe config reset     ${t(lang, 'help.configReset')}`,
    `  /astrolabe worktrees        ${t(lang, 'help.worktrees')}`,
    `  /astrolabe recap [id]       ${t(lang, 'help.recap')}`,
    `  /astrolabe kpis             ${t(lang, 'help.kpis')}`,
    `  /astrolabe focus [on|off]   ${t(lang, 'help.focus')}`,
    t(lang, 'help.block.options'),
    // Each option with its value now (048 #75).
    `  ${t(lang, 'help.options')}: ${OPTION_NAMES.map(name => `${name}=${optionsSeen[name] === undefined ? 'default' : String(optionsSeen[name])}`).join(', ')}.`,
    t(lang, 'help.block.keys'),
    `  ${t(lang, 'help.tabs')}`,
    `  1 ${t(lang, 'tab.specs').padEnd(labelWidth)} ${t(lang, 'help.specs')}`,
    `  2 ${t(lang, 'tab.tasks').padEnd(labelWidth)} ${t(lang, 'help.tasksTab')}`,
    `  3 ${t(lang, 'tab.session').padEnd(labelWidth)} ${t(lang, 'help.sessionTab')}`,
    `  4 ${t(lang, 'tab.dashboard').padEnd(labelWidth)} ${t(lang, 'help.dashboardTab')}`,
    `  5 ${t(lang, 'tab.help').padEnd(labelWidth)} ${t(lang, 'help.helpTab')}`,
    `  6 ${t(lang, 'tab.config').padEnd(labelWidth)} ${t(lang, 'help.configTab')}`,
    `  7 ${t(lang, 'tab.prs').padEnd(labelWidth)} ${t(lang, 'help.prsTab')}`,
    `  ${t(lang, 'help.keys')}`,
    t(lang, 'help.block.models'),
    `  ${t(lang, 'help.models')}`,
    ...Object.entries(SKILL_MODELS).map(([skill, m]) => `  ${skill.padEnd(22)} ${m.model.replace(/^claude-/, '').padEnd(12)} ${m.effort.padEnd(7)} ${m.why}`),
    t(lang, 'help.marks'),
    `  ${t(lang, 'help.footer')}`,
    ...t(lang, 'help.marksList').split('\n').map(line => `  ${line}`),
    t(lang, 'help.block.footer'),
    ...(['nerd', 'emoji', 'ascii'] as const).map(name => helpFooterPreview(name, lang)),
    t(lang, 'help.glossary'),
    ...(['constitution', 'specify', 'clarify', 'plan', 'tasks', 'implement'] as const).map(step => `  ${step.padEnd(labelWidth)} ${t(lang, `card.${step}`)}`),
    // The gates row under the active feature, each one explained (054 #61).
    t(lang, 'help.gates'),
    ...(['constitution', 'clarify', 'checklist', 'tasks', 'analyze'] as const).map(gate => `  ${t(lang, `gate.${gate}`).padEnd(labelWidth)} ${t(lang, `help.gate.${gate}`)}`),
    // What doctor found (052 #42): read when the tab opens, never on the draw path.
    t(lang, 'help.block.health'),
    ...(health.length === 0 ? ['  …'] : health),
    // Where to read more (054 #81): each line ends with its link, which the Help tab makes clickable.
    t(lang, 'help.docs'),
    ...DOC_LINKS.map(d => `  ${d.name.padEnd(labelWidth)} ${d.url}`),
  ].join('\n')
}

export const DOC_LINKS = [
  { name: 'Spec Kit', url: 'https://github.github.com/spec-kit/' },
  { name: 'gstack', url: 'https://github.com/garrytan/gstack' },
  { name: 'Astrolabe', url: 'https://github.com/jonyfs/astrolabe#readme' },
] as const

export const ABOUT: Readonly<Record<PaneTab, TextKey>> = {
  specs: 'help.specs',
  tasks: 'help.tasksTab',
  session: 'help.sessionTab',
  dashboard: 'help.dashboardTab',
  help: 'help.helpTab',
  config: 'help.configTab',
  prs: 'help.prsTab',
}

// The help text built once per language and option set, not on every render (054 #2).
export let helpCache: { key: string; text: string } | undefined

export const helpText = (lang: Lang, optionsSeen: Readonly<Record<string, unknown>>, health: readonly string[] = []): string => {
  const key = `${lang}|${JSON.stringify(optionsSeen)}|${health.join('\n')}`
  if (helpCache?.key !== key) helpCache = { key, text: buildHelp(lang, optionsSeen, health) }
  return helpCache.text
}
