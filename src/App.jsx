import { useEffect, useState } from 'react'
import { readToken } from './token.js'
import { fetchMeta, fetchMistakes, addMistake, updateMistake, deleteMistake, RevokedError } from './api.js'
import { loadPage } from './quran/loadPage.js'
import { upsertMark, removeMark, keyOf, applyWithRollback } from './state/marks.js'
import Page from './components/Page.jsx'
import Header from './components/Header.jsx'
import Legend from './components/Legend.jsx'
import InstructionModal from './components/InstructionModal.jsx'
import UndoSnackbar from './components/UndoSnackbar.jsx'
import ErrorScreen from './components/ErrorScreen.jsx'
import WordActionPopover from './components/WordActionPopover.jsx'

export default function App() {
  const token = readToken()
  const [status, setStatus] = useState('loading') // loading|ready|revoked|badtoken|unsupported
  const [meta, setMeta] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [page, setPage] = useState(null)
  const [marks, setMarks] = useState([])
  const [selected, setSelected] = useState(null)
  const [undo, setUndo] = useState(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [pageError, setPageError] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 4000)
  }

  const onWriteError = (e) => {
    if (e instanceof RevokedError) setStatus('revoked')
    else showToast("Couldn't save — please retry")
  }

  useEffect(() => {
    if (!token) { setStatus('badtoken'); return }
    (async () => {
      try {
        const m = await fetchMeta(token)
        if (m.mushafPref && m.mushafPref !== 'MADINA15') { setMeta(m); setStatus('unsupported'); return }
        setMeta(m); setPageNumber(Math.min(604, Math.max(1, m.startPage || 1)))
        setMarks(await fetchMistakes(token))
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

  const wordIsMarked = (pg, word, mk) => {
    const kv = verseKeyFor(pg, word)
    if (!kv) return false
    const [s, a] = kv
    return mk.surah === s && mk.ayah === a && word.position >= mk.startWordIndex && word.position <= mk.endWordIndex
  }

  const selectWord = (word, pg, el) => {
    const existing = marks.find((mk) => wordIsMarked(pg, word, mk))
    setSelected({ word, anchorRect: el.getBoundingClientRect(), existing })
  }

  const markWord = async (note = null) => {
    const kv = verseKeyFor(page, selected.word); if (!kv) { setSelected(null); return }
    const [s, a] = kv
    const mark = { surah: s, ayah: a, startWordIndex: selected.word.position, endWordIndex: selected.word.position, note }
    setSelected(null)
    await applyWithRollback({
      apply: (cur) => upsertMark(cur, mark),
      revert: (cur) => removeMark(cur, keyOf(mark)),
      setState: setMarks,
      apiCall: () => (note ? updateMistake(token, mark) : addMistake(token, mark)),
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
      apiCall: () => (mark.note ? updateMistake(token, mark) : addMistake(token, mark)),
      onError: onWriteError,
    })
  }

  return (
    <div className="app">
      <Header meta={meta} onHelp={() => setHelpOpen(true)} />
      {page ? <Page page={page} pageNumber={pageNumber} marks={marks} onSelectWord={selectWord} />
        : pageError ? <div className="page-error" role="alert">Couldn't load this page. Try again.</div>
        : <div className="page-skeleton" />}
      <nav className="pager">
        <button disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => p - 1)}>‹ Prev</button>
        <span>Page {pageNumber}</span>
        <button disabled={pageNumber >= 604} onClick={() => setPageNumber((p) => p + 1)}>Next ›</button>
      </nav>
      <Legend />
      <InstructionModal forceOpen={helpOpen} onClose={() => setHelpOpen(false)} />
      {selected && <WordActionPopover existing={selected.existing} anchorRect={selected.anchorRect}
        onMark={() => markWord(null)} onSetNote={(t) => markWord(t)} onDelete={deleteSelected}
        onClose={() => setSelected(null)} />}
      {undo && <UndoSnackbar onUndo={undoDelete} onExpire={() => setUndo(null)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
