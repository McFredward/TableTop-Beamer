# Phase 3 Plan (Rework 3-7 P0 Hotfix Add-on Execute-Ready)

## Zielbild
Phase 3 wird nach Rework 3-6 wegen eines weiterhin offenen, mehrfach gemeldeten P0-Blockers mit Rework 3-7 fortgesetzt: Board bleibt in kritischen Pfaden statisch, obwohl Audio laeuft. Fokus ist Root-Cause-Hardening der Render-Pipeline, damit (1) der Render-Loop nie komplett ausfaellt, (2) Outside-/Ship-Clipping browserrobust ist (insb. mobile WebView/Canvas-evenodd), (3) Outside-Fehler nicht auf Inside/Room/GIF durchschlagen und (4) mobile Sichtbarkeit fuer globale + room + GIF-Effekte nach Trigger hart nachgewiesen ist. Preview bleibt vollstaendig entfernt.

## Scope
- Separates Trigger-Modell pro Raumanimation mit Start/Stop je Instanz.
- Verbindliches Set separater Raum-Animationen: `kaputt`, `feuer`, `schleim`, `nest`, `dekompression`, `lichtflackern`, `alarm`.
- Running-Uebersicht zeigt jede aktive Raumanimation als separaten Runtime-Eintrag.
- `alarm` und `lichtflackern` nutzen globale Effektpfade als Aequivalent, aber strikt auf den Zielraum geclippt.
- GIF-Runtime-Wiedergabe fuer `kaputt`/`feuer`/`schleim` als echte Frame-Loops (kein statischer Frame mit Puls-Ersatz).
- Pro Animation ist das GIF in der UI auswaehlbar (analog Sound-Mapping), mit validierter Asset-Liste und persistenter Speicherung.
- GIF-Instanzparameter pro laufender Animation steuerbar: Transparenz (`opacity`) und Abspielgeschwindigkeit (`playbackSpeed`).
- Preview-Flow ist vollstaendig entfernt; es gibt keinen Preview/Send/Rollback-Zwischenzustand mehr.
- Direkter Live-Trigger ist wieder der einzige Bedienpfad fuer Start/Edit/Stop.
- Default-Verhalten fuer Raum-Animationen: `hold` bis expliziter Stop.
- Clipping-Integritaet fuer alle Raumanimationen ohne Leaks in Nachbarraeume/Outside-Bereiche.
- Kritischer Render-Bug ist geschlossen: Board-Animationen rendern wieder deterministisch und sofort sichtbar fuer `global` + `room` + `gif`, auch wenn Audio parallel laeuft.
- Render-Loop ist fehlertolerant pro Layer: Ein einzelner Layer-/Clip-Path-Fehler darf nie den globalen Draw-Tick stoppen.
- Outside-/Ship-Clipping besitzt kompatible Fallback-Pfade fuer Browser/WebView ohne verlaessliches Canvas-evenodd.
- Fehler im Outside-Layer sind strikt isoliert; Inside/Room/GIF laufen sichtbar weiter.
- Running-Liste inklusive `Stop`/`Edit` bleibt durchgehend funktionsfaehig.
- Refactor-Fortsetzung startet erst nach stabilem P0-Nachweis (kein Parallelumbau waehrend Hotfix).

## Out of Scope
- Neue Spielmechanik oder Regelautomatisierung.
- Vollstaendig neuer Effekt-Editor.
- Multi-Client-Sync oder Netzwerksteuerung.
- Freies Hochladen beliebiger Dateien als GIF-Quelle.

## Milestones (priorisiert)
1. Plan 3-6 P0 Preview-Removal: Preview-Flow vollstaendig entfernen und direkten Live-Trigger-Flow wiederherstellen.
2. Plan 3-6 P0 Render-Recovery: sichtbares Rendering fuer alle Animationsarten (`global`, `room`, `gif`) sofort stabilisieren.
3. Plan 3-6 P0 Runtime-Paritaet: Running-Liste sowie `Stop`/`Edit` ohne Drift sicherstellen.
4. Plan 3-6 P0 Stabilitaets-Gate: Regression + Soak fuer Hotfix-Pfade abschliessen.
5. Plan 3-6 P1 Refactor-Resume-Gate: weiterer Architektur-Refactor erst nach bestandenem P0-Gate.
6. Plan 3-7 P0 Root-Cause-Hotfix: Render-Loop-Fehlertoleranz + Clip-Kompatibilitaet + Outside-Isolation + Mobile-Sichtbarkeitsnachweis.

## Plan 3-3 (Rework-Welle, execute-ready)

