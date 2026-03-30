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

## Neues verpflichtendes Feedback (P0 Regressionen in Outside Animations)
- `Coded/Space` rendert aktuell nur schwarz und ist funktional regressiert; erwartetes frueheres Verhalten muss wiederhergestellt werden.
- `Outside Sandstorm` flackert bzw. rewindet als Restart-Loop; Video muss stabil und kontinuierlich abgespielt werden.
- Boomerang-Checkbox ist in der Outside-Editor-UI derzeit nicht setzbar und muss wieder deterministisch editierbar sein.
- Asset-Type-Dropdown springt nach Aenderung sofort zurueck; Auswahl muss stabil im Editor verbleiben.
- UX-Absicherung ist verpflichtend: Outside-Editor erhaelt einen expliziten Button `Apply changes`, damit Type + Resource + Optionen atomar zusammen uebernommen werden.

## Neues verpflichtendes Feedback (P0 Regressionen HF4)
- `Coded/Space` ist erneut regressiert und zeigt nur schwarzen Hintergrund; der zuvor funktionierende coded Star-Space Renderpfad muss wiederhergestellt werden.
- Asset-Picker-Filterung ist aktuell nicht typspezifisch und muss strikt nach `assetType` arbeiten.
- Pflichtregel Asset-Picker: bei `assetType=coded` werden ausschliesslich coded renderer keys angeboten.
- Pflichtregel Asset-Picker: bei `assetType=mp4` werden ausschliesslich `.mp4` Dateien aus `resources` angeboten.
- Pflichtregel Asset-Picker: bei `assetType=gif` werden ausschliesslich `.gif` Dateien aus `resources` angeboten.
- Boomerang-Video-Playback ist instabil/flickert; Pflichtablauf ist vollstaendig vorwaerts bis Ende, vollstaendig rueckwaerts bis Anfang, danach wiederholen.
- Zwischen Forward/Reverse-Zyklus sind sichtbare On/Off-Flicker oder abrupte Restart-Uebergaenge unzulaessig.

## Neues verpflichtendes P0-Feedback
- Sandstorm Boomerang: Forward bis Ende ist stabil, aber im Reverse-Abschnitt flackert das Video stark.
- Root-Cause-Hinweis: Ursache liegt im Reverse-Playback-Lifecycle, nicht im normalen Forward-Playback.
- Pflichtziel: stabiler Boomerang-Loop (`forward -> smooth reverse -> repeat`) ohne sichtbares Flackern.
- Pflichtziel: normales mp4-Playback ohne Boomerang bleibt regressionsfrei unveraendert.
- Pflichtziel: persistente Settings inkl. `Apply changes` bleiben intakt.
- Pflichtziel: Regression- und Evidence-Artefakte dokumentieren Root-Cause, Fix und Non-Regression nachvollziehbar.

## Neues verpflichtendes P0-Problem (Fullscreen-Fit `/output/final`)
- `/output/final` skaliert im Browser-Fullscreen aktuell nicht auf die Display-Aufloesung; sichtbar ist nur ein kleiner Bereich oben links.
- Zielregel: Final-Output muss auf jede Aufloesung responsiv fullscreen-fitten (ohne Letterbox-/Offset-Bug oben links).
- Zielregel: Canvas/Stage werden bei Resize, Orientation-Wechsel, Browser-Fullscreen-Wechsel und Device-Pixel-Ratio-Aenderung korrekt neu berechnet.
- Zielregel: Rendering-, Koordinaten-, Clipping- und Maskenpfade bleiben unter dynamischem Reflow regressionsfrei intakt.
- Priorisierung: Boomerang-Thema ist fuer diese Welle nachrangig; Fullscreen-Fit ist unmittelbarer P0-Blocker.

