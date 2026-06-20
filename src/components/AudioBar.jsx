export default function AudioBar({ visible, isPlaying, verseKey, reciterName, onPlayPause, onPrev, onNext, onPickReciter, onClose }) {
  if (!visible) return null
  return (
    <div className="audio-bar">
      <div className="audio-bar__meta">
        <span className="audio-bar__verse">{verseKey ? `Ayah ${verseKey}` : 'Recitation'}</span>
        <button className="audio-bar__reciter" onClick={onPickReciter}>{reciterName}</button>
      </div>
      <div className="audio-bar__controls">
        <button onClick={onPrev} aria-label="Previous ayah">⏮</button>
        <button onClick={onPlayPause} aria-label={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? '⏸' : '▶'}</button>
        <button onClick={onNext} aria-label="Next ayah">⏭</button>
        <button onClick={onClose} aria-label="Close player">✕</button>
      </div>
    </div>
  )
}
