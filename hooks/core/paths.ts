// Path helpers that treat POSIX and Windows spellings alike. Pure: no $.

const DRIVE_ROOT = /^[a-z]:\/$/
const FEATURE_DIR = /^\d{3}-.+$/

/** Forward slashes, no `.` segments, no repeated or trailing slash, lowercase drive letter. */
export const normalizePath = (path: string): string => {
  let p = path.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, d: string) => `${d.toLowerCase()}:`)
  const isAbsolute = p.startsWith('/')
  const parts = p.split('/').filter((part, i) => part !== '' && !(part === '.' && (i > 0 || !isAbsolute)))
  p = (isAbsolute ? '/' : '') + parts.join('/')
  if (/^[a-z]:$/.test(p)) p += '/'
  return p === '' ? '.' : p
}

export const isWindowsPath = (path: string): boolean => /^[a-z]:\//i.test(normalizePath(path))

export const isAbsolutePath = (path: string): boolean => {
  const p = normalizePath(path)
  return p.startsWith('/') || /^[a-z]:\//.test(p)
}

export const joinPath = (base: string, ...parts: string[]): string =>
  normalizePath([base, ...parts].join('/'))

/** The parent directory, or undefined at a root (`/`, `c:/`). */
export const parentDir = (path: string): string | undefined => {
  const p = normalizePath(path)
  if (p === '/' || DRIVE_ROOT.test(p)) return undefined
  const cut = p.lastIndexOf('/')
  if (cut < 0) return undefined
  const parent = p.slice(0, cut)
  if (parent === '') return '/'
  return /^[a-z]:$/.test(parent) ? `${parent}/` : parent
}

/**
 * `path` relative to `root`, or undefined when it lies outside. A relative `path` is
 * taken as relative to the root already. Windows roots compare case-insensitively.
 */
export const relativeTo = (root: string, path: string): string | undefined => {
  const p = normalizePath(path)
  if (!isAbsolutePath(p)) return p.replace(/^\.\//, '')
  const r = normalizePath(root)
  const fold = isWindowsPath(r) ? (s: string) => s.toLowerCase() : (s: string) => s
  if (fold(p) === fold(r)) return ''
  const prefix = r.endsWith('/') ? r : `${r}/`
  return fold(p).startsWith(fold(prefix)) ? p.slice(prefix.length) : undefined
}

/** Which feature directory under `specs/` a path points into, and the file inside it. */
export const specsLocation = (root: string, path: string): { dir: string; file: string } | undefined => {
  const rel = relativeTo(root, path)
  if (rel === undefined) return undefined
  const [specs, dir, ...rest] = rel.split('/')
  if (specs === undefined || specs.toLowerCase() !== 'specs' || dir === undefined || !FEATURE_DIR.test(dir)) {
    return undefined
  }
  return { dir, file: rest.join('/') }
}

export const featureDirOf = (root: string, path: string): string | undefined => specsLocation(root, path)?.dir
