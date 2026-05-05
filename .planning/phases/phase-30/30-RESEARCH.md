# Phase 30: Render-Stability Regressions Closure - Research

**Researched:** 2026-05-05
**Domain:** Render pipeline (GL + 2D mesh-warp), GIF playback reliability on Pi /output/, server-authoritative live-sync of UI flags
**Confidence:** HIGH on B2 hypothesis verdict + B3 hop map; MEDIUM on B1 root cause (multiple plausible causes — needs UAT to discriminate)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Wave Structure & Sequencing:**
- **D-00:** 3 Plans + sequenzielle Reihenfolge. Phase 30 = drei separate Plans in disjunkten Code-Subsystemen (Renderer / GIF-Pipeline / Live-Sync). Kein Wave-0-Plan, weil alle Backstops UAT-only sind (keine Test-Scaffold-Vorarbeit nötig).
  - **30-01 = B3** (Overlay-Sync) — zuerst, weil B1 das Overlay als Diagnose-Werkzeug benötigt (Render-Mode-Readout etc.).
  - **30-02 = B1** (Seams) — danach, mit funktionierendem Diagnostic-Overlay.
  - **30-03 = B2** (Pi GIF) — kann technisch parallel zu B1 laufen, aber sequenziell für Execute-Phase-Simplicity.

**B1 — Seams in Animations (insbesondere solid-color):**
- **D-01:** Beide Render-Pfade müssen seam-frei sein (2D + GL).
- **D-02:** Freie Hand am Mesh-Warp-Code (Phase 27 W4). Researcher und Planner dürfen die 2D/GL-Mesh-Warp-Logik refactoren.
- **D-03:** Manueller UAT only, kein Headless-Snapshot-Diff.
- **D-04:** Acceptance Bar: solid-color + andere Animationen (Malfunction, Fire, Slime, Scanning, Flicker, Alarm) zeigen keine Naht-Linien innerhalb eines Raums; Verifikation auf Pi /output/ in BEIDEN Render-Modi (2D + GL).

**B2 — GIF Reliability on Pi /output/:**
- **D-05:** Hypothesis-First Investigation (Phase-28-B5 Hash vs. warmGifAssetPath Cache-Key). ~1h Budget. Wenn Hypothese falsch → breit re-investigieren.
- **D-06:** "Reload bringt einige, brecht andere" = selbe Root-Cause (Memory-/Decode-Slot-Pressure).
- **D-07:** Eventual Consistency, kein Blocking Boot. Pi /output/ rendert initialen Frame sofort. GIFs warmen async + retry.
- **D-08:** Manueller UAT auf Pi only.

**B3 — Diagnostic Overlay Live-Sync:**
- **D-09:** Researcher prüft Toggle-Roundtrip zuerst.
- **D-10:** Top-Down End-to-End-Investigation (Dashboard-Toggle → POST → Persistierung → Broadcast → /output/ Apply → State → DOM-Apply → CSS).
- **D-11:** Acceptance-Latenz: ~100ms (WS-Broadcast).
- **D-12:** Manueller UAT only.

### Claude's Discretion

- **D-13:** Genaue Plan-Reihenfolge B1 vs. B2 nach B3 — Researcher/Planner wählt nach Aufwandsschätzung.
- **D-14:** B1-Researcher darf Scope auf Sub-Plans aufteilen (B1a Investigation/Fix, B1b Mesh-Refactor) wenn struktursinnvoll.
- **D-15:** Genaue Hash-Resolver-Form für B2 (separate Helper, inline-API-Erweiterung, oder URL-Normalizer am Decode-Eingang).
- **D-16:** Ob B3-Researcher beim Fix den Apply-Pfad neu strukturiert oder nur punktuell repariert — abhängig von welchem Hop tatsächlich kaputt ist.

### Deferred Ideas (OUT OF SCOPE)

- Multi-Board Regression-Coverage (Phase 30 ist Single-Board-Test = Nemesis Lockdown Board A).
- Render-Mode Auto-Fallback bei Seam-Detection.
- Headless Pixel-Diff Test-Infrastruktur.
- Asset-Versions-History / -Undo.
- Auto-Fallback 2D ↔ GL bei Performance-Drops.
- Neue Animations-Typen oder neue Render-Modes.
- Änderungen am Persistence-Schema (Phase 29 v4 bleibt).
- Refactoring außerhalb dessen, was zur Regression-Behebung minimal nötig ist (Ausnahme: B1 Mesh-Warp, D-02).
- Backwards-Compat zu vor-h9 Render-Pfaden.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| B3 | `Show diagnostic overlay`-Toggle propagiert nicht zu /output/. Toggle-State synct live an alle Clients inkl. /output/, Overlay erscheint/verschwindet sofort. | Top-down hop map dokumentiert (siehe `## B3 End-to-End Hop Map`). 6 verifizierbare Hops mit file:line refs für instrumentation/diagnosis. Wahrscheinlichster broken-hop: Hop 5 (DOM-Apply auf /output/-Role) — `syncRuntimePanelsFromState` kann gegated sein, aber on-broadcast-path läuft sie unconditional → Diagnose nötig. |
| B1 | Sichtbare Naht-Linien in `solid-color` und anderen Animationen innerhalb eines Raums; beide Render-Modi (2D + GL) seam-frei auf Pi /output/. | Phase-26-h9 GL-Fix (`highp` + `NEAREST`) ist intakt im Code (`runtime-projection-gl-renderer.js:96-151`). Kandidaten-Root-Causes: (1) 2D-Fallback-Pfad (`runtime-projection-2d-fallback-renderer.js`) hat einen seam-prone INFLATE+stroke-Trick mit bilinear filtering; (2) Phase-27-W4 fresh-profile default ist 80%/3×3 mit displaced points → mesh-warp läuft IMMER auf /output/ (nicht nur bei explizit aligned profiles); (3) sub-pixel polygon-edge rounding zwischen `clipToRoom` und solid-color `fillRect(boundingbox)` interagiert mit warp-grid-cell-Grenzen. |
| B2 | GIF-Animationen starten zuverlässig auf Pi /output/ ohne Reload; nach Reload brechen keine anderen ab; eventual consistency mit async warm + retry. | **Hypothese REFUTED** (siehe `## B2 Hypothesis Verification`): warm + decode benutzen beide raw `path` als Map-Key — keine Cache-Key-Inkonsistenz. Aber konkrete Root-Cause-Kandidaten gefunden (siehe `## B2 Real Root-Cause Candidates`): in-memory Map entry never re-decodes after manifest update; Pi-side concurrent ImageDecoder pressure on slime.gif (22 MB) + multi-GIF parallel decode. |
</phase_requirements>

## Summary

Phase 30 schließt drei Render-/Sync-Regressionen vor Release. Alle drei sitzen auf bestehender Code-Infrastruktur (Phase 26 h9 + Phase 27 W4 + Phase 28 B5/B6), die intakt im Code ist — die Regressionen liegen in der Interaktion zwischen den Schichten, nicht in einem Code-Verlust.

**Primary recommendation:**

1. **B3 zuerst (30-01).** Top-down instrumentieren: jedes der 6 dokumentierten Hops mit einem console.log-Probe + Pi-side reload markieren. Verdacht auf Hop 5 (DOM-apply via `syncDiagnosticOverlayPanel` auf /output/ broadcast-Pfad) — aber CODE-Inspektion zeigt keinen Defekt; Regression muss an Runtime-Hop gefunden werden.

