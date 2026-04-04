# Phase 4 Plan (Prepared)

## Zielbild
Phase 4 ueberfuehrt den monolithischen Client aus `src/app.js` in eine modulare Projektstruktur mit klaren Verantwortlichkeiten, stabilen Schnittstellen und reproduzierbaren Regression-Gates. Zusaetzlich wird das bisher starre Raumset in ein allgemeines Raummodell ueberfuehrt (CRUD, freie Polygonform, frei editierbarer Name) und als neuer JSON-Standard fuer Defaults/Profile eingefuehrt, ohne Bestandsdaten zu brechen. Pflicht-Feedback ist verbindlich umgesetzt; zusaetzliches verpflichtendes Phase-4-Polish-Feedback ist als P0-Hotfix umgesetzt. Verify-4-5 Follow-up bleibt als Mini-Hotfix (P0) execute-ready offen: (1) Persist-on-change fuer relevante Audio/Sound-Mapping-UI-Handler, (2) deterministischer Reload direkt nach Aenderung ohne Timing-Luecke, (3) kurze fokussierte Regression-Doku.

## Zielarchitektur (Sollstruktur)

### Ordnerstruktur
- `src/app/boot/`: Application-Bootstrap, DOM-Mount, Initial-Load, Wire-Up.
- `src/app/state/`: zentraler Runtime-State, Defaults, Selektoren, State-Guards.
- `src/app/domain/`: fachliche Module (`animations`, `audio`, `rooms`, `profiles`, `geometry`).
- `src/app/render/`: Canvas-/Overlay-Renderer, Clipping, Room/Global/Outside Draw-Pipelines.
- `src/app/gif/`: GIF-Lader, Decoder-Adapter (native/fallback), Scheduler, Cache.
- `src/app/persistence/`: LocalStorage, Profil-Migrationen, Save-Payload-Building.
- `src/app/api/`: API-Resolver, Preflight, Save/Load-Client, Error-Klassifikation.
- `src/app/ui/`: View-Switching (`dashboard`/`settings`), Form-Bindings, Runtime-Liste, Feedback.
- `src/app/input/`: Pointer/Touch/Keyboard, Pan-vs-Edit Guards, Event-Normalisierung.
- `src/app/shared/`: Utilities, Constants, Typkontrakte (JSDoc), pure Helper.

### Modulgrenzen und Verantwortlichkeiten
- `state` haelt nur Zustand + pure Mutationen; keine DOM- oder Fetch-Logik.
- `ui` mappt State <-> DOM und ruft nur explizite Domain-Aktionen auf.
- `domain/rooms` kapselt Room-CRUD, Raumnamen, Polygon-Validierung und Referenzintegritaet.
- `domain/animations` verwaltet Trigger/Edit/Stop, Running-Integritaet und Instanzparameter.
- `render` rendert ausschliesslich auf Basis von Input-State und Render-Context.
- `gif` kapselt Decoder-Details vollstaendig; Renderer kennt nur einheitliche Frame-API.
- `persistence` und `api` bleiben voneinander getrennt (Storage vs Netzwerk).

### Boundary-Regeln
- Keine zyklischen Imports zwischen `ui`, `domain`, `render`, `api`, `persistence`.
- Einseitige Abhaengigkeit: `boot -> ui/domain -> state/shared`; nicht umgekehrt.
- Seiteneffekte nur in `boot`, `api`, `persistence`, `input`; Kernlogik bleibt testbar/pure.

