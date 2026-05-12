# Phase 39 Plan 39-1 — D-03 renderMode Diagnostic

**Captured:** 2026-05-12T21:11:00Z
**Captured by:** Phase 39 Plan 39-1 executor (autonomous run)
**Host:** Linux ClawMachine 6.17.0-14-generic #14~24.04.1-Ubuntu SMP PREEMPT_DYNAMIC Thu Jan 15 15:52:10 UTC 2 x86_64 x86_64 x86_64 GNU/Linux
**Chromium binary:** /home/claw/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome (source=bundled)
**Server env:** SSR_RENDER_HOST=1 SSR_PUBLISH=1 SSR_DIAG_ENABLE=1 SSR_DISPLAY=:498 PORT=14739
**Encoder:** x264-software (no VAAPI on this host)

## Server log [ssr-stats] renderMode values

Captured from `node server.mjs` stdout via the existing `[ssr-stats]
renderMode=` heartbeat (logged every 10th ssr-stats message ≈ every 10 s
per `src/server/ssr-webrtc-signaling.mjs:485-491`):

```
[ssr-stats] renderMode=gl
[ssr-stats] renderMode=gl
```

(Two consecutive heartbeats observed during the ~25 s capture window. The
runtime renderMode stayed stable at `gl`; no 2D-fallback drift was
observed during the run.)

## Live CDP probe values

Probed via the new `/api/diag/ssr-eval-in-tab` endpoint added in Task 1
of this plan. The expression `window.__ttBeamerEffectiveRenderMode?.()`
is the same one `ssr-stream-publisher.mjs` reads to populate
`ssr-stats.renderMode`.

```
curl -s 'http://127.0.0.1:14739/api/diag/ssr-eval-in-tab?expr=window.__ttBeamerEffectiveRenderMode%3F.()%20%7C%7C%20%22unknown%22'
→ {"ok":true,"value":{"ok":true,"value":"gl"}}
```

Auxiliary security-gate probes (also captured to verify the endpoint
behaves per its 39-RESEARCH.md security baseline):

```
curl -s 'http://127.0.0.1:14739/api/diag/ssr-eval-in-tab?expr=1%2B1'
→ {"ok":true,"value":{"ok":true,"value":2}}

curl -s 'http://127.0.0.1:14739/api/diag/ssr-eval-in-tab?expr=eval(%221%22)'
→ {"ok":false,"error":"invalid_expr"}
```

Both data sources agree: **`gl`**. No 2D fallback active on this
hardware.

## Plan 39-4 sub-path decision

Decision rule (per 39-RESEARCH.md §"D-03 Implementation Step 1"):

- If renderMode contains "2d" / "swiftshader" / "gl->2d" → **sub-path A**
  (Chrome flag swap to `--use-angle=swiftshader`)
- If renderMode is "webgl" / "webgl2" / "gl" → **sub-path B**
  (UV-inset epsilon in fragment shader at
  `src/app/runtime/viewport/runtime-projection-gl-renderer.js:264-275`)

**Observed value:** `gl`

**Decision for Plan 39-4:** sub-path B (UV-inset epsilon in fragment
shader).

**Rationale:** The SSR Chromium tab is running with hardware/software GL
active (renderMode=`gl`), so the Phase-30 pixel-snap fixes ARE firing.
The seams must therefore be a fragment-shader sampling artefact at
shared cell edges — exactly the failure mode Plan 39-4 sub-path B
targets with a UV-inset epsilon (`uv = clamp(vUV, 0.5/uTexSize,
1.0 - 0.5/uTexSize)`). Sub-path A (Chrome flag swap) is NOT needed and
would carry an unwarranted risk of regressing the Phase 34 hotfix h2
revert that protects against the Mesa-llvmpipe synchronous-flush hang.

## Notes

- This DIAG.md is the BLOCKING input for Plan 39-4 — that plan's first
  task must read this file before touching any GL code.

- Capture was run on the dev box, NOT on the operator's actual hardware.
  If the operator's UAT in Plan 39-5 shows a different renderMode (e.g.
  `2d` or `swiftshader`), Plan 39-4 must re-execute with sub-path A
  AND keep sub-path B as a follow-up regression rail.

- The renderMode probe test
  `test/phase-39-d03-render-mode-probe.test.mjs` will append additional
  observation lines to this file every time it runs under
  RUN_LIVE_TESTS=1. Operator-side runs of that test produce the
  authoritative value for production.

- The endpoint security gates (`forbidden`, `invalid_expr`) work as
  designed — the `eval(...)` and `Function(...)` regex rejection
  prevents arbitrary nested-eval exploits per threat T-39-1-02.
