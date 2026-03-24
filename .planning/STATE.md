# STATE

## Project
- Name: TT Beamer - Nemesis Overlay Prototype
- Context: Brettspiel-Beamer-Projekt fuer visuelle, nicht spielbeeinflussende Overlays
- Product Focus: OG-Nemesis als Startsystem

## Lifecycle
- Planning Mode: active
- Current Phase: 1
- Current Phase Key: phase-01
- Last Prepared: 2026-03-24
- Execution Readiness: READY
- Last Executed Plan: 1-11
- Last Execution Summary: `.planning/phases/phase-01/1-11-SUMMARY.md`

## Source Inputs
- docs/PHASE1-BACKLOG.md
- docs/PHASE1-PLAN.md
- docs/PHASE2-PLAN.md

## Decision Log
- Preview-vs-Live bleibt fuer Phase 1 out of scope (laut Plan), wird in Phase 2 vorbereitet.
- Dashboard bleibt manuell mit Triggern, Preview erst ab Phase 2.
- Safety-Pfad (`Clear All`) hat prioritaere Umsetzung in Phase 1.
- Effektsteuerung nutzt ein gemeinsames Laufzeitmodell (`runningAnimations`) mit Scope `global`/`room`.
- Session-Status bleibt in Phase 1 bewusst runtime-lokal (kein `sessionStorage`, kein Profil-Model).
- `Clear All` wird als globaler Sofort-Stop ueber einen expliziten UI-Button ausgefuehrt.
- Plan-Update 1 setzt Prioritaetsfokus: P0 Power Outage, P1 Room-Click UX, P1 Per-Room Animation Config, P2 Output Device.
- Room-Zonen werden als klickbare Overlay-Hit-Areas verwaltet; das Raum-Submenu liefert die Triggerparameter.
- Output-Routing nutzt Fullscreen als Zielpfad und faellt bei Fehlern automatisch auf Windowed Preview zurueck.
- Raum-Hitareas sind als board-spezifische Hex-Polygone mit Hover/Selection Rueckmeldung umgesetzt.
- Raumlabels bleiben neutral (`Hex A-xx`/`Hex B-xx`); einzig freigegebene Semantik sind die 5 Special-Raeume.
- Animationen sind klar nach Scope getrennt (`global` vs `room`); room-Renderings werden auf den Zielraum geclippt.
- Running-Animations-Liste bietet `Stop` fuer alle und `Edit` fuer room-Eintraege.
- Room-Selektion wird pro Board gemerkt, damit Board-Wechsel den Kontext stabil halten.
- Runtime-Liste kennzeichnet Scope explizit (`GLOBAL`/`ROOM`) und Edit springt in den Board-Kontext der Animation.
- Power-Outage nutzt sichtbare Abdunkelung; Output-Route meldet Fullscreen-Fallback explizit.
- Plan-Update 2 setzt Prioritaetsfokus: P0 exakte Hitarea-Passung + manueller Verifikationsfokus, P1 Special-Room Mapping, P1 Event-Sounds mit globalen Audio-Settings.
- Special-Room Set ist fest definiert: `Cockpit (links)`, `Cryoschlaf (Mitte)`, `Maschinenraum 1-3 (rechts)`.
- Event-Sounds sind in Phase 1 auf `Intruder Alert`, `Reactor Pulse` und `Power Outage` begrenzt.
- Manuelle Pflichttests im realen Beamer-Setup sind Gate fuer den Abschluss von Plan-Update 2.
- Hex-Hitareas wurden fuer beide Boards mit Flat-Top-Geometrie nachkalibriert; kleine Toleranz bleibt nur an Randflaechen.
- Special-Room Mapping wurde als festes 5er-Set mit board-spezifischen Polygonen umgesetzt.
- Event-Sounds laufen als lizenzsichere WebAudio-Synth-Cues mit globalem Master (default ON) und Lautstaerke-Regler.
- Plan-Update 3 setzt Prioritaetsfokus: P0 manuelle Hitarea-Feinkalibrierung per Sliderseite (Offset/Scale) mit Persistenz pro Board statt Auto-Tuning.
- Spezialraum-Animationen gelten erst als done, wenn Running-List und sichtbarer Renderzustand 1:1 konsistent sind.
- Bekannter Kritikal-Bug: Kombination `Spezialraum + Alarm Beacon` kann visuellen Animationspfad stoppen; Fix und Regression-Guard sind P0.
- Hitarea-Feinjustierung erfolgt ausschliesslich ueber sichtbare Slider-Settings (X/Y/Scale) und wird pro Board persistent gespeichert.
- Render-Stabilitaet ist per Animation isoliert (`try/catch` + `try/finally`) abgesichert; Einzel-Fehler stoppen den globalen Draw-Timer nicht mehr.
- Plan-Update 4 setzt Prioritaetsfokus: P0 raumindividuelle Kalibrierung (Position relativ/absolut + Stretch X/Y), P0 separate Settings-Seite fuer Kalibrierung/Shape, P0 Spezialraum-Polygoneditor, P1 Persistenz pro Board fuer Gesamtprofil.
- Geometrie wird ab Plan-Update 4 nicht mehr nur global, sondern pro Raum verwaltet; Distanzkorrekturen zwischen Raeumen sind explizit erlaubt.
- Spezialraum-Polygone duerfen als freie Formen gespeichert werden; erforderliche Editoraktionen sind Vertex Insert/Delete/Move.
- Haupt-Dashboard bleibt Trigger-zentriert; Kalibrier- und Shape-Workflows werden ausschliesslich im Settings-Bereich gefuehrt.
- Per-Room-Geometrie wird transform-first gerechnet (REL/ABS + Stretch), danach erst globale Hitarea-Kalibrierung angewandt.
- Spezialraum-Polygone werden als freie Vertex-Listen pro Board gehalten und im Overlay direkt editiert.
- Persistenz nutzt ein gemeinsames Board-Profil-Schema (`tt-beamer.board-profiles.v1`) mit Legacy-Hitarea-Fallback.
- Plan-Update 5 setzt Prioritaetsfokus: P0 echter Tab-/View-Switch fuer `Settings`, P0 Photoshop-aehnliches Vertex-Editing (sichtbare Handles, aktive Ecke, Insert/Delete/Drag), P0 Persistenz-Rueckwaertskompatibilitaet fuer bestehende Kalibrierdaten.
- `Settings` und `Dashboard` werden als gegenseitig exklusive Arbeitsbereiche behandelt; sichtbare Mischansicht gilt als Blocker.
- Spezialraum-Polygoneditor muss jeden Vertex als Handle zeigen; aktive Ecke wird kontraststark markiert und direkt loeschbar gehalten.
- Bestehende kalibrierte Raumdaten bleiben auch nach Profilschema-Erweiterungen ohne manuelle Migration weiter nutzbar.
- View-Switch erzwingt Dashboard/Settings-Exklusivitaet per `hidden` + `aria-hidden` auf Gruppenebene.
- Polygoneditor adressiert Insert ueber aktive Kante und Delete ueber aktive Ecke mit Mindestpunkt-Guard.
- Legacy-Kalibrierdaten werden beim Laden in `tt-beamer.board-profiles.v1` migriert und sofort vorwaerts gespeichert.
- Plan-Update 6 setzt Prioritaetsfokus: P0 harte Tab-Exklusivitaet, P0 transparentere Vertex-Handles, P0 vollflaechige Spezialraum-Animationen, P0 Persistenzschutz fuer bestehende Polygone.
- View-Regel fuer Plan-Update 6: `Dashboard` enthaelt nur Trigger-/Runtime-Bedienung; `Settings` enthaelt nur Geometrie-/Polygon-/Kalibrierfunktionen.
- Polygoneditor-Handles werden visuell entschlackt (mehr Transparenz), aber mit robuster Hitflaeche und klarer Active-Markierung betrieben.
- Spezialraum-Render nutzt polygon-normalisierte Skalierung, damit Animationen unabhaengig von Raumgroesse die volle Zielflaeche ausfuellen.
- Bereits gezeichnete Spezialraum-Polygone gelten als Bestandsdaten und duerfen durch Save/Reload/Restart/Boardwechsel nicht veraendert werden.
- Tab-Exklusivitaet wird zur Laufzeit aktiv geprueft (Switch + Resize), um sichtbare Rest-Element-Leaks sofort zu erkennen.
- Polygon-Handle-UX nutzt transparente Visuals mit separaten, vergroesserten Hit-Targets fuer robuste Selektion auf Desktop/Touch.
- Spezialraum-Effekte werden ueber polygonbasierte Bounds/Radius-Metriken skaliert und fuellen grosse Zielpolygone vollflaechig.
- Spezialraum-Polygone werden beim Profil-Load als Bestandsdaten geschuetzt und bei partiellen Payloads nicht durch Defaults ersetzt.
- Plan-Update 7 setzt Prioritaetsfokus: P0 Tab-Bug final schliessen, P0 Fixed-Board-Layout mit rechtsseitigem Scroll, P0 separater Running-Animations-Bereich.
- Tab-Regel fuer Plan-Update 7: `Dashboard` enthaelt ausschliesslich Animations-/Trigger-UI; `Settings` ausschliesslich Geometrie/Polygon/Kalibrierung.
- Layout-Regel fuer Plan-Update 7: Board bleibt fixiert/sticky im Sichtbereich; vertikales Scrollen ist auf den rechten Steuerbereich begrenzt.
- Running-Animations-Regel fuer Plan-Update 7: aktive Animationen stehen als separater, visuell priorisierter Abschnitt vor den Triggergruppen.
- Tab-Exklusivitaet nutzt zusaetzlich ein Root-Gating (`#control-panel[data-active-view]`) mit Laufzeitvalidierung gegen State-Drift.
- Operator-Layout trennt Scroll-Besitz klar: Board bleibt sticky im Viewport, nur der rechte Control-Stack scrollt.
- Running-Animations-Uebersicht ist als eigener priorisierter Abschnitt oberhalb der Triggergruppen platziert.
- Plan-Update 8 setzt Prioritaetsfokus: P0 Settings-Board-Zoom fuer praezises Polygon-Editing, P0 Spezialraum-Klick-zu-Dropdown-Sync, P0 sticky sichtbarer Dashboard-Block `Aktive Animationen`.
- Zoom-Regel fuer Plan-Update 8: Board-Zoom darf Handle-Selektion/Drag/Insert/Delete nicht entkoppeln; Transform-Pfad bleibt konsistent.
- Sync-Regel fuer Plan-Update 8: Spezialraum-Selektion hat eine gemeinsame Source-of-Truth fuer Board-Klick und Polygon-Editor-Dropdown.
- Sticky-Regel fuer Plan-Update 8: `Aktive Animationen` bleibt beim Scrollen im Dashboard sichtbar und priorisiert bedienbar.
- Settings-Zoom bleibt auf den `Settings`-View begrenzt; Dashboard-Interaktion bleibt unskaliert und stabil.
- Polygon-Drag nutzt SVG-CTM-Inversion, damit Pointer-Koordinaten unter Zoom exakt im Overlay landen.
- Spezialraum-Selektion wird zentral synchronisiert, damit Board-Klick und Polygon-Dropdown keinen Drift mehr erzeugen.
- Plan-Update 9 setzt Prioritaetsfokus: P0 Pan im gezoomten Settings-Board, P0 robuste Trennung Pan vs Polygon-Edit, P1 Regression fuer Zoom+Pan+Edit.
- Interaktionsregel fuer Plan-Update 9: Pan erfolgt primaer ueber `Space + Drag`; mittlere Maustaste kann als Alias denselben Pan-Modus starten.
- Guard-Regel fuer Plan-Update 9: Mit gedrueckter `Space`-Taste startet kein Room-/Vertex-Edit; ohne `Space` bleibt das bestehende Polygon-Editing unveraendert.
- Transform-Regel fuer Plan-Update 9: Zoom, Pan und Fit/Reset nutzen denselben Viewport-State, damit kein Koordinatenversatz zwischen Anzeige und Edit entsteht.
- Plan-Update-9 Viewport nutzt explizites `scale + panX/panY` mit Bounds-Clamp, damit Fit/Reset keinen Arbeitsbereich verlieren.
- Pan-Intent blockiert Room-/Vertex-Edits deterministisch; Exit erfolgt robust ueber Pointer-Up, Key-Up und Blur.
- Runtime-Regression prueft jetzt zusaetzlich Zoom+Pan+Edit und Pointer-Session-Cleanup beim Startup.

