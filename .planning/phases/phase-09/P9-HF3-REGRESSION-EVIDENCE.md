# P9-HF3 Regression Evidence

Date: 2026-04-04

## Scope Covered

- Canonical coordinate mapping path for overlay pointer normalization and render pixel mapping.
- Mixed-media lifecycle isolation (`room mp4` no longer sharing outside/global video cache path).
- Configurable MP4 quality/performance controls (tier + cap + floor + thresholds).
- Explicit user-facing failure feedback for command/API timeout/failure via toast + status channel.
- Deterministic sync safety preserved (no mutation ordering/version protocol changes).

## Verification Matrix

### 1) Browser/DPR/fullscreen mapping parity

- **Code checks:**
  - `mapClientPointToNormalized` now resolves pointer coordinates against a canonical stage rect path (no SVG CTM dependency).
  - `getRoomPolygonPixels`, `getShipPolygonPixels`, and `getPlayAreaPolygonsPixels` all route through the same `mapNormalizedPointToPixels` helper.
- **Expected:** control and `/output/final` use the same normalized->pixel contract across resize/fullscreen/DPR changes.

### 2) Mixed-media final-output no cross-type starvation

- **Code checks:**
  - Added dedicated `roomVideoCacheByPath` and `getRoomVideoElement`.
  - Room mp4 rendering path now consumes room-only video elements (outside path remains isolated).
- **Expected:** starting room `malfunction` (`mp4`) cannot tear down or starve GIF room render path.

### 3) Weak-hardware MP4 controls + deterministic degrade/recover

- **Code checks:**
  - New persisted runtime control set `mp4Performance` (`tier`, `renderCap`, `qualityFloor`, `degradeThreshold`, `recoverThreshold`).
  - Runtime pressure logic uses configurable thresholds and deterministic frame skipping (`shouldSkipRoomMp4Frame` seeded by animation id + frame index).
  - UI controls added in Settings for operator tuning.
- **Expected:** weak hardware can trade quality for stable frame pacing without random/non-deterministic behavior.

### 4) Explicit feedback on command/API failure or timeout

- **Code checks:**
  - `emitLiveMutation` now has command timeout via `AbortController` (`LIVE_COMMAND_TIMEOUT_MS`) and explicit status + toast feedback.
  - Save/load API failure paths now produce visible toast errors in addition to status text.
- **Expected:** no silent command/API no-op on failure/timeout paths.

### 5) Sync determinism non-regression

- **Code checks:**
  - Live mutation id/version logic, monotonic apply checks, and pending mutation reconciliation remain unchanged.
  - MP4 performance controls are propagated through runtime snapshot contract (`runtime.mp4Performance`) to keep receiver parity.
- **Expected:** ordering/version/idempotent apply invariants remain stable.

## Static Validation Commands

- `node --check src/app/runtime/runtime-orchestration.js` ✅
- `node --check src/app/lib/state/runtime-state.js` ✅
