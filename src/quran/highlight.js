export const HIGHLIGHT_COLORS = {
  Harakah: 'rgba(125, 90, 62, 0.5)',
  Word: 'rgba(62, 125, 90, 0.5)',
  Mutashabihat: 'rgba(90, 62, 125, 0.5)',
  Tajweed: 'rgba(62, 90, 125, 0.5)',
  default: 'rgba(255, 99, 99, 0.5)',
}

export function colorForMark(mark) {
  const note = mark?.note?.trim()
  if (note && HIGHLIGHT_COLORS[note]) return HIGHLIGHT_COLORS[note]
  return HIGHLIGHT_COLORS.default
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
