# Phase 30: Render-Stability Regressions Closure - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Drei voneinander entkoppelte Render-/Sync-Regressionen vor Release schließen.
Test-Board: **Nemesis Lockdown Board A**.

- **B1** — Sichtbare Naht-Linien innerhalb eines Raums (insbesondere bei
  `solid-color`, aber auch andere Animationen). Phase-26-h9-GL-Fix (`highp` +
  `NEAREST` in `runtime-projection-gl-renderer.js`) ist noch im Code → Regression
  liegt nicht am Code-Verlust, sondern an einer geänderten Render-Lage seit
  Phase 26 (vermutlich Phase 27 W4 Trapez-Ecken / Squish-Bars + Mesh-Warp).
- **B2** — GIF-Animationen starten nicht zuverlässig auf Pi /output/.
  Phase-26-h9 Idle-Bypass + ImageDecoder-Fallback ist noch in
  `runtime-gif-playback.js` → Regression liegt vermutlich an Phase-28-B5
  Asset-Hash-URLs (`?v=<hash>`) die den `warmGifAssetPath()`-Cache-Key (raw path)
  unterlaufen.
- **B3** — `Show diagnostic overlay`-Toggle propagiert nicht zu /output/.
  Phase-28-B6-Wiring (`runtimeFlags.diagnosticOverlay` in `global-defaults.json`,
  `applyGlobalDefaultsPayloadToState`) ist noch im Code → Regression liegt
  irgendwo in der end-to-end-Kette Toggle → Server → Broadcast → /output/-Apply.

**Cross-cutting Constraint:** B1-Investigation braucht das Diagnostic-Overlay als
Diagnose-Werkzeug (Render-Mode-Readout), aber B3 macht das Overlay auf /output/
unsichtbar. → **B3 muss zuerst gefixt werden, bevor B1 sauber investigiert
werden kann.**

**Explizit nicht im Scope:**
- Neue Animations-Typen oder neue Render-Modes.
- Änderungen am Persistence-Schema (Phase 29 v4 bleibt).
- Refactoring außerhalb dessen, was zur Regression-Behebung minimal nötig ist
  (mit Ausnahme B1 Mesh-Warp — siehe D-04).
- Backwards-Compat zu vor-h9 Render-Pfaden.

</domain>

<decisions>
## Implementation Decisions

### Wave Structure & Sequencing

- **D-00:** **3 Plans + sequenzielle Reihenfolge.** Phase 30 = drei separate Plans
  in disjunkten Code-Subsystemen (Renderer / GIF-Pipeline / Live-Sync). Kein
  Wave-0-Plan, weil alle Backstops UAT-only sind (keine Test-Scaffold-Vorarbeit
  nötig).
  - **30-01 = B3** (Overlay-Sync) — zuerst, weil B1 das Overlay als Diagnose-
    Werkzeug benötigt (Render-Mode-Readout etc.).
  - **30-02 = B1** (Seams) — danach, mit funktionierendem Diagnostic-Overlay.
  - **30-03 = B2** (Pi GIF) — kann technisch parallel zu B1 laufen, aber
    sequenziell für Execute-Phase-Simplicity.

### B1 — Seams in Animations (insbesondere solid-color)

- **D-01:** **Beide Render-Pfade müssen seam-frei sein (2D + GL).** Der User hat
  bestätigt, dass die Linien in beiden Modi auftreten. Render-Mode-Toggle
  (auto/2d/gl) darf den Fix nicht aushebeln. Der User kann den Mode aktuell
  nicht eindeutig identifizieren, weil B3 (Overlay-Sync) kaputt ist; das ist
  ein zusätzlicher Grund für die D-00-Reihenfolge (B3 zuerst).
