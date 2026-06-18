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
          {l && <Line line={l} page={page} family={family} fill={isIndoPak} marks={marks} preview={preview} onSelectWord={onSelectWord} />}
        </div>
      ))}
    </div>
  )
}

function Line({ line, page, family, fill, marks, preview, onSelectWord }) {
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
  return <AyahLine line={line} page={page} family={family} fill={fill} marks={marks} preview={preview} onSelectWord={onSelectWord} />
}

// Per-line fill scale band for IndoPak. A full line scales so its natural width
// fills the container (justification without kashida). The FILLED text size is
// set by the line's density (more/longer words → smaller) — inherent — so the
// band must be wide enough that no real page clamps (which would leave a line
// short or, at the floor, clipping). Sparse surah-start pages land near the top,
// dense mid-surah pages near the bottom; each page is internally uniform.
const INDOPAK_FILL_MAX = 1.4
const INDOPAK_FILL_MIN = 0.55

function AyahLine({ line, page, family, fill, marks, preview, onSelectWord }) {
  const ref = useRef(null)
  // Width-driven scaling, measured from the words' intrinsic widths so it's
  // independent of what's currently applied (no feedback loop):
  //  - Madani (and IndoPak centered/final lines): shrink-only `fit` — a dense
  //    line whose natural width exceeds the container scales DOWN to avoid
  //    clipping; short lines stay centered. Justification comes from the QCF
  //    glyphs themselves (space-between distributes ~nothing).
  //  - IndoPak full lines (`fill`): the single nastaleeq font leaves slack that
  //    space-between would spread into ugly gaps. Instead scale the WHOLE line
  //    up/down so its natural width fills the container — uniform per-line
  //    scaling at natural spacing, which reads as justified without kashida.
  const fillLine = fill && !line.centered
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
      if (fillLine) {
        // Fill: grow or shrink so the natural width meets the container, minus a
        // small epsilon. The word padding is in fixed cqw (doesn't scale with
        // --fit), so targeting the full width leaves a 2–3px residual that can
        // clip the last glyph; undershooting by a few px guarantees no clip for
        // an imperceptible gap. Clamped to the fill band.
        const s = Math.min(INDOPAK_FILL_MAX, Math.max(INDOPAK_FILL_MIN, (w - 6) / natural))
        setFits(true)
        if (Math.abs(s - fitRef.current) > 0.005) { fitRef.current = s; setFit(s) }
      } else {
        setFits(natural <= w + 1)
        const s = natural > w + 1 ? Math.max(0.75, w / natural) : 1
        if (Math.abs(s - fitRef.current) > 0.005) { fitRef.current = s; setFit(s) }
      }
    }
    check()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [line, fillLine])

  const centered = line.centered && fits
  return (
    <div
      ref={ref}
      className={centered ? 'ayah-line centered' : 'ayah-line'}
      style={fit !== 1 ? { '--fit': fit } : undefined}
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
