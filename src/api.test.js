import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reportActivity } from './api.js'

describe('reportActivity', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('POSTs to the activity endpoint with the page body and share token header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    await reportActivity('tok-123', 42)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/share\/view\/activity$/)
    expect(opts.method).toBe('POST')
    expect(opts.headers['X-Share-Token']).toBe('tok-123')
    expect(opts.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(opts.body)).toEqual({ page: 42 })

    vi.unstubAllGlobals()
  })

  it('resolves (never throws) when the underlying request rejects', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    vi.stubGlobal('fetch', fetchMock)

    // Must not throw and must resolve to undefined.
    await expect(reportActivity('tok', 1)).resolves.toBeUndefined()

    vi.unstubAllGlobals()
  })

  it('resolves (never throws) on a non-2xx response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    vi.stubGlobal('fetch', fetchMock)

    await expect(reportActivity('tok', 7)).resolves.toBeUndefined()

    vi.unstubAllGlobals()
  })
})
