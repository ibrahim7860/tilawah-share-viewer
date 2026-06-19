import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import BrowseDrawer from '../src/components/BrowseDrawer.jsx'
import { getMushafConfig } from '../src/quran/mushaf.js'

// The printed IndoPak mushaf counts a decorative opening leaf as page 1, so
// Al-Fatihah is its page 2 — one ahead of our internal numbering. The viewer
// applies a DISPLAY-only +1 offset for IndoPak (0 for Madani); marks and the
// backend startPage stay internal. These tests lock the offset both ways:
// internal→shown for labels, shown→internal for the jump input.
describe('IndoPak page-label offset (+1, display only)', () => {
  const indopak = getMushafConfig('INDOPAK13')
  const madani = getMushafConfig('MADINA15')

  it('config: IndoPak offsets labels by 1, Madani by 0', () => {
    expect(indopak.pageLabelOffset).toBe(1)
    expect(madani.pageLabelOffset).toBe(0)
  })

  it('surah list shows IndoPak pages one ahead (Fatihah p.2, Baqarah p.3)', () => {
    render(<BrowseDrawer currentPage={1} cfg={indopak} onNavigate={() => {}} onClose={() => {}} />)
    // Al-Fatihah starts on internal page 1 → shown as p.2
    expect(screen.getByText('p.2')).toBeTruthy()
    // Al-Baqarah starts on internal page 2 → shown as p.3
    expect(screen.getByText('p.3')).toBeTruthy()
  })

  it('jump input is interpreted as the SHOWN page → navigates to internal (shown−1)', () => {
    const onNavigate = vi.fn()
    render(<BrowseDrawer currentPage={1} cfg={indopak} onNavigate={onNavigate} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Page' }))
    expect(screen.getByText('Go to page (2–848)')).toBeTruthy()
    fireEvent.change(screen.getByLabelText(/Go to page/), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(onNavigate).toHaveBeenCalledWith(2) // shown 3 → internal 2 (Baqarah's first page)
  })

  it('Madani is unaffected: Fatihah shown as p.1, jump 1 → internal 1', () => {
    const onNavigate = vi.fn()
    render(<BrowseDrawer currentPage={1} cfg={madani} onNavigate={onNavigate} onClose={() => {}} />)
    expect(screen.getByText('p.1')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Page' }))
    expect(screen.getByText('Go to page (1–604)')).toBeTruthy()
    fireEvent.change(screen.getByLabelText(/Go to page/), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(onNavigate).toHaveBeenCalledWith(1)
  })
})
