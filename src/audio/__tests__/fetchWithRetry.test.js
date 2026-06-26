import { describe, it, expect, vi } from 'vitest'
import { fetchAyahsWithRetry } from '../fetchWithRetry.js'

const OK = { reciterId: 7, ayahs: [{ verseKey: '2:6', audioUrl: 'a' }] }
const EMPTY = { reciterId: 7, ayahs: [] }
const noSleep = () => Promise.resolve()

describe('fetchAyahsWithRetry', () => {
  it('returns immediately on first success, no retry', async () => {
    const fetchFn = vi.fn().mockResolvedValue(OK)
    const sleep = vi.fn(noSleep)
    const r = await fetchAyahsWithRetry(fetchFn, ['2:6'], 7, { sleep })
    expect(r).toBe(OK)
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })

  it('retries on empty, then returns the first non-empty result', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(EMPTY).mockResolvedValueOnce(OK)
    const sleep = vi.fn(noSleep)
    const r = await fetchAyahsWithRetry(fetchFn, ['2:6'], 7, { sleep })
    expect(r).toBe(OK)
    expect(fetchFn).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledTimes(1)
  })

  it('exhausts attempts when always empty and returns the last empty result', async () => {
    const fetchFn = vi.fn().mockResolvedValue(EMPTY)
    const sleep = vi.fn(noSleep)
    const r = await fetchAyahsWithRetry(fetchFn, ['2:6'], 7, { attempts: 4, sleep })
    expect(r).toEqual(EMPTY)
    expect(fetchFn).toHaveBeenCalledTimes(4)
    expect(sleep).toHaveBeenCalledTimes(3) // one sleep between each of the 4 attempts
  })

  it('backs off by delay + i*step between attempts', async () => {
    const fetchFn = vi.fn().mockResolvedValue(EMPTY)
    const sleep = vi.fn(noSleep)
    await fetchAyahsWithRetry(fetchFn, ['2:6'], 7, { attempts: 3, delay: 500, step: 400, sleep })
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([500, 900])
  })

  it('passes keys + reciterId straight through to fetchFn', async () => {
    const fetchFn = vi.fn().mockResolvedValue(OK)
    await fetchAyahsWithRetry(fetchFn, ['2:6', '2:7'], 3, { sleep: noSleep })
    expect(fetchFn).toHaveBeenCalledWith(['2:6', '2:7'], 3)
  })
})
