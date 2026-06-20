import { describe, it, expect } from 'vitest'
import {
  clampPage,
  surahStartPage,
  juzStartPage,
  surahForPage,
  parseJumpPage,
  TOTAL_PAGES,
} from './nav.js'

describe('nav — Madani (regression: default behavior must not change)', () => {
  it('clampPage bounds to [1, 604]', () => {
    expect(clampPage(700)).toBe(604)
    expect(clampPage(0)).toBe(1)
    expect(clampPage(300)).toBe(300)
    expect(clampPage('abc')).toBe(1)
    expect(TOTAL_PAGES).toBe(604)
  })
  it('surahStartPage / juzStartPage use Madani tables', () => {
    expect(surahStartPage(1)).toBe(1)
    expect(surahStartPage(12)).toBe(235) // Yusuf, Madani
    expect(surahStartPage(114)).toBe(604)
    expect(juzStartPage(2)).toBe(22)
    expect(juzStartPage(30)).toBe(582)
  })
  it('surahForPage finds the surah owning a Madani page', () => {
    expect(surahForPage(235).number).toBe(12)
    expect(surahForPage(1).number).toBe(1)
  })
  it('parseJumpPage clamps to Madani bounds', () => {
    expect(parseJumpPage('700')).toBe(604)
    expect(parseJumpPage('abc')).toBe(null)
    expect(parseJumpPage('50')).toBe(50)
  })
})

describe('nav — IndoPak (847-page numbering)', () => {
  const M = 'INDOPAK13'
  it('clampPage bounds to [1, 847]', () => {
    expect(clampPage(900, M)).toBe(847)
    expect(clampPage(700, M)).toBe(700) // valid in IndoPak, would clamp in Madani
    expect(clampPage(0, M)).toBe(1)
  })
  it('surahStartPage uses the IndoPak table', () => {
    expect(surahStartPage(1, M)).toBe(1)
    expect(surahStartPage(12, M)).toBe(327) // Yusuf, IndoPak
    expect(surahStartPage(114, M)).toBe(847)
  })
  it('juzStartPage uses the IndoPak table', () => {
    expect(juzStartPage(2, M)).toBe(28)
    expect(juzStartPage(30, M)).toBe(818)
  })
  it('surahForPage finds the surah owning an IndoPak page', () => {
    expect(surahForPage(327, M).number).toBe(12)
    expect(surahForPage(847, M).number).toBe(114)
    expect(surahForPage(1, M).number).toBe(1)
  })
  it('parseJumpPage clamps to IndoPak bounds', () => {
    expect(parseJumpPage('900', M)).toBe(847)
    expect(parseJumpPage('700', M)).toBe(700)
  })
})
