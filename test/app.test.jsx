import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock the API module so no network calls happen. The factory is hoisted, so
// it must be self-contained; we read the spies back via the imported module.
vi.mock('../src/api.js', () => ({
  RevokedError: class RevokedError extends Error {},
  fetchMeta: vi.fn(() => Promise.resolve({ ownerDisplayName: 'Owner', startPage: 1, mushafPref: 'MADINA15' })),
  fetchMistakes: vi.fn(() => Promise.resolve([])),
  addMistake: vi.fn(() => Promise.resolve({})),
  updateMistake: vi.fn(() => Promise.resolve({})),
  deleteMistake: vi.fn(() => Promise.resolve({})),
}))

import { addMistake, updateMistake, deleteMistake } from '../src/api.js'

// Mock loadPage so a deterministic page renders with a single word.
const PAGE = {
  verses: [{ verse_key: '2:1', words: [{ id: 1, position: 1, line_number: 1, text: 'بِسْمِ' }] }],
}
vi.mock('../src/quran/loadPage.js', () => ({
  loadPage: vi.fn(() => Promise.resolve(PAGE)),
  fontFamilyFor: () => 'p1',
}))

import App from '../src/App.jsx'

describe('App word marking', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/#sometoken')
    addMistake.mockClear(); updateMistake.mockClear(); deleteMistake.mockClear()
  })
  afterEach(() => { vi.clearAllMocks() })

  async function renderAndOpenPopover() {
    render(<App />)
    const word = await screen.findByRole('button', { name: "Qur'an word" })
    fireEvent.click(word)
    return word
  }

  it('tapping an unmarked word + "Mark mistake" calls addMistake (POST)', async () => {
    await renderAndOpenPopover()
    const markBtn = await screen.findByRole('button', { name: 'Mark mistake' })
    fireEvent.click(markBtn)
    await waitFor(() => expect(addMistake).toHaveBeenCalledTimes(1))
    expect(updateMistake).not.toHaveBeenCalled()
  })

  it('tapping an unmarked word + a template calls updateMistake (PUT)', async () => {
    await renderAndOpenPopover()
    const tmpl = await screen.findByRole('button', { name: 'Tajweed' })
    fireEvent.click(tmpl)
    await waitFor(() => expect(updateMistake).toHaveBeenCalledTimes(1))
    expect(addMistake).not.toHaveBeenCalled()
  })
})
