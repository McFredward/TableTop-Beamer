# Execute Phase 6

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 6-1 (verbindlich, erste execute-ready Welle)
1. P0 zuerst: P6-T1..P6-T3 (Katalogschema + Server-Import + Persistenz + Katalog-Refresh).
2. P0 danach: P6-T4..P6-T5 (UI/Runtime auf dynamische Katalogauswahl umstellen).
3. P0 danach: P6-T6..P6-T9 (Room-Clusters inkl. Dropdown-Zielen und Einzelraum-Klickguard).
4. P0 danach: P6-T10..P6-T11 (English-only Sweep fuer UI/Status/Doku/Logs/Errors).
5. P0 danach: P6-T12 (Legacy-Migration fuer Nemesis/Polygone/Animationsconfigs idempotent integrieren).
6. P0 Abschluss: P6-T13 (Plan-6-1-Regression und Artefaktnachweis).

## Priority Execution - Plan 6-HF1 (verbindlich, P0-Hotfix vor 6-2)
1. P0 zuerst: P6-T18 (Language-Inventur fuer Control/Settings/Final-Flow inkl. Status/Errors/Logs).
2. P0 danach: P6-T19..P6-T20 (UI + Status/Error-Pfade vollstaendig auf Englisch vereinheitlichen).
3. P0 danach: P6-T21 (README + Phase-06-Doku konsistent auf English-only Operator Policy nachziehen).
4. P0 Abschluss: P6-T22 (Language-Sweep-Regression artefaktbasiert dokumentieren).

## Priority Execution - Plan 6-2 (verbindlich, P0-Welle nach 6-HF1)
1. P0 zuerst: P6-T23..P6-T24 (separate Vertex-Visibility-Toggles + Interaktionsguards fuer ausgeblendete Gruppen).
2. P0 danach: P6-T25..P6-T26 (Play-Area-Rename in UI/Model/Operator-Wording + Entfernung alter Spezialraum-Sondervisuals).
3. P0 danach: P6-T27..P6-T28 (Room-Creation aus Polygon-Template + Persistenz-/Migrationsguard).
4. P0 Abschluss: P6-T29 (Plan-6-2-Regression artefaktbasiert dokumentieren).

## Priority Execution - Plan 6-HF2 (verbindlich, P0-Hotfix vor 6-3)
1. P0 zuerst: P6-T30 (Room-Copy vollstaendig auf Geometry-Paritaet inkl. Scale/Offset/Transform bringen).
2. P0 danach: P6-T31..P6-T32 (Keyboard copy/paste/delete fuer selektierten Room + Empty-Space-Deselection).
3. P0 danach: P6-T33 (Play-Area-Non-Regression fuer Room-Editing-Hotfix absichern).
4. P0 Abschluss: P6-T34 (Plan-6-HF2-Regression artefaktbasiert dokumentieren).

## Priority Execution - Plan 6-HF3 (verbindlich, P0-Hotfix vor 6-3)
1. P0 zuerst: P6-T35 (Selection-Source-of-Truth fixieren: visuell selektiert = aktiv selektiert).
2. P0 danach: P6-T36 (Delete-Hotkey auf persistente Selection entkoppeln, ohne Hold/Drag-Abhaengigkeit).
3. P0 danach: P6-T37 (kombinierte Regression fuer Copy/Paste/Delete + Empty-space deselect + Play-Area-Guard nachweisen).
4. P0 Abschluss: P6-T38 (HF3-Artefakt-Sync fuer PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP).

## Priority Execution - Plan 6-HF4 (verbindlich, P0-Hotfix vor 6-3)
1. P0 zuerst: P6-T39 (Pointerdown/Click/Pointerup-Arbitration korrigieren: Click selektiert persistent, Hold/Move startet Drag).
2. P0 danach: P6-T40 (Selection-Lifecycle fixen: Room-Polygone/Handles bleiben nach Pointer-Up sichtbar bis Deselect/Room-Wechsel).
3. P0 danach: P6-T41 (Input-Consistency: Hold nur fuer Drag, Delete/Copy/Paste + Buttons strikt auf persistente Selection binden).
4. P0 danach: P6-T42 (kombinierte Regression unter neuer Arbitration dokumentieren: Delete/Copy/Paste + Empty-space deselect + Play-Area-Guard).
5. P0 Abschluss: P6-T43 (HF4-Artefakt-Sync fuer PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE).

