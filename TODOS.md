# TODOS

## IndoPak viewer: true edge-justification (kashida) — Approach C [deferred]

- **What:** Render IndoPak shared pages with true DigitalKhatt edge-justification
  (kashida letter elongation) so the viewer pixel-matches the app's justified reading
  page, with uniform text size across all pages.
- **Why:** v1 justifies each line by scaling it to fill the width (no kashida), so the
  filled text size varies with line density (denser → smaller). Short/centered pages
  (Fatihah, Baqarah's first page, last page) are the exception: their sparse lines would
  scale UP large enough to overflow the fixed 1/13 row and overlap, so they render at the
  dense-page size and are centered (not stretched). Kashida would let every line fill the
  width at ONE uniform size, like the app.
- **Trigger:** users want uniform text size across pages AND every line flush, or
  pixel-parity with the app's reading page becomes a requirement.
- **Start point:** run the app's DigitalKhatt services (`tilawah/src/quran/digitalkhatt/
  qurantext.service.ts` + `just.service.ts`) headless in Node to bake per-line glyph
  layout for all 847 pages, then render in-browser via canvas/CanvasKit with
  `dk-indopak.otf`. Note: this is effectively the Approach B/C engine-render port —
  scope it as its own spec.
- **Pros:** matches the app exactly.
- **Cons:** ~10x effort vs v1; spends an innovation token (CanvasKit/WASM in a static
  SPA); highest-risk path.
- **Depends on:** v1 IndoPak viewer (this PR) shipped; spike verdict.
