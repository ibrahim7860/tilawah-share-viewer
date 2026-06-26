import { describe, it, expect, afterEach, vi } from 'vitest'
import { fetchAyahsAudio, fetchReciters } from '../audio.js'

const AYAHS_AUDIO = {
  reciterId: 7,
  ayahs: [
    { verseKey: '2:6', audioUrl: 'https://verses.quran.com/Alafasy/mp3/002006.mp3' },
    { verseKey: '2:7', audioUrl: 'https://verses.quran.com/Alafasy/mp3/002007.mp3' },
  ],
}

describe('audio.js', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('fetchAyahsAudio builds /api/quran/audio/ayahs?reciterId=..&keys=.. (verse-key, IndoPak-safe)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => AYAHS_AUDIO })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchAyahsAudio(['2:6', '2:7'], 7)

    expect(result.ayahs).toHaveLength(2)
    const url = fetchMock.mock.calls[0][0]
    expect(url).toContain('/api/quran/audio/ayahs')
    expect(url).toContain('reciterId=7')
    // keys joined with comma, url-encoded (the colon becomes %3A)
    expect(url).toContain('keys=2%3A6%2C2%3A7')
  })

  it('fetchAyahsAudio returns empty ayahs on non-ok response (never throws)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502 }))
    const result = await fetchAyahsAudio(['2:6'], 7)
    expect(result.ayahs).toEqual([])
  })

  it('fetchAyahsAudio short-circuits to empty (no fetch) when given no keys', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const result = await fetchAyahsAudio([], 7)
    expect(result.ayahs).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fetchReciters returns parsed list on ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reciters: [{ id: 7, name: 'A', style: 'Murattal' }], defaultReciterId: 7 }),
    }))
    const out = await fetchReciters()
    expect(out.defaultReciterId).toBe(7)
    expect(out.reciters[0].id).toBe(7)
  })

  it('fetchReciters falls back on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502 }))
    const out = await fetchReciters()
    expect(out.defaultReciterId).toBe(7)
    expect(out.reciters[0].name).toBe('Mishary Rashid Alafasy')
  })
})
