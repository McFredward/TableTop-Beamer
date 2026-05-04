# Phase 28: Cross-cutting UX & State Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or
> execution agents. Decisions are captured in `28-CONTEXT.md` — this log
> preserves the alternatives considered.

**Date:** 2026-05-04
**Phase:** 28-cross-cutting-ux-state-polish
**Areas discussed:** B1 (per-board profile memory), B3 (asset dirty hygiene), B5 (cache invalidation), B6 (diagnostic overlay UX)

**Locked without discussion (clear-cut from prior context):**
- B2 Board-Switch save-gate — inherits Phase 27 D-04..D-06 pattern verbatim.
- B4 Custom Asset-Delete Modal — copy board-delete modal style 1:1.

---

## B1 — Per-board "last-used profile" memory

### Q1: Trigger semantics

| Option | Description | Selected |
|--------|-------------|----------|
| On Save+Load (Recommended) | Profile is remembered when explicitly saved OR loaded. Discard/reset doesn't change it. Robustest option — works for new + existing profiles. | ✓ |
| Only on Save | Only an explicit save triggers memory. Manually loaded profiles don't persist. | |
| Only on Load | Only an explicit load triggers memory. Save alone doesn't persist. | |

**User's choice:** On Save+Load (Recommended)
**Notes:** No further qualifications.

### Q2: Storage location

| Option | Description | Selected |
|--------|-------------|----------|
| Per-board JSON server-side (Recommended) | Field `lastUsedProfileName` in `config/boards/<id>.json`. Phase 26 pattern, auto-synced. | ✓ |
| localStorage per browser | Per-device, would diverge between Pi /output/ and Dashboard. | |
| Both (server primary, ls fallback) | Server authoritative + ls cache. Resilient but complex. | |

**User's choice:** Per-board JSON server-side (Recommended)
**Notes:** No further qualifications.

---

## B3 — Asset upload/delete dirty-flag hygiene

### Q1: Dirty trigger condition

| Option | Description | Selected |
|--------|-------------|----------|
| Only effective change (Recommended) | Dirty fires only when current selection's referenced asset is changed AND content-hash differs after. Identical re-upload doesn't fire. | ✓ |
| Selected ref change | Dirty fires whenever the currently selected animation references the changed asset, regardless of byte difference. Simpler but false positives possible. | |
| Selected slot affected | Dirty fires if any slot of the active definition references the changed asset (not just selected). Safer but less precise. | |

**User's choice:** Only effective change (Recommended)
**Notes:** No further qualifications.

---

## B5 — Asset cache invalidation strategy

### Q1: Cache-bust mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Content-hash query param (Recommended) | Server computes sha256, client requests `/path/file.gif?v=<hash>`. Both browser cache + in-memory caches invalidate via different URL. | ✓ |
| Mtime/version counter query param | Server tracks per-file upload counter. Simpler than hash, extra state per file. | |
| Server-side rename on upload | Server appends hash to filename. More invasive change to asset storage. | |

**User's choice:** Content-hash query param (Recommended)
**Notes:** No further qualifications.

---

## B6 — Diagnostic overlay UX

### Q1: Dashboard placement

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in der Topbar (Recommended) | Chip enters the topbar's flex container next to the existing version chip. No more overlay overlap. | ✓ |
| Sticky panel below topbar | Chip moves to `top: 60px` so it sits below the topbar baseline. Still floating, no overlap. | |
| Right-side fixed sidebar | Chip moves to a different fixed position outside the topbar. Less invasive but still overlay. | |

**User's choice:** Inline in der Topbar (Recommended)
**Notes:** User's verbal request "ganz oben integriert" maps directly to this.

### Q2: /output/ rendering

| Option | Description | Selected |
|--------|-------------|----------|
| Identische Chip-Optik (Recommended) | Same green-tinted pill top:8px right:8px on /output/. Only change: live-synced via global-config-update. | ✓ |
| Compact /output/-specific variant | Smaller font + higher transparency on /output/. CSS override per output-role. | |
| Identical optik PLUS extra FPS/render-mode info | Chip shows more diag info on /output/. Useful for Pi debugging but more code change. | |

**User's choice:** Identische Chip-Optik (Recommended)
**Notes:** No further qualifications.

---

## Claude's Discretion

- Schema-Form von `lastUsedProfileName` im Board-JSON (nullable string vs. optional field).
- Asset-Manifest-Form (separate file vs. inline vs. sidecar).
- Inline diagnostic chip pixel sizing/spacing.
- Custom-Modal reuse vs. new component (B4).

## Deferred Ideas

- Asset-Versions-History (multiple versions of same asset).
- Multi-/output/ identity / friendly-names.
- Diagnostic-overlay extensions (FPS, render-mode, zone-id inline).
- Asset-library search/filtering.
