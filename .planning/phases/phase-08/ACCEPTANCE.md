# Phase 8 Acceptance

## Regression- und Verifikationsstrategie
- Model-first: Mehrbereichsmodell und Migration sind zuerst fachlich korrekt, danach UX-Polish.
- Union-first: inside/outside wird ausschliesslich ueber die Union aller Play-Areas verifiziert.
- Migration-first: Bestandsdaten duerfen weder verschwinden noch stillschweigend verfremdet werden.
- Import-safety-first: Upload validiert Typ/Groesse/Pfad robust vor Persistenz.
- Evidence-first: jeder P0-Pfad benoetigt reproduzierbare Verify-Evidenz.
- Non-regression-duty: bestehende Trigger/Running/Save/Reload/Final-Output bleiben stabil.

## Pflichtmatrix (Plan 8-1)
- Multi-Play-Area-Create/Delete-Test: mehrere getrennte Areas koennen erstellt/geloescht und persistent gespeichert werden.
- Active-Area-Selection-Test: Editoraktionen wirken nur auf die aktive Play-Area und springen nicht implizit.
- Union-Inside-Render-Test: inside-Effekte erscheinen in jeder Area der Vereinigungsflaeche.
- Union-Outside-Render-Test: outside-Effekte erscheinen ausschliesslich ausserhalb der Vereinigungsflaeche.
- Union-Boundary-Leak-Test: keine Pixel-/Maskenlecks an Kanten oder zwischen getrennten Areas.
- Render-Input-Parity-Test: Hit-Tests/Selektion folgen derselben Geometriequelle wie das Clipping.

- Legacy-Migration-Load-Test: alte Single-Area-Daten werden beim Laden korrekt nach `playAreas[]` migriert.
- Migration-Idempotenz-Test: wiederholtes Laden/Speichern erzeugt keinen Drift und keine Doppelkonvertierung.
- Data-Preservation-Test: bestehende Raum-/Polygon-/Konfigurationsdaten bleiben nach Migration unveraendert nutzbar.
- Save-Reload-Restart-Test: Mehrbereichsdaten bleiben ueber Save/Reload/Restart konsistent erhalten.

- Image-Upload-Success-Test: gueltige Bilddatei (`jpg`/`jpeg`/`png`/`webp`) wird serverseitig gespeichert und als Board angelegt.
- Image-Upload-Validation-Test: ungueltige Typen/Groessen werden sauber mit klarer Fehlermeldung abgewiesen.
- Image-Board-Catalog-Test: neues Bildboard erscheint nach Upload im Katalog und ist direkt waehlbar.
- Image-Board-Manual-Polygon-Test: nach Upload ist manuelles Zeichnen von Play-Areas/Rooms sofort moeglich.
- Image-Import-Immediate-Select-Test: nach Upload+Import ist das neue Board direkt im Dropdown sichtbar und unmittelbar aktiv selektiert.
- Image-Import-Empty-Start-Test: importiertes Bildboard ohne vorhandene Play-Areas/Rooms startet stabil und erlaubt anschliessendes manuelles Anlegen.

- Settings-Room-Click-Priority-Test: Klick auf Room selektiert den Room deterministisch, auch wenn Room innerhalb einer Play-Area liegt.
- Settings-Play-Area-Click-Removed-Test: Board-Klick selektiert keine Play-Area mehr; Room-Selektion bleibt priorisiert.
- Selection-Edit-NonRegression-Test: Vertex-/Room-Edit und Keyboard-Aktionen bleiben nach Selection-Arbitration-Fix stabil.

