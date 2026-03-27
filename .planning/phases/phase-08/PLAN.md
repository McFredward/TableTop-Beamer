# Phase 8 Plan (Prepared)

## Zielbild
Phase 8 erweitert den Board-Workflow um zwei verbindliche Kernfaehigkeiten: erstens mehrere getrennte Play-Areas pro Board mit fachlich korrekter Union-Logik fuer inside/outside, zweitens einen einfachen Bild-Upload fuer neue Boards als Alternative zum JSON-Import. Nach Abschluss kann der Operator fuer jedes Board mehrere Play-Area-Polygone anlegen/loeschen, und alle globalen inside/outside Effekte sowie Clipping-Pfade behandeln die Vereinigungsflaeche aller Play-Areas als "inside". Zusaetzlich kann ein Board aus einem hochgeladenen Bild erstellt werden, das serverseitig gespeichert und unmittelbar als Unterlage fuer manuelles Polygonzeichnen genutzt wird.

## Trigger aus Realbetrieb (verbindlich)
- Der aktuelle Single-Play-Area-Ansatz reicht fuer getrennte Spielzonen nicht aus.
- Board-Erstellung ist aktuell JSON-lastig; fuer schnelle Inbetriebnahme wird direkter Bildupload benoetigt.
- Bestehende gespeicherte Daten duerfen bei Schemaerweiterung nicht verloren gehen.

## Verbindliche Architekturentscheidungen
- Kanonisches Datenmodell wird auf `playAreas[]` (mehrere Polygone) angehoben; Legacy-Single-Area bleibt nur Ladealias.
- Inside/Outside wird als Union aller gueltigen Play-Area-Polygone berechnet (kein Last-write/Single-Area-Fallback).
- Rendering- und Hit-Tests nutzen denselben Union-Maskenpfad, damit visuelle und interaktive Semantik deckungsgleich bleibt.
- CRUD fuer Play-Areas (create/delete/select/rename optional) ist im Settings-Flow verfuegbar.
- Loeschen der letzten Play-Area ist nur mit klarer Guard-Semantik erlaubt (z. B. explizite Bestaetigung), um versehentliche Vollentleerung zu vermeiden.
- Datenmigration ist verpflichtend und idempotent: bestehende `playAreaPolygon`/Legacy-Ship-Daten werden verlustfrei in `playAreas[]` ueberfuehrt.
- Persistenz exportiert ausschliesslich das neue Schema; Loader akzeptiert weiterhin Legacy-Payloads.
- Board-Import unterstuetzt neben JSON einen Bildpfad via Upload (`jpg`, `jpeg`, `png`, `webp`).
- Uploadte Dateien werden serverseitig unter kontrolliertem Pfad gespeichert und als Board-Background referenziert.
- Upload-API validiert Dateityp, Dateigroesse und sichere Dateinamen/Path-Normalisierung.
- Nach Bildimport startet ein leerer, aber editierbarer Board-Kontext fuer manuelles Zeichnen von Play-Areas und Rooms.

## Scope
- Multi-Play-Area Datenmodell + Editor-UX (anlegen, loeschen, auswaehlen).
- Union-basierte inside/outside Semantik in Render-, Clipping- und Runtime-Pfaden.
- Migration + Persistenzkompatibilitaet fuer bestehende Boarddaten.
- Board-Import per Bildupload inkl. Server-Speicherung und Katalogintegration.
- Basis-Non-Regression fuer bestehende Trigger-, Running-, Save-/Reload- und Final-Output-Flows.

## Out of Scope
- Automatische Polygonerkennung aus Bildinhalt (CV/AI).
- Vollstaendiger Board-Metadaten-Editor ueber den Basis-Import hinaus.
- Cloud-Storage/WAN-Upload-Pipelines.

## Priorisierte erste Ausfuehrungswelle (Plan 8-1, execute-ready)
1. Multi-Play-Area Schema finalisieren (`playAreas[]`, IDs, Legacy-Alias).
2. Idempotente Migration fuer bestehende Defaults/Boards/Profile implementieren.
3. Settings-UI fuer Play-Area CRUD und aktive Auswahl integrieren.
4. Union-Maskenpfad fuer inside/outside in Rendering und Runtime anwenden.
5. Non-regression fuer bestehende Room-/Cluster-/Global-Lifecycle sicherstellen.
6. Bild-Upload-API (multipart) serverseitig implementieren.
7. Uploadte Assets speichern, katalogisieren und als Board-Hintergrund referenzieren.
8. Import-UX erweitern: JSON oder Bild-Upload als gleichwertige Einfuehrungspfade.
9. End-to-end Verify + Artefakt-Sync abschliessen.

