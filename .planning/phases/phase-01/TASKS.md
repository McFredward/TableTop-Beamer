# Phase 1 Tasks

Statuslegende: TODO | IN-PROGRESS | DONE
Prioritaetslabel: [P0] kritisch | [P1] hoch | [P2] mittel

## Milestone A - Projection Core
- [x] DONE P1-T1 Board-Katalog und Auswahl-UI stabilisieren.
- [x] DONE P1-T2 Boardwechselzeit messen und auf <1s bringen.
- [x] DONE P1-T3 Kalibrierregler (X/Y/Scale/Rotation) mit Stage-Update verbinden.
- [x] DONE P1-T4 Reset-Defaults und session-lokalen State absichern.

## Milestone B - Effects Core
- [x] DONE P1-T5 Einheitliches Animation-Start/Stop-Modell aufbauen.
- [x] DONE P1-T6 Ambient-Toggles (Ambient Drift, Ash Fall, Hull Flicker) anbinden.
- [x] DONE P1-T7 Event-Buttons (Intruder Alert, Reactor Pulse, Power Outage) mit Trigger-Feedback bauen.
- [x] DONE P1-T8 Laufzeitmodell fuer Intensity/Duration/Hold pro Animation anbinden.

## Milestone C - Operator UX
- [x] DONE P1-T9 Dashboard-Grid fuer Schnellzugriff optimieren.
- [x] DONE P1-T10 Aktive Zustandsmarkierung fuer Dauer-Effekte verstaerken.
- [x] DONE P1-T11 Responsive Verhalten fuer kleine Displays pruefen und fixen.
- [x] DONE P1-T12 Setup-Flow im UI sichtbar strukturieren.

## Milestone D - Safety & Hardening
- [x] DONE P1-T13 `Clear All` als priorisierten globalen Stop implementieren.
- [x] DONE P1-T14 Lasttest mit parallelen Effekten durchfuehren.
- [x] DONE P1-T15 Smoke- und Safety-Regression dokumentieren.
- [x] DONE P1-T16 README um Session-Flow und Safety-Hinweise aktualisieren.

## Priority Add-on - Plan Update 1
- [x] DONE P1-T17 [P0] Power-Outage Triggerpfad unter Last messen und haerten.
- [x] DONE P1-T18 [P0] Deterministisches Zusammenspiel von Power Outage und `Clear All` sicherstellen.
- [x] DONE P1-T19 [P1] Board-spezifische hexagonale Room-Hitareas mit Hover/Selection-Feedback umsetzen.
- [x] DONE P1-T20 [P1] Raum-Submenu (Animation, Intensitaet, Dauer/Hold) an roomDraft anbinden.
- [x] DONE P1-T21 [P1] Scope-Trennung global/room plus geclipptes Room-Rendering im Canvas liefern.
- [x] DONE P1-T22 [P2] Output Device Auswahlpfad inkl. robustem Fallback implementieren.
- [x] DONE P1-T23 [P2] Running-Animations-Liste mit Stop/Edit plus Output-Routing Smoke-Test abschliessen.

## Feedback Rework - Plan 1-3
- [x] DONE P1-R1 Room Interaction Geometry Hardening (board-hex hitareas, hover-only highlight, stabile selection pro Board).
- [x] DONE P1-R2 Room Control Submenu Reliability (context auf selected room, Intensity/Duration/Hold, Start-Guard).
- [x] DONE P1-R3 Animation Scope Model + Runtime List (GLOBAL/ROOM Trennung, Stop/Edit je Eintrag, Edit-Reload).
- [x] DONE P1-R4 Power Outage Visibility + Output Route (sichtbare Outage-Dunkelheit, expliziter Fullscreen-Fallback).
- [x] DONE P1-R5 Regression Checks + Docs Sync (`node --check src/app.js`, Akzeptanz-/Task-Doku abgeglichen).

## Priority Add-on - Plan Update 2
- [x] DONE P1-T24 [P0] Hex-Hitareas auf beiden Boards gegen reale Raumflaechen nachkalibrieren (inkl. Rand-/Mitte-Treffmatrix).
- [x] DONE P1-T25 [P1] Fuenf Special-Raeume aufnehmen und board-spezifisch mappen (Cockpit links, Cryoschlaf Mitte, Maschinenraum 1-3 rechts).
- [x] DONE P1-T26 [P1] Event-Sounds fuer Intruder Alert, Reactor Pulse und Power Outage in den Triggerpfad integrieren.
- [x] DONE P1-T27 [P1] Audio-Settings um globales Enable/Disable und Lautstaerke-Regler erweitern.
- [x] DONE P1-T28 [P0] Manuelle Verifikations-Checkliste fuer Phase 1 finalisieren und als Pflichtabnahme durchlaufen.

