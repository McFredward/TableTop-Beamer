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

- Non-Regression-Running-Test: Start/Edit/Stop/Clear verhalten sich unveraendert stabil.
- Non-Regression-Final-Output-Test: `/output/final` bleibt funktional und zeigt korrekte inside/outside Separation.
- Non-Regression-Sync-Test: Multi-Client-Synchronisation bleibt fuer relevante Kontexte stabil.

## Inkrementelle Pflicht-Gates
- Nach P8-T1..P8-T3: Datenmodell + Loader/Save-Migration sind konsistent und idempotent.
- Nach P8-T4..P8-T7: Multi-Area-Editor + Union-Clipping sind funktional und leak-frei.
- Nach P8-T8..P8-T10: Bild-Upload-Import ist serverseitig sicher und UX-seitig bedienbar.
- Nach P8-T11..P8-T12: Regression ist PASS und alle Artefakte/globalen Tracking-Dateien sind synchron.

## Definition of Done
- Plan 8-1 P0-Tasks P8-T1..P8-T12 sind abgeschlossen.
- Mehrere Play-Areas pro Board sind produktiv nutzbar (create/delete/select/persist).
- Inside/Outside-Semantik basiert fachlich korrekt auf der Union aller Play-Areas.
- Legacy-Datenmigration ist verlustfrei und idempotent nachgewiesen.
- Board-Import per Bildupload ist funktional, validiert und serverseitig persistiert.
- Nach Bildupload ist der manuelle Polygonworkflow sofort verfuegbar.
- Keine Regression in Running, Save/Reload/Restart, Sync und `/output/final`.
- Phase-8-Artefakte sowie `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/CURRENT_PHASE.md` sind konsistent aktualisiert.

## Execution Result (Plan 8-1)
- Status: PASS
- Evidence: `.planning/phases/phase-08/8-1-VERIFICATION.md`
