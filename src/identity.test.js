import { describe, it, expect, beforeEach } from 'vitest'
import { getEditorName, setEditorName } from './identity.js'

describe('identity', () => {
  beforeEach(() => localStorage.clear())

  it('returns null when unset', () => {
    expect(getEditorName()).toBe(null)
  })

  it('persists a trimmed name', () => {
    setEditorName('  Ahmad  ')
    expect(getEditorName()).toBe('Ahmad')
  })

  it('caps at 50 chars', () => {
    const saved = setEditorName('x'.repeat(80))
    expect(saved.length).toBe(50)
    expect(getEditorName().length).toBe(50)
  })

  it('ignores blank', () => {
    expect(setEditorName('   ')).toBe(null)
    expect(getEditorName()).toBe(null)
  })
})
