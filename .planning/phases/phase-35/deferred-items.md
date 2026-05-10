
## 35-B Plan — Deferred (Out of Scope)

### W0 dashboard regression test uses non-existent route /api/live/mutate

- **Found during:** 35-B Task 4 (live-E2E regression check)
- **Test:** `test/live-e2e/test_phase35_dashboard_alignmode.py::test_dashboard_alignmode_handles`
- **Failure:** `urllib.error.HTTPError: HTTP Error 405: Method Not Allowed` on POST `/api/live/mutate`
- **Root cause:** server.mjs exposes `/api/live/command` (POST) and `/api/live/snapshot` (GET) but NO `/api/live/mutate` route. The Wave-0 test was authored against a non-existent endpoint; it has never actually passed on master.
- **Confirmed pre-existing:** verified by `git checkout 0154b96 -- src/app/runtime/output-receiver/ output.html` (revert to end of Wave-0 / pre-Track-B) — the test fails identically with the same 405. Track B did not introduce this.
- **Scope decision:** Out of scope for Track B. The failing endpoint is server-side routing, not receiver-bootstrap.js or any file Track B touches. The test should be fixed in a future plan (likely 35-A or a Wave-0 followup) to either:
  - POST to `/api/live/command` with `{mutationType, payload}` shape (preferred — that's the documented HTTP mutation route), or
  - Trigger the mutation via WS through the existing live-sync infrastructure.
- **Impact on Track B:** None. The test was a "must-stay-green" canary in name only — it has never been green. Track B preserves the actual must-stay-green guarantees (D-05 a-d on /output/, D-06 connection-stability) which DO PASS.

## 35-C Plan — Deferred (Pre-existing, Out of Scope)

### Dashboard regression test still failing post-Track-A endpoint fix

- **Found during:** 35-C Task 5 (wave-merge verification)
- **Test:** `test/live-e2e/test_phase35_dashboard_alignmode.py::test_dashboard_alignmode_handles`
- **Failure:** `playwright._impl._errors.TimeoutError: Page.wait_for_function: Timeout 5000ms exceeded` — the wait for `document.querySelectorAll('.projection-corner-handle').length > 0` after toggling alignMode times out.
- **Root cause:** unknown without deeper investigation; likely the dashboard's alignMode subscription path hasn't been re-wired to honour `/api/live/command` `context-update` mutations the way `/output/` was during 35-A. The endpoint POST itself succeeds; the page just doesn't react.
- **Confirmed pre-existing:** verified by `git checkout 565d742 -- src/app/runtime/render/runtime-effect-visuals.js index.html` (revert to end of Track A) — the test fails identically with the same TimeoutError. Track C did not introduce this.
- **Scope decision:** Out of scope for Track C. Track C touches `runtime-effect-visuals.js` (render layer) and `runtime-effect-dither.js` (new). Neither is on the alignMode-toggle codepath. Recommended fix in a follow-up plan (likely 35-V wave-merge or a 35-A hotfix): trace the `context-update` mutation through `runtime-orchestration.js` → `runtime-live-sync-core.js` → handle-ui DOM lifecycle to find where the dashboard's alignMode listener was lost.
- **Impact on Track C:** None. The "must-stay-green" gates that DO matter for Track C are the dither unit test (RED→GREEN ✓), the FPS benchmark (≥25 fps ✓ at 30.62), the D-06 hard gate (84/0/1 ✓), the D-05 a-f live-E2E (6/6 ✓), and the full JS suite (376/393 pass / 17 skipped / 0 fail ✓). All preserved.