## Scope
- Zerlegung von `src/app.js` in modulare Dateien mit stabilen Schnittstellen.
- Extraktion der grossen Querschnittsbereiche: State, GIF-Playback, Renderer, API, Persistenz, UI-Wiring.
- Verallgemeinerung des Raummodells: Raum anlegen/loeschen, freies Polygon je Raum, editierbarer Raumname.
- Hexagon nur als optionale Startform beim Anlegen neuer Raeume; danach voll frei editierbar.
- Neuer JSON-Standard fuer Defaults/Profile inkl. Migration bestehender Daten und Rueckwaertskompatibilitaet fuer Altstaende.
- Aufbau eines kompatiblen Entry-Points, sodass Build/Runtime unveraendert startet.
- P0-Hardening fuer Desktop-Layout: Running-Animations-Liste wird begrenzt (eigener Scrollbereich oder layout-separiert), damit restliche Bedienmodule immer erreichbar bleiben.
- Preview-Staging wird vollstaendig entfernt (UI-Elemente, Runtime-Logik, Zustandsobjekte, Event-/Rollback-Flows), ohne Trigger/Edit/Stop/Save-Kernfunktionen zu brechen.
- Polygon-Editor erhaelt eine einstellbare Handle-Groesse nahe den Zoom-Controls, damit Praezisionsarbeit bei hohem Zoom robust bleibt.
- `lichtflackern` wird von regelmaessigem Pulsieren auf unregelmaessiges, kaputt/gruseliges Random-Flicker umgestellt; Effekt bleibt strikt auf den Zielraum geclippt.
- Settings-Edit-Mode ermoeglicht Flaechen-Drag fuer das gesamte Room-Polygon (LMB auf Flaeche halten + ziehen), Photoshop-aehnlich und ohne Konflikt mit Vertex-Edit.
- Handle-Groessen-Contract wird auf alle Polygon-Editoren vereinheitlicht, inklusive Ship-Polygon-Vertices und deren Hit-Targets.
- `lichtflackern` behaelt den Random-Flicker-Charakter, entfernt aber horizontale weisse Streifen/Glitch-Artefakte.
- `lichtflackern` unterstuetzt langsamere Wiedergabe bis mindestens 10% Mindest-Speed (UI + Runtime + Validierung konsistent).
- Sound-Mapping/Sound-Auswahl wird persistent im Profilmodell gespeichert und nach Reload deterministisch wiederhergestellt.
- Save/Load fuer Global Defaults inkludiert Sound-Mappings, damit Einstellungen geraeteuebergreifend uebertragbar bleiben.
- Relevante Audio/Sound-Mapping-UI-Aenderungen persistieren sofort in LocalStorage (ohne zusaetzlichen Save-Schritt).
- Reload direkt nach Audio-/Mapping-Aenderung bleibt deterministisch (keine Rest-Gaps zwischen UI-Mutation und Storage-Stand).
- Mini-Hotfix-Regression dokumentiert den Sofort-Persistenzpfad kurz und reproduzierbar.
- Regression-Hardening durch Smoke-Checks + gezielte Szenario-Matrix.

## Out of Scope
- Wechsel von Tech-Stack/Build-Tool.
- Aenderungen an Spielregeln oder Effektinhalten.
- Komplexe Raum-Topologie-Features ausserhalb des Zielumfangs (z. B. Parent/Child-Raeume, Multi-Deck-Graph).

## Migrationsstrategie (sichere Inkremente)
1. Baseline einfrieren: Regressionsmatrix, zentrale Flows und Gate-Checks dokumentieren.
2. Modul-Shell anlegen: neue Struktur + Facaden ohne Verhaltensaenderung.
3. Konstanten/Schema zuerst extrahieren (risikoarm, gut diffbar).
4. Pure Utilities und Normalizer extrahieren (kein DOM/Fetch).
5. State + Selektoren extrahieren, bestehende Aufrufpfade adaptieren.
6. Persistenz/API extrahieren, Save/Load-Regression gegen Baseline laufen lassen.
7. Raummodell auf neuen JSON-Standard umstellen (CRUD + freie Polygone + Custom-Namen) inkl. Migration und Legacy-Loader.
8. Preview-Staging decommissionen (UI + Runtime + State) und betroffene Flows bereinigen; Desktop-Running-Liste gegen Overlap absichern.
9. Editor/Immersion-Hotfix umsetzen: Handle-Groesse, Random-Flicker-Rework, Room-Flaechen-Drag mit Guard gegen Vertex-Edit-Kollision.
10. Polish-Hotfix II umsetzen: Handle-Paritaet inkl. Ship-Vertices, Flicker-Artefakt-Cleanup + 10%-Speed-Floor, Sound-Persistenz inkl. Global-Defaults-Pfad.
11. Verify-4-5-Rest-Gap schliessen: Persist-on-change in Audio-/Sound-Mapping-Handlern + deterministischer Reload-Nachweis + Kurzregression.
12. GIF-Subsystem und Renderpfade modularisieren (mit Cross-Browser-Fallback-Gate).
13. UI/Event-Wiring auf Module umlegen.
14. Abschliessende Paritaets-Regression fahren.

