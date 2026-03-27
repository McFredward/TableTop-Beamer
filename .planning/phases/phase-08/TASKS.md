# Phase 8 Tasks

Statuslegende: TODO | IN-PROGRESS | DONE
Prioritaetslabel: [P0] kritisch | [P1] hoch | [P2] mittel

## Plan 8-1 - Multi-Play-Area + Image Import Core Wave (erste Ausfuehrungswelle, execute-ready)
- [x] DONE P8-T1 [P0] Datenmodell auf `playAreas[]` heben (IDs, Polygonstruktur, Legacy-Ladealias fuer Single-Play-Area).
- [ ] TODO P8-T2 [P0] Idempotente Migration implementieren: bestehende `playAreaPolygon`/Legacy-Ship-Daten verlustfrei in `playAreas[]` ueberfuehren.
- [ ] TODO P8-T3 [P0] Persistenz-/Normalizer-Pfad aktualisieren: Save exportiert Mehrbereichsschema, Load akzeptiert Legacy+neu.
- [ ] TODO P8-T4 [P0] Settings-Editor erweitern: mehrere Play-Areas anlegen/loeschen/auswaehlen (inkl. Guard fuer Loeschpfad).
- [ ] TODO P8-T5 [P0] Editor-Interaktion haerten: aktive Play-Area steuert Vertex-/Polygonaktionen deterministisch.
- [ ] TODO P8-T6 [P0] Union-Geometriepfad implementieren: inside/outside nutzt Vereinigung aller Play-Areas statt Single-Polygon.
- [ ] TODO P8-T7 [P0] Render-/Clipping-/Hit-Test-Paritaet fuer Union-Maske absichern (kein Semantikdrift zwischen Render und Input).
- [ ] TODO P8-T8 [P0] Server-API fuer Bildupload-Import implementieren (`jpg`/`jpeg`/`png`/`webp`, multipart, validiert).
- [ ] TODO P8-T9 [P0] Upload-Speicherpfad + Board-Katalogintegration umsetzen (serverseitig persistiert, sofort auswahlbar).
- [ ] TODO P8-T10 [P0] Import-UX erweitern: JSON und Bild als gleichwertige Importoptionen; Bildimport endet im manuellen Polygon-Workflow.
- [ ] TODO P8-T11 [P0] Regression/Verifikation ausfuehren: Migration, Multi-Area-Union, Upload-Negativfaelle, Non-Regression fuer Running/Sync/Final.
- [ ] TODO P8-T12 [P0] Artefakt-Sync abschliessen: `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE` auf 8-1 Stand bringen.

## Plan 8-2 - Hardening Wave (nach 8-1)
- [ ] TODO P8-T13 [P1] Multi-Area UX-Polish (z. B. area naming, visibility toggles, duplicate/clone shortcuts).
- [ ] TODO P8-T14 [P1] Migration/Import Soak-Tests unter wiederholten Save/Reload/Restart-Zyklen dokumentieren.
- [ ] TODO P8-T15 [P1] Performance-Hardening fuer Union-Berechnung bei vielen Areas/Vertices validieren.

## Plan 8-3 - Production Gate Wave (nach 8-2)
- [ ] TODO P8-T16 [P1] Multi-Client Realsetup-Abnahme mit Multi-Play-Area + Image-Import auf control + `/output/final` durchfuehren.
- [ ] TODO P8-T17 [P1] Finale Betreiberabnahme und Rollout-/Fallback-Checkliste dokumentieren.
