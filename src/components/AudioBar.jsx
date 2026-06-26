import { useEffect, useRef } from 'react'

export default function AudioBar({ visible, isPlaying, verseKey, reciterName, onPlayPause, onPrev, onNext, onPickReciter, onClose, onMeasure }) {
  const ref = useRef(null)
  // Report the bar's rendered height so the page pager can float just above it
  // (both are bottom-fixed; without this the bar covers the pager). Height
  // varies with safe-area + content, so measure rather than hardcode.
  useEffect(() => {
    const el = ref.current
    if (!visible || !el || typeof ResizeObserver === 'undefined') return
    const report = () => onMeasure?.(el.getBoundingClientRect().height)
    report()
    const ro = new ResizeObserver(report)
    ro.observe(el)
    return () => ro.disconnect()
  }, [visible, onMeasure])

  if (!visible) return null
  return (
    <div className="audio-bar" ref={ref}>
      <div className="audio-bar__meta">
        <span className="audio-bar__verse">{verseKey ? `Ayah ${verseKey}` : 'Recitation'}</span>
        <button className="audio-bar__reciter" onClick={onPickReciter}>{reciterName}</button>
      </div>
      <div className="audio-bar__controls">
        <button onClick={onPrev} aria-label="Previous ayah">⏮</button>
        <button onClick={onPlayPause} aria-label={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? '⏸' : '▶'}</button>
        <button onClick={onNext} aria-label="Next ayah">⏭</button>
        <button className="audio-bar__stop" onClick={onClose} aria-label="Stop">⏹</button>
      </div>
    </div>
  )
}
