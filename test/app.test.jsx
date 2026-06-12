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

import { addMistake, updateMistake, deleteMistake, fetchMistakes, RevokedError } from '../src/api.js'
import { HIGHLIGHT_COLORS } from '../src/quran/highlight.js'

// Mock loadPage with a swappable page so individual tests can use a
// multi-word page (vi.hoisted so the hoisted factory can close over it).
const pageMock = vi.hoisted(() => ({ page: null }))
vi.mock('../src/quran/loadPage.js', () => ({
  loadPage: vi.fn(() => Promise.resolve(pageMock.page)),
  fontFamilyFor: () => 'p1',
  prefetchAround: vi.fn(),
}))

// Default: a single word. PAGE3: a three-word ayah for range tests.
const PAGE = {
  verses: [{ verse_key: '2:1', words: [{ id: 1, position: 1, line_number: 1, text: 'بِسْمِ' }] }],
}
const PAGE3 = {
  verses: [{
    verse_key: '2:1',
    words: [
      { id: 1, position: 1, line_number: 1, text: 'بِسْمِ' },
      { id: 2, position: 2, line_number: 1, text: 'ٱللَّهِ' },
      { id: 3, position: 3, line_number: 1, text: 'ٱلرَّحْمَٰنِ' },
    ],
  }],
}

import App from '../src/App.jsx'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('share_instructions_seen', '1') // keep the help modal closed
  // Seed a stored editor name so the lazy name prompt is transparent to these
  // marking tests (they verify write behavior, not the name gate, which has its
  // own tests in the "name gate" describe block below).
  localStorage.setItem('share_editor_name', 'Tester')
  window.history.replaceState(null, '', '/#sometoken')
  pageMock.page = PAGE
  addMistake.mockClear(); updateMistake.mockClear(); deleteMistake.mockClear()
})
afterEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

async function renderAndOpenModal() {
  const utils = render(<App />)
  const word = await screen.findByRole('button', { name: "Qur'an word" })
  fireEvent.click(word)
  await screen.findByRole('dialog', { name: 'Edit Note' })
  return { word, ...utils }
}

