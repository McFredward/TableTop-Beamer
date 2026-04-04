# Phase 5 Plan (Prepared)

## Zielbild
Phase 5 fuehrt einen klar getrennten Multi-Device-Betrieb ein: Ein Server steuert einen gemeinsamen Live-State fuer alle Clients, Handy und PC dienen als Controller-Views, und ein dedizierter Final-Beamer-Output auf dem Raspberry Pi zeigt nur die finalen FX/Animationen fuer das physische Board. Zusaetzlich wird ein expliziter Align-Mode fuer die Beamer-Kalibrierung eingefuehrt, Audio strikt auf den Final-Output geroutet und ein persistentes, serverseitiges Logging fuer Session-Events, State-Aenderungen und Fehler verankert. Verbindlich ist ausserdem, dass Layout-/Board-Auswahl ueber alle Clients synchron bleibt und der alte Bedienpfad `Output Route` vollstaendig entfaellt.

## Verbindliche Architekturentscheidungen
- Neuer Final-Output-Serverpfad: `/output/final` als dedizierte Beamer-Route.
- Control-Views bleiben getrennt und enthalten weiterhin Board-/Polygon-Orientierung fuer Bedienung.
- Server ist Source-of-Truth fuer Live-State (kein isolierter Client-Local-Only-Live-State mehr).
- State-Verteilung erfolgt ueber einen zentralen Broadcast-Kanal (WebSocket-basiert).
- Board-/Layout-Auswahl ist Teil des serverautoritativen Shared-State und wird wie Runtime-Mutationen versioniert repliziert.
- Align-Mode ist ein globaler Runtime-Flag im Shared-State und wirkt nur auf Final-Output-Overlay-Layer.
- Audio-Ausgabe ist output-gebunden: Final-Output unmuted, Control-Views hard-muted.
- Legacy-Bedienpfad `Output Route` wird entfernt; fuer Ausgabepfade gilt ausschliesslich `/output/final`.
- Logging wird als persistente Datei auf Serverseite geschrieben (JSONL, append-only).

## Scope
- Dedizierte Final-Output-Route am Server bereitstellen.
- Final-Output rendert nur Animation/FX-Layer (kein Board-Bild, keine Raum-Polygone, keine Raum-Namen).
- Shared Live-State fuer alle verbundenen Clients etablieren (Handy, PC, Beamer).
- Bidirektionale Live-Synchronisierung fuer Trigger/Edit/Stop/Clear-All/Settings-nahe Laufzeitwerte.
- Layout-/Board-Auswahl serverautoritativ synchronisieren (inkl. Join/Reconnect), sodass alle Clients denselben Arbeitskontext sehen.
- Final-Output-Hydration und Runtime-Context strikt auf den Shared-Context (`selectedBoard`/`selectedLayout`) binden, damit `/output/final` bei Board-Wechsel sofort denselben Kontext wie Control-Views nutzt.
- Outside-Space-State vollstaendig synchronisieren (ON/OFF, Geschwindigkeit, relevante Outside-Parameter) fuer alle Clients inklusive Join/Reconnect.
- Align-Mode mit globalem Toggle einbauen:
  - Final-Output: Polygone optional einblendbar fuer physisches Ausrichten.
  - Control-Views: Polygone bleiben immer sichtbar.
- Audio-Routing auf Output-Rolle umstellen:
  - Final-Output: Audio aktiv.
  - Control-Views: Audio aus.
- Persistentes Logging fuer Session-Events, State-Aenderungen und Fehler inklusive Zeitstempel/Client-Kontext.
- Basis-Diagnostik fuer Sync/Verbindung im Operator-Flow bereitstellen.
- `Output Route` aus UI, State und Interaktionspfaden entfernen; `/output/final` bleibt der einzige dedizierte Ausgabepfad.

## Out of Scope
- Benutzer-/Rechtemodell mit Login.
- Vollwertige verteilte Datenbank oder Cluster-Betrieb.
- Kamera- oder CV-basierte Auto-Ausrichtung.
- Neuer Effekt-Content oder Redesign der bestehenden Animationen.

## Migrationsstrategie (sichere Inkremente)
1. Final-Output-Route als read-only View auf bestehende Runtime anbinden.
2. Shared-State-Backbone am Server einziehen (Session Snapshot + Broadcast).
3. Control-Aktionen auf serverautoritative Mutationen umstellen.
4. Align-Mode als globales Flag einfuehren und Final-Output-Render-Guard verankern.
5. Audio-Routing nach Output-Rolle hart trennen.
6. Persistentes Logging integrieren (Event-, State-, Error-Klassen).
7. P0-Hotfix einziehen: Outside-Space-State-Endpunkte und Snapshot/Broadcast auf Vollsync haerten.
8. P0-Hotfix einziehen: `/output/final` Bootstrap/Renderpfad auf FX-only ohne UI-Leaks und ohne White-Screen stabilisieren.
9. P0-Hotfix einziehen: Sync-Reliability fuer Outside-Toggles und Room-Animation-Aktionen mit serverautoritativem Apply, Ack-Broadcast und robustem Ordering/Versioning haerten.
10. P0-Hotfix einziehen: Board-/Layout-Auswahl global synchronisieren und `Output Route` vollstaendig dekommissionieren.
11. P0-Hotfix einziehen: Final-Role-Context-Rebind fuer Board-Wechsel haerten (Hydration + Runtime-Rebind + Join/Reconnect-Snapshot + Switch-Regressionen).
12. End-to-End-Gates mit 3-Geraete-Setup (Handy/PC/RPi-Beamer) fahren.