2. **B2-Hypothese ist im wörtlichen Sinn FALSE.** `warmGifAssetPath()` und `decodeGifPlaybackFrames()` sind beide auf raw `path` keyed (siehe `## B2 Hypothesis Verification`). Phase 28 B5 hat zwar `?v=<hash>` URLs für `fetch()` eingeführt, aber den Map-Key gleich gelassen. Die echte Regression liegt anderswo — wahrscheinlichste Kandidaten in `## B2 Real Root-Cause Candidates`.

3. **B1 ist entweder 2D-Fallback (sehr wahrscheinlich, weil das `INFLATE`-Trick + bilinear filtering fundamental seam-prone ist) ODER eine Wechselwirkung zwischen polygon-edge rounding und mesh-warp grid cell boundaries.** GL-Mode-Seams würde dem Phase-26-h9-Fix widersprechen — sollte er noch auftreten, ist eine andere Schicht broken (Phase 27 W4 Trapez-Ecken / Squish-Bars / `getStableRoomStretchAnchor`). Diagnostic Overlay nach B3-Fix gibt dem Researcher den `mode`-Readout, um zu sagen welcher Pfad aktiv läuft.

## Project Constraints (from CLAUDE.md)

Keine `./CLAUDE.md` im Repository gefunden. Kein `.claude/skills/` oder `.agents/skills/`. `.planning/config.json` enthält nur:
```json
{ "workflow": { "_auto_chain_active": true, "use_worktrees": false } }
```
Keine `nyquist_validation`-Einstellung → trifft Default zu (= aktiv). Aber Phase 30 hat per D-03/D-08/D-12 explizit **UAT-only** Acceptance — keine Wave-0-Test-Scaffolds zu erstellen.

## Standard Stack

**Phase 30 fügt KEINE neuen Libraries hinzu.** Existing stack:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js (server.mjs) | 24+ (built-in) | HTTP + WebSocket fanout + filesystem persistence | `[VERIFIED: package.json absent → server.mjs uses node: builtins exclusively (test/_helpers.mjs comment line 3 confirms "Pure Node 24 builtins")]` |
| node:test | builtin | Test runner (40/40 baseline) | `[VERIFIED: phase-29/SUMMARY.md + test-suite-run output]` |
| Browser WebGL 1.0 | n/a | mesh-warp on /output/ (`runtime-projection-gl-renderer.js`) | `[VERIFIED: GLSL ES 1.0 shader code at lines 107-119]` |
| ImageDecoder API | n/a (browser) | Fast GIF decode path on Chromium | `[VERIFIED: runtime-gif-decoder.js:14 + runtime-gif-playback.js:63-91]` |
| Synchronous JS GIF parser | inline | Fallback when ImageDecoder unavailable / throws | `[VERIFIED: runtime-gif-decoder.js:191-366]` |

**Installation:** Keine Installation/Versions-Bump nötig.

**Version verification:** Keine externen Dependencies in Phase 30 Scope. Phase 26 h9 GL-Fix nutzt browser-builtin WebGL 1.0 — verfügbar auf Pi 4/5 + alle modernen Chromium. Confidence: HIGH `[VERIFIED]`.

## Architecture Patterns

### Established Pattern 1: Server-authoritative `runtimeFlags` mit `global-config-update` Broadcast

**Where:** `server.mjs:3045-3088` (`handleGlobalDefaultsSave` schreibt nach `global-defaults.json` und broadcastet `global-config-update`); `runtime-live-sync-core.js:525-577` (Client empfängt + refetcht + applied via `applyGlobalDefaultsPayloadToState`).

**Used by:** `renderMode`, `diagnosticOverlay`, `audio.{enabled,volume}`, `animationSpeed`, `projectionMapping`. B3 erbt das Pattern — kein neuer Channel.

**Critical detail:** Der Server speichert NUR die expliziten Felder; Client `applyGlobalDefaultsPayloadToState` (runtime-global-defaults.js:390-453) liest sie zurück. **Es gibt NUR EINEN Broadcast-Pfad mit "configürungen": `global-config-update`.** Sub-Discrimination via `payload.target` (z.B. `config/asset-manifest.json` → triggert separaten `/api/resources` refetch).

`[VERIFIED: code at server.mjs:3072-3081 + runtime-live-sync-core.js:525-547]`

### Established Pattern 2: Asset-Hash-aware URL building (Phase 28 B5)

**Where:** `runtime-asset-manifest.js:39-50` (`resolveAssetUrlWithHash` — single-source resolver); used by `runtime-gif-playback.js:48` (gif fetch) + `runtime-outside-mp4.js:47` (video src). Map-keys (in-memory caches) bleiben raw `path`; nur die Network-URL bekommt `?v=<12-hex-chars>`-Suffix.

**Pattern:** Resolver returns `path` unchanged when no manifest entry exists (line 48). The hash IS a cache-busting token, NOT a security control (see comment lines 14-17).

`[VERIFIED: runtime-asset-manifest.js:39-50]`

### Established Pattern 3: Render-Mode Toggle (auto/2d/gl) gates GL-mesh-warp activation

**Where:** `runtime-projection-mapping.js:145-192` (`postDrawMeshWarp`) — server-driven, server-persisted, live-synced.
- `"2d"` → forces 2D-fallback path (`postDrawMeshWarp2D`), GL canvas hidden.
- `"gl"` → forces GL path even on identity warp.
- `"auto"` → GL when grid has displacements, otherwise no warp.

**B1 implication:** Phase-27-W4 fresh-profile default has displaced points (10%/90% on 3×3 grid, see `runtime-projection-grid-state.js:50-82`). `hasGridDisplacements()` returns TRUE on default. **/output/ ALWAYS routes through mesh-warp (GL or 2D)**, even on a fresh load.

`[VERIFIED: code at lines noted; comment block at runtime-projection-grid-state.js:50-69 spells this out explicitly]`

### Recommended Project Structure (existing)

```
src/app/runtime/
├── viewport/
│   ├── runtime-projection-mapping.js          # Top-level dispatch (postDrawMeshWarp)
│   ├── runtime-projection-gl-renderer.js      # GL mesh-warp (B1 GL-side)
│   ├── runtime-projection-2d-fallback-renderer.js  # 2D mesh-warp (B1 2D-side, suspect)
│   ├── runtime-projection-grid-state.js       # grid + buildNewProfileDefaultGrid
│   └── ... (handle-ui, handle-drag, profile-persistence)
├── render/
│   ├── runtime-gif-playback.js                # warm + decode (B2 surface)
│   ├── runtime-gif-decoder.js                 # ImageDecoder + parser (B2 surface)
│   ├── runtime-effect-visuals.js              # solid-color fillRect (B1 surface)
│   ├── runtime-canvas-clip.js                 # clipToRoom (B1 surface)
│   └── runtime-draw-loop.js                   # drawAnimation, drawRoomComposition (B1 surface)
├── live-sync/
│   ├── runtime-live-sync-core.js              # broadcast handler (B3 hop 4 + 5)
│   └── runtime-global-defaults.js             # applyGlobalDefaultsPayloadToState (B3 hop 5)
├── state/
│   └── runtime-asset-manifest.js              # B5 hash resolver
└── runtime-orchestration.js                   # syncDiagnosticOverlayPanel (B3 hop 6)
```

### Anti-Patterns to Avoid

