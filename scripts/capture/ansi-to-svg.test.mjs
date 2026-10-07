// node scripts/capture/ansi-to-svg.test.mjs
import assert from 'node:assert/strict'
import { parseAnsi, toSvg } from './ansi-to-svg.mjs'

const lines = parseAnsi('\x1b[38;2;166;227;161m●\x1b[0m done \x1b[1;31mred\x1b[0m\n\x1b[2mdim\x1b[22m & <tag>\n\n')
assert.equal(lines.length, 2)
assert.deepEqual(lines[0].map(r => [r.text, r.fg ?? null, r.bold]), [['●', 'rgb(166,227,161)', false], [' done ', null, false], ['red', '#f38ba8', true]])
assert.equal(lines[1][0].dim, true)
const svg = toSvg(lines, 'test')
assert.match(svg, /^<svg /)
assert.match(svg, /&amp; &lt;tag&gt;/)
assert.match(svg, /fill="rgb\(166,227,161\)"/)
console.log('ansi-to-svg: ok')
