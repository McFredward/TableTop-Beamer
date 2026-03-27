# Phase 8 Tasks

Statuslegende: TODO | IN-PROGRESS | DONE
Prioritaetslabel: [P0] kritisch | [P1] hoch | [P2] mittel

## Plan 8-1 - Multi-Play-Area + Image Import Core Wave (erste Ausfuehrungswelle, execute-ready)
- [x] DONE P8-T1 [P0] Datenmodell auf `playAreas[]` heben (IDs, Polygonstruktur, Legacy-Ladealias fuer Single-Play-Area).
- [x] DONE P8-T2 [P0] Idempotente Migration implementieren: bestehende `playAreaPolygon`/Legacy-Ship-Daten verlustfrei in `playAreas[]` ueberfuehren.
- [x] DONE P8-T3 [P0] Persistenz-/Normalizer-Pfad aktualisieren: Save exportiert Mehrbereichsschema, Load akzeptiert Legacy+neu.
- [x] DONE P8-T4 [P0] Settings-Editor erweitern: mehrere Play-Areas anlegen/loeschen/auswaehlen (inkl. Guard fuer Loeschpfad).
- [x] DONE P8-T5 [P0] Editor-Interaktion haerten: aktive Play-Area steuert Vertex-/Polygonaktionen deterministisch.
- [x] DONE P8-T6 [P0] Union-Geometriepfad implementieren: inside/outside nutzt Vereinigung aller Play-Areas statt Single-Polygon.
- [x] DONE P8-T7 [P0] Render-/Clipping-/Hit-Test-Paritaet fuer Union-Maske absichern (kein Semantikdrift zwischen Render und Input).
- [x] DONE P8-T8 [P0] Server-API fuer Bildupload-Import implementieren (`jpg`/`jpeg`/`png`/`webp`, multipart, validiert).
- [x] DONE P8-T9 [P0] Upload-Speicherpfad + Board-Katalogintegration umsetzen (serverseitig persistiert, sofort auswahlbar).
- [x] DONE P8-T10 [P0] Import-UX erweitern: JSON und Bild als gleichwertige Importoptionen; Bildimport endet im manuellen Polygon-Workflow.
- [x] DONE P8-T11 [P0] Regression/Verifikation ausfuehren: Migration, Multi-Area-Union, Upload-Negativfaelle, Non-Regression fuer Running/Sync/Final.
- [x] DONE P8-T12 [P0] Artefakt-Sync abschliessen: `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE` auf 8-1 Stand bringen.

## Plan 8-HF1 - Selection + Import Activation Hotfix (priorisierte P0-Welle, execute-ready)
- [x] DONE P8-T18 [P0] Settings-Input-Arbitration fixen: Play-Area-Selektion per Board-Klick vollstaendig entfernen.
- [x] DONE P8-T19 [P0] Room-Klick-Selektion haerten: Room wird bei no-move Click deterministisch aktiv selektiert (ohne Hold-Requirement).
- [x] DONE P8-T20 [P0] Non-Regression absichern: Room-Edit-Flow (Vertex/Polygon/Keyboard) bleibt nach Selection-Fix stabil.
- [x] DONE P8-T21 [P0] Image-Import-Success-Apply fixen: erfolgreicher Import aktualisiert Board-Katalog und Dropdown sofort sichtbar.
- [x] DONE P8-T22 [P0] Post-Import-Auto-Select implementieren: neu importiertes Board wird direkt als aktives Board gesetzt.
- [x] DONE P8-T23 [P0] Empty-Start-Guard validieren: importierte Bildboards ohne Start-Polygone sind editierbar und crashfrei.
- [x] DONE P8-T24 [P0] Hotfix-Verifikation + Artefakt-Sync abschliessen: `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE` auf 8-HF1 Stand.

## Plan 8-HF2 - Outside Animations Mars Feature Pack (priorisierte P0-Welle, execute-ready)
- [x] DONE P8-T25 [P0] Outside-Animationsdatenmodell erweitern: mehrere Definitionen inkl. `assetType`, `assetRef`, `boomerang`, animation-spezifischer Settings.
- [x] DONE P8-T26 [P0] Neue verpflichtende Animation `Outside Sandstorm` auf `sandstorm.mp4` integrieren (immer stumm, kein Audio).
- [x] DONE P8-T27 [P0] Optionales Boomerang-Playback fuer Outside-Animationen implementieren (vorwaerts/rueckwaerts-loop) inkl. Start/Stop/Clear-Paritaet.
- [x] DONE P8-T28 [P0] Settings-Refactor umsetzen: Outside-Animationscontrols aus `Play Area Editor` in eigene Sektion `Outside Animations` verschieben.
- [x] DONE P8-T29 [P0] Outside-Animation-Editor liefern: Dropdown fuer bearbeitete Animation + per-animation Boomerang/Settings.
- [x] DONE P8-T30 [P0] Asset-Mapping im UI editierbar machen: Quelle pro Animation als `gif`, `mp4` oder coded animation key konfigurierbar.
- [x] DONE P8-T31 [P0] Create-Flow fuer neue Outside-Animationen in UI implementieren (anlegen, direkt bearbeiten, runtime-nutzbar).
- [x] DONE P8-T32 [P0] Resource-Asset-Picker integrieren: vorhandene Dateien aus `resources` auswaehlbar und als `assetRef` uebernehmbar.
- [x] DONE P8-T33 [P0] Persistenz erweitern: Outside-Animationsdefinitionen + Settings ueber Profile/Defaults speichern/laden (inkl. Legacy-Migration/Guards).
- [x] DONE P8-T34 [P0] P0-Verifikation + Artefakt-Sync abschliessen: `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE` auf 8-HF2 Stand.

