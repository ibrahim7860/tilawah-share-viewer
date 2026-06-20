# IndoPak support for the shared-Qur'an viewer

Date: 2026-06-18
Repo: `tilawah-share-viewer`
Status: designed + eng-reviewed (Approach A); justification deferred to fast-follow
Related: app PR #14 (`newFeatures`, IndoPak rendering), memory `tilawah-indopak-data-audit`,
viewer `App.jsx` `SUPPORTED_MUSHAFS` note (this is the "THIS MUST CHANGE" it points at)

## Problem

When a share owner's `mushaf_pref` is `INDOPAK13`, the web viewer must render their
Qur'an in the IndoPak 13-line mushaf (847 pages) instead of silently falling back to
Madani. The backend already returns `mushafPref` on `GET /api/share/view`; the viewer
currently logs a warning and renders Madani anyway (`App.jsx` `SUPPORTED_MUSHAFS`).
Everything else (marking, notes, live sync, changelog) must keep working unchanged.

**Load-bearing correctness fact:** marks are stored by `(surah, ayah, startWordIndex,
endWordIndex)` and are mushaf-independent. The viewer renders in the *owner's* mushaf,
and the owner marked in that same mushaf, so word positions are consistent with no
mark translation. This holds **only if** the viewer's generated IndoPak word
`position` values are identical to the app's `indopak-13line` source (see Test plan,
golden test).

## Approach (chosen: A — static, single-font, CSS-justified)

Reuse the app's IndoPak page data and the single 77 KB `indopak-nastaleeq.woff2`
font. Render each page's 13 lines RTL with the browser text shaper; full ayah lines
sit flush via flex `space-between`, short/final/`isCentered` lines center. No live
justification engine.

Approaches **B** (port DigitalKhatt/Skia to CanvasKit, live) and **C** (bake offline
DigitalKhatt glyph layout) were considered and deferred — they reproduce true kashida
edge-justification but pull in the engine/render port (high risk for a static SPA) for
~10x the effort. See NOT in scope + TODOS.

## Data flow

```
BUILD TIME (scripts/extract-indopak.mjs)
  tilawah/src/data/indopak-13line/  ──read──>  normalize  ──write──>  public/pages-indopak/p{1..847}.json
   (lines[] w/ lineType,isCentered,                              (lines[] + words carrying
    words{id,position,text,surah,ayah,                            id,position,text,surah,ayah,
    verse_key,line_number})                                       verse_key,line_number)
  tilawah/assets/fonts/indopak-nastaleeq.woff2  ──copy──>  public/fonts/indopak-nastaleeq.woff2

RUN TIME
  GET /api/share/view ──> { ownerDisplayName, startPage, mushafPref } 
                               │
                               ▼
                       getMushafConfig(mushafPref)              ◄── quran/mushaf.js (single source of truth)
                       { totalPages, linesPerPage, pagesDir,
                         fontFamilyFor(page), buildLayout(page) }
                               │
        ┌──────────────────────┼───────────────────────┐
        ▼                      ▼                        ▼
   nav.js (clamp,        loadPage.js               Page.jsx
   surah/juz tables)     (pagesDir + font)         (cfg.buildLayout → lines;
        │                      │                    space-between vs centered)
        ▼                      ▼                        │
   BrowseDrawer jump      fetch JSON + font             ▼
   correct in IndoPak     (1 font for whole         highlight.js  ◄── script-agnostic matcher:
                          IndoPak session)           word.surah/ayah/position (IndoPak)
                                                      or parent-verse derive (Madani)
```

## Components & decisions