## Neues verpflichtendes Feature-/Cleanup-Paket (P0)
- Boomerang-Feature wird vollstaendig entfernt: UI-Controls, Runtime-Logik und aktive Nutzbarkeit im Produkt.
- Persistenz wird bereinigt: Boomerang-Felder werden nicht mehr aktiv geschrieben/genutzt; rueckwaertskompatibles Lesen alter Daten darf als no-op-Importpfad bestehen.
- Inside-Animation-Editor erhaelt Paritaet zur Outside-Animationssektion (eigene Einstellungssektion, dropdownbasierte Bearbeitung, Create-Flow).
- Neue Inside-Animationen sind in der UI anlegbar und pro Animation ist `assetType` waehlbar (`coded`/`gif`/`mp4`).
- Asset-Referenz wird aus `resources` typspezifisch gefiltert ausgewaehlt und erst ueber expliziten Apply-Flow atomar uebernommen.
- Persistenz fuer Inside-Animationsdefinitionen (save/load/defaults) folgt demselben Muster wie Outside.
- Zielbild: Neue Inside-/Outside-Animationen sind zukuenftig definitionsgetrieben in UI hinzufuegbar, ohne weitere Codeaenderung pro Animationstyp.

## Neues verpflichtendes P0-Feedback (HF8)
- Outside-mp4-Playback ist regressiert: mp4-Assets ausserhalb laufen aktuell nicht mehr, waehrend gif/coded weiterhin funktionieren.
- Root-Cause fuer den mp4-Ausfall muss reproduzierbar isoliert und der stabile non-boomerang mp4-Playbackpfad wiederhergestellt werden.
- Conditional-Visibility-Regel im `Outside Animations`-Editor: `outside mode` und `outside direction` werden nur angezeigt, wenn der aktuell gewaehlte Kontext sie fachlich unterstuetzt (z. B. `assetType=coded` mit `outside-space` Renderer).
- `outside mode`/`outside direction` werden fuer `gif`/`mp4` und sonstige nicht-applicable coded renderer strikt ausgeblendet.
- UX-Cleanup ist verpflichtend: redundante Buttons `Use selected resource asset` werden entfernt.
- Verbindlicher Commitpfad bleibt ausschliesslich `Apply changes`.

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