describe('App word marking (Edit Note modal)', () => {
  it('Save with an empty note creates a plain mark via addMistake (POST)', async () => {
    await renderAndOpenModal()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(addMistake).toHaveBeenCalledTimes(1))
    expect(addMistake.mock.calls[0][1]).toMatchObject({ note: null })
    expect(updateMistake).not.toHaveBeenCalled()
  })

  it('picking a template chip then Save POSTs a NEW mark with the template note', async () => {
    await renderAndOpenModal()
    fireEvent.click(screen.getByRole('button', { name: 'Tajweed' }))
    // chip does NOT save by itself (app parity)
    expect(updateMistake).not.toHaveBeenCalled()
    expect(addMistake).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(addMistake).toHaveBeenCalledTimes(1))
    expect(addMistake.mock.calls[0][1]).toMatchObject({ note: 'Tajweed' })
    expect(updateMistake).not.toHaveBeenCalled()
  })

  it('typing a free-text note + Save POSTs a new mark with the note', async () => {
    await renderAndOpenModal()
    const textarea = await screen.findByLabelText('Note')
    fireEvent.change(textarea, { target: { value: 'forgot the madd here' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(addMistake).toHaveBeenCalledTimes(1))
    expect(addMistake.mock.calls[0][1]).toMatchObject({ note: 'forgot the madd here' })
    expect(updateMistake).not.toHaveBeenCalled()
  })

  it("prefills the modal with the owner's existing note and edits via PUT", async () => {
    fetchMistakes.mockResolvedValueOnce([
      { surah: 2, ayah: 1, startWordIndex: 1, endWordIndex: 1, note: 'mistake from owner' },
    ])
    render(<App />)
    const word = await screen.findByRole('button', { name: "Qur'an word" })
    fireEvent.click(word)
    const textarea = await screen.findByLabelText('Note')
    expect(textarea.value).toBe('mistake from owner')
    fireEvent.change(textarea, { target: { value: 'edited note' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(updateMistake).toHaveBeenCalledTimes(1))
    expect(updateMistake.mock.calls[0][1]).toMatchObject({ surah: 2, ayah: 1, note: 'edited note' })
    expect(addMistake).not.toHaveBeenCalled()
  })

  // T-R2 (CRITICAL regression): a presentational rebuild must not drop the
  // existing mark's exact coordinates — including multi-word ranges.
  it('saving an existing multi-word mark preserves its original coordinates', async () => {
    fetchMistakes.mockResolvedValueOnce([
      { surah: 2, ayah: 1, startWordIndex: 1, endWordIndex: 3, note: 'range mark' },
    ])
    render(<App />)
    const word = await screen.findByRole('button', { name: "Qur'an word" })
    fireEvent.click(word)
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }))
    await waitFor(() => expect(updateMistake).toHaveBeenCalledTimes(1))
    expect(updateMistake.mock.calls[0][1]).toMatchObject({
      surah: 2, ayah: 1, startWordIndex: 1, endWordIndex: 3,
    })
  })

  it("clearing an existing mark's note then Save PUTs note:null with original coords (never POST)", async () => {
    fetchMistakes.mockResolvedValueOnce([
      { surah: 2, ayah: 1, startWordIndex: 1, endWordIndex: 1, note: 'Tajweed' },
    ])
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: "Qur'an word" }))
    const textarea = await screen.findByLabelText('Note')
    fireEvent.change(textarea, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(updateMistake).toHaveBeenCalledTimes(1))
    expect(updateMistake.mock.calls[0][1]).toMatchObject({
      surah: 2, ayah: 1, startWordIndex: 1, endWordIndex: 1, note: null,
    })
    expect(addMistake).not.toHaveBeenCalled()
  })

  it('Remove on an existing mark calls deleteMistake', async () => {
    fetchMistakes.mockResolvedValueOnce([
      { surah: 2, ayah: 1, startWordIndex: 1, endWordIndex: 1, note: null },
    ])
    render(<App />)
    const word = await screen.findByRole('button', { name: "Qur'an word" })
    fireEvent.click(word)
    fireEvent.click(await screen.findByRole('button', { name: 'Remove mark' }))
    await waitFor(() => expect(deleteMistake).toHaveBeenCalledTimes(1))
  })

  it('Undo after a delete re-creates the mark via addMistake (POST), note intact', async () => {
    fetchMistakes.mockResolvedValueOnce([
      { surah: 2, ayah: 1, startWordIndex: 1, endWordIndex: 1, note: 'Tajweed' },
    ])
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: "Qur'an word" }))
    fireEvent.click(await screen.findByRole('button', { name: 'Remove mark' }))
    await waitFor(() => expect(deleteMistake).toHaveBeenCalledTimes(1))
    fireEvent.click(await screen.findByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(addMistake).toHaveBeenCalledTimes(1))
    expect(addMistake.mock.calls[0][1]).toMatchObject({ surah: 2, ayah: 1, note: 'Tajweed' })
    expect(updateMistake).not.toHaveBeenCalled()
  })
})

describe('App live preview', () => {
  // T3 + T5: chip tap → live tint on the page word AND in-modal word preview.
  it('picking a chip live-tints the page word and the in-modal preview', async () => {
    const { word } = await renderAndOpenModal()
    fireEvent.click(screen.getByRole('button', { name: 'Mutashabihat' }))
    expect(word.style.backgroundColor).toBe(HIGHLIGHT_COLORS.Mutashabihat)
    const preview = screen.getByLabelText('Selected word preview')
    expect(preview.style.backgroundColor).toBe(HIGHLIGHT_COLORS.Mutashabihat)
  })

  it('typing over a template clears the live page tint (preview stays honest)', async () => {
    const { word } = await renderAndOpenModal()
    fireEvent.click(screen.getByRole('button', { name: 'Harakah' }))
    expect(word.style.backgroundColor).toBe(HIGHLIGHT_COLORS.Harakah)
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'custom note' } })
    // new unmarked word + non-template note → no live tint on the page
    expect(word.style.backgroundColor).toBe('transparent')
  })

  it('chip preview on an existing multi-word mark tints the whole range, and dismiss restores it', async () => {
    pageMock.page = PAGE3
    fetchMistakes.mockResolvedValueOnce([
      { surah: 2, ayah: 1, startWordIndex: 1, endWordIndex: 3, note: 'a note' },
    ])
    render(<App />)
    const words = await screen.findAllByRole('button', { name: "Qur'an word" })
    expect(words).toHaveLength(3)
    fireEvent.click(words[1])
    fireEvent.click(await screen.findByRole('button', { name: 'Word' }))
    for (const w of words) expect(w.style.backgroundColor).toBe(HIGHLIGHT_COLORS.Word)
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit Note' })).toBeNull())
    for (const w of words) expect(w.style.backgroundColor).toBe(HIGHLIGHT_COLORS.default)
    expect(addMistake).not.toHaveBeenCalled()
    expect(updateMistake).not.toHaveBeenCalled()
  })

  // T-R1 (CRITICAL regression) + T4: every dismiss path fires ZERO API calls
  // and reverts the live preview tint.
  it.each([
    ['Cancel button', () => fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))],
    ['overlay click', (container) => fireEvent.click(container.querySelector('.modal-overlay'))],
    ['Escape key', () => fireEvent.keyDown(window, { key: 'Escape' })],
  ])('dismiss via %s reverts the preview and saves nothing', async (_label, dismiss) => {
    const { word, container } = await renderAndOpenModal()
    fireEvent.click(screen.getByRole('button', { name: 'Harakah' }))
    expect(word.style.backgroundColor).toBe(HIGHLIGHT_COLORS.Harakah)
    dismiss(container)
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit Note' })).toBeNull())
    expect(word.style.backgroundColor).toBe('transparent')
    expect(addMistake).not.toHaveBeenCalled()
    expect(updateMistake).not.toHaveBeenCalled()
    expect(deleteMistake).not.toHaveBeenCalled()
  })
})

