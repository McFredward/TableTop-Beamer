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

## R13 Optimistische Client-States erzeugen Ghost-States
- Risiko: UI zeigt lokal angenommene Endzustaende, die serverseitig nie committed wurden.
- Impact: Kritisch, fachlich falsches Verhalten und Vertrauensverlust.
- Gegenmassnahme: optimistic apply entfernen; sichtbarer Zustand kommt nur aus serverseitigem Snapshot mit Version-Gate.

## R14 Polling-Intervall ist falsch kalibriert
- Risiko: zu langsam wirkt laggy, zu schnell erzeugt unnoetige Last/Jitter.
- Impact: Hoch.
- Gegenmassnahme: adaptives Polling 120-250 ms, visibility-aware cadence, Backoff/Jitter bei Fehlern, Telemetriegestuetztes Tuning.

## R15 WebSocket wird versehentlich wieder Korrektheitsquelle
- Risiko: Hint-Pfad und Korrektheits-Pfad vermischen sich, wodurch Ausfaelle wieder Inkonsistenzen erzeugen.
- Impact: Hoch bis kritisch.
- Gegenmassnahme: WS strikt als optionalen Wakeup-Hint kapseln; Snapshot-Polling bleibt alleiniger Korrektheitspfad.

## R16 Snapshot-Trigger wird lokal zu frueh beendet
- Risiko: globaler Effekt startet zwar, wird auf einzelnen Clients aber nach ~1s lokal beendet obwohl kein Stop im Snapshot steht.
- Impact: Kritisch, client-uebergreifende Inkonsistenz.
- Gegenmassnahme: trigger-revision-basierter Vollstart + explicit-stop-only lifecycle (kein implizites timeout/cleanup ohne Snapshot-Stop).

## R17 Audio-Replay/Alt-Sound-Nachlauf
- Risiko: Audio startet sporadisch nicht oder spaeter fuer alte Trigger-Revisionen nach und erzeugt falschen Laufzeitkontext.
- Impact: Kritisch fuer Operatorvertrauen und Wahrnehmung.
- Gegenmassnahme: audio dedup by trigger revision + strict stale-drop + snapshot-stop-gated teardown.

## R18 Random-Stagger erzeugt nicht reproduzierbare Cluster-Latenz
- Risiko: zufaelliger Member-Versatz macht Timing/Debugging inkonsistent und erschwert reproduzierbare Abnahme.
- Impact: Hoch.
- Gegenmassnahme: sequenzieller stagger mode mit konfigurierbarem Offset (ms), deterministische member-order und replizierte Persistenz.

## Execution Update 7-1
- R3/R4/R5 mitigations were implemented via bounded multi-lane queue + controlled coalescing.
- R6/R7 mitigations were implemented via final-first fanout and priority stop teardown paths.
- R12 mitigation is in place with telemetry endpoint and latency report script; live run evidence remains required for production SLO sign-off.

## Execution Update 7-HF1
- Verify integrity risk was closed: telemetry verifier no longer accepts non-canonical `hops` schema and now rejects missing `hopsMs` explicitly.
- Non-regression drift risk (R11) was reduced by executable behavior-matrix checks for room/cluster/align/audio-role/persistence plus reload/rejoin parity.

## New Hotfix Risk Focus (7-HF2)
- R13/R14/R15 sind als P0-Risiken fuer den Realbetrieb priorisiert; Plan 7-HF2 mitigiert diese vor Plan 7-2 verbindlich.

## Execution Update 7-HF2
- R13 mitigated: optimistic runtime apply removed from control-command path; runtime visibility now snapshot-authoritative.
- R14 mitigated: adaptive polling cadence with recovery/backoff is active and validated in HF2 evidence.
- R15 mitigated: WS stream now acts as optional `state-dirty` wake hint only; correctness remains polling + version-gate.

## New Hotfix Risk Focus (7-HF3)
- R16/R17/R18 sind als P0-Risiken fuer den Realbetrieb priorisiert; Plan 7-HF3 mitigiert diese vor Plan 7-2 verbindlich.

## Execution Update 7-HF3
- R16 mitigated: global snapshot triggers now run once per trigger revision with full-duration replay and no implicit pre-stop cleanup.
- R17 mitigated: audio lifecycle is revision-aware with stale replay drop and explicit-stop-gated teardown.
- R18 mitigated: cluster stagger start uses deterministic member order with configurable offset parity replicated in server snapshot state.
