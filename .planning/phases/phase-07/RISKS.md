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

## R19 Start-Pfad mutiert Draft-UI und zerstoert Serien-Workflow
- Risiko: Nach Start einer room/cluster Animation springen Draft-Felder (`target`, `animation`, Slider) auf unerwuenschte Werte und brechen den Workflow fuer mehrere Raeume mit gleichen Einstellungen.
- Impact: Kritisch, P0 Operator-Blocker.
- Gegenmassnahme: Start-Handler strikt draft-immutable machen; Start darf nur Runtime/Pending/Ack aktualisieren, nie Draft-Controls.

## R20 Room-Click-Target-Autofill regressiert gegen Start-Side-Effects
- Risiko: Korrektes Room-Klick-Autofill wird durch Start-seitige Auto-Mutationen ueberlagert oder inkonsistent.
- Impact: Hoch bis kritisch.
- Gegenmassnahme: klare Invarianten + Regression: nur Room-Klick setzt auto `target`, Start bleibt side-effect-frei fuer Draft-UI (room+cluster parity).

## R21 Align-Mode driftet zwischen Clients
- Risiko: Align-Toggle wird lokal oder rolleninkonsistent angewendet; `/output/final` weicht vom Controller-Status ab.
- Impact: Kritisch, Kalibrierung/Operatorvertrauen brechen.
- Gegenmassnahme: Align-Mode als serverautoritative Context-Mutation mit Snapshot-Version-Gate, dedup und Cross-Client-Regression inkl. `/output/final`.

## R22 Board-Switch laesst Running-Reste des alten Boards stehen
- Risiko: Beim Kontextwechsel bleiben alte Running-Eintraege sichtbar/steuerbar und erzeugen fachlich falschen Laufzeitkontext.
- Impact: Kritisch, deterministic context integrity bricht.
- Gegenmassnahme: Board-Switch atomar an Running-Clear koppeln (serverseitig), clientseitig boardfremde Rehydrierung droppen, reconnect-no-residue Regression verpflichtend.

## R23 Board-Switch-Clear-Transaktion ist nicht strikt atomar
- Risiko: `selectedBoard` ist bereits umgeschaltet, waehrend Restzustand aus altem Board im selben Snapshot weiterlebt.
- Impact: Kritisch, Kontextkonsistenz bricht und Operator sieht fachlich ungueltigen Zwischenzustand.
- Gegenmassnahme: authoritative single-transaction commit fuer context-switch + running-clear mit idempotentem transaction guard und versionsgebundener Apply-Sichtbarkeit.

## R24 Server persistiert/broadcastet unsanitized cross-board Running-Snapshots
- Risiko: boardfremde Running-Eintraege werden serialisiert und spaeter ueber Polling/Reconnect erneut verteilt.
- Impact: Kritisch, Residue rehydrate trotz Switch-Clear moeglich.
- Gegenmassnahme: verpflichtender Snapshot-Sanitizer vor Persistenz/Broadcast sowie Residue-Zero-Invariant in Regression (`crossBoardResidueCount = 0`).

## R25 Stop-Action-Routing triggert Start-Side-Effects
- Risiko: Stop aus Running-Liste wird falsch geroutet und startet implizit eine neue Instanz (`animation.id` increment) statt bestehende zu beenden.
- Impact: Kritisch, P0 Regression im Safety-Pfad.
- Gegenmassnahme: strict stop-only routing (`stop-animation` by existing `animation.id`), serverseitiger Command-Classifier-Guard gegen create/start Side-Effects.

## R26 Stop-Propagation ist rolleninkonsistent
- Risiko: Stop ist lokal sichtbar, aber auf anderen Clients oder `/output/final` nicht deterministisch/appliziert.
- Impact: Kritisch, Multi-Client-Vertrauen und Bedienkonsistenz brechen.
- Gegenmassnahme: serverautoritativer stop commit mit versionsgebundenem Snapshot/Broadcast und obligatorischer multi-role parity regression.

## R27 Stop-UI erzeugt Doppel-Dispatch bei Mehrfachklick
- Risiko: schnelle Mehrfachklicks auf Stop senden redundante Commands, triggern Race-Conditions oder unerwuenschte Re-Trigger.
- Impact: Hoch bis kritisch.
- Gegenmassnahme: inflight pending lock/debounce pro run-id, idempotente stop mutation semantics, no double-dispatch assertions.

## R28 Global-Outside-Stop-Routing driftet gegen andere Scopes
- Risiko: Running-Stop fuer `global-outside` landet in Sonderpfaden (start/create/no-op) statt im kanonischen stop-only Pfad.
- Impact: Kritisch, Safety-Stop ist nicht scope-paritaetisch.
- Gegenmassnahme: expliziter routing parity guard fuer `global-outside` plus all-scope stop regression matrix (`room/global-inside/global-outside/cluster`).

## R29 Globale Stop-Semantik ist zwischen Server und Client inkonsistent
- Risiko: `global-inside`/`global-outside` werden unterschiedlich klassifiziert oder appliziert (ack/version/dedup drift), wodurch Stop partiell oder spaet sichtbar wird.
- Impact: Kritisch, deterministische Multi-Client-Stop-Propagation bricht.
- Gegenmassnahme: vereinheitlichter global-scope stop contract auf server/client (idempotent stale handling + identische snapshot apply semantics).

