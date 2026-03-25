# Phase 3 Backlog (Rework 3-7 P0 Hotfix Add-on Execute-Ready)

## Epics
- Separate Room Trigger Engine (Einzelstart/-stop pro Animation)
- Room Animation Pack 7x (`kaputt`, `feuer`, `schleim`, `nest`, `dekompression`, `lichtflackern`, `alarm`)
- Global-Equivalent Room Adapters (`alarm`, `lichtflackern` mit Raum-Clip)
- GIF Runtime Controls (`opacity`, `playbackSpeed` pro Instanz)
- GIF Loop Runtime (echte GIF-Framewiedergabe statt Pulsing-Einzelbild)
- GIF Mapping UI + Persistenz (pro Animation auswaehlbar)
- Direct-Start GIF Mapping Integrity (`room start` respektiert Mapping bis Runtime)
- Board Render Regression Recovery (P0: Animation sichtbar trotz parallel laufendem Audio)
- Preview Flow Removal (UI + State + Routing + Send/Rollback vollstaendig entfernen)
- Direct Live Trigger Restore (kein Preview-Staging, Trigger gehen direkt live)
- Render Visibility Recovery (`global` + `room` + `gif` sofort sichtbar)
- Render-Loop Fault Isolation (Layer-/Clip-Fehler duerfen nie globalen Tick stoppen)
- Clip Compatibility Hardening (Outside-/Ship-Masken robust fuer mobile WebView/Canvas-evenodd)
- Outside Failure Isolation (`outside` fail-open ohne Impact auf `inside`/`room`/`gif`)
- Mobile Visibility Proof (`global` + `room` + `gif` sichtbar/bewegt nach Trigger)
- Architecture Refactor `app.js` -> Module (`state`, `rendering`, `effects`, `audio`, `ui`, `persistence`, `api/save`)
- Refactor Parity & Stability Proof (vor/nach Umbau funktional gleich + stabil)
- Targeted Readability Improvements (Kommentare in nicht-offensichtlichen Bereichen)
- Running List Integrity (1:1 Triggerinstanz zu Runtime-Eintrag)
- Clipping Integrity (raumgenaue Rendergrenzen ohne Leaks)
- Regression & Performance Hardening

## Story Mapping
- P3-S3.1 GIF-Raumanimationen `kaputt`/`feuer`/`schleim` als echte GIF-Frame-Loops wiedergeben (kein Pulsing-Ersatzframe).
- P3-S3.2 GIF-Mapping-UI pro Animation einfuehren (paritaetisch zur Sound-Mapping-Bedienung).
- P3-S3.3 GIF-Mapping-Validierung + Fallback-Regeln definieren (`none`/Default-Asset/ungueltiger Pfad).
- P3-S3.4 Persistenz fuer GIF-Mapping pro Animation sicherstellen (Save/Load/Reload/Restart).
- P3-S3.5 Trigger/Edit/Running-Flows gegen Mapping-Aenderungen bei laufenden Instanzen regressionsfest machen.
- P3-S3.6 Performance-/Stabilitaetstuning fuer parallele echte GIF-Loops umsetzen.
- P3-S3.7 Verifikations- und Artefaktabschluss fuer Plan 3-3 erstellen.
- P3-S4.1 Direct-Start-Pfad fuer GIF-Mapping fixen (`gifAssetPath` muss gemappt in `createAnimation` landen).
- P3-S4.2 Regression fuer Direct-Start + Edit-Flow + Reload als Pflichttest aufnehmen.
- P3-S4.3 Acceptance-/Artefakt-Sync fuer Ende-zu-Ende-GIF-Mapping abschliessen.
- P3-S5.1 Kritischen Regression-Bug beheben: Board-Animationen rendern wieder sichtbar und kontinuierlich.
- P3-S5.2 Render-Engine gegen Audio-entkoppelte Stillstaende hardenen (Render-Tick bleibt robust bei aktivem Sound).
- P3-S5.3 `app.js` in klare Modulstruktur aufteilen (`state`, `rendering`, `effects`, `audio`, `ui`, `persistence`, `api/save`).
- P3-S5.4 Integrationsfluesse nach Modultrennung stabilisieren (Trigger/Direct-Start/Edit/Stop/Reload/Save).
- P3-S5.5 Lesbarkeit in nicht-offensichtlichen Bereichen durch gezielte Kommentare verbessern.
- P3-S5.6 Funktionale Paritaet + Stabilitaet nach Refactor via Regression/Soak + Artefakt-Sync nachweisen.
- P3-S6.1 Preview-Flow vollstaendig entfernen (UI, State, Routing, Send, Rollback).
- P3-S6.2 Direkten Live-Trigger-Flow fuer Start/Edit/Stop als alleinigen Pfad wiederherstellen.
- P3-S6.3 Render-Pipeline-Hotfix: aktive Animationen sind sofort sichtbar fuer `global`/`room`/`gif`.
- P3-S6.4 Running-Liste sowie `Stop`/`Edit` nach Hotfix instanzkonsistent stabilisieren.
- P3-S6.5 Regression + Soak als P0-Stabilitaetsgate fuer Hotfix-Pfade dokumentieren.
- P3-S6.6 Refactor-Resume-Gate dokumentieren (weiterer Umbau erst nach stabilem P0-Fix).
- P3-S7.1 Render-Loop fail-safe machen: einzelner Layer-/Clip-Path-Fehler darf Draw-Tick nicht beenden.
- P3-S7.2 Outside-/Ship-Clipping kompatibel hardenen (Capability-Detection + evenodd-Fallback fuer mobile WebView).
- P3-S7.3 Outside-Layer-Fehler isolieren: Inside/Room/GIF laufen sichtbar weiter.
- P3-S7.4 Mobile-Flow-Nachweis verpflichtend machen: nach Trigger sind globale + room + GIF-Effekte sichtbar.
- P3-S7.5 Reopen-Regression + Soak fuer Root-Cause-Fix dokumentieren.
- P3-S7.6 Artefakte/Acceptance/Execute/State/Roadmap konsistent auf Plan 3-7 synchronisieren.