## Priority Execution - Plan 6-HF5 (verbindlich, P0-Hotfix vor 6-3)
1. P0 zuerst: P6-T44 (Click-only Selection fixen: kurzer Click ohne Move setzt persistente Selection deterministisch).
2. P0 danach: P6-T45 (Pointer-Up-Lifecycle stabilisieren: Room-Polygone/Handles bleiben nach no-move Click sichtbar bis Deselect/Room-Wechsel).
3. P0 danach: P6-T46 (Drag-Paritaet absichern: Hold/Move-Drag bleibt unveraendert, Selection-Click bleibt drag-frei).
4. P0 danach: P6-T47 (Guard-Regression dokumentieren: Empty-space deselect + Play-Area-Guard + Copy/Paste/Delete unter HF5).
5. P0 Abschluss: P6-T48 (HF5-Artefakt-Sync fuer PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE).

## Priority Execution - Plan 6-HF6 (verbindlich, P0/P1-Hotfix vor 6-3)
1. P0 zuerst: P6-T49 (Room-vs-Vertex Pointer-Arbitration korrigieren: Vertex-Click darf Room-Selektion/Handles nicht deselektieren).
2. P0 danach: P6-T50..P6-T51 (stabile Vertex-Selection fuer Move/Delete + Delete-Key/Delete-Panel-Paritaet ohne Dropdown-Re-Select).
3. P1 danach: P6-T52 (optional low-risk UX-Fix: Text-Selection waehrend Room-Drag unterdruecken ohne Input-Regression).
4. P0 Abschluss: P6-T53 (HF6-Kombinationsmatrix dokumentieren: vertex-click persistence + delete/panel + deselect/play-area guard + drag parity).
5. P0 Abschluss: P6-T54 (HF6-Artefakt-Sync fuer PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE).

## Priority Execution - Plan 6-HF7 (verbindlich, P0-Hotfix vor 6-3)
1. P0 zuerst: P6-T55 (Edge-pointer arbitration fixen: Edge-Bubble-Click behaelt persistente Room-Selektion und verhindert same-cycle deselect).
2. P0 danach: P6-T56 (Edge-selection lifecycle stabilisieren: aktive Edge bleibt nach Click/Pointer-Up fuer Insert-Vertex verfuegbar).
3. P0 danach: P6-T57..P6-T58 (Room-delete tombstones + defaults-merge guard gegen Rehydrate bei Reload/Restart/Defaults-Apply).
4. P0 Abschluss: P6-T59 (HF7-Kombinationsmatrix dokumentieren: insert-vertex flow + delete persistence + empty-space/play-area guards + move parity).
5. P0 Abschluss: P6-T60 (HF7-Artefakt-Sync fuer PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE).

## Priority Execution - Plan 6-HF8 (verbindlich, P0-Hotfix vor 6-3)
1. P0 zuerst: P6-T61..P6-T62 (Room-Animation-Draft persistieren: Dropdown + Parameter bleiben ueber Room-/Target-Wechsel und Trigger-Start stabil).
2. P0 danach: P6-T63 (Cluster-CRUD im Operator-Flow liefern: create/edit/delete fuer beliebige Room-Mengen inkl. Persistenz).
3. P0 danach: P6-T64 (Target-Flow vervollstaendigen: Cluster als Ziel waehlbar und Fanout-Start fuer alle Cluster-Rooms).
4. P0 danach: P6-T65 (`stagger start` pro Trigger integrieren: off synchron, on kurzer randomisierter Versatz je Room).
5. P0 Abschluss: P6-T66 (HF8-Kombinationsmatrix + Artefakt-Sync fuer PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE).

