import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reportActivity, addMistake, updateMistake, deleteMistake } from './api.js'

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

// Eng review 3A: every share-viewer write must carry the recipient's editorName
// (the backend 400s without it). The whole `mark` object is serialized as the
// body, so threading editorName through the caller is what satisfies the contract.
describe('mistake write helpers carry editorName', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

  const okFetch = () =>
    vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })

  it.each([
    ['addMistake', addMistake, 'POST'],
    ['updateMistake', updateMistake, 'PUT'],
    ['deleteMistake', deleteMistake, 'DELETE'],
  ])('%s sends editorName + token in the body/header', async (_name, fn, method) => {
    const fetchMock = okFetch()
    vi.stubGlobal('fetch', fetchMock)

    await fn('tok-9', { surah: 2, ayah: 5, startWordIndex: 3, endWordIndex: 3, note: 'm', editorName: 'Ahmad' })

    const [, opts] = fetchMock.mock.calls[0]
    expect(opts.method).toBe(method)
    expect(opts.headers['X-Share-Token']).toBe('tok-9')
    expect(JSON.parse(opts.body).editorName).toBe('Ahmad')
  })
})
