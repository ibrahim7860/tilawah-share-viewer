import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { parseChunk, normalizePage } from './extract-indopak.mjs'

// Golden test for the mark-alignment invariant: the generated IndoPak page JSONs
// must carry the SAME word positions/verse_keys as the app source. Marks are
// stored by (surah, ayah, startWordIndex, endWordIndex) and the owner created
// them in-app; if the extractor re-indexed positions, every IndoPak share would
// highlight the wrong word. Here we re-derive the expected page from the app
// chunk and assert the committed JSON matches byte-for-byte (per field).
//
// This is a build-time/local test (needs the app repo checked out as a sibling).
// When the app source isn't present, it skips rather than fails.

const APP_CHUNK_DIR = path.resolve('..', 'tilawah', 'src', 'data', 'indopak-13line')
const OUT_DIR = path.resolve('public', 'pages-indopak')
const hasSource = existsSync(APP_CHUNK_DIR)

// All sample pages live in chunk_1_50 so one chunk read covers them.
const SAMPLE_PAGES = [1, 3, 22, 50]

describe.skipIf(!hasSource)('extract-indopak golden positions', () => {
  const chunkPath = path.join(APP_CHUNK_DIR, 'indopakChunk_1_50.js')
  const source = parseChunk(readFileSync(chunkPath, 'utf8'))

  for (const p of SAMPLE_PAGES) {
    it(`page ${p}: generated JSON matches app source verbatim`, () => {
      const expected = normalizePage(source[p])
      const generated = JSON.parse(readFileSync(path.join(OUT_DIR, `p${p}.json`), 'utf8'))
      expect(generated).toEqual(expected)
    })

    it(`page ${p}: every word preserves position/verse_key (mark alignment)`, () => {
      const expected = normalizePage(source[p])
      const generated = JSON.parse(readFileSync(path.join(OUT_DIR, `p${p}.json`), 'utf8'))
      const flat = (pg) =>
        pg.lines.flatMap((l) => l.words.map((w) => `${w.verse_key}#${w.position}=${w.id}`))
      expect(flat(generated)).toEqual(flat(expected))
    })
  }
})

describe('extract-indopak generated output (committed assets)', () => {
  it('page 1 is the short Fatihah page with a surah banner', () => {
    const p1 = JSON.parse(readFileSync(path.join(OUT_DIR, 'p1.json'), 'utf8'))
    expect(p1.pageNumber).toBe(1)
    expect(p1.lines.some((l) => l.lineType === 'surah_name')).toBe(true)
  })

  it('positions within each ayah are 1-based and contiguous', () => {
    const p3 = JSON.parse(readFileSync(path.join(OUT_DIR, 'p3.json'), 'utf8'))
    const byAyah = new Map()
    for (const line of p3.lines) {
      for (const w of line.words) {
        if (!byAyah.has(w.verse_key)) byAyah.set(w.verse_key, [])
        byAyah.get(w.verse_key).push(w.position)
      }
    }
    for (const [, positions] of byAyah) {
      const sorted = [...positions].sort((a, b) => a - b)
      expect(sorted[0]).toBe(1)
      sorted.forEach((pos, i) => expect(pos).toBe(i + 1))
    }
  })
})