- Outside-Sandstorm-Availability-Test: `Outside Sandstorm` ist als Outside-Animation auswuehlbar und an `sandstorm.mp4` gebunden.
- Outside-Sandstorm-Muted-Test: `Outside Sandstorm` laeuft verpflichtend ohne Audio (auch bei globalen Audio-Einstellungen unveraendert stumm).
- Outside-Boomerang-Playback-Test: aktiviertes Boomerang laeuft Ende->Rueckwaerts->Anfang->Vorwaerts ohne sichtbaren Lifecycle-Bruch.
- Outside-Boomerang-Disabled-Test: deaktiviertes Boomerang nutzt normales Vorwaerts-Playback ohne Rueckwaertsphase.
- Outside-Section-Ownership-Test: Outside-Animationscontrols sind ausschliesslich in `Outside Animations`; `Play Area Editor` enthaelt keine Outside-Config-Controls.
- Outside-Animation-Dropdown-Test: Dropdown waehlt deterministisch die zu bearbeitende Outside-Animation; Settings aendern nur den aktiven Eintrag.
- Outside-Asset-Mapping-Type-Test: pro Animation sind Asset-Typen `gif`/`mp4`/coded key validierbar und persistierbar.
- Outside-Animation-Create-Test: UI kann neue Outside-Animation anlegen; neuer Eintrag ist direkt editierbar und triggerbar.
- Outside-Resource-Picker-Test: vorhandene Dateien aus `resources` sind auswuehlbar und werden korrekt als `assetRef` uebernommen.
- Outside-Persistence-Definitions-Test: Definitionen + Settings ueberleben Save/Reload/Restart und Defaults-Apply ohne Drift.
- Outside-Legacy-Migration-Test: bestehende Legacy-Outside-Konfigurationen werden verlustfrei in das neue Definitionsmodell ueberfuehrt.

- Outside-Coded-Space-Restore-Test: `Coded/Space` rendert wieder erwartungskonform und bleibt nicht auf schwarzem Frame/Fallback stehen.
- Outside-Sandstorm-Stability-Test: `Outside Sandstorm` spielt kontinuierlich ohne permanentes Restart/Rewind-Flackern im Laufzeitbetrieb.
- Outside-Boomerang-Checkbox-Edit-Test: Boomerang-Checkbox ist setzbar/entfernbar und bleibt nach `Apply changes` + Reload deterministisch erhalten.
- Outside-Asset-Type-Stability-Test: Asset-Type-Dropdown (`gif`/`mp4`/coded key) springt nicht zurueck und bleibt bis explizitem Apply stabil editierbar.
- Outside-Apply-Atomicity-Test: `Apply changes` uebernimmt Type + Resource + Optionen atomar im selben Commit, ohne Teilapply bei Zwischenzustand.

- Outside-Coded-StarSpace-Restore-Test: `Coded/Space` zeigt wieder den funktionierenden coded Star-Space Effekt statt schwarzem Frame/Fallback.
- Outside-Asset-Picker-Coded-Filter-Test: bei `assetType=coded` listet der Picker ausschliesslich coded renderer keys.
- Outside-Asset-Picker-MP4-Filter-Test: bei `assetType=mp4` listet der Picker ausschliesslich `.mp4` Assets aus `resources`.
- Outside-Asset-Picker-GIF-Filter-Test: bei `assetType=gif` listet der Picker ausschliesslich `.gif` Assets aus `resources`.
- Outside-Asset-Picker-Type-Switch-Test: Wechsel zwischen `coded`/`mp4`/`gif` aktualisiert die Pickerliste deterministisch ohne stale Optionen oder Auto-Revert.
- Outside-Boomerang-Full-Cycle-Test: Playback laeuft voll vorwaerts bis Ende, dann voll rueckwaerts bis Anfang, danach wieder vorwaerts.
- Outside-Boomerang-No-Flicker-Test: Zwischen den Richtungswechseln treten keine sichtbaren on/off Flicker und keine abrupten Restart-Jumps auf.
- Outside-Sandstorm-Reverse-Lifecycle-RootCause-Test: Reverse-Phase-Flicker ist reproduzierbar analysiert (Forward-Ende, Reverse-Umschaltung, Reverse-Lauf) und mit eindeutigem Fix-Pfad belegt.
- Outside-Sandstorm-Reverse-Visual-Stability-Test: Reverse-Abschnitt laeuft kontinuierlich ohne starkes Flackern; Boomerang-Zyklus bleibt nahtlos.
- Outside-MP4-NonBoomerang-NonRegression-Test: deaktiviertes Boomerang behaelt stabilen normalen mp4-Vorwaerts-Loop ohne Lifecycle-Regressionsartefakte.
- Outside-Apply-Persistence-Intact-Test: `Apply changes` sowie Save/Reload/Restart halten `boomerang`/`assetType`/`assetRef` nach HF5 unveraendert deterministisch.