## Priority Execution - Plan 6-HF9 (verbindlich, P0-Hotfix vor 6-3)
1. P0 zuerst: P6-T67 (Draft-Vertrag praezisieren: Animation + Parameter bleiben persistent, `target` explizit ausgenommen).
2. P0 danach: P6-T68 (Room-Click-Autofill: Board-Raumklick setzt `target` deterministisch auf den geklickten Room ohne Draft-Reset).
3. P0 danach: P6-T69 (Target-Dropdown always enabled: manuelle Bedienung auch ohne aktive Room-Selektion sicherstellen).
4. P0 danach: P6-T70 (Auto+Manual-Paritaet absichern: nach Autofill jederzeit manuelle Umstellung auf Room/Cluster, selection-unabhaengig).
5. P0 Abschluss: P6-T71 (HF9-Kombinationsmatrix + Artefakt-Sync fuer PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE).

## Priority Execution - Plan 6-HF10 (verbindlich, P0-Hotfix vor 6-3)
1. P0 zuerst: P6-T72 (Cluster-Fanout korrigieren: `target=cluster` startet robust in allen Cluster-Member-Raeumen, kein First-Room-Only).
2. P0 danach: P6-T73 (Sync/Stagger-Paritaet absichern: `off` startet alle Member synchron, `on` startet alle Member mit kurzem randomisierten Versatz).
3. P0 danach: P6-T74 (Running-Model auf dedizierten Scope `CLUSTER` erweitern: eigener Laufkontext fuer Cluster-Runs).
4. P0 danach: P6-T75 (Running-Rendering vervollstaendigen: Label `CLUSTER` + visuell unterscheidbare Farbe + konsistente Stop/Edit-Semantik).
5. P0 Abschluss: P6-T76 (HF10-Kombinationsmatrix + Artefakt-Sync fuer PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE).

## Priority Execution - Plan 6-HF11 (verbindlich, P0-Hotfix vor 6-3)
1. P0 zuerst: P6-T77 (Cluster-Lifecycle root-cause fixen: hold-by-default-Paritaet herstellen und vorzeitiges Verschwinden durch cleanup/overwrite race eliminieren).
2. P0 danach: P6-T78 (Cluster cleanup/overwrite guards haerten: lifecycle-mutations nur run-context-/`animation.id`-scharf anwenden).
3. P0 danach: P6-T79 (Serverautoritiven Board-Context-Sync fuer Board/Layout haerten: Ack + monotone Version + ordering/stale-drop).
4. P0 danach: P6-T80 (Join/Reconnect/InFlight-Paritaet liefern: snapshot + replay deterministisch fuer alle Rollen inkl. `/output/final`).
5. P0 Abschluss: P6-T81 (HF11-Kombinationsmatrix dokumentieren: cluster lifecycle stability + first-toggle board propagation + reconnect/order burst).
6. P0 Abschluss: P6-T82 (HF11-Artefakt-Sync fuer PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE).

## Priority Execution - Plan 6-HF12 (verbindlich, P0-Hotfix vor 6-3)
1. P0 zuerst: P6-T83 (Running-Dedupe fixen: pro Cluster-Start genau ein `CLUSTER`-Eintrag, keine member-`ROOM`-Duplikate fuer denselben Trigger).
2. P0 danach: P6-T84 (Runtime-Fanout sichern: dedupter `CLUSTER`-Run animiert weiterhin alle Cluster-Member in sync + stagger).
3. P0 danach: P6-T85 (Stop/Edit-Propagation haerten: `CLUSTER`-Aktionen wirken konsistent auf alle zugeordneten Member-Instanzen).
4. P0 danach: P6-T86 (Room-Target-Non-Regression absichern: `targetType=room` bleibt unveraendert deterministisch).
5. P0 Abschluss: P6-T87 (HF12-Kombinationsmatrix dokumentieren: single-entry running + full-member runtime effect + stop/edit propagation + room guard).
6. P0 Abschluss: P6-T88 (HF12-Artefakt-Sync fuer PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE).