### `quran/mushaf.js` (NEW — central config) [D4]
Single source of truth for what differs per mushaf, mirroring the app's
`scriptConstants.js` / `getScriptConfig`:
```
getMushafConfig(mushafPref) -> {
  id, totalPages, linesPerPage, pagesDir,        // 'MADINA15': 604/15/'/pages'
  fontFamilyFor(pageNumber),                     // 'INDOPAK13': 847/13/'/pages-indopak'
  buildLayout(page, pageNumber),                 // Madani p{N} font per page; IndoPak constant 'indopak-nastaleeq'
}
```
Unknown/blank pref falls back to MADINA15 (matches backend coalesce). `App.jsx`
`SUPPORTED_MUSHAFS` becomes `{'MADINA15','INDOPAK13'}`.

### `quran/nav.js` (script-aware) [D1]
Port the app's IndoPak surah/juz→page tables (`INDOPAK_SURAH_FIRST_PAGES`, IndoPak
juz starts) so `clampPage`, jump-to-surah, and jump-to-juz are correct at 847 pages.
Madani tables stay; selection via `getMushafConfig`. **REGRESSION risk** — Madani
nav must be unchanged.

### `quran/mushafLayout.js` (add IndoPak builder) [D2]
Madani keeps `buildPageLayout` (15-line grid + banner/basmala heuristics). Add
`buildIndoPakLayout(page)` that **trusts the data's explicit `lineType`/`isCentered`**
— no heuristics. `getMushafConfig().buildLayout` dispatches.

### `quran/highlight.js` (script-agnostic matcher) [D2]
Refactor `wordInMark`/`wordBackground` to resolve `(surah, ayah)` for a word via a
small helper: prefer the word's own `surah`/`ayah` (IndoPak carries them), else derive
from the parent verse's `verse_key` (Madani). Match `position` within
`[startWordIndex, endWordIndex]` as today. **REGRESSION risk** — Madani matching must
be unchanged.

### `quran/loadPage.js` (script-aware path/font) [D2/D4]
`pagesDir` and font from `getMushafConfig`. IndoPak fetches `/pages-indopak/p{N}.json`
and registers the one `indopak-nastaleeq` family (loaded once, not per page).
**REGRESSION risk** — Madani path (`/pages/`, per-page `p{N}` font) unchanged.

### `components/Page.jsx` (IndoPak render path)
Consume `cfg.buildLayout`. For IndoPak: render `linesPerPage` lines; `ayah` lines use
flex `space-between` (flush) unless short/final/`isCentered` → center; `surah_name` →
banner; `basmala` → ﷽. Reuse the existing per-line measure/`--fit` downscale. Tap →
`onSelectWord(word, page)` unchanged.

### `scripts/extract-indopak.mjs` (NEW) [D2]
Sibling to `extract-quran-assets.mjs`, sharing font-copy/write helpers. Reads
`tilawah/src/data/indopak-13line/`, emits normalized `public/pages-indopak/p{N}.json`
preserving `position`/`verse_key`/`surah`/`ayah` **verbatim**. Generated JSONs are
committed (matches Madani convention); font tracked via Git LFS.

### Comment hygiene (stale-comment rule)
Update the now-misleading Madani-only comments as part of this change: `App.jsx`
`SUPPORTED_MUSHAFS` block, `nav.js` header, `mushafLayout.js` header, `Page.jsx`
header.

## Implementation order

0. **Font-fidelity spike (throwaway) [D3]** — render p1 + one dense IndoPak page with
   `indopak-nastaleeq.woff2` in Chrome, Safari, and iOS Safari. GATE: if shaping/
   stacking is unacceptable, stop and reconsider (Approach B/C) before building the
   pipeline.
1. `quran/mushaf.js` config + `App.jsx` `SUPPORTED_MUSHAFS`.
2. `scripts/extract-indopak.mjs` + generate `public/pages-indopak/` + font; golden test.
3. `nav.js` IndoPak tables (+ regression test).
4. `mushafLayout.js` `buildIndoPakLayout` + `highlight.js` matcher refactor (+ regression tests).
5. `loadPage.js` script-aware (+ regression test).
6. `Page.jsx` IndoPak render + CSS; comment hygiene.
7. Mocked in-viewer E2E (INDOPAK13 render + mark + reload).

