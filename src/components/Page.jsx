import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { wordBackground, wordInMark } from '../quran/highlight.js'
import { fontFamilyFor } from '../quran/loadPage.js'
import { buildPageLayout, TOTAL_LINES, surahName } from '../quran/mushafLayout.js'

/**
 * Renders one page as a proper Madani-mushaf page: a fixed 15-line grid where
 * ayah lines are justified edge-to-edge (centered when they're a surah's final
 * line or on the special large-type pages), with surah-name banners and basmala
 * lines placed on their reserved line slots.
 *
 * Pages 1–2 (short special pages, e.g. Al-Fatihah) render only their occupied
 * lines, vertically centered, instead of leaving the lower grid blank.
 *
 * `preview` ({surah, ayah, startWordIndex, endWordIndex, color} | null) tints
 * matching words live while the Edit Note modal is open — it never touches
 * `marks`, so dismissing the modal reverts it structurally.
 */
export default function Page({ page, pageNumber, marks, preview, onSelectWord }) {
  const lines = useMemo(() => buildPageLayout(page, pageNumber), [page, pageNumber])
  const family = fontFamilyFor(pageNumber)

  // Short special pages: center the occupied lines vertically (real mushaf
  // proportions); each line keeps its 1/15 grid height via CSS.
  const centeredPage = pageNumber <= 2

  // Normal pages: place each render-line on its slot of the 15-line grid;
  // gaps stay blank.
  let slots
  if (centeredPage) {
    slots = lines
  } else {
    slots = Array.from({ length: TOTAL_LINES }, () => null)
    for (const l of lines) {
      const idx = l.lineNumber - 1
      if (idx >= 0 && idx < TOTAL_LINES) slots[idx] = l
    }
  }

  return (
    <div className={centeredPage ? 'page page-centered' : 'page'} dir="rtl">
      {slots.map((l, i) => (
        <div className="mushaf-line" key={i}>
          {l && <Line line={l} page={page} family={family} marks={marks} preview={preview} onSelectWord={onSelectWord} />}
        </div>
      ))}
    </div>
  )
}

function Line({ line, page, family, marks, preview, onSelectWord }) {
  if (line.kind === 'surah_name') {
    return (
      <div className="surah-banner">
        <span className="surah-banner-name">سورة {surahName(line.surahNumber)}</span>
      </div>
    )
  }
  if (line.kind === 'basmallah') {
    return <div className="basmala">﷽</div>
  }
  return <AyahLine line={line} page={page} family={family} marks={marks} preview={preview} onSelectWord={onSelectWord} />
}

function AyahLine({ line, page, family, marks, preview, onSelectWord }) {
  const ref = useRef(null)
  // Two width-driven fallbacks, both measured from the words' intrinsic
  // widths (offsetWidth + overlap margin) so they're independent of what's
  // currently applied (no feedback loop):
  //  - `fits`: a surah's FULL final line falls back to justified
  //    (printed-mushaf behavior: centering only manifests on short lines).
  //  - `fit`:  a line whose natural QCF width exceeds the container gets its
  //    font scaled down to fit — a handful of dense lines per mushaf —
  //    instead of clipping glyphs at the page edge.
  const [fits, setFits] = useState(true)
  const [fit, setFit] = useState(1)
  const fitRef = useRef(1)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => {
      const measured = [...el.children].reduce((sum, c) =>
        sum + c.offsetWidth + (parseFloat(getComputedStyle(c).marginLeft) || 0), 0)
      // De-scale to the natural width at --fit:1 (slightly conservative:
      // the cqw-based paddings don't scale with the font).
      const natural = measured / fitRef.current
      const w = el.clientWidth
      setFits(natural <= w + 1)
      const s = natural > w + 1 ? Math.max(0.75, w / natural) : 1
      if (Math.abs(s - fitRef.current) > 0.005) { fitRef.current = s; setFit(s) }
    }
    check()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [line])

  const centered = line.centered && fits
  return (
    <div
      ref={ref}
      className={centered ? 'ayah-line centered' : 'ayah-line'}
      style={fit < 1 ? { '--fit': fit } : undefined}
    >
      {line.words.map((w) => {
        const bg = (preview && wordInMark(page, w, preview))
          ? preview.color
          : wordBackground(page, w, marks)
        return (
          <button
            key={w.id}
            className="word"
            style={{ fontFamily: family, backgroundColor: bg || 'transparent' }}
            onClick={() => onSelectWord(w, page)}
            aria-label="Qur'an word"
          >{w.text}</button>
        )
      })}
    </div>
  )
}
