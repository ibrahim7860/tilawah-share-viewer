import { useMemo } from 'react'
import { wordBackground } from '../quran/highlight.js'
import { fontFamilyFor } from '../quran/loadPage.js'

export default function Page({ page, pageNumber, marks, onSelectWord }) {
  const lines = useMemo(() => groupLines(page), [page])
  const family = fontFamilyFor(pageNumber)
  return (
    <div className="page" dir="rtl">
      {lines.map((words, i) => (
        <div className="line" key={i}>
          {words.map((w) => {
            const bg = wordBackground(page, w, marks)
            return (
              <button
                key={w.id}
                className="word"
                style={{ fontFamily: family, backgroundColor: bg || 'transparent' }}
                onClick={(e) => onSelectWord(w, page, e.currentTarget)}
                aria-label="Qur'an word"
              >{w.text}</button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function groupLines(page) {
  const byLine = {}
  page.verses.forEach((v) => v.words.forEach((w) => {
    (byLine[w.line_number] ||= []).push(w)
  }))
  return Object.keys(byLine).sort((a, b) => a - b).map((k) => byLine[k])
}
