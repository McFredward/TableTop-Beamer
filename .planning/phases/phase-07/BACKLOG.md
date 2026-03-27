# Phase 7 Backlog (Prepared)

## Epics
- Deterministic Event Contract
- Ordered Server Mutation Pipeline
- Deterministic Client Apply Engine
- Priority Stop/Toggle Control Path
- Final-Output Low-Latency Runtime Path
- GIF Trigger Latency Hardening
- End-to-End Telemetry and Tracing
- Sync Regression and Soak Hardening
- Compatibility and Non-Regression Guard
- Snapshot Polling Determinism Pivot
- Snapshot Trigger Determinism + Audio Consistency + Sequential Stagger
- Draft UI Immutability on Start
- Align-Mode Sync + Board-Switch Running-Clear Determinism
- Board-Context Residue Elimination Across Switch/Reconnect
- Stop-Action Routing Determinism + Multi-Role Stop Propagation

## Story Mapping
- P7-S1.1 Mutation envelope standardisieren (`mutationId`, `serverVersion`, `serverTimestamp`, `kind`, `scope`).
- P7-S1.2 Mutation classes definieren (`control-critical`, `state-sync`, `config-noisy`) inkl. Coalescing-Regeln.
- P7-S1.3 Ack-Vertrag praezisieren (`server-ack`, optional `client-apply-ack`) und Fehlercodes vereinheitlichen.

- P7-S2.1 Ordered ingest queue auf Server einfuehren (single authoritative commit order).
- P7-S2.2 Commit/Fanout als getrennte Stufen mit klaren Sequenzgrenzen umsetzen.
- P7-S2.3 Backpressure-Strategie einfuehren (bounded queues, overflow policy, observability hooks).
- P7-S2.4 Dedup/stale-drop auf Server absichern (idempotente Verarbeitung).

- P7-S3.1 Clientseitige version-aware apply engine implementieren (`appliedVersion`, stale-drop).
- P7-S3.2 Idempotente mutation apply guards je mutation kind absichern.
- P7-S3.3 Reconnect/Join replay mit snapshot+delta deterministisch integrieren.

- P7-S4.1 Priority path fuer `stop`, `toggle-off`, `clear-all` einziehen.
- P7-S4.2 Preemptive render/audio teardown ohne Restartefakte ausfuehren.
- P7-S4.3 Control-vs-noncritical fairness absichern, ohne starvation zu erzeugen.

- P7-S5.1 `/output/final` role path auf low-latency apply trimmen (no unnecessary UI work).
- P7-S5.2 Final-first scheduling bei fanout/apply aktivieren.
- P7-S5.3 Final-output fallback guards gegen white/no-op states bei Lastspitzen absichern.

- P7-S6.1 GIF prewarm/caching fuer haeufige room animations einfuehren.
- P7-S6.2 Decode scheduling und first-frame readiness optimieren.
- P7-S6.3 Trigger jitter unter burst conditions begrenzen.

- P7-S7.1 Telemetriepunkte entlang des kompletten latency path instrumentieren.
- P7-S7.2 P50/P95/P99 Latenzhistogramme pro Hop und pro Rolle auswertbar machen.
- P7-S7.3 Trace correlation ueber `mutationId` fuer root-cause debug bereitstellen.

- P7-S8.1 Regression matrix fuer deterministisches click/apply/stop Verhalten erstellen.
- P7-S8.2 Burst-/Soak-/Reconnect-Tests fuer ordering und backpressure erstellen.
- P7-S8.3 Zielwert-Compliance Reports als Pflichtartefakt dokumentieren.

- P7-S9.1 Non-regression matrix fuer room/cluster, align-mode, audio-role-routing, persistence pflegen.
- P7-S9.2 Rollout-Flag und safe fallback fuer stufenweise Aktivierung bereitstellen.
- P7-S9.3 Artefakt-Sync mit globalen Planungsdateien nach jeder Welle sicherstellen.

- P7-S10.1 Server-Snapshot-API mit monotoner `serverVersion` als kanonische Read-Quelle etablieren.
- P7-S10.2 Client-Sync auf adaptives Polling (120-250 ms) mit strict version-gated apply umstellen.
- P7-S10.3 Optimistische lokale Zielstates entfernen; UI zeigt nur serverbestaetigten Zustand plus optional pending-Indikator.
- P7-S10.4 WebSocket auf optionalen Wakeup-Hint reduzieren (`state-dirty`), ohne Korrektheitsabhaengigkeit.
- P7-S10.5 Telemetrie und Regression fuer Ghost-State-Elimination und Multi-Client-Versionstreue verpflichtend machen.

