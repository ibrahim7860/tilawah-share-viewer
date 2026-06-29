// CANON: <workspace-root>/docs/superpowers/specs/2026-06-28-interactive-page-turn-design.md
// (the spec lives at the workspace root, shared by both repos — not inside this repo).
// Mirror of tilawah/src/pager/* — keep BEHAVIORALLY identical (same direction rule below).
//
// Pure decision module: given a drag's displacement + velocity, decide which
// page the strip should settle on. No DOM, no React — 100% branch-tested.

/**
 * Decide the page to snap to after a drag release.
 *
 * Direction (RTL book): a positive `dx` (the finger dragged RIGHT) reveals and
 * commits to the NEXT page (currentPage + 1); a negative `dx` commits to the
 * PREV page (currentPage - 1). A flip commits when EITHER the distance OR the
 * velocity threshold is crossed; otherwise the strip springs back to
 * `currentPage`. The result is always clamped to [minPage, maxPage].
 *
 * @param {object}  o
 * @param {number}  o.dx                 horizontal displacement in px (right = +)
 * @param {number}  o.vx                 release velocity in px/ms (right = +)
 * @param {number}  o.currentPage        the page the strip is currently centred on
 * @param {number}  o.minPage            lowest valid page (1)
 * @param {number}  o.maxPage            highest valid page (604 Madani / 847 IndoPak)
 * @param {number}  o.distanceThreshold  px the drag must cross to commit (pageWidth * fraction)
 * @param {number}  o.velocityThreshold  px/ms a fling must beat to commit
 * @returns {number} integer target page (=== currentPage means spring back)
 */
export function decideTarget({
  dx,
  vx,
  currentPage,
  minPage,
  maxPage,
  distanceThreshold,
  velocityThreshold,
}) {
  // Native-pager rule (keep identical with the RN mirror): a flick decides
  // direction when it beats the velocity threshold, REGARDLESS of how far the
  // finger was dragged the other way. Only when there's no real flick does the
  // drag distance decide. Otherwise spring back. This makes a "drag left, flick
  // right" gesture resolve the same way (= next) in both the viewer and the app.
  let target = currentPage
  if (Math.abs(vx) >= velocityThreshold) {
    target = currentPage + (vx > 0 ? 1 : -1)
  } else if (Math.abs(dx) >= distanceThreshold) {
    target = currentPage + (dx > 0 ? 1 : -1)
  }

  return Math.min(maxPage, Math.max(minPage, target))
}
