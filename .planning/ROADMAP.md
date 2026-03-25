# ROADMAP

## Direction
Liefere zuerst einen stabilen Vertical Slice fuer OG-Nemesis (Phase 1), erweitere danach auf wiederholbaren Session-Betrieb mit Profilen und Datenzonen (Phase 2), stabilisiere Runtime/Architektur in Phase 4 und fokussiere in Phase 5 den realen Mehrgeraete-Betrieb mit finalem Raspberry/Beamer-Output, Realtime-Sync und rollenbasiertem Audio.

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

## Phase 3 - Nemesis Animations Overhaul (Rework Completed)
Ziel: Separat triggerbare Raumanimationen (`kaputt`, `feuer`, `schleim`, `nest`, `dekompression`, `lichtflackern`, `alarm`) mit 1:1-Running-Liste, raumstrengem Clipping und echter GIF-Loop-Wiedergabe fuer die 3 GIF-basierten Raumtypen bei instanzscharfer Steuerung (`opacity`, `playbackSpeed`) und Default `hold`.

Status: 37/37 Tasks abgeschlossen; Plan 3-1 (P3-T1..P3-T12), Plan 3-2 Rework (P3-T13..P3-T25), Plan 3-3 P0-Bugfix (P3-T26..P3-T31) und Plan 3-4 Cross-Browser-Fallback-Fix (P3-T32..P3-T37) sind abgeschlossen (`.planning/phases/phase-03/3-1-SUMMARY.md`, `.planning/phases/phase-03/3-2-SUMMARY.md`, `.planning/phases/phase-03/3-3-SUMMARY.md`, `.planning/phases/phase-03/3-4-SUMMARY.md`).

Milestones:
1. P0 Runtime-Rework: separates Trigger-/Instanzmodell pro Raumanimation.
2. P0 Render-Rework: GIF-Vorgaben + globale Aequivalente (`alarm`/`lichtflackern`) strikt raumbegrenzt.
3. P0 Bugfix Plan 3-3: echtes GIF-Playback fuer `kaputt`/`feuer`/`schleim` (native Loops statt Pulse-/Zoom-Ersatz).
4. P0 Bugfix Plan 3-4: echter GIF-Frame-Fortschritt im Fallback-Pfad (kein Standbild ohne `ImageDecoder`).
5. P0 UX-Paritaet: Running-Uebersicht 1:1 pro aktiver Animation + hold-by-default bleibt stabil.
6. P1 Hardening: Regression, Browser-Matrix, Performance, Verifikation, Artefakt-Sync.

Exit Criteria:
- Plan-3-2-P0 und Plan-3-3-P0 bleiben abgeschlossen; Plan-3-4-P0 (Fallback-Loop-Fix) ist vollstaendig umgesetzt und nachgewiesen.
- Alle 7 separaten Raumanimationen sind einzeln triggerbar/stoppbar und in Running 1:1 sichtbar.
- `alarm` und `lichtflackern` laufen als globale Aequivalente ohne Clipping-Leaks ausserhalb des Zielraums.
- GIF-Vorgaben fuer `kaputt`/`feuer`/`schleim` laufen als echte Loops in nativen und fallback Pfaden; `opacity`/`playbackSpeed` bleiben instanzscharf steuerbar.
- Verifikation und Planungsartefakte konsistent abgeschlossen.

## Phase 4 - Maintainability Refactor (Stabilized / Follow-up Deferred)
Ziel: `src/app.js` in eine modulare, wartbare Architektur ueberfuehren und gleichzeitig das Raummodell auf einen allgemeinen, datengetriebenen Standard umstellen (Room-CRUD, freie Polygone, Custom-Namen), ohne funktionale Regression in Runtime, Rendering, Persistenz, Save/API und Mobile-Bedienung.

Status: 35/38 Tasks abgeschlossen (Plan 4-1 bis Plan 4-5b erledigt); verbleibende Follow-up-Tasks (Plan 4-6/4-7) sind vorerst nachrangig, da Phase 5 als Betriebsprioritaet aktiviert ist.

