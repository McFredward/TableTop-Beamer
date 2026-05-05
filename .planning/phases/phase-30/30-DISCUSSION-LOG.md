# Phase 30: Render-Stability Regressions Closure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or
> execution agents. Decisions are captured in CONTEXT.md — this log preserves
> the alternatives considered.

**Date:** 2026-05-05
**Phase:** 30-render-stability-regressions-closure
**Areas discussed:** B1 Seam-Strategie, B2 Pi-GIF-Strategie, B3 Overlay-Sync-Strategie

---

## Topic Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Wave-Struktur | 3 Plans vs. 1 Plan vs. hotfix-style Serie | |
| B1 Seam-Strategie | Phase-26-h9 GL-Fix noch da; Regression liegt am 2D-Pfad oder neuen Mesh-Warp | ✓ |
| B2 Pi-GIF-Strategie | Phase-28-B5 ?v=<hash> URL-Hypothese; warm-cache-key-mismatch | ✓ |
| B3 Overlay-Sync-Strategie | applyGlobalDefaultsPayloadToState; /output/-Pipeline-Pfad | ✓ |

**User's choice:** B1 + B2 + B3 (Wave-Struktur entschied Claude → 3 separate
Plans; siehe D-00 in CONTEXT.md).

---

## B1 — Seams in Animations

### Q1: Welcher Render-Mode läuft auf Pi /output/ aktuell beim Test?

| Option | Description | Selected |
|--------|-------------|----------|
| auto (= GL on Pi) | render-mode 'auto'; GL gewählt | |
| Weiß ich nicht sicher | Researcher prüft im Investigation-Step | |
| explicit 2d | Mode-Toggle steht auf 2d | |
| explicit gl | Mode-Toggle steht auf gl | |

**User's choice (free-text):** "Tritt bei beiden Modi auf. Wegen dem bug das
das system overlay nicht mehr angezeigt wird im /output/ mode kann ich das
nicht mit sicherheit sagen was der pi gerade nutzt."

**Notes:** Wichtige Implikation — User sieht Seams in BEIDEN Render-Modi
(2D + GL), und kann den aktuellen Mode auf Pi /output/ nicht eindeutig
bestätigen, weil das Diagnostic-Overlay (= B3) dort kaputt ist. Daraus folgt:
B3 muss vor B1 gefixt werden, damit der Mode-Readout für B1-Diagnose
verfügbar ist (D-00 Reihenfolge).

### Q2: Soll der Fix beide Render-Pfade (2D + GL) abdecken?

| Option | Description | Selected |
|--------|-------------|----------|
| Beide Pfade (Recommended) | Beide Render-Modes müssen seam-frei sein | ✓ |
| Nur Default-Pfad | Nur den auf Pi tatsächlich aktiven Mode fixen | |
| Bevorzugte Lösung weiß ich noch nicht | Researcher analysiert beide; Claude entscheidet | |

**User's choice:** Beide Pfade (Recommended).

### Q3: Darf der Fix in den Phase-27-W4 Mesh-Warp-Code eingreifen?

| Option | Description | Selected |
|--------|-------------|----------|
| Ja — minimal-invasiv (Recommended) | Sub-pixel rounding / snap-to-integer; Phase-27-Verhalten invariant | |
| Ja — freie Hand | Researcher/Planner darf Mesh-Warp-Pfad größer refactoren | ✓ |
| Nein — nur Renderer-Stack-Tweaks | Mesh-Warp unangetastet | |

**User's choice:** Ja — freie Hand.

**Notes:** Erlaubt strukturelle Lösungen wie Mesh-Warp-Konsolidierung
zwischen 2D und GL, falls Researcher das als sauberer einschätzt.

### Q4: Brauchen wir einen automatisierten Regression-Backstop für Seams?

| Option | Description | Selected |
|--------|-------------|----------|
| Headless render-snapshot diff | Node-Test rendert + vergleicht Pixel | |
| Manueller UAT only (Recommended) | Sichtprüfung User-side auf Pi | ✓ |
| Beides | UAT diese Runde + headless diff deferred | |

**User's choice:** Manueller UAT only (Recommended).

---

## B2 — GIF Reliability on Pi /output/

### Q1: Phase-28-B5 ?v=<hash>-Hypothese gezielt zuerst prüfen?