## Priorisierte Hotfix-Welle (Plan 8-HF3, execute-ready)
1. Outside-Coded-Restore: `Coded/Space` Render-/Runtime-Mapping auf vorregressionskonformes Verhalten zurueckfuehren.
2. Sandstorm-Playback-Stability: mp4-Timeline/Loop-Lifecycle so haerten, dass kein Restart-Flackern/Rewind auftritt.
3. Editor-Input-Stability: Boomerang-Checkbox und Asset-Type-Dropdown wieder deterministisch und persistent editierbar machen.
4. UX-Commit-Guard: `Apply changes` im Outside-Animation-Editor einfuehren, sodass Type/Resource/Optionen atomar zusammen angewendet werden.
5. Save/Reload-Non-Regression fuer Outside-Definitionseditor inkl. `Coded/Space`, `Outside Sandstorm`, Boomerang und Asset-Type ausfuehren.
6. P0-Verifikation + Artefakt-Sync abschliessen (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Priorisierte Hotfix-Welle (Plan 8-HF4, execute-ready)
1. Coded-Star-Space-Restore: `Coded/Space` auf den zuletzt nachweislich funktionierenden coded renderer Pfad zurueckfuehren (kein Black-Screen-Fallback).
2. Type-Specific-Asset-Picker: Editor-Picker strikt nach `assetType` filtern (`coded` keys, `mp4` -> nur `.mp4`, `gif` -> nur `.gif` aus `resources`).
3. Picker-Apply-Determinismus: Type-Wechsel aktualisiert Kandidatenliste deterministisch ohne stale Optionen/Auto-Revert.
4. Boomerang-State-Machine-Hardening: Video spielt voll vorwaerts bis Ende, dann voll rueckwaerts bis Anfang, dann wieder vorwaerts (endlos).
5. Boomerang-Visual-Stability: keine sichtbaren on/off Flicker, keine abrupten Restart-Jumps zwischen den Phasen.
6. P0-Verifikation + Artefakt-Sync abschliessen (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Priorisierte Hotfix-Welle (Plan 8-HF5, execute-ready)
1. Root-Cause Analyse fuer Reverse-Lifecycle/Flicker im Sandstorm-Boomerang reproduzierbar durchfuehren.
2. Reverse-Playback-Lifecycle fixen, damit Boomerang als full-cycle (`forward -> reverse -> repeat`) ohne sichtbares Flickern laeuft.
3. Non-Regression fuer normalen mp4-Playback-Pfad ohne Boomerang absichern.
4. `Apply changes` + Persistenzpfade (`Save/Reload/Restart`) fuer Outside-Settings unveraendert stabil halten.
5. Regression-/Evidence-Artefakte erstellen (Root-Cause-Protokoll, Playback-Matrix, Non-Regression).
6. P0-Verifikation + Artefakt-Sync abschliessen (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Priorisierte Hotfix-Welle (Plan 8-HF6, execute-ready)
1. Fullscreen-Root-Cause isolieren: `/output/final` Resize-/Fullscreen-/DPR-Lifecycle inklusive Stage-Viewport-Berechnung reproduzierbar analysieren.
2. Stage-/Canvas-Resize-Pipeline haerten: Display- und CSS-Pixel kohaerent berechnen, inkl. devicePixelRatio-sicherem Reinitialisieren.
3. Event-Handling vervollstaendigen: `resize`, `orientationchange`, `fullscreenchange` und DPR-Wechsel triggern deterministisches Reflow/Repaint.
4. Fullscreen-Fit erzwingen: Final-Output nutzt den vorgesehenen Renderbereich vollstaendig ohne Top-Left-Offset oder Letterbox-Artefakte.
5. Rendering-/Coords-/Clip-Non-Regression sichern: Inside/Outside/Room/Global-Pfade bleiben unter Resize/Fit semantisch korrekt.
6. P0-Verifikation + Artefakt-Sync abschliessen (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Priorisierte Feature-/Cleanup-Welle (Plan 8-HF7, execute-ready)
1. Boomerang-Decommission umsetzen: Outside-Editor-Controls, Runtime-State-Machine und aktive Playback-Pfade entfernen.
2. Persistenz-/Migrationsbereinigung umsetzen: boomerang-bezogene Felder nicht mehr schreiben/verwenden; Legacy-Read als toleranter no-op bleibt erhalten.
3. Inside-Animationsmodell auf definitionsgetriebenes Schema erweitern (Paritaet zu Outside inkl. `selectedAnimationId` + `animations[]`).
4. Neue Settings-Sektion `Inside Animations` mit Dropdown-Editor + Create-Flow fuer neue Inside-Animationen liefern.
5. Pro Inside-Animation Asset-Mapping liefern: `assetType` (`coded`/`gif`/`mp4`) + typspezifisch gefilterte `assetRef` aus `resources`.
6. Expliziten `Apply changes`-Commitpfad fuer Inside-Editor liefern, damit Type/Resource/Optionen atomar uebernommen werden.
7. Persistenz fuer Inside-Definitionsmodell ueber Save/Reload/Restart/Defaults inklusive Legacy-Guards absichern.
8. P0-Verifikation + Artefakt-Sync abschliessen (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Priorisierte Hotfix-Welle (Plan 8-HF8, execute-ready)
1. Outside-MP4-Restore: Root-Cause fuer ausgefallenes Outside-mp4 reproduzierbar isolieren und stabilen Playbackpfad wiederherstellen.
2. MP4-Non-Regression-Guard: sicherstellen, dass gif/coded und bereits stabile non-boomerang Pfade unveraendert korrekt bleiben.
3. Conditional-Visibility-Refactor: `outside mode`/`outside direction` nur fuer unterstuetzte Kontexte rendern (z. B. `coded` + `outside-space`).
4. Non-Applicable-Hide-Guard: Controls fuer `gif`/`mp4` und nicht-applicable coded renderer konsequent ausblenden.
5. UX-Cleanup: redundante Buttons `Use selected resource asset` entfernen; `Apply changes` als einziger Commitpfad verbleibt.
6. P0-Verifikation + Artefakt-Sync abschliessen (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

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
- Outside-Animationseinstellungen sind in einer eigenen Settings-Sektion (`Outside Animations`) gekapselt; `Play Area Editor` enthaelt diese Controls nicht mehr.
- Dropdown-basierte Auswahl der zu editierenden Outside-Animation funktioniert deterministisch und bleibt animation-spezifisch.
- Asset-Mapping ist pro Outside-Animation in UI bearbeitbar (`gif`/`mp4`/coded key) inkl. Auswahl vorhandener `resources`-Dateien.
- UI kann neue Outside-Animationen anlegen; neue Eintraege sind sofort editierbar und triggerbar.
- Outside-Animationsdefinitionen + Settings sind ueber Save/Reload/Restart sowie Defaults-Apply persistent und verlustfrei.
- `Coded/Space` nutzt wieder den vorregressionskonformen coded Star-Space Pfad (kein Black-Screen/Fallback).
- `Outside Sandstorm` laeuft ohne sichtbares Restart-Flackern/Rewind stabil durch.
- Asset-Type-Dropdown bleibt nach User-Auswahl stabil und springt nicht auf alte Werte zurueck.
- Outside-Editor besitzt `Apply changes`; Type/Resource/Optionen werden erst bei explizitem Apply gemeinsam und atomar uebernommen.
- Asset-Picker filtert strikt typspezifisch: `coded` zeigt nur coded keys, `mp4` nur `.mp4` aus `resources`, `gif` nur `.gif` aus `resources`.
- `Apply changes` bleibt der atomare Commit-Pfad; Outside-Settings bleiben ueber Save/Reload/Restart persistent deterministisch.
- `/output/final` skaliert im Browser-Fullscreen responsiv auf die echte Display-Aufloesung ohne Top-Left-Offset oder Letterbox-Drift.
- Canvas/Stage berechnen bei Resize, Orientation, Browser-Fullscreen-Wechsel und Device-Pixel-Ratio-Aenderung deterministisch neu.
- Rendering-, Koordinaten- und Clipping-Semantik bleibt unter Reflow/Fit stabil (kein Masken-/Coords-Bruch).
- Boomerang ist vollstaendig entfernt: keine UI-Option, keine Runtime-Ausfuehrung, keine aktive Persistenznutzung.
- Legacy-Payloads mit boomerang-bezogenen Feldern bleiben ladbar, aktivieren aber kein Boomerang-Verhalten und werden kanonisch ohne Boomerang gespeichert.
- `Inside Animations` bietet Outside-paritaetischen Editor mit Dropdown, Create-Flow und `Apply changes`.
- Neue Inside-Animationen sind in UI anlegbar; pro Eintrag sind `assetType` (`coded`/`gif`/`mp4`) und typspezifisch gefilterte `assetRef` aus `resources` waehlbar.
- Inside-Animationsdefinitionen + Settings bleiben ueber Save/Reload/Restart/Defaults persistenzstabil und migrationssicher.
- Neue Inside-/Outside-Animationseintraege sind definitionsgetrieben in UI hinzufuegbar, ohne codegebundene Einzelintegration pro Animation.
- Outside-mp4-Playback ist fuer nicht-boomerang Betrieb wiederhergestellt und laeuft regressionsfrei stabil.
- `outside mode` und `outside direction` sind kontextsensitiv sichtbar und werden fuer nicht-applicable Kontexte (insb. `gif`/`mp4`) nicht angezeigt.
- Redundante Buttons `Use selected resource asset` sind entfernt; `Apply changes` bleibt der einzige explizite Commitpfad in den Animationseditoren.
- Keine Regression in Trigger/Edit/Stop/Clear, Running-Liste, Save/Reload/Restart und `/output/final`.
- Phase-8-Artefakte sowie `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/CURRENT_PHASE.md` sind konsistent synchronisiert.

## Execution Update
- 2026-03-27: Plan 8-1 wurde atomar umgesetzt (P8-T1..P8-T12).
- Nachweis: `.planning/phases/phase-08/8-1-VERIFICATION.md`.
- 2026-03-27: Plan 8-HF1 wurde atomar umgesetzt (P8-T18..P8-T24).
- Nachweise: `.planning/phases/phase-08/8-HF1-VERIFICATION.md`, `.planning/phases/phase-08/P8-T20-REGRESSION.md`, `.planning/phases/phase-08/P8-T23-EMPTY-START-VALIDATION.md`.
- 2026-03-27: Plan 8-HF2 wurde atomar umgesetzt (P8-T25..P8-T34).
- Nachweise: `.planning/phases/phase-08/8-HF2-VERIFICATION.md`, `debug/p8-hf2-api-resources.json`, `debug/p8-hf2-api-health.json`.
- 2026-03-27: Neues verpflichtendes P0-Regressionsfeedback fuer Outside-Animationseditor priorisiert Plan 8-HF3 als naechste execute-ready Hotfix-Welle vor Plan 8-2.
- 2026-03-27: Plan 8-HF3 wurde atomar umgesetzt (P8-T35..P8-T40).
- Nachweise: `.planning/phases/phase-08/8-HF3-VERIFICATION.md`, `.planning/phases/phase-08/P8-T39-OUTSIDE-EDITOR-REGRESSION.md`, `debug/p8-hf3-api-resources.json`, `debug/p8-hf3-api-health.json`.
- 2026-03-27: Neues verpflichtendes P0-Regressionsfeedback priorisiert Plan 8-HF4 als naechste execute-ready Hotfix-Welle vor Plan 8-2.
- 2026-03-27: Plan 8-HF4 wurde atomar umgesetzt (P8-T41..P8-T46).
- Nachweise: `.planning/phases/phase-08/8-HF4-VERIFICATION.md`, `.planning/phases/phase-08/P8-T45-BOOMERANG-REGRESSION.md`.
- 2026-03-27: Neues verpflichtendes P0-Feedback (Sandstorm Reverse-Flicker) priorisiert Plan 8-HF5 als naechste execute-ready Hotfix-Welle vor Plan 8-2.
- 2026-03-27: Plan 8-HF5 wurde atomar umgesetzt (P8-T47..P8-T52).
- Nachweise: `.planning/phases/phase-08/8-HF5-VERIFICATION.md`, `.planning/phases/phase-08/P8-T47-REVERSE-ROOT-CAUSE.md`, `.planning/phases/phase-08/P8-T51-HF5-REGRESSION.md`.
- 2026-03-29: Neues verpflichtendes P0-Problem priorisiert Plan 8-HF6 als naechste execute-ready Hotfix-Welle vor Plan 8-2: `/output/final` muss in Browser-Fullscreen auf jede Aufloesung korrekt fitten (Resize/Orientation/Fullscreen/DPR inklusive).
- 2026-03-29: Plan 8-HF6 wurde atomar umgesetzt (P8-T53..P8-T58).
- Nachweise: `.planning/phases/phase-08/8-HF6-VERIFICATION.md`, `.planning/phases/phase-08/P8-T53-FINAL-OUTPUT-FULLSCREEN-ROOT-CAUSE.md`, `.planning/phases/phase-08/P8-T57-FINAL-OUTPUT-REFLOW-REGRESSION.md`.
- 2026-03-30: Neues verpflichtendes P0-Feature-/Cleanup-Paket priorisiert Plan 8-HF7 als naechste execute-ready Welle vor Plan 8-2 (Boomerang-Entfernung + Inside-Animations-Editor-Paritaet + definitionsgetriebenes Zielbild).
- 2026-03-30: Plan 8-HF7 wurde atomar umgesetzt (P8-T59..P8-T64).
- Nachweise: `.planning/phases/phase-08/8-HF7-VERIFICATION.md`, `.planning/phases/phase-08/P8-T64-HF7-REGRESSION.md`.
- 2026-03-30: Neues verpflichtendes P0-Feedback priorisiert Plan 8-HF8 als naechste execute-ready Hotfix-Welle vor Plan 8-2 (Outside-mp4-Restore + conditional visibility fuer outside controls + Apply-only UX-Cleanup).
- 2026-03-30: Plan 8-HF8 wurde atomar umgesetzt (P8-T65..P8-T70).
- Nachweise: `.planning/phases/phase-08/8-HF8-VERIFICATION.md`, `.planning/phases/phase-08/P8-T65-OUTSIDE-MP4-ROOT-CAUSE.md`, `.planning/phases/phase-08/P8-T66-MP4-NON-REGRESSION.md`.
