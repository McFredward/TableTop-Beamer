# Phase 8 Backlog (Prepared)

## Epics
- Multi-Play-Area Domain Model
- Multi-Play-Area Settings UX
- Inside/Outside Union Runtime Semantics
- Legacy Data Migration and Compatibility
- Board Image Upload Import Pipeline
- Import UX and Catalog Integration
- Selection Arbitration + Import Activation Hotfix
- Outside Animations Mars Feature Pack
- Outside Animation Editor Stability Hotfix
- Outside Asset-Picker + Boomerang Stability Hotfix
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

- P8-S9.1 Outside-Animationsmodell auf mehrere definierbare Animationen erweitern (inkl. `assetType`, `assetRef`, `boomerang`).
- P8-S9.2 Neue Outside-Animation `Outside Sandstorm` mit Asset `sandstorm.mp4` als stummer Default-Eintrag bereitstellen.
- P8-S9.3 Outside-Playback um optionales Boomerang-Playback pro Animation erweitern.
- P8-S9.4 Outside-Animationseinstellungen aus `Play Area Editor` in eigenstaendige Settings-Sektion `Outside Animations` verlagern.
- P8-S9.5 Dropdown-Editor fuer Auswahl/Bearbeitung der Outside-Animation inklusive Boomerang liefern.
- P8-S9.6 Asset-Mapping pro Outside-Animation im UI editierbar machen (`gif`/`mp4`/coded key).
- P8-S9.7 UI-Flow zum Anlegen neuer Outside-Animationen bereitstellen.
- P8-S9.8 Resource-Picker integrieren: vorhandene Dateien aus `resources` als Asset auswaehlbar machen.
- P8-S9.9 Persistenz fuer Outside-Animationsdefinitionen + Settings ueber Profile/Defaults absichern.

- P8-S10.1 `Coded/Space` Regression fixen: coded animation key laeuft wieder wie vor der Regression statt schwarzem Frame.
- P8-S10.2 `Outside Sandstorm` Playback stabilisieren: kein permanentes Restart/Rewind-Flackern im Livebetrieb.
- P8-S10.3 Boomerang-Checkbox und Asset-Type-Dropdown im Outside-Editor robust editierbar machen.
- P8-S10.4 `Apply changes`-Commit-UX einfuehren: Type/Resource/Optionen werden atomar gemeinsam uebernommen.
- P8-S10.5 Save/Reload-Determinismus fuer Outside-Editorwerte (`assetType`, `assetRef`, `boomerang`) inklusive Legacy-Guard absichern.

- P8-S11.1 `Coded/Space` erneut auf den funktionierenden coded Star-Space Renderer zurueckfuehren (kein Black-Screen/Fallback).
- P8-S11.2 Asset-Picker strikt typspezifisch filtern: `coded` -> nur coded keys, `mp4` -> nur `.mp4` aus `resources`, `gif` -> nur `.gif` aus `resources`.
- P8-S11.3 Asset-Type-Wechsel ohne stale Optionsreste/reverten: Kandidatenliste aktualisiert deterministisch pro Typ.
- P8-S11.4 Boomerang-Playback als stabile State-Machine erzwingen: voll vorwaerts bis Ende, voll rueckwaerts bis Anfang, Repeat.
- P8-S11.5 Boomerang-Playback ohne sichtbares on/off Flicker oder abrupten Restart-Uebergang absichern (inkl. Start/Stop/Clear/Reload).

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

## Priorisierte Feature-Welle (P0) - Plan 8-HF2 execute-ready
- Story P8-S9.1 + P8-S9.2 + P8-S9.3.
  - Ziel: neues Outside-Animationsmodell inkl. `Outside Sandstorm` und optionalem Boomerang-Playback ohne Audio.
- Story P8-S9.4 + P8-S9.5.
  - Ziel: eigenstaendige Settings-Sektion `Outside Animations` mit deterministischer Dropdown-Bearbeitung pro Animation.
- Story P8-S9.6 + P8-S9.7 + P8-S9.8.
  - Ziel: UI-editierbares Asset-Mapping und Create-Flow fuer neue Outside-Animationen auf Basis vorhandener `resources`-Assets.
