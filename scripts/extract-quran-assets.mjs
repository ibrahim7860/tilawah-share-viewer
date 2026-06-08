import { mkdir, copyFile, writeFile, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const APP = '/Users/appleuser/CS Work/Repos/tilawah-workspace/tilawah'
const CHUNK_DIR = path.join(APP, 'src/data/quran-chunks-v2')
const FONT_SRC = path.join(APP, 'assets/fonts/v2')
const OUT_PAGES = path.resolve('public/pages')
const OUT_FONTS = path.resolve('public/fonts')

// The app's loader (quranPageLoaderV2.js) uses extensionless ESM imports that
// Node can't resolve, and the chunk .js files live under a package.json with no
// "type":"module", so a dynamic import() of them would be parsed as CommonJS and
// choke on `export const`. So we read each chunk as text and parse the object:
// every chunk is exactly `export const NAME = { "<page>": {...}, ... };`.
function parseChunk(source) {
  const start = source.indexOf('{')
  if (start === -1) throw new Error('no opening brace in chunk')
  let body = source.slice(start).trimEnd()
  if (body.endsWith(';')) body = body.slice(0, -1).trimEnd()
  return JSON.parse(body)
}

async function main() {
  await mkdir(OUT_PAGES, { recursive: true })
  await mkdir(OUT_FONTS, { recursive: true })

  // Build pageNumber -> page-data map across all chunk files.
  const chunkFiles = (await readdir(CHUNK_DIR)).filter((f) => /^quranChunk_\d+_\d+\.js$/.test(f))
  const pages = new Map()
  for (const f of chunkFiles) {
    const source = await readFile(path.join(CHUNK_DIR, f), 'utf8')
    const obj = parseChunk(source)
    for (const [pageNum, data] of Object.entries(obj)) {
      pages.set(Number(pageNum), data)
    }
  }

  for (let p = 1; p <= 604; p++) {
    const data = pages.get(p)
    if (!data) throw new Error(`Page ${p} missing from chunk data`)
    await writeFile(path.join(OUT_PAGES, `p${p}.json`), JSON.stringify(data))
  }

  const fonts = (await readdir(FONT_SRC)).filter((f) => /^p\d+\.woff2$/.test(f))
  for (const f of fonts) await copyFile(path.join(FONT_SRC, f), path.join(OUT_FONTS, f))

  console.log(`Extracted ${pages.size} pages + ${fonts.length} fonts`)
}

main().catch((e) => { console.error(e); process.exit(1) })