## Priority Execution - Plan 6-3 (verbindlich, nach 6-HF12)
1. P1 zuerst: P6-T14 (Import-Konfliktstrategie finalisieren und Operator-Feedback absichern).
2. P1 danach: P6-T15..P6-T16 (Negativtests + Multi-Board-Soak fuer Import/Cluster/Migration).
3. P1 Abschluss: P6-T17 (formale Operator-E2E-Abnahme im Realsetup).

## Gate-Regeln
- Kein Weitergehen zu P6-T4+, bevor P6-T3 Importpersistenz + Katalog-Refresh ohne Neustart nachweisbar liefert.
- Kein Weitergehen zu P6-T6+, bevor P6-T5 die boardId-kataloggetriebene Runtime ohne A/B-Hardcoding nachweist.
- Kein Weitergehen zu P6-T10+, bevor P6-T9 Cluster-Fanout und Einzelraum-Klickguard regressionsfrei bestaetigt.
- Kein Weitergehen zu P6-T12+, bevor P6-T11 English-only fuer UI/Status/Doku/Logs/Errors artefaktbasiert bestaetigt.
- Kein Weitergehen zu P6-T23+, bevor P6-T22 den verify-work-6 P0-Blocker (`English-only operator flow`) artefaktbasiert geschlossen hat.
- Kein Weitergehen zu P6-T25+, bevor P6-T24 die Vertex-Interaktionsguards fuer ausgeblendete Gruppen nachweist.
- Kein Weitergehen zu P6-T27+, bevor P6-T26 die Play-Area-Terminologie und no-special-room-visuals konsistent nachweist.
- Kein Weitergehen zu P6-T30+, bevor P6-T29 die Plan-6-2-Regression artefaktbasiert abgeschlossen hat.
- Kein Weitergehen zu P6-T31+, bevor P6-T30 die vollstaendige Room-Copy-Geometrieparitaet nachweist.
- Kein Weitergehen zu P6-T33+, bevor P6-T32 Keyboard-Editing + Empty-Space-Deselection regressionsfrei bestaetigt.
- Kein Weitergehen zu P6-T35+, bevor P6-T34 die Plan-6-HF2-Regression artefaktbasiert abgeschlossen hat.
- Kein Weitergehen zu P6-T36+, bevor P6-T35 die persistente Selection-Semantik (`visuell selektiert = aktiv`) nachweist.
- Kein Weitergehen zu P6-T37+, bevor P6-T36 Delete ohne Hold-/Drag-Abhaengigkeit regressionsfrei bestaetigt.
- Kein Weitergehen zu P6-T39+, bevor P6-T38 die Plan-6-HF3-Regression inkl. Artefakt-Sync abgeschlossen hat.
- Kein Weitergehen zu P6-T40+, bevor P6-T39 die Pointer-Arbitration (`click select` vs `hold-drag move`) regressionsfrei nachweist.
- Kein Weitergehen zu P6-T41+, bevor P6-T40 die persistente Selection-Sichtbarkeit nach Pointer-Up bestaetigt.
- Kein Weitergehen zu P6-T42+, bevor P6-T41 die Hotkey/Button-Bindung an persistente Selection bestaetigt.
- Kein Weitergehen zu P6-T44+, bevor P6-T43 die Plan-6-HF4-Regression inkl. Artefakt-Sync abgeschlossen hat.
- Kein Weitergehen zu P6-T45+, bevor P6-T44 no-move Click-Selection persistent und ohne Zwischen-Move nachweist.
- Kein Weitergehen zu P6-T46+, bevor P6-T45 die Pointer-Up-Sichtbarkeit fuer no-move Click bestaetigt.
- Kein Weitergehen zu P6-T47+, bevor P6-T46 Drag-Paritaet (`hold/move`) ohne Regression bestaetigt.
- Kein Weitergehen zu P6-T49+, bevor P6-T48 die Plan-6-HF5-Regression inkl. Artefakt-Sync abgeschlossen hat.
- Kein Weitergehen zu P6-T50+, bevor P6-T49 Room-vs-Vertex-Arbitration ohne Room-Deselect nachweist.
- Kein Weitergehen zu P6-T51+, bevor P6-T50 stabile direkte Vertex-Selection fuer Move/Delete ohne Dropdown-Re-Select bestaetigt.
- Kein Weitergehen zu P6-T53+, bevor P6-T51 Delete-Key/Delete-Panel-Paritaet auf direkter Vertex-Auswahl bestaetigt.
- Kein Weitergehen zu P6-T54+, bevor P6-T53 die HF6-Kombinationsmatrix artefaktbasiert als PASS nachweist.
- Kein Weitergehen zu P6-T55+, bevor P6-T54 den HF6-Artefakt-Sync abgeschlossen hat.
- Kein Weitergehen zu P6-T56+, bevor P6-T55 Edge-Bubble-Click ohne Room-Deselect regressionsfrei nachweist.
- Kein Weitergehen zu P6-T57+, bevor P6-T56 stabile Edge-Selection fuer Insert-Vertex ohne Re-Select bestaetigt.
- Kein Weitergehen zu P6-T59+, bevor P6-T58 Tombstone-Prioritaet gegen Defaults-Rehydrate bei Reload/Restart/Defaults-Apply bestaetigt.
- Kein Weitergehen zu P6-T60+, bevor P6-T59 die HF7-Kombinationsmatrix artefaktbasiert als PASS nachweist.
- Kein Weitergehen zu P6-T61+, bevor P6-T60 den HF7-Artefakt-Sync abgeschlossen hat.
- Kein Weitergehen zu P6-T63+, bevor P6-T62 Draft-Persistenz fuer Animation + Parameter ueber room/target switch + post-start nachweist.
- Kein Weitergehen zu P6-T64+, bevor P6-T63 Cluster-CRUD mit board-spezifischer Persistenz regressionsfrei bestaetigt.
- Kein Weitergehen zu P6-T65+, bevor P6-T64 target/fanout fuer Cluster ohne Einzelraumklick-Regression bestaetigt.
- Kein Weitergehen zu P6-T66+, bevor P6-T65 `stagger start` on/off-Semantik (`off=sync`, `on=random short delay`) regressionsfrei bestaetigt.
- Kein Weitergehen zu P6-T67+, bevor P6-T66 die HF8-Kombinationsmatrix inkl. Artefakt-Sync abgeschlossen hat.
- Kein Weitergehen zu P6-T68+, bevor P6-T67 den Draft-Vertrag (`target` ausgenommen) regressionsfrei nachweist.
- Kein Weitergehen zu P6-T69+, bevor P6-T68 Room-Click-Autofill ohne Animation-/Parameter-Reset bestaetigt.
- Kein Weitergehen zu P6-T70+, bevor P6-T69 den always-enabled Target-Dropdown auch bei `selection=none` bestaetigt.
- Kein Weitergehen zu P6-T71+, bevor P6-T70 selection-unabhaengige Manual-Overrides nach Room-Autofill regressionsfrei bestaetigt.
- Kein Weitergehen zu P6-T72+, bevor P6-T71 die HF9-Kombinationsmatrix inkl. Artefakt-Sync abgeschlossen hat.
- Kein Weitergehen zu P6-T73+, bevor P6-T72 all-member cluster fanout ohne First-Room-Verlust regressionsfrei nachweist.
- Kein Weitergehen zu P6-T74+, bevor P6-T73 sync/stagger parity fuer alle Cluster-Member bestaetigt.
- Kein Weitergehen zu P6-T75+, bevor P6-T74 den dedizierten Running-Scope `CLUSTER` im Modell nachweist.
- Kein Weitergehen zu P6-T76+, bevor P6-T75 `CLUSTER`-Rendering (Label/Farbe) und konsistente Stop/Edit-Semantik regressionsfrei bestaetigt.
- Kein Weitergehen zu P6-T77+, bevor P6-T76 die HF10-Kombinationsmatrix inkl. Artefakt-Sync abgeschlossen hat.
- Kein Weitergehen zu P6-T78+, bevor P6-T77 hold-by-default lifecycle-paritaet fuer cluster starts ohne frueh-cancel regressionsfrei nachweist.
- Kein Weitergehen zu P6-T79+, bevor P6-T78 cleanup/overwrite isolation pro run-context bestaetigt.
- Kein Weitergehen zu P6-T80+, bevor P6-T79 serverautoritiven context-sync mit ack/version/order guard nachweist.
- Kein Weitergehen zu P6-T81+, bevor P6-T80 reconnect/inflight replay fuer board-context inkl. `/output/final` bestaetigt.
- Kein Weitergehen zu P6-T83+, bevor P6-T82 die HF11-Kombinationsmatrix inkl. Artefakt-Sync abgeschlossen hat.
- Kein Weitergehen zu P6-T84+, bevor P6-T83 single-entry `CLUSTER` running ohne member-`ROOM`-Duplikate regressionsfrei bestaetigt.
- Kein Weitergehen zu P6-T85+, bevor P6-T84 full-member runtime effect fuer dedupten `CLUSTER`-Run in sync/stagger nachweist.
- Kein Weitergehen zu P6-T86+, bevor P6-T85 konsistente stop/edit propagation auf alle Cluster-Member bestaetigt.
- Kein Weitergehen zu P6-T87+, bevor P6-T86 room-target non-regression (`targetType=room`) gegen HF11-Baseline bestaetigt.
- Kein Weitergehen zu P6-T14+, bevor P6-T88 die HF12-Kombinationsmatrix inkl. Artefakt-Sync abgeschlossen hat.
- Kein Phase-6-Exit ohne Migration-Idempotenznachweis und Reload/Restart-Paritaet.

