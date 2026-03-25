# ROADMAP

## Direction
Liefere zuerst einen stabilen Vertical Slice fuer OG-Nemesis (Phase 1), erweitere danach auf wiederholbaren Session-Betrieb mit Profilen und Datenzonen (Phase 2) und priorisiere in Phase 3 den direkten Live-Trigger-Betrieb ohne Preview-Zwischenflow.

## Phase 1 - Vertical Slice + Priority Add-on inkl. Plan-Update-19 (Completed)
Ziel: Operator kann Board waehlen, kalibrieren, Effekte triggern und jederzeit sicher stoppen.

Status: 121/121 Tasks inkl. Plan-Update-19 abgeschlossen (siehe `.planning/phases/phase-01/1-1-SUMMARY.md`, `.planning/phases/phase-01/1-2-SUMMARY.md`, `.planning/phases/phase-01/1-3-SUMMARY.md`, `.planning/phases/phase-01/1-4-SUMMARY.md`, `.planning/phases/phase-01/1-5-SUMMARY.md`, `.planning/phases/phase-01/1-6-SUMMARY.md`, `.planning/phases/phase-01/1-7-SUMMARY.md`, `.planning/phases/phase-01/1-8-SUMMARY.md`, `.planning/phases/phase-01/1-9-SUMMARY.md`, `.planning/phases/phase-01/1-10-SUMMARY.md`, `.planning/phases/phase-01/1-11-SUMMARY.md`, `.planning/phases/phase-01/1-12-SUMMARY.md`, `.planning/phases/phase-01/1-13-SUMMARY.md`, `.planning/phases/phase-01/1-14-SUMMARY.md`, `.planning/phases/phase-01/1-15-SUMMARY.md`, `.planning/phases/phase-01/1-16-SUMMARY.md`, `.planning/phases/phase-01/1-17-SUMMARY.md`, `.planning/phases/phase-01/1-18-SUMMARY.md`, `.planning/phases/phase-01/1-19-SUMMARY.md`, `.planning/phases/phase-01/1-20-SUMMARY.md`, `.planning/phases/phase-01/1-21-SUMMARY.md`).

Milestones:
1. Projection Core: Board-Auswahl + Kalibrierung stabil.
2. Effects Core: Ambient + Event-Trigger + Master-Intensity.
3. Operator UX: kompaktes Dashboard mit klaren Zustandsanzeigen.
4. Safety Hardening: `Clear All` priorisiert, Lastchecks, Fixes.
5. Priority Add-on: Power-Outage-Hardening, Room-Click + Per-Room Mapping, Output-Routing mit Fallback.

Exit Criteria:
- Stories aus Phase-1-Backlog inkl. Akzeptanzkriterien umgesetzt.
- Bedienbarkeit auf Desktop und kleinem Display gegeben.
- Reproduzierbarer Safety-Stop auch unter Last.

## Phase 2 - Session Betrieb (In Progress)
Ziel: Schnellstart pro Spielabend, reproduzierbare Kalibrierung, datengetriebene Zonen, Preview/Kombi/Absenden fuer Live-Ausgabe.

Status: 32/47 Tasks abgeschlossen (P2-T1..P2-T10, P2-T26..P2-T47); Gap-Closure Add-on fuer externe Zonen + Preview/Live/Rollback + README ist abgeschlossen, siehe `.planning/phases/phase-02/2-1-SUMMARY.md`, `.planning/phases/phase-02/2-2-SUMMARY.md`, `.planning/phases/phase-02/2-3-SUMMARY.md`, `.planning/phases/phase-02/2-4-SUMMARY.md`, `.planning/phases/phase-02/2-5-SUMMARY.md`.

Milestones:
1. Core Data: Profile + Zone-JSON.
2. Control: Hotkeys + Presets + Safety-Feinschliff.
3. Preview/Live: aktive Session-Anzeige, Preview-Panel, Kombinationen, Absenden.
4. Hardening: Debug-Overlay, Soak-Test, UX-Polish.
5. Abschluss-Add-on: externe Zonen mit Validator/Fallback, echter Preview/Kombi/Absenden-Flow mit Rollback, README-Finalisierung.

Exit Criteria:
- Phase-2-Stories mit Akzeptanzkriterien umgesetzt.
- Laufzeit- und Bedien-Checks dokumentiert.
- README auf neuen Session-Workflow aktualisiert.

## Phase 3 - Nemesis Animations Overhaul (Completed)
Ziel: Separat triggerbare Raumanimationen (`kaputt`, `feuer`, `schleim`, `nest`, `dekompression`, `lichtflackern`, `alarm`) mit 1:1-Running-Liste, raumstrengem Clipping, echter GIF-Loop-Wiedergabe, GIF-Mapping pro Animation (UI + Persistenz) sowie robustem Render-Loop-Hardening fuer mobile und browserinkonsistente Clip-Pfade.

