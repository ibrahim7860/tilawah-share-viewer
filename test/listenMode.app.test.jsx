import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../src/api.js', () => ({
  RevokedError: class RevokedError extends Error {},
  fetchMeta: vi.fn(() => Promise.resolve({ ownerDisplayName: 'Owner', startPage: 3, mushafPref: 'MADINA15' })),
  fetchMistakes: vi.fn(() => Promise.resolve([])),
  addMistake: vi.fn(() => Promise.resolve({})),
  updateMistake: vi.fn(() => Promise.resolve({})),
  deleteMistake: vi.fn(() => Promise.resolve({})),
  reportActivity: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('../src/audio.js', () => ({
  fetchReciters: vi.fn(() => Promise.resolve({ reciters: [{ id: 7, name: 'Mishary Rashid Alafasy', style: 'Murattal' }], defaultReciterId: 7 })),
  fetchAyahsAudio: vi.fn(() => Promise.resolve({ reciterId: 7, ayahs: [] })),
}))

const PAGE = { verses: [{ verse_key: '2:1', words: [{ id: 1, position: 1, line_number: 1, text: 'بِسْمِ' }] }] }
vi.mock('../src/quran/loadPage.js', () => ({
  loadPage: vi.fn(() => Promise.resolve(PAGE)),
  fontFamilyFor: () => 'p1',
  prefetchAround: vi.fn(),
}))

import App from '../src/App.jsx'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('share_instructions_seen', '1')
  window.history.replaceState(null, '', '/#sometoken')
})

describe('App — Listen mode shell', () => {
  it('🎧 enters Listen mode (pill shown, page-play hidden); ✕ exits (chrome back)', async () => {
    render(<App />)
    // Wait until the pager (with the Listen toggle + page-play) is on screen.
    const toggle = await screen.findByLabelText('Listen mode')
    expect(screen.getByLabelText('Play page recitation')).toBeTruthy() // reading-mode chrome

    fireEvent.click(toggle)

    // Pill appears, reading-mode page-play + toggle are gone.
    await waitFor(() => expect(screen.getByLabelText('Exit listen mode')).toBeTruthy())
    expect(screen.queryByLabelText('Play page recitation')).toBeNull()
    expect(screen.queryByLabelText('Listen mode')).toBeNull()

    fireEvent.click(screen.getByLabelText('Exit listen mode'))

    // Back to reading-mode chrome.
    await waitFor(() => expect(screen.getByLabelText('Play page recitation')).toBeTruthy())
    expect(screen.queryByLabelText('Exit listen mode')).toBeNull()
  })
})