## Update Rules
- Taskstatus in `TASKS.md` nach jedem abgeschlossenen Task aktualisieren.
- Relevante Architekturentscheidungen in `.planning/STATE.md` Decision Log erfassen.
- Bei Scope-Aenderungen `PLAN.md`, `BACKLOG.md` und `ACCEPTANCE.md` im selben Schritt synchronisieren.

## Execution Update - 6-HF6 Completed (P0/P1)
- Room-vs-Vertex pointer arbitration is closed: vertex-click no longer deselects the selected room or hides handles.
- Direct vertex selection is stable for move/delete without dropdown reselect; delete key and delete panel now resolve against the same active vertex selection.
- Optional low-risk drag UX guard is active: browser text selection is suppressed during room-area drag.
- HF6 regression evidence is recorded in `P6-T53-REGRESSION.md`; subsequent mandatory feedback supersedes this with a new HF7 gate before Plan 6-3.

## Execution Update - 6-HF7 Completed (P0)
- Edge-bubble pointer lifecycle parity is closed: edge click keeps persistent room selection and preserves active edge for insert-vertex without dropdown reselect.
- Room deletion persistence is hardened via board-scoped tombstones (`deletedRoomIds`) with defaults-merge precedence (`tombstone > defaults`).
- Combined HF7 evidence is PASS in `P6-T59-REGRESSION.md`; Plan 6-3 is unblocked.