describe('App write failures', () => {
  it('a failed CREATE rolls back the optimistic mark and shows the retry toast', async () => {
    addMistake.mockRejectedValueOnce(new Error('network'))
    const { word } = await renderAndOpenModal()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText(/Couldn't save/)).toBeTruthy()
    await waitFor(() => expect(word.style.backgroundColor).toBe('transparent'))
  })

  it("a failed UPDATE restores the previous mark (old note's color), not deletion", async () => {
    updateMistake.mockRejectedValueOnce(new Error('network'))
    fetchMistakes.mockResolvedValueOnce([
      { surah: 2, ayah: 1, startWordIndex: 1, endWordIndex: 1, note: 'Tajweed' },
    ])
    render(<App />)
    const word = await screen.findByRole('button', { name: "Qur'an word" })
    await waitFor(() => expect(word.style.backgroundColor).toBe(HIGHLIGHT_COLORS.Tajweed))
    fireEvent.click(word)
    fireEvent.click(await screen.findByRole('button', { name: 'Word' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText(/Couldn't save/)).toBeTruthy()
    // rollback restores the ORIGINAL Tajweed mark, not transparent
    await waitFor(() => expect(word.style.backgroundColor).toBe(HIGHLIGHT_COLORS.Tajweed))
  })

  it('a RevokedError on write swaps to the revoked error screen', async () => {
    addMistake.mockRejectedValueOnce(new RevokedError('revoked'))
    const { container } = await renderAndOpenModal()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(container.querySelector('.error-screen')).toBeTruthy())
  })
})

describe('App help modal (instructions + legend)', () => {
  // T6: the legend now lives inside the help modal (no persistent strip).
  it('the help button opens the instruction modal containing the color legend', async () => {
    render(<App />)
    await screen.findByRole('button', { name: "Qur'an word" })
    fireEvent.click(screen.getByRole('button', { name: 'How to mark mistakes' }))
    const dialog = await screen.findByRole('dialog', { name: 'How to Mark Mistakes' })
    expect(dialog).toBeTruthy()
    const legend = screen.getByLabelText('Mistake categories')
    for (const t of ['Harakah', 'Word', 'Mutashabihat', 'Tajweed']) {
      expect(legend.textContent).toContain(t)
    }
    fireEvent.click(screen.getByRole('button', { name: 'Got it!' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'How to Mark Mistakes' })).toBeNull())
  })

  it('auto-opens on first visit and persists dismissal', async () => {
    localStorage.clear() // genuinely first visit
    const { unmount } = render(<App />)
    await screen.findByRole('dialog', { name: 'How to Mark Mistakes' })
    fireEvent.click(screen.getByRole('button', { name: 'Got it!' }))
    expect(localStorage.getItem('share_instructions_seen')).toBe('1')
    unmount()
    render(<App />)
    await screen.findByRole('button', { name: "Qur'an word" })
    expect(screen.queryByRole('dialog', { name: 'How to Mark Mistakes' })).toBeNull()
  })
})

describe('App browse navigation', () => {
  it('opening the index and picking a surah navigates to its first page', async () => {
    render(<App />)
    await screen.findByRole('button', { name: "Qur'an word" })
    fireEvent.click(screen.getByRole('button', { name: "Browse the Qur'an" }))
    // Al-Mulk (surah 67) starts on page 562; its row label includes "p.562".
    const row = await screen.findByRole('button', { name: /p\.562/ })
    fireEvent.click(row)
    await waitFor(() => expect(screen.getByRole('button', { name: /Page 562/ })).toBeTruthy())
  })

  it('picking a juz navigates to its first page and closes the drawer', async () => {
    render(<App />)
    await screen.findByRole('button', { name: "Qur'an word" })
    fireEvent.click(screen.getByRole('button', { name: "Browse the Qur'an" }))
    fireEvent.click(screen.getByRole('tab', { name: 'Juz' }))
    const rows = await screen.findAllByRole('button', { name: /p\.582/ })
    fireEvent.click(rows[0]) // Juz 30 starts on page 582
    await waitFor(() => expect(screen.getByRole('button', { name: /Page 582/ })).toBeTruthy())
    expect(screen.queryByRole('dialog', { name: "Browse the Qur'an" })).toBeNull()
  })

  it('jump-to-page clamps an out-of-range page to 604', async () => {
    render(<App />)
    await screen.findByRole('button', { name: "Qur'an word" })
    fireEvent.click(screen.getByRole('button', { name: "Browse the Qur'an" }))
    fireEvent.click(screen.getByRole('tab', { name: 'Page' }))
    fireEvent.change(screen.getByLabelText(/Go to page/), { target: { value: '9999' } })
    fireEvent.click(screen.getByRole('button', { name: 'Go' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Page 604/ })).toBeTruthy())
  })

  it('shows and clears the jump error for invalid input, keeping the drawer open', async () => {
    render(<App />)
    await screen.findByRole('button', { name: "Qur'an word" })
    fireEvent.click(screen.getByRole('button', { name: "Browse the Qur'an" }))
    fireEvent.click(screen.getByRole('tab', { name: 'Page' }))
    fireEvent.click(screen.getByRole('button', { name: 'Go' })) // empty input
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('dialog', { name: "Browse the Qur'an" })).toBeTruthy()
    fireEvent.change(screen.getByLabelText(/Go to page/), { target: { value: '5' } })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('Escape closes the browse drawer (shared Modal primitive)', async () => {
    render(<App />)
    await screen.findByRole('button', { name: "Qur'an word" })
    fireEvent.click(screen.getByRole('button', { name: "Browse the Qur'an" }))
    await screen.findByRole('dialog', { name: "Browse the Qur'an" })
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: "Browse the Qur'an" })).toBeNull())
  })
})