## Milestones (priorisiert)
1. M1 Architektur-Skeleton + Import-Grenzen + Entry-Point-Kompatibilitaet.
2. M2 Config/State/Pure-Logic extrahiert, `app.js` deutlich verkleinert.
3. M3 API/Persistenz-Zerlegung ohne Save-Regression.
4. M4 Raummodell-Generalization live (Room-CRUD, freie Polygon-Editierung, Custom-Namen) inkl. Datenmigration.
5. M5 Preview-Decommission + Desktop-Containment live (kein Preview-Staging mehr; Controls trotz Running-Last erreichbar).
6. M6 Editor/Immersion-Polish-Hotfix live (Handle-Size-Control, Random-Flicker-Rework, Room-Flaechen-Drag).
7. M7 Editor/Audio-Polish-Hotfix II live (Handle-Paritaet inkl. Ship, Flicker-Cleanup + 10%-Speed-Floor, Sound-Persistenz inkl. Global Defaults).
8. M8 Verify-4-5 Gap-Closure-Hotfix live (Audio/Sound-Mapping Persist-on-change + Reload-Determinismus + Kurzregression).
9. M9 GIF/Render-Zerlegung ohne Clipping-, Loop- oder Performance-Regression.
10. M10 UI/Interaction-Zerlegung mit stabiler Mobile-/Settings-/Dashboard-Paritaet.
11. M11 Abschluss: Regression, Artefakt-Sync, Wartbarkeits-Doku.

## Definition of Done
- `src/app.js` ist zu einem schlanken Bootstrap/Composition-Entry reduziert.
- Kernfunktionen liegen in klar getrennten Modulen mit dokumentierten Schnittstellen.
- Settings unterstuetzt das Anlegen und Loeschen von Raeumen; jeder Raum hat frei editierbaren Namen und Polygon.
- Hexagon steht nur als optionale Startvorlage beim Room-Create bereit.
- Defaults/Profile liegen im neuen JSON-Standard; bestehende Daten werden verlustfrei migriert oder kompatibel geladen.
- Desktop-Dashboard bleibt voll bedienbar: Running-Liste ist begrenzt/scrollbar oder layout-separiert; keine verdeckten oder verdraengten Controls.
- Preview-Staging ist vollstaendig aus UI/Runtime/State entfernt; es existieren keine aktiven Preview-/Rollback-Pfade mehr.
- Polygon-Editor besitzt eine sichtbare Handle-Groessensteuerung nahe Zoom und liefert bei hohem Zoom praezise, stabile Handle-Selektion.
- `lichtflackern` zeigt ein unregelmaessiges Random-Flicker (kein periodisches Pulse-Muster), bleibt aber raumstreng geclippt.
- Im Settings-Edit-Mode kann das gesamte Room-Polygon per Flaechen-Drag verschoben werden, waehrend Vertex-Insert/Delete/Move weiterhin konsistent funktionieren.
- Handle-Groessensteuerung wirkt einheitlich auf alle Editor-Punkte, inklusive Ship-Polygon-Vertices (Visual + Hitarea ohne Drift).
- `lichtflackern` zeigt keine horizontalen weissen Streifen/Glitch-Baender; Stil bleibt unregelmaessig und gruselig.
- `lichtflackern` akzeptiert und rendert mindestens 10% Playback-Speed ohne Clipping-/Timing-Regression.
- Sound-Mapping-Auswahl ist profilpersistent und bleibt nach Reload exakt erhalten.
- Global-Defaults-Save/Load enthaelt Sound-Einstellungen/Mappings und kann diese vollstaendig wiederanlegen.
- Audio-/Sound-Mapping-UI-Handler persistieren relevante Aenderungen sofort in LocalStorage.
- Reload direkt nach einer Audio-/Sound-Mapping-Aenderung laedt deterministisch den gerade geaenderten Stand.
- Kurzregression fuer Persist-on-change + Reload-Determinismus ist als eigenes P0-Hotfix-Artefakt dokumentiert.
- Keine funktionalen Regressionen gegen die definierte Pflichtmatrix aus `ACCEPTANCE.md`.
- Save/API, GIF-Fallback, Clipping, Running-Liste und Mobile-UX bleiben nachweislich stabil.
- Phase-4-Artefakte (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE`) sind konsistent synchron.