## Execute-Phase Contract (Phase 1)
- Scope klar dokumentiert: `.planning/phases/phase-01/SCOPE.md`
- Umsetzungsplan vorhanden: `.planning/phases/phase-01/PLAN.md`
- Arbeitsbacklog vorhanden: `.planning/phases/phase-01/BACKLOG.md`
- Sequenzierung und Tasks vorhanden: `.planning/phases/phase-01/TASKS.md`
- Abnahme und Tests vorhanden: `.planning/phases/phase-01/ACCEPTANCE.md`

## Execution Results (Phase 1 Plan 1)
- Status: completed
- Summary: `.planning/phases/phase-01/1-1-SUMMARY.md`
- Task Commits: 16 atomare Commits (`b5b006d` .. `70cc9e2`)
- Evidence:
  - `.planning/phases/phase-01/P1-T14-LOADTEST.md`
  - `.planning/phases/phase-01/P1-T15-REGRESSION.md`

## Execution Results (Phase 1 Plan 2)
- Status: completed
- Summary: `.planning/phases/phase-01/1-2-SUMMARY.md`
- Task Commits: 7 atomare Commits (`8b8fd36` .. `0e82c66`)
- Evidence:
  - `.planning/phases/phase-01/P1-T23-OUTPUT-SMOKE.md`

