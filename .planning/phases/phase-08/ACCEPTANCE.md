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

- Import-Filename-No-Horizontal-Break-Test: langer Bild-Dateiname streckt die Settings-Leiste nicht horizontal.
- Import-Filename-Render-Guard-Test: Dateiname wird robust umbrochen/abgeschnitten und ueberlaeuft weder nach links noch rechts.
- Settings-Panel-Width-Stability-Test: Settings-Panel bleibt bei langem Dateinamen ohne horizontalen Scrollbedarf bedienbar.

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
- Nach P8-T25..P8-T27: Dateinamen-Overflow-Guard ist stabil; Settings-Panel bleibt horizontal scrollfrei.
- Nach P8-T28: Hotfix-Verifikation ist PASS und alle Artefakte/globalen Tracking-Dateien sind synchron.

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
- Langer Bild-Dateiname verursacht kein horizontales Layout-Breaking im Settings-Panel.
- Dateinamen werden robust umbrochen/abgeschnitten dargestellt, ohne seitlichen Overflow.
- Settings-Panel bleibt in stabiler Breite ohne horizontalen Scrollbedarf bedienbar.
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
