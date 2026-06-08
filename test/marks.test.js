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
  it('applyWithRollback applies optimistically and reverts only its own mark on reject', async () => {
    // Simulate React state via a mutable cell that runs functional updaters.
    let state = [m(2,5,1,'Word')]
    const setState = vi.fn((updater) => { state = updater(state) })
    const mark = m(2,5,2,'Harakah')
    const failing = () => Promise.reject(new Error('network'))
    const onError = vi.fn()
    await applyWithRollback({
      apply: (cur) => upsertMark(cur, mark),
      revert: (cur) => removeMark(cur, keyOf(mark)),
      setState, apiCall: failing, onError,
    })
    // The added mark was reverted; the original survives.
    expect(state.map(x => x.startWordIndex)).toEqual([1])
    expect(onError).toHaveBeenCalled()
  })

  it('a failed write only reverts its own mark, preserving concurrent edits', async () => {
    // Two interleaved optimistic changes: the first write rejects, the second
    // succeeds. Assert the second change survives the first's rollback.
    let state = []
    const setState = vi.fn((updater) => { state = updater(state) })
    const markA = m(2,5,1,'A')
    const markB = m(2,5,2,'B')

    let rejectA
    const opA = applyWithRollback({
      apply: (cur) => upsertMark(cur, markA),
      revert: (cur) => removeMark(cur, keyOf(markA)),
      setState,
      apiCall: () => new Promise((_, rej) => { rejectA = rej }),
      onError: () => {},
    })

    // Interleave: B applied + succeeds before A rejects.
    await applyWithRollback({
      apply: (cur) => upsertMark(cur, markB),
      revert: (cur) => removeMark(cur, keyOf(markB)),
      setState,
      apiCall: () => Promise.resolve({}),
      onError: () => {},
    })

    // Now A's write fails.
    rejectA(new Error('network'))
    await opA

    // A rolled back, but B (the concurrent edit) is intact.
    expect(state.map(keyOf)).toEqual([keyOf(markB)])
  })
})
