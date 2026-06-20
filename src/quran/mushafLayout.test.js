import { describe, it, expect } from 'vitest'
import { buildIndoPakLayout, buildLayout, buildPageLayout } from './mushafLayout.js'

// A representative IndoPak page: surah banner + basmala + a full ayah line + a
// short (centered) final line. Mirrors scripts/extract-indopak.mjs output shape.
const indoPakPage = {
  pageNumber: 67,
  lines: [
    { lineNumber: 1, lineType: 'surah_name', isCentered: true, surahNumber: 3, words: [] },
    { lineNumber: 2, lineType: 'basmallah', isCentered: true, surahNumber: 3, words: [] },
    {
      lineNumber: 3, lineType: 'ayah', isCentered: false, surahNumber: 3,
      words: [
        { id: 1, position: 1, text: 'الٓمّٓ', surah: 3, ayah: 1, verse_key: '3:1', line_number: 3 },
        { id: 2, position: 1, text: 'اللّٰهُ', surah: 3, ayah: 2, verse_key: '3:2', line_number: 3 },
      ],
    },
    {
      lineNumber: 4, lineType: 'ayah', isCentered: true, surahNumber: 3,
      words: [{ id: 3, position: 2, text: 'الْقَیُّوْمُ', surah: 3, ayah: 2, verse_key: '3:2', line_number: 4 }],
    },
  ],
}

describe('buildIndoPakLayout', () => {
  it('maps explicit line types to render-line kinds (no heuristics)', () => {
    const out = buildIndoPakLayout(indoPakPage)
    expect(out.map((l) => l.kind)).toEqual(['surah_name', 'basmallah', 'ayah', 'ayah'])
  })

  it('banners + basmala are centered; ayah centering follows isCentered', () => {
    const out = buildIndoPakLayout(indoPakPage)
    expect(out[0].centered).toBe(true) // surah_name
    expect(out[1].centered).toBe(true) // basmallah
    expect(out[2].centered).toBe(false) // full ayah line
    expect(out[3].centered).toBe(true) // short final line
  })

  it('passes ayah words through verbatim and preserves lineNumber/surahNumber', () => {
    const out = buildIndoPakLayout(indoPakPage)
    expect(out[2].words).toBe(indoPakPage.lines[2].words)
    expect(out[2].lineNumber).toBe(3)
    expect(out[0].surahNumber).toBe(3)
  })

  it('empty/garbage page returns []', () => {
    expect(buildIndoPakLayout(null)).toEqual([])
    expect(buildIndoPakLayout({ lines: [] })).toEqual([])
  })
})

describe('buildLayout dispatch', () => {
  it('routes IndoPak cfg to the IndoPak builder', () => {
    const out = buildLayout(indoPakPage, 67, { layoutKind: 'indopak' })
    expect(out.map((l) => l.kind)).toEqual(['surah_name', 'basmallah', 'ayah', 'ayah'])
  })

  it('routes Madani cfg to buildPageLayout (regression: unchanged path)', () => {
    // Minimal Madani page: one ayah on line 2.
    const madaniPage = {
      verses: [
        { verse_key: '2:1', verse_number: 1, words: [{ id: 10, position: 1, line_number: 2, text: 'x' }] },
      ],
    }
    const viaDispatch = buildLayout(madaniPage, 2, { layoutKind: 'madani' })
    const direct = buildPageLayout(madaniPage, 2)
    expect(viaDispatch).toEqual(direct)
    expect(viaDispatch.some((l) => l.kind === 'ayah')).toBe(true)
  })
})
