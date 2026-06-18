import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadPage, fontFamilyFor } from './loadPage.js'
import { getMushafConfig } from './mushaf.js'

const madani = getMushafConfig('MADINA15')
const indopak = getMushafConfig('INDOPAK13')

describe('loadPage — script-aware asset paths', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn((url) =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ url }) })
    )
  })

  it('Madani fetches /pages/p{N}.json (regression: default cfg)', async () => {
    const d = await loadPage(401) // default cfg = Madani
    expect(globalThis.fetch).toHaveBeenCalledWith('/pages/p401.json')
    expect(d.url).toBe('/pages/p401.json')
  })

  it('IndoPak fetches /pages-indopak/p{N}.json', async () => {
    const d = await loadPage(700, indopak)
    expect(globalThis.fetch).toHaveBeenCalledWith('/pages-indopak/p700.json')
    expect(d.url).toBe('/pages-indopak/p700.json')
  })

  it('throws on a non-ok response', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 404 }))
    await expect(loadPage(802, indopak)).rejects.toThrow('802 404')
  })
})

describe('fontFamilyFor', () => {
  it('Madani uses the per-page QCF family p{N} (regression)', () => {
    expect(fontFamilyFor(50, madani)).toBe('p50')
    expect(fontFamilyFor(50)).toBe('p50') // default cfg
  })
  it('IndoPak uses the single nastaleeq family for every page', () => {
    expect(fontFamilyFor(50, indopak)).toBe('indopak-nastaleeq')
    expect(fontFamilyFor(800, indopak)).toBe('indopak-nastaleeq')
  })
})
