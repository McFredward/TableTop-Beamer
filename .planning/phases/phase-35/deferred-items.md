
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