- P7-S11.1 Snapshot-Trigger-Revision fuer globale Effekte verbindlich einfuehren (einmaliger Vollstart pro neuer Revision).
- P7-S11.2 Explizites Stop-Gating umsetzen: vorzeitiger Abbruch nur bei Snapshot-Stop, keine impliziten Laufzeit-Teardowns.
- P7-S11.3 Audio-Determinismus angleichen: start/stop strikt an Snapshot-Revision, stale/replayed Audio strikt verwerfen.
- P7-S11.4 Telemetrie fuer Trigger-Lifecycle erweitern (`snapshotTriggerSeen`, `visualStart`, `audioStart`, `explicitStopApplied`).
- P7-S11.5 Cluster-Stagger auf sequenziellen Modus mit konfigurierbarem Offset (Slider in ms) umstellen.
- P7-S11.6 Non-regression fuer sequential stagger member-order + offset parity (sync/reconnect/multi-client) verpflichtend machen.

- P7-S12.1 Start-Operationen fuer room/cluster strikt draft-immutable machen (kein Auto-Reset von Animation/Target/Parametern).
- P7-S12.2 Room-Click-Autofill auf `target` als einzigen erlaubten Auto-Mutationspfad absichern (wie zuvor).
- P7-S12.3 Snapshot-/Polling-Apply von Draft-Controls entkoppeln, damit Runtime-Updates keine Draft-Felder ueberschreiben.
- P7-S12.4 Regression fuer Serienstarts mit identischen Einstellungen ergaenzen (room + cluster, Dropdown/Slider stabil).
- P7-S12.5 Artefakt-Sync fuer HF4 verpflichtend im selben Schritt abschliessen.

- P7-S13.1 Align-Mode-Toggle als serverautoritative Context-Mutation mit Version/Ack/Dedup absichern (kein lokales Optimismus-Toggle).
- P7-S13.2 Snapshot-Apply fuer Align-Mode auf allen Rollen vereinheitlichen, inklusive `/output/final` als Pflichtpfad.
- P7-S13.3 Board-Switch atomar an Running-Clear koppeln, damit alte Board-Runs deterministisch entfernt werden.
- P7-S13.4 Clientseitigen Board-Switch-Apply gegen Rehydrierung boardfremder Running-Eintraege haerten.
- P7-S13.5 Regression fuer Align-Roundtrip und Board-Switch-no-residue (3-4 Clients inkl. `/output/final`) verpflichtend machen.
- P7-S13.6 Artefakt-Sync fuer HF5 verpflichtend im selben Schritt abschliessen.

- P7-S14.1 Board-Switch-Clear als authoritative atomare Transaktion ausfuehren (`selectedBoard` + Running-Clear in derselben Commit-Version).
- P7-S14.2 Snapshot-Sanitizer vor Persist/Broadcast verpflichtend schalten, um boardfremde Running-Eintraege serverseitig strikt zu entfernen.
- P7-S14.3 Reconnect-/Join-Hydrierung auf aktiven Board-Kontext filtern; cross-board Running-Rehydrate deterministisch verwerfen.
- P7-S14.4 Deterministische Regression fuer `switch -> reconnect` mit harter Invariante `crossBoardResidueCount = 0` ueber 3-4 Clients inkl. `/output/final`.
- P7-S14.5 Evidenz + Artefakt-Sync fuer HF6 verpflichtend im selben Schritt abschliessen.

- P7-S15.1 Running-List-Stop strikt auf `stop-animation` fuer die bestehende `animation.id` routen; create/start-Side-Effects sind verboten.
- P7-S15.2 Serverseitigen Stop-Mutationspfad idempotent haerten: unknown/stale stop darf keinen Startpfad ausloesen.
- P7-S15.3 Snapshot/Broadcast-Propagation fuer Stop serverautoritativ versionieren und auf alle Rollen inkl. `/output/final` deterministisch replizieren.
- P7-S15.4 UI-Stop-Action-Guard einziehen: per-run pending lock/debounce gegen versehentliche Re-Trigger und Doppeldispatch.
- P7-S15.5 Regression-Matrix fuer room/global/cluster stop parity + anim-id non-increment invariant ueber 3-4 Clients verpflichtend machen.
- P7-S15.6 Evidenz + Artefakt-Sync fuer HF7 verpflichtend im selben Schritt abschliessen.

## Priorisierte erste Ausfuehrungswelle (P0) - Plan 7-1 execute-ready
- Story P7-S1.1 + P7-S1.2 + P7-S1.3.
  - Ziel: ein deterministischer, messbarer und idempotenter Event-Vertrag als gemeinsame Basis.
- Story P7-S2.1 + P7-S2.2 + P7-S2.3 + P7-S2.4.
  - Ziel: serverautoritiver ordered commit/fanout Pfad ohne burst drift.
