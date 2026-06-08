import { describe, it, expect, vi } from 'vitest'
import { keyOf, upsertMark, removeMark, applyWithRollback } from '../src/state/marks.js'

const m = (s,a,p,note) => ({ surah:s, ayah:a, startWordIndex:p, endWordIndex:p, note })

describe('marks store', () => {
  it('upsert replaces a mark at the same key', () => {
    const list = [m(2,5,1,'Word')]
    const out = upsertMark(list, m(2,5,1,'Tajweed'))
    expect(out).toHaveLength(1)
    expect(out[0].note).toBe('Tajweed')
  })
  it('remove deletes by key', () => {
    const list = [m(2,5,1,'Word'), m(2,5,2,'Harakah')]
    expect(removeMark(list, keyOf(m(2,5,1))).map(x=>x.startWordIndex)).toEqual([2])
  })
  it('applyWithRollback reverts state when the api call rejects', async () => {
    const setState = vi.fn()
    let current = [m(2,5,1,'Word')]
    const optimistic = upsertMark(current, m(2,5,2,'Harakah'))
    const failing = () => Promise.reject(new Error('network'))
    const onError = vi.fn()
    await applyWithRollback({ prev: current, next: optimistic, setState, apiCall: failing, onError })
    expect(setState).toHaveBeenNthCalledWith(1, optimistic)
    expect(setState).toHaveBeenLastCalledWith(current)
    expect(onError).toHaveBeenCalled()
  })
})