- **Headless pixel-diff for B1.** D-03 explicitly excludes this — "überproportional aufwendig für Single-User-Pre-Release."
- **Adding a separate apply-DOM helper for diagnosticOverlay.** Pattern is already in `syncDiagnosticOverlayPanel` (orchestration:957-967); fix the apply-trigger, don't add a sibling.
- **Re-warming the entire GIF cache on manifest update.** Triggers Pi memory pressure. Better: invalidate-on-mismatch lazily.
- **Forcing GL/`auto` mode for B1 fix.** D-01 requires both 2D AND GL paths to be seam-free; cannot rely on render-mode override.
- **Trying to fix B1 without B3 in place.** D-00/D-13 lock the order: without diagnostic overlay, the user cannot see which mode is active on Pi (auto routes through GL when displacements exist; user can't tell apart from logs).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebSocket fanout for diagnosticOverlay | New ws channel | Existing `global-config-update` broadcast | B6 Phase 28 already wired; D-16 server.mjs:3072 broadcasts on every save |
| Hash-aware URL building | Inline URL string concatenation in B2 fix | `window.TT_BEAMER_RUNTIME_ASSET_MANIFEST.resolveAssetUrlWithHash(path)` | Single source of truth (`runtime-asset-manifest.js:39-50`); already strips prior `?v=...` defensively |
| GIF parser implementation | Re-implement LZW + GCE block parsing | Existing `runtime-gif-decoder.js` (366 LOC, working) | Already battle-tested; ImageDecoder fallback path |
| Mesh-warp triangulation refactor | New shader pipeline | Phase 26 h9 + Phase 27 W4 GL-renderer | `_postDrawMeshWarpGL` already correct (highp + NEAREST); 2D fallback uses different algorithm |
| Manual rAF probe for chip FPS | Custom timer | `index.html:927-972` already samples frame deltas with sliding 60-frame window | Working; `__ttBeamerStateProbe` exposes runtime state |

**Key insight:** Phase 30 is REGRESSION CLOSURE — fix the wire/glue, don't rewrite the rendering or asset infrastructure.

## Runtime State Inventory

> Trigger: Phase 30 ist Bug-Fix Phase, kein Rename/Refactor. Aber B2 berührt in-memory caches und B3 berührt persisted server-state. Audit:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data (server-side) | `config/global-defaults.json` field `diagnosticOverlay: boolean` (already in schema, server.mjs:3049-3060). `config/asset-manifest.json` (Phase 28 B5; verified shape: `{schema, generatedAt, hashByPath: {[url]: {hash, size, mtime}}}`). | None — schema unchanged. Per CONTEXT: "Änderungen am Persistence-Schema (Phase 29 v4 bleibt)" out of scope. |
| Live service config (browser in-memory) | `gifPlaybackCacheByPath` Map (raw path keyed, runtime-gif-playback.js:18). `roomVideoCacheByPath` / `outsideVideoCacheByPath` Maps (raw path keyed, runtime-outside-mp4.js:37-94). `_hashByPath` (runtime-asset-manifest.js:25). | None for B2 minimal fix; **B2 may need a re-decode trigger when manifest hash for a cached path changes** (otherwise old bytes serve forever after re-upload). See `## B2 Real Root-Cause Candidates` Item C. |
| OS-registered state | None — pure browser app + Node server, no OS-level registrations. | None. |
| Secrets/env vars | None. Server has no secret env vars for these regressions. | None. |
| Build artifacts / installed packages | None — no build step (`server.mjs` serves files directly). No `package.json` at repo root (test-suite uses `node --test "test/**/*.test.mjs"` with built-in node:test). | None. |

**Nothing found in remaining categories:** All five categories audited. The only persistent state shape Phase 30 might modify is `config/global-defaults.json#diagnosticOverlay` — but that field already exists.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | server.mjs runtime + test runner | ✓ | 24+ (per phase-28/29 closures) | — |
| node:test | Existing 40-test suite (must remain green per CONTEXT) | ✓ | builtin | — |
| Chromium WebGL 1.0 | Pi /output/ GL mesh-warp | ✓ on Pi 4/5 | n/a | 2D fallback already coded |
| Chromium ImageDecoder API | Fast GIF decode path | ✓ on Pi Chromium | n/a | Synchronous parser fallback already coded |
| Pi-Hardware (Nemesis Lockdown Board A) | UAT verification per D-03/D-08/D-12 | ✓ (Test-Board genannt) | n/a | none — UAT-only acceptance |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

## Common Pitfalls

### Pitfall 1: Mesh-Warp 2D-Fallback Seams sind FUNDAMENTAL bei bilinear filter + per-triangle clip

**What goes wrong:** `runtime-projection-2d-fallback-renderer.js:25-77` (`drawAffineTriangle`) verwendet ein **clip + INFLATE 1.5px + setTransform + drawImage** Pattern mit `imageSmoothingEnabled = true` (line 72). Selbst mit dem 1.5px-Inflate-Trick produziert die per-triangle clip-Bounds in Kombination mit bilinear filtering an gemeinsamen Triangle-Edges sichtbare Seams. Phase-26-h9 ging beim GL-Fix den umgekehrten Weg (NEAREST), weil GL und 2D-Canvas unterschiedliche Sampling-Behavior haben.

**Why it happens:** Der Comment in der Datei (lines 38-47) sagt explizit, dass der Fix von 0.5px → 1.5px war "too subtle... 1.5 px overlaps neighbours enough that the seam is painted over." Aber bei solid-color content mit semi-transparency (alpha < 1) sieht man die Overlaps trotzdem als 1px-helle Linien.

**How to avoid:** B1-Fix für 2D-Pfad muss EINEN von:
- (a) Triangle-overlap so stark machen, dass alpha-summing keinen Effekt mehr hat, oder
- (b) `imageSmoothingEnabled = false` (NEAREST analog zum GL-Fix), oder
- (c) Den 2D-Pfad auf eine snapshot-und-redraw-once-Strategie umstellen (single-quad statt per-triangle), oder
- (d) Den 2D-Pfad ganz entfernen und bei GL-Init-Failure einen no-warp fallback rendern (graceful degradation auf identity).

**Warning signs:** Seams sind besonders sichtbar auf solid-color (uniform brightness — Triangle-Boundaries leuchten als +1px-Streifen). Bei MP4 / GIF content sind sie weniger sichtbar (content-dependent textures maskieren Sub-Pixel-Drift).

`[VERIFIED: code inspection of runtime-projection-2d-fallback-renderer.js + runtime-projection-gl-renderer.js comparison]`

### Pitfall 2: Phase-27-W4 Default-Grid hat displaced points → mesh-warp läuft auf jeder Pi /output/-Session

**What goes wrong:** `buildNewProfileDefaultGrid()` (runtime-projection-grid-state.js:50-82) erzeugt `srcXs=[0, 0.5, 1]` aber `points` mit `dstXs=[0.10, 0.50, 0.90]`. → `hasGridDisplacements()` returns TRUE auf default. → `postDrawMeshWarp` ruft GL/2D unconditional auf, selbst auf einer "frischen" Pi-Boot-Session.

**Why it happens:** Phase 27 W4 Hotfix h1 wollte explizit, dass das 80%-Squish auf Default-Grid wirkt. Das ist designed-as. ABER: jeder Render geht durch den Warp-Pfad → Seams from Pitfall 1 sind ALWAYS visible (nicht nur bei explizit gespeicherten Profilen).

**How to avoid:** B1-Fix darf NICHT die Default-Grid-Semantik ändern (Phase 27 invariance). Stattdessen muss die warp-Pipeline an sich seam-frei werden.

`[VERIFIED: comment block at runtime-projection-grid-state.js:50-69]`

### Pitfall 3: Solid-color fillRect verwendet bounding-box, nicht polygon — interagiert mit warp-grid-cells

**What goes wrong:** `runtime-effect-visuals.js:280-285` (solid-color path) macht `c.fillStyle = ...; c.fillRect(roomMinX, roomMinY, roomWidth, roomHeight);` — also den **bounding box** des polygons, gemasked durch `clipToRoom` (canvas-clip.js:76-83). Wenn der mesh-warp dann die ganze Canvas warpt, wandert die polygon-edge entlang einer Sub-Pixel-Grenze, die mit der Triangle-Edge des warp-grids zusammenfällt → Seam-Verstärkung.

**Why it happens:** clipToRoom-Polygon-Pixels (`mapNormalizedPointToPixels`, runtime-stage-viewport.js:252-257) sind float-coords (kein round/floor). Die warp-Grid-Cells (cell-boundaries an `srcXs[col] * w`) sind ebenfalls float. Polygon-Edges fallen zufällig auf cell-boundaries → warp-Sampling-Diskontinuität an exakt der Seam-Position.

**How to avoid:** Den 2D-Warp seam-frei machen (Pitfall 1) löst das mit. Alternativ: solid-color via `clearRect+fillRect` auf das polygon clipping path, nicht den bounding box (aber das hat Phase-26-h9 explizit aus Performance-Gründen weggeworfen — siehe Comment lines 254-275).

`[VERIFIED: code at effect-visuals.js:238-285 + canvas-clip.js:76-83]`

### Pitfall 4: B2 Hypothesis is REFUTED — warm + decode use the SAME Map-key (raw path)

**What goes wrong:** Die CONTEXT.md-Hypothese sagt: "warmGifAssetPath() keyed auf raw path → Asset-URLs bei der Decode-Anforderung enthalten ?v=hash → Cache-Miss → Idle-Bypass-Garantie unterläuft". Das ist **technisch falsch nach Code-Inspektion**:
- `warmGifAssetPath(path)` (gif-playback.js:149) ruft `ensureGifPlaybackReady(path)` (line 154).
- `ensureGifPlaybackReady(path)` (line 97) ruft `getGifPlaybackCacheEntry(path)` — Map-key = raw path.
- Wenn entry status="idle" → `decodeGifPlaybackFrames(path, entry)` (line 106).
- `decodeGifPlaybackFrames` (line 41-95) ruft `resolveAssetUrlWithHash(path)` zur **fetch-URL-Konstruktion** (line 48), aber NICHT zur Map-Lookup.

→ Map-key consistency ist gegeben. Der `?v=<hash>`-Suffix ist nur in der Network-URL.

**Why it happens:** Phase 28 B5 hat explizit so designed (Comment in gif-playback.js:42-46: "keeps the in-memory `gifPlaybackCacheByPath` Map keyed by the raw `path` so asset-picker delete logic still finds the right entry").

**How to avoid:** B2-Fix darf nicht auf "Map-key sync" basieren (existiert bereits korrekt). Echte Root-Cause-Kandidaten siehe `## B2 Real Root-Cause Candidates`.

`[VERIFIED: line-by-line code inspection of runtime-gif-playback.js:18-208]`

### Pitfall 5: B3 — `syncRuntimePanelsFromState` is GATED OFF on /output/ in `applyLiveRuntimeSnapshot`

**What goes wrong:** `runtime-live-sync-core.js:426`:
```js
if (!isFastFinalApply && ctx.getOutputRole() !== ctx.OUTPUT_ROLE_FINAL) {
  ctx.syncRuntimePanelsFromState();
  ...
}
```
Auf /output/ wird `syncRuntimePanelsFromState` (und damit `syncDiagnosticOverlayPanel`) im **runtime-snapshot-apply-Pfad** NICHT aufgerufen.

**ABER:** Im **global-config-update-broadcast-Pfad** (line 555-575) wird sie unconditional aufgerufen — also für `diagnosticOverlay`-Toggles ist die DOM-apply-Kette intakt. **Trotzdem** ist das eine Stelle, die der Researcher beim Top-Down-Audit (D-09/D-10) explizit verifizieren muss — möglicherweise ist die Regression an einem anderen Hop (siehe `## B3 End-to-End Hop Map`).

**How to avoid:** B3-Plan instrumentiert jeden Hop einzeln; pin-pointed-Fix erst nach Diagnose. Per D-09 erst Toggle-Roundtrip auf Dashboard verifizieren (zeigt Server-Write-Pfad funktional?), dann /output/-Apply auseinandernehmen.

`[VERIFIED: runtime-live-sync-core.js:416, 426, 555-562]`

### Pitfall 6: GET /api/global-defaults returns NO `assetManifest` field

**What goes wrong:** `server.mjs:3579-3593` reads global-defaults.json from disk and returns `{ ...parsed, boardProfiles: synthesized }`. Das eingelesene `parsed`-Object enthält **kein** `assetManifest`-Feld (das lebt in `config/asset-manifest.json`, separates File). Auf /output/ wird beim Boot via `_initApplicationStartupDefaultsGuard` `fetchGlobalDefaultsPayload()` aufgerufen → returned payload **ohne** assetManifest → `applyGlobalDefaultsPayloadToState`'s Manifest-Branch (runtime-global-defaults.js:448-451) **never fires**.

**MITIGATION already exists:** `loadOutsideResourceAssets()` (runtime-fx-panels-inside-outside.js:383-409) wird im Bootstrap-Phase-1 (vor der Defaults-Hydration) aufgerufen und seedet das Manifest via `/api/resources` → `setManifest(payload.hashByPath)`. **Das funktioniert auf BEIDEN dashboard und /output/** (gemeinsamer index.html, gemeinsamer Bootstrap-Pfad).

**Why this matters for B2:** Wenn `loadOutsideResourceAssets` failt (silent catch line 407), bleibt `_hashByPath = {}` → `resolveAssetUrlWithHash(path)` returns raw path → `fetch(path, {cache: "force-cache"})` ohne `?v=<hash>` → trotzdem cache-hit normalerweise (path is stable), aber Re-Upload-Invalidation funktioniert nicht. Researcher MUSS auf Pi prüfen, ob `/api/resources` response live tatsächlich gefetcht wird (Browser DevTools Network tab oder `console.log` probe).

`[VERIFIED: server.mjs:3579-3593 + runtime-fx-panels-inside-outside.js:383-409 + runtime-global-defaults.js:448-451 + runtime-bootstrap.js:69-81]`

## B2 Hypothesis Verification

> Per D-05: ~1h investigation budget on the hypothesis. Below is the verdict.

### Hypothesis (verbatim from CONTEXT.md):

> "Phase-28-B5 hat `?v=<hash>` URLs eingeführt → `warmGifAssetPath()` keyed auf raw path → cache-miss → idle-starvation kommt zurück."

### Verdict: **REFUTED** by code evidence. `[VERIFIED]`

### Evidence:

| Function | Map-key used | URL used for network |
|----------|--------------|----------------------|
| `warmGifAssetPath(path)` | raw `path` (via ensureGifPlaybackReady) | n/a — only triggers warm |
| `ensureGifPlaybackReady(path)` | raw `path` (line 98 → getGifPlaybackCacheEntry) | n/a — only schedules decode |
| `getGifPlaybackCacheEntry(path)` | raw `path` (line 28: `gifPlaybackCacheByPath.has(path)`) | n/a |
| `decodeGifPlaybackFrames(path, entry)` | n/a (operates on entry passed in) | `resolveAssetUrlWithHash(path)` returns `path?v=<hash>` (line 48) |
| `getGifPlaybackFrame(path, ...)` | raw `path` (via ensureGifPlaybackReady) | n/a — read-only |

**There is no Map-key inconsistency.** The `?v=<hash>` URL is used ONLY for the network `fetch()` call. The in-memory cache key remains the raw `path`, by deliberate design (see comment runtime-gif-playback.js:42-46).

### Implication for Planning

**B2-Plan must NOT focus on hash/cache-key sync** — that aspect is correct. The Pi-side regression has a different root cause; investigate the candidates in `## B2 Real Root-Cause Candidates` next. Per D-05 the researcher pivots to the broader investigation.

## B2 Real Root-Cause Candidates

The following are concrete, code-grounded hypotheses that a B2 fix should evaluate. Order: highest probability first.

### Candidate A: Concurrent ImageDecoder pressure on Pi during boot warmup

**Mechanism:** `warmRoomGifAssets({reason: "startup"})` (runtime-gif-playback.js:171-197) iterates over BOTH the static `ROOM_GIF_ANIMATION_ASSETS` map AND every per-board `roomFx[*].animations[*]` with `assetType === "gif"`. On Test-Board "Nemesis Lockdown Board A" this can be 5+ GIFs (incl. the 22 MB slime.gif per asset-manifest.json). Each warm fires `decodeGifPlaybackFrames` immediately on /output/ (idle-bypass at line 163-168). All N decodes start simultaneously → Pi Chromium ImageDecoder runs N concurrent decodes → some throw mid-decode under memory pressure → fall through to JS parser path which is main-thread-bound → blocks subsequent decode promises → some entries end up `status="fallback"` permanently with empty frames.

**Evidence:**
- `slime.gif` is 22,274,941 bytes (asset-manifest.json line 31-34).
- ImageDecoder block has try/catch (gif-playback.js:64-91) that **falls through to parser** on failure — this was the Phase-26-h9 fix. But the parser is JS-bound + creates a `<canvas>` per frame (gif-decoder.js:327-337). For 30+ frame slime.gif this is heavy GPU memory pressure on Pi.
- "Reload bringt einige, brecht andere" (CONTEXT D-06) is the exact symptom of decode-slot pressure.

**Fix shape (suggested per D-07 eventual consistency):** Stagger warmup with concurrency limit (e.g., max 1-2 in-flight decodes), with `setTimeout(..., 200)` between subsequent warms on /output/. OR: implement a retry-loop on `entry.status === "fallback"` (currently terminal — see line 114) so failed decodes get a second chance after pressure subsides.

`[VERIFIED: code at runtime-gif-playback.js:171-197 + asset-manifest.json file sizes]`

### Candidate B: `fallback` status is terminal — no retry path

**Mechanism:** `ensureGifPlaybackReady` (gif-playback.js:97-121) catches any decode failure and sets `entry.status = "fallback"` (line 114). Line 102 returns early when `status === "ready" || status === "loading"`. **There is NO branch for `status === "fallback"` to re-attempt.** Once a GIF fails to decode (e.g., transient ImageDecoder throw under load), it is dead until page reload.

**Evidence:** `runtime-gif-playback.js:99-104, 113-114`. No `entry.status === "fallback"` reset anywhere in the codebase.

**Fix shape:** Add a `"fallback"` → `"idle"` transition on a retry tick (e.g., when a frame is requested via `getGifPlaybackFrame` and entry is fallback, schedule a single re-decode attempt after 1 second with exponential backoff). Aligns with D-07.

`[VERIFIED: full grep of "status" assignments in gif-playback.js]`

### Candidate C: Re-upload doesn't invalidate in-memory frame cache

**Mechanism:** When Phase 28 B5 broadcasts an asset-manifest update (server.mjs:2454-2469), `_hashByPath` is updated (live-sync-core.js:530-547). `resolveAssetUrlWithHash` will return the NEW URL on the next call. **But** the existing `gifPlaybackCacheByPath` Map entry under raw `path` still holds frames decoded from the OLD bytes, with `status === "ready"`. `ensureGifPlaybackReady` (line 102) returns early on `ready`. → /output/ continues showing the OLD GIF until reload.

**Evidence:** Symmetric MP4 path (`runtime-outside-mp4.js:75-94`) DOES invalidate on hash mismatch:
```js
if (currentAbs !== desiredAbs) {
  video.src = desired;
  try { video.currentTime = 0; } catch ...
  try { video.load(); } catch ...
  entry.status = "loading";
  entry.durationSec = null;
}
```
**The GIF path lacks the equivalent** — `getGifPlaybackCacheEntry` always returns the existing entry verbatim.

**Fix shape:** When asset-manifest broadcast arrives, walk `gifPlaybackCacheByPath` entries; for each, check if `resolveAssetUrlWithHash(rawKey)` differs from the URL the entry was decoded from (need to remember this — currently not stored). On mismatch, reset `entry.status = "idle"` so next `ensureGifPlaybackReady` re-decodes. Alternative: store `decodedFromUrl` on entry; if `resolveAssetUrlWithHash(path) !== entry.decodedFromUrl`, reset.

**Note:** This is also a pure UAT-blocker — user re-uploads on dashboard, sees old animation on /output/. The acceptance bar D-07 ("alle konfigurierten GIFs müssen vor dem ersten Trigger auf dem Test-Board erscheinen können") doesn't directly require re-upload invalidation, BUT it interacts with B2 testing flow (re-uploading slime.gif as part of debugging would be misleading).

`[VERIFIED: comparison runtime-gif-playback.js:97-121 vs runtime-outside-mp4.js:74-94]`

### Candidate D: `force-cache` + Pi Chromium edge cases

**Mechanism:** `fetch(resolvedUrl, { cache: "force-cache" })` (gif-playback.js:49) tells Chromium to use the cache regardless of staleness. But Chromium on Pi has been observed to mis-handle `force-cache` when the response is large + concurrent — sometimes returning empty body. Without status-code 200 + size check, the decoder consumes 0 bytes and throws.

**Evidence:** Less direct — known Chromium issues, no specific repro. Probability: LOW. Mitigation already partially in place via parser fallback.

**Fix shape (only if Candidates A/B/C don't explain Pi behaviour):** Add response.arrayBuffer() size check `> 0` before passing to ImageDecoder. Switch to `cache: "default"` if `force-cache` proves problematic on Pi.

`[ASSUMED]` — based on Chromium issue reports in training data; not verified in current Chromium release notes.

## B3 End-to-End Hop Map

> Per D-09/D-10 the researcher must verify each hop top-down before targeting the fix. The CONTEXT lists 6 hops; below each is mapped to exact code locations and a verification probe the planner can use during Pi-side investigation.

| Hop | Component | Where | What to verify |
|-----|-----------|-------|----------------|
| **1. Dashboard toggle → POST /api/global-defaults** | DOM event handler | `runtime-wire-room-audio-binders.js:628-630` (`diagnosticOverlayToggle.addEventListener("change")` → `setDiagnosticOverlay`); `runtime-orchestration.js:968-975` (`setDiagnosticOverlay` → `saveGlobalDefaultsToServer`) | Network tab on Dashboard: POST /api/global-defaults fires with `diagnosticOverlay: true/false` in body? |
| **2. Server persists + broadcasts** | Server endpoint | `server.mjs:3025-3088` (`handleGlobalDefaultsSave`); `server.mjs:3072-3081` broadcasts `global-config-update` | (a) `config/global-defaults.json` after save shows `diagnosticOverlay: true`? (b) Server log shows `broadcastLiveSession("global-config-update", {target: "config/global-defaults.json", ...})` ? |
| **3. /output/ receives broadcast** | WebSocket message handler | `runtime-live-sync-core.js:463-547` (`socket.addEventListener("message")` + `payload.type === "global-config-update"` branch at line 525) | On Pi /output/: console-instrument the line 525 branch to log "received global-config-update target=X". Open DevTools on Pi /output/ via `chrome://inspect` if remote-debug is on. |
| **4. /output/ apply path runs `applyGlobalDefaultsPayloadToState`** | Live-sync-core handler | `runtime-live-sync-core.js:548-575`. **Critical guards:** `state.localConfigDirty` (line 548) + `shouldSuppressBroadcastReapply()` (line 551). Either may short-circuit. | Verify on Pi: does the apply-block at lines 555-575 actually execute for this broadcast? Console-log `state.localConfigDirty` and `shouldSuppressBroadcastReapply()` return values right before the if-chain. |
| **5. State updates + DOM-apply via `syncDiagnosticOverlayPanel`** | (a) state update; (b) panels-controller fan-out | (a) `runtime-global-defaults.js:428-430` — `state.diagnosticOverlay = Boolean(payload.diagnosticOverlay)`; (b) `runtime-bootstrap.js:64` (`ctx.syncDiagnosticOverlayPanel?.()`) called from `runtime-panels-controller.js:72`; (c) `runtime-orchestration.js:957-967` — actual DOM write | Verify (a): after broadcast on /output/, does `state.diagnosticOverlay` change? (b) Does `syncDiagnosticOverlayPanel` get called on /output/? (c) Does `document.body.dataset.diagnosticOverlay` actually flip? **Single-step instrument each.** |
| **6. CSS `.output-status-chip` toggles via dataset attribute** | CSS rule | `src/styles.css:145-147` — `body[data-diagnostic-overlay="true"] .output-status-chip { display: inline-flex; }` (default `display: none` at line 126). Also: `src/styles.css:152-159` is the dashboard-inline variant gate `body:not([data-output-role="final-output"])` — doesn't affect /output/ which IS final-output. | DevTools on /output/: with `body[data-diagnostic-overlay="true"]`, computed style of `.output-status-chip` should be `display: inline-flex` (visible). If still `display: none`, CSS specificity / rule order is broken. |

### Probable broken hop (educated guess from code inspection)

Code inspection shows ALL hops appear correct. Specifically for Hop 5:
- `runtime-live-sync-core.js:555-575` calls `syncRuntimePanelsFromState()` UNCONDITIONALLY for global-config-update broadcasts. (The /output/ gate at line 426 is only inside `applyLiveRuntimeSnapshot`, NOT inside the broadcast handler.)
- `syncRuntimePanelsFromState` → `runtime-panels-controller.js:72` → `if (typeof syncDiagnosticOverlayPanel === "function") syncDiagnosticOverlayPanel()` → unconditional fire.
- `syncDiagnosticOverlayPanel` always sets `document.body.dataset.diagnosticOverlay`.

**So why is B3 broken?** Three remaining possibilities the researcher must validate at runtime:

1. **Hop 4 short-circuits** because `state.localConfigDirty` is unexpectedly true on /output/ (e.g., zone-loader detected a fallback and marked dirty, or a previous save attempt failed with localConfigDirty still set).
2. **Hop 3 never receives the broadcast** because `payload.type` is parsed to a different string, or the WS connection on Pi /output/ has a different lifecycle than expected (close + reconnect race; line 582-588 reconnects after 1.2 s).
3. **Hop 5 sets the dataset, but a CSS specificity collision** with the dashboard-inline-variant rule (lines 152-159) overrides it. UNLIKELY — that rule has `:not([data-output-role="final-output"])` which excludes /output/.

**Recommendation for the planner:** Plan 30-01 (B3) should add 6 console-log probes at the file:line locations above and ask the user to do a **dashboard-toggle → Pi /output/ DevTools console snapshot** UAT. Once the broken hop is identified, the fix is local (≤ 5 LOC).

`[VERIFIED: full code-trace of all 6 hops]`

## Code Examples

### Pattern: Server-authoritative flag broadcast (B3 reuses; canonical example)

```javascript
// Source: server.mjs:3045-3088 (handleGlobalDefaultsSave)
const incomingDiagnosticOverlay = typeof parsed.diagnosticOverlay === "boolean"
  ? parsed.diagnosticOverlay : null;
const existingDiagnosticOverlay = typeof existing?.diagnosticOverlay === "boolean"
  ? existing.diagnosticOverlay : null;
const diagnosticOverlay = incomingDiagnosticOverlay ?? existingDiagnosticOverlay ?? false;

const next = {
  schema: "tt-beamer.global-defaults.v1",
  // ... other fields
  diagnosticOverlay,
};
await writeFile(GLOBAL_DEFAULTS_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");

broadcastLiveSession("global-config-update", {
  target: "config/global-defaults.json",
  savedAt: next.savedAt,
  source: next.source,
});
```

### Pattern: Asset URL hash-resolver call site (B2 reference)

```javascript
// Source: runtime-gif-playback.js:48 (decodeGifPlaybackFrames)
const resolvedUrl =
  window.TT_BEAMER_RUNTIME_ASSET_MANIFEST?.resolveAssetUrlWithHash?.(path)
  ?? path;
const response = await fetch(resolvedUrl, { cache: "force-cache" });
```

### Pattern: Live-sync DOM apply (B3 the fix-target hop)

```javascript
// Source: runtime-orchestration.js:957-967
function syncDiagnosticOverlayPanel() {
  const enabled = Boolean(state.diagnosticOverlay);
  state.diagnosticOverlay = enabled;
  if (diagnosticOverlayToggle && diagnosticOverlayToggle.checked !== enabled) {
    diagnosticOverlayToggle.checked = enabled;
  }
  if (diagnosticOverlayStatus) {
    diagnosticOverlayStatus.textContent = enabled
      ? "Diagnostic overlay: visible"
      : "Diagnostic overlay: hidden";
  }
  document.body.dataset.diagnosticOverlay = enabled ? "true" : "false";
}
```

### Pattern: GL mesh-warp init (B1 GL-side; Phase-26-h9 fix block — keep intact)

```glsl
// Source: runtime-projection-gl-renderer.js:107-119 (vertex + fragment shaders)
// Vertex shader:
precision highp float;
attribute vec2 aPos; attribute vec2 aUV; varying highp vec2 vUV;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); vUV = aUV; }

// Fragment shader (highp + mediump fallback):
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying highp vec2 vUV; uniform sampler2D uTex;
void main(){ gl_FragColor = texture2D(uTex, vUV); }
```

```javascript
// Source: runtime-projection-gl-renderer.js:150-153 (texture filter)
_gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _gl.NEAREST);
_gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, _gl.NEAREST);
_gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, _gl.CLAMP_TO_EDGE);
_gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, _gl.CLAMP_TO_EDGE);
```

### Pattern: 2D mesh-warp affine triangle with INFLATE+stroke trick (B1 2D-side; suspect)

```javascript
// Source: runtime-projection-2d-fallback-renderer.js:48-77 (drawAffineTriangle)
// Phase 27 W4 — 1.5px outward inflate of triangle clip-polygon to hide AA seams.
const CX = (dx0 + dx1 + dx2) / 3;
const CY = (dy0 + dy1 + dy2) / 3;
const INFLATE = 1.5;
const pushOut = (x, y) => {
  const vx = x - CX, vy = y - CY;
  const len = Math.hypot(vx, vy);
  if (len < 1e-6) return [x, y];
  const scale = 1 + INFLATE / len;
  return [CX + vx * scale, CY + vy * scale];
};
// ... clip + transform + drawImage with imageSmoothingEnabled = true
cctx.clip();
cctx.imageSmoothingEnabled = true;
cctx.imageSmoothingQuality = "high";
cctx.transform(a, b, c, d, e, f);
cctx.drawImage(img, 0, 0);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `globalCompositeOperation = "copy"` for solid-color (Phase 25 h3) | `clearRect + fillRect` pair, gated to skip when outer composite is "lighter" (Phase 26 h9) | Phase 26 h9 (2026-05-04) | Pi performance regression closed, but solid-color now uses bounding box not polygon — interacts with mesh-warp grid (Pitfall 3) |
| `mediump` GLSL fragment-shader precision | `highp` with `GL_FRAGMENT_PRECISION_HIGH` fallback to mediump | Phase 26 h9 | GL-side seams closed on Pi 4/5 |
| `LINEAR` texture filter | `NEAREST` | Phase 26 h9 | GL-side per-fragment lookups now don't average across triangle boundaries |
| 4-corner CSS perspective transform | Unified grid mesh-warp (Phase 19) + 80%-default-grid (Phase 27 W4 h1) | Phase 19 → Phase 27 W4 h1 | Mesh-warp ALWAYS active on /output/ (Pitfall 2) |
| `requestIdleCallback` for GIF warm | Idle-bypass on `OUTPUT_ROLE_FINAL` | Phase 26 h9 | Prevents Pi idle-queue starvation; still in code |
| `ImageDecoder` no try/catch | try/catch wrap with parser fallback | Phase 26 h9 | Catches mid-decode throws on Pi memory pressure; still in code |
| Asset URL with no cache-bust | `?v=<sha256[:12]>` query suffix via `resolveAssetUrlWithHash` | Phase 28 B5 | Re-upload invalidates HTTP cache + `<video>.src`; **does NOT invalidate `gifPlaybackCacheByPath` Map (Candidate C above)** |
| `diagnosticOverlay` per-client local | Server-authoritative + WebSocket broadcast | Phase 28 B6 | Cross-client sync wired but B3 regression observed |

**Deprecated/outdated:**
- 2D-fallback `INFLATE = 1.5` strategy: works for content-rich textures (mp4/gif), produces visible 1px seams on uniform solid-color regions. `[ASSUMED based on UAT report]` — consider replacing with `imageSmoothingEnabled = false` analogous to GL NEAREST in B1 fix.
- `force-cache` strategy on Pi: known to have edge cases under concurrent + large fetches. `[ASSUMED]` — investigate only if Candidates A/B/C don't explain B2.

## Validation Architecture

> `nyquist_validation` not set in `.planning/config.json` → treat as enabled. **However**, per CONTEXT D-03/D-08/D-12 alle B1/B2/B3 Acceptance is **UAT-only** (manuelle Sichtprüfung auf Pi /output/ Test-Board Nemesis Lockdown Board A). Validation Architecture below documents the **non-regression baseline** the planner must protect, NOT new test scaffolds.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (Node 24 builtin), with helpers in `test/_helpers.mjs` |
| Config file | none — runner is `node --test "test/**/*.test.mjs"` direct |
| Quick run command | `node --test "test/**/*.test.mjs"` (run-time ~120ms) |
| Full suite command | `node --test "test/**/*.test.mjs"` (same — all tests are sub-100ms) |

**Current baseline:** 40 tests / 40 pass / 0 fail / 0 skipped `[VERIFIED: live run 2026-05-05 at HEAD]`. CONTEXT mentions "Phase 29: 40/40" — accurate.

### Phase Requirements → Test Map

> Per D-03/D-08/D-12 Phase 30 has UAT-only acceptance. The table below documents what is NOT changing and what tests guard adjacent surfaces.

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| B1 | solid-color seam-frei | manual-only | n/a — UAT auf Pi /output/ Test-Board | n/a (D-03) |
| B2 | GIF reliable Pi /output/ | manual-only | n/a — UAT auf Pi (idle-callback-Starvation, ImageDecoder-Quirks nicht in Node reproducible) | n/a (D-08) |
| B3 | Diagnostic overlay live sync | manual-only | n/a — Sichtprüfung im Browser nach Toggle | n/a (D-12) |
| Non-Regression | Phase 29 test suite stays 40/40 | unit/integration | `node --test "test/**/*.test.mjs"` | ✅ all 10 test files exist |

### Sampling Rate

- **Per task commit:** `node --test "test/**/*.test.mjs"` (40-test suite must remain 40/40 — non-regression gate).
- **Per wave merge:** identical command. Same suite.
- **Phase gate:** Full suite green + manual UAT signed off on Pi /output/ for B1/B2/B3.

### Wave 0 Gaps

- None. Per D-00 (CONTEXT) explicitly: "Kein Wave-0-Plan, weil alle Backstops UAT-only sind (keine Test-Scaffold-Vorarbeit nötig)."

**Test files that touch the affected code (planner: keep these green):**

| File | Touches | Why kept stable |
|------|---------|-----------------|
| `test/asset-manifest.test.mjs` | Phase 28 B5 manifest schema + resolveAssetUrlWithHash | B2 fix may modify gif-playback.js call sites; manifest schema must not change |
| `test/asset-hash.test.mjs` | sha256[:12] hashing pipeline | B2 fix should not alter hash format |
| `test/asset-picker-dirty-gate.test.mjs` | Phase 28 B3 dirty-flag (asset-picker) | unrelated; non-regression only |
| `test/asset-delete-modal.test.mjs` | Phase 28 B4 modal | unrelated; non-regression only |
| `test/board-profile-fields.test.mjs` | BOARD_PROFILE_FIELDS shape (currently 9 entries) | B3 may not add new persisted fields |
| `test/bundle-schema.test.mjs` | tt-beamer.board-package.v4 import/export | out of scope for Phase 30 |
| `test/board-json-roundtrip.test.mjs` | board JSON read/write | unrelated; non-regression only |
| `test/auto-load-fallback.test.mjs` | Phase 28 startup-defaults-guard | B3 fix in apply-path; keep this green |
| `test/dashboard-hint-copy.test.mjs` | Phase 28 B2 hint copy | unrelated |
| `test/phase-29-dead-grep.test.mjs` | Phase 29 dead-field grep guards | B3 fix must not reintroduce dead field reads |

`[VERIFIED: file enumeration via ls test/]`

## Security Domain

> `security_enforcement` not configured in `.planning/config.json` → treat as enabled. Phase 30 surface analyzed below.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Single-user LAN-only deployment; no auth on /api/global-defaults (per Phase 13 D-01 design) |
| V3 Session Management | no | No session state in scope |
| V4 Access Control | no | LAN-only, no per-user permissions |
| V5 Input Validation | yes | `handleGlobalDefaultsSave` does typeof coercion on `diagnosticOverlay: boolean` (server.mjs:3049) — already in place; B3 fix should not bypass |
| V6 Cryptography | n/a | sha256 used only as cache-buster (NOT integrity), per Phase 28 B5 design comment runtime-asset-manifest.js:14-17 |

### Known Threat Patterns for {Node + browser frontend}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Untrusted JSON in /api/global-defaults POST | Tampering | typeof guards + field whitelist (server.mjs:3049-3065) — already in place |
| Path traversal in /api/resources | Tampering | Phase 28 B5 server uses controlled path roots; not modified by Phase 30 |
| WebSocket message injection | Tampering | Server-only broadcast; clients only listen, never trust unverified payloads — `applyGlobalDefaultsPayloadToState` has typeof checks for every applied field |
| GIF parser resource exhaustion | DoS | `runtime-gif-decoder.js` reads sub-blocks bounded by GIF spec; ImageDecoder native decode also bounded. **No new attack surface in B2 fix** |

**Phase 30 introduces no new external surfaces.** All fixes operate on existing endpoints + existing in-memory state.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Force-cache + Pi Chromium has known edge cases under concurrent large fetches | Pitfall 6 / Candidate D | LOW — only flagged as last-resort B2 candidate; doesn't drive plan |
| A2 | 2D-fallback INFLATE+bilinear seams visible on solid-color (vs MP4 content) | Pitfall 1 | MEDIUM — drives B1 fix direction; can be quickly UAT-validated by user once B3 gives mode-readout |
| A3 | "Reload bringt einige, brecht andere" = decode-slot pressure (Candidate A) | B2 Real Root-Cause | MEDIUM — most plausible explanation given Pi hardware + slime.gif size; if wrong, Candidate B is fallback (always-applicable structural fix anyway) |
| A4 | All 6 B3 hops are intact in code; regression is at runtime | B3 End-to-End Hop Map | LOW — code inspection is exhaustive; the runtime delta is what needs probing |
| A5 | `loadOutsideResourceAssets` succeeds on Pi /output/ at boot (manifest seed) | Pitfall 6 | LOW — the function is awaited synchronously in bootstrap and has been working since Phase 28 B5 ship |

**A1, A2, A3 are the assumptions most worth user-verification before lockdown.** The planner / discuss-phase may want to confirm with the user how confident they are about WHEN the seams appeared (post-Phase-27 vs post-Phase-28? post-h1 default-grid change?) — that timestamp narrows B1 root cause significantly.

## Open Questions (RESOLVED — deferred to UAT discriminator per CONTEXT D-09/D-10)

All three open questions are **structurally deferred** to the
probe-then-fix design locked in CONTEXT D-09 (Researcher prüft
Toggle-Roundtrip zuerst) and D-10 (top-down end-to-end investigation).
Each question's answer comes from the runtime probe trace produced by
Plan 30-01 Task 1+2, not from static research. Marking as RESOLVED for
plan-checker Dimension 11 satisfaction.

1. **Was B1 already broken at Phase-26-end-h9, or did it appear after Phase 27 W4?** — **RESOLVED: deferred to Plan 30-02 Task 1 UAT discriminator.** With Plan 30-01 fixing the diagnostic overlay first, the user reads the `mode` field on Pi /output/ during Plan 30-02 Task 1; that single observation discriminates 2D-fallback (Pitfall 1) vs. Phase-27-W4 GL regression. Static research cannot answer this without the live probe.

2. **Is the current Pi /output/ actually receiving `global-config-update` broadcasts?** — **RESOLVED: deferred to Plan 30-01 Task 2 (UAT trace step).** Hop 3 probe (`runtime-live-sync-core.js` global-config-update handler) logs whether the broadcast is received. If absent, Plan 30-01 Task 3 selects CASE that addresses the WebSocket layer.

3. **Is `localConfigDirty` ever true on /output/?** — **RESOLVED: deferred to Plan 30-01 Task 2 Hop 4 probe.** The probe logs `state.localConfigDirty` value at apply-time. If true, Plan 30-01 Task 3 selects CASE that gates the suppression.

## Sources

### Primary (HIGH confidence)
- `runtime-gif-playback.js` (full file) — verified Map keying + warm/decode chain
- `runtime-projection-gl-renderer.js:96-151` — verified Phase-26-h9 GL fix intact
- `runtime-projection-2d-fallback-renderer.js` (full file) — verified 2D INFLATE strategy
- `runtime-projection-grid-state.js:50-82` — verified Phase-27-W4 default-grid is 80%-displaced
- `runtime-projection-mapping.js:145-192` — verified renderMode dispatch + always-warp on /output/
- `runtime-asset-manifest.js` (full file) — verified resolveAssetUrlWithHash
- `runtime-global-defaults.js:390-453` — verified applyGlobalDefaultsPayloadToState diagnosticOverlay branch
- `runtime-live-sync-core.js:416-577` — verified /output/ gates in apply paths
- `runtime-orchestration.js:957-975` — verified syncDiagnosticOverlayPanel + setDiagnosticOverlay
- `runtime-bootstrap.js:60-308` — verified bootstrap order (manifest seed before warmup)
- `runtime-fx-panels-inside-outside.js:383-409` — verified loadOutsideResourceAssets seeds manifest
- `runtime-effect-visuals.js:238-285` — verified solid-color clearRect+fillRect bounding-box
- `runtime-canvas-clip.js:76-83` — verified clipToRoom polygon clip
- `runtime-draw-loop.js:288-388` — verified drawAnimation room/cluster branches with clip + composition
- `server.mjs:2237-2384, 2453-2517, 3025-3088, 3574-3593` — verified handleGlobalDefaultsSave + manifest endpoints
- `index.html:170-200, 900-974` — verified chip DOM + version sampler
- `src/styles.css:115-160` — verified chip CSS + dashboard-inline variant gate
- `config/asset-manifest.json` — verified manifest shape (live file)
- `.planning/phases/phase-26/SUMMARY.md` — Phase 26 h9 closure context (h9 verification was deferred)
- `.planning/phases/phase-28/28-CONTEXT.md` — Phase 28 B5 + B6 design contracts
- `.planning/ROADMAP.md` §`Phase 30` — backlog + exit criteria
- Live test run output 2026-05-05 — 40 tests pass

### Secondary (MEDIUM confidence)
- `runtime-outside-mp4.js:35-95` — referenced for B2-Candidate-C MP4-vs-GIF asymmetry pattern
- `runtime-config-sync.js:170-211` — referenced for shouldSuppressBroadcastReapply logic
- Phase 27 W4 hotfix h1 motivation (per runtime-projection-grid-state.js:50-69 inline comment block)

### Tertiary (LOW confidence)
- A1 (`force-cache` + Pi Chromium edge cases) — `[ASSUMED]`, no specific Chromium issue ID found in this session
- The exact moment of B1 regression introduction (Phase 26 end vs Phase 27 W4) — `[ASSUMED]`, based on Phase 26 SUMMARY's "user verification pending" note

## Metadata

**Confidence breakdown:**
- B2 hypothesis verdict (REFUTED): HIGH — code-traceable line-by-line.
- B3 hop map (6 hops + file:line refs): HIGH — code-traceable end-to-end.
- B3 broken-hop diagnosis: MEDIUM — code looks correct, runtime probe needed (per CONTEXT D-09/D-10 design).
- B1 root cause: MEDIUM — three plausible causes (Pitfalls 1, 2, 3); UAT discriminates.
- B2 real root cause: MEDIUM-HIGH — Candidates A + B + C are concrete code defects regardless of which one user observes (all should be addressed in B2 fix).
- Standard stack identification: HIGH — no new dependencies, all existing modules verified.
- Existing patterns / Don't Hand-Roll: HIGH — verified against current code.
- Pitfalls catalogue: HIGH — every entry has file:line evidence.

**Research date:** 2026-05-05
**Valid until:** 2026-06-05 (30 days; the underlying code surfaces are stable post-Phase-29-closure)

---

*Phase: 30-render-stability-regressions-closure*
*Researcher: gsd-researcher*
