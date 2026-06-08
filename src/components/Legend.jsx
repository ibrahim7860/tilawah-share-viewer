import { HIGHLIGHT_COLORS } from '../quran/highlight.js'

const TEMPLATES = ['Harakah', 'Word', 'Mutashabihat', 'Tajweed']

export default function Legend() {
  return (
    <div className="legend" role="list" aria-label="Mistake categories">
      {TEMPLATES.map((t) => (
        <span className="legend-chip" role="listitem" key={t}>
          <span className="legend-swatch" style={{ background: HIGHLIGHT_COLORS[t] }} aria-hidden="true" />
          {t}
        </span>
      ))}
    </div>
  )
}
