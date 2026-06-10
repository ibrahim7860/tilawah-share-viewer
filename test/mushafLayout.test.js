import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { buildPageLayout, surahName, TOTAL_LINES } from '../src/quran/mushafLayout.js'
import { SURAH_LIST } from '../src/quran/nav.js'

// Load the REAL bundled page data from public/pages/pN.json. Under the jsdom
// test environment import.meta.url is an http:// URL, so resolve from the
// project root (vitest runs with cwd at the repo root) instead.
const loadPageData = (n) =>
  JSON.parse(readFileSync(resolve(process.cwd(), `public/pages/p${n}.json`), 'utf8'))

const layout = (n) => buildPageLayout(loadPageData(n), n)

const kinds = (lines, kind) => lines.filter((l) => l.kind === kind)
const ayahLines = (lines) => kinds(lines, 'ayah')

describe('TOTAL_LINES', () => {
  it('is the 15-line Madani grid', () => {
    expect(TOTAL_LINES).toBe(15)
  })
})

describe('surahName', () => {
  it('returns the Arabic name for surah 2 (Al-Baqarah)', () => {
    expect(surahName(2)).toBe('البقرة')
  })
  it('returns the Arabic name for surah 1 (Al-Fatihah)', () => {
    expect(typeof surahName(1)).toBe('string')
    expect(surahName(1).length).toBeGreaterThan(0)
  })
  it('falls back to the bare number for out-of-range surahs (renderer adds the prefix)', () => {
    expect(surahName(0)).toBe('0')
    expect(surahName(115)).toBe('115')
  })
})

describe('buildPageLayout — empty / malformed input', () => {
  it('returns [] for missing or empty verses', () => {
    expect(buildPageLayout(null, 1)).toEqual([])
    expect(buildPageLayout({}, 1)).toEqual([])
    expect(buildPageLayout({ verses: [] }, 1)).toEqual([])
  })
})

describe('p1 — Al-Fatihah (special page, no basmala)', () => {
  const lines = layout(1)

  it('emits exactly one surah_name line for surah 1', () => {
    const names = kinds(lines, 'surah_name')
    expect(names).toHaveLength(1)
    expect(names[0].surahNumber).toBe(1)
    expect(names[0].centered).toBe(true)
  })

  it('emits NO basmallah line (Al-Fatihah has none)', () => {
    expect(kinds(lines, 'basmallah')).toHaveLength(0)
  })

  it('has ayah lines, all belonging to surah 1', () => {
    const ayahs = ayahLines(lines)
    expect(ayahs.length).toBeGreaterThan(0)
    for (const a of ayahs) expect(a.surahNumber).toBe(1)
  })

  it('is a special page → every ayah line is centered', () => {
    for (const a of ayahLines(lines)) expect(a.centered).toBe(true)
  })
})

describe('p2 — Al-Baqarah start (surah_name + basmallah banner)', () => {
  const lines = layout(2)

  it('opens with a surah_name then a basmallah line for surah 2', () => {
    expect(lines[0].kind).toBe('surah_name')
    expect(lines[0].surahNumber).toBe(2)
    expect(lines[0].lineNumber).toBe(1)
    expect(lines[1].kind).toBe('basmallah')
    expect(lines[1].surahNumber).toBe(2)
    expect(lines[1].lineNumber).toBe(2)
  })

  it('the first ayah line carries words and begins at line 3', () => {
    const firstAyah = ayahLines(lines)[0]
    expect(firstAyah.lineNumber).toBe(3)
    expect(firstAyah.surahNumber).toBe(2)
    expect(Array.isArray(firstAyah.words)).toBe(true)
    expect(firstAyah.words.length).toBeGreaterThan(0)
  })

  it('banner (name + basmallah) appears before any ayah line', () => {
    const firstAyahIdx = lines.findIndex((l) => l.kind === 'ayah')
    expect(kinds(lines, 'surah_name')).toHaveLength(1)
    expect(kinds(lines, 'basmallah')).toHaveLength(1)
    expect(lines.findIndex((l) => l.kind === 'surah_name')).toBeLessThan(firstAyahIdx)
    expect(lines.findIndex((l) => l.kind === 'basmallah')).toBeLessThan(firstAyahIdx)
  })
})

