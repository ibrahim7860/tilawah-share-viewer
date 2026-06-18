import { mkdir, copyFile, writeFile, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Sibling to extract-quran-assets.mjs (Madani). Generates the IndoPak 13-line
// page JSONs + the single nastaleeq font the share-viewer needs to render an
// INDOPAK13 owner's Qur'an. Run: `node scripts/extract-indopak.mjs` (the app
// repo must be checked out at APP).
//
// CRITICAL invariant (mark alignment): each word's `position`/`verse_key`/
// `surah`/`ayah` is copied VERBATIM from the app source. Marks are stored by
// (surah, ayah, startWordIndex, endWordIndex); the owner marked using these
// exact positions in-app, so the viewer must not re-index them. The golden test
// (extract-indopak.test.js) guards this.

const APP = '/Users/appleuser/CS Work/Repos/tilawah-workspace/tilawah'
const CHUNK_DIR = path.join(APP, 'src/data/indopak-13line')
const FONT_SRC = path.join(APP, 'assets/fonts/indopak/indopak-nastaleeq.woff2')
const OUT_PAGES = path.resolve('public/pages-indopak')
const OUT_FONTS = path.resolve('public/fonts')
const TOTAL_PAGES = 847

// Each chunk is `export const INDOPAK_CHUNK_x_y = { "<page>": {...}, ... };` —
// the object body is JSON-compatible (quoted keys, no trailing commas), so we
// slice from the first brace and JSON.parse. Same approach as the Madani
// extractor; kept local to avoid editing that working script.
export function parseChunk(source) {
  const start = source.indexOf('{')
  if (start === -1) throw new Error('no opening brace in chunk')
  let body = source.slice(start).trimEnd()
  if (body.endsWith(';')) body = body.slice(0, -1).trimEnd()
  return JSON.parse(body)
}

// Project the app's page data to exactly what the viewer renders + matches marks
// against. Preserves word identity/coordinates verbatim (see invariant above).
export function normalizePage(data) {
  return {
    pageNumber: data.pageNumber,
    lines: (data.lines || []).map((l) => ({
      lineNumber: l.lineNumber,
      lineType: l.lineType,
      isCentered: !!l.isCentered,
      surahNumber: l.surahNumber,
      words: (l.words || []).map((w) => ({
        id: w.id,
        position: w.position,
        text: w.text,
        surah: w.surah,
        ayah: w.ayah,
        verse_key: w.verse_key,
        line_number: w.line_number,
      })),
    })),
  }
}

async function main() {
  await mkdir(OUT_PAGES, { recursive: true })
  await mkdir(OUT_FONTS, { recursive: true })

  const chunkFiles = (await readdir(CHUNK_DIR)).filter((f) => /^indopakChunk_\d+_\d+\.js$/.test(f))
  if (!chunkFiles.length) throw new Error(`no IndoPak chunks found in ${CHUNK_DIR}`)
  const pages = new Map()
  for (const f of chunkFiles) {
    const source = await readFile(path.join(CHUNK_DIR, f), 'utf8')
    const obj = parseChunk(source)
    for (const [pageNum, data] of Object.entries(obj)) pages.set(Number(pageNum), data)
  }

  // Validate the full set BEFORE writing anything, so a missing page can't leave
  // public/pages-indopak half-populated (which a later build would ship as 404s).
  const missing = []
  for (let p = 1; p <= TOTAL_PAGES; p++) if (!pages.get(p)) missing.push(p)
  if (missing.length) throw new Error(`IndoPak pages missing from chunk data: ${missing.join(', ')}`)

  let written = 0
  for (let p = 1; p <= TOTAL_PAGES; p++) {
    await writeFile(path.join(OUT_PAGES, `p${p}.json`), JSON.stringify(normalizePage(pages.get(p))))
    written++
  }

  await copyFile(FONT_SRC, path.join(OUT_FONTS, 'indopak-nastaleeq.woff2'))
  console.log(`Extracted ${written} IndoPak pages + 1 font`)
}

// Only generate when run directly (`node scripts/extract-indopak.mjs`), so the
// golden test can import parseChunk/normalizePage without triggering a rebuild.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => { console.error(e); process.exit(1) })
}
