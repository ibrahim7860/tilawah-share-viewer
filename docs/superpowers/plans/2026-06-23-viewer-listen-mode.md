# Plan — Port "Listen mode" audio UX to the share viewer

**Date:** 2026-06-23
**Repo:** `tilawah-share-viewer`
**Lands on:** `feat/ayah-audio-playback` (updates open PR #7, base `main`)
**Mirrors:** app PR #34 (`feat/tap-to-select-ayah-audio`) — design doc
`tilawah/docs/superpowers/specs/2026-06-22-tap-to-select-ayah-audio-design.md`

## Goal

Bring the viewer's recitation-audio UX in line with the reworked app UX. The app
replaced *long-press-a-word-to-play* with a **Listen mode**: a 🎧 toggle that
hides the chrome and shows a small **draggable floating pill**; while in Listen
mode, **tapping any ayah plays from there onward**. Whole-page play stays a
dedicated button. The viewer (PR #7) still ships the *old* model
(long-press / right-click = play, single tap = mark a mistake). This plan ports
the new model.

## Why Listen mode is the right port (not "tap = toggle chrome")

The app has two tap regimes:
- **Solo reading** — tap is free, so single tap = toggle chrome; 🎧 enters Listen
  mode where tap = play.
- **Session/listener** — tap is taken by mistake-marking; audio is gated off.

The viewer's single tap is **permanently** taken by mistake-marking (its core
purpose — recipients mark mistakes). So the "tap = toggle chrome" half of PR #34
does **not** apply. **Listen mode does**: it's precisely the mechanism for "tap is
otherwise taken" — a dedicated mode that flips tap from *mark* → *play* and shows
its own controls. That's the clean, faithful port.

## Decisions (confirmed)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Scope | **Full parity**: 🎧 Listen mode (hide chrome + floating pill + tap-to-play), retire long-press/right-click play, keep whole-page ▶ + `AudioBar` for page-play |
| 2 | Pill | **Draggable** (pointer events → mouse + touch), starts top-center, clamps to viewport |
| 3 | 🎧 toggle location | **Pager nav**, beside the existing ▶ play-page button |
| 4 | Branch/PR | **Update PR #7** on `feat/ayah-audio-playback` (open, unmerged — rework supersedes its UX as one coherent feature) |

## App → viewer mapping

| App (PR #34) | Viewer equivalent | Status |
|--------------|-------------------|--------|
| 🎧 toggle in `AudioPlayerBar` | 🎧 button in the **pager nav** (no persistent idle bar in viewer) | **new** |
| `ListenPill.js` (RN, PanResponder) | `ListenPill.jsx` (web, Pointer Events) | **new** |
| `resolveAudioPlayback.js` | `src/audio/resolveAudioPlayback.js` (pure) | **new** |
| `startPlayback` cold-start retry + `playRunRef` token | retry helper + `playRunRef` in `App.jsx` | **new** |
| tap ayah in Listen mode → play from there | word `onClick` branches on `listenMode` | **change** |
| whole-page ▶ in reading bar | pager ▶ `playPageFromStart` | **keep** |
| active-ayah follow-along tint | `word--audio-active` + `activeVerseKey` | **keep (done)** |
| cross-page auto-advance | `onNeedNextPage` / `decideNext` | **keep (done)** |
| `classifyTap.js` (double-tap/long-press arbitration) | not needed — web tap is a plain `click`, no double-tap regime | **skip** |
| long-press / right-click = play | removed | **delete** |

## File-by-file changes

### NEW `src/audio/resolveAudioPlayback.js` (pure)
Mirror of the app helper. `resolveAudioPlayback({ ayahs, verseKey })` →
- `{ action: 'error' }` if `ayahs` empty/null (cold-start / fetch failure),
- `{ action: 'noAudio' }` if `verseKey` not present in `ayahs`,
- `{ action: 'play', startKey }` otherwise (`startKey = verseKey ?? ayahs[0].verseKey`).
(Viewer is page-onward only, so no `mode`/`endKey` — the queue already plays to
page end + auto-advances.)

### NEW `src/audio/fetchWithRetry.js` (pure-ish, testable)
`fetchAyahsWithRetry(fetchFn, keys, reciterId, { attempts = 4, delay = 500, step = 400 })`
— calls `fetchFn`, and while it returns `{ ayahs: [] }` retries up to `attempts`
with backoff `delay + i*step` (Render free-tier cold start returns empty/502 on
the first hit). Returns the first non-empty result or the last empty one. Inject
the timer (or use a passed `sleep`) so Vitest fake timers can drive it.
**Used by both the user tap and cross-page auto-advance** (see `startPlaybackAt`
+ Issue 3) — NOT by `loadNextPage.prefetch`, which stays single-shot
(fire-and-forget warm; a missed prefetch just costs one non-instant advance).

### NEW `src/components/ListenPill.jsx`
Web port of `ListenPill.js`.
- Idle (`!isActive`): `[ ✕ ]` — exit Listen mode.
- Active: `[ ⏹ (red) · ⏸/▶ · ✕ ]` — stop playback / pause-resume / exit.
- Fixed-position, starts top-center; **draggable** via Pointer Events:
  `onPointerDown` captures + records start; `onPointerMove` (past a ~5px
  threshold so taps still register on the buttons) translates; `onPointerUp`
  clamps to viewport bounds. Use `setPointerCapture` for robust drag off-element.
- Props: `isActive, isPlaying, onStop, onPlayPause, onExit`.

### CHANGE `src/components/Page.jsx`
- Thread a new `listenMode` prop down to `AyahLine`.
- Word `<button> onClick`: **apply the post-swipe swallow ONCE, before branching**
  (Issue 2 — the swallow currently lives only in App's `selectWord`, so a
  Listen-mode play path would bypass it and a swipe-onto-a-word would both flip
  AND play). Thread `swipedAt` (or a `wasSwipe()` guard fn) into Page:
  ```js
  onClick={() => {
    if (wasSwipe()) return            // single guard for BOTH paths
    listenMode ? onPlayWord(w, page) : onSelectWord(w, page)
  }}
  ```
- **Remove** the long-press timer (`onPointerDown/Up/Leave` + `_lp`/`_lpTimer`)
  and `onContextMenu` play triggers — Listen mode replaces them. (Nothing else
  uses `_lp`; verified.)
- Keep the active-ayah tint (`word--audio-active`).

### CHANGE `src/App.jsx`
- State: `const [listenMode, setListenMode] = useState(false)`, `playRunRef = useRef(0)`.
- `stopAudio()` helper: `playRunRef.current++; viewerAudio.stop(); setAudioVisible(false)`.
- **NEW unified `startPlaybackAt(verseKey, page)` (Issue 1)** — the single play
  entry point that owns the token + retry + decision. All THREE existing callers
  route through it (tap, reciter-change effect, cross-page auto-advance), closing
  the concurrency hole and the 3-way fetch duplication:
  1. `const myRun = ++playRunRef.current`
  2. `keys = pageVerseKeys(page)`; `{ ayahs } = await fetchAyahsWithRetry(fetchAyahsAudio, keys, reciterIdRef.current)`
  3. after the await, **bail if `playRunRef.current !== myRun`** (stale — a newer tap / stop / exit / reciter-switch superseded it).
  4. `resolveAudioPlayback({ ayahs, verseKey })`: `error` → `showToast("Couldn't load audio — check your connection.")`; `noAudio` → `showToast("No recitation available for this ayah.")`; `play` → `setAudioVisible(true); viewerAudio.start(ayahs, decision.startKey, page)`.
  (Replaces today's silent `if (!ayahs.length) return`.)
- `playFromVerse(verseKey)` becomes a thin wrapper → `startPlaybackAt(verseKey, pageNumber)`.
- **Reciter-change effect (Issue 1):** replace its inline `fetchAyahsAudio` + `start`
  with `startPlaybackAt(viewerAudio.verseKey, pageNumber)` so the switch is
  token-guarded too.
- **`loadNextPage` (Issue 3):** replace its inline fetch + `start` with
  `startPlaybackAt(ayahs[0]?.verseKey ?? firstKeyOfPage, page)` after `goToPage` —
  so auto-advance inherits the retry (a transient empty at a page boundary retries
  instead of silently ending the session; only after retries exhaust does it
  toast + stop). `loadNextPage.prefetch` stays single-shot.
- `enterListenMode()`: `stopAudio(); setBrowseOpen(false); setHelpOpen(false); setSelected(null); setListenMode(true)`.
- `exitListenMode()`: `stopAudio(); setListenMode(false)`.
- Pager: add a 🎧 toggle button next to ▶ → `enterListenMode`.
- Render: when `listenMode`, hide `Header` and the pager (chrome), render
  `<ListenPill … onExit={exitListenMode} onStop={stopAudio}
  onPlayPause={…pause/resume} />` **instead of** `AudioBar`. Outside Listen mode,
  keep `AudioBar` (page-play transport) exactly as-is.
- Pass `listenMode` to `<Page>`; in Listen mode `onPlayWord` (not `onSelectWord`)
  fires from the tapped word's verse key.
- Reciter switch + prev/next stay on `AudioBar` (reading mode) only — Listen
  mode's pill has no transport beyond stop/pause/exit, matching the app.
- Navigation while in Listen mode: keyboard arrows, touch swipe, mouse-drag, and
  trackpad wheel page-flips still work (their listeners are independent of
  chrome), plus cross-page auto-advance — so a hidden pager doesn't trap the user.

### CHANGE `src/components/InstructionModal.jsx`
Add a Listen-mode line: "Tap 🎧 to enter Listen mode, then tap any ayah to hear
it (▶ plays the whole page)."

### CHANGE `src/styles.css`
Add `.listen-pill` + `.listen-pill__btn` (circular tap targets, stop in red,
shadow, `position: fixed; z-index` above the page) and a `.listen-toggle` pager
button. Reuse `--audio-active`. No change to existing `.audio-bar`.

## Testing (TDD — Vitest, the viewer's existing harness)

Target 100% of the 19 new/changed paths from the eng-review coverage diagram.

1. `src/audio/__tests__/resolveAudioPlayback.test.js` — empty/null → error;
   key-absent → noAudio; key-present → play; null verseKey → play from first.
2. `src/audio/__tests__/fetchWithRetry.test.js` — empty-then-success → success;
   all-empty → exhausts `attempts`, returns empty; immediate success → no retry;
   backoff timing via fake timers.
3. `ListenPill` component test — idle renders only ✕; active renders ⏹/⏸/✕; each
   button fires its callback; a pointer drag past threshold does NOT fire a button.
4. **`startPlaybackAt` behavior** (App-level, mock `viewerAudio` + fetch) — stale
   run-token bails (no `start`); `noAudio` → toast, no `start`; `error` after retry
   exhaust → toast; reciter-change routes through it; auto-advance retries a
   transient empty then continues.
5. **Page word-click routing (CRITICAL regression):** in `listenMode` a click calls
   `onPlayWord` not `onSelectWord`; **outside** `listenMode` a click still MARKS
   (`onSelectWord`) — guards against breaking the viewer's core function.
6. **Swipe-swallow (CRITICAL regression, Issue 2):** with a recent `swipedAt`, a
   word click fires NEITHER play nor mark — in both `listenMode` and reading mode.
7. Listen-mode shell — entering hides `Header` + pager + shows `ListenPill`;
   exiting restores chrome and calls `stopAudio`; last-page auto-advance stops
   audio but keeps the pill (idle), does not exit Listen mode.

Drag-vs-flip isolation (pill drag must not trigger a page flip, mouse + touch) is
**[→E2E/manual]** — covered in browser QA, not unit tests.

A test-plan artifact for `/qa` is written to
`~/.gstack/projects/{slug}/…-eng-review-test-plan-…md`.

## Out of scope (unchanged from PR #7)

- The `/api/quran/audio/ayahs` by-verse-key contract, reciter list, queue
  (`decideNext`), cross-page prefetch, active-ayah tint — all already correct.
- No backend changes. No new gestures beyond Listen mode.

## Risks / gotchas

- **Cold start** (Render free tier): first fetch returns empty — the retry +
  toast is the whole point; verify the *first* tap on a fresh page plays (the bug
  the app fixed). Same 604-vs-847 page-cap class is already handled by by-key
  fetch.
- **Concurrency**: rapid taps / stop / exit during the retry window must not let a
  stale `viewerAudio.start` fire — `playRunRef` token guards every await.
- **Pointer-capture drag** vs. the page's swipe/drag flip handlers: the pill is a
  fixed-position sibling and captures the pointer, so its drag won't bubble into
  `onPointerDown` page-flip — verify on touch + mouse.
- **Desktop discoverability**: chrome hidden in Listen mode; nav still works via
  arrows/swipe/wheel — acceptable, but worth a quick QA look.

## Failure modes (per new codepath)

| Codepath | Realistic failure | Test? | Error handling? | User sees |
|----------|-------------------|-------|-----------------|-----------|
| `startPlaybackAt` first tap | cold tier returns empty | ✅ (4) | retry → toast | retry, then "check your connection" |
| `startPlaybackAt` reciter switch | empty on new reciter | ✅ (4) | retry → toast | same |
| auto-advance (`loadNextPage`) | empty at page boundary | ✅ (4) | retry → stop+toast | continues, or toast then stop |
| concurrent tap/stop/exit | stale `start` fires | ✅ (4) | `playRunRef` token | nothing stale plays |
| swipe onto word in Listen mode | flip + play double-fire | ✅ (6) | `wasSwipe()` guard | page flips, no spurious play |
| pill drag | drag triggers page flip | [→E2E] | pill is sibling of page-zone | pill moves only |

No failure mode is both untested AND silent AND unhandled → **no critical gaps.**

## Worktree parallelization

| Step | Modules | Depends on |
|------|---------|------------|
| Pure helpers + tests | `src/audio/` | — |
| `ListenPill` + styles | `src/components/`, `styles.css` | — |
| `App.jsx` + `Page.jsx` wiring | `src/`, `src/components/` | both above |

- **Lane A:** pure helpers (`src/audio/`) — independent.
- **Lane B:** `ListenPill.jsx` + CSS — independent.
- **Lane C:** App/Page wiring — depends on A + B.

Launch A + B in parallel, merge, then C. Small enough that sequential in one
worktree is also fine; the gain is marginal.

## Implementation Tasks
Synthesized from this review's findings. Checkbox as you ship.

- [ ] **T1 (P1, human: ~1h / CC: ~12min)** — App.jsx — unified `startPlaybackAt()` play path
  - Surfaced by: Architecture Issue 1 — 3 un-deduped fetch+play paths, token only guarded tap
  - Files: `src/App.jsx`, `src/audio/resolveAudioPlayback.js`, `src/audio/fetchWithRetry.js`
  - Verify: `startPlaybackAt` tests (#4) green; reciter switch + auto-advance both route through it
- [ ] **T2 (P1, human: ~30min / CC: ~6min)** — Page.jsx — single swipe-swallow guard before mark/play branch
  - Surfaced by: Architecture Issue 2 — swipe-onto-word double-fires flip + play in Listen mode
  - Files: `src/components/Page.jsx`, `src/App.jsx` (thread `swipedAt`)
  - Verify: regression test #6 (no fire after recent swipe, both modes)
- [ ] **T3 (P1, human: ~45min / CC: ~10min)** — ListenPill.jsx + chrome toggle + CSS
  - Surfaced by: scope (full-parity decision) — draggable pill, 🎧 in pager
  - Files: `src/components/ListenPill.jsx`, `src/App.jsx`, `src/styles.css`
  - Verify: ListenPill test #3; manual drag-vs-flip on touch + mouse
- [ ] **T4 (P2, human: ~20min / CC: ~5min)** — cold-start retry on auto-advance
  - Surfaced by: Architecture Issue 3 — page-boundary empty silently ends session
  - Files: `src/App.jsx` (via `startPlaybackAt`)
  - Verify: auto-advance retry case in test #4
- [ ] **T5 (P2, human: ~15min / CC: ~4min)** — retire long-press/right-click play; InstructionModal copy
  - Surfaced by: Code Quality — dead `_lp` path; first-run copy
  - Files: `src/components/Page.jsx`, `src/components/InstructionModal.jsx`
  - Verify: routing test #5 (tap marks outside Listen mode)

## Ship

- Commit onto `feat/ayah-audio-playback`; PR #7 description gets an "UPDATE:
  Listen mode" note (mirroring app PR #34).
- Browser QA: MADINA15 **and** INDOPAK13 share links; touch + mouse; cold start;
  cross-page auto-advance; reciter switch (reading mode); marking still works
  outside Listen mode; drag-vs-flip isolation.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | clean | 3 issues, all folded; 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

- **VERDICT:** ENG CLEARED — ready to implement. Scope FULL_REVIEW, accepted as-is (no reduction). Outside voice skipped by user. Key call: one token-guarded `startPlaybackAt()` is the sole play path (tap + reciter-change + auto-advance), with cold-start retry + a single swipe-swallow guard.

NO UNRESOLVED DECISIONS
