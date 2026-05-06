# Phase 31: Server-Side Rendering Pivot - Context

**Gathered:** 2026-05-06
**Status:** Ready for research + planning

<domain>
## Phase Boundary

Architektonischer Pivot: der Pi 4 wird vom Renderer zum **Thin-Display-Client**.
Der Server (deutlich stärkere Hardware) übernimmt die komplette Render-Pipeline
(Animations-Decode, Compositing, Mesh-Warp / Projection-Mapping, Multi-Area,
Effects). `/output/` auf dem Pi konsumiert ausschließlich einen finalen
Pixel-Stream + minimale Status-DOM-Overlays.

User-facing Verträge bleiben **identisch**: Align-Mode, 4-Ecken Projection-
Mapping, Multi-Area, Animation-Timeline, alle bisherigen Animations-Typen
(coded, gif, mp4, solid-color), alle Phase-Verträge ab Phase 8. Es ändert
sich ausschließlich der **Render-Ort**.

**Test-Board:** Nemesis Lockdown Board A.

**Trigger:** Phase 30 hat client-seitige Optimierung auf Pi VC4 plateau'd
bei ~12 fps trotz 16-Task-Welle (T1-T16). Phase-30-SUMMARY.md dokumentiert
warum: per-Frame Last (fx-canvas + N rooms + Mesh-Warp + GIF putImageData
+ mp4 drawImage) übersteigt das Pi-VC4-Budget bei 1920×1080. Server-Side-
Rendering verschiebt diese Last auf stärkere Hardware. Ziel: ≥20 fps,
ideal 24-30 fps auf /output/.

**Explizit nicht im Scope:**
- Neue Animations-Typen oder neue Render-Modes.
- UX-Redesign von Dashboard/Settings.
- Schema-Migrationen (Phase 29 v4 bleibt).
- Cluster / Multi-Server-Render (deferred falls Single-Server reicht).
- TURN-Server / Internet-Routed-Streaming (LAN-only ist die Annahme).
- Backwards-Compat zu Phase-30-Local-Render-Pfad als laufende
  Code-Pfad-Variante. (Phase-30-Code bleibt im Repo als Defense-in-Depth,
  aber wird in Phase 31 nicht aktiv aufgerufen.)

</domain>

<decisions>
## Implementation Decisions

### Block A — Stream-Transport

- **D-A1: Streaming-Protokoll = WebRTC.**
  Niedrigste Latenz (~50-150ms im LAN), browser-native via `<video>`-Element,
  Pi-VC4 HW-Decode automatisch genutzt. Server nutzt aiortc/mediasoup/
  janus oder vergleichbar (Researcher wählt nach Node-Server-Integration).
  Signaling läuft über das bestehende WebSocket-System.

- **D-A2: Encode = h264.**
  Pi 4 hat dedizierten h264-HW-Decoder (VC4-V3D). Bandbreite bei 1080p@30fps:
  4-8 Mbit/s — LAN unproblematisch, WLAN ausreichend. Server-encode via
  x264 (libx264, ultrafast preset) oder hardware-encoder (NVENC / VAAPI je
  nach Server-Hardware — Researcher prüft).

- **D-A3: Resolution = adaptiv 1080p ↔ 720p.**
  Stream startet 1080p, fällt bei Bandbreitenproblemen auto auf 720p
  (WebRTC kann das nativ via Simulcast oder SVC). Pi /output/ skaliert per
  CSS auf 1080p falls 720p empfangen. Mesh-Warp-Präzision bleibt durch
  serverseitiges Rendern in Ziel-Resolution erhalten.

- **D-A4: Pi-Display = `<video>`-Element direkt.**
  Pi-Browser nutzt VC4 HW-Decoder ohne JS-Code im Hot-Path. Kein Canvas.
  Kein drawImage. `<video autoplay muted playsinline>` mit dem WebRTC-
  MediaStream als srcObject. Mesh-Warp ist bereits im Stream-Bild encoded
  — Pi macht nichts mehr daran.

