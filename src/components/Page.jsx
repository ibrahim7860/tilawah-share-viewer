import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { wordBackground, wordInMark } from '../quran/highlight.js'
import { buildLayout, surahName } from '../quran/mushafLayout.js'
import { getMushafConfig, DEFAULT_MUSHAF } from '../quran/mushaf.js'

const DEFAULT_CFG = getMushafConfig(DEFAULT_MUSHAF)

/**
 * Renders one mushaf page on a fixed N-line grid (15 for Madani, 13 for IndoPak)
 * where ayah lines are justified edge-to-edge (centered when they're a surah's
 * final line, an `isCentered` IndoPak line, or the special large-type pages),
 * with surah-name banners and basmala lines on their reserved slots.
 *
 * The two editions differ only in their config (`cfg`, see quran/mushaf.js):
 *   - layout: `buildLayout` dispatches to the Madani heuristic builder or the
 *     IndoPak explicit-line builder.
 *   - font: Madani uses a per-page QCF family (`p{N}`); IndoPak uses one Unicode
 *     nastaleeq family for every page (the `.indopak` class drops the QCF
 *     glyph-overlap trick, which only applies to the connected QCF glyphs).
 *
 * Madani pages 1–2 (short, e.g. Al-Fatihah) render only their occupied lines,
 * vertically centered, instead of leaving the lower grid blank.
 *
 * `preview` ({surah, ayah, startWordIndex, endWordIndex, color} | null) tints
 * matching words live while the Edit Note modal is open — it never touches
 * `marks`, so dismissing the modal reverts it structurally.
 */
export default function Page({ page, pageNumber, cfg = DEFAULT_CFG, marks, preview, onSelectWord }) {
  const lines = useMemo(() => buildLayout(page, pageNumber, cfg), [page, pageNumber, cfg])
  const family = cfg.fontFamilyFor(pageNumber)
  const totalLines = cfg.linesPerPage
  const isIndoPak = cfg.layoutKind === 'indopak'

  // Short special pages center their occupied lines vertically (real mushaf
  // proportions) instead of leaving a bottom gap; each line keeps its 1/N grid
  // height via CSS. Madani: the fixed large-type pages 1–2. IndoPak: any page
  // not filling the 13-line grid (only Fatihah, Baqarah's first page, and the
  // final page — 3 of 847; all others are full).
  const centeredPage = isIndoPak ? lines.length < totalLines : pageNumber <= 2

  // Normal pages: place each render-line on its slot of the N-line grid; gaps
  // stay blank.
  let slots
  if (centeredPage) {
    slots = lines
  } else {
    slots = Array.from({ length: totalLines }, () => null)
    for (const l of lines) {
      const idx = l.lineNumber - 1
      if (idx >= 0 && idx < totalLines) slots[idx] = l
    }
  }

  const pageClass = [centeredPage ? 'page page-centered' : 'page', isIndoPak ? 'indopak' : '']
    .filter(Boolean).join(' ')

  return (
    <div className={pageClass} dir="rtl">
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
  //  - `fit`:  a line whose natural width exceeds the container gets its
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
