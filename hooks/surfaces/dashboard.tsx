// The Dashboard tab (spec 018): each chart is a cell grid, drawn as a Raster on the
// terminal, an Svg on the remote surfaces, and text where neither is there or icons are
// ascii. register.tsx passes the elements in, since the engine follows $ there only.
import type { ElementTable } from 'claude-code'

import { encodeRaster, toSvg, toText, type Grid } from '../core/cells'
import { t, type Lang } from '../core/i18n'
import type { Span } from '../core/pixels'
import type { Tokens } from '../core/theme'

type Elements = Pick<ElementTable<'mobile'>, 'Box' | 'Text'> & {
  Raster?: ElementTable<'terminal'>['Raster']
  Svg?: ElementTable<'desktop'>['Svg']
  Image?: ElementTable<'terminal'>['Image']
  Client?: ElementTable<'terminal'>['Client']
}

export type DashboardView = {
  dial: Grid
  bars?: Grid
  chart?: Grid
  /** What the chart would say, for surfaces and widths that draw none. */
  chartNote: string
  progress?: string
  kpis: ReadonlyArray<[string, string]>
  /** The usage chart as pixels, where the terminal draws pictures (024 #5). */
  chartImage?: { rgba: string; width: number; height: number; columns: number; rows: number; alt: string }
  /** The dial's frames for the animated dial (024 #6). */
  dialFrames?: Span[][][]
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
    {!ascii && el.Client !== undefined && view.dialFrames !== undefined ? (
      <el.Client key="astrolabe-dial" module="./dial-client.tsx" props={{ frames: view.dialFrames }} width={view.dial.columns} height={view.dial.rows} />
    ) : (
      chart(el, 'astrolabe-dial', view.dial, t(lang, 'dash.cycleAlt'), tokens, ascii)
    )}
    {view.progress === undefined ? null : <el.Text color={tokens.text}>{view.progress}</el.Text>}
    {view.bars === undefined ? null : <el.Text color={tokens.accent}>{t(lang, 'dash.phases')}</el.Text>}
    {view.bars === undefined ? null : chart(el, 'astrolabe-bars', view.bars, t(lang, 'dash.phases'), tokens, ascii)}
    <el.Text color={tokens.accent}>{t(lang, 'dash.usage')}</el.Text>
    {view.chart === undefined ? (
      <el.Text color={tokens.muted}>{view.chartNote}</el.Text>
    ) : !ascii && el.Image !== undefined && view.chartImage !== undefined ? (
      <el.Image
        source={{ rgba: view.chartImage.rgba, width: view.chartImage.width, height: view.chartImage.height }}
        columns={view.chartImage.columns}
        rows={view.chartImage.rows}
        alt={view.chartImage.alt}
      />
    ) : (
      chart(el, 'astrolabe-usage-chart', view.chart, view.chartNote, tokens, ascii)
    )}
    <el.Text color={tokens.accent}>{t(lang, 'dash.session')}</el.Text>
    {view.kpis.map(([label, value]) => (
      <el.Text color={tokens.text} wrap="truncate-end">{`${label.padEnd(14)}${value}`}</el.Text>
    ))}
  </el.Box>
)