### Block B — Server-Render-Stack

- **D-B1: Server-Render = Headless Chromium.**
  Server lädt den existierenden `/output/`-Code 1:1 in einem headless Browser
  (puppeteer oder playwright). Frame-Output via screencast-API → ffmpeg →
  WebRTC. Vorteil: Pixel-identisch zur aktuellen Render-Pipeline, keine
  Re-Implementierung von GIF-Decoder / Mesh-Warp / Animation-System
  notwendig. RAM-Footprint ~200-400 MB pro Instance — auf Server-Hardware
  unkritisch.

- **D-B2: Eine Render-Instance pro Board, geteilt für alle Clients.**
  Server rendert das Board einmal. Pi /output/ + Dashboard-Preview + ggf.
  Tablet-Preview konsumieren denselben Stream (WebRTC SFU pattern). CPU-
  effizient. Operator sieht garantiert identisches Bild zum Beamer.
  *Hinweis Researcher:* Dashboard-Preview kann optional weiterhin lokal
  rendern (als `Hybrid`-Variante) — entscheidet sich in der Plan-Phase
  nach Code-Komplexitätsanalyse.

- **D-B3: Runtime-State = server-only authoritative.**
  Server hält den vollen runtime-state (geladenes Board, aktive Animationen,
  Mesh-Warp-Korner, Diagnostic-Flags). WebSocket-Broadcast bleibt für
  Dashboard. Pi /output/ hat KEINEN runtime-state mehr im Sinne von
  Animations-Logik. Pi hat nur:
  - WebRTC-Stream-Connection-State.
  - Status-UIs (siehe D-D3).
  - Touch/Pointer-Events Forwarding (siehe D-D1).

- **D-B4: Stream-only mit expliziten Fehlermeldungen — KEIN Local-Fallback.**
  Pi /output/ ist ausschließlich Stream-Empfänger. Bei Server-Disconnect/
  Stream-Verlust: explizite Error-UI (siehe D-D3, D-D4) — niemals einfach
  schwarzer Bildschirm. **User-Constraint (verbindlich):** "mit
  entsprechenden Fehlermeldungen, so dass der user sieht was passiert
  anstatt nur ein schwarzes Bild zu bekommen". Phase-30-Local-Render-Code
  bleibt im Repo als Defense-in-Depth, wird aber in Phase 31 nicht
  aktiviert.

### Block C — Latenz & Resilienz

- **D-C1: Latenz-Budget = <150ms (Operator-Click → sichtbar auf Pi).**
  WebRTC mit niedrigem Buffer-Tuning (Jitter-Buffer ~30-50ms), h264
  ultrafast preset. Realistisch im LAN. UAT-Acceptance: Tester drückt
  Trigger-Button, beobachtet Beamer-Bild, fühlt keine spürbare Verzögerung.

- **D-C2: Server-Restart = Auto-Reconnect mit Status-UI.**
  Pi /output/ zeigt 'Server reconnecting...' Banner während Polling.
  Sobald Server zurück ist: automatisch Stream neu aufbauen. Server
  restored runtime-state aus on-disk Config + persistierten runtime-
  state-Dateien (Phase 13/29 Pattern). Operator muss nichts manuell tun.

- **D-C3: Network-Hick-up = WebRTC default jitter-buffer + Reconnect bei
  längeren Aussetzern.**
  WebRTC absorbiert ~50-100ms Jitter automatisch (browser-native).
  Bei längeren Drops (>3s ohne Frame): Reconnect-Logik läuft + Status-UI
  triggert (siehe D-D3).

- **D-C4: Health-Detection = Heartbeat-WS + WebRTC connection-state.**
  Drei Indikatoren werden gleichzeitig getrackt:
  1. WebRTC `RTCPeerConnection.connectionState` (`disconnected`/`failed`).
  2. Last-frame-received timestamp (Pi tracked auf `<video>`-Element via
     `requestVideoFrameCallback` oder `timeupdate`).
  3. Heartbeat über separaten WebSocket-Channel (Server alle 1-2s).
  Disconnect-UI triggert wenn beliebiger Indicator >3s ohne update bleibt.

