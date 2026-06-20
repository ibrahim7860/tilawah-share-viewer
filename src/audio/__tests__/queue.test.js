import { describe, it, expect } from 'vitest'
import { makeQueue, decideNext } from '../queue.js'

const A = [
  { verseKey: '1:1', audioUrl: 'a' },
  { verseKey: '1:2', audioUrl: 'b' },
]

describe('decideNext', () => {
  it('plays the next ayah mid-page', () => {
    expect(decideNext(makeQueue(A, '1:1'), 1).action).toBe('play')
  })
  it('advances to the next page at page end', () => {
    const r = decideNext(makeQueue(A, '1:2'), 1)
    expect(r).toEqual({ action: 'nextPage', page: 2 })
  })
  it('stops at the last page of the mushaf', () => {
    expect(decideNext(makeQueue(A, '1:2'), 604).action).toBe('stop')
  })
})
