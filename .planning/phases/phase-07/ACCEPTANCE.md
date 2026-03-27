# Phase 7 Acceptance

## Regression- und Verifikationsstrategie
- Determinism-first: Ordering, dedup und stale-drop sind vor Performance-Tuning verbindlich korrekt.
- Latency-first: Optimierung wird entlang des echten E2E-Pfads gemessen, nicht nur lokal im Controller.
- Final-output-first: `/output/final` wird als prioritaerer Low-Latency-Consumer verifiziert.
- Stop-integrity-first: `stop/toggle-off/clear-all` duerfen keine visuellen oder audio Reste hinterlassen.
- Evidence-first: jedes Latenz-/Determinismusziel benoetigt reproduzierbare Telemetrie/Trace-Evidenz.
- Non-regression-duty: room/cluster, align-mode, audio-role-routing, persistence bleiben stabil.
- Snapshot-authority-first: sichtbarer Client-Status darf nur aus serverseitigem Snapshot stammen (keine optimistischen Zielstates).

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

- Snapshot-Version-Gate-Test: Client uebernimmt nur `serverVersion > appliedVersion`; stale/equal-Version wird strikt verworfen.
- No-Optimistic-State-Test: UI darf bis Snapshot-Eingang hoechstens pending zeigen, aber keinen lokal angenommenen Endzustand.
- Polling-Cadence-Test: adaptives Intervall liegt im Zielband (aktiv ca. 120 ms, idle ca. 250 ms) und bleibt unter 3-4 Clients stabil.
- WS-Hint-Isolation-Test: Ausfall oder Verlust von WS-Hints darf Korrektheit nicht brechen; Polling-only bleibt korrekt.
- Ghost-State-Elimination-Test: lokale Ghost-States treten in Burst/Reconnect-Matrix nicht auf.

- Snapshot-Trigger-Full-Run-Test: globaler Trigger aus beliebigem Client startet auf allen Clients genau einmal und laeuft ohne impliziten Abbruch bis zur vorgesehenen Dauer.
- Explicit-Stop-Only-Test: vorzeitiger Stopp globaler Effekte erfolgt ausschliesslich, wenn Snapshot explizit einen Stop enthaelt.
- Audio-Trigger-Consistency-Test: Audio startet deterministisch mit Trigger-Revision und stoppt deterministisch mit Snapshot-Stop.
- Audio-Stale-Replay-Guard-Test: alte Trigger-Revisionen duerfen bei spaeteren Snapshots keinen Sound nachstarten.
- Sequential-Stagger-Offset-Test: Cluster startet Members in stabiler Reihenfolge mit konfiguriertem Offset (ms) statt randomisiertem Versatz.
- Stagger-Offset-Replication-Test: gesetzter Offset-Sliderwert bleibt ueber Multi-Client, Reload und Reconnect konsistent repliziert.

- Start-Draft-Immutability-Test: Start einer Room-Animation veraendert Draft-Controls (`animation`, `target`, Slider) nicht.
- Start-Draft-Immutability-Cluster-Test: Start einer Cluster-Animation veraendert Draft-Controls (`animation`, `target`, Slider) nicht.
- Room-Click-Only-Target-Autofill-Test: Board-Raumklick darf ausschliesslich `target` auto setzen; Animation/Slider bleiben unveraendert.
- Start-Does-Not-Autofill-Target-Test: Start-Handler setzt niemals auto `target`; nur Room-Klick darf dies ausloesen.
- Multi-Start-Same-Settings-Stability-Test: mehrere Starts nacheinander mit identischen Draft-Einstellungen bleiben feldstabil ohne Jump auf `cluster`/`Malfunction`.

