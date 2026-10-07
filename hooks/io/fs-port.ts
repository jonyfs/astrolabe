// The slice of $.fs the io layer needs. register.tsx binds it to $.fs; tests bind it
// to an in-memory tree. Keeping $ out of hooks/io makes every reader testable alone.

export type FsEntryKind = 'file' | 'dir' | 'other'

export type Fs = {
  /** The file's text; rejects when it is missing or unreadable. */
  read: (path: string) => Promise<string>
  /** A directory's entries; rejects when it is missing. */
  list: (path: string) => Promise<ReadonlyArray<{ name: string; kind: FsEntryKind }>>
  exists: (path: string) => Promise<boolean>
}

/** A read that resolves undefined instead of rejecting. */
export const readOrUndefined = (fs: Fs, path: string): Promise<string | undefined> =>
  fs.read(path).catch(() => undefined)
