# Phase 7 Plan (Prepared)

## Zielbild
Phase 7 fokussiert einen umfassenden Umbau der Multi-Device-Synchronisation auf messbar niedrige End-to-End-Latenz und deterministische Sofortreaktion. Aktionen aus Controller-Clients (insbesondere Handy) sollen ohne wahrnehmbare Verzoegerung ueber den Server auf alle verbundenen Clients replizieren und unmittelbar im Render-/Audio-Pfad angewendet werden. Der kritische Pfad fuer `/output/final` wird dabei priorisiert: minimale UI-Overheads, fruehes Apply, stabile Stop-Semantik und robustes Verhalten unter Burst-Input. Ergebnis ist ein first-click-stabiler Betrieb ohne Nachtrigger, ohne haengende visuelle/audio-Reste und ohne Lag-Spitzen bei GIF-Room-Animationen.

## Trigger aus Realtest (verbindlich)
- Handy-Aktionen kommen auf `/output/final` teils verzoegert an.
- Stop/Toggle (`global alarm off` etc.) hinterlaesst kurz sicht-/hoerbare Reste.
- GIF-Room-Animationen triggern teils mit spuerbaren Lags.
- Erwartung ist sofortige, deterministische Reaktion auf allen Clients, besonders auf `/output/final`.

## Verbindliche Architekturentscheidungen
- Server bleibt kanonische Autoritaet fuer Live-Mutationen, Reihenfolge und Commit-Zeitpunkt.
- Jede relevante Live-Mutation traegt `mutationId`, monotone `serverVersion` und `serverTimestamp`.
- Event-Pipeline trennt klar in `ingest -> order -> commit -> fanout -> apply-ack` statt impliziter Snapshot-Overwrites.
- Deterministisches Ordering ist verpflichtend: stale/out-of-order Events werden verworfen, nicht best effort angewendet.
- Dedup ist verpflichtend auf Server und Client (`mutationId`/`appliedVersion`) zur Vermeidung von Doppel-Apply.
- `Stop`/`Toggle-Off` sind high-priority control mutations mit Preemption gegen langsame Renderpfade.
- `/output/final` nutzt einen low-latency apply path ohne nicht notwendige Controller-UI-Arbeit.
- Renderpfad priorisiert final-output fuer sofortige visuelle Wirkung; Audio-Stop wird hard-cut faehig (kein Tail-Leak ohne expliziten Fade).
- GIF-Startpfad ist prewarmed (decode/cache readiness), damit Trigger nicht am Decoder-Start blockieren.
- Backpressure ist explizit: bounded queues, coalescing fuer redundante Updates, kein unendliches backlog growth.
- Ack-Vertrag ist zweistufig: `server-ack` (commit bestaetigt) und optional `client-apply-ack` fuer Telemetrie.
- Coalescing ist nur fuer semantisch sichere Klassen erlaubt (z. B. wiederholte slider-like updates), niemals fuer `start/stop/toggle` Kontrollereignisse.
- Join/Reconnect nutzt versioniertes Snapshot + delta replay; apply darf keine bereits obsolete Zwischenzustaende sichtbar machen.
- Telemetrie ist first-class Bestandteil der Laufzeit (ingest/apply/render/audio markers, per-client latency histograms).
- Regression-Guard ist verpflichtend fuer room/cluster, align-mode, audio-role-routing und persistence.

## Scope
- End-to-end Sync-Latenz entlang `input -> server -> all clients -> render/apply` reduzieren und stabilisieren.
- Deterministisches first-click Apply/Stop ohne zweiten Klick und ohne Restartefakte liefern.
- Event-Pipeline mit ordering, ack, dedup, backpressure und gezieltem batching/coalescing haerten.
- Low-latency Runtime-Pfad fuer `/output/final` umsetzen (render/audio-first, keine vermeidbaren UI-Kosten).
- GIF-Room-Triggerpfad auf geringe Startlatenz optimieren (preload/decode-guard/scheduling).
- Tracing/Telemetrie fuer Latenzpfad implementieren (Mutation-Timeline pro Hop, P50/P95/P99).
- Regression-Suite fuer Sync-Determinismus und Performance einfuehren (single-click, burst, reconnect, soak).

## Out of Scope
- Vollstaendige Neugestaltung der Operator-UI ohne Sync-/Latency-Relevanz.
- Neue Effektarten ohne Bezug zum Sync-Overhaul.
- Cloud-/WAN-Architekturumbau ausserhalb des bestehenden lokalen Multi-Device-Betriebs.

