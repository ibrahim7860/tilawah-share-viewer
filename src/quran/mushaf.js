// Single source of truth for what differs between the two mushaf editions the
// viewer renders. Selected from the share owner's `mushaf_pref` (returned by
// GET /api/share/view). Mirrors the app's scriptConstants.getScriptConfig so the
// two codebases stay conceptually aligned.
//
//   MADINA15  — 15-line Madani mushaf, 604 pages, a distinct QCF glyph font per
//               page (`p{N}`) where the glyphs are pre-positioned for that page.
//   INDOPAK13 — 13-line IndoPak mushaf, 847 pages, ONE Unicode nastaleeq font for
//               every page (browser-shaped; no per-page font, no live justifier).
//
// Keep this module dependency-free (nav.js imports it for page bounds) so there
// is no import cycle.

export const MUSHAFS = {
  MADINA15: {
    id: 'MADINA15',
    totalPages: 604,
    linesPerPage: 15,
    pagesDir: '/pages',
    layoutKind: 'madani',
    fontFamilyFor: (pageNumber) => `p${pageNumber}`,
  },
  INDOPAK13: {
    id: 'INDOPAK13',
    totalPages: 847,
    linesPerPage: 13,
    pagesDir: '/pages-indopak',
    layoutKind: 'indopak',
    fontFamilyFor: () => 'indopak-nastaleeq',
  },
}

export const DEFAULT_MUSHAF = 'MADINA15'

/**
 * Resolve a `mushaf_pref` string to its config. Unknown or blank → Madani,
 * matching the backend's coalesce in ShareController.viewMeta (so a legacy or
 * misconfigured owner still renders, never crashes).
 */
export function getMushafConfig(pref) {
  return MUSHAFS[pref] || MUSHAFS[DEFAULT_MUSHAF]
}