## Plan Update - 6-HF8 Execute-Ready (P0)
- New mandatory feedback adds a new gate before hardening: room animation draft values must not reset on room switch and cluster UX/flow must support CRUD + stagger start.
- Plan 6-3 is postponed until HF8 passes with combined regression evidence and artifact sync.

## Execution Update - 6-HF8 Completed (P0)
- Draft persistence is closed: room animation draft selection + parameters remain stable across room/target switch and post-start flows.
- Cluster UX is closed: Settings now supports cluster create/edit/delete with board-scoped persistence and refreshed room/cluster target options.
- Cluster start semantics are closed: optional `stagger start` is implemented (`off = synchronous`, `on = short randomized offset`); combined evidence PASS in `P6-T66-REGRESSION.md`.

## Plan Update - 6-HF9 Execute-Ready (P0)
- New mandatory feedback introduces a new P0 gate before hardening: room click must auto-set `target` to the clicked room, while draft persistence explicitly excludes `target` and keeps animation/parameters stable.
- Target dropdown must remain manually operable at all times, including when no room is selected.
- Plan 6-3 is postponed until HF9 passes with combined regression evidence and full artifact sync.

## Execution Update - 6-HF9 Completed (P0)
- Draft contract is now explicit and stable: animation + parameter draft values stay persistent while `target` is excluded from selection-lifecycle resets.
- Room click now auto-fills `target` to the clicked room, and target dropdown stays manually operable even when `selection = none`.
- Manual room/cluster target override remains available after autofill and independent from selection state; combined evidence is PASS in `P6-T71-REGRESSION.md`.