## Priorisierte Umsetzungsstrecke - Plan 3-3 (verbindlich)

### Prioritaet P0 - Erste Ausfuehrungswelle
- Story P3-S3.1: GIF-Runtime-Fix fuer echte Frame-Loops.
  - Ziel: `kaputt`/`feuer`/`schleim` spielen eingebettete GIF-Loops sichtbar und fortlaufend ab.
- Story P3-S3.2 + P3-S3.3: GIF-Mapping-UI + Validierung.
  - Ziel: Operator kann pro Animation ein GIF waehlen (inkl. `none`/Fallback) ohne Runtime-Fehler.
- Story P3-S3.4: Persistenz fuer GIF-Mapping.
  - Ziel: Mapping bleibt ueber Save/Reload/Restart sowie Board-Wechsel deterministisch erhalten.
- Story P3-S3.5: Trigger/Edit/Running-Hardening unter Mapping-Aenderung.
  - Ziel: laufende Instanzen bleiben kontrollierbar; kein ID-/State-Drift in der Running-Liste.

### Prioritaet P1 - Hardening danach
- Story P3-S3.6: Performance-/Stabilitaetshardening fuer Multi-GIF-Loop-Betrieb.
  - Ziel: keine sichtbaren Framedrops oder Bedienlatenzen bei parallelen GIF-Raumanimationen.
- Story P3-S3.7: Abschlussnachweise.
  - Ziel: Plan-3-3-Abnahme formal und nachvollziehbar dokumentiert.

## Priorisierte Umsetzungsstrecke - Plan 3-4 Hotfix (verbindlich)

### Prioritaet P0 - Hotfix zuerst
- Story P3-S4.1: Direct-Start nutzt gemapptes GIF Ende-zu-Ende.
  - Ziel: `room start` materialisiert den Mapping-Wert als `gifAssetPath` in `createAnimation` statt implizitem Default.

### Prioritaet P1 - Nachgelagerte Absicherung
- Story P3-S4.2: Regression Direct-Start -> Edit -> Reload.
  - Ziel: Mapping bleibt ueber den kompletten Bedienpfad deterministisch und instanzkonsistent.
- Story P3-S4.3: Artefakt-/Acceptance-Sync.
  - Ziel: Planungsdokumente und Pflichtabnahme bilden den Hotfix-End-to-End-Nachweis konsistent ab.

## Priorisierte Umsetzungsstrecke - Plan 3-5 Rework (verbindlich)

### Prioritaet P0 - Sofortmassnahmen
- Story P3-S5.1: Board-Render-Regression schliessen.
  - Ziel: aktive Animationen sind auf dem Board wieder sichtbar; Audio-only-Lauf ist ausgeschlossen.
- Story P3-S5.2: Render-/Audio-Entkopplung hardenen.
  - Ziel: Render-Timer/Draw-Pipeline bleibt auch bei Audio-Loop, Stop, Clear-All und Edit robust aktiv.
- Story P3-S5.3: Pflicht-Refactor `app.js` in Module.
  - Ziel: klare Modulgrenzen fuer `state`, `rendering`, `effects`, `audio`, `ui`, `persistence`, `api/save` ohne monolithische Kernlogik.
