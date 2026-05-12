---
phase: 39
plan: 2
type: execute
wave: 1
depends_on: [39-1]
files_modified:
  - server.mjs
autonomous: true
requirements:
  - D-01-MP4-PLAYBACK
must_haves:
  truths:
    - "The MP4 outside-animation from nemesis-lockdown-a.json (sandstorm.mp4) decodes in the SSR Chromium tab (readyState=4, currentTime advances, videoWidth=1280, error=null)"
    - "The server serves .mp4, .webm, .m4v with the correct video/* Content-Type header"
    - "Range requests against /resources/animations/*.mp4 return 206 + content-range header + the requested byte slice"
    - "All Phase 38 carry-forward rails (WS-fragmentation, static-resource-headers, connection-stability) remain green"
  artifacts:
    - path: "server.mjs"
      provides: "Extended MIME_TYPES table + Range-aware handleStaticFile"
      contains: '".mp4":  "video/mp4"'
  key_links:
    - from: "server.mjs MIME_TYPES table"
      to: "server.mjs handleStaticFile via getMimeType()"
      via: "synchronous lookup"
      pattern: "getMimeType"
    - from: "server.mjs handleStaticFile Range parser"
      to: "fs.createReadStream(path, {start, end})"
      via: "stream pipe to res"
      pattern: "createReadStream.*start.*end"
    - from: "Plan 39-1 RED test test/phase-39-d01-mime-and-range.test.mjs"
      to: "this plan's fix"
      via: "RED → GREEN turn"
      pattern: "video/mp4"
---

<objective>
Fix D-01: MP4 outside-animation plays in the SSR stream.

Root cause (empirically verified in 39-RESEARCH.md): server.mjs MIME_TYPES table has no `.mp4` entry. Chromium 131 receives `Content-Type: application/octet-stream` for sandstorm.mp4 and refuses to decode it (`MEDIA_ELEMENT_ERROR: Format error`, networkState=NETWORK_NO_SOURCE, readyState=0). The fix is a 6-line MIME-table extension plus a ~30 LOC Range-request handler in handleStaticFile (recommended for loop-wrap safety per 39-RESEARCH.md Pitfall 3).

Purpose: Turn the D-01 RED tests created in Plan 39-1 (both the unit `test/phase-39-d01-mime-and-range.test.mjs` AND the live `test/live-e2e/test_phase39_d01_mp4_in_ssr.py`) GREEN. The MIME fix is the minimum-viable change; the Range fix is bundled to prevent the Pitfall-3 regression six weeks from now.

Output: A single-file edit to server.mjs that lands both fixes. No new dependencies. No changes to ssr-render-host.mjs, runtime-outside-mp4.js, runtime-draw-loop.js (the runtime code is fine — only the HTTP layer was broken).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/CRITICAL_KNOWN_BUGS.md
@.planning/phases/phase-39/39-RESEARCH.md
@.planning/phases/phase-39/39-1-PLAN.md

<interfaces>
<!-- The exact lines that need touching, with their current state. -->

From server.mjs:1968 (current MIME_TYPES — must add to it, NOT replace):
```javascript
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png":  "image/png",
  ".webp": "image/webp",
  ".wav":  "audio/wav",
  ".mp3":  "audio/mpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
};
```

From server.mjs:3545 (current handleStaticFile — must add Range support before the unconditional res.writeHead(200)):
```javascript
async function handleStaticFile(req, res, routePath) {
  const targetPath = resolveStaticPath(req.url, routePath);
  if (!targetPath) { res.writeHead(403); res.end("forbidden"); return; }
  try {
    const fileStat = await stat(targetPath);
    const resolvedPath = fileStat.isDirectory() ? path.join(targetPath, "index.html") : targetPath;
    const headers = buildStaticResourceHeaders(routePath, getMimeType(resolvedPath));
    res.writeHead(200, headers);
    createReadStream(resolvedPath).pipe(res);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("not found");
  }
}
```

