// Path helpers that treat POSIX and Windows spellings alike. Pure: no $.

const DRIVE_ROOT = /^[a-z]:\/$/
const FEATURE_DIR = /^\d{3}-.+$/

/** Forward slashes, `.` and `..` resolved, no repeated or trailing slash, lowercase drive letter. */
export const normalizePath = (path: string): string => {
  let p = path.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, d: string) => `${d.toLowerCase()}:`)
  // A UNC path (\\server\share\...) keeps its leading // and its server/share as the root.
  const isUnc = /^\/\/[^/]/.test(p)
  const isAbsolute = p.startsWith('/')
  const parts: string[] = []
  for (const part of p.split('/')) {
    if (part === '' || part === '.') continue
    const last = parts.at(-1)
    const isDrive = parts.length === 1 && /^[a-z]:$/.test(last ?? '')
    const isShareRoot = isUnc && parts.length <= 2
    if (part === '..' && last !== undefined && last !== '..' && !isDrive && !isShareRoot) parts.pop()
    else if (part === '..' && (isAbsolute || isDrive)) continue
    else parts.push(part)
  }
  p = (isUnc ? '//' : isAbsolute ? '/' : '') + parts.join('/')
  if (/^[a-z]:$/.test(p)) p += '/'
  return p === '' ? '.' : p
}

export const isWindowsPath = (path: string): boolean => /^[a-z]:\//i.test(normalizePath(path))

export const isAbsolutePath = (path: string): boolean => {
  const p = normalizePath(path)
  return p.startsWith('/') || /^[a-z]:\//.test(p)
}

export const joinPath = (base: string, ...parts: string[]): string => {
  // Trim the base's trailing separator first, so joining onto `/` never makes `//` (UNC).
  const head = normalizePath(base).replace(/\/+$/, '')
  return normalizePath([head === '' ? '' : head, ...parts].join('/') || '/')
}

/** The parent directory, or undefined at a root (`/`, `c:/`). */
export const parentDir = (path: string): string | undefined => {
  const p = normalizePath(path)
  if (p === '/' || DRIVE_ROOT.test(p) || /^\/\/[^/]+(\/[^/]+)?$/.test(p)) return undefined
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

/**
 * A `file:` URL for a local path, each segment percent-encoded on its own: a folder named
 * with `#`, `?`, `%` or `)` stays part of the path instead of ending it, in a link or in
 * Markdown (security review of 044). A Windows drive letter keeps its colon.
 */
export const fileUrl = (path: string): string => {
  const segments = normalizePath(path).split('/')
  const encoded = segments.map((segment, i) =>
    i <= 1 && /^[a-z]:$/i.test(segment) ? segment : encodeURIComponent(segment).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`),
  )
  const joined = encoded.join('/')
  return `file://${joined.startsWith('/') ? '' : '/'}${joined}`
}