## Plan 8-HF3 - Outside Editor Regression Hotfix (priorisierte P0-Welle, execute-ready)
- [x] DONE P8-T35 [P0] `Coded/Space` Regression fixen: coded asset path/runtime mapping wiederherstellen (kein schwarzer No-Op).
- [x] DONE P8-T36 [P0] `Outside Sandstorm` Playback stabilisieren: Flackern/Rewind-Restartloop entfernen, kontinuierliche Wiedergabe absichern.
- [x] DONE P8-T37 [P0] Outside-Editor Input-Stabilitaet fixen: Boomerang-Checkbox wieder setzbar und Asset-Type-Dropdown stabil editierbar machen.
- [x] DONE P8-T38 [P0] UX-Absicherung liefern: `Apply changes` Button einfuehren und Type/Resource/Optionen atomar gemeinsam committen.
- [x] DONE P8-T39 [P0] Non-Regression + Persistenzmatrix ausfuehren: Apply/Save/Reload/Restart fuer `assetType`/`assetRef`/`boomerang`/coded key absichern.
- [x] DONE P8-T40 [P0] Hotfix-Verifikation + Artefakt-Sync abschliessen: `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE` auf 8-HF3 Stand.

## Plan 8-HF4 - Coded/Picker/Boomerang Regression Hotfix (priorisierte P0-Welle, execute-ready)
- [x] DONE P8-T41 [P0] `Coded/Space` erneut auf den zuletzt funktionierenden coded Star-Space Render-/Resolverpfad zurueckfuehren (kein Black-Screen/Fallback).
- [x] DONE P8-T42 [P0] Asset-Picker typspezifisch machen: `coded` zeigt nur coded renderer keys.
- [x] DONE P8-T43 [P0] Asset-Picker typspezifisch machen: `mp4` zeigt nur `.mp4` Dateien aus `resources`; `gif` zeigt nur `.gif` Dateien aus `resources`.
- [x] DONE P8-T44 [P0] Asset-Type-Wechsel haerten: Picker-Liste aktualisiert deterministisch ohne stale Optionen/Auto-Revert.
- [x] DONE P8-T45 [P0] Boomerang-Playback als stabile Forward->Reverse-State-Machine umsetzen (vollstaendige Enden, endlose Wiederholung, kein sichtbares Flicker/Restart-Jump).
- [x] DONE P8-T46 [P0] Hotfix-Verifikation + Artefakt-Sync abschliessen: `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE` auf 8-HF4 Stand.

## Plan 8-HF5 - Sandstorm Reverse-Lifecycle Flicker Hotfix (priorisierte P0-Welle, execute-ready)
- [x] DONE P8-T47 [P0] Reverse-Lifecycle Root-Cause Analyse fuer `Outside Sandstorm` durchfuehren (Forward-Ende -> Reverse-Start -> Reverse-Ende) und konkrete Flicker-Ursache isolieren.
- [x] DONE P8-T48 [P0] Boomerang-Reverse-Playback fixen: stabiler full-cycle Loop (`forward -> reverse -> repeat`) ohne sichtbares Flackern im Reverse-Abschnitt.
- [x] DONE P8-T49 [P0] MP4-Non-Boomerang-Non-Regression absichern: normales Vorwaerts-Loop-Playback bleibt unveraendert stabil.
- [x] DONE P8-T50 [P0] Outside-Editor Apply/Persistenz absichern: `boomerang`/`assetType`/`assetRef` bleiben ueber `Apply changes`, Save/Reload/Restart deterministisch intakt.
- [ ] TODO P8-T51 [P0] Regression- und Evidence-Artefakte erstellen (Root-Cause-Protokoll + Playback-Matrix + Non-Regression-Nachweis).
- [ ] TODO P8-T52 [P0] Hotfix-Verifikation + Artefakt-Sync abschliessen: `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE` auf 8-HF5 Stand.

## Plan 8-2 - Hardening Wave (nach 8-HF5)
- [ ] TODO P8-T13 [P1] Multi-Area UX-Polish (z. B. area naming, visibility toggles, duplicate/clone shortcuts).
- [ ] TODO P8-T14 [P1] Migration/Import Soak-Tests unter wiederholten Save/Reload/Restart-Zyklen dokumentieren.
- [ ] TODO P8-T15 [P1] Performance-Hardening fuer Union-Berechnung bei vielen Areas/Vertices validieren.

## Plan 8-3 - Production Gate Wave (nach 8-2)
- [ ] TODO P8-T16 [P1] Multi-Client Realsetup-Abnahme mit Multi-Play-Area + Image-Import auf control + `/output/final` durchfuehren.
- [ ] TODO P8-T17 [P1] Finale Betreiberabnahme und Rollout-/Fallback-Checkliste dokumentieren.