From .planning/phases/phase-39/39-RESEARCH.md §"D-01 Range support" — the recommended Range parser snippet (executor copies VERBATIM):
```javascript
const rangeHeader = req.headers["range"];
if (typeof rangeHeader === "string" && rangeHeader.startsWith("bytes=")) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  if (match) {
    const totalSize = fileStat.size;
    const start = match[1] === "" ? Math.max(0, totalSize - Number(match[2])) : Number(match[1]);
    const end = match[2] === "" ? totalSize - 1 : Math.min(Number(match[2]), totalSize - 1);
    if (Number.isFinite(start) && Number.isFinite(end) && start >= 0 && start <= end && start < totalSize) {
      headers["accept-ranges"] = "bytes";
      headers["content-range"] = `bytes ${start}-${end}/${totalSize}`;
      headers["content-length"] = String(end - start + 1);
      res.writeHead(206, headers);
      createReadStream(resolvedPath, { start, end }).pipe(res);
      return;
    }
    // Malformed-but-recognizable range → 416 Range Not Satisfiable
    res.writeHead(416, { "content-range": `bytes */${totalSize}`, ...headers });
    res.end();
    return;
  }
}
```

From .planning/phases/phase-39/39-RESEARCH.md §"D-01 Security baseline":
```
Range parser MUST:
  - Reject malformed `bytes=` (only `bytes=<n>-<m>` accepted, no multi-range)
  - Cap `end` to `fileSize - 1`
  - Reject if `start > end` or `start >= fileSize`
  - Return 416 (Range Not Satisfiable) on out-of-range requests
```

From .planning/phases/phase-39/39-RESEARCH.md §"Empirical evidence" (the bug being fixed):
```
Pre-fix curl response:
  HTTP/1.1 200 OK
  content-type: application/octet-stream      ← bug
  No Accept-Ranges header. Range requests return 200 + full file.

Post-fix curl response:
  HTTP/1.1 200 OK
  content-type: video/mp4
  accept-ranges: bytes
  content-length: <fileSize>

Range request post-fix:
  curl -H "Range: bytes=0-1023" -o /tmp/slice .../sandstorm.mp4 -D /tmp/h
  HTTP/1.1 206 Partial Content
  content-range: bytes 0-1023/<fileSize>
  content-length: 1024
  accept-ranges: bytes
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Extend MIME_TYPES table to include video MIME entries</name>
  <read_first>
    - server.mjs lines 1965-1995 (the MIME_TYPES table + getMimeType function) — to see exact indentation, quote style, and key alignment used
    - .planning/phases/phase-39/39-RESEARCH.md §"D-01 MIME table extension (minimal fix)" — the exact entries to add
    - test/phase-39-d01-mime-and-range.test.mjs (created in Plan 39-1) — to confirm exactly which extensions it asserts (.mp4, .webm, .m4v at minimum)
    - resources/animations/ — `ls /home/claw/tt-beamer/resources/animations/ | grep -oE '\.[a-z0-9]+$' | sort -u` to audit existing extensions (research Pitfall 2)
  </read_first>
  <files>server.mjs</files>
  <behavior>
    - getMimeType('.mp4') === 'video/mp4'
    - getMimeType('.webm') === 'video/webm'
    - getMimeType('.m4v') === 'video/mp4'
    - getMimeType('.ogg') === 'audio/ogg'
    - getMimeType('.aac') === 'audio/aac'
    - getMimeType('.m4a') === 'audio/mp4'
    - getMimeType('.mov') === 'video/quicktime'
    - Unchanged: getMimeType for .html/.js/.css/.json/.jpg/.jpeg/.png/.webp/.wav/.mp3/.svg/.ico
    - Unknown extensions still return 'application/octet-stream' (the table's default fallback at server.mjs:1985 is unchanged)
  </behavior>
  <action>
Edit server.mjs MIME_TYPES table at line 1968. Add the following entries inside the table (preserve existing alphabetical-ish ordering by category — image/audio/video grouping is acceptable). After the existing `.ico` entry, insert:

```javascript
  // Phase 39 Plan 39-2 D-01: video MIME types. Without these, Chromium 131
  // refuses to decode .mp4 served as application/octet-stream and the
  // <video> element errors with MEDIA_ELEMENT_ERROR (Format error /
  // NETWORK_NO_SOURCE). Verified empirically in 39-RESEARCH.md.
  ".mp4":  "video/mp4",
  ".webm": "video/webm",
  ".m4v":  "video/mp4",
  ".mov":  "video/quicktime",
  // Additional audio MIME entries (research Pitfall 2 — audit asset extensions).
  ".ogg":  "audio/ogg",
  ".aac":  "audio/aac",
  ".m4a":  "audio/mp4",