## Plan Update - 6-HF10 Execute-Ready (P0)
- New mandatory feedback introduces a new P0 gate before hardening: cluster fanout currently starts only a subset/first room and must be corrected to all cluster members for both sync and staggered launch.
- Running model/rendering must be expanded with a dedicated `CLUSTER` scope entry (label `CLUSTER` and distinct color), including consistent cluster stop/edit behavior.
- Plan 6-3 is postponed until HF10 passes with combined regression evidence and full artifact sync.

## Execution Update - 6-HF10 Completed (P0)
- Cluster launch fanout now dispatches member-complete for every valid cluster room in both modes (`stagger start off|on`).
- Running model/rendering now exposes a dedicated `CLUSTER` entry with distinct scope color and linked cluster stop/edit semantics.
- HF10 combined regression evidence is PASS in `P6-T76-REGRESSION.md`; Plan 6-3 is unblocked.

## Plan Update - 6-HF11 Execute-Ready (P0)
- New mandatory feedback introduces a new P0 gate before hardening: cluster animations are lifecycle-unstable (short-lived/disappearing after start) and must match room-animation hold-by-default stability.
- Board switch sync is currently non-deterministic; server-authoritative board/layout context sync must be hardened with ack/version/order/reconnect for immediate first-toggle propagation to all clients including `/output/final`.
- Plan 6-3 is postponed until HF11 passes with combined regression evidence and full artifact sync.

## Execution Update - 6-HF11 Completed (P0)
- Cluster lifecycle is now hold-stable: prune/cleanup no longer removes cluster controllers or linked members via parent-race side effects.
- Cluster edit/stop semantics are run-context scoped: cluster edits update the same cluster run in place and reconcile member instances by `animation.id` without cross-run removals.
- Board context sync is reconnect-hardened: mutation-id dedup, stale context replay drop, and socket-generation ordering guards keep first-toggle propagation deterministic across controllers and `/output/final`.
- HF11 combined regression evidence is PASS in `P6-T81-REGRESSION.md`; Plan 6-3 gate is closed.

## Plan Update - 6-HF12 Execute-Ready (P0)
- New mandatory feedback introduces a new P0 gate before hardening: cluster-start behavior is still non-deterministic (`ROOM` duplicates in running list or `CLUSTER`-only row without visible member animation effect).
- HF12 execution is now required before Plan 6-3: enforce single-entry `CLUSTER` running determinism while preserving full-member runtime fanout and consistent cluster stop/edit propagation.
- Closure requires combined PASS evidence for cluster single-entry running + full-member effect + stop/edit propagation + room-target non-regression and complete artifact sync.

## Execution Update - 6-HF12 Completed (P0)
- Running list now enforces canonical cluster-controller projection: one `CLUSTER` row per cluster trigger with no member `ROOM` duplicates in the operator list.
- Runtime fanout remains full-member deterministic for sync + stagger cluster starts, including fallback rendering when live snapshots transiently carry controller-first ordering.
- Stop/Edit from the `CLUSTER` controller remains run-context isolated and propagates across all linked members deterministically.
- Room-target flow (`targetType=room`) remains unchanged and verified via dedicated non-regression evidence.
- Combined HF12 regression evidence is PASS in `P6-T87-REGRESSION.md`; plan gate before 6-3 is closed.
