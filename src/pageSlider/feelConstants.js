// CANON: <workspace-root>/docs/superpowers/specs/2026-06-28-interactive-page-turn-design.md (shared spec at the workspace root, not inside this repo).
// Mirror of tilawah/src/pager/* — keep in sync.
//
// The ONE feel-constants block for the web viewer's drag-to-turn page slider.
// Both products (RN app + this viewer) must feel identical, so these values are
// mirrored from the app's copy and asserted against the spec canon in review.
// If you change a number here, change it in tilawah/src/pager/feelConstants.js
// AND update the design spec.

// Fraction of a page's width a drag must cross to commit to the next/prev page
// (distance threshold = pageWidth * this). Below it (and below the velocity
// threshold) the strip springs back.
export const SWIPE_DISTANCE_FRACTION = 0.25

// Fling speed (px per millisecond) that commits a flip regardless of distance —
// a fast flick past this snaps even on a short drag.
export const SWIPE_VELOCITY_THRESHOLD = 0.3

// How long the snap (commit or spring-back) animation runs.
export const SNAP_DURATION_MS = 250

// Easing for the snap animation. A string because it is fed straight into a CSS
// `transition` (the app uses the matching spring/bezier).
export const SNAP_EASING = 'cubic-bezier(0.25, 0.1, 0.25, 1)'
