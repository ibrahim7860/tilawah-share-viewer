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
 *
 * The ping response carries the owner's current mistakes (near-live sync). When
 * present they are delivered to `onSnapshot(mistakes, seqAtSend)`, where
 * `seqAtSend` is `writeSeqRef.current` captured at send time so the caller can
 * drop a snapshot that raced a local optimistic write. Both `writeSeqRef` and
 * `onSnapshot` are optional; without them the ping is pure fire-and-forget.
 */
export function useActivityReporter(token, page, active, writeSeqRef, onSnapshot) {
  useEffect(() => {
    if (!active || !token) return
    const id = setTimeout(() => {
      const seqAtSend = writeSeqRef?.current ?? 0
      // Promise.resolve guards against a non-promise return (e.g. a test mock),
      // so the hook never throws even if reportActivity is stubbed.
      Promise.resolve(reportActivity(token, page)).then((mistakes) => {
        if (mistakes && onSnapshot) onSnapshot(mistakes, seqAtSend)
      })
    }, ACTIVITY_DEBOUNCE_MS)
    return () => clearTimeout(id)
    // Intentionally only [token, page, active]: writeSeqRef is a stable ref and
    // onSnapshot is a fresh closure each render that reads current ref values +
    // stable setMarks, so a "stale" closure behaves identically. Adding them
    // would reset the debounce timer on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, active])
}
