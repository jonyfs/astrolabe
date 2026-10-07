// The slice of $.fs the io layer needs. register.tsx binds it to $.fs; tests bind it
// to an in-memory tree. Keeping $ out of hooks/io makes every reader testable alone.

export type FsEntryKind = 'file' | 'dir' | 'other'

export type Fs = {
  /** The file's text; rejects when it is missing or unreadable. */
  read: (path: string) => Promise<string>
  /** A directory's entries; rejects when it is missing. */
  list: (path: string) => Promise<ReadonlyArray<{ name: string; kind: FsEntryKind; isLink?: boolean }>>
  exists: (path: string) => Promise<boolean>
}

/** What a read found: the text, or why there is none. */
export type ReadResult = { text: string } | { missing: true } | { unreadable: true }

/**
 * A read that tells a missing file from one that exists but cannot be read (permissions,
 * a lock). Never rejects.
 */
export const readResult = async (fs: Fs, path: string): Promise<ReadResult> => {
  try {
    return { text: await fs.read(path) }
  } catch {
    return (await fs.exists(path).catch(() => false)) ? { unreadable: true } : { missing: true }
  }
}

/** A read that resolves undefined instead of rejecting. */
export const readOrUndefined = (fs: Fs, path: string): Promise<string | undefined> =>
  fs.read(path).catch(() => undefined)