### Block D — User-Contract Touchpoints

- **D-D1: Align-Mode = Touch/Mouse Pi → WebSocket → Server, Server rendert
  Mesh-Update.**
  Pi sendet jede Drag-Bewegung als WebSocket-Event an Server. Server
  updated Mesh-Warp-State, neuer Frame im Stream zeigt das Update.
  Konsistent mit D-B3 (server-only state). Latenz: WS-RTT + 1 Frame
  (~30-150ms im LAN). User-Touch-Behavior bleibt aus User-Sicht
  unverändert (Phase 13/19/27 Touch-Verträge).

- **D-D2: Audio = im WebRTC-Stream (NICHT Pi-lokal).**
  *User hat hier von der Empfehlung abgewichen.* Server mischt Animation-
  Sounds (alarm.mp3, electricity.mp3, etc.) in den WebRTC-Audio-Track.
  Vorteil: garantierte Audio/Video-Synchronisation. Implikation: Pi-
  lokaler Audio-Pfad (`runtime-wire-room-audio-binders.js`-Pattern,
  HTML5 Audio + WebSocket-Trigger) wird auf Pi `/output/` deaktiviert/
  entfernt — Audio kommt jetzt aus dem Stream. Headless Chromium kann
  Audio via Web Audio API generieren; puppeteer-stream / playwright-
  screencast kann Audio + Video gemeinsam capturen. Researcher prüft
  konkrete Audio-Capture-Pipeline.

- **D-D3: Pi-Local DOM-UI = Status-UIs only.**
  Pi-DOM rendert nur:
  - Diagnostic-Chip (Phase 30 Pattern, zeigt z.B. fps / Stream-Status /
    Connection-State, vom Server via WS gefüttert).
  - Reconnect-Banner (D-C2).
  - Server-Error / Connection-Failure UI (D-B4).
  - Splash/Connection-Status während initial Boot (D-D4).
  Stream selbst (Animation-Bild) ist im `<video>`-Element. Status-UIs sind
  CSS-Overlays über dem Video. Vorteil: Status-UIs reagieren auch wenn der
  Stream einfriert.

- **D-D4: Init-Boot UI = TT-Beamer Splash + Connection-Status.**
  Branded Splash-Screen mit "Connecting to render server..." Text +
  Loading-Spinner während des initialen Stream-Setup. Bei Connection-Fail:
  explizite Error-Message ("Server unreachable — Retry") + Retry-Button.
  Konsistent mit Phase-13 Server-unreachable-Overlay-Pattern.

### Claude's Discretion

- **D-X1: Genaue WebRTC-Implementierungs-Bibliothek auf Server-Seite**
  (aiortc / mediasoup / janus / wrtc / werift) — Researcher wählt nach
  Node-Server-Integration und ARM-Cross-Compile-Verfügbarkeit (falls
  Server selber auf ARM läuft).

- **D-X2: Genaue Headless-Browser-Wahl** — puppeteer (chromium) vs
  playwright (chromium/firefox/webkit). Researcher prüft Audio-Capture-
  Support (D-D2 Implikation), screencast-Performance, und Memory-Footprint.

- **D-X3: Frame-Capture-Pfad** — `Page.startScreencast` (Chromium DevTools
  Protocol) vs `getDisplayMedia` in einem zweiten Browser-Tab vs
  Off-Screen-Canvas-readPixels. Researcher wählt nach Latenz-Charakteristik.

- **D-X4: Encoder-Pipeline** — direkt aus Browser-Stream zu WebRTC weiter-
  leiten (passthrough wenn WebRTC bereits im Browser läuft) vs Browser →
  raw frames → ffmpeg → WebRTC (transcoding). Erste Option ist niedriger
  Latenz, zweite ist flexibler. Researcher wählt.

