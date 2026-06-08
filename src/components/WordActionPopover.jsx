import { HIGHLIGHT_COLORS } from '../quran/highlight.js'
const TEMPLATES = ['Harakah', 'Word', 'Mutashabihat', 'Tajweed']

export default function WordActionPopover({ existing, onMark, onSetNote, onDelete, onClose, anchorRect }) {
  return (
    <div className="popover" style={anchorStyle(anchorRect)} role="dialog">
      {!existing && <button onClick={() => onMark()}>Mark mistake</button>}
      <div className="swatches">
        {TEMPLATES.map((t) => (
          <button key={t} title={t} style={{ background: HIGHLIGHT_COLORS[t] }}
                  onClick={() => onSetNote(t)}>{t}</button>
        ))}
      </div>
      {existing && <button className="danger" onClick={onDelete}>Remove</button>}
      <button onClick={onClose}>Close</button>
    </div>
  )
}
function anchorStyle(rect) {
  if (!rect) return {}
  return { position: 'absolute', top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX }
}
