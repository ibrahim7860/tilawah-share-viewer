# TODOS

## IndoPak viewer: true edge-justification (kashida) — Approach C [deferred]

- **What:** Render IndoPak shared pages with true DigitalKhatt edge-justification
  (kashida letter elongation) so the viewer pixel-matches the app's justified reading
  page, instead of the v1 CSS `space-between` flush approach.
- **Why:** v1 (Approach A) flushes lines via even inter-word spacing, not kashida. It's
  readable and correct, but won't match the app's justified look.
- **Trigger:** the D3 font-fidelity spike + post-launch QA judge the `space-between`
  look insufficient.
- **Start point:** run the app's DigitalKhatt services (`tilawah/src/quran/digitalkhatt/
  qurantext.service.ts` + `just.service.ts`) headless in Node to bake per-line glyph
  layout for all 847 pages, then render in-browser via canvas/CanvasKit with
  `dk-indopak.otf`. Note: this is effectively the Approach B/C engine-render port —
  scope it as its own spec.
- **Pros:** matches the app exactly.
- **Cons:** ~10x effort vs v1; spends an innovation token (CanvasKit/WASM in a static
  SPA); highest-risk path.
- **Depends on:** v1 IndoPak viewer (this PR) shipped; spike verdict.
