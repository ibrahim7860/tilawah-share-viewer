import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import NamePromptModal from './NamePromptModal.jsx'

describe('NamePromptModal', () => {
  it('Save is disabled until a non-blank name is typed, then returns it', () => {
    const onSave = vi.fn()
    render(<NamePromptModal onSave={onSave} onClose={() => {}} />)
    const save = screen.getByRole('button', { name: /save/i })
    expect(save.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Ahmad' } })
    expect(save.disabled).toBe(false)
    fireEvent.click(save)
    expect(onSave).toHaveBeenCalledWith('Ahmad')
  })

  // Eng review 2C/3A: Escape closes via onClose (Modal primitive forwards it),
  // so the caller can cancel the pending edit.
  it('Escape triggers onClose (cancel path)', () => {
    const onClose = vi.fn()
    render(<NamePromptModal onSave={() => {}} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
