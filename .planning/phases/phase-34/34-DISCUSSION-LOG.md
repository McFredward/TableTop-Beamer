# Phase 34: SSR Render-Quality + /output/ Thin-Consumer Refactor - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 34-render-quality-thin-consumer
**Areas discussed:** Phase scope, Track A approach, 2D fallback policy, Track B scope, HTML routing, SSR path, Verification

---

## Phase scope (pre-discuss-phase)

| Option | Description | Selected |
|--------|-------------|----------|
| Beide Items zusammen | GL→2D Fallback Fix + /output/ Thin-Consumer Refactor in einer Phase | ✓ |
| Nur GL→2D Fix | Nur Banding-Artifacts | |
| Nur /output/ Refactor | Nur thin-consumer | |
| Etwas anderes hat Priorität | Andere Themen wichtiger | |

**User's choice:** Beide Items zusammen
**Notes:** Beide Themen sind Render-Qualität / Stream-Topology, ähnlicher Kontext. Eine Phase, zwei Tracks.

---

## Track A — Erst diagnostizieren oder direkt fixen?

| Option | Description | Selected |
|--------|-------------|----------|
| Erst Diagnose, dann Fix (Recommended) | Renderer-Detection-Probe in den SSR-Tab einbauen, dann fixen | |
| Direkt forcen + visuell verifizieren | GL-Forcing + Chrome GPU-Init-Flags härten, manueller Visual-Test | |
| Beides parallel — Probe + Force gleichzeitig | Probe und Forcing-Flags in einem Plan | ✓ |

**User's choice:** Beides parallel — Probe + Force gleichzeitig
**Notes:** Telemetrie für die Zukunft, Forcing für das aktuelle Problem. Phase 33 Hard-Lesson reapplied (telemetrie zuerst lesen).

---

## Track A — Soll 2D-Fallback im SSR-Tab erlaubt bleiben?

| Option | Description | Selected |
|--------|-------------|----------|
| SSR-Tab: kein 2D-Fallback (Recommended) | 2D-Fallback im `/ssr`-Pfad deaktiviert; Dashboard + Pi /output/ behalten 2D-Fallback | ✓ |
| 2D-Fallback bleibt überall, nur GL-Init härten | Konservativer | |
| Du entscheidest | Claude wählt nach Research | |

**User's choice:** SSR-Tab: kein 2D-Fallback
**Notes:** Banding ist nicht akzeptabel für eine Stream-Source. Wenn GL stirbt — Watchdog (Phase 33) restarted den Tab. Phase 30 B2 h10 bleibt für Dashboard und /output/ unverändert.

---

## Track B — Wie radikal soll die /output/ thin-consumer Refactor sein?

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal: render-pipeline skippen, audio binders bleiben (Recommended) | Early-return in runtime-orchestration auf /output/ | |
| Audio-Binders in receiver-bootstrap verschieben + komplette pipeline strip | Phase 31 Plan 05 deferred work | |
| Eigener HTML-Entry-Point für /output/ | Komplett separate output.html ohne shared dashboard scripts | ✓ |

**User's choice:** Eigener HTML-Entry-Point für /output/
**Notes:** Maximaler Diff, klarste Architektur. Kein Code-Sharing zwischen Dashboard und /output/.

---

## Track A — Wie verifizieren wir „kein Banding mehr"?

| Option | Description | Selected |
|--------|-------------|----------|
| Render-Mode-Probe + visueller Smoketest (Recommended) | `__ttBeamerEffectiveRenderMode()` muss `webgl2` zurückgeben + manueller Visual-Test | ✓ |
| Pixel-Diff gegen Referenzbild | Headless-Screenshot pixel-diff | |
| Nur Render-Mode-Probe, kein Visual-Test | Schnellster Pfad | |

**User's choice:** Render-Mode-Probe + visueller Smoketest
**Notes:** Pixel-Diff explizit verworfen — Pflege-Aufwand zu hoch. Probe + manuelle visuelle Bestätigung am Gaming-PC.

---

## Track B — HTML routing

| Option | Description | Selected |
|--------|-------------|----------|
| Server-Route: /output/ → output.html, /output?ssr=1 → index.html | Server entscheidet anhand Query-Param | |
| Eine output.html, /output und /output?ssr=1 unterschiedlich gemounted | Mittelweg | |
| Pi-Browser auf /receive umleiten, /output bleibt SSR-Tab | Pfad-Trennung mit Pi-URL-Wechsel | |
| **Other:** Eventuell einen eigenen ssr pfad. /output/ ist nur noch für den thin client | User-defined: SSR-Tab bekommt eigenen Pfad, /output/ wird thin-only | ✓ |

**User's choice:** Eigener SSR-Pfad — /output/ ist nur noch für den thin client
**Notes:** Sauberste Trennung. Pi navigiert weiter zu `/output/` (URL bleibt für Pi unverändert). Der SSR-Render-Tab bekommt einen separaten Pfad. Folge-Frage zur konkreten URL.

---

## Welche URL soll der SSR-Tab bekommen?

| Option | Description | Selected |
|--------|-------------|----------|
| /ssr (Recommended) | Kurz, semantisch klar | ✓ |
| /output/ssr (kompatibler Nähepfad) | Im /output/-Namespace bleiben | |
| /render | Beschreibt explizit was passiert | |

**User's choice:** /ssr
**Notes:** `ssr-render-host.mjs:450` muss von `/output?ssr=1` auf `/ssr` umgestellt werden.

---

## Track A — Welcher konkrete Visual-Smoketest?

| Option | Description | Selected |
|--------|-------------|----------|
| Bekannte Banding-Animation am Gaming-PC, manuell visuell prüfen (Recommended) | Reproduzierbare solid-color Animation, User bestätigt visuell | ✓ |
| Mehrere typische Animationen (solid + gradient + GIF) | Erweiterter Smoketest | |
| Nur Render-Mode-Probe genügt | Backup-Variante | |

**User's choice:** Bekannte Banding-Animation am Gaming-PC, manuell visuell prüfen
**Notes:** Pi-UAT folgt später wenn Hardware verfügbar (Pattern aus Phase 33).

---

## Claude's Discretion

- Specific Chrome GPU-init flag set (D-01 force) — research proposes, planner decides.
- Renderer-detection probe implementation language (CDP from Node? In-page script? Both?).
- Exact name/path of the new thin HTML file (`output.html` at repo root? `src/output.html`? `public/output.html`?).
- Whether to keep `?ssr=1` as deprecation-redirect for one phase or hard-cut.
- Live-sync WebSocket "minimal subset" for audio-binders in thin `/output/` HTML.

## Deferred Ideas

- Pi-hardware visual UAT (deferred until Pi hardware accessible).
- VAAPI re-enable investigation (separate future phase).
- Pixel-diff visual regression suite (rejected for Phase 34, may revisit).
- Pi /output/ render-mode policy review (only relevant if Pi-side decode shows banding too).
- Live-sync WebSocket protocol slim-down (separate phase if A3 assumption fails).
