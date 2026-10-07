import { describe, expect, test } from 'claude-code/testing'

import { blank, encodeRaster, put, toSvg, toText, write } from '../../hooks/core/cells'

const decode = (b64: string): number[] => {
  const bin = atob(b64)
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0))
  return Array.from(new Uint32Array(bytes.buffer))
}

describe('cell grids (018)', () => {
  test('a blank grid, a put and a write', () => {
    const g = blank(4, 2)
    put(g, 0, 0, '█', '#ff8800')
    write(g, 1, 1, 'ok', '#00ff00')
    expect(toText(g)).toEqual(['█   ', ' ok '])
    // outside the grid is ignored, never thrown
    put(g, 9, 9, 'x')
    expect(toText(g)).toEqual(['█   ', ' ok '])
  })

  test('Raster encoding: row-major u32 triplets, the default color as bit 24', () => {
    const g = blank(2, 1)
    put(g, 0, 0, '█', '#ff8800', '#000000')
    const words = decode(encodeRaster(g))
    expect(words).toEqual([0x2588, 0xff8800, 0x000000, 0x20, 0x01000000, 0x01000000])
  })

  test('text fallback in ascii maps blocks and box drawing to plain characters', () => {
    const g = blank(5, 1)
    write(g, 0, 0, '█─│╭●')
    expect(toText(g, true)).toEqual(['#-|+*'])
  })

  test('Svg draws each run of one color as a text span, escaped', () => {
    const g = blank(3, 1)
    write(g, 0, 0, '<a', '#112233')
    const svg = toSvg(g, '#ffffff')
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('&lt;a')
    expect(svg).toContain('fill="#112233"')
    expect(svg).toContain('viewBox="0 0 ')
  })
})