- **D-02:** **Freie Hand am Mesh-Warp-Code (Phase 27 W4).** Researcher und
  Planner dürfen die 2D/GL-Mesh-Warp-Logik (Trapez-Ecken, Squish-Bars,
  `setTransform`-Pfade, Triangulierung) refactoren, falls das die Seams
  strukturell schließt. Phase-27-Verhalten (Trapez-Verzerrung, Squish) bleibt
  funktional unverändert, aber Implementation-Details dürfen sich ändern.
- **D-03:** **Manueller UAT only, kein Headless-Snapshot-Diff.** Visuelle
  Nachverifikation auf Pi /output/ mit Test-Board Nemesis Lockdown Board A.
  Headless-Pixel-Diff in Node ist überproportional aufwendig für Single-User-
  Pre-Release.
- **D-04:** **Acceptance Bar.** Auf Test-Board Nemesis Lockdown Board A:
  - solid-color-Räume zeigen keine sichtbaren Naht-Linien innerhalb des Raums.
  - Andere verwendete Animationen (Malfunction, Fire, Slime, Scanning, Flicker,
    Alarm) zeigen keine Naht-Linien innerhalb eines Raums.
  - Verifikation auf Pi-Hardware unter projector-typischer Betrachtungs-
    distanz.
  - In beiden Render-Modi (2D und GL).

### B2 — GIF Reliability on Pi /output/

- **D-05:** **Hypothesis-First Investigation: Phase-28-B5 Hash vs.
  warmGifAssetPath()-Cache-Key.** Researcher prüft als ersten Schritt:
  - `runtime-gif-playback.js#warmGifAssetPath()` keyed auf welchem Path?
  - Asset-URLs bei der tatsächlichen Decode-Anforderung enthalten `?v=<hash>`?
  - Resultiert daraus ein Cache-Miss, der die Phase-26-h9 Idle-Bypass-
    Garantie unterläuft?
  
  Wenn die Hypothese sich bestätigt → minimaler Fix: warm-key + decode-pfad
  hash-aware machen (gleiche URL-Form an beiden Stellen). Wenn nicht → breit
  re-investigieren (Pi-Memory-Pressure, Decode-Slot-Knappheit, ImageBitmap-
  GC, etc.).
- **D-06:** **"Reload bringt einige, brecht andere" = selbe Root-Cause.**
  Klassisches Symptom von Memory-/Decode-Slot-Pressure auf Pi: jede Reload-
  Welle decode-trifft eine Teilmenge, andere fallen aus dem Slot. Kein
  separater Investigationsstrang.
- **D-07:** **Eventual Consistency, kein Blocking Boot.** Pi /output/ rendert
  initialen Frame sofort. GIFs warmen async + retry/refresh-Loop bis decoded.
  Acceptance: alle konfigurierten GIFs müssen vor dem ersten Trigger auf dem
  Test-Board erscheinen können (= warmen läuft fertig vor Live-Show).
- **D-08:** **Manueller UAT auf Pi only.** Pi-spezifische Bedingungen
  (idle-callback-Starvation, ImageDecoder-Quirks, Memory-Pressure) sind in
  Node-Tests ohnehin nicht reproduzierbar. Test bleibt User-side auf
  Pi-Hardware.

### B3 — Diagnostic Overlay Live-Sync to /output/

- **D-09:** **Researcher prüft Toggle-Roundtrip zuerst.** Erste
  Investigations-Aktion: Toggle aktivieren → Dashboard reload → was zeigt
  Dashboard? → Antwort entscheidet ob Server-Write-Pfad oder /output/-Apply-
  Pfad die Regression hat. Eindeutige Diagnose vor Fix.
- **D-10:** **Top-Down End-to-End-Investigation.** Dashboard-Toggle →
  `POST /api/global-defaults` (server.mjs) → `runtimeFlags.diagnosticOverlay`
  Persistierung → `global-config-update` Broadcast → /output/
  `applyGlobalDefaultsPayloadToState` → `state.diagnosticOverlay` → DOM-Apply
  (`document.body.dataset.diagnosticOverlay`) → CSS-Selector
  (`.output-status-chip`). Jeder Hop wird verifiziert; defekte Hops werden
  einzeln gefixt.
