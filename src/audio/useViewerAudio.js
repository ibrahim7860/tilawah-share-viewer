import { useCallback, useEffect, useRef, useState } from 'react'
import { makeQueue, decideNext } from './queue.js'

// Sequential ayah playback over a single HTMLAudioElement, with cross-page
// continuation (Amendment 1) and next-ayah / next-page prefetch (Amendment 8).
//
// onAyahChange(verseKey | null) lets the page tint the active ayah.
// onNeedNextPage(page) is called when playback runs off the end of the current
// page's ayahs; the caller loads that page's audio, flips the viewer page, and
// restarts the queue (via start()). currentPage is read live through a ref so
// decideNext always sees the page the queue belongs to.
// maxPage is the active mushaf's last page (604 Madani / 847 IndoPak) — decideNext
// must stop there, so it's threaded in via a ref (changes with cfg).
export function useViewerAudio({ onAyahChange, onNeedNextPage, maxPage = 604 } = {}) {
  const audioRef = useRef(null)
  const prefetchRef = useRef(null)
  const queueRef = useRef({ ayahs: [], index: 0 })
  const currentPageRef = useRef(1)
  const maxPageRef = useRef(maxPage)
  const onNeedNextPageRef = useRef(onNeedNextPage)
  const [isActive, setIsActive] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [verseKey, setVerseKey] = useState(null)

  // Keep the latest onNeedNextPage / maxPage without re-subscribing listeners.
  useEffect(() => { onNeedNextPageRef.current = onNeedNextPage }, [onNeedNextPage])
  useEffect(() => { maxPageRef.current = maxPage }, [maxPage])

  // Lazily get/create the primary <audio> element (outside render to satisfy the
  // refs-during-render rule). The second, never-played element warms the
  // browser's byte cache for the upcoming ayah so playback starts gap-free.
  const getAudio = useCallback(() => {
    if (typeof Audio === 'undefined') return null
    if (!audioRef.current) audioRef.current = new Audio()
    return audioRef.current
  }, [])
  const getPrefetch = useCallback(() => {
    if (typeof Audio === 'undefined') return null
    if (!prefetchRef.current) { prefetchRef.current = new Audio(); prefetchRef.current.preload = 'auto' }
    return prefetchRef.current
  }, [])

  // Warm ayah N+1 (and, near the page end, the next page's audio JSON) so the
  // next advance is instant.
  const prefetch = useCallback((i) => {
    const { ayahs } = queueRef.current
    const nextAyah = ayahs[i + 1]
    const pf = getPrefetch()
    if (nextAyah && pf) pf.src = nextAyah.audioUrl
    // Within one ayah of the page end: ask the caller to fetch the next page's
    // audio early so onNeedNextPage resolves instantly.
    if (i + 1 >= ayahs.length && onNeedNextPageRef.current?.prefetch) {
      onNeedNextPageRef.current.prefetch(currentPageRef.current + 1)
    }
  }, [getPrefetch])

  const playIndex = useCallback((i) => {
    const { ayahs } = queueRef.current
    if (i < 0 || i >= ayahs.length) {
      setIsActive(false); setIsPlaying(false); setVerseKey(null)
      onAyahChange && onAyahChange(null)
      return
    }
    queueRef.current.index = i
    const ayah = ayahs[i]
    setVerseKey(ayah.verseKey)
    onAyahChange && onAyahChange(ayah.verseKey)
    const el = getAudio()
    if (el) {
      el.src = ayah.audioUrl
      el.play().then(() => setIsPlaying(true)).catch(() => {})
    }
    prefetch(i)
  }, [onAyahChange, prefetch, getAudio])

  // Route page-end behavior through the pure decideNext: play the next ayah,
  // hand off to onNeedNextPage at a page boundary, or stop at the last page.
  const step = useCallback(() => {
    const d = decideNext(queueRef.current, currentPageRef.current, maxPageRef.current)
    if (d.action === 'play') { playIndex(d.queue.index); return }
    if (d.action === 'nextPage') {
      const cb = onNeedNextPageRef.current
      const fn = typeof cb === 'function' ? cb : cb?.load
      if (fn) fn(d.page)
      return
    }
    // stop
    audioRef.current?.pause()
    setIsActive(false); setIsPlaying(false); setVerseKey(null)
    onAyahChange && onAyahChange(null)
  }, [playIndex, onAyahChange])

  const start = useCallback((ayahs, startVerseKey, pageNumber) => {
    if (pageNumber != null) currentPageRef.current = pageNumber
    queueRef.current = makeQueue(ayahs, startVerseKey)
    setIsActive(true)
    playIndex(queueRef.current.index)
  }, [playIndex])

  // Keep the page ref in sync so decideNext judges boundaries against the page
  // the queue actually belongs to.
  const setCurrentPage = useCallback((p) => { currentPageRef.current = p }, [])

  const pause = useCallback(() => { audioRef.current?.pause(); setIsPlaying(false) }, [])
  const resume = useCallback(() => { audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {}) }, [])
  const next = useCallback(() => step(), [step])
  // Mirror the app's rewind: never go below the first ayah (index 0), keep
  // playing it — playIndex(-1) would stop, which is wrong (N1).
  const prev = useCallback(() => playIndex(Math.max(0, queueRef.current.index - 1)), [playIndex])

  // Pause + release the src on BOTH the primary and prefetch elements so a closed
  // player (or unmount) leaves no buffering/playing audio (I3/N3).
  const releaseAudio = useCallback(() => {
    for (const el of [audioRef.current, prefetchRef.current]) {
      if (!el) continue
      // jsdom doesn't implement pause()/load(); guard so teardown stays clean.
      try { el.pause() } catch { /* noop */ }
      el.removeAttribute('src')
      try { el.load() } catch { /* noop */ }
    }
  }, [])

  const stop = useCallback(() => {
    releaseAudio()
    setIsActive(false); setIsPlaying(false); setVerseKey(null)
    onAyahChange && onAyahChange(null)
  }, [onAyahChange, releaseAudio])

  useEffect(() => {
    const el = getAudio()
    if (!el) return
    const onEnded = () => step()
    el.addEventListener('ended', onEnded)
    return () => el.removeEventListener('ended', onEnded)
  }, [step, getAudio])

  // On unmount, stop and free both elements.
  useEffect(() => () => releaseAudio(), [releaseAudio])

  return { start, setCurrentPage, pause, resume, next, prev, stop, isActive, isPlaying, verseKey }
}
