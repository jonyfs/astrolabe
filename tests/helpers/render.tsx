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
  const handed: { tail?: string } = {}
  on('ui.render', ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
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
): Promise<Drawn> => {
  const ui = await $.ui.mount({ plugin: 'astrolabe', surface, component: 'AbovePrompt', props: { ...bandProps(bodyColumns), ...over } } as never)
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
