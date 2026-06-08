export default function Header({ meta, onHelp }) {
  const name = meta?.ownerDisplayName || 'A reciter'
  const initial = name.trim().charAt(0).toUpperCase() || '—'
  return (
    <header className="header">
      <div className="header-owner">
        <div className="avatar" aria-hidden="true">{initial}</div>
        <div className="header-text">
          <span className="owner-name">{name}</span>
          <span className="shared-tag">shared with you</span>
        </div>
      </div>
      {onHelp && (
        <button className="help-button" onClick={onHelp} aria-label="How to mark mistakes">?</button>
      )}
    </header>
  )
}