- **D-X5: Multi-Client-Stream-Verteilung** — peer-to-peer 1:N (Mesh)
  vs SFU-Server (eigene mediasoup-Instance). Bei nur 2-3 Clients reicht
  Mesh; bei >3 SFU. Researcher empfiehlt nach erwarteter Client-Anzahl.

- **D-X6: Adaptive-Resolution-Trigger** (D-A3) — bandwidth-based vs
  decoder-fps-based vs manuell. WebRTC hat eigene Heuristiken — die
  default-Konfiguration reicht möglicherweise.

- **D-X7: Server-side state-restore-Pfad bei Restart** (D-C2) — aus welchen
  Files / DB der full runtime-state rebuilded wird. Phase 13/29 hat das
  meiste schon (boards, polygons, fx-config). Researcher prüft ob aktive-
  Animationen-Layer auch persisted werden muss.

- **D-X8: Spezifische Audio-Mixing-Pipeline** (D-D2) — Web Audio API in
  Headless Chromium mit Pre-loaded Audio-Buffers vs HTML `<audio>` per
  Animation. Researcher prüft welcher Pfad mit puppeteer/playwright-
  Audio-Capture stabil läuft.

### Folded Todos

[None — keine GSD-Todo-Items für Phase 31 Scope.]

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before researching or planning.**

### Phase 31 Inputs
- `.planning/ROADMAP.md` §`Phase 31 - Server-Side Rendering Pivot` —
  10 Graubereiche, Hard Constraints, Out-of-Scope, vorläufige Milestones
  + Exit Criteria.

### Phase 30 Closure (Pivot-Trigger)
- `.planning/phases/phase-30/SUMMARY.md` — warum client-side
  optimization plateau'd auf Pi VC4. Phase-30-Hotfixes h6-h15 bleiben
  als Defense-in-Depth im Code.
- `.planning/phases/phase-30/30-RESEARCH-PI-PERF.md` — Per-Frame Last-
  Aufschlüsselung (fx-canvas + N rooms + Mesh-Warp + GIF putImageData +
  mp4 drawImage). Researcher braucht das als Server-Render-Last-Modell.
- `.planning/phases/phase-30/30-04-PI-PERF-PLAN.md` — T1-T16 Task-Ledger
  mit fps-Matrix-Daten (T2 UAT zeigt rooms als dominanten Bottleneck).

### User-Contract Verträge (NICHT verändern)
- `.planning/phases/phase-19/SUMMARY.md` — Align-Mode Visibility +
  Projection-Mapping-UX.
- `.planning/phases/phase-27/SUMMARY.md` — Align-Mode Refinement, Trapez-
  Ecken, Squish-Bars (Server-Renderer muss diese Pixelpräzise reproduzieren).
- `.planning/phases/phase-28/SUMMARY.md` — Cross-cutting UX & State Polish,
  inkl. Diagnostic-Overlay (B6) — Pi-DOM-Overlay-Pattern bleibt erhalten.
- `.planning/phases/phase-13/CLOSURE.md` — Server-authoritative Config
  (Phase 31 erbt das Pattern für state-restore).
- `.planning/phases/phase-12/12-1-VERIFICATION.md` — Animation-Layering-
  Vertrag (additive, A→B == B→A) — Server-Renderer muss das identisch
  liefern.

### Server / Wiring Infrastructure
- `server.mjs` — bestehender Express + WebSocket-Server. Phase 31
  erweitert hier den WebRTC-Signaling-Pfad und Audio/Video-Capture-Stack.
- `src/app/runtime/live-sync/runtime-live-sync-core.js` — Snapshot-Fanout-
  Pattern. Mesh-Warp-Drag-Events (D-D1) gehen hier durch.
- `src/app/runtime/live-sync/runtime-zone-loader.js` — /output/-Initial-
  State. Phase 31 wirft das Initial-State-Loading auf /output/ raus
  (D-B3) — Pi braucht keinen Initial-State mehr.