- Align-Mode-Server-Authority-Test: Align-Toggle wird ausschliesslich serverautoritativ committet und ueber Snapshot-Versionen repliziert (kein lokaler Optimismus).
- Align-Mode-Cross-Client-Parity-Test: Align on/off bleibt ueber 3-4 Clients inkl. `/output/final` versionstreu und first-toggle-deterministisch sichtbar.
- Align-Mode-Stale-Reject-Test: stale/equal snapshot-Versionen duerfen Align-Status nicht rueckwaerts ueberschreiben.
- Board-Switch-Running-Clear-Test: nach Board-Wechsel ist `runningAnimations` deterministisch leer; alte Board-Animationen duerfen nicht weiter angezeigt oder steuerbar sein.
- Board-Switch-No-Residue-Reconnect-Test: nach Switch + Reload/Reconnect erscheinen keine Running-Reste aus dem alten Board.
- Board-Switch-Atomic-Transaction-Test: Context-Switch und Running-Clear muessen als ein untrennbarer Commit sichtbar sein; kein Zwischenzustand mit neuem Board + alten Running-Eintraegen ist zulaessig.
- Snapshot-Sanitize-Before-Persist-Broadcast-Test: serverseitige Persistenz/Broadcast-Snapshots enthalten keine boardfremden Running-Eintraege.
- Reconnect-Board-Context-Filter-Test: reconnect-hydrierte Running-Liste enthaelt ausschliesslich Eintraege fuer `selectedBoard`.
- Cross-Board-Residue-Zero-Invariant-Test: deterministische Matrix (`switch -> reconnect`) liefert `crossBoardResidueCount = 0` ueber alle Clients inkl. `/output/final`.

- Stop-Route-No-Start-Side-Effect-Test: Running-List-Stop erzeugt ausschliesslich `stop-animation` fuer die bestehende `animation.id`; kein create/start command darf als Side-Effect auftreten.
- Stop-AnimId-NonIncrement-Invariant-Test: bei Stop bleibt die Instanz-ID stabil (kein neuer Running-Eintrag, keine `animation.id`-Erhoehung durch Stop).
- Stop-Server-Authority-Propagation-Test: server-commiteter Stop repliziert deterministisch ueber alle Rollen inkl. `/output/final` im selben Snapshot-Versionfluss.
- Stop-UI-Inflight-Guard-Test: Mehrfachklick/Doppeltap auf Stop erzeugt keinen Doppeldispatch und keinen ungueltigen Retry-Startpfad.
- Stop-Room-Global-Cluster-Parity-Test: stop semantics bleiben fuer `room`, `global` und `cluster` first-click-deterministisch inklusive Reload/Reconnect.
- Stop-Global-Outside-Route-Parity-Test: Running-List-Stop auf `GLOBAL-OUTSIDE` routed strikt stop-only und erzeugt keine Neuinstanz/ID-Erhoehung.
- Stop-Global-Semantics-Unification-Test: `global-inside` und `global-outside` nutzen identische server/client stop semantics (ack/version/dedup/idempotent stale handling).
- Running-List-Hover-Stability-Test: Hover auf Running-List-Buttons bleibt konstant sichtbar ohne Blink-/Loop-Flicker.
- Running-List-Hover-Parity-Test: Hover-Highlight-Verhalten der Running-Liste entspricht stabil dem restlichen Button-System (Desktop + Touch emulation).

- Start-Mutation-Not-Neutralized-Test: direkt nach Start darf keine nachfolgende Kontext-/Statusmutation den frisch gestarteten Run entfernen oder auf vorherigen Zustand zuruecksetzen.
- Board-Switched-Status-Arbitration-Test: `board switched` darf Start-/Running-Status nicht maskieren; Startfeedback bleibt sichtbar bis regulaere Lifecycle-Events eintreten.
- All-Scope-Start-Stop-Parity-Test: `room`, `global-inside`, `global-outside`, `cluster` sind jeweils first-click startbar und stop-only deterministisch stoppbar.
- Run-Lifecycle-Persistence-Test: aktive Animation bleibt bis Timerablauf oder explizitem `stop-animation`/`clear-all` erhalten; kein implizites Frueh-Cleanup.
- Multi-Client-Start-Persistence-Parity-Test: Start/Lifecycle bleiben ueber 3-4 Clients inkl. `/output/final` synchron stabil (inkl. Reconnect/Polling-Version-Gates).

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
- Client-UI/Zustand ist nicht-optimistisch: final sichtbarer Zustand kommt ausschliesslich aus serverseitigen Snapshots mit Version-Gate.
- Keine Regression in room/cluster, align-mode, audio-role-routing, persistence.
- Align-Mode ist serverautoritativ und auf allen Rollen inkl. `/output/final` deterministisch synchron.
- Board-Switch leert Running deterministisch; es bleiben keine Alt-Animationen des vorherigen Boards sichtbar.
- Running-List-Stop bleibt stop-only deterministisch: keine Neuinstanz/ID-Erhoehung durch Stop, serverautoritative Stop-Propagation auf allen Rollen.
- Stop-Paritaet gilt explizit fuer `room`, `global-inside`, `global-outside` und `cluster`; `global-outside` darf keine Routing-Sonderfaelle mehr haben.
- Running-List-Hover ist visuell stabil und flickerfrei; kein loopender Hover-Animationszustand bei wiederholtem Pointer-Ein-/Austritt.
- Start-Mutationen bleiben stabil erhalten und werden nicht unmittelbar durch Kontext-/Statusdrift neutralisiert.
- `board switched` bleibt ein nicht-maskierendes Kontextsignal; laufende Start-/Running-Statusevents behalten Prioritaet.
- Alle Animationsarten (`room`, `global-inside`, `global-outside`, `cluster`) sind sowohl startbar als auch stoppbar bei stabiler Lifecycle-Persistenz.
- Phase-7-Artefakte sowie `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/CURRENT_PHASE.md` sind konsistent aktualisiert.

