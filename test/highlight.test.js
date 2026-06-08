import { describe, it, expect } from 'vitest'
import { HIGHLIGHT_COLORS, colorForMark, wordBackground } from '../src/quran/highlight.js'

const verse = { verse_key: '2:5', words: [
  { id: 1, position: 1, line_number: 3, text: 'a' },
  { id: 2, position: 2, line_number: 3, text: 'b' },
  { id: 3, position: 3, line_number: 3, text: 'c' },
]}
const page = { verses: [verse] }

describe('colorForMark', () => {
  it('uses the template color for a known note', () => {
    expect(colorForMark({ note: 'Tajweed' })).toBe(HIGHLIGHT_COLORS.Tajweed)
  })
  it('trims the note before matching', () => {
    expect(colorForMark({ note: '  Word ' })).toBe(HIGHLIGHT_COLORS.Word)
  })
  it('falls back to default for custom/empty notes', () => {
    expect(colorForMark({ note: 'my custom note' })).toBe(HIGHLIGHT_COLORS.default)
    expect(colorForMark({ note: null })).toBe(HIGHLIGHT_COLORS.default)
  })
})

describe('wordBackground (position parity)', () => {
  const marks = [{ surah: 2, ayah: 5, startWordIndex: 2, endWordIndex: 2, note: 'Harakah' }]
  it('highlights ONLY the word at the marked position', () => {
    expect(wordBackground(page, verse.words[0], marks)).toBeNull()
    expect(wordBackground(page, verse.words[1], marks)).toBe(HIGHLIGHT_COLORS.Harakah)
    expect(wordBackground(page, verse.words[2], marks)).toBeNull()
  })
  it('respects a multi-word range (start..end inclusive)', () => {
    const range = [{ surah: 2, ayah: 5, startWordIndex: 1, endWordIndex: 2, note: 'Word' }]
    expect(wordBackground(page, verse.words[0], range)).toBe(HIGHLIGHT_COLORS.Word)
    expect(wordBackground(page, verse.words[1], range)).toBe(HIGHLIGHT_COLORS.Word)
    expect(wordBackground(page, verse.words[2], range)).toBeNull()
  })
  it('does not bleed across surah/ayah', () => {
    const other = [{ surah: 3, ayah: 5, startWordIndex: 2, endWordIndex: 2, note: 'Harakah' }]
    expect(wordBackground(page, verse.words[1], other)).toBeNull()
  })
})
