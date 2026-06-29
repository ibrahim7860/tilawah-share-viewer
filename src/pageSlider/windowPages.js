// CANON: <workspace-root>/docs/superpowers/specs/2026-06-28-interactive-page-turn-design.md (shared spec at the workspace root, not inside this repo).
// Mirror of tilawah/src/pager/* — keep in sync.
//
// Pure windowing module: the 3 pages the slider mounts (current ±1). At the
// edges the missing neighbor is null so the caller renders a placeholder slot
// instead of an out-of-range page. Never returns < minPage or > maxPage.

/**
 * The mounted window around `currentPage`.
 *
 * @param {number} currentPage
 * @param {number} minPage  lowest valid page (1)
 * @param {number} maxPage  highest valid page (604 Madani / 847 IndoPak)
 * @returns {{ prev: number|null, current: number, next: number|null }}
 */
export function windowPages(currentPage, minPage, maxPage) {
  return {
    prev: currentPage > minPage ? currentPage - 1 : null,
    current: currentPage,
    next: currentPage < maxPage ? currentPage + 1 : null,
  }
}
