import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import Modal from '../src/components/Modal.jsx'
import { TEMPLATES, HIGHLIGHT_COLORS, colorForMark, isTemplate } from '../src/quran/highlight.js'

// T2 — the shared modal primitive (single overlay/slide-up implementation
// used by EditNoteModal and InstructionModal).
describe('Modal primitive', () => {
  it('closes on overlay click but not on card click', () => {
    const onClose = vi.fn()
    const { container } = render(
      <Modal onClose={onClose} labelledBy="t"><h2 id="t">Title</h2></Modal>
    )
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(container.querySelector('.modal-overlay'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape and removes the listener on unmount', () => {
    const onClose = vi.fn()
    const { unmount } = render(
      <Modal onClose={onClose} labelledBy="t"><h2 id="t">Title</h2></Modal>
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    unmount()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('moves focus into the dialog on open and restores it on close', () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    const { unmount } = render(
      <Modal onClose={() => {}} labelledBy="t"><h2 id="t">Title</h2><button>Ok</button></Modal>
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog.contains(document.activeElement)).toBe(true)
    unmount()
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })

  it('supports a custom card class (drawer reuses the primitive)', () => {
    render(<Modal onClose={() => {}} label="Drawer" cardClassName="drawer">x</Modal>)
    expect(screen.getByRole('dialog', { name: 'Drawer' }).className).toBe('drawer')
  })
})

// Owner/recipient note text must never hit Object.prototype keys.
describe('note → color trust boundary', () => {
  it.each(['constructor', 'toString', 'hasOwnProperty', '__proto__'])(
    'note %s renders the default red, not an inherited prototype member',
    (evil) => {
      expect(isTemplate(evil)).toBe(false)
      expect(colorForMark({ note: evil })).toBe(HIGHLIGHT_COLORS.default)
    }
  )
})

// T7 — the chip grid order must cover exactly the named highlight templates.
describe('template chips ↔ HIGHLIGHT_COLORS consistency', () => {
  it('TEMPLATES matches the non-default HIGHLIGHT_COLORS keys', () => {
    const colorKeys = Object.keys(HIGHLIGHT_COLORS).filter((k) => k !== 'default')
    expect([...TEMPLATES].sort()).toEqual([...colorKeys].sort())
  })
})

// T1 — canary for the Phase A hardcoded-color audit: no parchment-era values
// may survive anywhere in the stylesheet.
describe('styles.css palette canary', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8').toLowerCase()
  const PARCHMENT_ERA = [
    '#fdfcf7', '#fffefb', '#2a2722', '#6b655c', '#e7e1d4', '#7d5a3e', // old tokens
    '#6a4c33', '#9a3b3b', '#8a2b2b', '#e3c39c', '#f4f1e8', '#fbf9f2', // old hardcoded
    '125, 90, 62', // old accent rgba (highlight Harakah lives in JS, not CSS)
    'iowan', 'palatino', 'georgia', // old serif stack
  ]
  it.each(PARCHMENT_ERA)('contains no parchment-era value %s', (v) => {
    expect(css).not.toContain(v)
  })

  it('uses the app design tokens', () => {
    for (const v of ['#fdfcf3', '#1f2621', '#121714', '#c9edd6', '#69d994', '#007aff', 'be vietnam pro', '#1e1e1e', '#e8e8e8']) {
      expect(css).toContain(v)
    }
  })
})