- `src/app/runtime/wire/runtime-wire-room-audio-binders.js` — aktueller
  Pi-lokaler Audio-Pfad. Phase 31 deaktiviert das auf /output/ (D-D2).

### Render Pipeline (zu re-hosten in Headless Chromium)
- `src/app/runtime/runtime-orchestration.js` — Top-Level Render-Loop.
- `src/app/runtime/render/runtime-draw-loop.js` — Per-Frame Compositing.
- `src/app/runtime/render/runtime-gif-decoder.js` + `runtime-gif-playback.js`
  — GIF-Pipeline (Phase-30-Hotfixes h7..h15 bleiben).
- `src/app/runtime/render/runtime-outside-mp4.js` — mp4-Pipeline
  (Phase-30-Hotfixes T13/T16 bleiben).
- `src/app/runtime/viewport/runtime-projection-grid-renderer.js` +
  `runtime-projection-gl-renderer.js` — Mesh-Warp 2D + GL.

### /output/-Boot-Pfad (zu re-skinnen für Stream-Empfang)
- `src/app/runtime/runtime-bootstrap.js` (oder vergleichbarer Boot-Entry)
  — /output/-Initial-Render-Setup. Phase 31 ersetzt hier den Render-
  Pipeline-Boot durch WebRTC-Receiver-Boot + Stream-Health-Tracking.
- `index.html` — Topbar + /output/-DOM-Layout. Phase 31 fügt `<video>`-
  Element + Status-Overlay-DOM-Slots hinzu.
- `src/styles.css` §`.output-status-chip` etc. — Status-UI-Styles
  (D-D3). Bleiben.

### Phase 30 Stability-Hotfixes (Defense-in-Depth, bleiben im Code)
- `src/app/runtime/render/runtime-gif-decoder.js` — T7+T15+T14 (256px cap,
  rAF yield).
- `src/app/runtime/render/runtime-gif-playback.js` — T11 (bitmap-bake on
  dashboard only), T12 (30s warm timeout).
- `src/app/runtime/render/runtime-outside-mp4.js` — T16 (1500ms freshness).
- `src/app/runtime/render/runtime-draw-loop.js` — T4+T13 (final-output
  bypass).

### Asset Manifest + Config
- `config/asset-manifest.json` — Phase-28-B5 hash-Manifest. Server-
  Renderer braucht read-Zugriff auf gleiche Asset-Pfade.
- `config/global-defaults.json` + `config/boards/<id>.json` — Phase-29
  Schema v4. Server-State-Source.
- `src/app/lib/shared/config.js` — Asset-URL-Resolver, Animation-Defaults.

### External Stack-Specs (zu researchen in Plan-Phase)
- WebRTC Browser-API (MDN: RTCPeerConnection, MediaStream, getUserMedia).
- Puppeteer Page.startScreencast (Chromium DevTools Protocol).
- Playwright Page.video / screencast.
- mediasoup / aiortc / werift Node-Server-Bibliotheken.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (für Server-Side-Render-Pipeline)

- **Komplette `/output/`-Render-Pipeline** (`runtime-orchestration.js`,
  `runtime-draw-loop.js`, GIF-Pipeline, mp4-Pipeline, Mesh-Warp 2D + GL)
  — läuft in Headless Chromium 1:1 ohne Code-Änderung. Phase-30-Hotfixes
  bleiben als safety-net.
- **WebSocket-Snapshot-Fanout** (`runtime-live-sync-core.js`) — Pattern
  für Mesh-Warp-Drag-Events Pi → Server (D-D1). Existing Channel kann
  erweitert werden.
- **Server-authoritative Config-Pattern** (Phase 13) — runtime-state-Restore
  bei Server-Restart (D-C2) erbt das.
- **Diagnostic-Overlay-DOM-Pattern** (Phase 28 B6 + Phase 30 B3) —
  `document.body.dataset.diagnosticOverlay` + CSS-Overlay. Wird als
  Status-UI-Pattern auf Pi /output/ wiederverwendet (D-D3).
