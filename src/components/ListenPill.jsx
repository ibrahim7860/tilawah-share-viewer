import { useRef, useState } from 'react'

// Floating, DRAGGABLE pill shown in Listen mode (all other chrome is dismissed).
//   Idle (nothing playing): [ ✕ ]            — ✕ exits listen mode
//   Active (playing/paused): [ ⏹  ⏸/▶  ✕ ]   — stop · pause/resume · exit
// Starts centered under the top edge (CSS .listen-pill default). Dragging anywhere
// on the pill moves it so it never blocks an ayah the user wants to tap. Drag uses
// Pointer Events (mouse + touch) with a small movement threshold so taps on the
// controls still register; a real drag swallows its trailing click so it doesn't
// fire a button. Rendered as a sibling of the page-zone, so the page's swipe/drag
// page-flip never steals the gesture.
const DRAG_THRESHOLD = 5
const EDGE = 8

export default function ListenPill({ isActive, isPlaying, loading, onStop, onPlayPause, onExit }) {
  const [pos, setPos] = useState(null) // {x,y} once dragged; null → CSS default (top-center)
  const drag = useRef(null)

  const onPointerDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    // Record the press, but DO NOT capture the pointer yet — capturing here
    // would retarget the ensuing `click` to the pill and the control buttons
    // would never fire (you could only drag). Capture is taken on the first real
    // move instead (onPointerMove), so a plain tap reaches its button.
    drag.current = {
      startX: e.clientX, startY: e.clientY,
      baseX: pos ? pos.x : rect.left, baseY: pos ? pos.y : rect.top,
      w: rect.width, h: rect.height, moved: false, captured: false,
      el: e.currentTarget, pointerId: e.pointerId,
    }
  }

  const onPointerMove = (e) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.moved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return
    if (!d.moved) {
      d.moved = true
      // Now that it's a real drag, capture so moves off the pill keep tracking.
      try { d.el.setPointerCapture(d.pointerId); d.captured = true } catch { /* jsdom / unsupported */ }
    }
    const maxX = (typeof window !== 'undefined' ? window.innerWidth : d.w) - d.w - EDGE
    const maxY = (typeof window !== 'undefined' ? window.innerHeight : d.h) - d.h - EDGE
    const x = Math.max(EDGE, Math.min(maxX, d.baseX + dx))
    const y = Math.max(EDGE, Math.min(maxY, d.baseY + dy))
    setPos({ x, y })
  }

  const endDrag = () => {
    const d = drag.current
    if (d?.captured) { try { d.el.releasePointerCapture(d.pointerId) } catch { /* noop */ } }
    // keep `moved` until the trailing click is swallowed (onClickCapture)
  }

  // A genuine drag emits a click on release; swallow it so it never triggers a
  // control. Reset the drag state after the (swallowed or real) click.
  const onClickCapture = (e) => {
    if (drag.current?.moved) { e.preventDefault(); e.stopPropagation() }
    drag.current = null
  }

  const style = pos ? { left: pos.x, top: pos.y, transform: 'none' } : undefined

  return (
    <div
      className="listen-pill"
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={onClickCapture}
    >
      {loading ? (
        <span className="listen-pill__btn" aria-label="Loading audio">
          <span className="audio-spinner" aria-hidden="true" />
        </span>
      ) : isActive ? (
        <>
          <button className="listen-pill__btn listen-pill__stop" onClick={onStop} aria-label="Stop playback">⏹</button>
          <button className="listen-pill__btn" onClick={onPlayPause} aria-label={isPlaying ? 'Pause' : 'Resume'}>{isPlaying ? '⏸' : '▶'}</button>
        </>
      ) : null}
      <button className="listen-pill__btn" onClick={onExit} aria-label="Exit listen mode">✕</button>
    </div>
  )
}
