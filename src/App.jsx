import { useEffect, useRef, useState } from 'react'
import { readToken } from './token.js'
import { fetchMeta, fetchMistakes, addMistake, updateMistake, deleteMistake, RevokedError } from './api.js'
import { useActivityReporter } from './useActivityReporter.js'
import { loadPage, fontFamilyFor, prefetchAround } from './quran/loadPage.js'
import { clampPage, TOTAL_PAGES } from './quran/nav.js'
import { HIGHLIGHT_COLORS, isTemplate, wordInMark } from './quran/highlight.js'
import { upsertMark, removeMark, keyOf, applyWithRollback } from './state/marks.js'
import { canApplySnapshot } from './state/liveSync.js'
import Page from './components/Page.jsx'
import Header from './components/Header.jsx'
import BrowseDrawer from './components/BrowseDrawer.jsx'
import InstructionModal from './components/InstructionModal.jsx'
import UndoSnackbar from './components/UndoSnackbar.jsx'
import ErrorScreen from './components/ErrorScreen.jsx'
import EditNoteModal from './components/EditNoteModal.jsx'
import NamePromptModal from './components/NamePromptModal.jsx'
import { getEditorName, setEditorName } from './identity.js'

export default function App() {
  const token = readToken()
  // loading|ready|revoked|badtoken|unsupported — a missing token is known at
  // mount, so it's the lazy initial state (no setState during the effect).
  const [status, setStatus] = useState(() => (token ? 'loading' : 'badtoken'))
  const [meta, setMeta] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [page, setPage] = useState(null)
  // The page number the currently-rendered `page` data belongs to. It only
  // advances once loadPage() resolves (font + JSON ready), so the per-page QCF
  // font-family always matches the glyphs on screen. `pageNumber` is the flip
  // *target* and updates instantly; pairing the old page's glyphs with the new
  // page's (often not-yet-loaded) font is what flashed fallback letters mid-flip.
  const [loadedPage, setLoadedPage] = useState(1)
  const [marks, setMarks] = useState([])
  // Live-sync race guards: writeSeq bumps on every optimistic write (monotonic);
  // pendingWrites counts in-flight writes. A ping's mistake snapshot is applied
  // only when it can't have raced a local write (see canApplySnapshot).
  const writeSeq = useRef(0)
  const pendingWrites = useRef(0)
  // selected: { word, existing, preview? } — preview is the template the user
  // tapped in the modal; clearing `selected` (any dismiss path) reverts the
  // live tint structurally, so `marks` stays pure server-state.
  const [selected, setSelected] = useState(null)
  const [undo, setUndo] = useState(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [browseOpen, setBrowseOpen] = useState(false)
  const [pageError, setPageError] = useState(false)
  const [toast, setToast] = useState(null)
  // Lazy one-time name capture: { resolve } while the prompt is open, else null.
  const [namePrompt, setNamePrompt] = useState(null)

  // Resolve to the stored editor name, or open the one-time prompt and resolve
  // when the user saves a name. Resolves to null if they cancel (Escape/backdrop)
  // so the calling write path can bail without marking — required-to-edit, but
  // never a trap (eng review 2C).
  const requireName = () =>
    new Promise((resolve) => {
      const existing = getEditorName()
      if (existing) { resolve(existing); return }
      setNamePrompt({ resolve })
    })

  const goToPage = (n) => setPageNumber(clampPage(n))

  // Touch page flipping on the mushaf itself (RTL flip: swipe right → next
  // page, swipe left → previous). Vertical scrolling stays native.
  const touchStart = useRef(null)
  const swipedAt = useRef(0)
  const onTouchStart = (e) => {
    swipedAt.current = 0 // a fresh touch ends the post-swipe click swallow
    // Single-finger only: a pinch's second finger must not register as a
    // swipe between two different fingers.
    if (e.touches.length > 1) { touchStart.current = null; return }
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e) => {
    const s = touchStart.current
    if (e.touches.length > 0) return // other fingers still down (pinch)
    touchStart.current = null
    if (!s || document.querySelector('[role="dialog"]')) return
    const t = e.changedTouches[0]
    const dx = t.clientX - s.x
    const dy = t.clientY - s.y
    if (Math.abs(dx) > 56 && Math.abs(dx) > 1.8 * Math.abs(dy)) {
      swipedAt.current = Date.now()
      setPageNumber((p) => clampPage(p + (dx > 0 ? 1 : -1)))
    }
  }

  // Mouse drag flipping (desktop parity with the touch swipe — same RTL
  // direction and thresholds). pointerType-gated so touch pointers stay with
  // the touch handlers above and never double-fire.
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    swipedAt.current = 0 // a fresh press ends the post-drag click swallow
    const start = { x: e.clientX, y: e.clientY }
    // The drag may end outside the zone (or even the window) — resolve it on
    // a one-shot global pointerup instead of the zone's own.
    window.addEventListener('pointerup', (up) => {
      if (document.querySelector('[role="dialog"]')) return
      const dx = up.clientX - start.x
      const dy = up.clientY - start.y
      if (Math.abs(dx) > 56 && Math.abs(dx) > 1.8 * Math.abs(dy)) {
        swipedAt.current = Date.now() // the drag's trailing click must not mark a word
        setPageNumber((p) => clampPage(p + (dx > 0 ? 1 : -1)))
      }
    }, { once: true })
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 4000)
  }

  const onWriteError = (e) => {
    if (e instanceof RevokedError) setStatus('revoked')
    else showToast("Couldn't save — please retry")
  }

  useEffect(() => {
    if (!token) return
    (async () => {
      try {
        // Independent requests — fetch in parallel (each is a full RTT to the
        // backend, and the cold path used to pay them back-to-back).
        const [m, mks] = await Promise.all([fetchMeta(token), fetchMistakes(token)])
        if (m.mushafPref && m.mushafPref !== 'MADINA15') { setMeta(m); setStatus('unsupported'); return }
        setMeta(m); setPageNumber(clampPage(m.startPage || 1))
        setMarks(mks)
        setStatus('ready')
      } catch (e) { setStatus(e instanceof RevokedError ? 'revoked' : 'badtoken') }
    })()
  }, [token])

  // Trackpad two-finger horizontal swipe (laptop parity with the touch
  // swipe). Native non-passive listener: React delegates wheel as passive, and
  // we must preventDefault so the browser doesn't read the swipe as history
  // back/forward and navigate away from the share view.
  const pageZoneRef = useRef(null)
  useEffect(() => {
    if (status !== 'ready') return
    const zone = pageZoneRef.current
    if (!zone) return
    let acc = 0          // deltaX accumulated within the current gesture
    let last = 0         // timestamp of the previous horizontal wheel event
    let lockedUntil = 0  // swallows the inertia tail after a flip
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return // vertical: not ours
      if (document.querySelector('[role="dialog"]')) return
      e.preventDefault()
      const now = e.timeStamp
      if (now - last > 300) acc = 0 // a quiet gap starts a new gesture
      last = now
      // One flip per continuous gesture: inertial deltas keep extending the
      // lock, so it only clears after the trackpad actually goes quiet.
      if (now < lockedUntil) { lockedUntil = now + 250; return }
      acc += e.deltaX
      if (Math.abs(acc) >= 110) {
        // Natural scrolling: fingers moving right report deltaX < 0 — the
        // same physical motion as the touch swipe right = next page (RTL).
        // (Direction captured NOW: the state updater runs after acc resets.)
        const dir = acc < 0 ? 1 : -1
        acc = 0
        lockedUntil = now + 250
        setPageNumber((p) => clampPage(p + dir))
      }
    }
    zone.addEventListener('wheel', onWheel, { passive: false })
    return () => zone.removeEventListener('wheel', onWheel)
  }, [status])

  // Keyboard page flipping (RTL book: ← advances, → goes back). Inert while
  // any dialog is open or the focus is in a text field.
  useEffect(() => {
    if (status !== 'ready') return
    const onKey = (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      if (e.altKey || e.metaKey || e.ctrlKey) return // browser history shortcuts
      if (document.querySelector('[role="dialog"]')) return
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      setPageNumber((p) => clampPage(p + (e.key === 'ArrowLeft' ? 1 : -1)))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [status])

  // Fire-and-forget: report the page the viewer settles on so the backend can
  // count this sitting as a session for the link owner. Debounced so rapid
  // flipping reports only the landed page, never every intermediate one. Pure
  // observation of pageNumber — does not affect how flips work.
  // Near-live mistake-sync: the page ping returns the owner's current mistakes.
  // Apply them as authoritative server state only when no local write raced the
  // snapshot (no write in flight, none since the ping was sent) — else skip and
  // let the next flip reconcile, so an in-flight optimistic mark is never lost.
  const applyMistakeSnapshot = (mistakes, seqAtSend) => {
    if (canApplySnapshot({ pending: pendingWrites.current, seqAtSend, seqNow: writeSeq.current })) {
      setMarks(mistakes)
    }
  }
  useActivityReporter(token, pageNumber, status === 'ready', writeSeq, applyMistakeSnapshot)

  // Bracket an optimistic write so live-sync knows a write is in flight (and
  // that one happened since any ping was sent). run() is applyWithRollback,
  // which never rejects, so pendingWrites is always balanced.
  const trackWrite = async (run) => {
    writeSeq.current++
    pendingWrites.current++
    try { await run() } finally { pendingWrites.current-- }
  }

  useEffect(() => {
    if (status !== 'ready') return
    let active = true
    loadPage(pageNumber)
      .then((d) => {
        if (!active) return
        setPage(d); setLoadedPage(pageNumber); setPageError(false)
        // Warm the neighbors so the next flip is instant (deployed parity with
        // local disk). Idle-scheduled and network-guarded inside prefetchAround.
        prefetchAround(pageNumber)
      })
      .catch(() => { if (active) { setPage(null); setPageError(true) } })
    return () => { active = false }
  }, [pageNumber, status])

  if (status === 'badtoken') return <ErrorScreen kind="invalid" />
  if (status === 'revoked') return <ErrorScreen kind="revoked" />
  if (status === 'unsupported') return <ErrorScreen kind="unsupported" owner={meta?.ownerDisplayName} />

  const verseKeyFor = (pg, word) => {
    const v = pg.verses.find((vv) => vv.words.some((w) => w.id === word.id))
    return v ? v.verse_key.split(':').map(Number) : null
  }

  const selectWord = (word, pg) => {
    // A swipe that ends on a word also fires its click — swallow it.
    if (Date.now() - swipedAt.current < 350) return
    const existing = marks.find((mk) => wordInMark(pg, word, mk))
    setSelected({ word, existing })
  }

  // Coordinates a save/preview applies to: the existing mark's exact range
  // (which may span words), or the tapped word for a brand-new mark.
  const coordsForSelection = (sel, pg) => {
    if (sel.existing) {
      const e = sel.existing
      return { surah: e.surah, ayah: e.ayah, startWordIndex: e.startWordIndex, endWordIndex: e.endWordIndex }
    }
    const kv = pg ? verseKeyFor(pg, sel.word) : null
    if (!kv) return null
    return { surah: kv[0], ayah: kv[1], startWordIndex: sel.word.position, endWordIndex: sel.word.position }
  }

  // Live-preview range for the word/mark being edited (Edit Note modal open
  // with a template chip picked). Derived, never written into `marks`.
  const previewMark = (() => {
    if (!selected?.preview || !page) return null
    const color = isTemplate(selected.preview) ? HIGHLIGHT_COLORS[selected.preview] : HIGHLIGHT_COLORS.default
    const coords = coordsForSelection(selected, page)
    return coords ? { ...coords, color } : null
  })()

  const markWord = async (rawNote = null) => {
    // Snapshot selection + coords before any await, then CLOSE the edit modal so
    // the name prompt (if needed) doesn't stack on top of it.
    const sel = selected
    const coords = coordsForSelection(sel, page)
    if (!coords) { setSelected(null); return }
    const prev = sel.existing // existing mark → PUT; none → POST (both upsert server-side)
    setSelected(null)

    const editorName = await requireName()
    if (!editorName) return // cancelled name prompt — no write

    // Normalize blank notes to null so an empty save is a plain (red) mark.
    const note = rawNote && String(rawNote).trim() ? rawNote : null
    const mark = { ...coords, note, editorName }
    await trackWrite(() => applyWithRollback({
      apply: (cur) => upsertMark(cur, mark),
      // A failed UPDATE must restore the previous mark (old note), not
      // delete it; only a failed CREATE removes the optimistic mark.
      revert: (cur) => (prev ? upsertMark(cur, prev) : removeMark(cur, keyOf(mark))),
      setState: setMarks,
      apiCall: () => (prev ? updateMistake(token, mark) : addMistake(token, mark)),
      onError: onWriteError,
    }))
  }

  const deleteSelected = async () => {
    const existing = selected.existing
    setSelected(null) // close the edit modal before any name prompt
    const editorName = await requireName()
    if (!editorName) return // cancelled — keep the mark
    const mark = { ...existing, editorName }
    setUndo(mark)
    await trackWrite(() => applyWithRollback({
      apply: (cur) => removeMark(cur, keyOf(mark)),
      revert: (cur) => upsertMark(cur, mark),
      setState: setMarks,
      apiCall: () => deleteMistake(token, mark),
      onError: onWriteError,
    }))
  }

  const undoDelete = async () => {
    const editorName = await requireName()
    if (!editorName) return // cancelled — leave the undo snackbar so they can retry
    const mark = { ...undo, editorName }; setUndo(null)
    await trackWrite(() => applyWithRollback({
      apply: (cur) => upsertMark(cur, mark),
      revert: (cur) => removeMark(cur, keyOf(mark)),
      setState: setMarks,
      // The row was just deleted server-side — restoring is a CREATE (the
      // backend upserts, so a racing duplicate is still safe).
      apiCall: () => addMistake(token, mark),
      onError: onWriteError,
    }))
  }

  return (
    <div className="app">
      <Header meta={meta} onBrowse={() => setBrowseOpen(true)} onHelp={() => setHelpOpen(true)} />
      <div className="page-zone" ref={pageZoneRef}
           onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onPointerDown={onPointerDown}>
        {page ? <Page page={page} pageNumber={loadedPage} marks={marks} preview={previewMark} onSelectWord={selectWord} />
          : pageError ? <div className="page-error" role="alert">Couldn't load this page. Try again.</div>
          : <div className="page-skeleton" />}
      </div>
      <nav className="pager">
        <button className="pager-chevron" aria-label="Previous page" disabled={pageNumber <= 1}
                onClick={() => setPageNumber((p) => p - 1)}>‹</button>
        <button className="page-pill" onClick={() => setBrowseOpen(true)}>
          Page {pageNumber}<span className="page-total"> / {TOTAL_PAGES}</span>
        </button>
        <button className="pager-chevron" aria-label="Next page" disabled={pageNumber >= TOTAL_PAGES}
                onClick={() => setPageNumber((p) => p + 1)}>›</button>
      </nav>
      {browseOpen && (
        <BrowseDrawer currentPage={pageNumber} onNavigate={goToPage} onClose={() => setBrowseOpen(false)} />
      )}
      <InstructionModal forceOpen={helpOpen} onClose={() => setHelpOpen(false)} />
      {selected && <EditNoteModal key={selected.word.id} word={selected.word} family={fontFamilyFor(loadedPage)}
        existing={selected.existing}
        onSave={(t) => markWord(t)} onDelete={deleteSelected}
        onPreview={(t) => setSelected((s) => (s ? { ...s, preview: t } : s))}
        onClose={() => setSelected(null)} />}
      {namePrompt && (
        <NamePromptModal
          onSave={(n) => { const saved = setEditorName(n); namePrompt.resolve(saved); setNamePrompt(null) }}
          onClose={() => { namePrompt.resolve(null); setNamePrompt(null) }}
        />
      )}
      {undo && <UndoSnackbar onUndo={undoDelete} onExpire={() => setUndo(null)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