- **Phase-13 Server-Unreachable-Overlay** — Pattern für Connection-Failure-
  UI (D-D4). Wird auf Stream-Disconnect-Fall erweitert.

### Established Patterns

- **Server-authoritative State** (Phase 13). Phase 31 verschiebt zusätzlich
  die Render-Pipeline auf den Server. Pi wird thin client.
- **WebSocket-basierter Live-Sync** für Config-Mutations und State-Updates.
  Phase 31 nutzt einen separaten WebSocket für WebRTC-Signaling +
  Heartbeat (D-C4).
- **Phase-26 / Phase-30 manueller UAT auf Pi-Hardware** als Verifikations-
  Standard. Phase 31 erbt — kein Headless-Pixel-Diff, keine Synthetik-Tests
  für Stream-Empfang.

### Integration Points

- **Server-side Render-Host:** Headless Chromium (puppeteer/playwright)
  läuft als Child-Process des bestehenden `server.mjs` oder als sidecar.
- **Server-side WebRTC-Signaling:** neuer WebSocket-Channel in `server.mjs`
  + STUN-Konfiguration (LAN-only — kein TURN nötig).
- **Server-side WebRTC-MediaServer:** mediasoup / wrtc / werift, läuft im
  Node-Prozess oder als sidecar.
- **Pi /output/-Boot:** ersetzt aktuelle Render-Pipeline durch WebRTC-
  Receiver-Code. `<video>`-Element + Status-DOM-Overlays.
- **Audio-Capture in Headless Chromium:** Web Audio API + browser audio
  track → MediaStream → WebRTC-Audio-Track. Researcher verifiziert
  Stabilität auf der gewählten Headless-Browser-Plattform.

### Risks / Watch-outs

- **Audio im Stream (D-D2)** ist eine Abweichung von der Empfehlung.
  Headless-Chromium-Audio-Capture ist weniger gut dokumentiert als Video-
  Capture. Researcher muss frühzeitig Bring-up-Risiko bewerten — falls
  nicht stabil, eskalieren und ggf. doch auf Pi-lokalen Audio-Pfad
  zurückfallen.
- **Headless-Chromium RAM-Footprint** — bei mehreren parallelen Boards
  potentiell teuer. Phase 31 deferred Multi-Server (Cluster) — Single-
  Server-Annahme muss in Plan-Phase verifiziert werden (welche Hardware
  hat der User).
- **Mesh-Warp-Pixel-Identität** — Server-Renderer (Headless Chromium)
  muss Phase-27-Trapez-Verzerrung pixel-identisch zum aktuellen Pi-
  Pi-Render reproduzieren. Da identischer Code im selben Browser-Engine
  läuft, ist das Risiko niedrig — aber UAT muss explizit prüfen.
- **WebRTC-Signaling-Komplexität** — STUN/ICE im LAN ist trivial, aber
  Browser-WebRTC-Implementations haben Quirks. Researcher prüft
  Best-Practice-Server-Library für Node.
- **Single-Renderer-Instance vs Multi-Tab-Updates** (D-B2) — wenn
  Dashboard-Preview den gleichen Stream konsumiert, muss der Stream
  Mesh-Warp-Drag-Updates während des Drags zeigen — eventuell mit
  Latenz-Sichtbarkeit. UAT prüft.
- **Phase-30-Hotfixes als Defense-in-Depth** — wenn Phase-31-Code Phase-
  30-Code unterläuft, könnte das Phase-30-Stability-Net brechen.
  Researcher achtet darauf dass Phase-30-Logik weiter aktiv ist (auch in
  Headless Chromium).
- **Connection-Failure-UX (D-B4 + D-D3 + D-D4)** ist verbindlicher
  User-Constraint ("kein schwarzer Bildschirm"). Plan-Phase muss explizit
  Test-Cases für Server-Disconnect / Server-Restart / Stream-Freeze
  schreiben.

</code_context>