## Priority Add-on - Plan Update 3
- [x] DONE P1-T29 [P0] Hitarea-Auto-Tuning aus dem Setup-Pfad entfernen und eine kleine Calibration-Settingsseite mit Slidern (Hitarea-X/Y/Scale) bereitstellen.
- [x] DONE P1-T30 [P0] Board-spezifische Persistenz fuer Hitarea-Kalibrierwerte umsetzen (laden/speichern/reset pro Board, sofort wirksam im Hit-Test).
- [x] DONE P1-T31 [P0] Spezialraum-Animationen debuggen und den visuellen Renderpfad reparieren, sodass Running-List und sichtbarer Zustand konsistent sind.
- [x] DONE P1-T32 [P0] Bugfix fuer Kombination `Spezialraum + Alarm Beacon`: globaler Timer darf nicht stoppen, andere Animationen muessen sichtbar weiterlaufen.
- [x] DONE P1-T33 [P0] Regression-Absicherung ergaenzen (kombinierter Triggerpfad inkl. Audio-parallel), Nachweis in Acceptance-Artefakten dokumentieren.

## Priority Add-on - Plan Update 4
- [x] DONE P1-T34 [P0] Datenmodell fuer raumindividuelle Kalibrierung erweitern (Position relativ/absolut je Raum + Distanzkorrektur zwischen Raeumen).
- [x] DONE P1-T35 [P0] Unabhaengiges Stretching pro Raum (`stretchX`/`stretchY`) mit Live-Wirkung auf Hit-Test und Clip-Pfad implementieren.
- [x] DONE P1-T36 [P0] Kalibrier- und Shape-Controls aus dem Haupt-Dashboard entfernen und auf eine separate Settings-Seite migrieren.
- [x] DONE P1-T37 [P0] Spezialraum-Polygoneditor in Settings bauen (Vertex einfuegen, loeschen, frei verschieben; beliebige Polygonform).
- [x] DONE P1-T38 [P1] Persistenz pro Board fuer komplette Geometrie-/Shape-Konfiguration (global + je Raum + Spezialraum-Polygone) absichern.
- [x] DONE P1-T39 [P1] Manuelle Pflichtabnahme + Regression fuer Plan-Update-4 dokumentieren (inkl. Reload/App-Neustart-Nachweis).

## Priority Add-on - Plan Update 5
- [x] DONE P1-T40 [P0] Tab-Architektur fixen: `Settings` als exklusiver View-Switch implementieren, damit Dashboard-/Editor-Elemente im Settings-Tab nicht mehr sichtbar sind.
- [x] DONE P1-T41 [P0] Sichtbare Vertex-Handles fuer Spezialraum-Polygone auf dem Board rendern und aktive Ecke deutlich hervorheben (rot/kontraststark).
- [x] DONE P1-T42 [P0] Polygoneditor-Interaktion stabilisieren: freien Vertex-Drag mit sauberem Pointer-Capture, Live-Update und robustem Cancel/Commit Verhalten.
- [x] DONE P1-T43 [P0] Vertex-Operationen komplettieren: aktive Ecke loeschen (mit Mindestpunkt-Guard) und neue Ecke an ausgewaehlter Kante einfuegen.
- [x] DONE P1-T44 [P0] Persistenz-Compatibility-Layer bauen: bestehende kalibrierte Raumdaten aus Legacy-Profilen migrieren und im aktuellen Schema verlustfrei speichern.
- [x] DONE P1-T45 [P1] Plan-Update-5 Pflichtabnahme + Regression dokumentieren (View-Switch, Polygoneditor UX, Persistenz-Reload/App-Neustart).

## Priority Add-on - Plan Update 6
- [x] DONE P1-T46 [P0] View-Switch final haerten: `Dashboard` nur Trigger-/Animations-Controls, `Settings` nur Geometrie/Polygon/Kalibrierung; harte Exklusivitaet je Tab auf Gruppenebene absichern.
- [x] DONE P1-T47 [P0] Sichtbarkeits-Regressionstest fuer Tabwechsel bauen (mind. 10x Toggle, Desktop + Small-Screen), inkl. Guard gegen partiell sichtbare Rest-Elemente.
- [x] DONE P1-T48 [P0] Vertex-Handles visuell entschlacken: deutlich transparentere Bubbles mit weiterhin klarer Selektion (Border/Active-State/Hitflaeche).
- [x] DONE P1-T49 [P0] Spezialraum-Animationen auf volle Polygonflaeche skalieren (raumgroessenunabhaengig, kein Insel-Rendering in grossen Polygonen).
- [x] DONE P1-T50 [P0] Persistenzschutz fuer bestehende Spezialraum-Polygone ergaenzen (Save/Reload/Restart + Boardwechsel ohne Datenverlust).
- [x] DONE P1-T51 [P1] Plan-Update-6 Pflichtabnahme + Regression dokumentieren (View-Exklusivitaet, Handle-Transparenz, Vollflaechen-Animation, Polygon-Persistenz).