- Non-Regression-Running-Test: Start/Edit/Stop/Clear verhalten sich unveraendert stabil.
- Non-Regression-Final-Output-Test: `/output/final` bleibt funktional und zeigt korrekte inside/outside Separation.
- Non-Regression-Sync-Test: Multi-Client-Synchronisation bleibt fuer relevante Kontexte stabil.

## Inkrementelle Pflicht-Gates
- Nach P8-T1..P8-T3: Datenmodell + Loader/Save-Migration sind konsistent und idempotent.
- Nach P8-T4..P8-T7: Multi-Area-Editor + Union-Clipping sind funktional und leak-frei.
- Nach P8-T8..P8-T10: Bild-Upload-Import ist serverseitig sicher und UX-seitig bedienbar.
- Nach P8-T11..P8-T12: Regression ist PASS und alle Artefakte/globalen Tracking-Dateien sind synchron.
- Nach P8-T18..P8-T20: Room-Selection-Prioritaet ist hergestellt; Play-Area-Click-Selection ist entfernt.
- Nach P8-T21..P8-T23: Import-Success zeigt sofort Dropdown-Sichtbarkeit + Auto-Select; Empty-Start ist stabil.
- Nach P8-T24: Hotfix-Verifikation ist PASS und alle Artefakte/globalen Tracking-Dateien sind synchron.
- Nach P8-T25..P8-T27: Outside-Sandstorm ist verfuegbar/stumm und Boomerang-Playback arbeitet lifecycle-stabil.
- Nach P8-T28..P8-T32: Outside-Settings sind ausgelagert, Dropdown/Edit/Create/Asset-Picker funktionieren deterministisch.
- Nach P8-T33..P8-T34: Persistenz/Migration fuer Outside-Animationen ist PASS und Artefakt-Sync ist abgeschlossen.
- Nach P8-T35..P8-T37: Outside-Playback-/Editor-Regressionen (`Coded/Space`, Sandstorm, Boomerang, Asset-Type) sind geschlossen.
- Nach P8-T38..P8-T39: `Apply changes` atomisiert Outside-Edit-Commits; Save/Reload/Restart-Determinismus ist PASS.
- Nach P8-T40: Hotfix-Verifikation ist PASS und alle Artefakte/globalen Tracking-Dateien sind synchron.
- Nach P8-T41: `Coded/Space` ist erneut auf funktionierendem coded Star-Space Verhalten verifiziert.
- Nach P8-T42..P8-T44: Asset-Picker-Filterung ist pro `assetType` strikt und deterministisch ohne stale/revert Drift.
- Nach P8-T45: Boomerang-Full-Cycle (Forward->Reverse->Repeat) ist ohne sichtbares Flicker/Restart-Jump PASS.
- Nach P8-T46: Hotfix-Verifikation ist PASS und alle Artefakte/globalen Tracking-Dateien sind synchron.
- Nach P8-T47: Root-Cause fuer Reverse-Flicker ist reproduzierbar dokumentiert und fix-gerichtet isoliert.
- Nach P8-T48..P8-T49: Sandstorm-Boomerang-Reverse ist visuell stabil; normaler mp4-Non-Boomerang-Pfad bleibt regressionsfrei PASS.
- Nach P8-T50..P8-T51: Apply/Persistenz-Paritaet bleibt intakt; Regression- und Evidence-Matrix ist vollstaendig dokumentiert.
- Nach P8-T52: Hotfix-Verifikation ist PASS und alle Artefakte/globalen Tracking-Dateien sind synchron.