describe('App page flipping (keyboard + swipe, RTL book order)', () => {
  it('ArrowLeft advances, ArrowRight goes back, and the pill shows N / 604', async () => {
    const { container } = render(<App />)
    await screen.findByRole('button', { name: "Qur'an word" })
    expect(container.querySelector('.page-pill').textContent).toBe('Page 1 / 604')
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    await waitFor(() => expect(screen.getByRole('button', { name: /Page 2/ })).toBeTruthy())
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    await waitFor(() => expect(screen.getByRole('button', { name: /Page 1/ })).toBeTruthy())
  })

  it('arrow keys are inert while a dialog is open (no page flip behind a modal)', async () => {
    await renderAndOpenModal()
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('button', { name: /Page 1/ })).toBeTruthy()
  })

  it('a horizontal right-swipe flips to the next page; the trailing tap is swallowed', async () => {
    const { container } = render(<App />)
    await screen.findByRole('button', { name: "Qur'an word" })
    const zone = container.querySelector('.page-zone')
    fireEvent.touchStart(zone, { touches: [{ clientX: 100, clientY: 300 }] })
    fireEvent.touchEnd(zone, { changedTouches: [{ clientX: 220, clientY: 300 }] })
    await waitFor(() => expect(screen.getByRole('button', { name: /Page 2/ })).toBeTruthy())
    // the click that lands right after the swipe must not open the modal
    fireEvent.click(screen.getByRole('button', { name: "Qur'an word" }))
    expect(screen.queryByRole('dialog', { name: 'Edit Note' })).toBeNull()
  })

  it('a mostly-vertical drag does NOT flip the page (scrolling stays native)', async () => {
    const { container } = render(<App />)
    await screen.findByRole('button', { name: "Qur'an word" })
    const zone = container.querySelector('.page-zone')
    fireEvent.touchStart(zone, { touches: [{ clientX: 100, clientY: 100 }] })
    fireEvent.touchEnd(zone, { changedTouches: [{ clientX: 170, clientY: 400 }] })
    expect(screen.getByRole('button', { name: /Page 1/ })).toBeTruthy()
  })

  it('a mouse drag right flips to the next page; the trailing click is swallowed', async () => {
    const { container } = render(<App />)
    await screen.findByRole('button', { name: "Qur'an word" })
    const zone = container.querySelector('.page-zone')
    fireEvent.pointerDown(zone, { pointerType: 'mouse', button: 0, clientX: 100, clientY: 300 })
    fireEvent.pointerUp(window, { pointerType: 'mouse', clientX: 230, clientY: 300 })
    await waitFor(() => expect(screen.getByRole('button', { name: /Page 2/ })).toBeTruthy())
    // the click that lands when the drag releases must not open the modal
    fireEvent.click(screen.getByRole('button', { name: "Qur'an word" }))
    expect(screen.queryByRole('dialog', { name: 'Edit Note' })).toBeNull()
  })

  it('a plain mouse press (no movement) still lets the word click open the modal', async () => {
    const { container } = render(<App />)
    const word = await screen.findByRole('button', { name: "Qur'an word" })
    const zone = container.querySelector('.page-zone')
    fireEvent.pointerDown(zone, { pointerType: 'mouse', button: 0, clientX: 100, clientY: 300 })
    fireEvent.pointerUp(window, { pointerType: 'mouse', clientX: 102, clientY: 301 })
    fireEvent.click(word)
    expect(await screen.findByRole('dialog', { name: 'Edit Note' })).toBeTruthy()
  })

  it('a horizontal trackpad swipe flips exactly one page (inertia tail swallowed)', async () => {
    const { container } = render(<App />)
    await screen.findByRole('button', { name: "Qur'an word" })
    const zone = container.querySelector('.page-zone')
    // natural scrolling: fingers right → deltaX < 0 → next page (RTL)
    fireEvent.wheel(zone, { deltaX: -120, deltaY: 0 })
    await waitFor(() => expect(screen.getByRole('button', { name: /Page 2/ })).toBeTruthy())
    // the inertia tail right after the flip must not flip again
    fireEvent.wheel(zone, { deltaX: -120, deltaY: 0 })
    fireEvent.wheel(zone, { deltaX: -120, deltaY: 0 })
    expect(screen.getByRole('button', { name: /Page 2/ })).toBeTruthy()
  })

  it('vertical trackpad scrolling never flips pages', async () => {
    const { container } = render(<App />)
    await screen.findByRole('button', { name: "Qur'an word" })
    const zone = container.querySelector('.page-zone')
    fireEvent.wheel(zone, { deltaX: -40, deltaY: -300 })
    fireEvent.wheel(zone, { deltaX: -40, deltaY: -300 })
    fireEvent.wheel(zone, { deltaX: -40, deltaY: -300 })
    expect(screen.getByRole('button', { name: /Page 1/ })).toBeTruthy()
  })
})

