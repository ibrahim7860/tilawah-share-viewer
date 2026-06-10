// Subsets Amiri-Regular to exactly the glyphs the viewer renders with it —
// the 114 surah names, the "سورة" prefix, and the U+FDFD basmala ligature —
// and emits woff2. Run after changing SURAH_LIST names or banner text:
//   node scripts/subset-amiri.mjs <path-to-full-Amiri-Regular.ttf>
// (The full font lives in the app repo at tilawah/assets/fonts/.)
import { readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'
import subsetFont from 'subset-font'
import { SURAH_LIST } from '../src/quran/nav.js'

const src = process.argv[2] ?? 'public/fonts/Amiri-Regular.ttf'
const text = ['سورة', '﷽', ...SURAH_LIST.map((s) => s.name)].join('')

const input = readFileSync(src)
const out = await subsetFont(input, text, { targetFormat: 'woff2' })
writeFileSync('public/fonts/Amiri-Subset.woff2', out)
console.log(`Amiri subset: ${input.length} -> ${out.length} bytes (${text.length} chars kept)`)
