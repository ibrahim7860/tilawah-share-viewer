// Derives the proper Madani-mushaf line layout for a page from our bundled
// page data. The page JSON gives every ayah word a `line_number` on the 15-line
// grid; the *gaps* between ayah lines are exactly where the mushaf places the
// surah-name banner and the basmala (confirmed against pages 2/50/77/187/604).
//
// Canonical rules we apply (matching how a printed Madani mushaf is set):
//   - Every ayah line is JUSTIFIED edge-to-edge, EXCEPT the final line of a
//     surah (short → centered) and the special large-type pages (1–2, 602–604).
//   - surah-name and basmala lines are centered.
//   - Surah 1 (Al-Fatihah) and 9 (At-Tawbah) have no basmala line.
//   - When a basmala surah's first ayah starts on line 2 of its page (single
//     reserved line), the printed mushaf puts the surah-name BANNER on line 15
//     of the PREVIOUS page and the basmala alone on line 1. Verified against
//     all 604 bundled pages: exactly 18 surahs (4, 10, 22, 23, 24, 26, 27, 32,
//     33, 37, 38, 45, 47, 53, 60, 64, 65, 80) follow this pattern, and in every
//     case the previous page's content ends at line 14. At-Tawbah (9, no
//     basmala) starts at line 2 with a FULL previous page → its banner stays
//     on line 1 of its own page.

import { SURAH_LIST } from './nav.js'

export const TOTAL_LINES = 15

const ayahCountOf = (n) => SURAH_LIST.find((s) => s.number === n)?.ayahCount ?? null
// Bare name only — the renderer prefixes "سورة ", so the fallback must not.
export const surahName = (n) => SURAH_LIST.find((s) => s.number === n)?.name ?? String(n)
const hasBasmala = (n) => n !== 1 && n !== 9

/**
 * @param {{verses: Array}} page  the page JSON (verses → words with line_number)
 * @param {number} pageNumber
 * @returns {Array<{kind:'ayah'|'surah_name'|'basmallah', lineNumber:number,
 *   surahNumber?:number, words?:Array, centered:boolean}>}
 *   ordered top→bottom; each entry sits on its own line of the 15-line grid.
 */
export function buildPageLayout(page, pageNumber) {
  if (!page?.verses?.length) return []

  // 1. Group words by line_number in natural reading order; track the surah and
  //    the last ayah number touching each line.
  const byLine = new Map()
  for (const v of page.verses) {
    const surah = Number(v.verse_key.split(':')[0])
    for (const w of v.words) {
      let e = byLine.get(w.line_number)
      if (!e) { e = { words: [], surah, lastAyah: v.verse_number }; byLine.set(w.line_number, e) }
      e.words.push(w)
      e.surah = surah
      e.lastAyah = v.verse_number
    }
  }
  const contentLines = [...byLine.keys()].sort((a, b) => a - b)
  if (!contentLines.length) return []
  const maxLine = contentLines[contentLines.length - 1]

  // 2. Surah starts on this page → line of their first ayah word.
  const startByLine = new Map()
  for (const v of page.verses) {
    if (v.verse_number === 1 && v.words.length) {
      startByLine.set(v.words[0].line_number, Number(v.verse_key.split(':')[0]))
    }
  }

  // 3. Which surahs END on this page → their final content line (for centering).
  const linesBySurah = new Map()
  for (const ln of contentLines) {
    const s = byLine.get(ln).surah
    if (!linesBySurah.has(s)) linesBySurah.set(s, [])
    linesBySurah.get(s).push(ln)
  }
  const finalLineOf = new Map()
  for (const [surah, lns] of linesBySurah) {
    const lastLine = Math.max(...lns)
    const total = ayahCountOf(surah)
    if (total != null && byLine.get(lastLine).lastAyah === total) finalLineOf.set(surah, lastLine)
  }

  const specialCentered = pageNumber <= 2 || pageNumber >= 602

  // 4. Walk lines 1..maxLine; emit ayah lines, and fill gaps before a surah
  //    start with its name (+ basmala) banner lines.
  const out = []
  let line = 1
  while (line <= maxLine) {
    if (byLine.has(line)) {
      const e = byLine.get(line)
      out.push({
        kind: 'ayah',
        lineNumber: line,
        surahNumber: e.surah,
        words: e.words,
        centered: specialCentered || finalLineOf.get(e.surah) === line,
      })
      line++
      continue
    }
    // gap: advance to next content line g
    let g = line
    while (g <= maxLine && !byLine.has(g)) g++
    const gapCount = g - line
    const startSurah = startByLine.get(g)
    if (startSurah != null) {
      if (hasBasmala(startSurah) && gapCount >= 2) {
        out.push({ kind: 'surah_name', lineNumber: g - 2, surahNumber: startSurah, centered: true })
        out.push({ kind: 'basmallah', lineNumber: g - 1, surahNumber: startSurah, centered: true })
      } else if (hasBasmala(startSurah)) {
        // single reserved line → the banner sits on line 15 of the PREVIOUS
        // page (emitted there, below); this line carries the basmala alone.
        out.push({ kind: 'basmallah', lineNumber: g - 1, surahNumber: startSurah, centered: true })
      } else {
        out.push({ kind: 'surah_name', lineNumber: g - 1, surahNumber: startSurah, centered: true })
      }
    }
    line = g
  }

  // 5. Carried banner: when this page's content ends one line short of the
  //    grid and the NEXT page opens a basmala surah, the printed mushaf sets
  //    that surah's name banner on this page's final line.
  if (maxLine === TOTAL_LINES - 1) {
    const next = SURAH_LIST.find((s) => s.firstPage === pageNumber + 1)
    if (next && hasBasmala(next.number)) {
      out.push({ kind: 'surah_name', lineNumber: TOTAL_LINES, surahNumber: next.number, centered: true })
    }
  }
  return out
}
