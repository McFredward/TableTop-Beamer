---
phase: 08-multi-play-area-board-image-import-mars-outside-animations
verified: 2026-04-02T18:03:25Z
status: human_needed
score: 6/6 must-haves verified
human_verification:
  - test: "Fullscreen fit on /output/final under real resize/orientation/fullscreen changes"
    expected: "Canvas/stage stays full-display with no top-left offset or letterbox drift during runtime changes"
    why_human: "Requires live rendering observation across browser/device fullscreen lifecycles"
  - test: "Outside mp4 visibility + seamless loop continuity in long-running session"
    expected: "Outside mp4 remains visible and loops without black frame/replay gap/flicker across start/stop/restart"
    why_human: "Static checks cannot validate perceptual continuity over multi-cycle runtime playback"
  - test: "Image import end-to-end UX"
    expected: "After image upload, new board appears in dropdown immediately and becomes active board with editable empty start"
    why_human: "Needs interactive UI flow and browser file-upload behavior validation"
---

# Phase 8: Multi-Play-Area + Board Image Import + Mars Outside Animations Verification Report

**Phase Goal:** Mehrere getrennte Play-Areas pro Board produktiv nutzbar machen und inside/outside strikt auf die Vereinigungsflaeche aller Play-Areas umstellen; zusaetzlich Board-Import um einfachen Bildupload erweitern, damit neue Boards ohne JSON-Authoring erstellt und danach manuell polygonisiert werden koennen, sowie das verpflichtende Outside-/Inside-Animationspaket der HF-Wellen stabil betreiben.
**Verified:** 2026-04-02T18:03:25Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Operator can create/select/delete multiple play areas per board with guardrails | ✓ VERIFIED | `src/app.js:10815-10900` wires select/rename/create/delete handlers; delete guard prevents last-area removal (`10877-10880`) and uses explicit confirm (`10885-10887`) |
| 2 | Inside/outside rendering and clipping use all play areas (union semantics), not single-area fallback | ✓ VERIFIED | `src/app.js:7322-7330` resolves all play-area polygons; `src/app.js:9624-9648` clips outside/inside over all polygons via path append loop |
| 3 | Board image import supports multipart upload and immediately activates imported board in UI | ✓ VERIFIED | API route `server.mjs:2429-2431` -> `handleBoardImport`; image flow validates types/sizes and saves asset (`1816-1822`, `1923-2054`); client sends `FormData` and auto-activates board (`src/app.js:1682-1726`) |
| 4 | Outside animations are definition-driven with Apply-only commit and conditional mode/direction visibility | ✓ VERIFIED | Outside editor apply path at `src/app.js:11370-11407`; conditional mount/unmount at `5844-5900`; UI section exists in `index.html:358-417` |
| 5 | Boomerang is decommissioned while legacy payloads remain load-tolerant | ✓ VERIFIED | Legacy boomerang keys explicitly ignored in normalization comment+path `src/app.js:2297-2300`; no boomerang UI controls in `index.html:358-417` |
| 6 | Room animation speed/opacity parity covers coded/gif/mp4 with no dedicated GIF-speed slider | ✓ VERIFIED | Single room speed/opacity controls in `index.html:521-531`; runtime applies speed+opacity for gif/mp4/coded in `src/app.js:8528-8589`, including mp4 opacity (`8563`) and speed (`8554-8557`) |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/app.js` | Play-area CRUD, union clipping, import activation, outside/inside/room editor wiring | ✓ VERIFIED | Exists, substantive, and actively wired to DOM handlers/render/runtime paths |
| `server.mjs` | `/api/boards/import` JSON+multipart handling, validation, storage, response payload | ✓ VERIFIED | Exists, substantive, wired in route table (`2429-2431`) and import handlers (`1923-2079`) |
| `src/app/lib/persistence/board-profiles.js` | Legacy -> canonical migration to `playAreas[]` and selected id | ✓ VERIFIED | Migrates `playAreaPolygon`/legacy aliases to `playAreas` (`120-135`) and preserves selected id (`154`) |
| `index.html` | Settings UI sections and controls (Outside/Inside/Room, Apply buttons, speed/opacity) | ✓ VERIFIED | Outside/Inside sections and Apply controls present (`320-417`), room Speed/Opacity present (`521-531`) |
| `src/app/lib/shared/config.js` | Default outside definitions include `outside-sandstorm` mp4 | ✓ VERIFIED | Default outside definitions include mp4 sandstorm and selected default id (`417-434`) |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `src/app.js` | `POST /api/boards/import` | `fetchWithTimeout` JSON + multipart (`FormData`) | ✓ WIRED | Calls at `1582-1589` and `1697-1703`; server route at `server.mjs:2429-2431` |
| `server.mjs` | filesystem + catalog response | `handleImageBoardImport` write + normalized board response | ✓ WIRED | Writes asset/json (`2010-2043`) and returns board/catalog metadata (`2044-2053`) |
| `src/app.js` | board selector runtime state | `ensureImportedBoardInCatalog` + `syncBoardSelectOptions` + `activateImportedBoard` | ✓ WIRED | Flow executes after successful import (`1717-1723`, `1659-1680`, `1729-1741`) |
| Outside editor inputs | outside profile persistence/runtime | `outsideApplyChangesButton` -> `buildOutsideProfileWithSelectedAnimationPatch` -> `setOutsideFxProfile`/emit | ✓ WIRED | Apply handler and persistence at `11370-11407` |
| Room draft controls | runtime rendering | `startRoomAnimationFromDraft` payload -> `drawRoomComposition` | ✓ WIRED | Draft uses speed/opacity (`8673-8681`), runtime consumes in gif/mp4/coded (`8528-8589`) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `src/app.js` board import activation | `parsed.boardId` / normalized board payload | `POST /api/boards/import` response parsed and applied (`1705-1726`) | Yes — API builds normalized board from uploaded image and writes persisted files (`2010-2053`) | ✓ FLOWING |
| `src/app.js` union clipping | `playAreaPolygons` | `state.playAreasByBoard` from CRUD + persisted profiles (`7322-7330`, `10815-10900`) | Yes — clipping loops iterate all polygons for inside/outside (`9624-9648`) | ✓ FLOWING |
| `src/app.js` outside conditional controls | selected outside definition (`assetType`, `assetRef`) | profile selection/draft from outside editor (`11294-11358`) | Yes — conditional mount/unmount executed per selected definition (`5873-5900`) | ✓ FLOWING |
| Room runtime | `animation.speed` + `animation.opacity` | room draft UI -> start payload (`8673-8681`) | Yes — values affect gif/mp4/coded draw paths (`8533-8588`) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Server import/runtime code parses successfully | `node --check server.mjs` | Exit 0 (no syntax errors) | ✓ PASS |
| Client runtime/editor code parses successfully | `node --check src/app.js` | Exit 0 (no syntax errors) | ✓ PASS |
| Sandstorm mp4 asset referenced by defaults exists | `ls resources/nemesis/animations/sandstorm.mp4` | Path exists | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| N/A | `phase-08/PLAN.md` | No `requirements:` frontmatter section; `.planning/REQUIREMENTS.md` not present | ? NEEDS HUMAN/PLANNING INPUT | Requirements source file missing; coverage cannot be machine-mapped to requirement IDs |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `src/app.js` | 3144 | Phrase "not available" in API diagnostic text | ℹ️ Info | User-facing error wording only; not an implementation stub |

### Human Verification Required

### 1. Final Output Fullscreen Reflow

**Test:** Open `/output/final`, switch browser fullscreen on/off, resize window, rotate device/orientation where possible.
**Expected:** Output continues to fit display without top-left crop, offset, or letterbox drift.
**Why human:** Requires visual runtime confirmation across browser/device behavior.

### 2. Outside MP4 Long-Run Continuity

**Test:** Run Outside mp4 repeatedly through start/stop/restart and prolonged loop playback.
**Expected:** Deterministic visibility and seamless loop continuity (no black-frame or replay gap).
**Why human:** Perceptual continuity/flicker detection is not reliable from static analysis.

### 3. Image Import UX Contract

**Test:** Import a board image via settings upload flow with board name/id.
**Expected:** New board appears immediately in dropdown, auto-selected, and starts editable even without initial polygons.
**Why human:** End-to-end browser upload + immediate UI feedback requires interaction testing.

### Gaps Summary

No blocker implementation gaps were found in code for the sampled must-haves. Automated checks indicate the phase capabilities are wired and data-backed. Remaining validation is human runtime UX/visual verification.

---

_Verified: 2026-04-02T18:03:25Z_
_Verifier: the agent (gsd-verifier)_
