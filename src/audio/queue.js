// Pure ayah playback queue + cross-page decision logic. No audio, no fetch — the
// useViewerAudio hook executes the returned action. Mirrors the app's
// src/util/ayahQueue.js so the viewer's cross-page behavior is identical.

export function makeQueue(ayahs, startVerseKey) {
  const idx = ayahs.findIndex((a) => a.verseKey === startVerseKey)
  return { ayahs, index: idx >= 0 ? idx : 0 }
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
  const nq = advance(queue)
  if (!atEnd(nq)) return { action: 'play', queue: nq }
  if (currentPage < maxPage) return { action: 'nextPage', page: currentPage + 1 }
  return { action: 'stop' }
}
