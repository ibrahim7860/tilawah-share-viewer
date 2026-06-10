/**
 * App-parity reading chrome: no header bar — floating round browse/help
 * buttons in the top corners and a compact owner pill top-center (web-only
 * need: recipients must see whose Qur'an this is).
 */
export default function Header({ meta, onBrowse, onHelp }) {
  const name = meta?.ownerDisplayName || 'A reciter'
  return (
    <header className="chrome-top">
      <h1 className="visually-hidden">{name} — shared Qur'an</h1>
      <button className="float-button" onClick={onBrowse} aria-label="Browse the Qur'an">☰</button>
      <div className="owner-pill">
        <span className="owner-pill-name">{name}</span>
        <span className="owner-pill-tag">shared with you</span>
      </div>
      <button className="float-button" onClick={onHelp} aria-label="How to mark mistakes">?</button>
    </header>
  )
}
