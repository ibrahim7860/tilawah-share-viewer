import { useState } from 'react'

const SEEN_KEY = 'share_instructions_seen'

function notYetSeen() {
  try {
    return !localStorage.getItem(SEEN_KEY)
  } catch {
    return true
  }
}

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
    <div className="modal-overlay" role="presentation" onClick={dismiss}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="instr-title"
           onClick={(e) => e.stopPropagation()}>
        <h2 id="instr-title" className="modal-title">How to mark mistakes</h2>
        <ul className="modal-steps">
          <li>Tap a word to mark a mistake</li>
          <li>Tap a mark to add a note or remove it</li>
          <li>Changes save automatically</li>
        </ul>
        <button className="modal-primary" onClick={dismiss}>Got it</button>
      </div>
    </div>
  )
}
