import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import EditNoteModal from './EditNoteModal.jsx'

const word = { text: 'x', id: 1 }
const noop = () => {}

describe('EditNoteModal attribution caption', () => {
  it('shows "Marked by" when the existing mark has an editorName', () => {
    render(<EditNoteModal word={word} family="serif"
      existing={{ surah: 2, ayah: 5, startWordIndex: 3, endWordIndex: 3, note: 'm', editorName: 'Ahmad' }}
      onSave={noop} onDelete={noop} onClose={noop} />)
    expect(screen.queryByText(/marked by ahmad/i)).not.toBeNull()
  })

  it('shows no caption for an owner mark (no editorName)', () => {
    render(<EditNoteModal word={word} family="serif"
      existing={{ surah: 2, ayah: 5, startWordIndex: 3, endWordIndex: 3, note: 'm' }}
      onSave={noop} onDelete={noop} onClose={noop} />)
    expect(screen.queryByText(/marked by/i)).toBeNull()
  })
})
