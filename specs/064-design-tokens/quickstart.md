# Quickstart: validating Design Tokens

Prerequisites: Node 20 or newer, `npm install` done.

## 1. Guard tests

```sh
npx vitest run tests/core/theme.test.ts tests/core/glyphs.test.ts tests/core/no-literal-colour.test.ts
```

Expected: pass. Removing `faint` from a flavor, adding `⏸` to `STATE_GLYPHS`, or adding `'#ffffff'` to a surface makes one of them fail.

## 2. The ramp

```sh
npx vitest run tests/core/usage-ramp.test.ts
```

Expected: 59 has no mark, 60 gives `▵` in `warn`, 80 gives `▴` in `blocked`, 100 also reports `full`. The footer test shows `7d 81%▴` for the 7d window at 81% on hold.

## 3. Consistency

```sh
npx vitest run tests/core/duration.test.ts tests/core/message.test.ts tests/core/ids.test.ts tests/core/zones.test.ts tests/core/keys.test.ts
grep -rn '⏸\|⏱\|⚠' hooks/core hooks/surfaces hooks/register.tsx
```

Expected: tests pass. The grep finds only the declared emoji-set entries in `icons.ts` and the `MARKS` mapping rows that translate them.

## 4. Snapshots

```sh
npx vitest run tests/core/snapshots.test.ts
```

Expected: band, status, footer and pane snapshots match for mocha, latte, frappe, macchiato and colorblind at 80, 100, 144 and 200 columns.

## 5. Whole suite and images

```sh
npm test && npm run typecheck && npm run generate-images
```

Expected: all green; `docs/images` holds every surface in mocha and latte and one capture each in frappe, macchiato and colorblind; README references resolve.