- **D-11:** **Acceptance-Latenz: ~100ms (WS-Broadcast).** Identisch zum
  Phase-28-B6-Vertrag. Kein synchroner Force-Render nötig.
- **D-12:** **Manueller UAT only.** Sichtprüfung im Browser nach Toggle reicht
  für Single-Bool-Sync. Kein Roundtrip-Unit-Test nötig.

### Claude's Discretion

- **D-13:** Genaue Plan-Reihenfolge B1 vs. B2 nach B3 — Researcher/Planner
  wählt nach Aufwandsschätzung.
- **D-14:** Falls B1-Researcher zu dem Ergebnis kommt, dass das Mesh-Warp
  refactor strukturell sinnvoll ist, darf er den Scope auf Sub-Plans
  aufteilen (B1a Investigation/Fix, B1b Mesh-Refactor) — vorausgesetzt das
  hilft der Acceptance.
- **D-15:** Genaue Hash-Resolver-Form für B2 (separate Helper, inline-API-
  Erweiterung, oder URL-Normalizer am Decode-Eingang) — Researcher wählt nach
  bestehendem Asset-Resolver-Layout.
- **D-16:** Ob B3-Researcher beim Fix den Apply-Pfad neu strukturiert oder nur
  punktuell repariert — abhängig von welchem Hop tatsächlich kaputt ist.

### Folded Todos

[None — keine GSD-Todo-Items für Phase 30 Scope.]

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 30 Inputs
- `.planning/ROADMAP.md` §`Phase 30 - Render-Stability Regressions Closure` —
  M1..M3 milestones + exit criteria + B1/B2/B3 backlog.

### Phase 26 Closure (B1 + B2 baseline — both regressions sit on top of h9 fixes)
- `.planning/phases/phase-26/SUMMARY.md` §`GL triangle seams` — Phase-26-h9
  GL-Fix (highp + NEAREST). Code at `runtime-projection-gl-renderer.js:96-151`.
- `.planning/phases/phase-26/SUMMARY.md` §`GIF playback on Pi` — Phase-26-h9
  Idle-Bypass + ImageDecoder-Fallback. Code at `runtime-gif-playback.js:54-205`.
- `.planning/phases/phase-26/SUMMARY.md` §`Known limitations / follow-ups` —
  Pre-bekannte Pi-Render-Risiken (CSS-Compositor-Scaling, ImageBitmap-GC).

### Phase 27 Closure (B1 root-cause candidate — Mesh-Warp / Trapez-Ecken)
- `.planning/phases/phase-27/SUMMARY.md` §`Wave delivery W1/W4` — Trapez-Ecken
  + Squish-Bars + Grid-Model-Refactor. Sub-Pixel-Rounding-Risiko.
- `src/app/runtime/viewport/runtime-projection-grid-state.js` — Grid-Model.
- `src/app/runtime/viewport/runtime-projection-gl-renderer.js` — GL-Mesh-Warp.
- (Researcher findet 2D-Mesh-Warp-Pfad während Investigation — vermutlich in
  `runtime-projection-grid-renderer.js` oder Aufrufer von `setTransform`.)

### Phase 28 Closure (B2 + B3 root-cause candidates)
- `.planning/phases/phase-28/28-CONTEXT.md` §`B5 — Asset-Cache-Invalidierung`
  D-11..D-13 — `?v=<hash>` URL-Strategie. **B2-Hypothese:** warm-key
  unterläuft.
- `.planning/phases/phase-28/28-CONTEXT.md` §`B6 — Diagnostic-Overlay UX`
  D-14..D-17 — Live-Sync-Wiring. **B3-Regression** sitzt irgendwo in dieser
  Kette.
- `src/app/runtime/render/runtime-gif-playback.js#warmGifAssetPath()` — Phase-
  26-h9 Cache-Key.
