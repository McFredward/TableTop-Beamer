# Phase 31: Server-Side Rendering Pivot - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or
> execution agents. Decisions are captured in CONTEXT.md — this log
> preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 31 - Server-Side Rendering Pivot
**Areas discussed:** A — Stream-Transport, B — Server-Render-Stack, C — Latenz & Resilienz, D — User-Contract Touchpoints

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| A — Stream-Transport | Protokoll, Encode, Bandbreite | ✓ |
| B — Server-Render-Stack | Headless Chromium vs node-canvas vs Skia, Single-Instance vs per-Client, State-Source | ✓ |
| C — Latenz & Resilienz | Click→Pixel Budget, Server-Restart-Verhalten, Network-Hick-up | ✓ |
| D — User-Contract Touchpoints | Align-Mode-Roundtrip, Audio-Pfad | ✓ |

**User's choice:** Alle vier Blöcke.

---

## A — Stream-Transport

### A1: Streaming-Protokoll-Familie

| Option | Description | Selected |
|--------|-------------|----------|
| WebRTC | ~50-150ms Latenz, browser-native, Pi-HW-Decode, Setup-Komplexität (Signaling+ICE) | ✓ |
| MJPEG-over-HTTP | Sehr einfach, aber 50-100 Mbit/s bei 1080p@30 — WLAN-grenzwertig | |
| MSE + fMP4 (h264) | Buffer-tunable, Latenz 200-500ms, robust gegen Hick-ups | |
| Raw WebSocket binary frames | Volle Kontrolle, hohe Bandbreite + CPU-Last auf Pi | |

**User's choice:** WebRTC (Recommended)

### A2: Encode

| Option | Description | Selected |
|--------|-------------|----------|
| h264 | Pi-VC4 HW-Decoder, 4-8 Mbit/s @ 1080p30 | ✓ |
| JPEG-Sequence | Kein Codec, aber 30-60 Mbit/s | |
| WebP-Sequence | 25-35% kleiner als JPEG, kein Pi-HW-Decode | |
| VP9 / AV1 | Kein Pi-4-HW-Decoder | |

**User's choice:** h264 (Recommended)

### A3: Resolution

| Option | Description | Selected |
|--------|-------------|----------|
| 1920×1080 native | Volle Pixelpräzision, höhere Bandbreite | |
| 1280×720 upscale | Geringere Bandbreite, weichere Mesh-Warp-Linien | |
| Adaptive (1080p/720p auto) | WebRTC-nativ, resilient gegen Bandbreitenschwankungen | ✓ |

**User's choice:** Adaptive (1080p / 720p auto)

### A4: Pi-Display

| Option | Description | Selected |
|--------|-------------|----------|
| `<video>` Element direkt | Pi HW-Decoder, kein JS im Hot-Path (WebRTC/MSE) | ✓ |
| `<canvas>` + drawImage | Mehr CPU-Last, mehr Kontrolle, MJPEG/WebP/raw-WS-tauglich | |
| `<canvas>` + transferControlToOffscreen | OffscreenCanvas in Worker, Browser-Support unsicher | |

**User's choice:** `<video>` Element direkt (Recommended)

---

## B — Server-Render-Stack

### B1: Render-Stack

| Option | Description | Selected |
|--------|-------------|----------|
| Headless Chromium | 1:1 reuse, ~200-400 MB RAM, ~2-5s bootup | ✓ |
| node-canvas + ffmpeg | Leichtgewichtig (~50MB), Re-Implementierung der Runtime | |
| node-canvas + headless-gl + ffmpeg | Maximale Code-Reuse + native perf, OS-Dependencies | |
| skia-canvas + ffmpeg | Skia-Backend, Re-Implementierungs-Aufwand identisch zu node-canvas | |

**User's choice:** Headless Chromium (Recommended)

### B2: Instances

| Option | Description | Selected |
|--------|-------------|----------|
| Eine Instance pro Board, geteilt | CPU-effizient, identisches Bild für alle Clients | ✓ |
| Eine Instance pro Client | per-Client-View möglich, N×CPU-Last | |
| Hybrid: Server für /output/, Dashboard rendert weiter lokal | Minimaler Eingriff, zwei Render-Pfade synchron halten | |

**User's choice:** Eine Instance pro Board, geteilt (Recommended)

### B3: State-Source

| Option | Description | Selected |
|--------|-------------|----------|
| Server-only authoritative | Pi hat keinen runtime-state, max Cleanup | ✓ |
| Server-authoritative + Pi-Mirror für DOM-Overlay | Mini-State auf Pi für Status-UI | |
| Server + Pi vollständiger Mirror | Phase-30-Code bleibt aktiv, Drift-Risiko | |

**User's choice:** Server-only authoritative (Recommended)

### B4: Local-Fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Nein, Stream-only — schwarzer Bildschirm bei Disconnect | Sauberster Code | |
| Ja, automatischer Fallback auf Pi-lokale Phase-30 Pipeline | Maximale Resilience, zwei Render-Pfade synchron | |
| Manueller Fallback per URL-Param (?local=1) | Default Stream, Notnagel verfügbar | |

**User's choice (Other):** "Option 1 (Stream only), aber mit entsprechenden
Fehlermeldungen, so dass der user sieht was passiert anstatt nur ein
schwarzes Bild zu bekommen"

**Notes:** Stream-only WIRD gewählt, aber mit verbindlicher User-Constraint:
explizite Status-/Error-UI auf Pi bei jedem Disconnect-Fall. Niemals
schwarzer Bildschirm. Diese Constraint ist verbindlich für UAT-Acceptance.

---