- Story P7-S3.1 + P7-S3.2 + P7-S3.3.
  - Ziel: client apply bleibt first-click-deterministisch bei replay/reconnect.
- Story P7-S4.1 + P7-S4.2.
  - Ziel: stop/toggle-off reagieren sofort und raeumen visual/audio ohne Reste.
- Story P7-S5.1 + P7-S5.2.
  - Ziel: `/output/final` wird als low-latency Zielpfad priorisiert.
- Story P7-S6.1 + P7-S6.2.
  - Ziel: GIF room triggers starten spuerbar smoother und lag-aermer.
- Story P7-S7.1 + P7-S7.2 + P7-S7.3.
  - Ziel: Latenzpfad ist objektiv messbar und auf Mutationsebene nachvollziehbar.
- Story P7-S8.1 + P7-S8.2 + P7-S8.3 + P7-S9.1 + P7-S9.3.
  - Ziel: harte Regression- und non-regression Absicherung plus konsistente Artefaktlage.

## Nachgelagerte Wellen (vorlaeufig)
- Plan 7-HF1 Verification Integrity Hotfix (abgeschlossen): `hopsMs` verifier schema fix, behavior-level non-regression matrix expansion, evidence refresh, full artifact sync.
- Plan 7-HF2 Polling Determinism Hotfix (verpflichtend vor 7-2): server snapshots + adaptive polling + no-optimistic-state + optional WS wakeup hint.
- Plan 7-HF3 Trigger/Audio/Stagger Hotfix (verpflichtend vor 7-2): snapshot-trigger-once-full-run + explicit-stop-only + stale-audio-drop + sequential stagger offset slider.
- Plan 7-HF4 Draft-UI-Immutability Hotfix (verpflichtend vor 7-2): start darf keine Draft-Felder mutieren; room-click target-autofill bleibt als einziger Auto-Pfad.
- Plan 7-HF5 Align/Board-Switch Determinism Hotfix (verpflichtend vor 7-2): align-mode serverautoritativ ueber alle Clients inkl. `/output/final`; board-switch leert Running deterministisch ohne Alt-Reste.
- Plan 7-HF6 Board-Context Residue Elimination Hotfix (verpflichtend vor 7-2): authoritative atomic switch-clear transaction, server snapshot sanitization vor persist/broadcast, reconnect board-context filtering, residue=0 regression.
- Plan 7-HF7 Stop Routing + Deterministic Stop Propagation Hotfix (verpflichtend vor 7-2): stop-action darf keine create/start side-effects ausloesen; stop commit ist serverautoritativ/idempotent mit multi-role parity inkl. `/output/final`.
- Plan 7-2 Hardening: adaptive coalescing tuning, fairness tuning, long-run soak stabilization (nach 7-HF7).
- Plan 7-3 Production Gate: stricter SLO compliance window, operator sign-off im Realsetup.

## Execution Update 7-1
- Stories P7-S1..P7-S9 for the initial wave were implemented in code paths `server.mjs` and `src/app.js` with dedicated regression and report artifacts (`P7-T12..P7-T14`).

## Execution Update 7-HF1
- Verification Integrity Hotfix is closed: `hopsMs` schema verifier fix shipped, behavior-level non-regression matrix became executable, and PASS evidence artifacts were regenerated and synced.

## New Mandatory Wave
- Plan 7-HF2 ist als execute-ready P0-Hotfix gesetzt, um Realbetriebsprobleme (sporadische Aktionen, Ghost-States) ueber serverautoritative Snapshot-Polling-Semantik deterministisch zu schliessen.

## Execution Update 7-HF2
- P7-S10.1 implemented: canonical snapshot-read endpoint `/api/live/snapshot` with monotonic version/timestamp semantics.
- P7-S10.2 implemented: client sync loop now uses adaptive polling (fast ~120ms, idle ~250ms, error backoff with jitter + recovery).
- P7-S10.3 implemented: command-write path `/api/live/command` plus pending-until-snapshot UI behavior (no optimistic runtime apply).
- P7-S10.4 implemented: WebSocket reduced to optional wake hint (`state-dirty`) with no correctness dependency.
- P7-S10.5 implemented: telemetry gates + 4-client regression evidence refreshed (`debug/p7-hf2-*`).

## New Mandatory Wave
- Plan 7-HF3 ist als execute-ready P0-Hotfix gesetzt, um globale Trigger-Laufzeitinkonsistenz, sporadische/alte Audio-Trigger und randomisierte Stagger-Start-Drift deterministisch zu schliessen.

## Execution Update 7-HF3
- P7-S11.1 + P7-S11.2 implemented: global effects now use snapshot trigger/stop lifecycle revisions with once-per-revision replay and explicit-stop-only teardown.
- P7-S11.3 implemented: audio start/stop is tied to trigger revision with stale replay drop guards.
- P7-S11.5 implemented: cluster stagger now runs in deterministic sequential order with configurable offset milliseconds.
- P7-S11.6 implemented: HF3 regression evidence confirms trigger duration parity, explicit stop parity, and stagger offset parity across 4 polling clients.

