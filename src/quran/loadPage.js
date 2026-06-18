import { getMushafConfig, DEFAULT_MUSHAF } from './mushaf.js'

// Per-mushaf asset loading. `cfg` (quran/mushaf.js) decides the page dir and the
// font family/url:
//   Madani  — /pages/p{N}.json + a distinct /fonts/p{N}.woff2 per page.
//   IndoPak — /pages-indopak/p{N}.json + ONE /fonts/indopak-nastaleeq.woff2 for
//             every page (so the font loads once for the whole session).
// The font URL is `/fonts/${family}.woff2` in both editions, since the Madani
// family IS `p{N}` and the IndoPak family IS `indopak-nastaleeq`.
//
// cfg defaults to Madani so callers that predate the mushaf split keep working.

const DEFAULT_CFG = getMushafConfig(DEFAULT_MUSHAF)

const fontCache = new Set()
// Keyed by `${mushafId}:${pageNumber}` so the two editions never collide (a
// session is single-mushaf, but keying by id keeps it correct regardless).
const pageCache = new Map()
const pageKey = (cfg, n) => `${cfg.id}:${n}`

export async function loadPage(pageNumber, cfg = DEFAULT_CFG) {
  const key = pageKey(cfg, pageNumber)
  if (pageCache.has(key)) {
    // Cached JSON doesn't guarantee the font: a prefetch whose font fetch
    // failed (or a future cache-only path) could leave it missing. Ensure it
    // here — loadFont is a no-op once the family is registered — so a flip onto
    // a prefetched page never renders fallback glyphs.
    await loadFont(cfg, pageNumber)
    return pageCache.get(key)
  }
  const [data] = await Promise.all([
    fetch(`${cfg.pagesDir}/p${pageNumber}.json`).then((r) => {
      if (!r.ok) throw new Error(`page ${pageNumber} ${r.status}`)
      return r.json()
    }),
    loadFont(cfg, pageNumber),
  ])
  pageCache.set(key, data)
  return data
}

async function loadFont(cfg, pageNumber) {
  if (typeof FontFace === 'undefined' || !document.fonts) return
  const family = cfg.fontFamilyFor(pageNumber)
  if (fontCache.has(family)) return
  const face = new FontFace(family, `url(/fonts/${family}.woff2)`)
  const loaded = await face.load().catch(() => null)
  if (!loaded) return // missing font degrades to a fallback; don't cache the failure
  document.fonts.add(face)
  fontCache.add(family)
}

export const fontFamilyFor = (pageNumber, cfg = DEFAULT_CFG) => cfg.fontFamilyFor(pageNumber)

/**
 * Warm the cache for the pages a reader is most likely to flip to next (±radius
 * around `pageNumber`), so a deployed flip hits font+JSON already in cache and
 * renders instantly — the way it already does on a local disk. loadPage caches
 * the JSON and registers the font in document.fonts, so a later real flip onto a
 * prefetched page resolves with no network wait.
 *
 * Runs during browser idle time (never competing with the current page's paint
 * or the user's interactions) and backs off on metered/slow connections, where
 * silently pulling ~150KB/page would cost the user data for pages they may not
 * reach. Fully fire-and-forget: failures are swallowed (a failed prefetch just
 * means the real flip pays the fetch, exactly as before).
 */
export function prefetchAround(pageNumber, cfg = DEFAULT_CFG, radius = 1) {
  if (typeof window === 'undefined') return
  const c = navigator.connection
  if (c && (c.saveData || /(^|\b)(slow-2g|2g)$/.test(c.effectiveType || ''))) return

  const schedule = window.requestIdleCallback
    ? (fn) => window.requestIdleCallback(fn, { timeout: 2000 })
    : (fn) => setTimeout(fn, 300)

  for (let d = 1; d <= radius; d++) {
    for (const n of [pageNumber + d, pageNumber - d]) {
      if (n >= 1 && n <= cfg.totalPages && !pageCache.has(pageKey(cfg, n))) {
        schedule(() => { loadPage(n, cfg).catch(() => {}) })
      }
    }
  }
}