### Prioritaet P0
- P3-S3.1 GIF-Runtime fuer `kaputt`/`feuer`/`schleim` auf echte GIF-Frame-Loop-Wiedergabe umstellen.
- P3-S3.2 UI-Mapping pro Raumanimation fuer GIF-Quelle einfuehren (analog Sound-Mapping, inkl. `none`/Fallback-Regel).
- P3-S3.3 Persistenzmodell fuer GIF-Mapping pro Animation integrieren (Save/Load/Reload/Restart stabil).
- P3-S3.4 Trigger/Edit/Running-Flow auf Mapping-Aenderungen hardenen (kein Drift bei laufenden Instanzen).

### Prioritaet P1
- P3-S3.5 Regression- und Performance-Hardening fuer echte GIF-Loops bei Mehrfachbetrieb.
- P3-S3.6 Dokumentations- und Verifikationsabschluss fuer Rework Plan 3-3.

## Plan 3-4 (Hotfix Add-on, execute-ready)

### Prioritaet P0
- P3-S4.1 Direct-Start-Flow auf gemappten GIF-Pfad verdrahten, damit `createAnimation` nicht auf Default-GIF zurueckfaellt.

### Prioritaet P1
- P3-S4.2 Regression explizit fuer Direct-Start + Edit-Flow + Reload ergaenzen.
- P3-S4.3 Artefakte/Acceptance synchronisieren, damit GIF-Mapping Ende-zu-Ende nachweisbar greift.

## Plan 3-5 (P0 Regression + Pflicht-Refactor, execute-ready)

### Prioritaet P0
- P3-S5.1 Kritischen Render-Regression-Bug fixen: Board rendert Animationen wieder sichtbar und kontinuierlich.
- P3-S5.2 Render-/Audio-Entkopplung hardenen: Renderpfad darf durch Audio-Lifecycle nicht ausfallen oder stillstehen.
- P3-S5.3 `app.js` entlang klarer Modulgrenzen aufteilen (`state`, `rendering`, `effects`, `audio`, `ui`, `persistence`, `api/save`).
- P3-S5.4 Integrationspfade nach Refactor stabilisieren (Trigger, Direct-Start, Edit, Stop, Reload, Save/Load).

### Prioritaet P1
- P3-S5.5 Lesbarkeit gezielt verbessern: Kommentare fuer nicht-offensichtliche Kontrollfluesse, Timing- und Fallback-Logik.
- P3-S5.6 Funktionale Paritaet + Stabilitaet per Regression/Soak nachweisen und Artefakte konsistent abschliessen.

## Plan 3-6 (P0 Hotfix Preview-Removal + Render-Recovery, execute-ready)

### Prioritaet P0
- P3-S6.1 Preview-Flow vollstaendig entfernen (UI + State + Routing + Send/Rollback).
- P3-S6.2 Direkten Live-Trigger-Flow fuer Start/Edit/Stop wieder als alleinigen Runtime-Pfad herstellen.
- P3-S6.3 Render-Pipeline fixen: aktive Animationen sind sofort sichtbar fuer `global`, `room`, `gif`.
- P3-S6.4 Running-Liste/Stop/Edit gegen Hotfix-Regression absichern (instanzkonsistent, kein Drift).

### Prioritaet P1
- P3-S6.5 P0-Stabilitaetsnachweis via Regression + Soak + Artefakt-Sync abschliessen.
- P3-S6.6 Refactor-Resume-Gate dokumentieren: weiterer Umbau erst nach stabilem P0-Fix fortsetzen.

## Plan 3-7 (P0 Hotfix Add-on Root-Cause-Fokus, execute-ready)

### Prioritaet P0
- P3-S7.1 Render-Loop-Hardening: globaler Draw-Tick faellt nie komplett aus, auch wenn einzelne Layer/Clip-Paths fehlschlagen.
- P3-S7.2 Clip-Kompatibilitaet fuer Outside/Ship robust machen (mobile WebView/Canvas-evenodd mit deterministic Fallback).
- P3-S7.3 Outside-Fehler strikt isolieren: Inside/Room/GIF rendern weiter, ohne Kaskaden-Freeze.
- P3-S7.4 Mobile-Flow-Pflichttest nach Trigger: globale + room + GIF-Effekte sind sichtbar und bewegend nachweisbar.

### Prioritaet P1
- P3-S7.5 Regression + Soak + Artefakt-Sync als Reopen-Exit-Gate fuer den P0-Blocker abschliessen.