- Story P8-S9.9 + P8-S7.1 + P8-S7.3.
  - Ziel: persistente Definitionen/Settings, P0-Regressionsevidenz und konsistenter Vollsync aller Planungsartefakte.

## Priorisierte Hotfix-Welle (P0) - Plan 8-HF3 execute-ready
- Story P8-S10.1 + P8-S10.2.
  - Ziel: Outside-Playback ist wieder visuell korrekt (`Coded/Space` restore, `Outside Sandstorm` stabil ohne Restart-Loop).
- Story P8-S10.3 + P8-S10.4.
  - Ziel: Outside-Editor ist wieder stabil editierbar; Eingaben werden explizit ueber `Apply changes` atomar uebernommen.
- Story P8-S10.5 + P8-S7.1 + P8-S7.3.
  - Ziel: Save/Reload-Determinismus fuer Outside-Editorwerte plus belastbare P0-Evidenz und konsistenter Artefakt-Sync.

## Priorisierte Hotfix-Welle (P0) - Plan 8-HF4 execute-ready
- Story P8-S11.1.
  - Ziel: `Coded/Space` ist erneut auf funktionierendem coded Star-Space Verhalten ohne Black-Screen regressionssicher.
- Story P8-S11.2 + P8-S11.3.
  - Ziel: Asset-Picker ist streng typgebunden und zeigt nur gueltige Quellen pro `assetType` ohne stale/revert Drift.
- Story P8-S11.4 + P8-S11.5.
  - Ziel: Boomerang spielt stabil vollstaendig Forward->Reverse in Endlosschleife ohne sichtbares Flicker/Restart-Jump.
- Story P8-S7.1 + P8-S7.3 (HF4-spezifisch erweitert).
  - Ziel: P0-Regressionen sind reproduzierbar geschlossen und alle Planungsartefakte bleiben konsistent synchron.

## Nachgelagerte Wellen (vorlaeufig)
- Plan 8-2 Hardening (nach 8-HF4): UX-Polish fuer Multi-Area-Editing (z. B. area-rename, visibility toggles, quick duplicate).
- Plan 8-3 Production Gate: Realsetup-Abnahme (mehrere Clients + `/output/final`) mit Import/Migration-Soak.

## Execution Status
- 2026-03-27: Plan 8-1 Stories P8-S1.x bis P8-S7.x umgesetzt und verifiziert (`8-1-VERIFICATION.md`).
- 2026-03-27: Plan 8-HF1 Stories P8-S8.1..P8-S8.4 umgesetzt; Regression/Empty-Start-Evidenz ist PASS (`8-HF1-VERIFICATION.md`, `P8-T20-REGRESSION.md`, `P8-T23-EMPTY-START-VALIDATION.md`).
- 2026-03-27: Plan 8-HF2 Stories P8-S9.1..P8-S9.9 umgesetzt; Outside-Featurepaket inkl. Sandstorm/Boomerang/Settings-Refactor/Asset-Picker/Persistenz ist PASS (`8-HF2-VERIFICATION.md`).
- 2026-03-27: Neues P0-Feedback fuer Outside-Regressionen priorisiert Plan 8-HF3 (Stories P8-S10.1..P8-S10.5) als naechste execute-ready Welle vor Plan 8-2.
- 2026-03-27: Plan 8-HF3 Stories P8-S10.1..P8-S10.5 umgesetzt; Outside-Restore/Stability/Apply-Atomicity/Persistence-Matrix ist PASS (`8-HF3-VERIFICATION.md`, `P8-T39-OUTSIDE-EDITOR-REGRESSION.md`).
- 2026-03-27: Neues P0-Feedback fuer Regressions-Rueckfall priorisiert Plan 8-HF4 (Stories P8-S11.1..P8-S11.5) als naechste execute-ready Welle vor Plan 8-2.
- 2026-03-27: Plan 8-HF4 Stories P8-S11.1..P8-S11.5 umgesetzt; coded restore, typspezifischer picker und boomerang full-cycle stability sind PASS (`8-HF4-VERIFICATION.md`, `P8-T45-BOOMERANG-REGRESSION.md`).
