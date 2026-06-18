# TODOS

## IndoPak viewer: true edge-justification (kashida) — Approach C [deferred]

- **What:** Render IndoPak shared pages with true DigitalKhatt edge-justification
  (kashida letter elongation) so the viewer pixel-matches the app's justified reading
  page, with uniform text size across all pages.
- **Why:** v1 justifies by scaling each full line so its natural width fills the
  container (no kashida). Lines are flush edge-to-edge, but because the fill is by
  scaling, text size varies with line density — sparse surah-start pages render larger,
  dense pages smaller. Kashida would keep size uniform AND fill, like the app.
- **Trigger:** users find the per-page text-size variation distracting, or pixel-parity
  with the app's reading page becomes a requirement.
- **Start point:** run the app's DigitalKhatt services (`tilawah/src/quran/digitalkhatt/
  qurantext.service.ts` + `just.service.ts`) headless in Node to bake per-line glyph
  layout for all 847 pages, then render in-browser via canvas/CanvasKit with
  `dk-indopak.otf`. Note: this is effectively the Approach B/C engine-render port —
  scope it as its own spec.
- **Pros:** matches the app exactly.
- **Cons:** ~10x effort vs v1; spends an innovation token (CanvasKit/WASM in a static
  SPA); highest-risk path.
- **Depends on:** v1 IndoPak viewer (this PR) shipped; spike verdict.
