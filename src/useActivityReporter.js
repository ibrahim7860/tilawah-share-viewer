import { useEffect } from 'react'
import { reportActivity } from './api.js'

/** Debounce delay (ms) before a settled page is reported. Rapid flips within
 *  this window collapse to a single ping for the page the viewer lands on. */
export const ACTIVITY_DEBOUNCE_MS = 1200

/**
 * Fire-and-forget page-view reporting, debounced.
 *
 * Reports `page` to the backend once the viewer has settled on it for
 * ~ACTIVITY_DEBOUNCE_MS. Active only when `active` (the viewer is `ready`) and
 * a `token` is present. Each `page` change restarts the timer, so flipping
 * through several pages quickly reports only the final one. The timer is
 * cleared on unmount. Reporting is fire-and-forget — `reportActivity` itself
 * never throws or rejects, so a failing backend never reaches the UI.
 */
export function useActivityReporter(token, page, active) {
  useEffect(() => {
    if (!active || !token) return
    const id = setTimeout(() => { reportActivity(token, page) }, ACTIVITY_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [token, page, active])
}