## Execution Results (Phase 1 Plan 3)
- Status: completed
- Summary: `.planning/phases/phase-01/1-3-SUMMARY.md`
- Task Commits: 5 atomare Commits (`f916d3a` .. `1e99d06`)
- Evidence:
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 1 Plan 4)
- Status: completed
- Summary: `.planning/phases/phase-01/1-4-SUMMARY.md`
- Task Commits: 5 atomare Commits (`f7b6297` .. `1d0ecd5`)
- Evidence:
  - `.planning/phases/phase-01/P1-T28-MANUAL-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 1 Plan 5)
- Status: completed
- Summary: `.planning/phases/phase-01/1-5-SUMMARY.md`
- Task Commits: 5 atomare Commits (`48dac0d` .. `39caaaf`)
- Evidence:
  - `.planning/phases/phase-01/P1-T33-REGRESSION.md`
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 1 Plan 6)
- Status: completed
- Summary: `.planning/phases/phase-01/1-6-SUMMARY.md`
- Task Commits: 6 atomare Commits (`a650104` .. `f9543e9`)
- Evidence:
  - `.planning/phases/phase-01/P1-T39-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 1 Plan 7)
- Status: completed
- Summary: `.planning/phases/phase-01/1-7-SUMMARY.md`
- Task Commits: 6 atomare Commits (`057e7d2` .. `dfa0d27`)
- Evidence:
  - `.planning/phases/phase-01/P1-T45-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 1 Plan 8)
- Status: completed
- Summary: `.planning/phases/phase-01/1-8-SUMMARY.md`
- Task Commits: 6 atomare Commits (`0813906` .. `310f42e`)
- Evidence:
  - `.planning/phases/phase-01/P1-T51-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 1 Plan 9)
- Status: completed
- Summary: `.planning/phases/phase-01/1-9-SUMMARY.md`
- Task Commits: 5 atomare Commits (`00cfd78` .. `ad883d0`)
- Evidence:
  - `.planning/phases/phase-01/P1-T56-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 1 Plan 10)
- Status: completed
- Summary: `.planning/phases/phase-01/1-10-SUMMARY.md`
- Task Commits: 5 atomare Commits (`55dd54c` .. `59a8d45`)
- Evidence:
  - `.planning/phases/phase-01/P1-T61-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 1 Plan 11)
- Status: completed
- Summary: `.planning/phases/phase-01/1-11-SUMMARY.md`
- Task Commits: 5 atomare Commits (`6fed501` .. `d3196cc`)
- Evidence:
  - `.planning/phases/phase-01/P1-T66-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)
