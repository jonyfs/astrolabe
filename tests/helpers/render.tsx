// Mounts a render site through the plugin, with a test hook beneath that stands for the
// engine's own drawing (a keyed Box for the band, the hint line as Text).
import type { On, RenderSurface } from 'claude-code'

export const SURFACES = ['terminal', 'desktop'] as const

export type Drawn = { text: string; tree: unknown; tail?: string; engineKept: boolean }

type Mounter = {
  ui: {
    mount: (target: never) => Promise<{
      find: (q: { key?: string; text?: string | RegExp; type?: string }) => Promise<{ text: string; props: Record<string, unknown> } | undefined>
      drawn: () => Promise<unknown>
      unmount: () => Promise<void>
    }>
  }
}

/** Registers the engine stand-in; call before the test's first $ call. Returns what the engine was handed. */
export const installRenderEngine = (on: On) => {
  const handed: { tail?: string; suffix?: string; message?: string | null } = {}
  on('ui.render', ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    if (e.component === 'Spinner') {
      const props = e.props as { word: string; suffix: string; message: string | null }
      handed.suffix = props.suffix
      handed.message = props.message
      return <Text>{`${props.message ?? props.word}${props.suffix}`}</Text>
    }
    if (e.component === 'PromptHint') {
      handed.tail = (e.props as { tail?: string }).tail
      return <Text>{(e.props as { hint: string }).hint}</Text>
    }
    return <Box key="engine" />
  })
  return handed
}

const bandProps = (bodyColumns: number) => ({
  hasSurvey: false,
  isWorking: false,
  maxRows: 10,
  bodyColumns,
  scroll: { bodyRows: 9, top: 0 },
})

export const drawBand = async (
  $: Mounter,
  surface: RenderSurface,
  bodyColumns = 120,
  over: Record<string, unknown> = {},
  viewport?: { columns: number; rows: number; isFullscreen?: boolean },
): Promise<Drawn> => {
  const ui = await $.ui.mount({
    plugin: 'astrolabe',
    surface,
    component: 'AbovePrompt',
    props: { ...bandProps(bodyColumns), ...over },
    ...(viewport === undefined ? {} : { viewport }),
  } as never)
  const band = await ui.find({ key: 'astrolabe-band' })
  const engine = await ui.find({ key: 'engine' })
  const tree = await ui.drawn()
  await ui.unmount()
  return { text: band?.text ?? '', tree, engineKept: engine !== undefined }
}

export const drawHint = async (
  $: Mounter,
  handed: { tail?: string },
  surface: RenderSurface,
  isDraft = false,
): Promise<string | undefined> => {
  handed.tail = undefined
  const ui = await $.ui.mount({ plugin: 'astrolabe', surface, component: 'PromptHint', props: { isDraft, isWorking: false, hint: '? for shortcuts' } } as never)
  await ui.unmount()
  return handed.tail
}

/** Mounts the Spinner and returns the suffix the plugin handed to the engine (undefined if unchanged). */
export const drawSpinner = async (
  $: Mounter,
  handed: { suffix?: string; message?: string | null },
  surface: RenderSurface,
  columns?: number,
  message: string | null = null,
): Promise<string | undefined> => {
  handed.suffix = undefined
  const target = {
    plugin: 'astrolabe',
    surface,
    component: 'Spinner',
    props: { word: 'Sauteing', message, suffix: '…', mode: 'tool-use' },
    ...(columns === undefined ? {} : { viewport: { columns, rows: 40 } }),
  }
  const ui = await $.ui.mount(target as never)
  await ui.unmount()
  return handed.suffix === '…' ? undefined : handed.suffix
}

const paneProps = (bodyColumns: number) => ({
  title: '🧭 Astrolabe',
  isFocused: true,
  bodyColumns,
  placement: 'dock',
  scroll: { bodyRows: 30, top: 0 },
})

type PaneUi = {
  find: (q: { key?: string; text?: string | RegExp }) => Promise<{ text: string } | undefined>
  press: (q: { key: string }) => Promise<unknown>
  unmount: () => Promise<void>
}

/** Mounts the pane; returns its body text and a way to press its buttons. */
export const mountPane = async ($: Mounter, surface: RenderSurface, bodyColumns = 80, rows = 30) => {
  const ui = (await $.ui.mount({
    plugin: 'astrolabe',
    surface,
    component: 'Pane',
    requestId: 'astrolabe',
    props: paneProps(bodyColumns),
    viewport: { columns: bodyColumns + 4, rows, isFullscreen: true },
  } as never)) as unknown as PaneUi
  return {
    body: async () => (await ui.find({ key: 'astrolabe-pane-body' }))?.text ?? '',
    tabs: async () => (await ui.find({ key: 'astrolabe-pane-tabs' }))?.text ?? '',
    press: (key: string) => ui.press({ key }),
    unmount: () => ui.unmount(),
  }
}

/** Answers the command and pane nouns beneath the plugin and records what it asked for. */
export const installPaneEngine = (on: On) => {
  const seen = { opened: [] as Array<{ id: string; title?: string }> }
  on('ui.open', ($, e) => {
    seen.opened.push(e as { id: string; title?: string })
    return { value: { isPlaced: true } } as never
  })
  return seen
}