describe('p3 — dense Al-Baqarah continuation (no banner)', () => {
  const lines = layout(3)

  it('has no surah_name or basmallah lines', () => {
    expect(kinds(lines, 'surah_name')).toHaveLength(0)
    expect(kinds(lines, 'basmallah')).toHaveLength(0)
  })

  it('is all justified (non-centered) ayah lines on a normal page', () => {
    const ayahs = ayahLines(lines)
    expect(ayahs.length).toBeGreaterThan(1)
    for (const a of ayahs) expect(a.centered).toBe(false)
  })

  it('covers the full 15-line grid (lines 1..15)', () => {
    const nums = ayahLines(lines).map((a) => a.lineNumber)
    expect(Math.min(...nums)).toBe(1)
    expect(Math.max(...nums)).toBe(15)
  })
})

describe('p50 — Aal-ʿImran start (surah_name + basmallah for surah 3)', () => {
  const lines = layout(50)

  it('opens with surah_name then basmallah for surah 3', () => {
    const names = kinds(lines, 'surah_name')
    const basmalas = kinds(lines, 'basmallah')
    expect(names).toHaveLength(1)
    expect(names[0].surahNumber).toBe(3)
    expect(basmalas).toHaveLength(1)
    expect(basmalas[0].surahNumber).toBe(3)
    expect(lines[0].kind).toBe('surah_name')
    expect(lines[1].kind).toBe('basmallah')
  })

  it('first ayah of surah 3 begins at line 3', () => {
    expect(ayahLines(lines)[0].lineNumber).toBe(3)
    expect(ayahLines(lines)[0].surahNumber).toBe(3)
  })
})

describe('p187 — At-Tawbah start (surah_name but NO basmallah)', () => {
  const lines = layout(187)

  it('emits a surah_name line for surah 9', () => {
    const names = kinds(lines, 'surah_name')
    expect(names).toHaveLength(1)
    expect(names[0].surahNumber).toBe(9)
    expect(names[0].centered).toBe(true)
  })

  it('emits NO basmallah line (At-Tawbah has none)', () => {
    expect(kinds(lines, 'basmallah')).toHaveLength(0)
  })

  it('first ayah of surah 9 follows the name on the next line', () => {
    const firstAyah = ayahLines(lines)[0]
    expect(firstAyah.surahNumber).toBe(9)
    expect(firstAyah.lineNumber).toBe(2)
  })
})

// 18 surahs open with a single reserved line: the printed mushaf carries their
// name banner onto line 15 of the PREVIOUS page and sets the basmala alone on
// line 1 of their own page (verified against all 604 bundled pages).
const CARRIED_BANNER_SURAHS = [4, 10, 22, 23, 24, 26, 27, 32, 33, 37, 38, 45, 47, 53, 60, 64, 65, 80]

describe('p76/p77 — An-Nisa carried banner (single reserved line)', () => {
  it('p76 carries the An-Nisa name banner on line 15, centered', () => {
    const lines = layout(76)
    const banner = kinds(lines, 'surah_name').find((l) => l.surahNumber === 4)
    expect(banner).toBeTruthy()
    expect(banner.lineNumber).toBe(TOTAL_LINES)
    expect(banner.centered).toBe(true)
  })

  it('p77 opens with the basmala ALONE on line 1 — no banner of its own', () => {
    const lines = layout(77)
    expect(kinds(lines, 'surah_name')).toHaveLength(0)
    const basmalas = kinds(lines, 'basmallah')
    expect(basmalas).toHaveLength(1)
    expect(basmalas[0].surahNumber).toBe(4)
    expect(basmalas[0].lineNumber).toBe(1)
    expect(ayahLines(lines)[0].lineNumber).toBe(2)
    expect(ayahLines(lines)[0].surahNumber).toBe(4)
  })
})

describe('carried-banner pattern across all 18 affected surahs', () => {
  it.each(CARRIED_BANNER_SURAHS)('surah %i: banner on firstPage-1 line 15, basmala on firstPage line 1', (n) => {
    const s = SURAH_LIST.find((x) => x.number === n)
    const prev = layout(s.firstPage - 1)
    const own = layout(s.firstPage)
    const banner = kinds(prev, 'surah_name').find((l) => l.surahNumber === n)
    expect(banner?.lineNumber).toBe(TOTAL_LINES)
    expect(kinds(own, 'surah_name').filter((l) => l.surahNumber === n)).toHaveLength(0)
    const basmala = kinds(own, 'basmallah').find((l) => l.surahNumber === n)
    expect(basmala?.lineNumber).toBe(1)
  })
})

