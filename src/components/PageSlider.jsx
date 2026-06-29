// CANON: <workspace-root>/docs/superpowers/specs/2026-06-28-interactive-page-turn-design.md (shared spec at the workspace root, not inside this repo).
// Mirror of tilawah/src/pager/* — keep in sync.
//
// Hand-rolled 3-page transform slider for the web viewer. Renders only the
// current page plus its prev/next neighbours (never all 604/847). The strip
// tracks the pointer 1:1 during a drag (peek = two half-pages), and on release
// snaps to the neighbour past a distance/velocity threshold or springs back —
// a flat horizontal slide with a gap, no curl. RTL: dragging RIGHT reveals the
// NEXT page (the next slot sits to the LEFT of current in the track).
//
// Gesture EVENTS are owned by App's `.page-zone` (so the existing pointer/touch/
// wheel handlers — and their tests — keep firing on that element); App forwards
// them here through the imperative handle below (dragMove/dragEnd/slide).
//
// Seamless commit trick: slots are keyed by page number, so when the window
// shifts (e.g. 5→6) the just-revealed neighbour DOM node persists and simply
// becomes the new centre slot at the same screen x — no remount, no flash.

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import Page from './Page.jsx'
import { loadPage } from '../quran/loadPage.js'
import { windowPages } from '../pageSlider/windowPages.js'
import { decideTarget } from '../pageSlider/snapDecision.js'
import {
  SWIPE_DISTANCE_FRACTION,
  SWIPE_VELOCITY_THRESHOLD,
  SNAP_DURATION_MS,
  SNAP_EASING,
} from '../pageSlider/feelConstants.js'

// Px a horizontal move must exceed before it counts as a drag rather than a tap
// (so word-taps / chrome still fire). Independent of page width (which is 0 in
// jsdom) so the tap-vs-drag split is stable everywhere.
const TAP_SLOP = 10
// |dx| must beat this * |dy| to be read as a page swipe — otherwise the gesture
// is vertical and scrolling stays native (mirrors the viewer's prior 1.8 ratio).
const HORIZONTAL_RATIO = 1.8
// Resistance applied when dragging toward a missing neighbour (page 1 / last).
const RUBBER_BAND = 0.3

const MIN_PAGE = 1

// One mounted slot. Self-loads its page from the (shared, cached) loader so a
// prefetched neighbour resolves instantly; shows a skeleton until it lands.
// Only the current slot is interactive — neighbours render read-only (marks
// still shown) and are aria-hidden so off-screen pages stay out of the a11y
// tree (and out of role-based test queries).
function PageSlot({ pageNumber, cfg, current, marks, preview, activeVerseKey, listenMode, onSelectWord, onPlayWord, wasSwipe }) {
  // A slot is keyed by its page number, so `pageNumber` never changes for a
  // given instance — this loads exactly once (cfg only changes on a mushaf
  // switch, which re-mounts the window). State is set only in the async
  // callbacks, never synchronously in the effect body.
  const [data, setData] = useState(null)
  const [err, setErr] = useState(false)
  useEffect(() => {
    let active = true
    loadPage(pageNumber, cfg)
      .then((d) => { if (active) { setData(d); setErr(false) } })
      .catch(() => { if (active) { setData(null); setErr(true) } })
    return () => { active = false }
  }, [pageNumber, cfg])

  if (!data) {
    return err
      ? <div className="page-error" role="alert">Couldn't load this page. Try again.</div>
      : <div className="page-skeleton" />
  }
  return (
    <Page
      page={data}
      pageNumber={pageNumber}
      cfg={cfg}
      marks={marks}
      preview={current ? preview : null}
      onSelectWord={current ? onSelectWord : () => {}}
      onPlayWord={current ? onPlayWord : undefined}
      activeVerseKey={current ? activeVerseKey : null}
      listenMode={current ? listenMode : false}
      wasSwipe={current ? wasSwipe : undefined}
    />
  )
}

