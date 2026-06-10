import { useState } from 'react'
import Modal from './Modal.jsx'
import { TEMPLATES, HIGHLIGHT_COLORS } from '../quran/highlight.js'

const SEEN_KEY = 'share_instructions_seen'

function notYetSeen() {
  try {
    return !localStorage.getItem(SEEN_KEY)
  } catch {
    return true
  }
}

/**
 * App-parity instruction modal (black card, mint body, solid-mint "Got it!").
 * Also hosts the highlight-color legend now that the persistent legend strip
 * is gone (the app has no legend strip either).
 */
export default function InstructionModal({ forceOpen = false, onClose }) {
  // Lazy initializer: show on first ever open (no setState-in-effect needed).
  const [dismissed, setDismissed] = useState(() => !notYetSeen())

  const open = forceOpen || !dismissed
  if (!open) return null

  const dismiss = () => {
    try { localStorage.setItem(SEEN_KEY, '1') } catch { /* ignore */ }
    setDismissed(true)
    onClose?.()
  }

  return (
    <Modal onClose={dismiss} labelledBy="instr-title" cardClassName="modal instruction">
      <h2 id="instr-title" className="modal-title">How to Mark Mistakes</h2>
      <ul className="modal-steps">
        <li>Tap a word to mark a mistake</li>
        <li>Pick a category or write a note, then Save</li>
        <li>Changes save automatically</li>
      </ul>
      <ul className="legend" aria-label="Mistake categories">
        {TEMPLATES.map((t) => (
          <li className="legend-chip" key={t}>
            <span className="legend-swatch" style={{ background: HIGHLIGHT_COLORS[t] }} aria-hidden="true" />
            {t}
          </li>
        ))}
        <li className="legend-chip">
          <span className="legend-swatch" style={{ background: HIGHLIGHT_COLORS.default }} aria-hidden="true" />
          Other notes
        </li>
      </ul>
      <button className="modal-primary" onClick={dismiss}>Got it!</button>
    </Modal>
  )
}