## Priority Add-on - Plan Update 7
- [x] DONE P1-T52 [P0] Tab-Bug final fixen: harte, root-basierte View-Exklusivitaet herstellen (`Dashboard` nur Animations-UI, `Settings` nur Geometrie/Polygon/Kalibrierung) inkl. Guard gegen Rest-Leaks.
- [x] DONE P1-T53 [P0] Layout auf Fixed-Board umbauen: Boardbereich sticky/fix halten, nur rechten Steuerbereich als vertikalen Scroll-Container ausfuehren.
- [x] DONE P1-T54 [P0] Running-Animations-Uebersicht als separaten, klar priorisierten Bereich platzieren (sichtbar vor Trigger-Controls, Stop/Edit unveraendert bedienbar).
- [x] DONE P1-T55 [P0] Usability-Hardening fuer Desktop + Small-Screen: Scroll-Verhalten, Tabwechsel und Sichtbarkeit gegen Regression absichern.
- [x] DONE P1-T56 [P1] Plan-Update-7 Pflichtabnahme + Nachweisdokumentation erstellen (Tab-Exklusivitaet, Fixed-Board-Scroll, Running-Overview).

## Priority Add-on - Plan Update 8
- [x] DONE P1-T57 [P0] Settings-Board-Zoom implementieren (stufenloser Zoom, Min/Max-Guard, Fit/Reset) und mit Polygoneditor-Canvas sauber integrieren.
- [x] DONE P1-T58 [P0] Polygon-Editing unter Zoom haerten (Handle-Hit-Targets, Drag, Insert/Delete, Pointer-Koordinaten korrekt auf Zoom transformieren).
- [x] DONE P1-T59 [P0] Spezialraum-Klick im Settings-Board direkt mit Polygon-Editor-Dropdown synchronisieren (Board -> Dropdown inkl. konsistenter Highlight-State).
- [x] DONE P1-T60 [P0] Dashboard-Block `Aktive Animationen` sticky im scrollenden Control-Panel verankern, ohne Tab-/Small-Screen-Regressions.
- [x] DONE P1-T61 [P1] Plan-Update-8 Pflichtabnahme + Regression dokumentieren (Zoom-Precision, Spezialraum-Sync, Sticky-Running-Block).

## Priority Add-on - Plan Update 9
- [x] DONE P1-T62 [P0] Settings-Pan-Modus implementieren (primaer `Space + Drag`, optional mittlere Maustaste) fuer gezoomtes Board inkl. klarer Cursor-/Statusrueckmeldung.
- [x] DONE P1-T63 [P0] Pan-Viewport-Logik mit Zoom/Fit/Reset koppeln (Bounds, Start-/Endzustand, kein Verlust der Arbeitsflaeche).
- [x] DONE P1-T64 [P0] Interaktions-Arbitration haerten: Pan darf Room-Klick, Vertex-Selektion, Vertex-Drag und Insert/Delete ausserhalb des Pan-Modus nicht regressieren.
- [x] DONE P1-T65 [P0] Regression-Checks fuer Zoom+Pan+Polygon-Editing auf Desktop und Small-Screen ergaenzen (inkl. mehrfacher Tabwechsel und Pointer-Capture-Grenzfaelle).
- [x] DONE P1-T66 [P1] Plan-Update-9 Pflichtabnahme + Nachweisdokumentation erstellen (Pan-Regel, Edit-Stabilitaet, Zoom/Pan-Roundtrip).

## Priority Add-on - Plan Update 10
- [x] DONE P1-T67 [P0] Event-Sound-System auf vorhandene Assets aus `resources/nemesis/sounds/` umstellen und Trigger-Mapping fuer Intruder/Reactor/Power Outage (+ passende globale Events) fest verdrahten.
- [x] DONE P1-T68 [P0] Audio-Settings-Integration haerten: Master on/off und Volume muessen unveraendert auf alle assetbasierten Sounds greifen (inkl. mehrfachem Triggern unter Last).
- [x] DONE P1-T69 [P0] Globalen Outside-Effekt implementieren (Weltraum-Motion) und Rendering strikt auf den Bereich ausserhalb des Ship-Polygons maskieren.
- [x] DONE P1-T70 [P0] Ship-Polygon-Editor im Settings-Tab umsetzen (Insert/Delete/Drag, aktive Ecke) und Outside-Maske live aus dem Polygon ableiten.
- [x] DONE P1-T71 [P1] Board-spezifische Persistenz fuer Ship-Polygon + Outside-Effekt-Settings absichern und Pflichtabnahme/Regression dokumentieren (Reload/Restart/Boardwechsel).