## Priorisierte erste Ausfuehrungswelle (Plan 7-1, execute-ready)
1. Event-Vertrag finalisieren (`mutation envelope`, ordering rules, ack semantics, dedup keys).
2. Serverseitige ordered mutation queue + commit/fanout pipeline mit bounded backpressure umsetzen.
3. Clientseitige apply engine auf version-aware deterministic apply umstellen (stale-drop + idempotent apply).
4. Priority controls (`stop/toggle-off/clear-all`) mit preemptivem apply auf allen Rollen einfuehren.
5. `/output/final` low-latency apply path aktivieren (minimal work before render/audio stop/start).
6. GIF-start latency reduzieren (prewarm/decode scheduling) und trigger jitter glatten.
7. Telemetrie-Hooks E2E integrieren (ingest, commit, fanout, receive, apply, first-frame, audio-start/stop).
8. Regression- und latency-suite fuer 7-1 als Pflichtartefakt liefern.

## Hotfix-Welle (Plan 7-HF1, execute-ready, kurz vor 7-2)
1. Verifier-Schemafix in P7-T12: Telemetrie-Parser auf das kanonische Feld `hopsMs` umstellen (kein stilles Fallback auf `hops`).
2. Behavior-Matrix in P7-T13 auf ausfuehrbare Non-Regression erweitern (room/cluster, align-mode, audio-role-routing, persistence je Start/Edit/Stop/Clear/Reload-Rejoin).
3. Evidenzartefakte aktualisieren: `P7-T12-REGRESSION.md`, `P7-T13-NON-REGRESSION.md`, `P7-T14-LATENCY-REPORT.md` plus neue Debug-Ausgaben aus den Hotfix-Checks.
4. Artefakt-Sync als Pflichtabschluss: `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE` sowie `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/CURRENT_PHASE.md` im selben Schritt konsistent halten.

## Entscheidungsupdate aus Realbetrieb (Plan 7-HF2, P0-Hotfix, execute-ready)
- Architekturentscheidung (verbindlich): fuer Korrektheit wird auf snapshot-basierten Polling-Sync mit Versionskontrolle gepivotet; WebSocket ist optionaler Wakeup-Hint, aber nicht mehr Korrektheitsquelle.
- Server ist einzige Source of Truth fuer Live-Zustand; Clients fuehren keine optimistischen lokalen Zielzustaende mehr.
- Mutationen laufen write-only zum Server (Command-API), der den kanonischen Snapshot mit monotoner `serverVersion` bereitstellt.
- Clients uebernehmen Zustand ausschliesslich aus serverseitigen Snapshots (`GET /api/live/snapshot?sinceVersion=...`), inklusive strict stale-drop (`incomingVersion <= appliedVersion => reject`).
- Polling ist adaptiv: aktiv 120 ms bei frischen Aenderungen oder Fokus, sonst 250 ms; bei Fehlern exponential backoff mit schnellem recovery.
- Ack-Semantik wird aufgeteilt in `commandAccepted` (Mutation angenommen) und `snapshotApplied` (Version sichtbar/applied), um Ghost-States auszuschliessen.
- WS-Hint (optional): `state-dirty`/`wake` reduziert mittlere Wartezeit bis naechster Poll, darf aber nie Snapshot-Versionslogik umgehen.
- Prioritaetskontrollen (`stop/toggle-off/clear-all`) bleiben P0 und muessen spaetestens mit naechstem Snapshot deterministisch sichtbar sein.
- Zielkonflikt ist explizit aufgeloest: deterministische Korrektheit hat Vorrang vor maximaler Reaktivitaet; 3-4 Clients erlauben moderates Polling ohne Infrastrukturstress.

## Plan 7-HF2 Scope (execute-ready)
- Serverseitiger Snapshot-Read-Pfad mit kanonischem Live-State + monotoner `serverVersion` + `serverTimestamp`.
- Command-Write-Pfad haertet Mutationen serverautoritativ; Client zeigt nur ack-pending, aber keinen optimistischen Zielzustand.
- Client-Sync-Loop von eventgetriebenem apply auf polling+version-gated snapshot apply umstellen.
- Adaptive Polling-Strategie (120-250 ms) inkl. Backoff/Jitter/Retry fuer stabile Lastprofile.
- Optionalen WS-Wakeup als Beschleuniger integrieren, ohne Korrektheitsabhaengigkeit.
- Telemetrie fuer `command->snapshot-version-visible->applied` ergaenzen und in Reports ausweisen.
- Regression-Hardening fuer Ghost-State, Multi-Client-Burst, Reconnect und stale-version-Reject.

