import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'

// Mock the API so the hook's debounce is what we're asserting on, not fetch.
vi.mock('./api.js', () => ({ reportActivity: vi.fn() }))

import { reportActivity } from './api.js'
import { useActivityReporter, ACTIVITY_DEBOUNCE_MS } from './useActivityReporter.js'

function Harness({ token, page, active }) {
  useActivityReporter(token, page, active)
  return null
}

describe('useActivityReporter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    reportActivity.mockClear()
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('reports once after the page settles for the debounce window', () => {
    render(<Harness token="t" page={5} active={true} />)
    expect(reportActivity).not.toHaveBeenCalled()
    vi.advanceTimersByTime(ACTIVITY_DEBOUNCE_MS)
    expect(reportActivity).toHaveBeenCalledTimes(1)
    expect(reportActivity).toHaveBeenCalledWith('t', 5)
  })

  it('collapses rapid page changes into a single report for the final page', () => {
    const { rerender } = render(<Harness token="t" page={1} active={true} />)
    // Flip through 5 pages, each within the debounce window.
    vi.advanceTimersByTime(200); rerender(<Harness token="t" page={2} active={true} />)
    vi.advanceTimersByTime(200); rerender(<Harness token="t" page={3} active={true} />)
    vi.advanceTimersByTime(200); rerender(<Harness token="t" page={4} active={true} />)
    vi.advanceTimersByTime(200); rerender(<Harness token="t" page={5} active={true} />)
    // Nothing fired during the rapid flips.
    expect(reportActivity).not.toHaveBeenCalled()
    // Settle on page 5.
    vi.advanceTimersByTime(ACTIVITY_DEBOUNCE_MS)
    expect(reportActivity).toHaveBeenCalledTimes(1)
    expect(reportActivity).toHaveBeenCalledWith('t', 5)
  })

  it('does not report while not active (viewer not ready)', () => {
    render(<Harness token="t" page={3} active={false} />)
    vi.advanceTimersByTime(ACTIVITY_DEBOUNCE_MS * 2)
    expect(reportActivity).not.toHaveBeenCalled()
  })

  it('does not report when no token is present', () => {
    render(<Harness token={null} page={3} active={true} />)
    vi.advanceTimersByTime(ACTIVITY_DEBOUNCE_MS * 2)
    expect(reportActivity).not.toHaveBeenCalled()
  })

  it('does not fire after unmount (timer cleaned up)', () => {
    const { unmount } = render(<Harness token="t" page={9} active={true} />)
    vi.advanceTimersByTime(200)
    unmount()
    vi.advanceTimersByTime(ACTIVITY_DEBOUNCE_MS)
    expect(reportActivity).not.toHaveBeenCalled()
  })
})
