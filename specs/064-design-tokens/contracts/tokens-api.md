# Contract: shared token modules

Every surface and adapter reaches these values only through the functions below. A second copy of any rule is a defect.

## `hooks/core/usage-ramp.ts`

```ts
export type RampLevel = 'ok' | 'warn' | 'block'
export type UsageRamp = { level: RampLevel; role: ThemeRole; chip: ChipColour; mark: '' | '▵' | '▴'; full: boolean }
export const usageRamp: (percent: number | undefined, thresholds?: { hold?: number; stop?: number }) => UsageRamp
```

Examples with default thresholds: 59 -> ok, no mark; 60 -> warn, `▵`; 79 -> warn; 80 -> block, `▴`; 100 -> block, `▴`, `full`. With `{ hold: 70 }`: 69 -> warn, 70 -> block.

## `hooks/core/duration.ts`

```ts
export const duration: (ms: number | undefined) => string       // 40s, 4m12s, 2h09m, ?
export const resetIn: (iso: string | undefined, now: number) => string   // 2h09m, Thu 18:00, ?
```

## `hooks/core/message.ts`

```ts
export const message: (kind: 'ok' | 'warn', text: string) => string  // astrolabe ✓ ..., astrolabe ▲ ...
```

## `hooks/core/keys.ts`

```ts
export type KeyVerb = { key: string; verb: string; alias?: string }
export const KEY_VERBS: readonly KeyVerb[]
export const verbOf: (key: string) => KeyVerb | undefined   // resolves aliases
```

## `hooks/core/zones.ts`

```ts
export const joinZones: (zones: readonly (readonly string[])[]) => string   // ' │ ' between zones, ' · ' inside
```

## `hooks/core/ids.ts`

```ts
export const idWidth: (ids: readonly string[], min?: number) => number
export const padId: (id: string, width: number) => string
```

## `hooks/core/phase.ts` (added)

```ts
export const PHASE_SHORT: Readonly<Record<'specify' | 'clarify' | 'plan' | 'tasks' | 'implement', string>>
export const phaseShort: (phase: string) => string
```

## `hooks/core/glyphs.ts`

```ts
export const STATE_GLYPHS: { readonly paused: '‖'; readonly elapsed: '◷'; readonly warning: '▲' }
export const EMOJI_WIDE: readonly string[]
```

## Guard tests (contract with CI)

- `theme.test.ts`: every role in `TEXT_ROLES` (`text`, `muted`, `faint`, `accent`, `done`, `warn`, `current`, `blocked`, `barFill`) reaches 4.5:1 on every flavor's base. `pending` and `barEmpty` are exempt.
- `glyphs.test.ts`: `textWidth` of each `STATE_GLYPHS` value is 1; nerd set entries are width 1; ascii set entries are printable ASCII; emoji set entries wider than 1 appear in `EMOJI_WIDE`.
- `no-literal-colour.test.ts`: no `#rrggbb` literal in `hooks/surfaces/*` or `hooks/register.tsx`.