## Milestones
1. M1 Multi-Area Model Foundation: `playAreas[]` als kanonischer Standard.
2. M2 Migration Safety: Legacy-Daten werden verlustfrei und idempotent ueberfuehrt.
3. M3 Union Semantics Runtime: inside/outside strikt aus Vereinigungsflaeche.
4. M4 Play-Area Editor UX: mehrere Bereiche anlegen/loeschen/selektieren.
5. M5 Image Import Pipeline: Upload -> server save -> board catalog entry.
6. M6 Non-Regression Closure: bestehende Kernflows bleiben stabil.

## Verbindliches Feedback (Phase 8)
- Mehrere getrennte Play-Areas muessen in der UI anlegbar/loeschbar sein.
- Inside/Outside-Logik basiert auf der Vereinigung aller Play-Areas.
- Falls Schemaaenderungen notwendig sind, ist eine Datenmigration verpflichtend.
- Board-Import muss neben JSON auch einfachen Bildupload unterstuetzen.
- Uploadtes Bild wird serverseitig gespeichert und als Board-Unterlage genutzt.
- Danach muss der User manuell Polygone zeichnen koennen.
- Plan 8-1 ist als verbindliche execute-ready erste Welle priorisiert.

## Neues verpflichtendes Feedback (P0 Hotfix-Welle)
- Settings-Selection Regression: Klick auf Room in Play-Area selektiert den Room aktuell nicht deterministisch, weil Play-Area-Click-Selektion den Input abfaengt.
- Verbindliche Zielregel: Room-Selektion per Klick hat Prioritaet; Play-Area-Selektion per Board-Klick wird vollstaendig entfernt.
- Image-Import UX/Flow Defekt: Nach Bildupload + Name + Import fehlt aktuell sichtbares Success/State-Update im aktiven Board-Kontext.
- Verbindliche Zielregel: Erfolgreicher Bildimport fuegt das Board sofort in das Board-Dropdown ein und selektiert es direkt als aktiven Kontext.
- Startzustand fuer importierte Bildboards ohne vorhandene Polygone ist explizit zulaessig; Play-Areas/Raeume werden danach manuell erstellt.

## Neues verpflichtendes Featurepaket (Mars, P0)
- Neue Outside-Animation `Outside Sandstorm` wird auf Basis von `sandstorm.mp4` eingefuehrt und laeuft verpflichtend ohne Audio.
- Outside-Playback erhaelt eine optionale Boomerang-Semantik pro Animation (vorwaerts bis Ende, rueckwaerts bis Anfang, dann erneut vorwaerts).
- Outside-Animationseinstellungen werden aus dem `Play Area Editor` in eine eigene Settings-Sektion `Outside Animations` ausgelagert.
- Neue Outside-Sektion bietet ein Dropdown fuer die zu bearbeitende Outside-Animation und zeigt deren animation-spezifische Parameter inkl. Boomerang-Option.
- Animation-Asset-Mapping wird im UI editierbar: pro Outside-Animation ist die hinterlegte Quelle konfigurierbar (`gif`/`mp4`/coded animation key).
- UI erlaubt das Anlegen neuer Outside-Animationen und die Auswahl vorhandener Dateien aus `resources` als Asset-Quelle.
- Saemtliche Outside-Animationsdefinitionen und deren Settings werden wie bestehende Profile/Defaults persistent gespeichert und geladen.