<specifics>
## Specific Ideas

- **Headless Chromium ist absichtlich gewählt um Re-Implementierung zu
  vermeiden.** Phase-26-h9 GL-Triangle-Seam-Fix, Phase-27 Mesh-Warp,
  Phase-28-B5 Asset-Hash-URLs, Phase-30 GIF/mp4-Hotfixes — alle bleiben
  in einem unveränderten Code-Stand laufen. Phase 31 macht keinen "Refactor
  des Renderers", sondern verschiebt nur den Ausführungsort.

- **WebRTC + h264 ist die latenz-niedrigste Kombination mit Pi-VC4-HW-
  Decode.** Andere Optionen (MJPEG, MSE-fMP4, raw-WS) sind alle entweder
  bandbreiten-teurer (MJPEG), latenz-höher (MSE), oder CPU-teurer (raw-WS).

- **"Pi sieht nichts mehr direkt"** ist die saubere Architektur. Pi `/output/`
  hat keinen runtime-state, keine Animation-Logik, keinen GIF-Decoder, keinen
  mp4-Reader, keinen Mesh-Warp-Code im aktiven Pfad — nur ein `<video>` plus
  Status-Overlays. Das ist der Cleanup, der die fps-Begrenzung strukturell
  löst.

- **Audio-im-Stream (D-D2)** ist die User-Wahl entgegen der initialen
  Empfehlung. Begründung wahrscheinlich: garantierte Sync. Researcher
  achtet darauf dass Web-Audio-Capture in Headless Chromium tatsächlich
  funktioniert — falls nicht, ist das ein Eskalations-Punkt vor Plan-Phase.

- **Test-Board für Phase 31: Nemesis Lockdown Board A** (gleiche wie Phase
  30 — vergleichbarer fps-Baseline-Datensatz).

- **Phase-29-Test-Suite (40/40)** muss am Ende von Phase 31 weiterhin grün
  bleiben — Phase 31 fügt voraussichtlich neue Tests für Stream-Transport
  hinzu, regrediert aber keine bestehenden.

- **Connection-Failure Verhalten als hartes UX-Gate:** "kein schwarzer
  Bildschirm". Jeder Disconnect-Pfad muss eine sichtbare, lesbare Status-
  oder Error-UI auf Pi rendern. Dieses Gate ist verbindlich für UAT-
  Acceptance.

</specifics>

<deferred>
## Deferred Ideas

- **Multi-Server / Cluster-Render** — falls in Zukunft mehrere Boards
  parallel laufen sollen. Phase 31 ist Single-Server.
- **Internet / TURN-Server / WAN-Streaming** — Phase 31 ist LAN-only.
  Bei externer Beamer-Anbindung über Internet wird ein eigenes Phase
  fällig.
- **Browser-Recording / Frame-Snapshot-Endpoint** — Server könnte Stream
  in Datei aufzeichnen. Out-of-Scope.
- **Dashboard-Preview entkoppelt vom Server-Stream** — falls Plan-Phase
  zeigt dass die geteilte-Instance-Variante (D-B2) zu komplex wird, kann
  die Hybrid-Variante (Dashboard rendert lokal weiter) als Fallback
  reaktiviert werden.
- **Auto-Fallback Pi auf Local-Render** — Phase 31 deaktiviert das
  bewusst (D-B4). Falls in Zukunft Live-Show-Resilience kritisch wird
  und Server-Hardware unzuverlässig: eigener Phase fällig.
- **Adaptive-FPS-Senkung im Stream** — bei Bandbreiten-Engpässen statt
  Resolution-Drop fps-Senkung. WebRTC kann das nativ — falls notwendig
  im Plan-Phase aktivieren, sonst deferred.

### Reviewed Todos (not folded)
[None — keine Todo-Items im GSD-Todo-System gefunden, die Phase 31 Scope
matchen.]

</deferred>

---

*Phase: 31-server-side-rendering-pivot*
*Context gathered: 2026-05-06*
