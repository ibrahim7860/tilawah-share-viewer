import { useState } from 'react'
import Modal from './Modal.jsx'
import { TEMPLATES, HIGHLIGHT_COLORS, colorForMark, isTemplate } from '../quran/highlight.js'

/**
 * The app's "Edit Note" modal, ported: dark-olive card, 2×2 mint template
 * chips (active = solid mint), near-black note input, mint-green Cancel/Save.
 *
 * Picking a chip fills the note with the template AND fires onPreview so the
 * word tints live on the page; the same tint is mirrored on the in-modal word
 * preview, which stays visible even when the overlay occludes the page word.
 * Save commits (empty note → plain red mark); Cancel/overlay/Escape discard.
 */
export default function EditNoteModal({ word, family, existing, onSave, onDelete, onClose, onPreview }) {
  // Prefill with the owner's existing note so the recipient can read & edit it.
  const [note, setNote] = useState(existing?.note ?? '')

  const activeTemplate = isTemplate(note.trim()) ? note.trim() : null
  const pick = (t) => { setNote(t); onPreview?.(t) }
  // Keep the page tint honest while typing: a free-text note clears the
  // template preview (Save would produce the default red / existing color).
  const onType = (e) => {
    const v = e.target.value
    setNote(v)
    onPreview?.(isTemplate(v.trim()) ? v.trim() : null)
  }

  // What Save would produce: template color if a chip is active, otherwise the
  // existing mark's color, otherwise the plain (red) default for a new mark.
  const previewColor = activeTemplate
    ? HIGHLIGHT_COLORS[activeTemplate]
    : existing ? colorForMark(existing) : HIGHLIGHT_COLORS.default

  return (
    <Modal onClose={onClose} labelledBy="edit-note-title" cardClassName="modal edit-note">
      <h2 id="edit-note-title" className="edit-note-title">Edit Note</h2>

      <div className="word-preview-row">
        <span className="word-preview" style={{ fontFamily: family, backgroundColor: previewColor }}
              aria-label="Selected word preview">{word.text}</span>
      </div>

      <div className="template-chips">
        {TEMPLATES.map((t) => (
          <button key={t} className={activeTemplate === t ? 'chip active' : 'chip'}
                  aria-pressed={activeTemplate === t} onClick={() => pick(t)}>{t}</button>
        ))}
      </div>

      <textarea
        className="note-input"
        value={note}
        maxLength={500}
        placeholder="Add a note for your highlight..."
        aria-label="Note"
        onChange={onType}
      />

      {existing && <button className="edit-note-remove" onClick={onDelete}>Remove mark</button>}

      <div className="edit-note-actions">
        <button className="edit-note-action" onClick={onClose}>Cancel</button>
        <button className="edit-note-action" onClick={() => onSave(note)}>Save</button>
      </div>
    </Modal>
  )
}