## Priorisierte Feature-Welle (Plan 8-HF2, execute-ready)
1. Outside-Animationsmodell erweitern: Definitionen (`id`, `name`, `assetType`, `assetRef`, `boomerang`, weitere Settings) kanonisch abbilden.
2. `Outside Sandstorm` als verpflichtenden Default-Eintrag auf `sandstorm.mp4` einbinden (Audio aus).
3. Outside-Playback-Lifecycle erweitern: optionales Boomerang-Playback robust fuer Start/Stop/Clear/Join-Reconnect.
4. Settings-Refactor umsetzen: Outside-Animationseinstellungen aus `Play Area Editor` in separaten Bereich `Outside Animations` verlagern.
5. Outside-Animationseditor liefern: Dropdown fuer Auswahl + parameterbezogene Bearbeitung inkl. Boomerang pro Animation.
6. Asset-Mapping-Editor liefern: Asset-Typ (`gif`/`mp4`/coded key) und Referenz pro Animation bearbeitbar machen.
7. UI-Create-Flow liefern: neue Outside-Animation in UI anlegen und als bearbeitbaren Eintrag registrieren.
8. Resource-Asset-Picker liefern: vorhandene Dateien aus `resources` als Asset-Quelle auswaehlbar machen.
9. Persistenz erweitern: Outside-Animationsdefinitionen + Settings verlustfrei speichern/laden (inkl. Legacy-Guards).
10. P0-Verifikation + Artefakt-Sync abschliessen (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Priorisierte Hotfix-Welle (Plan 8-HF1, execute-ready)
1. Input-Arbitration korrigieren: Room-Klick bleibt kanonischer Selection-Pfad, Play-Area-Click-Selection wird entfernt.
2. Settings-Selection Non-Regression absichern: Vertex/Room-Editing bleibt mit persistenter Room-Selektion stabil.
3. Image-Import Success-Apply haerten: erfolgreicher Import schreibt sofort in Board-Katalog + UI-State.
4. Post-Import Auto-Select erzwingen: neues Board ist unmittelbar im Dropdown sichtbar und direkt ausgewaehlt.
5. Empty-Start fuer importierte Boards absichern: kein Pflicht-Default-Polygon, manueller Polygonworkflow startet direkt.
6. P0-Verifikation + Artefakt-Sync abschliessen (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Definition of Done
- Ein Board kann mehrere getrennte Play-Areas persistent speichern.
- Play-Area-CRUD in Settings funktioniert robust (create/delete/select) ohne Editor-Dead-Ends.
- Inside-/Outside-Rendering und Clipping verwenden die Union aller Play-Areas deterministisch.
- Legacy-Bestaende werden beim Laden migriert und beim Speichern im neuen Schema persistiert, ohne Datenverlust.
- Import-Flow akzeptiert JSON und Bildupload (`jpg`/`jpeg`/`png`/`webp`).
- Uploadte Bilder sind serverseitig gespeichert und im Board-Katalog als Hintergrund nutzbar.
- Nach Bildupload ist manueller Polygon-Workflow direkt verfuegbar.
- Room-Klick in Settings selektiert den Room deterministisch; Play-Area wird nicht mehr per Board-Klick selektiert.
- Nach erfolgreichem Bildimport ist das neue Board sofort im Dropdown sichtbar und direkt aktiv selektiert.
- Importierte Bildboards ohne vorhandene Polygone sind stabil editierbar (Play-Areas/Raeume koennen direkt manuell angelegt werden).
- `Outside Sandstorm` ist als auswuehlbare Outside-Animation verfuegbar, nutzt `sandstorm.mp4` und bleibt stumm (kein Audio).
- Outside-Animationen unterstuetzen optionales Boomerang-Playback pro Animation ohne Lifecycle-Regression bei Start/Stop/Clear.
- Outside-Animationseinstellungen sind in einer eigenen Settings-Sektion (`Outside Animations`) gekapselt; `Play Area Editor` enthaelt diese Controls nicht mehr.
- Dropdown-basierte Auswahl der zu editierenden Outside-Animation funktioniert deterministisch; Boomerang und weitere Parameter sind animation-spezifisch.
- Asset-Mapping ist pro Outside-Animation in UI bearbeitbar (`gif`/`mp4`/coded key) inkl. Auswahl vorhandener `resources`-Dateien.
- UI kann neue Outside-Animationen anlegen; neue Eintraege sind sofort editierbar und triggerbar.
- Outside-Animationsdefinitionen + Settings sind ueber Save/Reload/Restart sowie Defaults-Apply persistent und verlustfrei.
- Keine Regression in Trigger/Edit/Stop/Clear, Running-Liste, Save/Reload/Restart und `/output/final`.
- Phase-8-Artefakte sowie `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/CURRENT_PHASE.md` sind konsistent synchronisiert.

## Execution Update
- 2026-03-27: Plan 8-1 wurde atomar umgesetzt (P8-T1..P8-T12).
- Nachweis: `.planning/phases/phase-08/8-1-VERIFICATION.md`.
- 2026-03-27: Plan 8-HF1 wurde atomar umgesetzt (P8-T18..P8-T24).
- Nachweise: `.planning/phases/phase-08/8-HF1-VERIFICATION.md`, `.planning/phases/phase-08/P8-T20-REGRESSION.md`, `.planning/phases/phase-08/P8-T23-EMPTY-START-VALIDATION.md`.
- 2026-03-27: Plan 8-HF2 wurde atomar umgesetzt (P8-T25..P8-T34).
- Nachweise: `.planning/phases/phase-08/8-HF2-VERIFICATION.md`, `debug/p8-hf2-api-resources.json`, `debug/p8-hf2-api-health.json`.
