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
  it('strips a query string that follows the fragment token', () => {
    expect(readToken('https://share.x/#tok?x=1')).toBe('tok')
  })
  it('reads the token from the fragment even when a query precedes it', () => {
    expect(readToken('https://share.x/?a=1#tok')).toBe('tok')
  })
  it('decodes a percent-encoded token', () => {
    expect(readToken('https://share.x/#a%2Bb%3Dc')).toBe('a+b=c')
  })
  it('strips a second hash from the fragment', () => {
    expect(readToken('https://share.x/#tok#extra')).toBe('tok')
  })
})