## Milestones (priorisiert)
1. M1 Final-Output-Pfad live mit FX-only Rendervertrag.
2. M2 Serverautoritativer Shared-State + Multi-Client-Broadcast stabil.
3. M3 Align-Mode global steuerbar, final-output-spezifisch sichtbar.
4. M4 Audio strikt output-geroutet (nur Final-Output hoerbar).
5. M5 Persistentes Logging produktiv mit Session-/State-/Error-Ereignissen.
6. M6 P0-Hotfix abgeschlossen: Outside-Space-Sync vollstaendig (Toggle/Speed/Parameter + Join/Reconnect).
7. M7 P0-Hotfix abgeschlossen: `/output/final` rendert stabil FX-only ohne Settings/Slider/UI, Align-Ausnahme fuer Polygon-Overlay bleibt erhalten.
8. M8 P0-Hotfix abgeschlossen: Single-Click-Sync fuer Outside-Richtung/-Modus und Room-Animation-Aktionen ist beim ersten Ausloesen deterministisch synchron.
9. M9 P0-Hotfix abgeschlossen: Layout-/Board-Auswahl ist auf allen Clients inkl. Join/Reconnect ohne Drift synchron.
10. M10 P0-Hotfix abgeschlossen: `Output Route` ist entfernt; `/output/final` ist der einzige dedizierte Output-Pfad.
11. M11 P0-Hotfix abgeschlossen: Board-Switch (`control -> final`) rebinded den Final-Output sofort auf den neuen Board-/Layout-Kontext ohne stale Raum-/FX-Daten.
12. M12 Verifikation im Realsetup (Handy + PC + Raspberry Pi/Beamer) bestanden.

## Verbindliches Feedback (Phase 5 Bugfix)
- Outside-Space-Sync ist aktuell unvollstaendig und wird als P0-Hotfix behandelt.
- `/output/final` zeigt aktuell UI-Leaks bzw. White-Screen und wird als P0-Hotfix im Bootstrap-/Renderpfad behandelt.
- Neues verpflichtendes Feedback: Outside-Richtung/-Modus (forward/reverse, standard/immersive) und vereinzelt Room-Animation-Aktionen synchronisieren nicht deterministisch beim ersten Klick.
- Neues verpflichtendes Feedback: Auch Layout/ausgewaehltes Board muss ueber alle Clients synchronisiert werden.
- Neues verpflichtendes Feedback: `Output Route` wird nicht mehr benoetigt und ist aus Runtime/Bedienung zu entfernen (dedizierter Ausgabepfad ist `/output/final`).
- Sync-Reliability-Hotfix wird als P0 vor Plan 5-2 ausgefuehrt (Event-/Mutation-/Dedup-/Ack-Root-Cause, idempotentes serverautoritatives Apply, Ordering/Versioning, Regressionstests).
- Board/Layout+Output-Route-Hotfix wird als P0 vor Plan 5-2 ausgefuehrt (Shared-State-Erweiterung, Join/Reconnect-Paritaet, Decommission-Regression).
- Alle P0-Bugfixes werden vor Plan 5-2 (Diagnostics + Hardening) ausgefuehrt.

## Definition of Done
- Server bietet dedizierten Final-Output-Pfad (`/output/final`).
- Final-Output zeigt ausschliesslich FX/Animationen; Board-Bild, Raum-Polygone und Raum-Namen sind standardmaessig nicht sichtbar.
- Alle relevanten Runtime-Aenderungen sind in Echtzeit auf Handy, PC-Controller und Beamer synchron.
- Layout-/Board-Wechsel repliziert sofort auf alle Clients; neu joinende Clients uebernehmen denselben selektierten Kontext ohne manuellen Eingriff.
- Outside-Space ON/OFF, Geschwindigkeit und relevante Outside-Parameter sind fuer alle Clients inkl. Join/Reconnect synchron.
- Align-Mode ist global toggelbar; im Final-Output blendet er Polygon-Overlay fuer Kalibrierung ein/aus.
- Control-Views zeigen Polygone weiterhin dauerhaft sichtbar, unabhaengig vom Align-Mode.
- `/output/final` bootstrapt/rendered stabil als Vollbild-FX-only-Ansicht: keine Slider, keine Settings, keine sonstige UI; einzige Ausnahme ist Polygon-Overlay bei Align-Mode ON.
- Audio ist nur im Final-Output aktiv; auf Handy/PC-Controller bleibt Audio stumm.
- Server schreibt persistente Logs in Datei fuer Session-Events, State-Aenderungen und Fehler.
- Outside-Richtung und Outside-Modus sind bei jedem einzelnen Toggle beim ersten Ausloesen sofort auf allen Clients konsistent.
- Room-Animation-Aktionen (Trigger/Edit/Stop/Clear-All) replizieren auch bei schnellen Folgen deterministisch ohne Mehrfachklick.
- Server verarbeitet Mutationen idempotent und autoritativ mit sofortiger Broadcast-Bestaetigung (inkl. Ack/Version je Mutation).
- Ordering/Versioning verhindert stale oder doppelte Applies bei schnellen Toggle-Folgen.
- Regressionstests decken Single-Click-Sync fuer Outside (mode/direction) und Room-Animation-Aktionen verpflichtend ab.
- `Output Route` ist vollstaendig entfernt (keine UI-Controls, keine Runtime-Flags, keine nicht-benutzten Pfade/Endpoints); `/output/final` bleibt unveraendert als dedizierter Ausgabepfad.
- Keine Regression in Kernflows (Trigger/Edit/Stop/Clear-All, Running-Liste, Save/Load, Clipping).
- Phase-5-Artefakte (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE`) und globale Planungsdateien sind synchron.
