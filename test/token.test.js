import { describe, it, expect } from 'vitest'
import { readToken } from '../src/token.js'

describe('readToken', () => {
  it('reads the token from the URL fragment', () => {
    expect(readToken('https://share.x/#abc123')).toBe('abc123')
  })
  it('returns null when no fragment', () => {
    expect(readToken('https://share.x/')).toBeNull()
    expect(readToken('https://share.x/#')).toBeNull()
  })
})