// Eng review 2C/3A: the lazy, never-anonymous name gate.
describe('App name gate (lazy editor name)', () => {
  it('reading without editing never prompts for a name', async () => {
    localStorage.removeItem('share_editor_name')
    render(<App />)
    await screen.findByRole('button', { name: "Qur'an word" })
    // No name prompt appears for a pure reader.
    expect(screen.queryByLabelText('Your name')).toBeNull()
  })

  it('first edit prompts for a name, then writes with editorName', async () => {
    localStorage.removeItem('share_editor_name')
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: "Qur'an word" }))
    await screen.findByRole('dialog', { name: 'Edit Note' })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    // No write yet — the name prompt gates it.
    const nameInput = await screen.findByLabelText('Your name')
    expect(addMistake).not.toHaveBeenCalled()

    fireEvent.change(nameInput, { target: { value: 'Ahmad' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(addMistake).toHaveBeenCalledTimes(1))
    expect(addMistake.mock.calls[0][1]).toMatchObject({ editorName: 'Ahmad' })
    // The name persists for next time.
    expect(localStorage.getItem('share_editor_name')).toBe('Ahmad')
  })

  it('cancelling the name prompt (Escape) writes nothing', async () => {
    localStorage.removeItem('share_editor_name')
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: "Qur'an word" }))
    await screen.findByRole('dialog', { name: 'Edit Note' })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByLabelText('Your name')
    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByLabelText('Your name')).toBeNull())
    expect(addMistake).not.toHaveBeenCalled()
    expect(localStorage.getItem('share_editor_name')).toBeNull()
  })
})
