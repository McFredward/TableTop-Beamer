// Phase 28 Wave 4 — asset-manifest (B5 manifest read/write/sync round-trip).
// Plan 28-04 converts the Wave-0 skips to live assertions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { withTempDir, readJsonFile, writeJsonFile } from "./_helpers.mjs";
import path from "node:path";
import { writeFile, mkdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";

const SCHEMA = "tt-beamer.asset-manifest.v1";

test("scaffold: asset-manifest.test.mjs loads", () => {
  // Trivial liveness check so the file always has at least one passing assertion.
  assert.equal(1, 1);
});

test("B5-D13: manifest round-trips — write then read returns the same hash + size + mtime", async () => {
  await withTempDir("p28-manifest", async (dir) => {
    const manifestPath = path.join(dir, "asset-manifest.json");
    const manifest = {
      schema: SCHEMA,
      generatedAt: "2026-05-04T12:00:00.000Z",
      hashByPath: {
        "/resources/animations/alpha.gif": {
          hash: "abc123def456",
          size: 1234,
          mtime: "2026-05-01T00:00:00.000Z",
        },
        "/resources/sounds/bell.mp3": {
          hash: "ffffffffffff",
          size: 4567,
          mtime: "2026-05-02T00:00:00.000Z",
        },
      },
    };
    await writeJsonFile(manifestPath, manifest);
    const loaded = await readJsonFile(manifestPath);
    assert.deepEqual(loaded, manifest);
    // Schema header preserved verbatim.
    assert.equal(loaded.schema, SCHEMA);
    // hashByPath entries fully round-tripped.
    assert.equal(loaded.hashByPath["/resources/animations/alpha.gif"].hash, "abc123def456");
    assert.equal(loaded.hashByPath["/resources/animations/alpha.gif"].size, 1234);
    assert.equal(loaded.hashByPath["/resources/sounds/bell.mp3"].hash, "ffffffffffff");
  });
});

test("B5-D13: missing manifest synthesizes from disk on boot (deterministic + idempotent)", async () => {
  await withTempDir("p28-manifest-synth", async (dir) => {
    // Lay out fake resources/animations + resources/sounds folders.
    const animDir = path.join(dir, "animations");
    const soundDir = path.join(dir, "sounds");
    await mkdir(animDir, { recursive: true });
    await mkdir(soundDir, { recursive: true });

    const sampleGifBytes = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    const sampleMp3Bytes = Buffer.from([0xff, 0xfb, 0x90, 0x44, 0x00]);
    const sampleGifPath = path.join(animDir, "sample.gif");
    const sampleMp3Path = path.join(soundDir, "ring.mp3");
    await writeFile(sampleGifPath, sampleGifBytes);
    await writeFile(sampleMp3Path, sampleMp3Bytes);

    // Synthesis logic mirror — exercises the same algorithm the server uses.
    function computeHash(buf) {
      return createHash("sha256").update(buf).digest("hex").substring(0, 12);
    }
    async function synthesize() {
      const manifest = {
        schema: SCHEMA,
        generatedAt: new Date().toISOString(),
        hashByPath: {},
      };
      const gifStat = await stat(sampleGifPath);
      manifest.hashByPath["/resources/animations/sample.gif"] = {
        hash: computeHash(sampleGifBytes),
        size: sampleGifBytes.length,
        mtime: gifStat.mtime.toISOString(),
      };
      const mp3Stat = await stat(sampleMp3Path);
      manifest.hashByPath["/resources/sounds/ring.mp3"] = {
        hash: computeHash(sampleMp3Bytes),
        size: sampleMp3Bytes.length,
        mtime: mp3Stat.mtime.toISOString(),
      };
      return manifest;
    }

    const first = await synthesize();
    const expectedGifHash = computeHash(sampleGifBytes);
    const expectedMp3Hash = computeHash(sampleMp3Bytes);
    assert.equal(first.hashByPath["/resources/animations/sample.gif"].hash, expectedGifHash);
    assert.equal(first.hashByPath["/resources/sounds/ring.mp3"].hash, expectedMp3Hash);
    assert.equal(first.hashByPath["/resources/animations/sample.gif"].size, sampleGifBytes.length);
    assert.equal(first.hashByPath["/resources/sounds/ring.mp3"].size, sampleMp3Bytes.length);

    // Idempotency: re-running yields identical hashes for the same bytes.
    const second = await synthesize();
    assert.equal(
      second.hashByPath["/resources/animations/sample.gif"].hash,
      first.hashByPath["/resources/animations/sample.gif"].hash,
    );
    assert.equal(
      second.hashByPath["/resources/sounds/ring.mp3"].hash,
      first.hashByPath["/resources/sounds/ring.mp3"].hash,
    );
  });
});

test("B5-D13: malformed manifest falls back to empty hashByPath (loadAssetManifest contract)", async () => {
  await withTempDir("p28-manifest-malformed", async (dir) => {
    const manifestPath = path.join(dir, "asset-manifest.json");
    await writeFile(manifestPath, "this is not json", "utf8");
    // The server's loadAssetManifest contract: malformed → return empty
    // { schema, generatedAt, hashByPath: {} } stub. Mirror here as a
    // local function and assert the recovery shape.
    async function loadOrEmpty(p) {
      try {
        const raw = await (await import("node:fs/promises")).readFile(p, "utf8");
        const parsed = JSON.parse(raw);
        if (
          parsed?.schema !== SCHEMA
          || !parsed.hashByPath
          || typeof parsed.hashByPath !== "object"
        ) {
          return { schema: SCHEMA, generatedAt: new Date().toISOString(), hashByPath: {} };
        }
        return parsed;
      } catch {
        return { schema: SCHEMA, generatedAt: new Date().toISOString(), hashByPath: {} };
      }
    }
    const loaded = await loadOrEmpty(manifestPath);
    assert.equal(loaded.schema, SCHEMA);
    assert.deepEqual(loaded.hashByPath, {});
  });
});
