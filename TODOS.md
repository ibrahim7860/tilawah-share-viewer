# TODOS

## IndoPak viewer: true edge-justification (kashida) — Approach C [deferred]

- **What:** Render IndoPak shared pages with true DigitalKhatt edge-justification
  (kashida letter elongation) so the viewer pixel-matches the app's justified reading
  page, with uniform text size across all pages.
- **Why:** v1 renders IndoPak exactly like quran.com's reading view (confirmed from
  quran.com-frontend-next `src/components/Verse/VerseText.tsx` + `pageUtils.ts`,
  2026-06-19): ONE uniform font size + `justify-content: space-between` on every full
  line, which distributes the line's slack as even inter-word gaps (the mushaf's
  isCentered lines — basmala, surah-end partials — center instead). It does NOT
  kashida-fill, because no per-page glyph IndoPak font exists and a Unicode font can't
  elongate letters. So the inter-word gap size varies slightly with line density (denser
  line → tighter gaps), same as quran.com. Kashida (DigitalKhatt) would instead fill
  every line edge-to-edge with PERFECTLY even spacing at that uniform size, pixel-matching
  the app's reading page. Trigger: only if the slight gap variance becomes unacceptable
  or app-pixel-parity is required.
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