## C — Latenz & Resilienz

### C1: Latenz

| Option | Description | Selected |
|--------|-------------|----------|
| <150ms (Live-Show feel) | LAN-realistisch, ultrafast preset | ✓ |
| <300ms (responsive) | Größerer Buffer, robust gegen WLAN-Jitter | |
| <1s (Brettspiel-Tempo) | Konservativ, große Buffer, Cloud-Server-tauglich | |

**User's choice:** <150ms (Recommended)

### C2: Server-Restart

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-Reconnect mit Status-UI | 'Server reconnecting...' Banner, automatisch | ✓ |
| Manueller Reload nötig | Klick-zum-Neuladen Button | |
| Auto-Reconnect mit Last-Frame-Freeze | Letzter Frame bleibt, kleines Reconnect-Overlay | |

**User's choice:** Auto-Reconnect mit Status-UI (Recommended)

### C3: Network-Hick-up

| Option | Description | Selected |
|--------|-------------|----------|
| WebRTC default jitter-buffer + Reconnect bei längeren Aussetzern | Browser-native, robust | ✓ |
| Keinen Buffer — sofort Disconnect-UI bei first frame loss | Maximale Transparenz, störend bei normalem Jitter | |
| Server-side Buffer-Tuning passen wir an die Hardware an | Plan-Phase entscheidet konkrete Werte | |

**User's choice:** WebRTC default jitter-buffer + Reconnect bei längeren Aussetzern (Recommended)

### C4: Health-Detection

| Option | Description | Selected |
|--------|-------------|----------|
| Heartbeat-WS + WebRTC connection-state | Drei Indikatoren: WebRTC + last-frame + heartbeat | ✓ |
| Nur WebRTC connection-state | Minimal, silent-freeze-Risiko | |
| Last-frame-timestamp Tracking auf Pi | Catches silent freezes, komplexer | |

**User's choice:** Heartbeat-WS + WebRTC connection-state (Recommended)

---

## D — User-Contract Touchpoints

### D1: Align-Mode

| Option | Description | Selected |
|--------|-------------|----------|
| Touch/Mouse Pi → WS → Server, Server rendert Mesh-Update | Konsistent mit B3, ~30-150ms LAN-Latenz | ✓ |
| Pi-lokales Live-Preview, Server-Update bei Drop | Niedrigere Drag-Latenz, zwei Render-Pfade während Drag | |
| Server rendert Live-Drag, kein Pi-Preview | Einfachster Code, holprig bei WLAN-Jitter | |

**User's choice:** Touch/Mouse Pi → WS → Server, Server rendert Mesh-Update (Recommended)

### D2: Audio

| Option | Description | Selected |
|--------|-------------|----------|
| Pi-lokal via WS-Trigger | HTML5 Audio, kein Audio im Stream, Pi-Audio-HW direkt | |
| Audio im WebRTC-Stream | Server mixt Audio in WebRTC-Track, garantierte Sync | ✓ |
| Hybrid — short FX Pi-lokal, lange Tracks im Stream | Komplex, optimiert | |

**User's choice:** Audio im WebRTC-Stream (NICHT der recommended option)

**Notes:** User entschied gegen die Empfehlung. Implikation: Headless
Chromium muss Audio capturen können (Web Audio API + Stream-Capture).
Researcher muss Audio-Capture-Stabilität früh verifizieren — falls nicht
stabil, eskalieren bevor Plan-Phase finalisiert wird.

### D3: Pi-Local UI

| Option | Description | Selected |
|--------|-------------|----------|
| Status-UIs only — Diagnostic-Chip, Reconnect-Banner, Server-Error | CSS-Overlays über Stream | ✓ |
| Alles im Stream, keine Pi-DOM-Overlays | Konsistent, aber Stream-Freeze-Risiko | |
| Stream + minimaler Pi-Boot/Error-Overlay nur | Stream übernimmt sobald da | |

**User's choice:** Status-UIs only (Recommended)

### D4: Init-Boot

| Option | Description | Selected |
|--------|-------------|----------|
| TT-Beamer Splash + Connection-Status | Branded Splash, Loading-Spinner, Error+Retry | ✓ |
| Schwarzer Screen bis erster Frame | Schlicht aber tot wirkend | |
| Letzter persistierter Frame als Standbild + Connecting-Overlay | Komplex, kein Boot-Flicker | |

**User's choice:** TT-Beamer Splash + Connection-Status (Recommended)

---

## Claude's Discretion (forwarded to Researcher / Planner)

- D-X1: Genaue WebRTC-Implementierungs-Bibliothek (aiortc / mediasoup /
  janus / wrtc / werift).
- D-X2: Genaue Headless-Browser-Wahl (puppeteer vs playwright).
- D-X3: Frame-Capture-Pfad (Page.startScreencast vs getDisplayMedia vs
  off-screen-canvas).
- D-X4: Encoder-Pipeline (passthrough vs transcoding via ffmpeg).
- D-X5: Multi-Client-Stream-Verteilung (P2P-Mesh vs SFU).
- D-X6: Adaptive-Resolution-Trigger.
- D-X7: Server-side state-restore-Pfad bei Restart.
- D-X8: Spezifische Audio-Mixing-Pipeline (Web Audio API vs HTML `<audio>`).

## Deferred Ideas

- Multi-Server / Cluster-Render
- Internet / TURN / WAN-Streaming
- Browser-Recording / Frame-Snapshot-Endpoint
- Dashboard-Preview entkoppelt vom Server-Stream (Hybrid-Reaktivierung)
- Auto-Fallback Pi auf Local-Render
- Adaptive-FPS-Senkung im Stream
