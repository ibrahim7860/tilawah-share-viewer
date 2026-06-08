import { useEffect } from 'react'

export default function UndoSnackbar({ onUndo, onExpire }) {
  useEffect(() => {
    const t = setTimeout(() => onExpire?.(), 5000)
    return () => clearTimeout(t)
  }, [onExpire])

  return (
    <div className="snackbar" role="status">
      <span>Mark removed</span>
      <button className="snackbar-undo" onClick={onUndo}>Undo</button>
    </div>
  )
}
