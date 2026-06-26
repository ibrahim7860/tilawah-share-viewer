// Pure ayah playback queue + cross-page decision logic. No audio, no fetch — the
// useViewerAudio hook executes the returned action. Mirrors the app's
// src/util/ayahQueue.js so the viewer's cross-page behavior is identical.

// First key on a page that wasn't already played. IndoPak (and Madani) ayahs
// span page breaks, so the same verse_key is the last key of page N and the
// first key of page N+1. On a cross-page handoff we must resume at the first
// key AFTER the just-played one, not re-recite the boundary ayah. Returns null
// when the page has no new key (it's entirely the continuation of an already-
// played ayah) so the caller can skip to the next page.
export function firstNewKey(keys, lastKey) {
  return keys.find((k) => k !== lastKey) ?? null
}

// `single` (Listen-mode tap): play only the start ayah, then stop — see decideNext.
export function makeQueue(ayahs, startVerseKey, single = false) {
  const idx = ayahs.findIndex((a) => a.verseKey === startVerseKey)
  return { ayahs, index: idx >= 0 ? idx : 0, single }
}

export function currentAyah(q) {
  if (q.index < 0 || q.index >= q.ayahs.length) return null
  return q.ayahs[q.index]
}

export function advance(q) {
  return { ...q, index: q.index + 1 }
}

export function atEnd(q) {
  return q.index >= q.ayahs.length
}

// Decide what happens when the current clip finishes.
// Pure: no audio, no fetch — the hook executes the returned action.
export function decideNext(queue, currentPage, maxPage = 604) {
  // Single-ayah mode: stop after the current clip — never advance ayah or page.
  if (queue.single) return { action: 'stop' }
  const nq = advance(queue)
  if (!atEnd(nq)) return { action: 'play', queue: nq }
  if (currentPage < maxPage) return { action: 'nextPage', page: currentPage + 1 }
  return { action: 'stop' }
}
