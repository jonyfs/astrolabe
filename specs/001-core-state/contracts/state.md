# Contract: `$.state` and the core functions

## `types/index.d.ts`

```ts
import type { SpeckitState, SessionMemo } from '../hooks/core/types'

declare module 'claude-code' {
  interface PluginState {
    astrolabe: { speckit: { state: SpeckitState; memo: SessionMemo } }
  }
}
```

Later features read `astrolabe.speckit` and never write it.

## Core functions (all pure)

```ts
parseFrontMatter(text: string): { track?: 'quick' | 'full'; status?: 'active' | 'done' | 'abandoned' }
parseTasks(text: string): Task[]
classifyConstitution(text: string | undefined): 'missing' | 'template' | 'ratified'
deriveFeature(files: FeatureFiles): Feature
resolveActive(snapshot: Snapshot, features: Feature[]): { active?: Active; warning?: ActiveWarning }
nextCommand(state: Omit<SpeckitState, 'nextCommand'>): string | undefined
skillHint(name: string): { step: Step } | { analyze: true } | undefined
normalizePath(path: string): string
featureDirOf(root: string, path: string): string | undefined
deriveSpeckitState(snapshot: Snapshot, memo: SessionMemo, now: number): { state: SpeckitState; memo: SessionMemo }
formatStatus(state: SpeckitState, columns?: number): string
```

## I/O functions (take an `Fs` port, never `$`)

```ts
type Fs = {
  read(path: string): Promise<string>        // rejects when missing or unreadable
  list(path: string): Promise<Array<{ name: string; kind: string }>>
  exists(path: string): Promise<boolean>
}
findRoot(fs: Fs, cwd: string): Promise<string | undefined>
readBranch(fs: Fs, root: string): Promise<string | undefined>
readSnapshot(fs: Fs, root: string, scope: 'full' | { dirs: string[] }, previous?: Record<string, FeatureFiles>): Promise<Snapshot>
```
