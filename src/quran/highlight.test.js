import { describe, it, expect } from 'vitest'
import { wordVerse, wordInMark, wordBackground, HIGHLIGHT_COLORS } from './highlight.js'

// Madani page shape: words live under verses[] and carry no surah/ayah of their
// own (derived from the parent verse_key).
const madaniPage = {
  verses: [
    { verse_key: '2:5', words: [{ id: 91, position: 3 }, { id: 92, position: 4 }] },
  ],
}
// IndoPak page shape: no verses[]; each word carries surah/ayah/verse_key.
const indoPakWord = { id: 5, position: 3, surah: 2, ayah: 5, verse_key: '2:5' }
const indoPakPage = { lines: [{ words: [indoPakWord] }] }

describe('wordVerse', () => {
  it('Madani: derives [surah, ayah] from the parent verse (regression)', () => {
    expect(wordVerse(madaniPage, { id: 91, position: 3 })).toEqual([2, 5])
  })
  it('IndoPak: reads surah/ayah off the word, never touches verses[]', () => {
    expect(wordVerse(indoPakPage, indoPakWord)).toEqual([2, 5])
    // would throw if it tried indoPakPage.verses.find — proves it short-circuits
    expect(wordVerse({}, indoPakWord)).toEqual([2, 5])
  })
  it('returns null for an unlocatable word', () => {
    expect(wordVerse(madaniPage, { id: 999, position: 1 })).toBe(null)
  })
})

describe('wordInMark / wordBackground — Madani (regression)', () => {
  const mark = { surah: 2, ayah: 5, startWordIndex: 3, endWordIndex: 4, note: 'Tajweed' }
  it('matches a word inside the mark range', () => {
    expect(wordInMark(madaniPage, { id: 91, position: 3 }, mark)).toBe(true)
    expect(wordInMark(madaniPage, { id: 92, position: 4 }, mark)).toBe(true)
  })
  it('rejects a word outside the range / different ayah', () => {
    expect(wordInMark(madaniPage, { id: 91, position: 3 }, { ...mark, startWordIndex: 4 })).toBe(false)
  })
  it('wordBackground returns the template color for a match', () => {
    expect(wordBackground(madaniPage, { id: 91, position: 3 }, [mark])).toBe(HIGHLIGHT_COLORS.Tajweed)
  })
})

describe('wordInMark / wordBackground — IndoPak', () => {
  const mark = { surah: 2, ayah: 5, startWordIndex: 3, endWordIndex: 3, note: null }
  it('matches off the word-carried surah/ayah/position', () => {
    expect(wordInMark(indoPakPage, indoPakWord, mark)).toBe(true)
  })
  it('rejects a different position', () => {
    expect(wordInMark(indoPakPage, { ...indoPakWord, position: 9 }, mark)).toBe(false)
  })
  it('wordBackground returns the default (red) color for a plain mark', () => {
    expect(wordBackground(indoPakPage, indoPakWord, [mark])).toBe(HIGHLIGHT_COLORS.default)
  })
})
