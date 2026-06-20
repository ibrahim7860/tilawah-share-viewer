import { describe, it, expect } from 'vitest'
import { makeQueue, decideNext } from '../queue.js'

const A = [
  { verseKey: '1:1', audioUrl: 'a' },
  { verseKey: '1:2', audioUrl: 'b' },
]

describe('decideNext', () => {
  it('plays the next ayah mid-page', () => {
    expect(decideNext(makeQueue(A, '1:1'), 1, 604).action).toBe('play')
  })

  // Madani (604) boundary
  it('advances to the next page at page end (Madani)', () => {
    const r = decideNext(makeQueue(A, '1:2'), 1, 604)
    expect(r).toEqual({ action: 'nextPage', page: 2 })
  })
  it('stops at the last page of the Madani mushaf (604)', () => {
    expect(decideNext(makeQueue(A, '1:2'), 604, 604).action).toBe('stop')
  })

  // IndoPak (847) boundary — page 604 is mid-mushaf for IndoPak, so it must
  // advance, and it must only stop at 847.
  it('advances past page 604 for IndoPak (847)', () => {
    const r = decideNext(makeQueue(A, '1:2'), 604, 847)
    expect(r).toEqual({ action: 'nextPage', page: 605 })
  })
  it('advances to the next page below the IndoPak end (847)', () => {
    const r = decideNext(makeQueue(A, '1:2'), 846, 847)
    expect(r).toEqual({ action: 'nextPage', page: 847 })
  })
  it('stops at the last page of the IndoPak mushaf (847)', () => {
    expect(decideNext(makeQueue(A, '1:2'), 847, 847).action).toBe('stop')
  })
})
