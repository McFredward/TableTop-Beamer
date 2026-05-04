---
phase: 28
slug: cross-cutting-ux-state-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-04
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node --test` (Node 24 builtin) — first phase to introduce automated tests |
| **Config file** | none — `.test.mjs` files in `test/` discovered automatically |
| **Quick run command** | `node --test test/` |
| **Full suite command** | `node --test test/` (same; small suite scope) |
| **Estimated runtime** | ~2 seconds (pure Node, no browser) |

---

## Sampling Rate

- **After every task commit:** Run `node --test test/`
- **After every plan wave:** Run `node --test test/` + manual smoke matrix entries from `28-VERIFICATION.md`
- **Before `/gsd-verify-work`:** Full suite green + Pi /output/ interactive verification
- **Max feedback latency:** ~5 seconds (Node test) + manual smoke

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 28-W0-01 | 00 | 0 | scaffolding | — | N/A | unit | `node --test test/` (smoke) | ❌ Wave 0 | ⬜ pending |
| 28-01-T1 | 01 | 1 | B1-D01 | — | reject path-traversal in `lastUsedProfileName` | unit | `node --test test/board-profile-fields.test.mjs` | ❌ Wave 0 | ⬜ pending |
| 28-01-T2 | 01 | 1 | B1-D02 | — | round-trip server-authoritative state | integration | `node --test test/board-json-roundtrip.test.mjs` | ❌ Wave 0 | ⬜ pending |
| 28-01-T3 | 01 | 1 | B1-D03 fallback | — | default fall-back when name absent | unit | `node --test test/auto-load-fallback.test.mjs` | ❌ Wave 0 | ⬜ pending |
| 28-01-T4 | 01 | 1 | B1-D03 | — | `isDirty()=false` after auto-load | manual | smoke matrix `28-VERIFICATION.md` §B1 | ❌ Wave 0 | ⬜ pending |
| 28-02-T1 | 02 | 2 | B2-D04 | — | gate is server-authoritative, not local | manual | smoke matrix §B2 | ❌ Wave 0 | ⬜ pending |
| 28-02-T2 | 02 | 2 | B2-D05 | — | hint copy locked + tooltip = full sentence | unit (DOM) | `node --test test/dashboard-hint-copy.test.mjs` | ❌ Wave 0 | ⬜ pending |
| 28-02-T3 | 02 | 2 | B2-D06 | — | all 4 entry-points gated | manual | smoke matrix §B2 | ❌ Wave 0 | ⬜ pending |
| 28-03-T1 | 03 | 3 | B3-D07/D08 | — | dirty fires only on effective change | unit (DOM) | `node --test test/asset-picker-dirty-gate.test.mjs` | ❌ Wave 0 | ⬜ pending |
| 28-04-T1 | 04 | 3 | B4-D09 | — | no `window.confirm()` in delete path | unit (DOM) | `node --test test/asset-delete-modal.test.mjs` | ❌ Wave 0 | ⬜ pending |
| 28-04-T2 | 04 | 3 | B4-D10 | — | reuse `TT_BEAMER_RUNTIME_MODAL.showConfirm` | unit | same harness | ❌ Wave 0 | ⬜ pending |
| 28-05-T1 | 05 | 4 | B5-D11 | T-28-01 | server hashes uploads server-side | unit | `node --test test/asset-hash.test.mjs` | ❌ Wave 0 | ⬜ pending |
| 28-05-T2 | 05 | 4 | B5-D12 | T-28-01 | sha256[:12] truncation deterministic | unit | same harness | ❌ Wave 0 | ⬜ pending |
| 28-05-T3 | 05 | 4 | B5-D13 | T-28-01 | manifest persists round-trip | integration | `node --test test/asset-manifest.test.mjs` | ❌ Wave 0 | ⬜ pending |
| 28-05-T4 | 05 | 4 | B5 (re-upload) | T-28-01 | re-upload of same name with diff bytes → new hash → new URL | integration (browser) | manual smoke §B5 | ❌ Wave 0 | ⬜ pending |
| 28-06-T1 | 06 | 5 | B6-D14 | — | dashboard chip in topbar flex (no overlap) | manual | smoke matrix §B6 (visual) | ❌ Wave 0 | ⬜ pending |
| 28-06-T2 | 06 | 5 | B6-D15/D16 | — | toggle reaches /output/ live, identical chip optik | manual | smoke matrix §B6 (multi-window) | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/board-profile-fields.test.mjs` — covers B1-D01 + path-traversal validation
- [ ] `test/board-json-roundtrip.test.mjs` — covers B1-D02 (boards/<id>.json round-trip incl. new field)
- [ ] `test/auto-load-fallback.test.mjs` — covers B1-D03 fallback (no popup when absent)
- [ ] `test/dashboard-hint-copy.test.mjs` — covers B2-D05 locked copy contract
- [ ] `test/asset-picker-dirty-gate.test.mjs` — covers B3-D07 (1/2/3) + B3-D08 (4 cases × dirty assertion)
- [ ] `test/asset-delete-modal.test.mjs` — covers B4-D09/D10 (no confirm + reuse showConfirm)
- [ ] `test/asset-hash.test.mjs` — covers B5-D11/D12 hash-suffix construction + truncation
- [ ] `test/asset-manifest.test.mjs` — covers B5-D13 manifest read/write/sync
- [ ] `28-VERIFICATION.md` — manual smoke matrix for all manual-only items
- [ ] Framework install: **none required** — Node 24's builtin `node --test` covers `*.test.mjs`. No `package.json` deps.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Board-switch auto-load + dirty=false | B1-D03 | Browser DOM + WebSocket roundtrip; needs visual feedback | (1) Create profile A on board X. (2) Switch to board Y. (3) Switch back to X. **Expected:** Profile A loads silently, no popup, dirty-dot is grey. |
| Board-switch save-gate | B2-D04/D06 | Multi-device coordination; requires Pi /output/ + dashboard | (1) On Pi /output/ enter align mode + drag a line. (2) On dashboard try board-select dropdown. **Expected:** dropdown disabled, hint chip visible. (3) Repeat for cluster picker, post-board-delete callback, animation-editor edit-board. |
| Asset re-upload visible immediately | B5 (full chain) | Browser asset cache layers (Image, Video, HTTP) + visual diff | (1) Animation A uses gif `kaputt.gif`. (2) Delete `kaputt.gif`. (3) Upload different bytes named `kaputt.gif`. (4) Trigger Animation A on /output/. **Expected:** new GIF plays within 1s; old does NOT linger. |
| Diagnostic-overlay live-sync | B6-D16 | Multi-client websocket roundtrip + visual confirmation | Open dashboard + /output/ in two windows. Toggle "Show diagnostic overlay" in dashboard. **Expected:** /output/ chip flips visible/hidden within ~200ms. |
| Dashboard topbar chip integration | B6-D14 | Visual layout; CSS regression unsuited to unit test | After phase: open dashboard, enable diagnostic overlay. **Expected:** chip is INLINE in topbar flex, does NOT overlap "TableTop Beamer" logo + version chip. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (Wave 0 introduces the framework so all logic-tasks are automatable)
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < ~5s (Node test) + manual smoke
- [ ] `nyquist_compliant: true` set in frontmatter (after Wave 0 completes)

**Approval:** pending