## Entscheidungsupdate aus neuem Pflichtfeedback (Plan 7-HF3, P0-Hotfix, execute-ready)
- Architekturentscheidung (verbindlich): fuer globale Event-Effekte ist der Snapshot-Trigger selbst das Startsignal; der Client startet den Effekt genau einmal pro neuer Trigger-Revision vollstaendig.
- Polling-Snapshot bleibt alleinige Source of Truth; keine lokale Laufzeitannahme darf Triggerlaufzeit verkuerzen oder vorzeitig beenden.
- Vorzeitiger Effektabbruch ist nur bei explizitem Stop im Snapshot erlaubt (kein implizites Auto-Cleanup durch lokale Timer/Heuristiken).
- Audio folgt derselben Snapshot-Revision wie Visuals: Start genau einmal je Trigger-Revision, deterministischer Stop nur bei Snapshot-Stop.
- Audio-Engine muss stale/replayed Trigger strikt deduplizieren, damit keine spaeten Alt-Sounds nachlaufen.
- Cluster-Stagger-Semantik wird praezisiert: optional sequenziell mit deterministischem Member-Order und konfigurierbarem Offset (ms) statt randomisiertem Versatz.
- UI-Regel: `stagger start` bekommt einen praezisen Delay-Slider (ms), der fuer den sequenziellen Cluster-Start serverseitig mitgespeichert und repliziert wird.

## Plan 7-HF3 Scope (execute-ready)
- Snapshot-Trigger-Lifecycle fuer globale Effekte haerten: einmaliger Vollstart pro Trigger-Revision auf allen Clients.
- Stop-Gating umsetzen: laufende globale Effekte enden nur durch expliziten Snapshot-Stop.
- Audio-Determinismus hardenen: trigger-consistent start/stop, stale-audio-drop, kein Alt-Effekt-Nachlauf.
- Trigger-Revision + dedup-keys im Snapshot/Client-Apply verbindlich einfuehren, inkl. reconnect-sicherem Verhalten.
- Cluster-Stagger auf sequenziellen Modus mit konfigurierbarem Offset erweitern und random-only Semantik abloesen.
- Telemetrie/Gates erweitern: `snapshotTriggerSeen -> visualStart -> audioStart -> explicitStopApplied`.
- Regression-Matrix erweitern: cross-client global trigger duration parity, audio non-replay, sequential stagger offset parity.

## Migrationsstrategie (sichere Inkremente)
1. Bestehenden Live-Sync-Vertrag inventarisieren und semantisch in Mutation-Klassen trennen.
2. Serverseitige ordered commit pipeline hinter Feature-Flag einfuehren.
3. Client-Apply auf version/dedup guards heben, zunaechst shadow-observed.
4. Priority controls auf preemptive path migrieren und gegen alte Pfade absichern.
5. `/output/final` runtime path separat optimieren und mit role-guard kapseln.
6. Telemetrie/Tracing aktivieren und Baseline vs. neue Pfade vergleichen.
7. Regression-/soak-matrix durchlaufen und erst danach Flag-default umstellen.

## Milestones
1. M1 Deterministic Mutation Contract: einheitlicher Event-Umschlag mit ordering/ack/dedup.
2. M2 Ordered Server Pipeline: commit/fanout/backpressure ohne drift unter Burst.
3. M3 Deterministic Client Apply: stale-drop, idempotent apply, no second-click effects.
4. M4 Priority Stop/Toggle Path: sofortiges Stoppen ohne visuelle/audio-Reste.
5. M5 Final-Output Fast Path: `/output/final` reagiert zuerst und stabil.
6. M6 GIF Trigger Responsiveness: reduzierte trigger-to-first-frame Latenz fuer room GIFs.
7. M7 Telemetry + SLO Tracking: messbarer Latenzpfad mit P50/P95/P99 pro Hop.
8. M8 Regression Closure: keine Regression fuer room/cluster, align-mode, audio-role-routing, persistence.

## Messziele (Targets)
- E2E input-to-apply (`controller -> final apply`): P50 <= 90 ms, P95 <= 180 ms, P99 <= 280 ms.
- Control-stop-to-silence (`stop/toggle-off -> audio hard-stop`): P95 <= 120 ms.
- Control-stop-to-visual-clear (`stop/toggle-off -> final no-active-visual`): P95 <= 150 ms.
- GIF room trigger-to-first-frame (`trigger -> first decoded frame on final`): P95 <= 220 ms.
- Determinism: 0 tolerierte stale-applications in Regression-Matrix; 0 second-click-required defects.

