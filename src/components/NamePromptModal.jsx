import { useState } from 'react'
import Modal from './Modal.jsx'

/**
 * One-time name capture, shown lazily before a recipient's first edit. Reuses the
 * shared Modal primitive and the Edit-Note card styling. A name is required to
 * make an edit, but the prompt is NOT a trap: Escape / backdrop fire onClose,
 * which the caller treats as "cancel this edit" (nothing is written, no name
 * stored). So an accidental tap recovers cleanly.
 */
export default function NamePromptModal({ onSave, onClose }) {
  const [name, setName] = useState('')
  const trimmed = name.trim()
  return (
    <Modal onClose={onClose} labelledBy="name-title" cardClassName="modal edit-note">
      <h2 id="name-title" className="edit-note-title">What's your name?</h2>
      <p className="name-help">Shown to the owner so they know who marked their Qur'an.</p>
      <input
        className="note-input"
        type="text"
        aria-label="Your name"
        autoFocus
        maxLength={50}
        value={name}
        placeholder="e.g. Ahmad"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && trimmed) onSave(trimmed) }}
      />
      <div className="edit-note-actions">
        <button className="edit-note-action" disabled={!trimmed} onClick={() => onSave(trimmed)}>
          Save
        </button>
      </div>
    </Modal>
  )
}
