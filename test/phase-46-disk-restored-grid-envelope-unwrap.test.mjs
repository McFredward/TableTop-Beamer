// Phase 46 iter2 (2026-05-16) — regression test for the
// /api/live/snapshot envelope-unwrap bug in
// runtime-board-switch.js#_tryApplyDiskRestoredGrid.
//
// The bug: pre-iter2 the helper read `body.runtime.lastAlignGridSnapshot`
// directly on the fetch response body. But `/api/live/snapshot` returns
// `{ ok, changed, sinceVersion, session: { version, snapshot, ... } }` —
// the runtime payload lives at body.session.snapshot.runtime, not
// body.runtime. So the helper unconditionally returned false →
// autoLoadRememberedProjectionProfile fell back to
// applyDefaultAndCaptureSnapshot (identity grid + broadcast
// isBaseline=true). On the SSR Chromium tab + Pi /output/ this baseline
// broadcast then overrode the live-hello W5 server-disk-restore apply,
// leaving the SSR mesh-warp at identity even though server.mjs had
// correctly seeded lastAlignGridSnapshot. Operator UAT screenshot:
// .planning/debug/desync/one_more_desync_bug.png.
//
// This test asserts the helper source uses the canonical envelope-
// unwrap pattern that the other consumers already use
// (output-align-mode-loader.js#L663, output-live-sync.js#L405).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..");

test("phase-46-iter2: _tryApplyDiskRestoredGrid unwraps session.snapshot envelope", () => {
  const src = readFileSync(
    join(REPO_ROOT, "src/app/runtime/core/runtime-board-switch.js"),
    "utf8",
  );

  // Extract the helper body for targeted assertions.
  const match = src.match(
    /async function _tryApplyDiskRestoredGrid\(\) \{[\s\S]*?\n  \}/,
  );
  assert.ok(match, "_tryApplyDiskRestoredGrid body must be extractable");
  const body = match[0];

  // The helper MUST unwrap the response envelope before reading
  // runtime.lastAlignGridSnapshot. We accept any of the documented
  // unwrap patterns:
  //   body.session.snapshot   (canonical /api/live/snapshot envelope)
  //   body.snapshot           (legacy /api/live/snapshot shape)
  //   body                    (fallback when caller already unwrapped)
  // Match either the chained ?? pattern or two separate accesses.
  const hasSessionSnapshotAccess =
    /body[?.]*\.session[?.]*\.snapshot/.test(body)
    || /resp\.json[\s\S]{0,200}session[?.]*\.snapshot/.test(body);
  assert.ok(
    hasSessionSnapshotAccess,
    "_tryApplyDiskRestoredGrid must access body.session.snapshot (the canonical "
    + "/api/live/snapshot envelope shape). Without this, body.runtime is always "
    + "undefined and the helper returns false on every cold boot, falling back to "
    + "applyDefaultAndCaptureSnapshot (identity + isBaseline broadcast).",
  );

  // Negative: must NOT do `snap.runtime` directly on the raw fetch body
  // without unwrapping first. The bug pattern was
  //   const snap = await resp.json();
  //   const lastSnap = snap?.runtime?.lastAlignGridSnapshot;
  // We detect it by looking for `await resp.json()` followed within
  // 200 chars by `runtime?.lastAlignGridSnapshot` access on the same var
  // that DOESN'T have a session.snapshot unwrap between them.
  const buggyPattern = /const\s+(\w+)\s*=\s*await\s+resp\.json\(\)\s*;\s*(?:[^;]{0,200};\s*)?const\s+\w+\s*=\s*\1\?\.runtime\?\.lastAlignGridSnapshot/;
  assert.equal(
    buggyPattern.test(body),
    false,
    "_tryApplyDiskRestoredGrid must NOT access raw fetch-body.runtime directly. "
    + "Unwrap body.session.snapshot first.",
  );
});

test("phase-46-iter2: /api/live/snapshot envelope shape matches helper's expectation", () => {
  // Mirror the server.mjs route response shape so future server-side
  // refactors that move the runtime payload elsewhere break this test
  // first (rather than silently regressing the SSR cold-boot apply).
  const serverSrc = readFileSync(
    join(REPO_ROOT, "server.mjs"),
    "utf8",
  );
  // The route definition:  routePath === "/api/live/snapshot"
  // returns sendJson(res, 200, { ok, changed, sinceVersion, session: { ... } })
  // with session = { version, updatedAt, snapshot, lastMutation }.
  const routeMatch = serverSrc.match(
    /routePath === "\/api\/live\/snapshot"[\s\S]{0,600}sendJson\(res, 200, \{[\s\S]{0,800}?\}\);/,
  );
  assert.ok(routeMatch, "GET /api/live/snapshot route body must be locatable in server.mjs");
  const routeBody = routeMatch[0];
  assert.match(routeBody, /session:\s*\{/, "envelope must wrap data under `session:`");
  assert.match(routeBody, /snapshot:\s*liveSessionState\.snapshot/, "envelope must put the snapshot under `session.snapshot`");
});
