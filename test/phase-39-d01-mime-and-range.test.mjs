// Phase 39 Plan 39-1 Task 2 — D-01 RED test for MP4 MIME mapping + Range support.
//
// Purpose
// -------
// Lock the acceptance contract for D-01 (sandstorm.mp4 plays in the SSR
// stream). The bug verified empirically in 39-RESEARCH.md is that server.mjs's
// MIME_TYPES table at line 1968 has no `.mp4` entry, so the static handler
// serves the video as `application/octet-stream` and Chromium 131 refuses to
// decode it. The recommended fix (39-RESEARCH.md §"Implementation approach")
// also adds Range request support so loop-wrap seeks don't re-buffer.
//
// These tests MUST FAIL today (master) and MUST PASS after Plan 39-2 lands.
//
// Strategy
// --------
// Two layers of assertion:
//
//   1) Source-string regex test (cheap, no server boot): scan server.mjs for
//      the MIME table entries and the Range-handling code path. This catches
//      the simplest case of "did the planner remember to add `.mp4`?".
//
//   2) Behavioural test (boots server, fetches resource): the source regex
//      alone is not enough — a developer could add the entry inside a wrong
//      conditional. The behavioural test boots a tiny ad-hoc node child that
//      imports the production handler, or, in practice, boots the real
//      server.mjs against an isolated tempdir on a free port and curl-probes
//      `Content-Type` + `Accept-Ranges` + a 206 Partial Content response.
//
// The unit-level regex tests below are sufficient to satisfy the plan's RED
// gate ("MUST FAIL TODAY with failure mode pointing at the missing entry").
// Plan 39-2 will add the corresponding GREEN behavioural test in a separate
// integration file as it implements the fix.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SERVER_SRC = readFileSync("./server.mjs", "utf8");

// ──────────────────────────────────────────────────────────────────────
// MIME-table assertions — RED today (no entries present)
// ──────────────────────────────────────────────────────────────────────

test("D-01 RED: server.mjs MIME_TYPES table maps .mp4 to video/mp4", () => {
  // Look for the literal pair inside the MIME_TYPES table. The current
  // master has no .mp4 entry — this assertion FAILS with the assertion
  // subject "video/mp4" present in the failure message so a reviewer can
  // grep the failure log and see exactly what the fix needs to add.
  const re = /"\.mp4"\s*:\s*"video\/mp4"/;
  assert.ok(
    re.test(SERVER_SRC),
    "server.mjs MIME_TYPES table is missing a `.mp4: \"video/mp4\"` entry. "
    + "Without it, getMimeType('.mp4') returns 'application/octet-stream' "
    + "and Chromium 131 refuses to decode the served bytes (D-01 root cause). "
    + "Add it inside the MIME_TYPES object near server.mjs:1968. "
    + "Expected pattern: /\"\\.mp4\"\\s*:\\s*\"video\\/mp4\"/",
  );
});

test("D-01 RED: server.mjs MIME_TYPES table maps .webm to video/webm", () => {
  const re = /"\.webm"\s*:\s*"video\/webm"/;
  assert.ok(
    re.test(SERVER_SRC),
    "server.mjs MIME_TYPES table is missing `.webm: \"video/webm\"`. "
    + "Plan 39-2 must add this for completeness alongside .mp4.",
  );
});

test("D-01 RED: server.mjs MIME_TYPES table maps .m4v to video/mp4", () => {
  const re = /"\.m4v"\s*:\s*"video\/mp4"/;
  assert.ok(
    re.test(SERVER_SRC),
    "server.mjs MIME_TYPES table is missing `.m4v: \"video/mp4\"`. "
    + "Plan 39-2 must add this — m4v is the alternative container ext.",
  );
});

// ──────────────────────────────────────────────────────────────────────
// Range-header assertions — RED today (handleStaticFile ignores Range)
// ──────────────────────────────────────────────────────────────────────

test("D-01 RED: handleStaticFile honours Range: bytes=N-M with status 206", () => {
  // Look for evidence that handleStaticFile parses a Range header and
  // responds with HTTP 206 Partial Content + Content-Range. The current
  // implementation streams the full file with status 200 unconditionally.
  //
  // We look for ANY of the canonical signals — a defensive regex so a
  // future implementer is free to organize the code (e.g. extract a
  // helper) without breaking the test.
  const hasRangeHeaderRead = /req\.headers\s*\[\s*['"]range['"]\s*\]|req\.headers\.range/i.test(SERVER_SRC);
  const has206Status = /\b206\b[^a-zA-Z0-9]/.test(SERVER_SRC);
  const hasContentRangeWrite = /content-range/i.test(SERVER_SRC);
  const allThree = hasRangeHeaderRead && has206Status && hasContentRangeWrite;
  assert.ok(
    allThree,
    "server.mjs does not appear to handle Range requests: "
    + `range-header-read=${hasRangeHeaderRead} `
    + `status-206=${has206Status} `
    + `content-range-write=${hasContentRangeWrite}. `
    + "handleStaticFile (around server.mjs:3545) ignores Range headers and "
    + "streams the full file with status 200. Plan 39-2 must add Range "
    + "support so the Phase 31 h15 `Connection: close` contract continues "
    + "to work AND <video>.currentTime = X seek operations don't re-buffer "
    + "the whole file (39-RESEARCH.md §'Why Range support is recommended').",
  );
});
