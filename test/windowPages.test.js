import { describe, it, expect } from 'vitest'
import { windowPages } from '../src/pageSlider/windowPages.js'

describe('windowPages', () => {
  it('a middle page mounts prev / current / next', () => {
    expect(windowPages(10, 1, 604)).toEqual({ prev: 9, current: 10, next: 11 })
  })

  it('clamps prev to null at the first page', () => {
    expect(windowPages(1, 1, 604)).toEqual({ prev: null, current: 1, next: 2 })
  })

  it('clamps next to null at the Madani max (604)', () => {
    expect(windowPages(604, 1, 604)).toEqual({ prev: 603, current: 604, next: null })
  })

  it('clamps next to null at the IndoPak max (847)', () => {
    expect(windowPages(847, 1, 847)).toEqual({ prev: 846, current: 847, next: null })
  })

  it('a page just inside the IndoPak max still has a next', () => {
    expect(windowPages(846, 1, 847)).toEqual({ prev: 845, current: 846, next: 847 })
  })
})