## Next Wave
- Plan 7-HF4 ist als naechste P0-Hotfix-Welle gesetzt; Plan 7-2 bleibt bis HF4-Gate PASS blockiert.

## Execution Update 7-HF4
- P7-S12.1 implemented: room/cluster start path is draft-immutable (no implicit reset of animation/target/sliders on start).
- P7-S12.2 implemented: draft start guard restores immutable draft fields if any start-side setter drift appears.
- P7-S12.3 implemented: room-click target autofill remains target-only (`targetType=room`, `targetId=<clickedRoomId>`), while start remains side-effect-free.
- P7-S12.4 implemented: control snapshot apply ignores `runtime.roomDraft`, preventing polling/runtime overwrite of local draft dropdown/slider state.
- P7-S12.5 + P7-S12.6 implemented: regression/non-regression matrices now include multi-start same-settings, no-jump checks, and room/cluster target stability evidence (`debug/p7-hf4-*`).

## Gate Closure
- Plan 7-HF4 is PASS; der Draft-Immutability-Blocker ist geschlossen.

## Execution Update 7-HF5
- P7-S13.1 implemented: align toggle now uses server-authoritative `context-update` command flow with ack/version/dedup and no local optimistic state.
- P7-S13.2 + P7-S13.3 implemented: align snapshot apply parity incl. `/output/final` and strict stale/equal-version reject in poll + reconnect paths.
- P7-S13.4 + P7-S13.5 implemented: board-switch context update clears running atomically server-side and client apply blocks old-board running rehydration.
- P7-S13.6 implemented: regression/non-regression evidence now covers align ON/OFF roundtrip, board-switch running-empty matrix, and reconnect parity (`debug/p7-hf5-*`).

## Gate Closure
- Plan 7-HF5 is PASS; Plan 7-2 is unblocked.

## New Blocking Wave
- verify-work 7-HF5 follow-up zeigt zwei verbleibende P0-Blocker (nicht-deterministischer switch-clear, reconnect cross-board residue rehydrate).
- Plan 7-HF6 ist als execute-ready P0-Welle gesetzt und blockiert Plan 7-2 bis zum Residue-Elimination-PASS.

## Execution Update 7-HF6
- P7-S14.1 implemented: board-switch context commits now execute as authoritative atomic switch-clear transactions with idempotent `contextSwitchTransactionId` guards.
- P7-S14.2 implemented: server snapshot sanitizer now runs before persist/broadcast and drops all running entries outside `selectedBoard`.
- P7-S14.3 implemented: reconnect/join hydration keeps a strict board-context running filter; foreign-board rehydrate payloads are rejected.
- P7-S14.4 implemented: deterministic regression matrix now enforces `switch -> reconnect -> crossBoardResidueCount = 0` across 4 polling clients including `/output/final`.
- P7-S14.5 implemented: HF6 evidence artifacts synced (`debug/p7-hf6-t12-output.json`, `debug/p7-hf6-t13-output.json`, `debug/p7-hf6-t14-output.json`).

## Gate Closure
- Plan 7-HF6 is PASS; the Board-Context Residue Elimination blocker is closed and Plan 7-2 is unblocked.

## New Blocking Wave
- Neues verpflichtendes Feedback meldet einen P0-Regression-Blocker: Running-List-Stop triggert in Randfaellen neue Instanzen (`animation.id` increment) statt bestehende Runs zu stoppen.
- Plan 7-HF7 ist als execute-ready P0-Welle gesetzt und blockiert Plan 7-2 bis zum Stop-Determinism-PASS.

## Execution Update 7-HF7
- P7-S15.1 implemented: running-list stop routing is strict `stop-animation` only with no trigger/create side-effects.
- P7-S15.2 implemented: server stop mutation is idempotent for stale/unknown IDs and reconciles cluster-linked stop semantics safely.
- P7-S15.3 implemented: stop/clear `live-session-update` snapshots are applied immediately for deterministic multi-client parity including `/output/final`.
- P7-S15.4 implemented: UI inflight guard adds per-animation pending locks and disables stop controls while stop is awaiting snapshot confirmation.
- P7-S15.5 + P7-S15.6 implemented: regression/evidence matrix confirms room/global/cluster stop parity with anim-id non-increment invariant (`debug/p7-hf7-t12-output.json`, `debug/p7-hf7-t13-output.json`, `debug/p7-hf7-t14-output.json`).

## Gate Closure
- Plan 7-HF7 is PASS; Plan 7-2 remains the next hardening wave.
