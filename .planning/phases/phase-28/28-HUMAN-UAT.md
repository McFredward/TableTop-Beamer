---
status: partial
phase: 28-cross-cutting-ux-state-polish
source: [28-VERIFICATION.md]
started: 2026-05-04T16:35:00Z
updated: 2026-05-04T16:35:00Z
---

## Current Test

[awaiting human testing — 7 items]

## Tests

### 1. B1 board-switch auto-load + dirty=false (visual)
expected: Save profile `alpha` on board A → switch to board B → switch back to A. Profile `alpha` auto-loads silently (no popup), toolbar shows `alpha`, dashboard `#board-select` stays enabled (dirty=false). No "Unsaved on /output/" chip after auto-load.
result: [pending]

### 2. B2 board-switch save-gate cross-device
expected: (1) Pi /output/ enter align mode + drag a line. (2) Dashboard `#board-select` dropdown is disabled with cursor:not-allowed + tooltip = "Unsaved align changes on /output/ — save or discard there first to switch board.". (3) Try dropdown change → bounces back to active board, status feedback shows the locked toast. (4) Same for cluster picker, post-board-delete fallback, animation-editor edit-board entry. (5) On /output/ save/discard → dropdown re-enables (no `disabled` attr, no title).
result: [pending]

### 3. B3 dirty-flag hygiene smoke
expected: Pure-library upload (no animation references the new file) → Apply bar does NOT activate. Selection-match upload with same hash → Apply does NOT activate. Selection-match upload with different bytes → Apply activates. Pure-library delete (asset not used by selected def) → Apply does NOT activate. Selection-match delete → Apply activates.
result: [pending]

### 4. B4 custom delete modal visual smoke
expected: Click Delete on any animation/sound asset → glassmorphism modal appears with title "Delete X?", danger-red Delete button, Cancel button. Esc / click-outside aborts (no fetch). Cancel returns false. Native `window.confirm` dialog never appears.
result: [pending]

### 5. B5 re-upload propagation (asset cache invalidation)
expected: (1) Animation A uses kaputt.gif. (2) Delete kaputt.gif. (3) Upload different bytes named kaputt.gif. (4) Trigger Animation A on /output/. NEW GIF plays within ~1s; old does NOT linger. SUMMARY notes a known limitation: GIF in-memory cache (gifPlaybackCacheByPath) does NOT auto-invalidate — full fix is for MP4 + browser HTTP cache. Manual smoke must confirm whether the user-reported symptom for the gif/video case is resolved.
result: [pending]

### 6. B6 dashboard topbar layout
expected: Dashboard "Show diagnostic overlay" ON → chip appears INLINE inside topbar's `.rd-topbar-actions`, right of theme-toggle, NOT overlapping `#app-version` or `.rd-topbar-brand-title`. Resize 1280px / 1920px / 2560px → no line-break under topbar. /output/ chip stays in TOP-RIGHT corner (position:fixed) unchanged. No z-index conflict with `#align-mode-dirty-hint`.
result: [pending]

### 7. B6 cross-client live-sync (D-16)
expected: Two windows (dashboard + /output/). Toggle "Show diagnostic overlay" in dashboard System tab → /output/ chip flips visible/hidden within ~200ms. Reload /output/ → chip state matches dashboard's last setting. Plan 28-05 Task 1 was AUTO-SKIPPED ("skip — assume it works"); Phase 26 h9 is documented as having wired this path but no live multi-window confirmation has occurred during Phase 28.
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