Milestones:
1. Architektur-Skeleton: `src/app/*` Struktur + kompatibler Bootstrap-Entry.
2. State/Domain-Zerlegung: Config, pure Utilities, Runtime-State und Domain-Aktionen modularisieren.
3. Persistenz/API-Zerlegung: LocalStorage-Migration, Resolver/Preflight/Save-Client isolieren.
4. Raum-Generalization: Room-CRUD, freie Polygonraeume und editierbare Custom-Namen produktiv umsetzen.
5. Datenmigration/Kompatibilitaet: neuer Room-JSON-Standard mit verlustfreier Migration und Legacy-Load-Pfad.
6. P0 UX-Hotfix: Desktop-Running-Liste hart begrenzen, damit restliche Controls immer bedienbar bleiben.
7. P0 Decommission: Preview-Staging vollstaendig aus UI/Runtime/State entfernen.
8. P0 Editor-Polish-Hotfix: Polygon-Handle-Groesse nahe Zoom einstellbar und hitarea-konsistent.
9. P0 Immersion-Hotfix: `lichtflackern` als unregelmaessiges Horror-Random-Flicker, weiterhin strikt raumgeclippt.
10. P0 Edit-Flow-Hotfix: gesamtes Room-Polygon per LMB-Flaechen-Drag verschiebbar ohne Vertex-Edit-Regression.
11. P0 Editor-Paritaet-Hotfix: Handle-Groesse gilt fuer alle Editor-Punkte inkl. Ship-Polygon-Vertices.
12. P0 Flicker-Cleanup-Hotfix: `lichtflackern` ohne horizontale Weissstreifen, plus 10%-Mindest-Speed.
13. P0 Audio-Persistenz-Hotfix: Sound-Mapping-Auswahl bleibt reload-stabil und ist ueber Global Defaults speicherbar.
14. GIF/Render-Zerlegung: decoder-agnostisches GIF-Subsystem und Render-Pipelines modularisieren.
15. UI/Input-Zerlegung: Dashboard/Settings-Controller, Running-Bindings und Pan/Edit-Guards entkoppeln.
16. Hardening: Vollmatrix-Regression und Abschlussdokumentation.

Exit Criteria:
- `src/app.js` ist auf schlanke Bootstrap-Orchestrierung reduziert; Kernlogik lebt in Modulen.
- Settings unterstuetzt Raum anlegen/loeschen; jeder Raum bleibt frei als Polygon editierbar und hat einen frei editierbaren Namen.
- Bestehende Defaults/Profile sind auf den neuen JSON-Standard migriert, bei voller Rueckwaertskompatibilitaet fuer Bestandsdaten.
- Running-Liste bleibt auf Desktop auch unter Last begrenzt; keine Ueberdeckung/Vertreibung anderer Bedienmodule.
- Preview-Staging ist vollstaendig entfernt; es gibt keine Preview-Queue/Commit/Rollback-Pfade mehr.
- Polygon-Editor bietet eine sichtbare Handle-Groessensteuerung nahe Zoom; hohe Zoomstufen bleiben praezise editierbar.
- Handle-Groessensteuerung gilt konsistent fuer alle Polygon-Editoren inkl. Ship-Vertices (Visual + Hitarea).
- `lichtflackern` zeigt unregelmaessiges Random-Flicker statt periodischem Pulsieren und bleibt strikt auf den Zielraum begrenzt.
- `lichtflackern` zeigt keine horizontalen weissen Streifen/Glitch-Baender und unterstuetzt mindestens 10% Playback-Speed.
- Room-Polygon kann in Settings per Flaechen-Drag verschoben werden, ohne Insert/Delete/Vertex-Drag zu beeintraechtigen.
- Sound-Mappings/Sound-Auswahl bleiben nach Reload stabil und werden ueber Global Defaults verlustfrei gespeichert/geladen.
- Keine Regression bei Dashboard/Settings, Running-Liste, GIF-Looping (native+fallback), Clipping, Persistenz, Save/API und Mobile-UX.
- Phase-4-Artefakte und Verifikationsnachweise sind konsistent synchronisiert.

## Phase 5 - Multi-Client Final Output (In Progress)
Ziel: Produktiver 3-Geraete-Betrieb im LAN mit klaren Rollen (`operator`, `alignment`, `final-output`), sauberem Beamer-Endbild und echtzeitfaehiger Session-Synchronisierung.

Status: Plan 5-1 Fokuswelle P5-T1..P5-T8 ist umgesetzt (`.planning/phases/phase-05/5-1-SUMMARY.md`); Plan 5-2 Hotfix-Core P5-T15..P5-T20 ist abgeschlossen (`.planning/phases/phase-05/5-2-SUMMARY.md`); Plan 5-3 P0-Resolver-Hotfix P5-T23..P5-T28 ist abgeschlossen (`.planning/phases/phase-05/5-3-SUMMARY.md`); Plan 5-4 Session/SSE-Stabilitaets-Hotfix P5-T31..P5-T36 ist abgeschlossen (`.planning/phases/phase-05/5-4-SUMMARY.md`); Plan 5-5 Session-Resilience-Hotfix P5-T39..P5-T44 ist abgeschlossen (`.planning/phases/phase-05/5-5-SUMMARY.md`); Plan 5-6 Transport-Fallback + Logdiagnose P5-T45..P5-T50 ist abgeschlossen (`.planning/phases/phase-05/5-6-SUMMARY.md`); Plan 5-7 Root-Cause-Hotfix CONNECT_UNREACHABLE (P5-T51..P5-T56) ist abgeschlossen (`.planning/phases/phase-05/5-7-SUMMARY.md`); Plan 5-8 SSE-first-Hotfix (P5-T57..P5-T62) ist abgeschlossen (`.planning/phases/phase-05/5-8-SUMMARY.md`). Offen bleiben danach Rest-Gates P5-T21..P5-T22 sowie Plan-5-1-Rest P5-T9..P5-T14.