## Execution Update 7-1
- Instrumentation endpoints/scripts available:
  - `/api/live/telemetry`
  - `debug/p7-t12-sync-regression.mjs`
  - `debug/p7-t13-non-regression.mjs`
  - `debug/p7-t14-latency-report.mjs`

## Follow-up Gate (verify-work 7)
- verify-work 7 ist PARTIAL PASS; zwei blocker-relevante Verify-Gaps muessen vor Plan 7-2 geschlossen werden.
- P7-T12 Gate: Verifier akzeptiert nur das kanonische Feld `hopsMs`; ein `hops`-Fallback ist nicht zulaessig.
- P7-T13 Gate: Non-regression muss als behavior-level Matrix ausfuehrbar sein (room/cluster, align-mode, audio-role-routing, persistence jeweils Start/Edit/Stop/Clear plus Reload/Rejoin).
- P7-T14 Gate: Latency-Report bleibt nur dann freigabefaehig, wenn P7-T12/P7-T13 Evidenz konsistent mit den Hotfix-Checks aktualisiert wurde.
- Plan 7-HF1 ist damit die verpflichtende naechste execute-ready Welle vor Plan 7-2.

## Gate Closure Update (Plan 7-HF1)
- P7-T12 Gate: PASS (`hopsMs`-only parser + negative-path missing-field rejection).
- P7-T13 Gate: PASS (ausfuehrbare behavior-level Matrix inkl. Reload/Rejoin-Paritaet).
- P7-T14 Gate: PASS (Evidenz mit `debug/p7-hf1-*` aktualisiert und konsistent verlinkt).
- Plan 7-2 war damit initial freigegeben.

## New Blocking Gate (Plan 7-HF2)
- Reales Betriebsfeedback oeffnet vor Plan 7-2 einen neuen P0-Gate: sporadische Aktionen und spaet verschwindende Ghost-States sind blocker.
- Freigabevoraussetzung: Polling-Determinism-Pivot ist PASS (server-only truth, no optimistic state, snapshot-version-gated apply, adaptive polling, optional WS-hint-only).

## Gate Closure Update (Plan 7-HF2)
- PASS: server-authoritative snapshot endpoint (`/api/live/snapshot`) is the canonical read channel with strict client version-gate stale-drop.
- PASS: mutations are command-write-only via `/api/live/command`; UI uses pending status until snapshot-confirmed apply.
- PASS: adaptive polling cadence (fast/idle + backoff/jitter/recovery) is active and verified in regression evidence.
- PASS: WebSocket path is wake-hint-only (`state-dirty`) and not required for correctness.
- PASS: 4-client polling regression (incl. `/output/final`) confirms deterministic start/stop/clear-all without ghost states.

## New Blocking Gate (Plan 7-HF3)
- Neues verpflichtendes Feedback oeffnet vor Plan 7-2 einen weiteren P0-Gate: globale Trigger koennen client-inkonsistent zu kurz laufen, Audio ist sporadisch/verspaetet inkonsistent, Stagger-Start benoetigt praezisen sequenziellen Offset statt Zufall.
- Freigabevoraussetzung: Snapshot-Trigger-Determinism-Gate ist PASS (once-per-trigger full-run, explicit-stop-only, audio revision-consistency ohne stale replay, sequential stagger with replicated offset slider).

