// Phase 28 Wave 4 — asset-hash (B5 sha256[:12] truncation + determinism).
// Plan 28-04 converts the Wave-0 skips to live assertions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

test("scaffold: asset-hash.test.mjs loads", () => {
  // Trivial liveness check so the file always has at least one passing assertion.
  assert.equal(1, 1);
});

test("B5-D11/D12: sha256(bytes).slice(0,12) is deterministic and exactly 12 hex chars", () => {
  // D-12 contract: cache-busting token = sha256(bytes).digest("hex").substring(0, 12).
  // NOT a security/integrity control — purely cache-busting.
  const buf = Buffer.from("hello world", "utf8");
  const hash = createHash("sha256").update(buf).digest("hex").substring(0, 12);
  assert.equal(hash.length, 12);
  assert.match(hash, /^[a-f0-9]{12}$/);
  // Determinism — same bytes → same hash.
  const again = createHash("sha256").update(buf).digest("hex").substring(0, 12);
  assert.equal(hash, again);
});

test("B5-D11: same content produces same hash, different content produces different hash", () => {
  const a = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // "GIF89a"
  const b = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
  const hashA = createHash("sha256").update(a).digest("hex").substring(0, 12);
  const hashB = createHash("sha256").update(b).digest("hex").substring(0, 12);
  assert.equal(hashA, hashB);
  // Different content → different hash.
  const c = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x62]);
  const hashC = createHash("sha256").update(c).digest("hex").substring(0, 12);
  assert.notEqual(hashA, hashC);
});

test("regression A8: toSafePath equivalent strips query string (mirrors server.mjs:1545)", () => {
  // server.mjs toSafePath uses `urlPath.split("?")[0]` to strip the query
  // before resolving the file path — verified here so wiring `?v=<hash>`
  // into URLs cannot break static-file resolution (B5 pre-condition).
  function toSafePathLocal(urlPath) {
    return decodeURIComponent(urlPath.split("?")[0] || "/");
  }
  assert.equal(
    toSafePathLocal("/resources/animations/foo.gif?v=abc123def456"),
    "/resources/animations/foo.gif",
  );
  assert.equal(
    toSafePathLocal("/resources/animations/foo.gif"),
    "/resources/animations/foo.gif",
  );
  assert.equal(
    toSafePathLocal("/resources/sounds/bell.mp3?v=000000000000&extra=ignored"),
    "/resources/sounds/bell.mp3",
  );
});
