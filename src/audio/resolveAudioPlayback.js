// Pure decision: given the page's fetched ayahs and a target verse key, decide
// whether to play, surface "no audio for this ayah", or surface a fetch error.
// No audio, no fetch, no state — App executes the returned action. Mirrors the
// app's src/util/resolveAudioPlayback.js (viewer is page-onward only, so there's
// no `mode`/`endKey`: the queue already plays to page end and auto-advances).
//
//   ayahs empty/null            -> { action: 'error' }    (cold start / fetch failed)
//   verseKey not in ayahs       -> { action: 'noAudio' }  (no recitation for this ayah)
//   otherwise                   -> { action: 'play', startKey }
//                                  (startKey = verseKey, or the first ayah when null)
export function resolveAudioPlayback({ ayahs, verseKey } = {}) {
  if (!ayahs || ayahs.length === 0) return { action: 'error' }
  if (verseKey == null) return { action: 'play', startKey: ayahs[0].verseKey }
  if (!ayahs.some((a) => a.verseKey === verseKey)) return { action: 'noAudio' }
  return { action: 'play', startKey: verseKey }
}