## Test plan [D5]

Vitest. All paths new; 3 are mandatory regressions (modify working Madani code).

- `mushaf.test.js` — config for MADINA15 / INDOPAK13 / unknown→Madani.
- `nav.test.js` — **[REGRESSION]** Madani clamp/surah unchanged; clamp 847; IndoPak
  surahStartPage/juzStartPage for sampled surahs/juz.
- `mushafLayout.test.js` — `buildIndoPakLayout` line types, `isCentered`, ≤13 lines,
  banner from data.
- `highlight.test.js` — **[REGRESSION]** Madani match unchanged; IndoPak match off
  word.surah/ayah/position.
- `loadPage.test.js` — **[REGRESSION]** Madani `/pages/`+`p{N}`; IndoPak
  `/pages-indopak/`+nastaleeq.
- `extract-indopak.test.js` — **golden**: extracted p1/p50/p604/p847 `position`/
  `verse_key` identical to app `indopak-13line` source (proves mark alignment).
- E2E (mocked `/api/share/view` INDOPAK13): render 13-line page, mark a word, reload,
  highlight persists on the same surah:ayah:word.

## Failure modes (new codepaths)

| Codepath | Realistic prod failure | Test? | Error handling? | User sees |
|---|---|---|---|---|
| extract positions drift from app source | marks highlight wrong word | golden test | n/a (build) | wrong highlight (silent) → **golden test is the guard** |
| nastaleeq shaping bad in-browser | unreadable glyphs | spike (manual) | none | broken text → **spike gates this** |
| `getMushafConfig(unknown)` | crash / blank page | unit | fallback→Madani | Madani render (safe) |
| IndoPak page JSON 404 | blank page | — | existing `pageError` path | error state (existing) |
| jump to page>604 in IndoPak | out-of-range | nav unit | clamp to 847 | clamped (safe) |

No failure mode is both untested AND silent AND unhandled → no critical gap, given the
golden test + spike land.

## NOT in scope

- **True DigitalKhatt edge-justification (kashida) in the viewer** — Approach B/C;
  deferred to fast-follow gated on the D3 spike + QA verdict (TODOS).
- **Cross-mushaf mark translation** — never needed; viewer matches the owner's mushaf.
- **App or backend changes** — backend already returns `mushafPref`; app already
  writes IndoPak-positioned marks; marks are mushaf-independent.
- **Converting the Madani path to `lines[]`** — leaves working code alone (Approach C
  in D2 rejected to avoid structural+behavioral change at once).

## What already exists (reused, not rebuilt)

- App IndoPak page data (`tilawah/src/data/indopak-13line/`, 847 pages, line-grouped).
- `indopak-nastaleeq.woff2` (77 KB).
- Viewer static pipeline (`loadPage`/`Page`/`mushafLayout`/`nav`, `pageCache`/
  `fontCache`/`prefetchAround`).
- Backend `mushafPref` on `/api/share/view`; `App.jsx` already reads it.
- App IndoPak nav tables (`INDOPAK_SURAH_FIRST_PAGES`, script-aware `getJuzStartPage`).
- `extract-quran-assets.mjs` (helpers shared by the new IndoPak extractor).

## Parallelization

Mostly sequential (shared `quran/` module + config dependency), with one fan-out:

| Step | Modules | Depends on |
|---|---|---|
| 0 spike | (throwaway) | — |
| 1 mushaf.js + App | quran/, src/ | 0 |
| 2 extract + assets | scripts/, public/ | 1 |
| 3 nav IndoPak | quran/ | 1 |
| 4 layout + highlight | quran/ | 1 |
| 5 loadPage | quran/ | 1 |
| 6 Page + CSS | components/, src/ | 4,5 |
| 7 E2E | src/ | all |

