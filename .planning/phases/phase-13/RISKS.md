# Phase 13 Risks

## R13-1 Hidden localStorage Call Sites [HIGH]
The runtime (~13k LOC in `runtime-orchestration.js`) has localStorage writes scattered across many features (board profiles, room geometry, special polygons, hit-area calibration, api base, settings subtab). A naive remove-and-replace sweep may miss call sites.
- Mitigation: P13-1-T1 builds a static inventory harness enumerating every call site before any removal; P13-1-T10 closes with a zero-reference static assertion.

## R13-2 Startup Hydration Order Inversion [HIGH]
Today the runtime loads localStorage first, then tries server defaults as a fallback. Inverting this to "server first, block if unreachable" changes the order of state initialization and may expose hidden dependencies.
- Mitigation: Keep the shape of `applyGlobalDefaultsPayloadToState()` stable; replace only the *source* of the payload, not its downstream application path.

## R13-3 Server Offline UX Hard-Block [MEDIUM]
A hard block on server-unreachable may frustrate local-only testing. The Retry button must actually work and recover without a page reload.
- Mitigation: The blocking startup path polls on explicit user Retry click only (no automatic retry loop); on success the full hydration flow runs normally.

## R13-4 Debounce Collision with Live-Sync Apply [MEDIUM]
The client emits debounced writes while also receiving live-sync snapshots from the server. A pending local write that has not yet reached the server could be overwritten by an incoming snapshot from another client.
- Mitigation: Use the existing live-sync `serverVersion` envelope for conflict detection; when applying a remote snapshot, cancel any pending local debounce write that predates the incoming version.

## R13-5 Export/Import JSON Schema Drift [MEDIUM]
The export-to-file payload must remain backward-compatible with existing JSON backups users may already have. Import-from-file must accept any past export.
- Mitigation: Export/import pass through the existing `buildGlobalDefaultsPayload()` / `applyGlobalDefaultsPayloadToState()` functions — they already handle schema versioning. The round-trip test in P13-1-T10 enforces equivalence.

## R13-6 Write Amplification Under Rapid Mutations [MEDIUM]
Dragging a zoom/opacity slider can emit many mutations per second. Without debouncing, every tick hits the server; with debouncing, the trailing settle may drop a mutation.
- Mitigation: 200ms debounce window with trailing-edge fire and final flush on blur/unload; verified by a cadence static test in P13-1-T10.

## R13-7 Phase 11 HF6 / Phase 12 Regression [HIGH]
The animation lifecycle contracts (seen-once retention, additive layering) are live-sync-adjacent; an imperfect refactor to the write path could drop these guards.
- Mitigation: Dedicated non-regression static guards in P13-1-T10 replay the Phase 11 HF6 and Phase 12 static patterns and assert they are still present in the source.

## R13-8 Wheel Gesture Conflict with Scroll [MEDIUM]
A global wheel listener can hijack page scroll; a stage-local listener must `preventDefault()` only when the wheel event target is inside the stage.
- Mitigation: The wheel handler attaches to the stage element (not document/window) and calls `preventDefault()` only when the stage is actually the event target; document-scoped scroll is unaffected.

## R13-9 Pinch Gesture vs Polygon Drag Race [HIGH]
Two simultaneous pointers on a small vertex hit target could be interpreted as either a pinch zoom or a vertex grab. Arbitration must be deterministic and time-local.
- Mitigation: First pointer within a vertex hit target immediately captures that pointer for vertex drag; the second pointer can either start a second-vertex drag (if it hits another vertex) or be ignored. Pinch zoom only starts when neither pointer is captured by a drag.

## R13-10 CSS `touch-action: none` Over-Applied [LOW]
Disabling `touch-action` on the overlay prevents native scroll inside it; needed for drag, but must not leak to surrounding scroll areas.
- Mitigation: Apply `touch-action: none` only to the overlay SVG container, not the stage wrapper or the outer settings panel.

## R13-11 Zoom Center Drift at Extreme Scales [LOW]
At 25% zoom-out, pan clamping may let the board slip outside the stage; at 400% zoom-in, small cursor motions produce large pan jumps.
- Mitigation: Reuse `getStagePanBounds(scale)` — extend its bounds for the new range — and sanity-test at boundary scales with a static harness.

## R13-12 Planning Artifact Drift [LOW]
Closing three sequential plans without a full tracker sync at the phase boundary could leave stale "IN-PROGRESS" states.
- Mitigation: Each plan closure task includes an artifact sync step; the phase-level P13-CLOSURE step asserts all three plans are DONE and all trackers are aligned.
