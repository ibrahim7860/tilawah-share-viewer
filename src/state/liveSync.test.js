import { describe, it, expect } from 'vitest'
import { canApplySnapshot } from './liveSync.js'

// A ping's mistake snapshot is authoritative ONLY when it can't have raced a
// local optimistic write: no write in flight, and none started since the ping
// was sent. Otherwise skip — the next page-flip ping reconciles (eventually
// consistent), so we never clobber an in-flight local mark.
describe('canApplySnapshot', () => {
  it('applies when no write is in flight and none happened since send', () => {
    expect(canApplySnapshot({ pending: 0, seqAtSend: 7, seqNow: 7 })).toBe(true)
  })

  it('skips when a write is in flight', () => {
    expect(canApplySnapshot({ pending: 1, seqAtSend: 7, seqNow: 7 })).toBe(false)
  })

  it('skips when a write started since the ping was sent (stale snapshot)', () => {
    expect(canApplySnapshot({ pending: 0, seqAtSend: 7, seqNow: 8 })).toBe(false)
  })

  it('skips when both in-flight and changed', () => {
    expect(canApplySnapshot({ pending: 2, seqAtSend: 3, seqNow: 9 })).toBe(false)
  })
})