```

DO NOT change the existing `.html` / `.js` / `.css` / `.json` / `.jpg` / `.jpeg` / `.png` / `.webp` / `.wav` / `.mp3` / `.svg` / `.ico` entries — they remain exactly as today.

DO NOT change getMimeType (server.mjs:1983-1985) — its fallback `?? "application/octet-stream"` is intentional for unknown extensions.

DO NOT touch handleStaticFile in this task (Task 2 owns it).

After the edit, run:
```bash
node --test test/phase-39-d01-mime-and-range.test.mjs
```
The unit-level MIME tests should now PASS (they were RED in Plan 39-1). The Range-related sub-tests will still fail until Task 2 lands.
  </action>
  <verify>
    <automated>node --test test/phase-39-d01-mime-and-range.test.mjs 2>&1 | tee /tmp/p39-t2-t1.out; grep -qE "ok 1.*mp4|pass.*mp4" /tmp/p39-t2-t1.out && echo "MIME TEST GREEN"</automated>
  </verify>
  <acceptance_criteria>
    - grep -c '"\.mp4":\s*"video/mp4"' server.mjs returns ≥1
    - grep -c '"\.webm":\s*"video/webm"' server.mjs returns ≥1
    - grep -c '"\.m4v":\s*"video/mp4"' server.mjs returns ≥1
    - grep -c '"\.ogg":\s*"audio/ogg"' server.mjs returns ≥1
    - grep -c '"\.aac":\s*"audio/aac"' server.mjs returns ≥1
    - grep -c '"\.m4a":\s*"audio/mp4"' server.mjs returns ≥1
    - grep -c '"\.mov":\s*"video/quicktime"' server.mjs returns ≥1
    - grep -c '"\.html":\s*"text/html' server.mjs returns ≥1 (existing entry preserved)
    - grep -c '"\.js":\s*"application/javascript' server.mjs returns ≥1 (existing entry preserved)
    - grep -c '"\.ico":\s*"image/x-icon"' server.mjs returns ≥1 (existing entry preserved)
    - node --check server.mjs exits 0
    - The MIME-only subset of test/phase-39-d01-mime-and-range.test.mjs now PASSES (the Range subset may still fail until Task 2)
  </acceptance_criteria>
  <done>MIME_TYPES table extended with 7 new entries (.mp4, .webm, .m4v, .mov, .ogg, .aac, .m4a). All existing entries preserved. node --check passes. Unit MIME tests turn GREEN.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Add Range request support + Accept-Ranges advertisement to handleStaticFile</name>
  <read_first>
    - server.mjs lines 3540-3580 (current handleStaticFile body) — to see the exact try/catch and pipe pattern in use
    - server.mjs lines 1-50 — verify `createReadStream` and `stat` are already imported from "node:fs" / "node:fs/promises"; if not, audit existing imports
    - .planning/phases/phase-39/39-RESEARCH.md §"D-01 Optional Range support" — the verbatim Range parser snippet (executor copies exactly)
    - test/phase-39-d01-mime-and-range.test.mjs — to see the Range assertions: status 206, content-range header format, exact byte slice
    - test/static-resource-headers.test.mjs (carry-forward L) — ensure Phase 31 h15 `connection: close` for /resources/animations/ is not broken
  </read_first>
  <files>server.mjs</files>
  <behavior>
    - GET /resources/animations/sandstorm.mp4 (no Range header) returns:
        HTTP 200
        Content-Type: video/mp4
        Accept-Ranges: bytes
        Content-Length: <full file size>
        Connection: close (Phase 31 h15 preserved)
        Body: full file
    - GET /resources/animations/sandstorm.mp4 with `Range: bytes=0-1023`:
        HTTP 206 Partial Content
        Content-Type: video/mp4
        Content-Range: bytes 0-1023/<totalSize>
        Content-Length: 1024
        Accept-Ranges: bytes
        Body: first 1024 bytes
    - GET with `Range: bytes=-100` (suffix length): returns last 100 bytes; start = totalSize - 100; end = totalSize - 1; status 206
    - GET with `Range: bytes=100-` (open-ended): returns from byte 100 to EOF; start = 100; end = totalSize - 1; status 206
    - GET with `Range: bytes=<n>-<m>` where n > m OR n >= totalSize OR malformed-but-bytes-prefix: returns 416 Range Not Satisfiable with Content-Range: bytes */<totalSize>
    - GET with `Range: <not bytes=>` (e.g. unknown unit): falls through to the 200 path (per RFC 7233 — unknown units are ignored)
    - All existing non-mp4 static-file responses unchanged (HTML, JS, CSS, JSON, PNG, etc.): still 200, still pipe full file, but now ALSO advertise Accept-Ranges: bytes (additive header — Phase 31 h15 connection-close contract unchanged)
  </behavior>
  <action>
Replace the body of handleStaticFile in server.mjs (~line 3545-3565) with the Range-aware version. Use this EXACT structure (copy verbatim from 39-RESEARCH.md §"D-01 Optional Range support" with adjustments to match local variable names already in use):

```javascript
async function handleStaticFile(req, res, routePath) {
  const targetPath = resolveStaticPath(req.url, routePath);
  if (!targetPath) { res.writeHead(403); res.end("forbidden"); return; }
  try {
    const fileStat = await stat(targetPath);
    const resolvedPath = fileStat.isDirectory() ? path.join(targetPath, "index.html") : targetPath;
    const contentType = getMimeType(resolvedPath);
    const headers = buildStaticResourceHeaders(routePath, contentType);

    // Phase 39 Plan 39-2 D-01: HTTP Range request support.
    // Required so Chromium's <video> element can seek (loop-wrap in
    // runtime-outside-mp4.js#maybeWrapOutsideMp4Loop sets video.currentTime
    // and Chromium issues a Range request). Without 206 support the
    // mp4 re-buffers from byte 0 on every loop wrap.
    const rangeHeader = req.headers["range"];
    if (typeof rangeHeader === "string" && rangeHeader.toLowerCase().startsWith("bytes=")) {
      const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader);
      if (match) {
        const totalSize = fileStat.size;
        const startRaw = match[1];
        const endRaw = match[2];
        let start;
        let end;
        if (startRaw === "" && endRaw !== "") {
          // suffix length form: bytes=-N -> last N bytes
          const suffix = Number(endRaw);
          start = Math.max(0, totalSize - suffix);
          end = totalSize - 1;
        } else if (startRaw !== "" && endRaw === "") {
          // open-ended form: bytes=N-
          start = Number(startRaw);
          end = totalSize - 1;
        } else if (startRaw !== "" && endRaw !== "") {
          start = Number(startRaw);
          end = Math.min(Number(endRaw), totalSize - 1);
        } else {
          start = NaN;
          end = NaN;
        }
        if (Number.isFinite(start) && Number.isFinite(end) && start >= 0 && start <= end && start < totalSize) {
          headers["accept-ranges"] = "bytes";
          headers["content-range"] = `bytes ${start}-${end}/${totalSize}`;
          headers["content-length"] = String(end - start + 1);
          res.writeHead(206, headers);
          createReadStream(resolvedPath, { start, end }).pipe(res);
          return;
        }
        // Range header was syntactically valid `bytes=N-M` but out of range
        // → 416 Range Not Satisfiable.
        res.writeHead(416, { ...headers, "content-range": `bytes */${totalSize}` });
        res.end();
        return;
      }
      // Unknown units in Range header → fall through to 200 (RFC 7233 §4.4).
    }

    // Default: full 200 response. Advertise Accept-Ranges on all responses
    // so clients know seeking is supported (additive header — does not
    // affect the Phase 31 h15 `connection: close` contract on /resources/animations/).
    headers["accept-ranges"] = "bytes";
    headers["content-length"] = String(fileStat.size);
    res.writeHead(200, headers);
    createReadStream(resolvedPath).pipe(res);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("not found");
  }
}
```

Verify the imports at the top of server.mjs include `stat` (from `node:fs/promises`) and `createReadStream` (from `node:fs`). If `createReadStream` is not already imported, add it to the existing fs import. Use the existing import style — grep `from "node:fs"` to find the line.

DO NOT touch the MIME_TYPES table (Task 1 owned that). DO NOT touch the /api/diag/ssr-eval-in-tab handler from Plan 39-1. DO NOT touch resolveStaticPath, buildStaticResourceHeaders, or any other helper.

After the edit, run:

```bash
# Unit tests:
node --test test/phase-39-d01-mime-and-range.test.mjs       # MUST pass fully now
# Static-resource non-regression:
node --test test/static-resource-headers.test.mjs           # MUST still pass
# Live curl probe (with server running):
SSR_RENDER_HOST=0 node server.mjs &
sleep 2
curl -s -D /tmp/h1 'http://127.0.0.1:4173/resources/animations/sandstorm.mp4' -o /dev/null
curl -s -H 'Range: bytes=0-1023' -D /tmp/h2 'http://127.0.0.1:4173/resources/animations/sandstorm.mp4' -o /tmp/slice
grep -i "content-type: video/mp4" /tmp/h1
grep -i "accept-ranges: bytes" /tmp/h1
head -1 /tmp/h2 | grep -i "206"
grep -i "content-range: bytes 0-1023/" /tmp/h2
[ "$(wc -c < /tmp/slice)" = "1024" ] && echo "SLICE OK"
kill %1
```
All four curl assertions must succeed.
  </action>
  <verify>
    <automated>node --test test/phase-39-d01-mime-and-range.test.mjs && node --test test/static-resource-headers.test.mjs && echo "PASS"</automated>
  </verify>
  <acceptance_criteria>
    - grep -c "content-range.*bytes" server.mjs returns ≥1 (the new code)
    - grep -c "createReadStream(resolvedPath, { start, end })" server.mjs returns ≥1
    - grep -c "writeHead(206" server.mjs returns ≥1
    - grep -c "writeHead(416" server.mjs returns ≥1
    - grep -c 'accept-ranges.*bytes' server.mjs returns ≥2 (one in the 206 path, one in the 200 path)
    - node --check server.mjs exits 0
    - `node --test test/phase-39-d01-mime-and-range.test.mjs` exits 0 (all sub-tests including Range)
    - `node --test test/static-resource-headers.test.mjs` exits 0 (Phase 31 h15 carry-forward preserved)
    - Live curl probe with running server: HTTP/1.1 206 returned for Range request; content-range header matches `bytes 0-1023/<digit>+`; sliced file size is exactly 1024
    - `connection: close` header is STILL present on /resources/animations/* responses (Phase 31 h15 contract — buildStaticResourceHeaders sets it; do not touch that helper)
  </acceptance_criteria>
  <done>handleStaticFile parses RFC 7233 single-range requests (bytes=N-M, bytes=-N, bytes=N-), returns 206 with content-range header and correct byte slice; returns 416 for out-of-range; advertises Accept-Ranges: bytes on all responses. Phase 39-1 unit tests AND the Phase 31 h15 static-resource-headers test both PASS.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Live verify D-01 in SSR Chromium tab (RED→GREEN turn for the live test)</name>
  <read_first>
    - test/live-e2e/test_phase39_d01_mp4_in_ssr.py (created in Plan 39-1) — the test that must now turn GREEN
    - test/live-e2e/conftest.py — running_server / ssr_ready fixture definitions
    - config/boards/nemesis-lockdown-a.json — to confirm the assetRef path that the test uses (sandstorm.mp4)
    - test/connection-stability/live-fixture-smoke.test.mjs — the Phase 38 W10 / D-08 hard-gate test that MUST stay green
  </read_first>
  <files></files>
  <behavior>
    - test/live-e2e/test_phase39_d01_mp4_in_ssr.py PASSES end-to-end (RED → GREEN)
    - test/connection-stability/live-fixture-smoke.test.mjs still PASSES (D-08 hard gate: fail=0, producerReady=0, renderHostDown=0, sustained ≥30000ms)
    - test/phase-38-w10-ws-frame-fragmentation.test.mjs still PASSES (L1 lock)
    - The plan does not modify any code in this task — it's purely a verification gate to confirm Task 1 + Task 2 collectively close D-01
  </behavior>
  <action>
This task verifies the D-01 fix end-to-end. NO code changes in this task — only test runs and a log capture.

1. Run the D-01 live-e2e test:
   ```bash
   cd /home/claw/tt-beamer
   python3 -m pytest test/live-e2e/test_phase39_d01_mp4_in_ssr.py -v 2>&1 | tee /tmp/p39-2-d01-live.log
   ```
   Expected: PASS. Specifically:
   - readyState transitions to 4
   - currentTime > 1.0 after 3-second wait
   - error is null
   - videoWidth === 1280
   - The two screenshots 1.5s apart have different pixel-byte-length (frame advanced)

2. Run the D-08 connection-stability hard gate:
   ```bash
   RUN_LIVE_TESTS=1 node --test test/connection-stability/live-fixture-smoke.test.mjs 2>&1 | tee /tmp/p39-2-d08.log
   ```
   Expected: log line containing `sustained >=30000ms heartbeats>=20 closed=false producerReady=0 producerClosed=0 renderHostDown=0`

3. Run the L1 WS-fragmentation regression:
   ```bash
   node --test test/phase-38-w10-ws-frame-fragmentation.test.mjs 2>&1 | tee /tmp/p39-2-w10.log
   ```
   Expected: PASS.

4. Run the static-resource-headers regression to confirm Phase 31 h15 `connection: close` survives:
   ```bash
   node --test test/static-resource-headers.test.mjs 2>&1 | tee /tmp/p39-2-h15.log
   ```
   Expected: PASS.

5. If ANY of the above 4 steps fails:
   - Investigate the failure mode.
   - If the failure is in Task 1 / Task 2 implementation: fix it in this plan (return to those tasks).
   - If the failure is in a carry-forward rail unexpectedly: STOP — do not proceed to Plan 39-3. Report the regression to the orchestrator with the log capture.

6. If all 4 pass: append a short success block to .planning/phases/phase-39/39-2-PLAN.md as a comment (or note it in the SUMMARY) — D-01 is closed and ready for Plan 39-5 to tag.

DO NOT modify production code in this task. DO NOT modify tests. DO NOT touch server.mjs.
  </action>
  <verify>
    <automated>python3 -m pytest test/live-e2e/test_phase39_d01_mp4_in_ssr.py -v && RUN_LIVE_TESTS=1 node --test test/connection-stability/live-fixture-smoke.test.mjs && node --test test/phase-38-w10-ws-frame-fragmentation.test.mjs && node --test test/static-resource-headers.test.mjs</automated>
  </verify>
  <acceptance_criteria>
    - `python3 -m pytest test/live-e2e/test_phase39_d01_mp4_in_ssr.py -v` exits 0 (PASS)
    - The pytest output contains a line matching `readyState.*4` (asserting the post-fix state)
    - `RUN_LIVE_TESTS=1 node --test test/connection-stability/live-fixture-smoke.test.mjs` exits 0 AND its stdout contains `sustained >=30000` AND `producerReady=0` AND `renderHostDown=0`
    - `node --test test/phase-38-w10-ws-frame-fragmentation.test.mjs` exits 0
    - `node --test test/static-resource-headers.test.mjs` exits 0 AND its stdout/code confirms `connection: close` is still set on /resources/animations/* responses (per Phase 31 h15)
    - `git diff --name-only HEAD~1 HEAD -- server.mjs` shows server.mjs was modified in this plan (by Tasks 1+2), but NO other files were modified in this task
  </acceptance_criteria>
  <done>D-01 RED tests from Plan 39-1 turn GREEN. The D-08 connection-stability hard gate stays GREEN. Phase 38 W10 WS-fragmentation regression stays GREEN. Phase 31 h15 connection: close contract preserved.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| HTTP client → handleStaticFile | Untrusted Range header value crosses into the server's stream slicer |
| Server response → Chromium <video> element | Content-Type now declares video/mp4 — browser will attempt media decode |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-39-2-01 | DoS | Range parser — very large suffix value | mitigate | Math.max(0, totalSize - suffix) clamps start to 0; createReadStream end clamp via Math.min(end, totalSize-1) bounds the slice |
| T-39-2-02 | DoS | Range parser — multi-range (e.g. bytes=0-100,200-300) | mitigate | Regex `^bytes=(\d*)-(\d*)$` rejects comma — multi-range falls through to 200 full-file response (acceptable degradation) |
| T-39-2-03 | Tampering | Range header injection | accept | createReadStream {start, end} is a numeric API; no string concatenation into a path or shell |
| T-39-2-04 | Information disclosure | Range allows enumerating file boundaries | accept | All /resources/* paths are already publicly fetchable LAN-side; Range doesn't grant new read access |
| T-39-2-05 | DoS | New video MIME entries allow any visitor to trigger Chromium media decode | accept | tt-beamer is LAN-only single-user; existing path traversal guard `toSafePath` in server.mjs:1988-1994 still bounds the file space |
| T-39-2-06 | Tampering | MIME sniffing exploits | mitigate | Adding `.mp4 → video/mp4` REDUCES sniff risk (browser no longer has to guess type) |
</threat_model>

<verification>
Phase-level gate for Plan 39-2:

```bash
# 1. Unit + integration regression suite
node --test test/phase-39-d01-mime-and-range.test.mjs
node --test test/static-resource-headers.test.mjs
node --test test/phase-38-w10-ws-frame-fragmentation.test.mjs