## Gate Closure Update (Plan 7-HF3)
- PASS: snapshot-trigger lifecycle uses revisioned global trigger keys with once-per-revision full-run parity across polling clients.
- PASS: explicit-stop-only gating is enforced through snapshot stop revisions (`runtime.globalStopRevisions`) and verified as deterministic teardown signal.
- PASS: audio lifecycle is revision-aware/idempotent; stale replays are dropped and start/stop behavior is deterministic under polling snapshots.
- PASS: cluster stagger is sequential with deterministic offset parity (`staggerOffsetMs`) and replicated in snapshot runtime room-draft state.
- PASS: HF3 evidence captured in `debug/p7-hf3-t12-output.json`, `debug/p7-hf3-t13-output.json`, `debug/p7-hf3-t14-output.json`.

## New Blocking Gate (Plan 7-HF4)
- Neues verpflichtendes Feedback oeffnet vor Plan 7-2 einen weiteren P0-Gate: Start einer Room/Cluster-Animation mutiert derzeit unerlaubt Draft-Felder (`target`-Sprung auf `cluster`, `animation`-Sprung auf erstes Element).
- Freigabevoraussetzung: Draft-Immutability-Gate ist PASS (Start mutiert Draft-UI nicht; Dropdowns/Slider bleiben stabil; Room-Klick setzt weiterhin ausschliesslich `target`; room+cluster Targets bleiben stabil).

## Gate Closure Update (Plan 7-HF4)
- PASS: Start path for `targetType=room|cluster` no longer mutates draft controls (`animation`, `target`, sliders) and does not reset to fallback defaults.
- PASS: Draft immutability guard ensures start flow can only affect runtime pending/ack lifecycle, not draft control state.
- PASS: Room-click target autofill remains target-only path; no start-side replacement of click autofill logic.
- PASS: Snapshot/polling apply is decoupled from control draft fields (`runtime.roomDraft` no longer overwrites local dropdowns/sliders).
- PASS: HF4 evidence captured in `debug/p7-hf4-t12-output.json`, `debug/p7-hf4-t13-output.json`, `debug/p7-hf4-t14-output.json`.

## New Blocking Gate (Plan 7-HF5)
- Neues verpflichtendes Feedback oeffnet vor Plan 7-2 einen weiteren P0-Gate: Align-Mode ist derzeit nicht serverautoritativ ueber alle Clients synchron, und beim Board-Wechsel bleiben Running-Reste des alten Boards bestehen.
- Freigabevoraussetzung: Align/Board-Switch-Determinism-Gate ist PASS (Align-Toggle serverautoritativ inkl. `/output/final`; Board-Switch leert Running deterministisch ohne Rehydrierungsreste).

## Gate Closure Update (Plan 7-HF5)
- PASS: Align toggle is server-authoritative via `context-update` command/ack/version flow; no local optimistic align state apply.
- PASS: Align ON/OFF snapshot roundtrip is deterministic across 4 polling clients including `/output/final`.
- PASS: strict stale/equal-version reject is active for polling and reconnect replay (`incomingVersion <= appliedVersion => drop`).
- PASS: board switch clears running state atomically in server context mutation and no old-board residues rehydrate on clients.
- PASS: HF5 evidence captured in `debug/p7-hf5-t12-output.json`, `debug/p7-hf5-t13-output.json`, `debug/p7-hf5-t14-output.json`.

## New Blocking Gate (Plan 7-HF6)
- verify-work 7-HF5 follow-up oeffnet erneut einen P0-Gate: board-switch clear bleibt in Randfaellen nicht deterministisch und reconnect snapshots koennen cross-board residues rehydrieren.
- Freigabevoraussetzung: Board-Context-Residue-Elimination-Gate ist PASS (authoritative atomic switch-clear transaction, snapshot sanitize vor persist/broadcast, reconnect board-context filter, regression-invariante `crossBoardResidueCount = 0`).

## Gate Closure Update (Plan 7-HF6)
- PASS: board-switch clear now executes as authoritative atomic context transaction with idempotent `contextSwitchTransactionId` guard.
- PASS: server-side snapshot sanitization runs before persist/broadcast and strips board-foreign running entries deterministically.
- PASS: reconnect/join snapshot apply hard-filters running by `selectedBoard`; cross-board rehydrate payloads are dropped.
- PASS: deterministic switch+reconnect matrix proves `crossBoardResidueCount = 0` across 4 polling clients including `/output/final`.
- PASS: HF6 evidence captured in `debug/p7-hf6-t12-output.json`, `debug/p7-hf6-t13-output.json`, `debug/p7-hf6-t14-output.json`.

