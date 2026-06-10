import { useEffect, useState } from 'react'
import { readToken } from './token.js'
import { fetchMeta, fetchMistakes, addMistake, updateMistake, deleteMistake, RevokedError } from './api.js'
import { loadPage, fontFamilyFor } from './quran/loadPage.js'
import { clampPage, TOTAL_PAGES } from './quran/nav.js'
import { HIGHLIGHT_COLORS, isTemplate, wordInMark } from './quran/highlight.js'
import { upsertMark, removeMark, keyOf, applyWithRollback } from './state/marks.js'
import Page from './components/Page.jsx'
import Header from './components/Header.jsx'
import BrowseDrawer from './components/BrowseDrawer.jsx'
import InstructionModal from './components/InstructionModal.jsx'
import UndoSnackbar from './components/UndoSnackbar.jsx'
import ErrorScreen from './components/ErrorScreen.jsx'
import EditNoteModal from './components/EditNoteModal.jsx'

export default function App() {
  const token = readToken()
  // loading|ready|revoked|badtoken|unsupported — a missing token is known at
  // mount, so it's the lazy initial state (no setState during the effect).
  const [status, setStatus] = useState(() => (token ? 'loading' : 'badtoken'))
  const [meta, setMeta] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [page, setPage] = useState(null)
  const [marks, setMarks] = useState([])
  // selected: { word, existing, preview? } — preview is the template the user
  // tapped in the modal; clearing `selected` (any dismiss path) reverts the
  // live tint structurally, so `marks` stays pure server-state.
  const [selected, setSelected] = useState(null)
  const [undo, setUndo] = useState(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [browseOpen, setBrowseOpen] = useState(false)
  const [pageError, setPageError] = useState(false)
  const [toast, setToast] = useState(null)

  const goToPage = (n) => setPageNumber(clampPage(n))

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

  useEffect(() => {
    if (status !== 'ready') return
    let active = true
    loadPage(pageNumber)
      .then((d) => { if (active) { setPage(d); setPageError(false) } })
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
    // Normalize blank notes to null so an empty save is a plain (red) mark.
    const note = rawNote && String(rawNote).trim() ? rawNote : null

    const coords = coordsForSelection(selected, page)
    if (!coords) { setSelected(null); return }
    const mark = { ...coords, note }
    // Verb by existence (both are upserts server-side; this keeps intent
    // honest): update an existing mark — including clearing its note — via
    // PUT; create a brand-new mark via POST.
    const prev = selected.existing
    setSelected(null)
    await applyWithRollback({
      apply: (cur) => upsertMark(cur, mark),
      // A failed UPDATE must restore the previous mark (old note), not
      // delete it; only a failed CREATE removes the optimistic mark.
      revert: (cur) => (prev ? upsertMark(cur, prev) : removeMark(cur, keyOf(mark))),
      setState: setMarks,
      apiCall: () => (prev ? updateMistake(token, mark) : addMistake(token, mark)),
      onError: onWriteError,
    })
  }

  const deleteSelected = async () => {
    const mark = selected.existing
    setSelected(null); setUndo(mark)
    await applyWithRollback({
      apply: (cur) => removeMark(cur, keyOf(mark)),
      revert: (cur) => upsertMark(cur, mark),
      setState: setMarks,
      apiCall: () => deleteMistake(token, mark),
      onError: onWriteError,
    })
  }

  const undoDelete = async () => {
    const mark = undo; setUndo(null)
    await applyWithRollback({
      apply: (cur) => upsertMark(cur, mark),
      revert: (cur) => removeMark(cur, keyOf(mark)),
      setState: setMarks,
      // The row was just deleted server-side — restoring is a CREATE (the
      // backend upserts, so a racing duplicate is still safe).
      apiCall: () => addMistake(token, mark),
      onError: onWriteError,
    })
  }

  return (
    <div className="app">
      <Header meta={meta} onBrowse={() => setBrowseOpen(true)} onHelp={() => setHelpOpen(true)} />
      {page ? <Page page={page} pageNumber={pageNumber} marks={marks} preview={previewMark} onSelectWord={selectWord} />
        : pageError ? <div className="page-error" role="alert">Couldn't load this page. Try again.</div>
        : <div className="page-skeleton" />}
      <nav className="pager">
        <button className="pager-chevron" aria-label="Previous page" disabled={pageNumber <= 1}
                onClick={() => setPageNumber((p) => p - 1)}>‹</button>
        <button className="page-pill" onClick={() => setBrowseOpen(true)}>Page {pageNumber}</button>
        <button className="pager-chevron" aria-label="Next page" disabled={pageNumber >= TOTAL_PAGES}
                onClick={() => setPageNumber((p) => p + 1)}>›</button>
      </nav>
      {browseOpen && (
        <BrowseDrawer currentPage={pageNumber} onNavigate={goToPage} onClose={() => setBrowseOpen(false)} />
      )}
      <InstructionModal forceOpen={helpOpen} onClose={() => setHelpOpen(false)} />
      {selected && <EditNoteModal key={selected.word.id} word={selected.word} family={fontFamilyFor(pageNumber)}
        existing={selected.existing}
        onSave={(t) => markWord(t)} onDelete={deleteSelected}
        onPreview={(t) => setSelected((s) => (s ? { ...s, preview: t } : s))}
        onClose={() => setSelected(null)} />}
      {undo && <UndoSnackbar onUndo={undoDelete} onExpire={() => setUndo(null)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