describe('every surah gets exactly one banner somewhere', () => {
  it('emits a surah_name on firstPage or firstPage-1 for all 114 surahs', () => {
    for (const s of SURAH_LIST) {
      const own = kinds(layout(s.firstPage), 'surah_name').some((l) => l.surahNumber === s.number)
      const carried = s.firstPage > 1 &&
        kinds(layout(s.firstPage - 1), 'surah_name').some((l) => l.surahNumber === s.number)
      expect(own || carried, `surah ${s.number} (p${s.firstPage}) has no banner`).toBe(true)
      expect(own && carried, `surah ${s.number} has TWO banners`).toBe(false)
    }
  })
})

describe('p604 — last page (surahs 112, 113, 114)', () => {
  const lines = layout(604)

  it('emits THREE surah_name lines, one each for surahs 112, 113, 114', () => {
    const names = kinds(lines, 'surah_name')
    expect(names).toHaveLength(3)
    expect(names.map((n) => n.surahNumber)).toEqual([112, 113, 114])
  })

  it('each of those surahs gets its own basmallah line', () => {
    const basmalas = kinds(lines, 'basmallah')
    expect(basmalas).toHaveLength(3)
    expect(basmalas.map((b) => b.surahNumber)).toEqual([112, 113, 114])
  })

  it('the final line of each surah (112, 113, 114) is centered', () => {
    for (const surah of [112, 113, 114]) {
      const surahAyahs = ayahLines(lines).filter((a) => a.surahNumber === surah)
      expect(surahAyahs.length).toBeGreaterThan(0)
      const lastLine = surahAyahs[surahAyahs.length - 1]
      expect(lastLine.centered).toBe(true)
    }
  })

  it('is a special page (>=602) → all ayah lines centered', () => {
    for (const a of ayahLines(lines)) expect(a.centered).toBe(true)
  })
})

describe('p49 — final-line centering on a NORMAL page', () => {
  const lines = layout(49)

  it("Al-Baqarah's final line (line 15) is centered", () => {
    const lastLine = lines.find((l) => l.kind === 'ayah' && l.lineNumber === 15)
    expect(lastLine).toBeTruthy()
    expect(lastLine.surahNumber).toBe(2)
    expect(lastLine.centered).toBe(true)
  })

  it('mid-surah lines on the same (non-special) page are NOT centered', () => {
    const midLines = ayahLines(lines).filter((a) => a.lineNumber < 15)
    expect(midLines.length).toBeGreaterThan(0)
    for (const a of midLines) expect(a.centered).toBe(false)
  })
})

describe('structural invariants across many pages', () => {
  const samplePages = [1, 2, 3, 49, 50, 77, 100, 187, 300, 562, 602, 603, 604]

  it('every returned lineNumber is within 1..15', () => {
    for (const n of samplePages) {
      for (const l of layout(n)) {
        expect(l.lineNumber).toBeGreaterThanOrEqual(1)
        expect(l.lineNumber).toBeLessThanOrEqual(15)
      }
    }
  })

  it('render-lines are ordered by lineNumber ascending', () => {
    for (const n of samplePages) {
      const nums = layout(n).map((l) => l.lineNumber)
      const sorted = [...nums].sort((a, b) => a - b)
      expect(nums).toEqual(sorted)
    }
  })

  it('every line has a known kind and a centered boolean', () => {
    for (const n of samplePages) {
      for (const l of layout(n)) {
        expect(['ayah', 'surah_name', 'basmallah']).toContain(l.kind)
        expect(typeof l.centered).toBe('boolean')
      }
    }
  })

  it('ayah lines carry a non-empty words array', () => {
    for (const n of samplePages) {
      for (const a of ayahLines(layout(n))) {
        expect(Array.isArray(a.words)).toBe(true)
        expect(a.words.length).toBeGreaterThan(0)
      }
    }
  })
})