## Definition of Done
- Stories und Tasks aus `BACKLOG.md` und `TASKS.md` fuer Plan 3-3 sind abgeschlossen.
- Stories und Tasks aus `BACKLOG.md` und `TASKS.md` fuer Plan 3-4 sind abgeschlossen.
- Stories und Tasks aus `BACKLOG.md` und `TASKS.md` fuer Plan 3-5 sind abgeschlossen.
- Stories und Tasks aus `BACKLOG.md` und `TASKS.md` fuer Plan 3-6 sind abgeschlossen.
- Stories und Tasks aus `BACKLOG.md` und `TASKS.md` fuer Plan 3-7 sind abgeschlossen.
- Jede Raum-Animation ist einzeln start-/stoppbar und wird separat in der Running-Uebersicht gefuehrt.
- Das 7er-Set (`kaputt`, `feuer`, `schleim`, `nest`, `dekompression`, `lichtflackern`, `alarm`) ist vollstaendig und funktionsgleich verfuegbar.
- `alarm` und `lichtflackern` laufen als globale Aequivalente mit strikt raumbegrenztem Clipping.
- `kaputt`/`feuer`/`schleim` laufen als echte GIF-Loops; `opacity` und `playbackSpeed` sind pro Instanz steuerbar.
- GIF-Mapping ist pro Animation in der UI auswaehlbar, validiert und persistent gespeichert.
- Raumanimationen bleiben standardmaessig im `hold`-Modus aktiv, bis explizit gestoppt.
- Keine sichtbaren Clipping-Leaks in Nachbarraeume oder ausserhalb der Zielmasken.
- Preview-Flow ist vollstaendig entfernt; keine UI-/State-/Routing-/Send-/Rollback-Reste sind aktiv.
- Kritischer Regression-Bug ist geschlossen: laufende Animationen sind auf dem Board sichtbar (global + room + gif), waehrend Audio weiterhin korrekt arbeitet.
- Render-Loop bleibt unter Layer-/Clip-Fehlern aktiv; kein Komplettausfall des Draw-Ticks.
- Outside-/Ship-Clipping arbeitet browserrobust inkl. Fallback bei evenodd-Inkompatibilitaet.
- Outside-Layer-Fehler stoppen Inside/Room/GIF-Animationen nicht.
- Mobiler Trigger-Flow zeigt nachweisbar sichtbare und bewegte globale + room + GIF-Effekte.
- Running-Liste sowie `Stop`/`Edit` bleiben instanzscharf und stabil bedienbar.
- Refactor-Fortsetzung startet erst nach dokumentiert stabilem P0-Hotfix-Gate.
- Performance-/Stabilitaetskriterien aus `ACCEPTANCE.md` sind nachgewiesen.

## Referenz
- Verbindliches User-Feedback fuer Phase-3-Rework 3-3 (echte GIF-Loops statt Pulsing-Einzelbild + GIF-Auswahl pro Animation in der UI mit Persistenz).
- Neues verpflichtendes Feedback fuer Phase-3-Rework 3-5 (P0 Render-Regression-Fix + Pflicht-Architektur-Refactor + Lesbarkeits-/Stabilitaetsnachweis).
- Neues verpflichtendes Feedback fuer Phase-3-Rework 3-6 (Preview komplett entfernen, sofort sichtbares Rendering wiederherstellen, Running/Stop/Edit stabil halten, Refactor erst danach fortsetzen).
- Neues verpflichtendes Feedback fuer Phase-3-Rework 3-7 (3. P0-Blocker-Meldung): Render-Loop darf nicht komplett ausfallen, Outside-/Ship-Clipping muss browserrobust sein, Outside-Fehler duerfen keine Inside/Room/GIF-Ausfaelle erzeugen, mobiler Sichtbarkeitsnachweis ist Pflicht.

## Execution Status
- Plan 3-2 (P3-T13..P3-T25): completed, siehe `3-2-VERIFICATION.md`.
- Plan 3-3 (P3-T26..P3-T31): completed, siehe `3-3-VERIFICATION.md`.
- Plan 3-4 (P3-T32..P3-T34): completed, siehe `3-4-VERIFICATION.md` und `P3-T33-REGRESSION.md`.
- Plan 3-5 (P3-T35..P3-T44): completed, siehe `3-5-VERIFICATION.md`, `P3-T42-REGRESSION.md`, `P3-T43-SOAK.md`.
- Plan 3-6 (P3-T45..P3-T50): completed, siehe `3-6-VERIFICATION.md`, `P3-T49-REGRESSION.md`, `P3-T49-SOAK.md`.
- Plan 3-7 (P3-T51..P3-T56): completed, siehe `3-7-VERIFICATION.md`, `P3-T55-REGRESSION.md`, `P3-T55-SOAK.md`.
