---
status: awaiting_human_verify
trigger: "Cold-boot align-mode desync between SSR stream + /output/ handles. Fresh clone with projection-profiles.json but no runtime-active-grid.json. Stream content fills viewport (identity warp) but /output/ handles match W5-restored profile geometry. Persists after commits 43860eb fix attempts."
created: 2026-05-16T00:00:00Z
updated: 2026-05-16T12:50:00Z
---

## Current Focus

hypothesis: CONFIRMED ROOT CAUSE — _tryApplyDiskRestoredGrid uses WRONG JSON path. It does `snap?.runtime?.lastAlignGridSnapshot` directly on fetch response, but server returns `{ session: { snapshot: { runtime: { lastAlignGridSnapshot } } } }`. So it ALWAYS returns false → falls back to applyDefaultAndCaptureSnapshot → identity grid + broadcasts isBaseline=true. The baseline broadcast then OVERRIDES the live-hello W5 apply on /output/ and SSR tab.
test: Verify by running cold boot + curl /api/live/snapshot to confirm envelope shape
expecting: Confirmed — server returns envelope shape `{ ok, changed, session: { version, snapshot } }`
next_action: Fix line 67 to use `snap?.session?.snapshot?.runtime?.lastAlignGridSnapshot ?? snap?.snapshot?.runtime?.lastAlignGridSnapshot ?? snap?.runtime?.lastAlignGridSnapshot` (same defensive pattern as other consumers)

## Symptoms

expected: SSR tab applies W5-restored profile grid → captured stream is warped to match profile → /output/ handles + stream align at fresh cold boot
actual: SSR tab's mesh-warp is identity (no warp) → stream fills viewport edge to edge → /output/ handles drawn at W5-restored profile positions → visual desync
errors: None (silent desync)
reproduction:
  1. Fresh clone with config/projection-profiles.json but NO config/runtime-active-grid.json
  2. ./start.sh → boot
  3. Open /output/ on remote device
  4. Stream is identity-warped; handles are profile-positioned → mismatch
  5. After any save/profile-load, bug disappears across restarts
started: After commits 43860eb attempt. Dashboard now restored correctly but SSR tab still identity-warped.

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-05-16T00:00:00Z
  checked: Operator UAT confirmation
  found: After 43860eb (removed OUTPUT_ROLE_FINAL gate + re-routed _tryApplyDiskRestoredGrid to applyAndCaptureSnapshot), Playwright probe shows dashboard grid updates to W5 profile but real-hardware UAT still shows SSR stream as identity warp.
  implication: SSR tab uses a different apply path OR there's a race/cache issue that doesn't manifest in dashboard

- timestamp: 2026-05-16T00:00:00Z
  checked: Server log /tmp/srv-debug.log via curl /api/live/snapshot
  found: snapshot.runtime.lastAlignGridSnapshot has profileId="Nemesis A with xrandr", points-count=54, originatorClientId=server-disk-restore, version=1
  implication: Server-side W5 fallback works correctly. Bug is in SSR-tab consumption of this snapshot.

- timestamp: 2026-05-16T12:30:00Z
  checked: Live API response shape vs _tryApplyDiskRestoredGrid JSON path access
  found: GET /api/live/snapshot returns `{ ok, changed, sinceVersion, session: { version, snapshot, ... } }` — runtime is at `body.session.snapshot.runtime`, NOT `body.runtime`. _tryApplyDiskRestoredGrid does `snap.runtime.lastAlignGridSnapshot` directly on the raw body → always undefined → returns false → autoLoad falls through to applyDefaultAndCaptureSnapshot which broadcasts isBaseline=true. Other consumers (output-align-mode-loader.js#L663, output-live-sync.js#L405) use the correct envelope unwrap.
  implication: ROOT CAUSE confirmed. Fix is one-liner — unwrap session.snapshot before access.

- timestamp: 2026-05-16T12:45:00Z
  checked: Post-fix cold-boot reproduction (server cold-boot with runtime-active-grid.json hidden, port 5392, SSR_TAB_CONSOLE_VERBOSE=1)
  found: Server log shows `[active-grid] restored profile=Nemesis A with xrandr ... source=projection-profile/nemesis-board-a/Nemesis A with xrandr`. SSR-tab console log shows `[grid-state] restoreGridSnapshot dims=3×3→9×6 TL=(0.100,0.100)→(0.204,0.106) caller=pollLiveSnapshotOnce` + `[align-grid-snapshot] poll eager-apply OK profile=Nemesis A with xrandr points=54`. SSR tab transitions from 3×3 10/90 inset default to 9×6 W5 profile within ~1 second of boot.
  implication: After the fix, SSR tab applies the W5 profile via poll eager-apply path. Mesh-warp now uses W5 corner positions (0.204, 0.106)→(0.754, 0.816), matching /output/'s handle positions.

## Resolution

root_cause: `_tryApplyDiskRestoredGrid` in `src/app/runtime/core/runtime-board-switch.js` accessed the wrong JSON path on the `/api/live/snapshot` response — used `snap.runtime.lastAlignGridSnapshot` directly on the raw fetch body, but the route's actual envelope is `{ ok, changed, sinceVersion, session: { version, snapshot: {...}, ...} }`. So the helper always returned `false`, and `autoLoadRememberedProjectionProfile` fell through to `applyDefaultAndCaptureSnapshot()` — which reset to the 10/90 identity-inset and broadcast it as `isBaseline=true`. That baseline broadcast overrode the server's W5 disk-restore on every other client.

fix: Unwrap the envelope before accessing runtime — `const snap = body?.session?.snapshot ?? body?.snapshot ?? body ?? {}; const lastSnap = snap?.runtime?.lastAlignGridSnapshot;` — matches the pattern used by `output-align-mode-loader.js` and `output-live-sync.js`.

verification:
  - Pre-fix raw-body access `body.runtime.lastAlignGridSnapshot` returns null (confirmed via curl + python).
  - Post-fix `body.session.snapshot.runtime.lastAlignGridSnapshot` returns the W5-restored profile with 54 points and originatorClientId=server-disk-restore.
  - Cold-boot reproduction (port 5392, SSR_TAB_CONSOLE_VERBOSE=1): SSR tab transitions from 3×3 10/90 inset to 9×6 W5 profile, dims=(0.100,0.100)→(0.204,0.106).
  - New regression test `test/phase-46-disk-restored-grid-envelope-unwrap.test.mjs` pins both the unwrap pattern AND the server-side route shape. Two new tests pass.
  - Full test suite: 406 tests / 386 pass / 1 fail / 19 skipped. The 1 fail is the pre-existing Phase-41 operator-telemetry test (unchanged).

files_changed:
  - src/app/runtime/core/runtime-board-switch.js (envelope unwrap fix + comment)
  - test/phase-46-disk-restored-grid-envelope-unwrap.test.mjs (new regression test)
  - .planning/phases/phase-46/46-CLOSURE.md (iter2 follow-up section)
