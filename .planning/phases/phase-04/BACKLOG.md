# Phase 4 Backlog (Prepared)

## Epics
- Architecture Decomposition (`app.js` -> modulare Struktur)
- State and Domain Isolation
- Persistence/API Isolation
- Room Model Generalization (CRUD + freie Polygone + Namensschema)
- Data Migration and Backward Compatibility
- GIF Engine and Render Pipeline Isolation
- UI Binding and Input Isolation
- Desktop Operator Layout Hardening (Running-Containment)
- Preview-Staging Decommission
- Editor/Immersion-Polish Hotfix (Handle-Size, Random-Flicker, Room-Drag)
- Editor/Audio-Polish Hotfix II (Handle-Paritaet, Flicker-Cleanup, Sound-Persistenz)
- Verify-4-5 Gap-Closure Mini-Hotfix (Audio Persist-on-change + Reload-Determinismus)
- Regression and Verification Hardening

## Story Mapping
- P4-S1.1 Zielstruktur fuer `src/app/**` anlegen und Entry-Point kompatibel halten.
- P4-S1.2 Modulgrenzen und Dependency-Regeln als verbindliche Leitplanken definieren.
- P4-S1.3 Konstanten/Datenschemata (`boards`, `animations`, defaults) in dedizierte Config-Module auslagern.
- P4-S2.1 Pure Utilities und Normalizer aus `app.js` extrahieren und zentralisieren.
- P4-S2.2 Runtime-State, Defaults und Selektoren in `state`-Module ueberfuehren.
- P4-S2.3 Domain-Service fuer Room/Global Trigger/Edit/Stop mit stabilen IDs kapseln.
- P4-S3.1 LocalStorage/Profilmigration in `persistence` isolieren.
- P4-S3.2 Save-/Load-API inkl. Resolver/Preflight/Error-Klassifikation in `api` isolieren.
- P4-S3.3 Save-/Load-UI-Feedback an neue API-Facade anbinden.
- P4-S4.1 Room-Registry in `domain/rooms` einfuehren (stabile IDs, Name, Polygon, Reihenfolge).
- P4-S4.2 Settings-Flow fuer Raum anlegen/loeschen umsetzen (Hexagon als optionale Startvorlage).
- P4-S4.3 Jeder Raum als frei editierbares Polygon (Insert/Delete/Move, Validierungsregeln) fuehren.
- P4-S4.4 Frei editierbare Raumnamen inkl. UI-/Runtime-Sync umsetzen.
- P4-S5.1 Profil-/Defaults-Schema auf neuen JSON-Standard migrieren (`rooms[]` statt starres Raumset).
- P4-S5.2 Legacy-Loader fuer bestehende Datenstaende halten (alt lesen, neu schreiben, keine Datenverluste).
- P4-S6.1 GIF-Lade-/Decode-/Scheduler-Logik in `gif`-Module splitten.
- P4-S6.2 Renderpfade (`room`, `global-inside`, `global-outside`) in `render` kapseln.
- P4-S6.3 Clipping- und Masken-Utilities renderer-uebergreifend vereinheitlichen.
- P4-S7.1 Dashboard-/Settings-View-Controller aus monolithischem Event-Wiring extrahieren.
- P4-S7.2 Pointer/Touch/Keyboard-Input (inkl. Pan/Edit-Guard) modularisieren.
- P4-S7.3 Running-Liste in Desktop-Ansicht hart begrenzen (scrollbar/layout-separiert), damit Controls immer erreichbar bleiben.
- P4-S7.4 Preview-Staging vollstaendig entfernen (UI + Runtime + State + Flows) bei stabilen Kernfunktionen.
- P4-S7.5 Polygon-Editor-Handles skalierbar machen (groesse einstellbar nahe Zoom-Controls) fuer Praezisionsarbeit bei hohem Zoom.
- P4-S7.6 `lichtflackern` auf unregelmaessiges, kaputtes Random-Flicker umstellen (Dead-Space-aehnliche Charakteristik) bei strikt raumbegrenztem Clipping.
- P4-S7.7 Settings-Edit-Mode: gesamtes Room-Polygon per LMB-Flaechen-Drag verschiebbar machen, ohne Vertex-Edit-Flows zu brechen.
- P4-S7.8 Handle-Size-Contract auf ALLE Editor-Punkte erweitern (inkl. Ship-Polygon-Vertices), mit identischem Radius- und Hitarea-Verhalten.
- P4-S7.9 `lichtflackern` visuell bereinigen: horizontale weisse Streifen/Glitch-Baender entfernen, Random-Flicker-Stil beibehalten.
- P4-S7.10 `lichtflackern`-Speedbereich auf mind. 10% Mindest-Speed erweitern (UI + Runtime + Validator konsistent).
- P4-S7.11 Sound-Mapping/Sound-Auswahl persistent machen (Profilspeicher + Reload-Paritaet + Legacy-Fallback).
- P4-S7.12 Global-Defaults-Save/Load fuer Sound-Einstellungen erweitern, damit Mapping-Aenderungen server-/repo-seitig uebernehmbar bleiben.
- P4-S7.13 Audio-/Sound-Mapping-UI-Handler auf Persist-on-change umstellen (Aenderung schreibt sofort LocalStorage).
- P4-S7.14 Reload-Determinismus sichern: Direkt-Reload nach Audio-/Mapping-Aenderung laedt immer den zuletzt geaenderten Stand.
- P4-S7.15 Kurze fokussierte Regression-Doku fuer Persist-on-change + Reload-Determinismus bereitstellen.
- P4-S8.1 Regression-Matrix (funktional + mobile + cross-browser GIF) ausfuehrbar dokumentieren.
- P4-S8.2 Finale Paritaetsabnahme und Wartbarkeits-Readme bereitstellen.