## R30 Running-List-Hover-Animation flackert unter Pointer-Interaktion
- Risiko: Hoverzustand in der Running-Liste blinkt/loopt statt stabil zu highlighten, wodurch Bedienvertrauen sinkt und Fehlklickrisiko steigt.
- Impact: Hoch (UX/P0 im Realbetrieb).
- Gegenmassnahme: Hover-CSS/animation state machine stabilisieren, flicker regression fuer Pointer enter/leave/reenter in Pflichtmatrix aufnehmen.

## R31 Start-Mutationen werden direkt nach Trigger neutralisiert
- Risiko: Start-Commands committen zwar, werden aber unmittelbar durch nachlaufende Kontext-/Statusmutationen ueberschrieben, sodass Animationen nicht laufen.
- Impact: Kritisch, P0 Betriebsblocker (Triggerpfad faktisch defekt).
- Gegenmassnahme: Root-Cause-Fix im Lifecycle-/Reducer-Arbitrationspfad; Start-Mutationen erhalten Vorrang vor Kontext-Info-Status und duerfen nicht sofort zurueckgesetzt werden.

## R32 `board switched` maskiert Start-/Running-Status
- Risiko: UI springt sofort auf `board switched` und verdeckt den eigentlichen Startstatus; Operator bewertet Trigger als fehlgeschlagen bzw. verliert Zustandsklarheit.
- Impact: Kritisch, Bedienfehler + Fehltrigger-Risiko.
- Gegenmassnahme: Status-Prioritaetsregeln explizit machen (`start/run > board switched info`) und mit deterministischer Status-Arbitration testen.

## R33 Lifecycle-Persistenz bricht fuer room/global/cluster nach Start
- Risiko: Runs werden implizit vorzeitig entfernt (ohne Timerablauf/Stop/Clear), besonders bei Multi-Client-Snapshot-Apply und Kontextevents.
- Impact: Kritisch, nahezu keine Animation verlaesslich triggerbar.
- Gegenmassnahme: Lifecycle-Guard auf explizite Endbedingungen beschraenken, all-scope start/stop persistence matrix inkl. `/output/final` + reconnect als Pflichtgate.

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

## New Hotfix Risk Focus (7-HF4)
- R19/R20 sind als P0-Risiken fuer den Realbetrieb priorisiert; Plan 7-HF4 mitigiert diese vor Plan 7-2 verbindlich.

## Execution Update 7-HF4
- R19 mitigated: room/cluster start no longer mutates draft UI fields; animation/target/slider controls stay stable after start.
- R20 mitigated: control snapshot polling no longer rewrites local draft controls from runtime roomDraft, preventing post-start jump regressions.

## New Hotfix Risk Focus (7-HF5)
- R21/R22 sind als P0-Risiken fuer den Realbetrieb priorisiert; Plan 7-HF5 mitigiert diese vor Plan 7-2 verbindlich.

## Execution Update 7-HF5
- R21 mitigated: align mode now follows a server-authoritative `context-update` snapshot lifecycle across all clients incl. `/output/final` with stale/equal-version drop guards.
- R22 mitigated: board switch now clears running atomically server-side and client apply blocks old-board running rehydration residues.

## New Hotfix Risk Focus (7-HF6)
- verify-work 7-HF5 follow-up zeigt verbleibende P0-Risiken in R23/R24; Plan 7-HF6 mitigiert diese vor Plan 7-2 verbindlich.

## Execution Update 7-HF6
- R23 mitigated: board-switch clear now uses an authoritative atomic context transaction with idempotent transaction guard, removing non-deterministic switch residue.
- R24 mitigated: snapshot sanitizer + reconnect board-context filtering prevent cross-board running rehydrate after switch/reconnect.

## New Hotfix Risk Focus (7-HF7)
- Neues Pflichtfeedback priorisiert R25/R26/R27 als P0-Risiken; Plan 7-HF7 mitigiert diese vor Plan 7-2 verbindlich.

## Execution Update 7-HF7
- R25 mitigated: stop action routing is strict stop-only (`stop-animation`) and cannot fall through to create/start side effects.
- R26 mitigated: server stop mutation acknowledges stale/unknown IDs idempotently and keeps cluster-linked stop lifecycle deterministic.
- R27 mitigated: stop propagation + UI inflight guards now keep room/global/cluster stop parity and prevent anim-id increment regressions across control + `/output/final`.

## New Hotfix Risk Focus (7-HF8)
- Neues Pflichtfeedback priorisiert R28/R29/R30 als P0-Risiken; Plan 7-HF8 mitigiert diese vor Plan 7-2 verbindlich.

## Risk Closure Update (7-HF8)
- R28 mitigated: `global-outside` stop route is now strictly stop-only and protected against start/create/no-op drift.
- R29 mitigated: global stop semantics for `global-inside`/`global-outside` are unified server/client with versioned idempotent handling.
- R30 mitigated: running-list hover interaction is stabilized and no longer flickers under periodic list refresh.

## New Hotfix Risk Focus (7-HF9)
- Neues Pflichtfeedback priorisiert R31/R32/R33 als P0-Risiken; Plan 7-HF9 mitigiert diese vor Plan 7-2 verbindlich.

## Risk Closure Update (7-HF9)
- R31 mitigated: start mutations are no longer neutralized by trailing context updates (`room-draft-sync`/`align-toggle` cannot mutate board context).
- R32 mitigated: `board switched` feedback is now contextual-only and no longer masks active start/running lifecycle feedback.
- R33 mitigated: all-scope run lifecycle persists deterministically until explicit stop/clear or timer expiry across multi-client polling and `/output/final` parity.
