import { useEffect, useRef } from 'react'

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Shared modal primitive — the single overlay + slide-up + reduced-motion
 * implementation (app parity: Modal animationType="slide" over a 40% overlay).
 *
 * Consumers: EditNoteModal (word marking), InstructionModal (help), and
 * BrowseDrawer (Quran index). Closes on overlay click and Escape; the card
 * stops click propagation. Focus management: moves focus into the card on
 * mount, keeps Tab cycling inside it, and restores focus on close.
 */
export default function Modal({ onClose, labelledBy, label, cardClassName = 'modal', children }) {
  const cardRef = useRef(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement
    cardRef.current?.focus()

    const onKey = (e) => {
      if (e.key === 'Escape') { onClose?.(); return }
      if (e.key !== 'Tab' || !cardRef.current) return
      // Keep Tab cycling within the dialog.
      const focusables = [...cardRef.current.querySelectorAll(FOCUSABLE)]
      if (!focusables.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const inside = cardRef.current.contains(document.activeElement)
      if (!inside) { e.preventDefault(); first.focus(); return }
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [onClose])

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div ref={cardRef} tabIndex={-1} className={cardClassName} role="dialog" aria-modal="true"
           aria-labelledby={labelledBy} aria-label={label} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
