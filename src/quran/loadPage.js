const fontCache = new Set()
const pageCache = new Map()

export async function loadPage(pageNumber) {
  if (pageCache.has(pageNumber)) return pageCache.get(pageNumber)
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