Status: 56/56 Tasks abgeschlossen; Plan 3-1 (P3-T1..P3-T12), Plan 3-2 Rework (P3-T13..P3-T25), Plan 3-3 Rework (P3-T26..P3-T31), Plan 3-4 Hotfix-Add-on (P3-T32..P3-T34), Plan 3-5 Rework (P3-T35..P3-T44), Plan 3-6 P0-Hotfix (P3-T45..P3-T50) und Plan 3-7 Reopen-P0-Hotfix (P3-T51..P3-T56) sind abgeschlossen; Nachweise in `.planning/phases/phase-03/3-7-SUMMARY.md`, `.planning/phases/phase-03/3-7-VERIFICATION.md`, `.planning/phases/phase-03/P3-T55-REGRESSION.md`, `.planning/phases/phase-03/P3-T55-SOAK.md`.

Milestones:
1. P0 Runtime-Rework: separates Trigger-/Instanzmodell pro Raumanimation.
2. P0 Render-Rework: GIF-Vorgaben + globale Aequivalente (`alarm`/`lichtflackern`) strikt raumbegrenzt.
3. P0 Rework 3-3: echte GIF-Loops fuer `kaputt`/`feuer`/`schleim` statt Einzelbild-Pulsing.
4. P0 Rework 3-3: GIF-Mapping-UI pro Animation inkl. Persistenz (analog Sound-Mapping).
5. P1 Hardening: Regression, Performance, Verifikation, Artefakt-Sync.
6. P0/P1 Hotfix 3-4: Direct-Start verdrahtet gemappten GIF-Pfad inkl. Regression Direct-Start/Edit/Reload und Artefakt-Sync.
7. P0 Rework 3-5: kritischen Render-Regression-Bug schliessen (Animationen wieder sichtbar auf Board, Audio-only-Fall ausgeschlossen).
8. P0 Rework 3-5: Pflicht-Refactor `app.js` in Modulgrenzen (`state`, `rendering`, `effects`, `audio`, `ui`, `persistence`, `api/save`).
9. P1 Rework 3-5: Lesbarkeit (gezielte Kommentare) plus Paritaets-/Stabilitaetsnachweise nach Refactor.
10. P0 Hotfix 3-6: Preview-Flow vollstaendig entfernen und auf direkten Live-Trigger zurueckstellen.
11. P0 Hotfix 3-6: sichtbares Rendering fuer `global`/`room`/`gif` sofort wiederherstellen; Running/Stop/Edit stabil halten.
12. P1 Gate 3-6: weiterer Refactor erst nach stabilem P0-Hotfix-Nachweis fortsetzen.
13. P0 Hotfix 3-7: Render-Loop-Fault-Isolation, sodass Einzel-Layer-/Clip-Fehler nie den gesamten Draw-Tick stoppen.
14. P0 Hotfix 3-7: Outside-/Ship-Clip-Kompatibilitaet fuer mobile WebView/Canvas-evenodd-Faelle plus Outside-Failure-Isolation.
15. P0 Gate 3-7: mobiler Hartnachweis, dass nach Trigger mindestens `global` + `room` + `gif` sichtbar/bewegt sind.

Exit Criteria:
- Plan-3-2-P0 bleibt abgeschlossen und nachgewiesen.
- Alle 7 separaten Raumanimationen sind einzeln triggerbar/stoppbar und in Running 1:1 sichtbar.
- `alarm` und `lichtflackern` laufen als globale Aequivalente ohne Clipping-Leaks ausserhalb des Zielraums.
- GIF-Raumanimationen `kaputt`/`feuer`/`schleim` laufen als echte Mehrframe-Loops, nicht als Pulsing-Einzelbild.
- GIF-Mapping pro Animation ist in der UI auswaehlbar und persistent gespeichert.
- Verifikation und Planungsartefakte (inkl. Plan 3-3) sind konsistent abgeschlossen.
- Plan 3-4 Hotfix weist Ende-zu-Ende-Mapping fuer Direct-Start + Edit + Reload explizit nach.
- Kritischer Render-Bug ist behoben: aktive Animationen rendern auf dem Board sichtbar und stabil, auch bei parallel laufendem Audio.
- `app.js` ist in verpflichtende Modulgrenzen aufgeteilt; keine monolithische Kernlogik bleibt ungeordnet zurueck.
- Nach Refactor ist funktionale Paritaet + Stabilitaet via Regression/Soak dokumentiert.
- Preview-Flow ist vollstaendig entfernt; direkter Live-Trigger ist wieder der einzige Runtime-Pfad.
- P0-Hotfix-Nachweis fuer sichtbares Rendering (`global`/`room`/`gif`) und stabile Running-/Stop-/Edit-Integritaet liegt vor.
- Render-Loop bleibt auch bei Layer-/Clip-Path-Fehlern aktiv; kein globaler Draw-Stop durch Einzeldefekt.
- Outside-/Ship-Clipping ist browserrobust inklusive Mobile-WebView-Fallback ohne evenodd-Abhaengigkeit.
- Outside-Layer-Fehler stoppen Inside/Room/GIF nicht; Sichtbarkeit bleibt fuer verbleibende Layer erhalten.
- Mobiler Trigger-Flow weist sichtbare/bewegte `global` + `room` + `gif`-Effekte als Pflichtnachweis nach.

## Deferred (Post-Phase-2)
- Kamera/CV-Ausrichtung
- Netzwerk-Remote / Multi-Client-Sync
- Vollwertiger Effekt-Editor
