# Phase 7 Risks

## R1 Out-of-order apply trotz versionierter Events
- Risiko: Events werden auf Clients in falscher Reihenfolge angewendet und erzeugen Drift.
- Impact: Kritisch, Determinismus bricht.
- Gegenmassnahme: servermonotone Version + client stale-drop + verpflichtende ordering tests.

## R2 Duplicate mutations erzeugen Doppelwirkung
- Risiko: reconnect/retry fuehrt zu doppeltem Start/Stop/Toggle.
- Impact: Kritisch, second-click/noise Effekte.
- Gegenmassnahme: dedup keys (`mutationId`) auf Server und Client, idempotent apply.

## R3 Priority control path wird durch backlog blockiert
- Risiko: stop/toggle-off wartet hinter nicht-kritischen Updates.
- Impact: Kritisch, haengende visual/audio Reste.
- Gegenmassnahme: preemptive priority queue fuer control-critical mutations.

## R4 Backpressure fehlt oder ist falsch kalibriert
- Risiko: queue growth erzeugt Latenzspitzen und Memory-Druck.
- Impact: Hoch bis kritisch bei Burst.
- Gegenmassnahme: bounded queues, overflow policy, observability und soak validation.

## R5 Ueberaggressives Coalescing veraendert Semantik
- Risiko: wichtige Zwischenzustaende oder Kontrollereignisse werden unzulaessig zusammengelegt.
- Impact: Kritisch, fachlich falsches Verhalten.
- Gegenmassnahme: coalescing nur fuer explizit erlaubte Klassen; harte Verbotsliste fuer start/stop/toggle.

## R6 `/output/final` bleibt hinter Controller-Latenz zurueck
- Risiko: final-output erhaelt/applied Events spaeter als Controller.
- Impact: Kritisch fuer Realbetrieb.
- Gegenmassnahme: final-first fanout/apply scheduling und eigene latency KPIs pro Rolle.

## R7 Stop-Pfad raeumt Audio nicht deterministisch auf
- Risiko: audio tails oder race mit loop lifecycle bleiben hoerbar.
- Impact: Hoch.
- Gegenmassnahme: hard-stop contract fuer control-critical stop events plus audio teardown tests.

## R8 GIF cold-start verursacht Trigger-Lags
- Risiko: decode/init blockiert first frame.
- Impact: Hoch, subjektiv hakeliger room trigger.
- Gegenmassnahme: prewarm/caching + decode readiness checks + first-frame telemetry.

## R9 Telemetrie erzeugt selbst Performance-Overhead
- Risiko: tracing kostet zu viel und verfalscht Latenz.
- Impact: Mittel bis hoch.
- Gegenmassnahme: sampling/aggregation, lightweight markers, async export.

## R10 Reconnect replay schreibt stale Zwischenzustaende sichtbar
- Risiko: kurze falsche Zustandsblitze bei join/reconnect.
- Impact: Hoch.
- Gegenmassnahme: snapshot version gate + delta replay only above baseline version.

## R11 Non-regression fuer Cluster/Align/Persistence bricht durch Sync-Rework
- Risiko: Sync-Fixes brechen etablierte Phase-5/6 Features.
- Impact: Kritisch.
- Gegenmassnahme: verpflichtende non-regression matrix als gate vor jeder Wellenfreigabe.

## R12 Zielwerte werden ohne reproduzierbare Evidenz behauptet
- Risiko: subjektiv besser, aber ohne belastbare Daten.
- Impact: Hoch, keine sichere Abnahme.
- Gegenmassnahme: bindender latency compliance report (P50/P95/P99 pro Hop/Rolle).

## Execution Update 7-1
- R3/R4/R5 mitigations were implemented via bounded multi-lane queue + controlled coalescing.
- R6/R7 mitigations were implemented via final-first fanout and priority stop teardown paths.
- R12 mitigation is in place with telemetry endpoint and latency report script; live run evidence remains required for production SLO sign-off.
