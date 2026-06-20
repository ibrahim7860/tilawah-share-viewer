import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { wordBackground, wordInMark, wordVerse } from '../quran/highlight.js'
import { buildLayout, surahName } from '../quran/mushafLayout.js'
import { getMushafConfig, DEFAULT_MUSHAF } from '../quran/mushaf.js'

const DEFAULT_CFG = getMushafConfig(DEFAULT_MUSHAF)

// How far a sparse short page (Fatihah, Baqarah's first page, the last page) may
// scale its IndoPak type UP to close the space-between gaps. Bounded by vertical
// room: a line is one 1/13 row (~12.2cqw tall on a 0.63 page), so at line-height
// 1.2 the font tops out near 10cqw — 10/7.2(base) ≈ 1.38 before rows would overlap.
const SHORT_PAGE_MAX = 1.38

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
 *   - justification: Madani full lines fill the width via the QCF glyphs (each
 *     word a pre-kashida'd glyph). IndoPak has no such per-page glyph font, and a
 *     plain Unicode font can't kashida-fill a line — so it renders like quran.com:
 *     a single uniform font size + `justify-content: space-between`, which spreads
 *     each line's slack as inter-word gaps. Centered lines (basmala, surah-end)
 *     center instead. See AyahLine.
 *   - scaling: Madani shrinks per-line (rare dense QCF line, see AyahLine). IndoPak
 *     scales PER-PAGE: the whole page shares one `--ip-fit` (the smallest scale any
 *     of its lines needs), so a dense page shrinks uniformly and never goes jagged
 *     line-to-line. The base size is set large enough to keep gaps tight on typical
 *     pages; --ip-fit only ever shrinks (≤1) the densest pages back to fit.
 *
 * Madani pages 1–2 (short, e.g. Al-Fatihah) render only their occupied lines,
 * vertically centered, instead of leaving the lower grid blank.
 *
 * `preview` ({surah, ayah, startWordIndex, endWordIndex, color} | null) tints
 * matching words live while the Edit Note modal is open — it never touches
 * `marks`, so dismissing the modal reverts it structurally.
 */
export default function Page({ page, pageNumber, cfg = DEFAULT_CFG, marks, preview, onSelectWord, onPlayWord, activeVerseKey }) {
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

  // IndoPak per-page uniform scale. The CSS base size is intentionally a touch
  // larger than the densest page can fit, so typical pages fill most of the width
  // (tight inter-word gaps, like quran.com). On the rare page where a line would
  // then overflow, we shrink the WHOLE page by the smallest scale any line needs
  // — so the page stays internally uniform (no jagged line-to-line sizes) instead
  // of shrinking lines individually. --ip-fit is shrink-only (≤1).
  const pageRef = useRef(null)
  const [ipFit, setIpFit] = useState(1)
  const ipFitRef = useRef(1)
  useLayoutEffect(() => {
    if (!isIndoPak) return
    const el = pageRef.current
    if (!el) return
    // Per-page scale = the smallest scale any full (non-centered) line needs for
    // its natural width to meet the container. Normal pages: cap at 1 (shrink-only)
    // so the approved look is untouched — the base size already fills them. Short
    // pages (Fatihah, Baqarah's first page, the last page) are sparse, so at the
    // base size their space-between lines leave enormous gaps; let them scale UP so
    // the fullest line fills the width (gaps close), capped (SHORT_PAGE_MAX) so the
    // larger type still clears its 1/13 row vertically without overlapping.
    const maxScale = centeredPage ? SHORT_PAGE_MAX : 1
    const check = () => {
      let scale = Infinity
      for (const lineEl of el.querySelectorAll('.ayah-line:not(.centered)')) {
        const measured = [...lineEl.children].reduce((sum, c) =>
          sum + c.offsetWidth + (parseFloat(getComputedStyle(c).marginLeft) || 0), 0)
        // De-scale to the natural width at --ip-fit:1 (no feedback loop).
        const natural = measured / ipFitRef.current
        const w = lineEl.clientWidth
        if (natural > 0) scale = Math.min(scale, (w - 2) / natural)
      }
      if (!Number.isFinite(scale)) scale = 1
      const clamped = Math.max(0.6, Math.min(maxScale, scale)) // floor: pathological safety
      if (Math.abs(clamped - ipFitRef.current) > 0.005) { ipFitRef.current = clamped; setIpFit(clamped) }
    }
    check()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [isIndoPak, lines, centeredPage])

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
    <div
      ref={pageRef}
      className={pageClass}
      dir="rtl"
      style={isIndoPak && ipFit !== 1 ? { '--ip-fit': ipFit } : undefined}
    >
      {slots.map((l, i) => (
        <div className="mushaf-line" key={i}>
          {l && <Line line={l} page={page} family={family} isIndoPak={isIndoPak} marks={marks} preview={preview} onSelectWord={onSelectWord} onPlayWord={onPlayWord} activeVerseKey={activeVerseKey} />}
        </div>
      ))}
    </div>
  )
}

function Line({ line, page, family, isIndoPak, marks, preview, onSelectWord, onPlayWord, activeVerseKey }) {
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
  return <AyahLine line={line} page={page} family={family} isIndoPak={isIndoPak} marks={marks} preview={preview} onSelectWord={onSelectWord} onPlayWord={onPlayWord} activeVerseKey={activeVerseKey} />
}

function AyahLine({ line, page, family, isIndoPak, marks, preview, onSelectWord, onPlayWord, activeVerseKey }) {
  const ref = useRef(null)
  // Madani: per-line SHRINK-ONLY fit, measured from the words' intrinsic widths so
  // it's independent of what's applied (no feedback loop). A dense QCF line whose
  // natural width exceeds the container scales DOWN rather than clipping; lines
  // that fit stay at the uniform CSS size (--fit stays 1). Justification comes from
  // the QCF glyphs themselves (space-between distributes ~nothing on a connected
  // line). IndoPak does NOT use this — it scales per-page (--ip-fit, see Page) so
  // a dense page stays internally uniform, and it justifies via space-between.
  const [fits, setFits] = useState(true)
  const [fit, setFit] = useState(1)
  const fitRef = useRef(1)
  useLayoutEffect(() => {
    if (isIndoPak) return // IndoPak is scaled per-page by Page (--ip-fit)
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
  }, [line, isIndoPak])

  // Center only a surah's final/short line or a basmala-area line (the mushaf's
  // own isCentered flag → line.centered); everything else justifies edge-to-edge.
  // For Madani that justification is the QCF glyphs (space-between adds ~0); for
  // IndoPak space-between distributes the line's slack as inter-word gaps — which
  // is exactly how quran.com's reading view justifies IndoPak (uniform size +
  // justify-content:space-between, no kashida — see VerseText.tsx / pageUtils.ts
  // in quran.com-frontend-next). IndoPak fits by construction (per-page --ip-fit),
  // so it always honours line.centered; Madani only centers a line that fits.
  const centered = line.centered && (isIndoPak || fits)
  return (
    <div
      ref={ref}
      className={centered ? 'ayah-line centered' : 'ayah-line'}
      style={!isIndoPak && fit !== 1 ? { '--fit': fit } : undefined}
    >
      {line.words.map((w) => {
        const bg = (preview && wordInMark(page, w, preview))
          ? preview.color
          : wordBackground(page, w, marks)
        // Active recitation tint is lowest priority — applied via a class only
        // when no mark/preview color already won (Amendment 5).
        const sa = activeVerseKey ? wordVerse(page, w) : null
        const isActive = !bg && sa && `${sa[0]}:${sa[1]}` === activeVerseKey
        return (
          <button
            key={w.id}
            className={isActive ? 'word word--audio-active' : 'word'}
            style={{ fontFamily: family, backgroundColor: bg || 'transparent' }}
            onClick={(e) => {
              // A long-press just fired playback — swallow its trailing click so
              // it doesn't also open the note editor.
              if (e.currentTarget._lp) { e.currentTarget._lp = false; return }
              onSelectWord(w, page)
            }}
            onContextMenu={(e) => { if (onPlayWord) { e.preventDefault(); onPlayWord(w, page) } }}
            onPointerDown={(e) => {
              if (!onPlayWord) return
              const el = e.currentTarget
              el._lpTimer = setTimeout(() => { el._lp = true; onPlayWord(w, page) }, 500)
            }}
            onPointerUp={(e) => { clearTimeout(e.currentTarget._lpTimer) }}
            onPointerLeave={(e) => { clearTimeout(e.currentTarget._lpTimer) }}
            aria-label="Qur'an word"
          >{w.text}</button>
        )
      })}
    </div>
  )
}
