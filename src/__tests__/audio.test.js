import { describe, it, expect, afterEach, vi } from 'vitest'
import { fetchPageAudio, fetchReciters } from '../audio.js'

const PAGE_AUDIO = {
  pageNumber: 1,
  reciterId: 7,
  ayahs: [
    { verseKey: '1:1', audioUrl: 'https://verses.quran.com/Alafasy/mp3/001001.mp3' },
    { verseKey: '1:2', audioUrl: 'https://verses.quran.com/Alafasy/mp3/001002.mp3' },
  ],
}

describe('audio.js', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('fetchPageAudio builds /api/quran/audio/page/{n}?reciterId={id}', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => PAGE_AUDIO })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchPageAudio(1, 7)

    expect(result.ayahs).toHaveLength(2)
    const url = fetchMock.mock.calls[0][0]
    expect(url).toContain('/api/quran/audio/page/1')
    expect(url).toContain('reciterId=7')
  })

  it('fetchPageAudio returns empty ayahs on non-ok response (never throws)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502 }))
    const result = await fetchPageAudio(3, 7)
    expect(result.ayahs).toEqual([])
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
