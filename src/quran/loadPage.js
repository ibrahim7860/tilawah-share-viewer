import { TOTAL_PAGES } from './nav.js'

const fontCache = new Set()
const pageCache = new Map()

export async function loadPage(pageNumber) {
  if (pageCache.has(pageNumber)) {
    // Cached JSON doesn't guarantee the font: a prefetch whose font fetch
    // failed (or a future cache-only path) could leave it missing. Ensure it
    // here — loadFont is a no-op once the family is registered — so a flip onto
    // a prefetched page never renders fallback glyphs.
    await loadFont(pageNumber)
    return pageCache.get(pageNumber)
  }
  const [data] = await Promise.all([
    fetch(`/pages/p${pageNumber}.json`).then((r) => {
      if (!r.ok) throw new Error(`page ${pageNumber} ${r.status}`)
      return r.json()
    }),
    loadFont(pageNumber),
  ])
  pageCache.set(pageNumber, data)
  return data
}

async function loadFont(pageNumber) {
  if (typeof FontFace === 'undefined' || !document.fonts) return
  const family = `p${pageNumber}`
  if (fontCache.has(family)) return
  const face = new FontFace(family, `url(/fonts/${family}.woff2)`)
  const loaded = await face.load().catch(() => null)
  if (!loaded) return // missing font degrades to a fallback; don't cache the failure
  document.fonts.add(face)
  fontCache.add(family)
}

export const fontFamilyFor = (pageNumber) => `p${pageNumber}`

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
export function prefetchAround(pageNumber, radius = 1) {
  if (typeof window === 'undefined') return
  const c = navigator.connection
  if (c && (c.saveData || /(^|\b)(slow-2g|2g)$/.test(c.effectiveType || ''))) return

  const schedule = window.requestIdleCallback
    ? (fn) => window.requestIdleCallback(fn, { timeout: 2000 })
    : (fn) => setTimeout(fn, 300)

  for (let d = 1; d <= radius; d++) {
    for (const n of [pageNumber + d, pageNumber - d]) {
      if (n >= 1 && n <= TOTAL_PAGES && !pageCache.has(n)) {
        schedule(() => { loadPage(n).catch(() => {}) })
      }
    }
  }
}