## Verbindliches Feedback (Phase 7)
- End-to-end Sync-Latenz muss spuerbar sinken (input bis render/apply auf allen Clients).
- Apply/Stop muss deterministisch first-click funktionieren.
- Event-Pipeline braucht ordering, acks, dedup und backpressure; batching/coalescing nur wo sicher.
- `/output/final` ist priorisierter low-latency Zielpfad.
- Telemetrie/Tracing + klare Targets + Regression-Suite sind Pflicht.
- Bestehende Features duerfen nicht regressieren (room/cluster, align-mode, audio-role-routing, persistence).
- Plan 7-1 ist als verbindliche execute-ready erste Welle vor Folgearbeiten auszufuehren.

## Definition of Done
- Mutation envelope mit `mutationId`/`serverVersion`/`serverTimestamp` ist live in allen kritischen Mutationen.
- Ordered commit/fanout pipeline ist aktiv und verhindert out-of-order/stale apply.
- Client apply ist version-aware idempotent; duplicate/stale events erzeugen keine sichtbare Nebenwirkung.
- `stop/toggle-off/clear-all` greifen preemptiv und hinterlassen keine kurz haengenden visual/audio Reste.
- `/output/final` nutzt den priorisierten fast path und zeigt die niedrigste Reaktionslatenz im Verbund.
- GIF-Room-Starts sind subjektiv smooth und objektiv im Targetbereich (P95).
- E2E-Telemetrie liefert pro Mutation eine nachvollziehbare Timeline ueber alle Hops.
- Regression-Suite deckt single-click, burst, reconnect, join, soak und non-regression-Matrix ab.
- Keine Regression in room/cluster, align-mode, audio-role-routing, persistence.
- Phase-7-Artefakte (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE`) sowie `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/CURRENT_PHASE.md` sind konsistent synchronisiert.

## Execution Update 7-1
- Plan 7-1 implementation completed for P7-T1..P7-T15.
- Core outcomes: ordered mutation queue, priority stop preemption, final-output apply fast-path, GIF prewarm, and telemetry hooks (`/api/live/telemetry`).

## Follow-up Update (verify-work 7)
- verify-work 7 returned PARTIAL PASS: P7-T12 telemetry verifier reads `hops` instead of `hopsMs`; P7-T13 matrix coverage is not behavior-complete.
- Plan 7-HF1 is now the mandatory next execute-ready wave before Plan 7-2.

## Execution Update 7-HF1
- Plan 7-HF1 completed for P7-HF1-T1..P7-HF1-T4.
- P7-T12 verifier now enforces canonical `hopsMs` with explicit missing-field negative-path rejection.
- P7-T13 is upgraded to an executable behavior-level matrix covering room/cluster/align/audio-role/persistence and reload-rejoin parity.
- Evidence artifacts were regenerated (`P7-T12-REGRESSION.md`, `P7-T13-NON-REGRESSION.md`, `P7-T14-LATENCY-REPORT.md`, `debug/p7-hf1-*`) and synchronized with global planning files.

## New Mandatory Wave
- Plan 7-HF2 (Polling Determinism Hotfix) ist als naechste execute-ready P0-Welle gesetzt und blockiert Plan 7-2 bis Gate-PASS.

## Execution Update 7-HF2
- Plan 7-HF2 implementation completed for P7-HF2-T1..P7-HF2-T7.
- Server now exposes snapshot-authoritative read path (`GET /api/live/snapshot?sinceVersion=...`) and command-write mutation path (`POST /api/live/command`).
- Client runtime apply switched to adaptive polling with strict version-gate (`incomingVersion <= appliedVersion => reject`) and pending-until-snapshot UX.
- WebSocket apply path is de-scoped to optional wake hints (`state-dirty`) and is no longer required for correctness.
- Regression/evidence refreshed for deterministic 4-client start/stop/clear-all including `/output/final` (`debug/p7-hf2-t12-output.json`, `debug/p7-hf2-t13-output.json`, `debug/p7-hf2-t14-output.json`).

## New Mandatory Wave
- Plan 7-HF3 (Snapshot Trigger Determinism + Audio Consistency + Sequential Stagger) ist als naechste execute-ready P0-Welle gesetzt und blockiert Plan 7-2 bis Gate-PASS.

## Execution Update 7-HF3
- Plan 7-HF3 implementation completed for P7-HF3-T1..P7-HF3-T7.
- Server snapshot runtime now carries trigger/stop lifecycle revisions for global effects (`globalTriggerRevisions`, `globalStopRevisions`) with authoritative revision assignment on `trigger-global` and explicit stop/clear paths.
- Client snapshot apply now performs once-per-trigger-revision full-run priming, explicit-stop gating, reconnect-safe stale reapply drop, and revision-aware audio lifecycle dedup.
- Cluster stagger dispatch switched from random delay to deterministic sequential offset (`staggerOffsetMs`) with replicated room-draft config in snapshot runtime.
- Regression/evidence refreshed for HF3 gate in `debug/p7-hf3-t12-output.json`, `debug/p7-hf3-t13-output.json`, `debug/p7-hf3-t14-output.json`.

## Gate Closure
- Plan 7-HF3 is PASS; der bis dahin blockierende Trigger/Audio/Stagger-Gate ist geschlossen.

## Neues verpflichtendes Feedback (Plan 7-HF4, P0-Hotfix, execute-ready)
- Problem aus Realbetrieb: Nach dem Start einer Room/Cluster-Animation mutiert die Draft-UI unzulaessig (`target` springt auf `cluster`, Animation springt auf erstes Element `Malfunction`), wodurch der Workflow fuer mehrere Raeume nacheinander mit gleichen Einstellungen bricht.
- Architekturentscheidung (verbindlich): Start-Operationen sind write-only Commands und duerfen die lokalen Draft-Eingaben nicht rueckschreiben oder resetten.
- UI-Invariante (verbindlich): `animation`, `target` und Slider-Drafts bleiben nach `Start` unveraendert; nur explizite User-Aktionen duerfen diese Felder aendern.
- Klick-Invariante (verbindlich): Board-Raumklick darf weiterhin ausschliesslich `target=room:<clickedRoomId>` auto-setzen; kein Start-Pfad darf diese Logik ersetzen oder erweitern.
- Scope-Invariante (verbindlich): Verhalten muss fuer `targetType=room` und `targetType=cluster` gleich stabil bleiben.

## Plan 7-HF4 Scope (execute-ready)
- Start-Handler fuer room/cluster entkoppeln von Draft-State-Mutationen (kein implizites `setDraftAnimation`, `setDraftTarget`, Slider-Reset im Startpfad).
- Shared-Draft-Reducer/Setter mit Guard versehen: `start`-Events duerfen nur runtime pending/ack Status updaten, nicht Draft-Controls.
- Room-Click-Autofill explizit beibehalten und gegen Start-Nebenwirkungen absichern (`click -> target` erlaubt, `start -> no draft mutation`).
- Snapshot-/Polling-Apply gegen Draft-Rueckschreiben absichern, damit serverseitige Runtime-Updates die Draft-UI nicht ueberschreiben.
- Regression erweitern: room- und cluster-start in Serie mit identischen Einstellungen, Dropdown-/Slider-Stabilitaet und no-jump auf `Malfunction`/`cluster`.
- Artefakt-Sync als Pflichtabschluss: `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE` plus `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/CURRENT_PHASE.md`.

## Neue verpflichtende Welle
- Plan 7-HF4 (Draft-UI Immutability on Start) ist als naechste execute-ready P0-Welle gesetzt und blockiert Plan 7-2 bis Gate-PASS.

## Execution Update 7-HF4
- Plan 7-HF4 implementation completed for P7-HF4-T1..P7-HF4-T7.
- Start path for room/cluster now preserves draft controls (`animation`, `target`, sliders) and no longer resets to fallback defaults (`Malfunction`/`cluster`) on start.
- Room draft start flow now uses explicit immutability guard/restore for UI fields; start-side runtime updates remain pending/ack only.
- Snapshot polling apply no longer writes `runtime.roomDraft` onto control clients; runtime updates cannot overwrite local draft dropdown/slider selections.
- HF4 regression/non-regression evidence refreshed (`debug/p7-hf4-t12-output.json`, `debug/p7-hf4-t13-output.json`, `debug/p7-hf4-t14-output.json`).

## Gate Closure
- Plan 7-HF4 is PASS; Draft-UI-Immutability gate is closed.

## Next Wave
- Plan 7-2 (Hardening) is unblocked as the next executable wave.
