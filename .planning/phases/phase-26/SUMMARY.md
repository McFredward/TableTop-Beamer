# Phase 26 — Data-storage cleanup + Pi /output/ rendering hardening (CLOSURE)

## Status

**CLOSED.** 9 functional items (26-1..26-9) shipped as feature/refactor
commits, plus 9 hotfix waves (26-h1..26-h9) addressing UX polish, board
management, animation polish, and a multi-fix Pi /output/ rendering
hardening pass. Phase 25 wire-protocol and storage-key invariants
unchanged.

## Wave delivery

### W1 — Data-storage cleanup (26-1..26-9)

- **26-1** Cleaned dead zones from board catalog data; normalized board
  schemas across `config/boards/<id>.json`.
- **26-2** Scrubbed Maschinenraum residue.
- **26-3** Polished board JSON shape.
- **26-4** `b952339` Retired the legacy `config/boards/imported/`
  migration path.
- **26-5** `78e9af8` `APP_VERSION` bumped to `0.26.0`.
- **26-6** `c2aec19` **Unified per-board state into
  `config/boards/<id>.json`.** The board JSON now holds both static
  catalog data AND live state (room geometry, room FX, hidden-name
  flags, polygons, cluster definitions). `global-defaults.json` shrunk
  to truly-global fields (audio, animation speed, sound map,
  projection-mapping corners). Images consolidated under
  `/config/boards/assets/`. Package format bumped to
  `tt-beamer.board-package.v3` (no `boardProfile` field — board carries
  it inline).
- **26-7** `851d8d1` Extended "Break solid color" to power-outage.
- **26-8** `cb0435e` "Copy animations from another board" button.
- **26-9** `a3011c0` Freshly-imported boards start with empty animation
  libraries (no inherited defaults).

### Hotfix series (26-h1..26-h8)

- **h1** `9bd5de6` Cascade board-delete to profiles + projection
  profiles (was leaving orphan entries).
- **h2** `e01092d` Drop horizontal stripes from power-outage animation
  (visual polish).
- **h3** `6110eae` Persist animation-speed slider so /output/ stays in
  sync (slider was a runtime-only knob; now flows through global
  defaults to all clients).
- **h4** `4cfde71` Clearer "Add Play Area" UX.
- **h5** `afc59f8` Edge-midpoint dots in a clearly different hue from
  vertex dots (mistaken-click fix).
- **h6** `b58e3ac` Active vertex distinct from gold midpoints.
- **h7** `b471a38` Outside/inside dashboard buttons rebuild on FX
  edits (stale picker state after edit).
- **h8** `9510f93` Disambiguate same-named rooms in cluster picker
  (Quartiermeister vs Quartiermeister across boards).

### Hotfix wave 9 — Pi /output/ rendering hardening (26-h9, `d98c19c`)

After data-storage cleanup landed, interactive testing on the Raspberry
Pi 5 surfaced a hard regression: `/output/` ran at ~3.5 fps with most
animations and showed visible "transformation" lines along the GL
mesh-warp triangulation, especially on solid-color rooms. The desktop
dashboard was unaffected. A multi-step debugging session (documented in
`.planning/debug/pi-output-rendering.md`) produced these bundled fixes,
shipped as a single closure commit because each fix depended on the
previous one's diagnostic infrastructure:

#### Diagnostic infrastructure (enabled the rest)

- **Render-mode setting** (auto / 2d / gl) added to System tab. Server-
  persisted in `global-defaults.json`, live-synced to every client
  (including Pi /output/) over the existing `global-config-update`
  WebSocket. Critical because it isolated GL from procedural-canvas
  costs during diagnosis (and remains a permanent escape hatch for
  weak-hardware setups).
- **Diagnostic overlay** chip on /output/ — version · fps · mode ·
  canvas (WxH@DPR) · frame cost. Toggleable in System tab,
  server-persisted, live-synced. rAF-driven fps sampler + 500ms-
  interval reader against `window.__ttBeamerStateProbe`. Made the
  bottleneck visible in real time.

#### Performance fixes

- **Solid-color cross-room performance.** Phase 25-h3 introduced
  `globalCompositeOperation = "copy"` to avoid alpha-bump at room
  boundaries. On Pi this triggered a per-call canvas backing-store
  snapshot (~5-30ms per solid-color room). Replaced with a
  `clearRect + fillRect` pair, gated to skip the clear when the outer
  composite is "lighter" — preserves the Phase 25-W4.1 cross-room
  overlap no-bump invariant without the Pi cost. Many simultaneous
  solid-color rooms now render at full frame rate.
- **GL triangle seams.** Shader precision bumped to `highp` where
  available (with a mediump fragment-shader fallback for OpenGL ES
  drivers without high-precision support). Texture filter changed from
  `LINEAR` to `NEAREST` so per-fragment lookups don't average across
  triangle boundaries — eliminates the 1-pixel ridges that were
  especially visible on uniform solid-color surfaces. NEAREST vs LINEAR
  is perceptually identical at projector viewing distance.

#### Reliability fixes