- Story P3-S5.4: Integrationshygiene nach Refactor.
  - Ziel: Trigger, Running-Liste, Edit, Direct-Start, Reload und Save/Load bleiben funktional konsistent.

### Prioritaet P1 - Nachgelagerte Absicherung
- Story P3-S5.5: Lesbarkeits-Upgrade.
  - Ziel: nicht-offensichtliche Pfade sind mit praezisen Kommentaren nachvollziehbar.
- Story P3-S5.6: Paritaet + Stabilitaet.
  - Ziel: Regression/Soak zeigen keine Funktionsverluste oder neue Instabilitaet durch Refactor.

## Priorisierte Umsetzungsstrecke - Plan 3-6 P0 Hotfix (verbindlich)

### Prioritaet P0 - Blocker sofort schliessen
- Story P3-S6.1: Preview-Flow komplett entfernen.
  - Ziel: kein Preview-UI-State, kein Preview-Routing und keine Send/Rollback-Pfade mehr im Runtime-Flow.
- Story P3-S6.2: Direkter Live-Trigger wiederherstellen.
  - Ziel: Start/Edit/Stop gehen ohne Zwischenstaging direkt auf die Live-Runtime.
- Story P3-S6.3: Sichtbares Rendering fuer alle Animationsarten fixen.
  - Ziel: `global`, `room` und GIF-basierte Effekte sind sofort sichtbar; Audio-only-Lauf gilt als Fehler.
- Story P3-S6.4: Running/Stop/Edit-Integritaet halten.
  - Ziel: Running-Liste bleibt 1:1 zur Runtime-Instanz, `Stop`/`Edit` bleiben stabil.

### Prioritaet P1 - Stabilisieren und danach erst weitermachen
- Story P3-S6.5: Hotfix-Regression + Soak als Exit-Gate.
  - Ziel: keine Regressionsdrift in Trigger-, Edit-, Stop-, Reload- und Save/Load-Pfaden.
- Story P3-S6.6: Refactor-Resume-Gate.
  - Ziel: weiterer Architektur-Refactor wird bis zum stabilen P0-Nachweis eingefroren und erst danach wieder aufgenommen.

## Priorisierte Umsetzungsstrecke - Plan 3-7 P0 Hotfix Add-on (verbindlich)

### Prioritaet P0 - Root-Cause zuerst
- Story P3-S7.1: Render-Loop-Fehlertoleranz.
  - Ziel: Render-Tick bleibt immer aktiv; einzelne Layer-/Clip-Exceptions werden lokal abgefangen und nur der betroffene Layer faellt aus.
- Story P3-S7.2: Browserrobustes Outside-/Ship-Clipping.
  - Ziel: Outside- und Inside-Masken funktionieren deterministisch in Desktop-Browsern und mobilen WebViews, auch wenn evenodd nicht verlaesslich ist.
- Story P3-S7.3: Outside-Isolation.
  - Ziel: Fehler im Outside-Layer koennen Inside/Room/GIF nicht mehr blockieren; sichtbare Animationen laufen weiter.
- Story P3-S7.4: Mobiler Sichtbarkeits-Hartnachweis.
  - Ziel: im Mobile-Flow sind nach Trigger mindestens globale + room + GIF-Effekte sichtbar und bewegend.

### Prioritaet P1 - Abschluss danach
- Story P3-S7.5: Reopen-Regression + Soak.
  - Ziel: P0-Fix bleibt stabil unter Trigger/Edit/Stop/Reload/Save-Load inklusive Mobile-Fokus.
- Story P3-S7.6: Vollstaendiger Artefakt-Sync.
  - Ziel: PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP sind konsistent und execute-ready.

## Status
- Plan 3-2 bleibt abgeschlossen; Nachweise in `3-2-VERIFICATION.md`, `P3-T23-REGRESSION.md`, `P3-T24-SOAK.md`.
- Rework-Welle Plan 3-3 ist umgesetzt; Nachweise in `3-3-VERIFICATION.md`, `P3-T30-REGRESSION.md`, `P3-T30-SOAK.md`.
- Plan 3-4 Hotfix-Add-on ist umgesetzt; Nachweise in `3-4-VERIFICATION.md` und `P3-T33-REGRESSION.md`.
- Plan 3-5 Rework ist abgeschlossen; Nachweise in `3-5-VERIFICATION.md`, `P3-T42-REGRESSION.md`, `P3-T43-SOAK.md`.
- Plan 3-6 ist formal abgeschlossen, aber durch die 3. P0-Blocker-Meldung als Reopen-Basis markiert.
- Plan 3-7 ist abgeschlossen; Nachweise in `3-7-VERIFICATION.md`, `P3-T55-REGRESSION.md`, `P3-T55-SOAK.md`.
