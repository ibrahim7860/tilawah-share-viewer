import { describe, it, expect } from 'vitest'
import {
  SURAH_LIST, JUZ_LIST, JUZ_TO_PAGE_MAP,
  clampPage, surahStartPage, juzStartPage, parseJumpPage, surahForPage, TOTAL_PAGES,
} from '../src/quran/nav.js'

describe('nav data integrity', () => {
  it('has all 114 surahs and 30 juz', () => {
    expect(SURAH_LIST).toHaveLength(114)
    expect(JUZ_LIST).toHaveLength(30)
    expect(Object.keys(JUZ_TO_PAGE_MAP)).toHaveLength(30)
  })

  it('every surah/juz start page is within 1..604', () => {
    for (const s of SURAH_LIST) expect(s.firstPage).toBeGreaterThanOrEqual(1)
    for (const s of SURAH_LIST) expect(s.firstPage).toBeLessThanOrEqual(TOTAL_PAGES)
    for (const n of Object.values(JUZ_TO_PAGE_MAP)) {
      expect(n).toBeGreaterThanOrEqual(1)
      expect(n).toBeLessThanOrEqual(TOTAL_PAGES)
    }
  })
})

describe('surahStartPage / juzStartPage', () => {
  it('maps known surahs to their first page', () => {
    expect(surahStartPage(1)).toBe(1)     // Al-Fatihah
    expect(surahStartPage(2)).toBe(2)     // Al-Baqarah
    expect(surahStartPage(67)).toBe(562)  // Al-Mulk
    expect(surahStartPage(114)).toBe(604) // An-Nas
  })
  it('maps known juz to their first page', () => {
    expect(juzStartPage(1)).toBe(1)
    expect(juzStartPage(30)).toBe(582)
  })
  it('returns null for out-of-range', () => {
    expect(surahStartPage(0)).toBeNull()
    expect(surahStartPage(115)).toBeNull()
    expect(juzStartPage(31)).toBeNull()
  })
})

describe('clampPage', () => {
  it('clamps below/above the valid range', () => {
    expect(clampPage(0)).toBe(1)
    expect(clampPage(-5)).toBe(1)
    expect(clampPage(605)).toBe(604)
    expect(clampPage(1000)).toBe(604)
  })
  it('passes through valid pages and floors decimals', () => {
    expect(clampPage(300)).toBe(300)
    expect(clampPage(42.9)).toBe(42)
  })
  it('falls back to 1 for non-numbers', () => {
    expect(clampPage('abc')).toBe(1)
    expect(clampPage(NaN)).toBe(1)
  })
})

describe('parseJumpPage', () => {
  it('parses and clamps numeric input', () => {
    expect(parseJumpPage('42')).toBe(42)
    expect(parseJumpPage('  604 ')).toBe(604)
    expect(parseJumpPage('9999')).toBe(604)
    expect(parseJumpPage('0')).toBe(1)
  })
  it('rejects non-numeric input', () => {
    expect(parseJumpPage('')).toBeNull()
    expect(parseJumpPage('   ')).toBeNull()
    expect(parseJumpPage('abc')).toBeNull()
    expect(parseJumpPage('12a')).toBeNull()
    expect(parseJumpPage(null)).toBeNull()
  })
})

describe('surahForPage', () => {
  it('returns the surah containing a page', () => {
    expect(surahForPage(1).number).toBe(1)
    expect(surahForPage(2).number).toBe(2)
    expect(surahForPage(49).number).toBe(2)   // still Al-Baqarah
    expect(surahForPage(50).number).toBe(3)   // Aal-e-Imran starts at 50
    expect(surahForPage(562).number).toBe(67) // Al-Mulk
    expect(surahForPage(604).number).toBe(114)
  })
})