# 2. Live D-01 fix verification
python3 -m pytest test/live-e2e/test_phase39_d01_mp4_in_ssr.py -v

# 3. D-08 connection-stability hard gate
RUN_LIVE_TESTS=1 node --test test/connection-stability/live-fixture-smoke.test.mjs

# 4. Curl-level smoke (manual operator verification artifact)
node server.mjs &
sleep 2
curl -I 'http://127.0.0.1:4173/resources/animations/sandstorm.mp4' | grep -E "content-type|accept-ranges"
curl -I -H 'Range: bytes=0-1023' 'http://127.0.0.1:4173/resources/animations/sandstorm.mp4' | head -5
kill %1
```

All exit codes 0; all greps match.
</verification>

<success_criteria>
- server.mjs MIME_TYPES table has 7 new entries (.mp4, .webm, .m4v, .mov, .ogg, .aac, .m4a)
- server.mjs handleStaticFile parses bytes=N-M, bytes=-N, bytes=N- range forms; returns 206 with content-range; returns 416 on out-of-range; advertises Accept-Ranges: bytes on all responses
- All existing MIME entries unchanged (regression-safe)
- All Phase 38 carry-forward test rails (W10 WS-fragmentation, h15 static-resource-headers, D-08 connection-stability) GREEN
- D-01 live test PASSES (sandstorm.mp4 readyState=4, currentTime>1.0, videoWidth=1280, frame advances)
- No changes outside server.mjs (no test file edits in this plan; tests were created in Plan 39-1)
</success_criteria>

<output>
After completion, create `.planning/phases/phase-39/39-2-SUMMARY.md` containing:
- LOC count of server.mjs changes (split between MIME table + handleStaticFile)
- The pre-fix vs post-fix curl response snippets for `/resources/animations/sandstorm.mp4`
- Pre-fix vs post-fix `<video>` element state (readyState, currentTime, error) — extracted from the Task 3 live-test stdout
- The 4 carry-forward test results (pass/fail + key output line)
- Confirm Plan 39-1 RED tests for D-01 are now GREEN
</output>
