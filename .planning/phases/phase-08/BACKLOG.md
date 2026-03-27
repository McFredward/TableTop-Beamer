# Phase 8 Backlog (Prepared)

## Epics
- Multi-Play-Area Domain Model
- Multi-Play-Area Settings UX
- Inside/Outside Union Runtime Semantics
- Legacy Data Migration and Compatibility
- Board Image Upload Import Pipeline
- Import UX and Catalog Integration
- Selection Arbitration + Import Activation Hotfix
- Regression and Evidence Hardening

## Story Mapping
- P8-S1.1 Kanonisches `playAreas[]` Modell definieren (IDs, label, polygon, metadata).
- P8-S1.2 Loader-Normalisierung fuer Legacy-Felder (`playAreaPolygon`/Ship-Aliase) implementieren.
- P8-S1.3 Persistenzvertrag auf neuen Mehrbereichsstandard anheben.

- P8-S2.1 Settings-UI fuer Play-Area-Erstellung bereitstellen.
- P8-S2.2 Settings-UI fuer Play-Area-Loeschung mit Guard/Bestaetigung bereitstellen.
- P8-S2.3 Aktive Play-Area-Auswahl fuer Editoraktionen verbindlich machen.

- P8-S3.1 Union-Maskenberechnung fuer mehrere Polygone implementieren.
- P8-S3.2 Inside/Outside-Clipping strikt auf Union-Maske umstellen.
- P8-S3.3 Render-/Hit-Test-Paritaet absichern (gleiche Geometriequelle).

- P8-S4.1 Idempotente Migration fuer bestehende gespeicherte Daten implementieren.
- P8-S4.2 Datenverlust-Guards fuer Save/Reload/Restart validieren.
- P8-S4.3 Export schreibt nur neues Schema; Legacy bleibt Ladekompatibilitaet.

- P8-S5.1 Bild-Upload-Endpoint fuer Board-Import implementieren (multipart/form-data).
- P8-S5.2 Datei-Validierung (Typ, Groesse, sicherer Name/Pfad) serverseitig absichern.
- P8-S5.3 Uploadtes Bild serverseitig speichern und Board-Metadaten erzeugen.

- P8-S6.1 Import-UI erweitert JSON-Import um Bildupload-Option.
- P8-S6.2 Neuer Bild-Board-Eintrag wird sofort im Katalog sichtbar.
- P8-S6.3 Bildboard startet in manuell editierbarem Polygon-Workflow.

- P8-S8.1 Play-Area-Click-Selection wird im Board-Input-Pfad vollstaendig entfernt.
- P8-S8.2 Room-Klick bleibt kanonischer, persistenter Selection-Pfad ohne Hold/Drag-Zwang.
- P8-S8.3 Erfolgreicher Bildimport aktualisiert Board-Dropdown deterministisch im selben Flow.
- P8-S8.4 Neu importiertes Bildboard wird unmittelbar als aktives Board selektiert (auch ohne Start-Polygone).

- P8-S7.1 Regression-Matrix fuer Multi-Play-Area + Image-Import erstellen.
- P8-S7.2 Negativtests fuer Upload-Validierung und Migrationssicherheit liefern.
- P8-S7.3 Vollstaendigen Artefakt-Sync mit globalen Planungsdateien abschliessen.

## Priorisierte erste Ausfuehrungswelle (P0) - Plan 8-1 execute-ready
- Story P8-S1.1 + P8-S1.2 + P8-S1.3.
  - Ziel: stabiles Mehrbereichsmodell mit Legacy-Kompatibilitaet.
- Story P8-S2.1 + P8-S2.2 + P8-S2.3.
  - Ziel: operatorfaehige Play-Area-CRUD/Selection im Settings-Editor.
- Story P8-S3.1 + P8-S3.2 + P8-S3.3.
  - Ziel: fachlich korrekte inside/outside Union-Semantik ohne Clipping-Drift.
- Story P8-S4.1 + P8-S4.2 + P8-S4.3.
  - Ziel: verlustfreie, idempotente Migration fuer Bestandsdaten.
- Story P8-S5.1 + P8-S5.2 + P8-S5.3.
  - Ziel: sicherer serverseitiger Bildupload als Board-Importpfad.
- Story P8-S6.1 + P8-S6.2 + P8-S6.3.
  - Ziel: einfacher Operator-Flow von Upload bis manueller Polygonbearbeitung.
- Story P8-S7.1 + P8-S7.2 + P8-S7.3.
  - Ziel: belastbare Verifikation und konsistente Artefaktlage.

## Priorisierte Hotfix-Welle (P0) - Plan 8-HF1 execute-ready
- Story P8-S8.1 + P8-S8.2.
  - Ziel: Room-Klick-Selection ist wieder deterministisch; Play-Area-Click-Selection ist entfernt.
- Story P8-S8.3 + P8-S8.4.
  - Ziel: Bildimport zeigt sofort sichtbaren Erfolg ueber Dropdown-Eintrag + direkte Board-Aktivierung.
- Story P8-S7.1 + P8-S7.3 (Hotfix-spezifisch erweitert).
  - Ziel: P0-Regression fuer Selection/Import plus konsistenter Artefakt-Sync.

## Nachgelagerte Wellen (vorlaeufig)
- Plan 8-2 Hardening (nach 8-HF1): UX-Polish fuer Multi-Area-Editing (z. B. area-rename, visibility toggles, quick duplicate).
- Plan 8-3 Production Gate: Realsetup-Abnahme (mehrere Clients + `/output/final`) mit Import/Migration-Soak.

## Execution Status
- 2026-03-27: Plan 8-1 Stories P8-S1.x bis P8-S7.x umgesetzt und verifiziert (`8-1-VERIFICATION.md`).
- 2026-03-27: Plan 8-HF1 Stories P8-S8.1..P8-S8.4 umgesetzt; Regression/Empty-Start-Evidenz ist PASS (`8-HF1-VERIFICATION.md`, `P8-T20-REGRESSION.md`, `P8-T23-EMPTY-START-VALIDATION.md`).