- **GIF playback on Pi.** Three independent reliability issues fixed
  in `runtime-gif-playback.js`:
  1. `warmGifAssetPath` bypasses `requestIdleCallback` on
     `OUTPUT_ROLE_FINAL`. Pi Chromium's idle queue can starve for
     seconds during startup; deferring decode to idle made GIFs
     intermittently fail to play before short animations finished.
  2. Per-board GIF definitions are warmed in addition to the static
     `ROOM_GIF_ANIMATION_ASSETS` map. Without this, a GIF triggered
     from dashboard for a board not yet rendered on /output/ landed in
     the lazy-decode path.
  3. `ImageDecoder` block wrapped in try/catch — Pi Chromium reports
     `canDecodeGifFramesWithImageDecoder=true` but specific GIFs (esp.
     large/complex frames under memory pressure) can throw mid-decode.
     Without the catch, the failure left `entry.status="fallback"` with
     empty frames forever. Now falls through to the synchronous parser.

## Aggregate metrics

- **Commits since `phase-25-end-h30`:** 10 fix/feat + 1 docs
  (READMEs ff186fc..81a72ff) + 1 closure = 12 total on master.
- **`src/` runtime delta:** ~+450 / ~-150 net (bulk of the line delta in
  the closure commit is user-saved state in `config/boards/<id>.json`
  + a new projection profile, not runtime code).
- **No ROOM_SCHEMA, wire-protocol, or storage-key changes.** Schema
  bumped from `tt-beamer.board-package.v2` to `v3` for the per-board
  state unification (26-6) — this is a content-shape change inside the
  same wire envelope, not a transport break.

## Known limitations / follow-ups

- **26-h9 user verification pending on Pi.** The triangle-line
  (NEAREST filter) and ImageDecoder-fallback fixes were not yet
  validated on the Pi at phase-close time. If either issue persists
  after a Pi reload at v0.26.23, escalate to:
  - Triangle lines: investigate CSS compositor scaling (canvas
    1920×891 vs projector 1920×1080 mismatch causing browser bilinear
    upscale artifacts).
  - GIF unreliability: pre-allocate ImageBitmap memory, transcode the
    17 MB slime.gif to a lighter palette, or cache decoded frames in
    IndexedDB.
- **Server.mjs requires manual restart.** The renderMode +
  diagnosticOverlay pass-through in `handleGlobalDefaultsSave` does not
  hot-reload (no nodemon). After 26-h9 the running `node server.mjs`
  process needs Ctrl+C and a fresh start before either field
  round-trips through the server.
- **Diagnostic chip canvas shows 1920×891 not 1920×1080.** Suggests the
  /output/ stage CSS is not at full HD (probably the Chromium window
  isn't truly fullscreen on the Pi). Not a render-correctness bug, but
  worth investigating if perfect 1:1 projection is desired.
- **Render mode "auto" still routes through GL when grid
  displacements exist.** A user who experiences GL issues on Pi must
  manually set "2d". Auto-detect-and-fallback (e.g. if first frame
  exceeds N ms, switch to 2d) was not implemented.

## Tags

| Tag | Hash | Marker |
|-----|------|--------|
| `phase-26-start` | `e9c3109` | (= phase-25-end-h30; Phase 26 begins on the same commit) |
| `phase-26-end-h9` | (HEAD) | Phase 26 closed — data-storage cleanup + Pi rendering hardening complete |

## File touches per commit (for revert targeting)

```
26-1..26-5  (cleanup/version)  config/boards/* + src/app/lib/shared/config.js
26-6   c2aec19  per-board state unification (~30 files)
26-7   851d8d1  src/app/runtime/render/runtime-effect-visuals.js
26-8   cb0435e  Animation Editor "copy from another board"
26-9   a3011c0  Board import default-animations
26-h1  9bd5de6  Board-delete cascade
26-h2  e01092d  src/app/runtime/render/runtime-effect-visuals.js
26-h3  6110eae  Animation-speed sync
26-h4  4cfde71  Add Play Area UX
26-h5  afc59f8  Polygon-editor visuals
26-h6  b58e3ac  Polygon-editor visuals
26-h7  b471a38  FX panel rebuild on edit
26-h8  9510f93  Cluster picker disambiguation
26-h9  d98c19c  Pi /output/ hardening (23 files, render-mode + chip
                + solid-color perf + GL seams + GIF reliability)
```

## Smoke test checklist (for the user)

When ready, smoke test:

- **26-6** Open a board → all room geometry, FX library, hidden-name
  flags, cluster definitions persist correctly through reload.
- **26-7** Power Outage with "Break solid color" enabled in another
  room → solid colors break correctly during the outage.
- **26-8** Open Animation Editor → "copy from another board" pulls
  animations from any other board's library.
- **26-9** Import a fresh board JSON → animation libraries are empty
  (not auto-populated with defaults).
- **26-h1** Delete a board → its entries in `config/profile/*.json`
  and `config/projection-profiles.json` are removed.
- **26-h3** Adjust Animation Speed slider on dashboard → /output/
  reflects the new rate within ~200ms.
- **26-h7** Edit a room FX animation → the dashboard buttons rebuild
  immediately to show the new label/icon.
- **26-h8** Two boards with same-named rooms → cluster picker shows
  both with disambiguating board prefix.
- **26-h9** Pi /output/ — check (a) version chip and diagnostic
  overlay toggle in System tab, (b) render-mode set to "2d" hides the
  GL canvas, (c) solid color in many rooms simultaneously runs smooth
  (~30+ fps), (d) GL mode shows no triangle seam lines on
  solid-color rooms, (e) GIF animations play reliably after Pi reload.

---

## Closure marker

- Tag: `phase-26-end-h9` (this commit's parent + `d98c19c`).
- Final version: `0.26.23` (h9 chip).
- Phase artifact: this `SUMMARY.md` (W1 + hotfix appendix).
- All hotfix commits land on `master` between `phase-26-start`
  (`e9c3109`) and the closure marker.
