import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadPage } from '../src/quran/loadPage.js'

describe('loadPage with a failing font', () => {
  const realFetch = globalThis.fetch
  const realFontFace = globalThis.FontFace

  beforeEach(() => {
    // FontFace whose load() always rejects (font 404).
    globalThis.FontFace = class {
      constructor() {}
      load() { return Promise.reject(new Error('font 404')) }
    }
    if (!globalThis.document.fonts) globalThis.document.fonts = { add: vi.fn() }
  })

  afterEach(() => {
    globalThis.fetch = realFetch
    globalThis.FontFace = realFontFace
    vi.restoreAllMocks()
  })

  it('still resolves the page JSON when the font fails to load', async () => {
    const pageJson = { verses: [{ verse_key: '2:1', words: [{ id: 1, position: 1, line_number: 1, text: 'x' }] }] }
    // Use a page number unlikely to be cached by other tests.
    const pageNumber = 9001
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(pageJson) })
    )

    const data = await loadPage(pageNumber)
    expect(data).toEqual(pageJson)
    // The page JSON fetch was made.
    expect(globalThis.fetch).toHaveBeenCalledWith(`/pages/p${pageNumber}.json`)
  })
})