## New Blocking Gate (Plan 7-HF7)
- Neues verpflichtendes Feedback oeffnet vor Plan 7-2 einen weiteren P0-Gate: Running-List-Stop erzeugt in Randfaellen neue Instanzen statt die bestehende Animation zu stoppen.
- Freigabevoraussetzung: Stop-Action-Determinism-Gate ist PASS (strict stop-only routing ohne create/start side-effects, serverautoritatives stop apply auf allen Clients inkl. `/output/final`, UI re-trigger guard, room/global/cluster parity).

## Gate Closure Update (Plan 7-HF7)
- PASS: Running-list stop routing now dispatches only `stop-animation` via a dedicated stop helper; create/start side paths are blocked.
- PASS: Server stop mutation is idempotent and authoritative for stale/unknown IDs and cluster-linked stop reconciliation without start side-effects.
- PASS: stop/clear commits apply immediately via `live-session-update` snapshot path and stay version/dedup guarded across control + `/output/final`.
- PASS: UI stop controls are inflight-idempotent (`pendingStopAnimationIds`, disabled `Stopping...` state) until snapshot confirms removal.
- PASS: room/global/cluster stop parity and `anim-id` non-increment invariant verified across 4 clients (incl. `/output/final`) with evidence in `debug/p7-hf7-t12-output.json`, `debug/p7-hf7-t13-output.json`, `debug/p7-hf7-t14-output.json`.

## New Blocking Gate (Plan 7-HF8)
- Neues verpflichtendes Feedback oeffnet vor Plan 7-2 einen weiteren P0-Gate: individueller Stop fuer `GLOBAL-OUTSIDE` bleibt inkonsistent (teils Neuinstanz/No-Op), und Running-List-Hover blinkt statt stabil zu highlighten.
- Freigabevoraussetzung: Global-Outside-Stop-Parity-and-Hover-Stability-Gate ist PASS (all-scope stop parity inkl. `global-outside`, vereinheitlichte globale stop semantics server/client, flickerfreies Running-List-hover behavior).

## Gate Closure Update (Plan 7-HF8)
- PASS: running-list stop for `global-outside` stays on stop-only `stop-animation` command routing with no trigger/create fallback.
- PASS: server/client global stop semantics are unified for `global-inside` + `global-outside` (ack/version/dedup parity plus idempotent stale handling).
- PASS: authoritative outside stop convergence disables `outsideFx` without no-op drift.
- PASS: running-list hover remains visually stable (no blink/loop flicker under periodic runtime refresh).
- PASS: evidence captured in `debug/p7-hf8-t12-output.json`, `debug/p7-hf8-t13-output.json`, `debug/p7-hf8-t14-output.json`.

## New Blocking Gate (Plan 7-HF9)
- verify-work 7-HF8 follow-up oeffnet einen kritischen P0-Gate: Start-Mutationen werden nach Trigger sofort neutralisiert/ueberschrieben; ausser `global-outside` starten Animationen nicht stabil.
- Freigabevoraussetzung: Start-Lifecycle-and-Status-Arbitration-Gate ist PASS (Root-Cause-Fix fuer Start-Neutralisierung, `board switched` maskiert keine Start-Events, all-scope start/stop parity, lifecycle persistence bis Timer/Stop/Clear, multi-client deterministic parity inkl. `/output/final`).

## Gate Closure Update (Plan 7-HF9)
- PASS: start lifecycle no longer gets neutralized by trailing context/status updates (`room-draft-sync` and `align-toggle` cannot mutate selected board context).
- PASS: `board switched` remains contextual and does not overwrite start/running lifecycle feedback during runtime panel synchronization.
- PASS: all-scope parity is stable (`room`, `global-inside`, `global-outside`, `cluster`) with first-click start and deterministic stop-only behavior.
- PASS: run lifecycle persistence holds until explicit `stop-animation`/`clear-all` or timer end; no implicit early cleanup drift.
- PASS: deterministic 4-client polling parity including `/output/final` and reconnect/version gates remains intact.
- PASS: evidence captured in `debug/p7-hf9-t12-output.json`, `debug/p7-hf9-t13-output.json`, `debug/p7-hf9-t14-output.json`.