Milestones:
1. Rollenmodell + Session-Handshake (`operator`/`alignment`/`final-output`) stabilisieren.
2. Final-Output-Route fuer Raspberry/Beamer ohne Board/Polygone/Namen produktiv schalten.
3. Overlay-Semantik korrigieren: `operator` sieht Overlay immer; Toggle steuert ausschliesslich Final-Output-Overlay.
4. Session-Verbindungspfad robust machen (Endpoint-Resolver, Join-Fallback, Retry/Backoff) und UI-Diagnose stark ausbauen.
5. Realbetrieb-Hotfix 5-3: Resolver nutzt standardmaessig UI-Origin-Port (`:4173`), stale Overrides werden defensiv behandelt, Diagnose bleibt endpoint-konsistent.
6. Multi-Client-Realtime-Sync fuer Trigger/Edit/Stop/Clear-All und Running-Instanzen absichern.
7. Audio strikt auf `final-output` begrenzen, inklusive Role-Switch/Reconnect-Faellen.
8. Transport-Hotfix 5-6: persistentes API-Logfile plus POST-primaer/GET-fallback fuer Heartbeat (und optional Event) in Client+Server+UI-Diagnose stabilisieren.
9. Root-Cause-Hotfix 5-7: vollstaendiges Session-Access-Logging, Connect `fetch`+XHR-Fallback, aktive Self-Tests und harte WLAN-Abnahme ohne Retry-Terminal.
10. SSE-first-Hotfix 5-8: Heartbeat entkoppeln (kein `failed` bei aktivem Stream), Connectivity-State trennen, Reconnect stream-zentrieren, Sync trotz heartbeat degraded stabilisieren.
11. 3-Device-Abnahme (Laptop + Tablet + Raspberry/Beamer) als Pflicht-Gate dokumentieren.

Exit Criteria:
- Finaler Beamer-Output ist clean bei deaktiviertem Final-Overlay-Toggle (kein Board, keine Polygone, keine Namen).
- Realtime-Sync bleibt unter 3-Device-LAN-Betrieb ohne sichtbaren Drift stabil.
- Overlay-Semantik ist feldkonform (`operator` always-on; Toggle nur Final-Output-Overlay).
- Session-Connect ist robust gegen `default-session`-Fehlpfad; Resolver driftet nicht auf `:8080`; Diagnoseinfos sind im UI voll sichtbar und konsistent.
- Persistente Session-API-Logs liegen unter `logs/session-api.log` vor und enthalten endpoint-/methodenspezifische Fehlercodes fuer Feldanalyse.
- Session-Access-Logging ist fuer ALLE Session-Requests vollstaendig (Methode, Path, Status, Duration, Client-IP; Success+Error).
- Heartbeat (und optional Event) bleibt bei POST-Problemen ueber GET-Fallback stabil; UI zeigt die tatsaechlich verwendete Methode transparent an.
- Connect bleibt auch in HTTP0-Umgebungen robust ueber Transport-Fallback (`fetch` primaer, XHR oder gleichwertig fallback) mit detaillierter UI-Diagnose.
- `Settings` bietet einen aktiven Self-Test fuer `connect`/`stream`/`heartbeat`/`event` als OK/Fail-Matrix inkl. Endpoint/Methode.
- Heartbeat ist bei aktivem Stream kein Hard-Failure-Trigger mehr; Session bleibt dabei hoechstens `degraded` statt `failed`.
- Reconnects werden nur durch Stream-Abbruch oder explizite Connect-Fehler ausgeloest.
- Emit/Sync bleiben unter `heartbeat degraded` funktionsfaehig, solange Stream-Verbindung aktiv ist.
- Stream-State-Transitionen sind diagnostisch nachvollziehbar geloggt (`open`/`degraded`/`closed`/`reconnecting` mit Ursache).
- Feldsetup verbindet und synchronisiert unter normalem WLAN stabil ohne terminalen Retry-Zustand.
- Audio ist technisch nachweisbar `final-output` only.
- Plan-5-Artefakte und Verifikationsnachweise sind konsistent synchronisiert.

## Deferred (Post-Phase-5)
- Kamera/CV-Ausrichtung
- Vollwertiger Effekt-Editor