| Option | Description | Selected |
|--------|-------------|----------|
| Ja — erst Hypothese prüfen (Recommended) | ~1h Hypothese; bestätigt → minimaler Fix; sonst breit | ✓ |
| Nein — breit re-investigieren | Komplette GIF-Pipeline ohne Vorannahme | |
| Beides parallel | Hypothese + breite Analyse parallel | |

**User's choice:** Ja — erst Hypothese prüfen.

### Q2: "Reload bringt einige, andere brechen": separat oder selbe Root-Cause?

| Option | Description | Selected |
|--------|-------------|----------|
| Selbe Root-Cause vermuten (Recommended) | Memory-/Decode-Slot-Pressure | ✓ |
| Separate Root-Cause | Eigener Pfad (teardown/cleanup leak) | |

**User's choice:** Selbe Root-Cause vermuten.

### Q3: Determinismus-Garantie auf Pi /output/?

| Option | Description | Selected |
|--------|-------------|----------|
| Eventual: warmen + retry (Recommended) | Async warm; Pi rendert sofort, GIFs erscheinen sobald ready | ✓ |
| Strict: blockieren bis decoded | Initial-Black-Screen bis alle GIFs ready | |
| Hybrid | Erste-Trigger-GIF blockierend, Rest async | |

**User's choice:** Eventual: warmen + retry.

### Q4: Automatisierter Regression-Backstop für GIF-Reliability?

| Option | Description | Selected |
|--------|-------------|----------|
| Manueller UAT auf Pi (Recommended) | Test bleibt User-side auf Pi-Hardware | ✓ |
| Decode-Counter Unit-Test | Node-Test prüft warm + decode URL-Form-Konsistenz | |
| Beides | Pi-UAT + decode-counter test | |

**User's choice:** Manueller UAT auf Pi.

---

## B3 — Diagnostic Overlay Live-Sync to /output/

### Q1: Toggle-Roundtrip prüfen — was zeigt Dashboard nach Reload?

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle bleibt aktiv nach Reload | Server-write OK; Regression im /output/-Apply | |
| Toggle springt auf 'off' zurück | Server-write nicht persistiert | |
| Weiß ich nicht / soll Researcher prüfen (Recommended) | Researcher macht Roundtrip-Smoke first | ✓ |

**User's choice:** Weiß ich nicht / soll Researcher prüfen.

### Q2: Investigations-Pfad?

| Option | Description | Selected |
|--------|-------------|----------|
| Top-down / End-to-End (Recommended) | Dashboard → Server → Broadcast → /output/-Apply → DOM/CSS | ✓ |
| /output/-Apply-Side fokussiert | Direkt /output/-side debuggen | |

**User's choice:** Top-down / End-to-End.

### Q3: Akzeptanzlatenz für Toggle → /output/-Sichtbarkeit?

| Option | Description | Selected |
|--------|-------------|----------|
| WS-Broadcast-Latenz (~100ms) (Recommended) | Identisch zum Phase-28-B6-Vertrag | ✓ |
| Polling-Cadence (~200ms+) | Live-sync polling-tick reicht | |
| Sofort-sichtbar < 50ms | Force-render direkt nach apply | |

**User's choice:** WS-Broadcast-Latenz (~100ms).

### Q4: Automatisierter Backstop?

| Option | Description | Selected |
|--------|-------------|----------|
| Manueller UAT (Recommended) | Sichtprüfung im Browser | ✓ |
| Server-State-Roundtrip-Test | Node-Test gegen POST /api/global-defaults | |
| Beides | UAT + Roundtrip-Unit-Test | |

**User's choice:** Manueller UAT.

---

## Claude's Discretion

- Wave-Struktur: 3 Plans, B3 → B1 → B2 sequenziell (D-00).
- Plan-Reihenfolge B1 vs. B2 nach B3 (D-13).
- B1 Sub-Plan-Aufteilung falls Mesh-Refactor sinnvoll (D-14).
- B2 Hash-Resolver-Form (D-15).
- B3 Apply-Pfad-Strukturierung (D-16).

## Deferred Ideas

- Multi-Board Regression-Coverage (Phase 30 ist Single-Board / Nemesis Lockdown
  Board A).
- Render-Mode Auto-Fallback bei Seam-Detection.
- Headless Pixel-Diff Test-Infrastruktur.
- Asset-Versions-History / -Undo (aus Phase 28 deferred, bleibt deferred).
- Auto-Fallback 2D ↔ GL bei Performance-Drops auf Pi.