## Definition of Done
- Plan 8-1 P0-Tasks P8-T1..P8-T12 sind abgeschlossen.
- Mehrere Play-Areas pro Board sind produktiv nutzbar (create/delete/select/persist).
- Inside/Outside-Semantik basiert fachlich korrekt auf der Union aller Play-Areas.
- Legacy-Datenmigration ist verlustfrei und idempotent nachgewiesen.
- Board-Import per Bildupload ist funktional, validiert und serverseitig persistiert.
- Nach Bildupload ist der manuelle Polygonworkflow sofort verfuegbar.
- Room-Klick in Settings priorisiert Selektion deterministisch; Play-Area-Selektion per Klick ist entfernt.
- Erfolgreicher Bildupload fuehrt zu sofort sichtbarem Board im Dropdown und direkter Aktivselektion.
- Importierte Bildboards ohne initiale Polygone sind als gueltiger Startzustand ohne Runtime-/Editorfehler bedienbar.
- `Outside Sandstorm` ist als neue Outside-Animation produktiv verfuegbar, nutzt `sandstorm.mp4` und bleibt ohne Audio.
- Outside-Animationen unterstuetzen optionales Boomerang-Playback pro Animation ohne Start/Stop/Clear-Regression.
- Outside-Animationseinstellungen leben in eigenstaendiger Sektion `Outside Animations`; `Play Area Editor` ist davon entkoppelt.
- Asset-Mapping pro Outside-Animation ist in UI bearbeitbar (`gif`/`mp4`/coded key) inkl. Auswahl vorhandener `resources`-Dateien.
- UI kann neue Outside-Animationen anlegen; Definitionen + Settings sind persistent ueber Profile/Defaults.
- `Coded/Space` ist auf den zuletzt funktionierenden coded Star-Space Renderpfad zurueckgefuehrt und bleibt sichtbar stabil.
- `Outside Sandstorm` spielt stabil ohne sichtbares Restart-/Rewind-Flackern.
- Boomerang-Checkbox ist stabil editierbar; Asset-Type-Dropdown bleibt stabil editierbar und springt nicht zurueck.
- `Apply changes` ist als verpflichtender Commit-Schritt im Outside-Animation-Editor vorhanden und uebernimmt Type/Resource/Optionen atomar.
- Asset-Picker filtert strikt typspezifisch (`coded` keys, `mp4` nur `.mp4` aus `resources`, `gif` nur `.gif` aus `resources`).
- Boomerang-Playback folgt dem vollen Forward->Reverse->Repeat-Zyklus ohne sichtbaren on/off Flicker oder abrupten Restart-Uebergang.
- Sandstorm-Boomerang ist im Reverse-Abschnitt visuell stabil (kein starkes Reverse-Flicker) und bleibt ueber mehrere Zyklen nahtlos.
- Normales mp4-Playback ohne Boomerang bleibt nach dem HF5-Fix unveraendert stabil (keine neue Lifecycle-Regression).
- `Apply changes` und Persistenz (`Save/Reload/Restart`) bleiben fuer Outside-Definitionen voll funktionsfaehig und deterministisch.
- Keine Regression in Running, Save/Reload/Restart, Sync und `/output/final`.
- Phase-8-Artefakte sowie `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/CURRENT_PHASE.md` sind konsistent aktualisiert.

## Execution Result (Plan 8-1)
- Status: PASS
- Evidence: `.planning/phases/phase-08/8-1-VERIFICATION.md`

## Execution Result (Plan 8-HF1)
- Status: PASS
- Evidence:
  - `.planning/phases/phase-08/8-HF1-VERIFICATION.md`
  - `.planning/phases/phase-08/P8-T20-REGRESSION.md`
  - `.planning/phases/phase-08/P8-T23-EMPTY-START-VALIDATION.md`

## Execution Result (Plan 8-HF2)
- Status: PASS
- Evidence:
  - `.planning/phases/phase-08/8-HF2-VERIFICATION.md`
  - `debug/p8-hf2-api-resources.json`
  - `debug/p8-hf2-api-health.json`

## Execution Result (Plan 8-HF3)
- Status: PASS
- Evidence:
  - `.planning/phases/phase-08/8-HF3-VERIFICATION.md`
  - `.planning/phases/phase-08/P8-T39-OUTSIDE-EDITOR-REGRESSION.md`
  - `debug/p8-hf3-api-resources.json`
  - `debug/p8-hf3-api-health.json`

## Execution Result (Plan 8-HF4)
- Status: PASS
- Evidence:
  - `.planning/phases/phase-08/8-HF4-VERIFICATION.md`
  - `.planning/phases/phase-08/P8-T45-BOOMERANG-REGRESSION.md`

## Execution Result (Plan 8-HF5)
- Status: PASS
- Evidence:
  - `.planning/phases/phase-08/8-HF5-VERIFICATION.md`
  - `.planning/phases/phase-08/P8-T47-REVERSE-ROOT-CAUSE.md`
  - `.planning/phases/phase-08/P8-T49-MP4-NON-BOOMERANG-REGRESSION.md`
  - `.planning/phases/phase-08/P8-T50-APPLY-PERSISTENCE-REGRESSION.md`
  - `.planning/phases/phase-08/P8-T51-HF5-REGRESSION.md`
