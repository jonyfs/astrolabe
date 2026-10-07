// The Dashboard tab (spec 018): each chart is a cell grid, drawn as a Raster on the
// terminal, an Svg on the remote surfaces, and text where neither is there or icons are
// ascii. register.tsx passes the elements in, since the engine follows $ there only.
import type { ElementTable } from 'claude-code'

import { encodeRaster, toSvg, toText, type Grid } from '../core/cells'
import { t, type Lang } from '../core/i18n'
import type { Tokens } from '../core/theme'

type Elements = Pick<ElementTable<'mobile'>, 'Box' | 'Text'> & {
  Raster?: ElementTable<'terminal'>['Raster']
  Svg?: ElementTable<'desktop'>['Svg']
}

export type DashboardView = {
  dial: Grid
  bars?: Grid
  chart?: Grid
  /** What the chart would say, for surfaces and widths that draw none. */
  chartNote: string
  progress?: string
  kpis: ReadonlyArray<[string, string]>
}

const chart = (el: Elements, key: string, grid: Grid, alt: string, tokens: Tokens, ascii: boolean) => {
  if (!ascii && el.Raster !== undefined) return <el.Raster key={key} columns={grid.columns} rows={grid.rows} cells={encodeRaster(grid)} />
  if (!ascii && el.Svg !== undefined) return <el.Svg key={key} source={toSvg(grid, tokens.text)} alt={alt} />
  return (
    <el.Box key={key} flexDirection="column">
      {toText(grid, ascii).map(row => (
        <el.Text color={tokens.text} wrap="truncate-end">
          {row.trimEnd()}
        </el.Text>
      ))}
    </el.Box>
  )
}

export const dashboardTree = (el: Elements, view: DashboardView, tokens: Tokens, ascii: boolean, lang: Lang = 'en') => (
  <el.Box key="astrolabe-dashboard" flexDirection="column">
    <el.Text color={tokens.accent}>{t(lang, 'dash.cycle')}</el.Text>
    {chart(el, 'astrolabe-dial', view.dial, t(lang, 'dash.cycleAlt'), tokens, ascii)}
    {view.progress === undefined ? null : <el.Text color={tokens.text}>{view.progress}</el.Text>}
    {view.bars === undefined ? null : <el.Text color={tokens.accent}>{t(lang, 'dash.phases')}</el.Text>}
    {view.bars === undefined ? null : chart(el, 'astrolabe-bars', view.bars, t(lang, 'dash.phases'), tokens, ascii)}
    <el.Text color={tokens.accent}>{t(lang, 'dash.usage')}</el.Text>
    {view.chart === undefined ? (
      <el.Text color={tokens.muted}>{view.chartNote}</el.Text>
    ) : (
      chart(el, 'astrolabe-usage-chart', view.chart, view.chartNote, tokens, ascii)
    )}
    <el.Text color={tokens.accent}>{t(lang, 'dash.session')}</el.Text>
    {view.kpis.map(([label, value]) => (
      <el.Text color={tokens.text} wrap="truncate-end">{`${label.padEnd(14)}${value}`}</el.Text>
    ))}
  </el.Box>
)