- `src/app/runtime/live-sync/runtime-global-defaults.js#applyGlobalDefaults
  PayloadToState()` — `state.diagnosticOverlay` Apply.
- `src/app/runtime/runtime-orchestration.js:958-969` — Diagnostic-Overlay
  DOM-Apply (`document.body.dataset.diagnosticOverlay`,
  `.output-status-chip` Toggle).
- `src/app/lib/state/runtime-state.js:61` — `diagnosticOverlay: false` initial
  state.
- `server.mjs:3049-3060` — server-side `diagnosticOverlay`-Felder in
  `handleGlobalDefaultsSave`.

### Asset Manifest (B2 hash hypothesis)
- `config/asset-manifest.json` — Phase-28-B5 hash-Manifest.
- `src/app/lib/shared/config.js` — `resolveAssetUrlWithHash` (vermutlich;
  Researcher verifiziert).

### Diagnostic Overlay CSS
- `src/styles.css` §`.output-status-chip` — Chip-Visibility-Selector. CSS
  kann display:none-Bedingung für /output/ haben, die das Live-Sync-Apply
  überlebt.
- `index.html` — Topbar + /output/ DOM-Layout.

### Wire / Live-Sync Infrastructure
- `src/app/runtime/live-sync/runtime-live-sync-core.js` — Snapshot-Fanout.
- `src/app/runtime/live-sync/runtime-zone-loader.js` — /output/-Initial-State.
- `src/app/runtime/wire/runtime-wire-room-audio-binders.js` — Beispiel für
  Apply-Side Wiring (falls Pattern hilfreich).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Phase-26-h9 GL-Fix-Block** (`runtime-projection-gl-renderer.js:96-151`) —
  Shader-Precision + Sampling-Filter sind die richtige Schicht für GL-Mode-
  Seams; Erweiterung dieses Blocks ist der naheliegende Fix-Ort.
- **Phase-26-h9 warmGifAssetPath() / ImageDecoder-Wrapper**
  (`runtime-gif-playback.js:54-205`) — bestehende Reliability-Infrastruktur;
  Hash-aware Erweiterung ist additiv, kein Rewrite.
- **Phase-28-B6 `applyGlobalDefaultsPayloadToState`-Pfad** für Cross-Client-
  Sync — Diagnostic-Overlay nutzt das Pattern bereits; Fix sitzt vermutlich
  am DOM-Apply-Hop, nicht am Transport.
- **`document.body.dataset.diagnosticOverlay`** — bestehender DOM-Hook für
  CSS-Selector-Driven-Visibility; Selector-Bug ist der wahrscheinlichste
  Single-Point-of-Failure.

### Established Patterns
- **Server-authoritative `runtimeFlags` in `global-defaults.json`** mit
  `global-config-update` Broadcast (Phase 13/26/28). B3 erbt das pattern; kein
  neuer Channel.
- **`?v=<hash>` Query-Param am Asset-URL** (Phase 28 B5). B2-Fix muss alle
  warmen-/decode-Pfade auf diese URL-Form normalisieren.
- **Render-Mode-Toggle (auto/2d/gl)** mit per-Mode unterschiedlichen Render-
  Pfaden. B1-Fix muss beide Pfade abdecken (D-01).
- **Manuelle UAT-Smoke auf Pi-Hardware** als Verifikations-Standard (Phase
  26-h9 Closure-Pattern). Kein Headless-Pixel-Diff.

### Integration Points
- **GL-Renderer:** `runtime-projection-gl-renderer.js` (Shader, Sampling-
  Filter).
- **2D-Renderer / Mesh-Warp:** Researcher identifiziert während Investigation
  (vermutlich `runtime-projection-grid-renderer.js` oder Aufrufer von
  `setTransform` mit Grid-Trapez-Daten).
- **GIF-Pipeline:** `runtime-gif-playback.js` + `runtime-gif-decoder.js`
  (warm + decode).