## Priorisierte erste Ausfuehrungswelle (P0)
- Story P4-S1.1 + P4-S1.2 + P4-S1.3.
  - Ziel: stabile Zielstruktur und risikoarme Erstextraktion ohne Laufzeitaenderung.
- Story P4-S2.1 + P4-S2.2.
  - Ziel: pure Logik und State aus dem Monolith loesen, um weitere Schritte zu entkoppeln.
- Story P4-S3.1 + P4-S3.2.
  - Ziel: Persistenz/API als eigenstaendige Schichten fuer sichere spaetere Refactors.

## Priorisierte zweite Ausfuehrungswelle (P0) - Plan 4-2 execute-ready
- Story P4-S4.1 + P4-S4.2 + P4-S4.3 + P4-S4.4.
  - Ziel: allgemeines Raummodell mit Room-CRUD, freien Polygonen und Custom-Namen produktiv machen.
- Story P4-S5.1 + P4-S5.2.
  - Ziel: neues JSON-Standardschema einfuehren, Bestandsprofile verlustfrei migrieren, Legacy-Loads stabil halten.

## Priorisierte dritte Ausfuehrungswelle (P0) - neues Pflicht-Feedback
- Story P4-S7.3.
  - Ziel: Desktop-Bedienbarkeit sichern; Running-Liste ueberdeckt/verdraengt keine Module mehr.
- Story P4-S7.4.
  - Ziel: Preview-Staging technisch vollstaendig decommissionen, ohne Trigger/Edit/Stop/Save zu brechen.

## Priorisierte vierte Ausfuehrungswelle (P0) - Editor/Immersion-Polish Hotfix (execute-ready)
- Story P4-S7.5.
  - Ziel: Handle-Groesse in Settings direkt neben Zoom bedienbar machen, damit Vertex-Arbeit bei starkem Zoom praezise bleibt.
- Story P4-S7.6.
  - Ziel: `lichtflackern` als unregelmaessiges Horror-Random-Flicker umsetzen, weiterhin strikt auf Zielraum begrenzt.
- Story P4-S7.7.
  - Ziel: Room-Polygon Photoshop-aehnlich per Flaechen-Drag verschieben, ohne Insert/Delete/Vertex-Drag zu regressieren.

## Priorisierte fuenfte Ausfuehrungswelle (P0) - weiteres Pflicht-Feedback (execute-ready)
- Story P4-S7.8.
  - Ziel: Handle-Groessenlogik fuer alle Editoren angleichen; Ship-Polygon-Vertices erhalten dieselbe Visual-/Hitarea-Paritaet.
- Story P4-S7.9 + P4-S7.10.
  - Ziel: `lichtflackern` ohne stoerende horizontale Weissstreifen, weiterhin stiltreu; langsamere Wiedergabe bis 10% ermoeglichen.
- Story P4-S7.11 + P4-S7.12.
  - Ziel: Sound-Mappings in UI dauerhaft speichern (inkl. Reload) und ueber Global Defaults persistierbar machen.

## Priorisierte sechste Ausfuehrungswelle (P0) - Verify-4-5 Rest-Gap Mini-Hotfix (execute-ready)
- Story P4-S7.13 + P4-S7.14.
  - Ziel: relevante Audio-/Sound-Mapping-Handler persistieren sofort; Reload direkt nach Aenderung bleibt deterministisch.
- Story P4-S7.15.
  - Ziel: kurze Regression mit 1-click/1-reload-Nachweis fuer Persist-on-change dokumentieren.

## P1 direkt danach
- Story P4-S6.1 + P4-S6.2 + P4-S6.3.
  - Ziel: GIF/Render-Strang modularisieren, ohne Loop-/Clipping-Regression.
- Story P4-S7.1 + P4-S7.2.
  - Ziel: UI-Wiring handhabbar machen und Interaktionspfade klar isolieren.

## P1 Abschluss
- Story P4-S8.1 + P4-S8.2.
  - Ziel: formale Paritaetsabnahme und dokumentierter Wartbarkeitsgewinn.