## Priority Add-on - Plan Update 11
- [x] DONE P1-T72 [P0] Audio-Lifecycle an Animationslaufzeit koppeln: Sound startet/schleift nur waehrend aktiver Animation; Ablauf, manueller Stop und `Clear All` beenden Sound sofort.
- [x] DONE P1-T73 [P0] Looping fuer zu kurze Audiodateien robust umsetzen (nahtloser Re-Start bis Animationsende, ohne Doppelinstanzen oder Restton).
- [x] DONE P1-T74 [P0] UI fuer editierbares Sound-Mapping pro Animation integrieren (Asset-Auswahl/none, Default-Mapping, Guard fuer ungueltige Zuordnung).
- [x] DONE P1-T75 [P1] Allgemeine Animations-Settings um Geschwindigkeitssteuerung erweitern (globaler Speed-Faktor mit Live-Wirkung und regressionfreiem Stop/Edit-Verhalten).
- [x] DONE P1-T76 [P1] Immersive Outside-Alternativanimation inkl. UI-Toggle implementieren und bestehende Outside-Logik (Maske, Enable, Intensity, Speed) ohne Bruch weiterfuehren.
- [x] DONE P1-T77 [P1] Pflichtabnahme + Regression fuer Plan-Update-11 dokumentieren (Audio-Loop/Stop-Sync, Mapping, Speed, Outside-Modus, Persistenz).

## Priority Add-on - Plan Update 12
- [x] DONE P1-T78 [P0] Tab-Trennung verschaerfen: `Dashboard` strikt auf Animation triggern/stoppen begrenzen; alle Settings-/Mapping-/Calibration-/Editor-Controls im Dashboard entfernen.
- [x] DONE P1-T79 [P0] Settings-Tab als exklusive Konfigurationsflaeche konsolidieren (inkl. Mapping, Calibration, Spezialraum-/Ship-Editor und Outside-Parameter) und Leak-Guards ergaenzen.
- [x] DONE P1-T80 [P0] Globale Animationsarchitektur fachlich trennen in `Innerhalb des Schiffs` vs `Ausserhalb des Schiffs` (Datenmodell, Triggerrouting, Running-Liste, Stop-Pfade).
- [x] DONE P1-T81 [P0] Outside-Animationen immersiv ueberarbeiten: High-Speed-Raumfluss mit mehrlagigen Sternen/Parallax und klarer Bewegungsrichtung.
- [x] DONE P1-T82 [P0] Outside-Layer-Isolation haerten: keine Innenraumbeeinflussung (Maskenleck, Timing-/State-Seiteneffekte, Render-Ueberlagerung) auch bei Paralleltriggern.
- [x] DONE P1-T83 [P1] Plan-Update-12 Pflichtabnahme + Regression dokumentieren (Tab-Exklusivitaet, Inside/Outside-Trennung, immersive Outside-Wirkung, Layer-Isolation, Performance).

## Priority Add-on - Plan Update 13
- [x] DONE P1-T84 [P0] Ship-Clipping-Grenzen haerten: Inside-Animationen strikt auf Ship-Polygon maskieren und Outside-Anteile sicher unterdruecken.
- [x] DONE P1-T85 [P0] Inverses Ship-Clipping fuer Outside absichern: Outside-Animationen strikt ausserhalb des Ship-Polygons rendern, inklusive Fail-safe bei ungueltiger Maske.
- [x] DONE P1-T86 [P0] Outside-Visual von glitzerartig auf High-Speed-Spaceflow umbauen (mehrere Tiefenebenen mit differenzierten Geschwindigkeiten).
- [x] DONE P1-T87 [P0] Deutliche Motion-Streaks/Striche in den Outside-Renderer integrieren und mit Intensity/Speed-Reglern koppeln.
- [x] DONE P1-T88 [P0] Single-User-Persistenzpfad erweitern: `Settings`-Button `Speichern` schreibt aktuellen Browserzustand in server-/repo-seitige globale Default-Config.
- [x] DONE P1-T89 [P0] Save-Merge-Guard implementieren: lokale Browserdaten als Quelle uebernehmen und bestehende Ship-/Spezialraum-Polygondaten verlustfrei erhalten.
- [x] DONE P1-T90 [P1] Plan-Update-13 Pflichtabnahme + Regression dokumentieren (Inside/Outside-Clipping, High-Speed-Spaceflow mit Streaks, globale Config-Save-Pfad, Polygon-Datenerhalt).