Lane A: 2 (extract/assets — `scripts/`+`public/`, independent of quran/ logic).
Lane B: 3→4→5→6 (all touch `quran/` + `components/`, sequential).
Execution: after step 1, run Lane A ∥ Lane B; merge; then step 7.

## Implementation Tasks
Synthesized from this review's findings. Each derives from a finding above.

- [ ] **T1 (P1, human: ~1h / CC: ~10min)** — mushaf-config — Add `quran/mushaf.js` central config + flip `App.jsx` `SUPPORTED_MUSHAFS`
  - Surfaced by: Architecture D4 — central per-mushaf config
  - Files: `src/quran/mushaf.js`, `src/App.jsx`
  - Verify: `mushaf.test.js` config for MADINA15/INDOPAK13/unknown
- [ ] **T2 (P1, human: ~30min / CC: ~30min)** — spike — Throwaway font-fidelity spike: render p1 + dense IndoPak page in Chrome/Safari/iOS (**GATE**)
  - Surfaced by: Architecture D3 — nastaleeq browser shaping unverified
  - Files: `src/quran/loadPage.js` (temp)
  - Verify: manual visual check in 3 browsers; STOP if unacceptable
- [ ] **T3 (P1, human: ~3h / CC: ~30min)** — extract — `scripts/extract-indopak.mjs` + generate `public/pages-indopak/` + font + golden positions test
  - Surfaced by: D2 normalize-at-extract; D5 mark alignment
  - Files: `scripts/extract-indopak.mjs`, `public/pages-indopak/`, `public/fonts/indopak-nastaleeq.woff2`
  - Verify: golden test — extracted positions == app source (p1/50/604/847)
- [ ] **T4 (P1, human: ~2h / CC: ~15min)** — nav — Port IndoPak surah/juz→page tables into `nav.js` (+ Madani **regression** test)
  - Surfaced by: D1 nav scope (REGRESSION)
  - Files: `src/quran/nav.js`, `src/quran/nav.test.js`
  - Verify: Madani unchanged; clamp 847; IndoPak surah/juz starts correct
- [ ] **T5 (P1, human: ~2h / CC: ~20min)** — layout-highlight — `buildIndoPakLayout` + script-agnostic highlight matcher (+ **regression** tests)
  - Surfaced by: D2 verses[] vs lines[] (REGRESSION)
  - Files: `src/quran/mushafLayout.js`, `src/quran/highlight.js`
  - Verify: Madani match unchanged; IndoPak matches off word.surah/ayah/position
- [ ] **T6 (P1, human: ~1h / CC: ~10min)** — loadpage — `loadPage.js` script-aware pagesDir+font (+ Madani **regression** test)
  - Surfaced by: D2/D4 (REGRESSION)
  - Files: `src/quran/loadPage.js`
  - Verify: Madani `/pages/`+`p{N}`; IndoPak `/pages-indopak/`+nastaleeq
- [ ] **T7 (P1, human: ~2h / CC: ~20min)** — render — `Page.jsx` IndoPak render (space-between/centered) + CSS + stale-comment hygiene
  - Surfaced by: Approach A render; Section 2 comment hygiene
  - Files: `src/components/Page.jsx`, `src/styles.css`
  - Verify: 13-line render; full lines flush, final/centered lines centered
- [ ] **T8 (P2, human: ~1h / CC: ~15min)** — e2e — Mocked in-viewer E2E: INDOPAK13 render + mark + reload persists
  - Surfaced by: D5 mocked E2E
  - Files: `src/App.test.jsx`
  - Verify: highlight persists on same surah:ayah:word after reload

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR (PLAN) | 6 issues, 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

- **VERDICT:** ENG CLEARED — ready to implement. Approach A (static single nastaleeq font, CSS space-between), central `mushaf.js` config, script-agnostic mark matcher; justification (Approach C) deferred to fast-follow gated on the T2 spike. Outside voice skipped by user.

NO UNRESOLVED DECISIONS
