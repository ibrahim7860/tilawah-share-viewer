import { describe, it, expect } from 'vitest'
import { decideTarget } from '../src/pageSlider/snapDecision.js'
import {
  SWIPE_DISTANCE_FRACTION,
  SWIPE_VELOCITY_THRESHOLD,
  SNAP_DURATION_MS,
  SNAP_EASING,
} from '../src/pageSlider/feelConstants.js'

// A typical page width; distance threshold = pageWidth * fraction.
const PAGE_W = 400
const DIST = PAGE_W * SWIPE_DISTANCE_FRACTION // 100
const VEL = SWIPE_VELOCITY_THRESHOLD          // 0.3

const base = (over) => ({
  dx: 0,
  vx: 0,
  currentPage: 10,
  minPage: 1,
  maxPage: 604,
  distanceThreshold: DIST,
  velocityThreshold: VEL,
  ...over,
})

describe('decideTarget — distance threshold', () => {
  it('drag RIGHT past the distance threshold → NEXT page', () => {
    expect(decideTarget(base({ dx: DIST }))).toBe(11)
    expect(decideTarget(base({ dx: DIST + 50 }))).toBe(11)
  })

  it('drag LEFT past the distance threshold → PREV page', () => {
    expect(decideTarget(base({ dx: -DIST }))).toBe(9)
    expect(decideTarget(base({ dx: -(DIST + 50) }))).toBe(9)
  })

  it('drag below the distance threshold (and slow) → spring back', () => {
    expect(decideTarget(base({ dx: DIST - 1 }))).toBe(10)
    expect(decideTarget(base({ dx: -(DIST - 1) }))).toBe(10)
  })
})

describe('decideTarget — velocity threshold', () => {
  it('fast flick RIGHT past the velocity threshold (short drag) → NEXT', () => {
    expect(decideTarget(base({ dx: 5, vx: VEL }))).toBe(11)
    expect(decideTarget(base({ dx: 5, vx: VEL + 0.5 }))).toBe(11)
  })

  it('fast flick LEFT past the velocity threshold (short drag) → PREV', () => {
    expect(decideTarget(base({ dx: -5, vx: -VEL }))).toBe(9)
  })

  it('slow drag below both thresholds → spring back', () => {
    expect(decideTarget(base({ dx: 5, vx: VEL - 0.01 }))).toBe(10)
  })

  // Conflict: dragged one way past distance, flicked the OTHER way past velocity.
  // The flick wins (native-pager rule). This is the exact branch where the web and
  // RN mirrors must agree — keep identical with tilawah/src/pager snapDecision test.
  it('drag LEFT past distance + flick RIGHT past velocity → NEXT (flick wins)', () => {
    expect(decideTarget(base({ dx: -(DIST + 20), vx: VEL + 0.2 }))).toBe(11)
  })

  it('drag RIGHT past distance + flick LEFT past velocity → PREV (flick wins)', () => {
    expect(decideTarget(base({ dx: DIST + 20, vx: -(VEL + 0.2) }))).toBe(9)
  })
})

describe('decideTarget — clamp at bounds', () => {
  it('cannot go below page 1 (drag prev at the first page springs back)', () => {
    expect(decideTarget(base({ currentPage: 1, dx: -DIST }))).toBe(1)
    expect(decideTarget(base({ currentPage: 1, dx: -5, vx: -VEL }))).toBe(1)
  })

  it('cannot exceed the Madani max (604)', () => {
    expect(decideTarget(base({ currentPage: 604, maxPage: 604, dx: DIST }))).toBe(604)
    expect(decideTarget(base({ currentPage: 604, maxPage: 604, dx: 5, vx: VEL }))).toBe(604)
  })

  it('cannot exceed the IndoPak max (847)', () => {
    expect(decideTarget(base({ currentPage: 847, maxPage: 847, dx: DIST }))).toBe(847)
    // one short of the IndoPak max still advances
    expect(decideTarget(base({ currentPage: 846, maxPage: 847, dx: DIST }))).toBe(847)
  })
})

describe('feelConstants — canon match (drift guard)', () => {
  it('equals the documented canonical values', () => {
    expect(SWIPE_DISTANCE_FRACTION).toBe(0.25)
    expect(SWIPE_VELOCITY_THRESHOLD).toBe(0.3)
    expect(SNAP_DURATION_MS).toBe(250)
    expect(SNAP_EASING).toBe('cubic-bezier(0.25, 0.1, 0.25, 1)')
  })
})
