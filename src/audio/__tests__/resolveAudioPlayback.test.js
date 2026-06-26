import { describe, it, expect } from 'vitest'
import { resolveAudioPlayback } from '../resolveAudioPlayback.js'

const AYAHS = [
  { verseKey: '2:6', audioUrl: 'a' },
  { verseKey: '2:7', audioUrl: 'b' },
]

describe('resolveAudioPlayback', () => {
  it('returns error when ayahs is empty (cold start / fetch failure)', () => {
    expect(resolveAudioPlayback({ ayahs: [], verseKey: '2:6' })).toEqual({ action: 'error' })
  })

  it('returns error when ayahs is null/undefined', () => {
    expect(resolveAudioPlayback({ ayahs: null, verseKey: '2:6' })).toEqual({ action: 'error' })
    expect(resolveAudioPlayback({ ayahs: undefined, verseKey: '2:6' })).toEqual({ action: 'error' })
  })

  it('returns noAudio when the requested verseKey is not in the page', () => {
    expect(resolveAudioPlayback({ ayahs: AYAHS, verseKey: '2:99' })).toEqual({ action: 'noAudio' })
  })

  it('returns play from the requested verseKey when present', () => {
    expect(resolveAudioPlayback({ ayahs: AYAHS, verseKey: '2:7' })).toEqual({ action: 'play', startKey: '2:7' })
  })

  it('returns play from the first ayah when verseKey is null (whole-page play)', () => {
    expect(resolveAudioPlayback({ ayahs: AYAHS, verseKey: null })).toEqual({ action: 'play', startKey: '2:6' })
  })

  it('returns play from the first ayah when verseKey is omitted', () => {
    expect(resolveAudioPlayback({ ayahs: AYAHS })).toEqual({ action: 'play', startKey: '2:6' })
  })
})
