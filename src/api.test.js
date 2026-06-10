import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reportActivity } from './api.js'

describe('reportActivity', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('POSTs to the activity endpoint with the page body and share token header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, mistakes: [] }) })
    vi.stubGlobal('fetch', fetchMock)

    await reportActivity('tok-123', 42)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/share\/view\/activity$/)
    expect(opts.method).toBe('POST')
    expect(opts.headers['X-Share-Token']).toBe('tok-123')
    expect(opts.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(opts.body)).toEqual({ page: 42 })
  })

  it('returns the owner mistakes array from the response body on success', async () => {
    const mistakes = [{ surah: 2, ayah: 5, startWordIndex: 1, endWordIndex: 3, note: 'Tajweed' }]
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, mistakes }) })
    vi.stubGlobal('fetch', fetchMock)

    await expect(reportActivity('tok', 244)).resolves.toEqual(mistakes)
  })

  it('resolves to null (never throws) when the underlying request rejects', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(reportActivity('tok', 1)).resolves.toBeNull()
  })

  it('resolves to null (never throws) on a non-2xx response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    vi.stubGlobal('fetch', fetchMock)

    await expect(reportActivity('tok', 7)).resolves.toBeNull()
  })

  it('resolves to null when the body is not valid JSON / has no mistakes', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => { throw new Error('bad json') } })
    vi.stubGlobal('fetch', fetchMock)

    await expect(reportActivity('tok', 7)).resolves.toBeNull()
  })
})