- **Asset-URL-Resolver:** `src/app/lib/shared/config.js` und/oder
  `runtime-state.js` (Hash-aware URL-Building).
- **Diagnostic-Overlay DOM-Apply:** `runtime-orchestration.js:958-969`.
- **Diagnostic-Overlay CSS:** `src/styles.css` §`.output-status-chip`.

### Risks / Watch-outs
- **Mesh-Warp-Scope-Creep (B1).** Researcher hat freie Hand (D-02), aber
  Phase-27-Trapez-Verhalten muss invariant bleiben. Acceptance auf Test-Board
  inkl. Trapez-Verzerrungen verifizieren.
- **B2-Hypothese kann falsch sein.** Wenn Cache-Key-Mismatch sich nicht
  bestätigt, ist die Investigation breiter (Pi-Memory, GC, etc.). Researcher
  hat Zeit-Budget zur Hypothese (~1h) bevor Pivot.
- **B3-DOM-Apply läuft auf /output/?** Researcher verifiziert, ob
  `runtime-orchestration.js`-Toggle-Apply auf /output/-Role aktiv ist. Wenn
  nicht (z.B. nur dashboard-role-pfad), ist das die Regression.
- **B1 + B3 Reihenfolge ist load-bearing.** B3 muss vor B1-Investigation
  fertig sein, damit der Researcher den aktiven Render-Mode auf Pi /output/
  überhaupt diagnostizieren kann (Diagnostic-Overlay-Mode-Readout).

</code_context>

<specifics>
## Specific Ideas

- **B1 ist visuell, B2 ist temporal, B3 ist zustandlich.** Drei
  fundamental verschiedene Failure-Klassen → 3 Plans (D-00).
- **Test-Board für alle drei: Nemesis Lockdown Board A.** Reproduktion +
  Verifikation auf identischem Datensatz. Keine Cross-Board-Regression-
  Coverage in Phase 30 (out of scope).
- **B3-Diagnostic-Overlay ist nicht nur ein Bugfix, sondern ein Werkzeug für
  B1.** Sobald Overlay live auf /output/ erscheint, sieht der User
  Render-Mode + FPS + Canvas-Auflösung — kritisch für B1-Mode-Diagnose. Daher
  D-00 Reihenfolge.
- **B2-Hypothese ist konkret und testbar.** Wenn `warmGifAssetPath(path)` mit
  raw path called wird, aber `<img src>` mit `path?v=hash` requestet wird,
  bypasst der Decode den Idle-Bypass-Pre-Warm → Pi /output/ fällt zurück auf
  langsamen Lazy-Decode-Pfad → genau das Failure-Pattern, das h9 reparieren
  sollte.
- **Phase-29-Test-Suite (40/40)** muss am Ende von Phase 30 weiterhin grün
  sein. Kein Regress an Phase-26-h9 / Phase-28-B6-Akzeptanz erlaubt.

</specifics>

<deferred>
## Deferred Ideas

- **Multi-Board Regression-Coverage** (Phase 30 ist Single-Board-Test). Wenn
  andere Boards ähnliche Symptome zeigen, eigener Folge-Hotfix.
- **Render-Mode Auto-Fallback bei Seam-Detection.** Phase-26-Known-Limitations
  hatte das angerissen — bleibt deferred.
- **Headless Pixel-Diff Test-Infrastruktur.** Wenn Phase 30 erneut
  re-regrediert, dann lohnt sich der Aufwand. Aktuell out of scope.
- **Asset-Versions-History / -Undo.** Aus Phase 28 deferred, bleibt deferred.
- **Auto-Fallback 2D ↔ GL bei Performance-Drops auf Pi.** Phase-26-Known-
  Limitations Punkt 4 — bleibt deferred.

### Reviewed Todos (not folded)
[None — keine Todo-Items im GSD-Todo-System gefunden, die Phase 30 Scope
  matchen.]

</deferred>

---

*Phase: 30-render-stability-regressions-closure*
*Context gathered: 2026-05-05*
