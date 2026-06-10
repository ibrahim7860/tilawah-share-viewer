/**
 * Explicit display order for the 2×2 template chip grid and the legend
 * (app parity). Must cover exactly the non-default HIGHLIGHT_COLORS keys —
 * asserted by test.
 */
export const TEMPLATES = ['Harakah', 'Word', 'Mutashabihat', 'Tajweed']

export const HIGHLIGHT_COLORS = {
  Harakah: 'rgba(125, 90, 62, 0.5)',
  Word: 'rgba(62, 125, 90, 0.5)',
  Mutashabihat: 'rgba(90, 62, 125, 0.5)',
  Tajweed: 'rgba(62, 90, 125, 0.5)',
  default: 'rgba(255, 99, 99, 0.5)',
}

/** True when a note string names one of the template colors (own keys only —
 *  notes are user/owner text, so "constructor" etc. must not hit the prototype). */
export const isTemplate = (note) => typeof note === 'string' && Object.hasOwn(HIGHLIGHT_COLORS, note)

export function colorForMark(mark) {
  const note = mark?.note?.trim()
  if (note && isTemplate(note)) return HIGHLIGHT_COLORS[note]
  return HIGHLIGHT_COLORS.default
}

/** True when a word falls inside a single mark's (surah, ayah, word-range). */
export function wordInMark(page, word, mark) {
  if (!page || !mark) return false
  const verse = page.verses.find((v) => v.words.some((w) => w.id === word.id))
  if (!verse) return false
  const [surah, ayah] = verse.verse_key.split(':').map(Number)
  return mark.surah === surah && mark.ayah === ayah &&
         word.position >= mark.startWordIndex && word.position <= mark.endWordIndex
}

/** Returns the background color for a word, or null if not highlighted. */
export function wordBackground(page, word, marks) {
  if (!page || !marks?.length) return null
  const verse = page.verses.find((v) => v.words.some((w) => w.id === word.id))
  if (!verse) return null
  const [surah, ayah] = verse.verse_key.split(':').map(Number)
  const match = marks.find(
    (m) => m.surah === surah && m.ayah === ayah &&
           word.position >= m.startWordIndex && word.position <= m.endWordIndex
  )
  return match ? colorForMark(match) : null
}
