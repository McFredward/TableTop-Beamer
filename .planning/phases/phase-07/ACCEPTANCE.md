# Phase 7 Acceptance

## Regression- und Verifikationsstrategie
- Determinism-first: Ordering, dedup und stale-drop sind vor Performance-Tuning verbindlich korrekt.
- Latency-first: Optimierung wird entlang des echten E2E-Pfads gemessen, nicht nur lokal im Controller.
- Final-output-first: `/output/final` wird als prioritaerer Low-Latency-Consumer verifiziert.
- Stop-integrity-first: `stop/toggle-off/clear-all` duerfen keine visuellen oder audio Reste hinterlassen.
- Evidence-first: jedes Latenz-/Determinismusziel benoetigt reproduzierbare Telemetrie/Trace-Evidenz.
- Non-regression-duty: room/cluster, align-mode, audio-role-routing, persistence bleiben stabil.

## Zielwerte (SLO fuer Phase 7)
- E2E input-to-final-apply: P50 <= 90 ms, P95 <= 180 ms, P99 <= 280 ms.
- Stop-to-audio-silence: P95 <= 120 ms.
- Stop-to-visual-clear: P95 <= 150 ms.
- GIF trigger-to-first-frame on final: P95 <= 220 ms.
- Determinism: keine second-click-required defects, keine stale apply incidents in Pflichtmatrix.

## Testplan (Pflichtmatrix)
- Mutation-Envelope-Contract-Test: alle relevanten Live-Mutationen tragen `mutationId` + `serverVersion` + Zeitmarker.
- Server-Ordering-Test: unter Burst bleibt commit-Reihenfolge monoton und global konsistent.
- Server-Dedup-Test: duplicate mutation IDs werden bestaetigt, aber nicht doppelt angewendet.
- Server-Backpressure-Test: Queue bleibt bounded, Overflow wird kontrolliert behandelt, kein unendliches backlog.

- Client-Stale-Drop-Test: out-of-order Events werden verworfen, final state bleibt deterministic last-write.
- Client-Idempotent-Apply-Test: erneuter Empfang derselben Mutation erzeugt keine sichtbare Doppelwirkung.
- Reconnect-Replay-Determinism-Test: Snapshot+Delta Replay liefert denselben Endzustand ohne Flackern/Drift.

- Priority-Stop-Preemption-Test: `stop/toggle-off/clear-all` preempten nicht-kritische Updates.
- Stop-Visual-Clear-Test: nach Stop verbleibt kein haengender Effekt auf `/output/final`.
- Stop-Audio-Hardcut-Test: nach Stop verbleibt kein Restaudio ausser explizit modellierter Fade.

- Final-Low-Latency-Path-Test: `/output/final` zeigt gleiches Commit frueher/gleich schnell wie Controller-Pfade.
- Final-First-Fanout-Test: fanout scheduling bevorzugt `/output/final` ohne Konsistenzverlust.

- GIF-Prewarm-Readiness-Test: trigger-haeufige room GIFs sind decode-ready und starten ohne kalten Lag.
- GIF-First-Frame-Latency-Test: trigger-to-first-frame bleibt im P95-Zielbereich.

- Telemetry-Correlation-Test: pro Mutation ist Timeline ingest->commit->fanout->receive->apply->render/audio nachverfolgbar.
- Latency-Report-Completeness-Test: P50/P95/P99 sind pro Hop und pro Rolle auswertbar.

- Room-Cluster-Non-Regression-Test: Cluster fanout/edit/stop bleiben deterministisch und konsistent.
- Align-Mode-Non-Regression-Test: Align-Overlay-Verhalten bleibt unveraendert korrekt.
- Audio-Role-Routing-Non-Regression-Test: audio-role-routing bleibt strikt (`final-output` hoerbar, control stumm).
- Persistence-Non-Regression-Test: save/reload/restart verhalten bleibt unveraendert stabil.

## Inkrementelle Pflicht-Gates
- Nach P7-T1: Event-Vertrag ist kanonisch dokumentiert und fuer Implementierung bindend.
- Nach P7-T2..P7-T4: Server pipeline ist ordered, bounded und dedup-stabil unter Burst.
- Nach P7-T5..P7-T6: Client apply/replay ist version-aware und deterministisch.
- Nach P7-T7..P7-T8: stop/toggle-off/clear-all reagieren sofort ohne Restartefakte.
- Nach P7-T9..P7-T10: `/output/final` low-latency path und GIF responsiveness sind messbar verbessert.
- Nach P7-T11..P7-T12: Telemetrie + Regression-Suite liefern belastbare Determinismus-/Latenznachweise.
- Nach P7-T13..P7-T15: Non-regression ist PASS und alle Artefakte/globalen Tracking-Dateien sind synchron.

## Definition of Done
- Plan 7-1 P0-Tasks P7-T1..P7-T15 sind abgeschlossen.
- End-to-end Latenzziele sind mit Telemetrie evidenzbasiert erreicht oder mit klarer Restabweichung dokumentiert und akzeptiert.
- Deterministisches first-click Verhalten gilt fuer apply/start/stop auf allen Rollen.
- `/output/final` reagiert priorisiert und zeigt keine stop/toggle Reste.
- Event-Pipeline ist robust gegen duplicate, stale, reconnect und burst pressure.
- Keine Regression in room/cluster, align-mode, audio-role-routing, persistence.
- Phase-7-Artefakte sowie `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/CURRENT_PHASE.md` sind konsistent aktualisiert.

## Execution Update 7-1
- Instrumentation endpoints/scripts available:
  - `/api/live/telemetry`
  - `debug/p7-t12-sync-regression.mjs`
  - `debug/p7-t13-non-regression.mjs`
  - `debug/p7-t14-latency-report.mjs`
