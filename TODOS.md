# TODOS

## IndoPak viewer: true edge-justification (kashida) — Approach C [deferred]

- **What:** Render IndoPak shared pages with true DigitalKhatt edge-justification
  (kashida letter elongation) so the viewer pixel-matches the app's justified reading
  page, with uniform text size across all pages.
- **Why:** v1 renders every line at one uniform nastaleeq size. Dense lines fill the
  width naturally; sparse lines (and short pages) are centered rather than stretched —
  so lines are NOT all flush edge-to-edge like the app's kashida-justified page. Kashida
  would let every line fill the width at uniform size.
- **Trigger:** users want every line flush edge-to-edge, or pixel-parity with the app's
  reading page becomes a requirement.
- **Start point:** run the app's DigitalKhatt services (`tilawah/src/quran/digitalkhatt/
  qurantext.service.ts` + `just.service.ts`) headless in Node to bake per-line glyph
  layout for all 847 pages, then render in-browser via canvas/CanvasKit with
  `dk-indopak.otf`. Note: this is effectively the Approach B/C engine-render port —
  scope it as its own spec.
- **Pros:** matches the app exactly.
- **Cons:** ~10x effort vs v1; spends an innovation token (CanvasKit/WASM in a static
  SPA); highest-risk path.
- **Depends on:** v1 IndoPak viewer (this PR) shipped; spike verdict.
