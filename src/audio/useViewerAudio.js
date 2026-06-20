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
export function useViewerAudio({ onAyahChange, onNeedNextPage } = {}) {
  const audioRef = useRef(null)
  const prefetchRef = useRef(null)
  const queueRef = useRef({ ayahs: [], index: 0 })
  const currentPageRef = useRef(1)
  const onNeedNextPageRef = useRef(onNeedNextPage)
  const [isActive, setIsActive] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [verseKey, setVerseKey] = useState(null)

  onNeedNextPageRef.current = onNeedNextPage

  if (typeof Audio !== 'undefined') {
    if (!audioRef.current) audioRef.current = new Audio()
    // A second, never-played element used purely to warm the browser's byte
    // cache for the upcoming ayah so playback starts without an audible gap.
    if (!prefetchRef.current) {
      prefetchRef.current = new Audio()
      prefetchRef.current.preload = 'auto'
    }
  }

  // Warm ayah N+1 (and, near the page end, the next page's audio JSON) so the
  // next advance is instant.
  const prefetch = useCallback((i) => {
    const { ayahs } = queueRef.current
    const nextAyah = ayahs[i + 1]
    if (nextAyah && prefetchRef.current) prefetchRef.current.src = nextAyah.audioUrl
    // Within one ayah of the page end: ask the caller to fetch the next page's
    // audio early so onNeedNextPage resolves instantly.
    if (i + 1 >= ayahs.length && onNeedNextPageRef.current?.prefetch) {
      onNeedNextPageRef.current.prefetch(currentPageRef.current + 1)
    }
  }, [])

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
    audioRef.current.src = ayah.audioUrl
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
    prefetch(i)
  }, [onAyahChange, prefetch])

  // Route page-end behavior through the pure decideNext: play the next ayah,
  // hand off to onNeedNextPage at a page boundary, or stop at the last page.
  const step = useCallback(() => {
    const d = decideNext(queueRef.current, currentPageRef.current)
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
  const prev = useCallback(() => playIndex(queueRef.current.index - 1), [playIndex])
  const stop = useCallback(() => {
    audioRef.current?.pause()
    setIsActive(false); setIsPlaying(false); setVerseKey(null)
    onAyahChange && onAyahChange(null)
  }, [onAyahChange])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onEnded = () => step()
    el.addEventListener('ended', onEnded)
    return () => el.removeEventListener('ended', onEnded)
  }, [step])

  return { start, setCurrentPage, pause, resume, next, prev, stop, isActive, isPlaying, verseKey }
}
