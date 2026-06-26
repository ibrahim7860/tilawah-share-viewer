import { describe, it, expect } from 'vitest'
import { makeQueue, decideNext, firstNewKey } from '../queue.js'

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

  // Single-ayah mode (Listen-mode tap): play ONLY the tapped ayah, then stop —
  // never advance to the next ayah or page, even mid-page below maxPage.
  it('stops after one ayah when the queue is single, mid-page', () => {
    expect(decideNext(makeQueue(A, '1:1', true), 1, 604).action).toBe('stop')
  })
  it('stops after a single ayah even when more ayahs follow on the page', () => {
    expect(decideNext(makeQueue(A, '1:1', true), 50, 604)).toEqual({ action: 'stop' })
  })
})

describe('firstNewKey (cross-page boundary dedup)', () => {
  it('returns the first key when nothing was played yet', () => {
    expect(firstNewKey(['2:5', '2:6', '2:7'], null)).toBe('2:5')
  })
  it('skips a leading boundary ayah already played on the previous page', () => {
    // 2:5 spans the page break — it ended the previous page, so resume at 2:6.
    expect(firstNewKey(['2:5', '2:6', '2:7'], '2:5')).toBe('2:6')
  })
  it('returns null when the page is entirely the already-played ayah (pure continuation)', () => {
    // A long ayah whose middle fills a whole page — nothing new to recite here.
    expect(firstNewKey(['2:5'], '2:5')).toBeNull()
  })
  it('returns null for an empty page', () => {
    expect(firstNewKey([], '2:5')).toBeNull()
  })
})

describe('makeQueue single flag', () => {
  it('defaults single to false (page-onward play)', () => {
    expect(makeQueue(A, '1:1').single).toBe(false)
  })
  it('carries single=true when requested', () => {
    expect(makeQueue(A, '1:1', true).single).toBe(true)
  })
})