const PageSlider = forwardRef(function PageSlider({
  currentPage, cfg, onCommit, onSwipe,
  marks, preview, activeVerseKey, listenMode, onSelectWord, onPlayWord, wasSwipe,
}, ref) {
  const maxPage = cfg.totalPages
  const { prev, current, next } = windowPages(currentPage, MIN_PAGE, maxPage)

  const viewportRef = useRef(null)
  const trackRef = useRef(null)
  // pageWidth + gap define the travel per page; base centres the current slot.
  const metricsRef = useRef({ pageWidth: 0, gap: 0, unit: 0, base: 0 })
  const [tx, setTx] = useState(0)
  const [animating, setAnimating] = useState(false)

  const animatingRef = useRef(false)
  const draggingRef = useRef(false)
  const horizLockRef = useRef(0) // 0 undecided, 1 horizontal, -1 vertical
  const commitTimerRef = useRef(null)

  // Live refs so the imperative handle never reads stale props.
  const currentRef = useRef(currentPage)
  const onCommitRef = useRef(onCommit)
  const onSwipeRef = useRef(onSwipe)
  const windowRef = useRef({ prev, next })
  useEffect(() => { currentRef.current = currentPage })
  useEffect(() => { onCommitRef.current = onCommit })
  useEffect(() => { onSwipeRef.current = onSwipe })
  useEffect(() => { windowRef.current = { prev, next } })

  const measure = () => {
    const vp = viewportRef.current
    const pageWidth = vp ? vp.clientWidth : 0
    const track = trackRef.current
    const gapStr = track ? getComputedStyle(track).columnGap : ''
    const gap = parseFloat(gapStr) || 0
    const unit = pageWidth + gap
    metricsRef.current = { pageWidth, gap, unit, base: -unit }
    return metricsRef.current
  }

  const settleToBase = () => {
    measure()
    if (!draggingRef.current && !animatingRef.current) setTx(metricsRef.current.base)
  }

  // Cancel any in-flight snap and hard-centre the (re-keyed) window with no
  // transition. Used when the committed page changes — by our own snap or an
  // external move (browse jump / audio auto-advance). A helper (not inline in
  // the effect) so the reset is one intent, mirrored from settleToBase.
  const cancelAndRecenter = () => {
    clearTimeout(commitTimerRef.current)
    commitTimerRef.current = null
    animatingRef.current = false
    draggingRef.current = false
    horizLockRef.current = 0
    setAnimating(false)
    measure()
    setTx(metricsRef.current.base)
  }

  // Measure on mount + on resize, keeping the resting strip centred.
  useLayoutEffect(() => {
    settleToBase()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(settleToBase)
    if (viewportRef.current) ro.observe(viewportRef.current)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one observer for the slider's life
  }, [])

  // Whenever the committed page changes — by our own snap, or by an external
  // move (browse jump, audio auto-advance) — cancel any animation and re-centre
  // the (re-keyed) window with no transition. For a self-commit this just
  // re-asserts base; for an external jump it hard-cuts (no slide across a gulf).
  // useLayoutEffect: re-centre BEFORE paint so the re-keyed window never shows a
  // frame at the old translate (no flash on commit / external jump).
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: sync the transform to the committed page
    cancelAndRecenter()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recentre only on commit
  }, [currentPage])

  // Animate the strip to a neighbour (dir +1 next / -1 prev) or back (dir 0),
  // then commit the target on settle. The window re-keys so the revealed
  // neighbour becomes the centre slot at the same screen x — seamless.
  const animateTo = (dir, target, refreshSwipe) => {
    const { base, unit } = metricsRef.current
    animatingRef.current = true
    setAnimating(true)
    setTx(base + dir * unit)
    clearTimeout(commitTimerRef.current)
    commitTimerRef.current = setTimeout(() => {
      animatingRef.current = false
      setAnimating(false)
      setTx(metricsRef.current.base)
      if (target != null && target !== currentRef.current) {
        // Refresh the post-swipe click-swallow to the settle moment so the
        // trailing tap from a release is swallowed even though the commit is
        // one snap-duration later (gesture path only).
        if (refreshSwipe) onSwipeRef.current?.()
        onCommitRef.current?.(target)
      }
    }, SNAP_DURATION_MS)
  }

  useImperativeHandle(ref, () => ({
    // Live peek while the user drags. Returns true once it has claimed the
    // gesture as horizontal (so App can suppress native scroll).
    dragMove(dx, dy) {
      if (animatingRef.current) return false
      if (horizLockRef.current === 0) {
        if (Math.abs(dx) < TAP_SLOP && Math.abs(dy) < TAP_SLOP) return false
        horizLockRef.current = Math.abs(dx) > Math.abs(dy) ? 1 : -1
      }
      if (horizLockRef.current !== 1) return false
      draggingRef.current = true
      const { base, unit } = metricsRef.current
      const { prev: p, next: n } = windowRef.current
      let eff = dx
      if ((dx > 0 && n == null) || (dx < 0 && p == null)) eff = dx * RUBBER_BAND
      eff = Math.max(-unit, Math.min(unit, eff)) // at most one page of travel
      setAnimating(false)
      setTx(base + eff)
      return true
    },
    // Release: classify tap/vertical vs swipe, then snap or spring back.
    dragEnd(dx, dy, vx) {
      const peeked = horizLockRef.current === 1 // we actually translated the strip
      draggingRef.current = false
      horizLockRef.current = 0
      if (animatingRef.current) return
      const horizontal = Math.abs(dx) > TAP_SLOP && Math.abs(dx) >= HORIZONTAL_RATIO * Math.abs(dy)
      if (!horizontal) {
        // tap or vertical scroll — let the click through (no swipe). Only spring
        // back if we had peeked; a pure tap never moved, so leave it untouched.
        if (peeked) { setAnimating(true); setTx(metricsRef.current.base) }
        return
      }
      onSwipeRef.current?.() // real swipe → swallow the trailing click now
      const { pageWidth } = metricsRef.current
      const cur = currentRef.current
      const target = decideTarget({
        dx, vx, currentPage: cur, minPage: MIN_PAGE, maxPage,
        distanceThreshold: pageWidth * SWIPE_DISTANCE_FRACTION,
        velocityThreshold: SWIPE_VELOCITY_THRESHOLD,
      })
      const dir = target > cur ? 1 : target < cur ? -1 : 0
      if (dir === 0) { setAnimating(true); setTx(metricsRef.current.base); return }
      animateTo(dir, target, true)
    },
    // External ±1 move (wheel / keyboard / pager chevron) — animate the same path.
    slide(dir) {
      if (animatingRef.current || draggingRef.current) return
      const cur = currentRef.current
      const target = Math.min(maxPage, Math.max(MIN_PAGE, cur + (dir > 0 ? 1 : -1)))
      if (target === cur) return
      animateTo(dir > 0 ? 1 : -1, target, false)
    },
  }), [maxPage])

  const slot = (n, isCurrent) =>
    n == null
      ? <div className="page-slider-slot" key={isCurrent ? 'current' : 'edge'} aria-hidden="true" />
      : (
        <div className={`page-slider-slot${isCurrent ? '' : ' is-neighbor'}`} key={n} aria-hidden={isCurrent ? undefined : true}>
          <PageSlot
            pageNumber={n} cfg={cfg} current={isCurrent}
            marks={marks} preview={preview} activeVerseKey={activeVerseKey}
            listenMode={listenMode} onSelectWord={onSelectWord} onPlayWord={onPlayWord} wasSwipe={wasSwipe}
          />
        </div>
      )

  return (
    <div className="page-slider" ref={viewportRef}>
      <div
        className="page-slider-track"
        ref={trackRef}
        style={{
          transform: `translateX(${tx}px)`,
          transition: animating ? `transform ${SNAP_DURATION_MS}ms ${SNAP_EASING}` : 'none',
        }}
      >
        {/* visual L→R order: next, current, prev — so dragging RIGHT reveals next (RTL) */}
        {slot(next, false)}
        {slot(current, true)}
        {slot(prev, false)}
      </div>
    </div>
  )
})

export default PageSlider
