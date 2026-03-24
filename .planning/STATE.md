# STATE

## Project
- Name: TT Beamer - Nemesis Overlay Prototype
- Context: Brettspiel-Beamer-Projekt fuer visuelle, nicht spielbeeinflussende Overlays
- Product Focus: OG-Nemesis als Startsystem

## Lifecycle
- Planning Mode: active
- Current Phase: 2
- Current Phase Key: phase-02
- Last Prepared: 2026-03-24
- Execution Readiness: READY
- Last Executed Plan: 2-1
- Last Execution Summary: `.planning/phases/phase-02/2-1-SUMMARY.md`

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
- Entscheidung Plan-Update 10: Neue Anforderungen bleiben in Phase 1 (kein Verschieben in Phase 2), da sie den Nemesis-Vertical-Slice direkt betreffen und ohne neue Infrastruktur umsetzbar sind.
- Plan-Update 10 setzt Prioritaetsfokus: P0 assetbasierte Event-Sounds aus `resources`, P0 globaler Outside-Effekt, P0 Ship-Polygon-Editor als Maskenquelle, P1 board-spezifische Persistenz fuer Ship/Outside.
- Sound-Regel fuer Plan-Update 10: Intruder/Reactor/Power-Outage (und passende globale Events) verwenden vorhandene Dateien `alarm.mp3`, `electricity.mp3`, `monsters/048.wav`, `power/3.wav` statt rein synthetischer Cues.
- Masken-Regel fuer Plan-Update 10: Outside-Rendering wird ausschliesslich aus dem editierbaren Ship-Polygon abgeleitet; innerhalb der Schiffsmaske bleibt der Effekt unsichtbar.
- Persistenz-Regel fuer Plan-Update 10: Ship-Polygon und Outside-Effekt-Settings werden pro Board gespeichert und bei Save/Reload/Restart/Boardwechsel deterministisch wiederhergestellt.
- Event-Sound-Pfad ist auf assetbasiertes Voice-Pooling umgestellt; Audio-Master/Volume greifen unveraendert auch bei Mehrfachtriggern.
- Outside-Layer rendert per Even-Odd-Inversclip strikt ausserhalb des Ship-Polygons.
- Ship-Polygon und Outside-Einstellungen (`enabled`, `intensity`, `speed`) sind board-spezifischer Teil des Board-Profilschemas.
- Plan-Update 11 setzt Prioritaetsfokus: P0 Audio an Animationslaufzeit koppeln (inkl. Loop/sofortiger Stop), P0 editierbares Sound-Mapping pro Animation, P1 globale Geschwindigkeitssteuerung, P1 immersive Outside-Alternative mit UI-Toggle.
- Audio-Lifecycle-Regel fuer Plan-Update 11: Sound existiert nur waehrend aktiver Animation; bei laengerer Animation wird geloopt, bei Stop/Ablauf/`Clear All` endet Audio sofort.
- Mapping-Regel fuer Plan-Update 11: Soundzuordnung ist pro Animation in der UI editierbar und muss `none`/Fallback ohne Runtime-Fehler unterstuetzen.
- Outside-Regel fuer Plan-Update 11: Alternative Outside-Animation nutzt denselben Ship-Maskenpfad und darf bestehende Outside-Steuerung/Persistenz nicht brechen.
- Audio wird fuer Plan-Update 11 strikt animationsgebunden verwaltet (`animation.id` als Source-of-Truth fuer Start/Loop/Stop).
- Sound-Mapping ist pro Animation explizit (`asset` oder `none`) und wird vor Runtime-Nutzung auf erlaubte Asset-Pfade normalisiert.
- Outside-Modus (`standard`/`immersive`) bleibt Teil des board-spezifischen `outsideFx`-Profils und rendert weiterhin ausschliesslich im Outside-Maskenpfad.
- Plan-Update 12 setzt Prioritaetsfokus: harte Tab-Trennung (`Dashboard` nur Trigger/Stop, Konfiguration exklusiv in `Settings`), fachliche Trennung globaler Animationen (`Innerhalb` vs `Ausserhalb`), immersive High-Speed-Outside-Ueberarbeitung.
- Tab-Regel fuer Plan-Update 12: Im Dashboard sind Settings-/Mapping-/Calibration-/Editor-Controls strikt verboten; diese sind ausschliesslich im Settings-Tab zulaessig.
- Kategorien-Regel fuer Plan-Update 12: Globale Animationen werden als `inside-ship` bzw. `outside-ship` gefuehrt und in UI + Running-Liste eindeutig getrennt angezeigt.
- Outside-Regel fuer Plan-Update 12: High-Speed-Parallax bleibt ein isolierter Outside-Layer ausserhalb der Ship-Maske; Innenraum-Layer und Room-Renderer bleiben unbeeinflusst.
- Settings-Ownership-Guard validiert zur Laufzeit, dass saemtliche Konfigurationscontrols nur unter `data-view="settings"` gemountet sind.
- Running-Liste kennzeichnet globale Effekte jetzt explizit als `GLOBAL-INSIDE` bzw. `GLOBAL-OUTSIDE` fuer klare fachliche Trennung.
- Outside-Rendering nutzt fail-safe Maskenclipping; ohne gueltiges Ship-Polygon wird kein Outside-Layer gezeichnet (kein Fullscreen-Leak).
- Plan-Update 13 setzt Prioritaetsfokus: P0 bidirektionales Ship-Clipping (Inside strikt innen, Outside strikt aussen), P0 Outside-Rework zu High-Speed-Spaceflow mit Tiefenebenen/Streaks, P0 globale Config-Persistenz aus Browserdaten via Settings-Button `Speichern`.
- Clipping-Regel fuer Plan-Update 13: Rendergrenzen sind beidseitig verpflichtend und exklusiv (`inside -> in ship mask`, `outside -> inverse ship mask`) ohne Grenzlecks bei Paralleltriggern.
- Persistenz-Regel fuer Plan-Update 13: Single-User-Setup schreibt aktuelle lokale Browserdaten als globale Repo-/Server-Defaults; bestehende Polygon-/Geometriedaten bleiben verlustfrei erhalten.
- Inside-Renderpfad ist jetzt maskenpflichtig ueber `clipToInsideShip`; ungueltige Ship-Masken triggern fail-safe no-draw statt Fullscreen-Leak.
- Outside-Visual nutzt High-Speed-Spaceflow mit Multi-Depth-Parallax plus speedgekoppelten Motion-Streaks.
- `Settings` exportiert lokalen Browserstand in `config/global-defaults.json`; Client- und Server-Merge-Guards erhalten Ship-/Spezialraum-Polygone verlustfrei.
- Plan-Update 14 setzt Prioritaetsfokus: P0 Outside-Richtungsumschaltung, P0 Outside-Basis strikt tiefschwarz, P0 Per-Room-Instanzparameter (`speed`/`intensity`/`soundVolume`) und P0 Edit-Flow-Bugfix fuer laufende Instanzen.
- Outside-Regel fuer Plan-Update 14: Richtungswechsel (`forward`/`reverse`) wird als Laufzeitoption im bestehenden Outside-Layer gefuehrt und darf keine Innenraum-Seiteneffekte erzeugen.
- Visual-Regel fuer Plan-Update 14: ausserhalb des Ship-Polygons bleibt der Hintergrund tiefschwarz; blaue Outside-Flaechen sind nicht zulaessig.
- Runtime-Regel fuer Plan-Update 14: Room-Animationen halten Parameter instanzscharf pro `animation.id`; parallele Instanzen duerfen sich nicht ueberschreiben.
- Edit-Regel fuer Plan-Update 14: `Edit` laedt immer die bestehende laufende Instanz und schreibt Aenderungen in-place auf dieselbe `animation.id` (kein Neu-Eintrag).
- Plan-Update 15 setzt Prioritaetsfokus: P0 robuster Global-Defaults-Save ohne `501 Unsupported method POST`, P0 klare Save-Fehlermeldung bei fehlendem API-Server, P0 Start-Flow-Doku fuer POST-faehigen Server, P1 optionaler Export-/Download-Fallback.
- Save-Regel fuer Plan-Update 15: Primaerer Persistenzpfad bleibt `lokaler Browserstand -> globale Defaults` ueber den Node-API-Server; statisches Hosting ohne API gilt als Nicht-POST-Setup.
- UX-Regel fuer Plan-Update 15: Save-Fehler zeigen kurze, handlungsorientierte Klartexte mit konkreter Startanweisung; HTML-Rohantworten werden nicht direkt in der UI angezeigt.
- Doku-Regel fuer Plan-Update 15: README/Startanleitung benennt explizit den noetigen API-Server (`node server.mjs`) und eine kurze Startsequenz fuer API + Frontend.
- Fallback-Regel fuer Plan-Update 15: Optionaler Export/Download ist nur sekundaerer Fallbackpfad und darf den Server-Save nicht ersetzen oder verdecken.
- Save-Transport versucht fuer globale Defaults zuerst Same-Origin-API und dann `localhost:4173` als Fallback fuer das vorgesehene Node-Setup.
- Save-Fehler werden klassifiziert (`API unreachable`/`method unavailable`/`HTML error`/`server error`) und als kurze Operator-Anweisung statt Roh-Fehlertext angezeigt.
- Optionaler Download-Export ist als sekundaerer Fallbackpfad gekennzeichnet; primaerer Standard bleibt API-Speichern.
- Plan-Update 16 setzt Prioritaetsfokus: P0 statisches Frontend-Hosting robust machen (API-Base-Konfiguration + Port-Fallback + klarer Health-Check), P0 endpoint-transparente Save-UX, P0 API-Diagnosepfad, P0 reproduzierbarer Save bei laufender API.
- Reales Betriebsfeedback hebt Plan-Update-15-Defekt wieder auf Blocker-Niveau: `POST /api/global-defaults` liefert unter Static-/Python-Server weiterhin `501`, wenn Endpoint-Aufloesung nicht explizit steuerbar ist.
- Endpoint-Regel fuer Plan-Update 16: Save und Diagnose nutzen dieselbe deterministische API-Base-Aufloesung (explizite Konfiguration > definierte Localhost-Fallbacks > klarer Fehlerzustand).
- Diagnose-Regel fuer Plan-Update 16: Diagnosepruefung testet sowohl API-Erreichbarkeit als auch POST-Faehigkeit auf dem echten Save-Endpunkt und liefert pro Ergebnis konkrete Next Steps.
- UX-Regel fuer Plan-Update 16: Save-Feedback zeigt den tatsaechlich verwendeten Endpoint (Host/Port/Pfad) inklusive Methode/Statusklasse, damit Fehlersuche zielgerichtet bleibt.
- Verifikations-Regel fuer Plan-Update 16: Reproduzierbarkeit gilt erst als erreicht, wenn Mehrfach-Save plus Reload/Restart bei laufender API ohne intermittierende Fehler durchlaufen.
- API-Base-Aufloesung nutzt jetzt feste Reihenfolge: `window.__TT_BEAMER_API_BASE__` > URL-Parameter > `localStorage` > deterministische Localhost-Port-Fallbacks.
- Save-Guard fuehrt verpflichtend `GET /api/health` + `OPTIONS /api/global-defaults` vor dem eigentlichen POST aus; Diagnose und Save teilen denselben Endpoint-Resolver.
- Plan-Update 17 setzt Prioritaetsfokus: headless/remote LAN-Betrieb ist Pflichtfall; Save darf nicht mehr auf `localhost` des Client-Geraets aufloesen.
- Endpoint-Regel fuer Plan-Update 17: sicherer Default ist der Host der aufgerufenen UI (`window.location.hostname`), nicht ein pauschaler `localhost`-Fallback.
- Override-Regel fuer Plan-Update 17: explizite API-Base-Konfiguration bleibt erlaubt und priorisiert (`override > ui-host-default > fallback`).
- UX-Regel fuer Plan-Update 17: Save/Diagnose zeigen explizit `UI-Host -> API-Host` und liefern bei Remote-Mismatch eine konkrete LAN-Handlungsempfehlung.
- Verifikations-Regel fuer Plan-Update 17: reproduzierbarer Save muss ueber IP-Aufruf der UI von einem zweiten LAN-Geraet nachgewiesen werden (mindestens 5x Save + Reload/Restart).
- Plan-Update-17 Umsetzung: Resolver nutzt jetzt UI-Host-default mit hostbasierten Fallback-Ports; stiller Client-`localhost`-Drift im Remote-Fall ist entfernt.
- Plan-Update-17 Umsetzung: Save/Diagnose zeigen Resolver-Quelle sowie `UI-Host -> API-Host` und geben bei Localhost-Mismatch eine konkrete LAN-Hilfestellung.
- Plan-Update 18 setzt Prioritaetsfokus: Realbetrieb nutzt aktuell `python3 -m http.server 4173`; diese Static-only-Fehlkonfiguration muss explizit erkannt und als Save-Blocker ausgewiesen werden.
- Misconfiguration-Regel fuer Plan-Update 18: `GET /api/health` mit 404 + typischer Static-Signatur (Header/Body) wird als `static-only` klassifiziert; Save meldet klar `Static-only Server aktiv, Save nicht moeglich`.
- Guided-Fix-Regel fuer Plan-Update 18: Save-/Diagnose-UX liefert konkrete headless/LAN-Kommandos fuer API-Start (z. B. `node server.mjs --host 0.0.0.0 --port 4173`) und markiert Python-Static explizit als nicht POST-faehig.
- Resolver-Regel fuer Plan-Update 18: Save und Diagnose teilen einen identischen Host-/Endpoint-Snapshot; remote IP-Flow zeigt keine verwirrenden `localhost`-Fallback-Meldungen.
- Verifikations-Regel fuer Plan-Update 18: Pflichtabnahme enthaelt zwingend einen echten Negativtest mit Python-Static und anschliessenden Positivtest mit Node-API auf demselben Host/Port.
- Static-only-Erkennung klassifiziert Python/SimpleHTTP-Health-404 jetzt explizit als Save-Blocker (`STATIC_ONLY_SERVER`) statt generischem API-Fehler.
- Guided-Fix-UX gibt host-korrekte Headless/LAN-Kommandos aus (`node server.mjs --host 0.0.0.0 --port <endpoint-port>`) und markiert Python-Static als nicht POST-faehig.
- Save- und Diagnosepfad nutzen einen identischen Resolver-Snapshot (`UI-Host -> API-Host`, Quelle, Methode, Endpoint); malformed Endpoint-Fallback driftet nicht mehr auf `localhost`.
- Plan-Update 19 setzt Prioritaetsfokus: dedizierten UI-Button `API Diagnose` entfernen und Download-Fallback auf neutrales Wording ohne `Notfall` umstellen.
- Diagnose-Regel fuer Plan-Update 19: Reachability/POST-Pruefung bleibt verpflichtend im Save-Preflight + Save-Feedback, jedoch ohne separaten Diagnose-Button.
- Wording-Regel fuer Plan-Update 19: Export-/Download-Fallback wird durchgaengig als sekundaerer Pfad benannt; alarmistische Labels sind unzulaessig.
- Plan-Update-19 Umsetzung: dedizierter `API Diagnose`-Button ist entfernt; Diagnose-Status wird direkt im Save-Preflight-/Save-Feedback gepflegt.
- Plan-Update-19 Umsetzung: Download-Fallback nutzt durchgaengig neutrales Wording als sekundaeren Pfad ohne `Notfall`-Label.
- Phase-2 Ergaenzung (Plan-Update 2) ist verbindlich gesetzt: Mobile-First Bedienung fuer Touch-Endgeraete (Smartphone Portrait/Landscape) wird als priorisierte Umsetzungsstrecke gefuehrt.
- Mobile-UX-Regel fuer Phase 2: schnelle Daumen-Trigger, klare Trennung `Triggern` vs `laufende Animationen managen`, Touch-Targets >=44x44 px, einhaendige Spieltisch-Bedienung als Pflicht.
- Verifikationsregel fuer Phase 2: reale Spieltischtests sowie mobile Performance-/Responsiveness-Checks sind fester Teil der Abnahme.
- Phase-2 Plan 1 fuehrt mobilen Dashboard-Fokus explizit als Zonenmodell (`Triggern`/`Running managen`) statt Mischpanel.
- `Clear All` ist im Mobile-Flow aus Triggerflaechen entkoppelt und nur ueber Running-Management mit Doppelbestaetigung ausfuehrbar.
- Orientation-Wechsel wird zusaetzlich ueber Runtime-Regression auf State-Drift geprueft (Board/Room/View/Running-IDs stabil).

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

## Execution Results (Phase 1 Plan 12)
- Status: completed
- Summary: `.planning/phases/phase-01/1-12-SUMMARY.md`
- Task Commits: 5 atomare Commits (`9f4ec9d` .. `7b25994`)
- Evidence:
  - `.planning/phases/phase-01/P1-T71-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 1 Plan 13)
- Status: completed
- Summary: `.planning/phases/phase-01/1-13-SUMMARY.md`
- Task Commits: 6 atomare Commits (`515081e` .. `e3b36a4`)
- Evidence:
  - `.planning/phases/phase-01/P1-T77-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 1 Plan 14)
- Status: completed
- Summary: `.planning/phases/phase-01/1-14-SUMMARY.md`
- Task Commits: 6 atomare Commits (`75efc56` .. `74f638f`)
- Evidence:
  - `.planning/phases/phase-01/P1-T83-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 1 Plan 15)
- Status: completed
- Summary: `.planning/phases/phase-01/1-15-SUMMARY.md`
- Task Commits: 7 atomare Commits (`511da73` .. `c932d10`)
- Evidence:
  - `.planning/phases/phase-01/P1-T90-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)

## Execution Results (Phase 1 Plan 16)
- Status: completed
- Summary: `.planning/phases/phase-01/1-16-SUMMARY.md`
- Task Commits: 6 atomare Commits (`f42ef6c` .. `4bb251f`)
- Evidence:
  - `.planning/phases/phase-01/P1-T96-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 1 Plan 17)
- Status: completed
- Summary: `.planning/phases/phase-01/1-17-SUMMARY.md`
- Task Commits: 5 atomare Commits (`5d69ceb`, `ee7b200`, `186a44a`, `0b42592`, `4483437`)
- Evidence:
  - `.planning/phases/phase-01/P1-T101-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)
  - `POST /api/global-defaults` und `POST /api/global-defaults/` => `200` auf Node-Server-Smoke (Port 4180)

## Execution Results (Phase 1 Plan 18)
- Status: completed
- Summary: `.planning/phases/phase-01/1-18-SUMMARY.md`
- Task Commits: 5 atomare Commits (`aab8191`, `bca9ea5`, `def14a5`, `f53d8b6`, `fe1b375`)
- Evidence:
  - `.planning/phases/phase-01/P1-T106-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)
  - Static-Hosting-Simulation: `GET /api/health` => `404`, `POST /api/global-defaults` => `501` (python http.server:8099)
- Node-API-Repro: `HEALTH=200 OPTIONS=204 SAVE=[200,200,200,200,200] SAVE_AFTER_RESTART=200` (Port 4180)

## Execution Results (Phase 1 Plan 19)
- Status: completed
- Summary: `.planning/phases/phase-01/1-19-SUMMARY.md`
- Task Commits: 5 atomare Commits (`4d29aa8`, `7f34d2f`, `2b7fd5b`, `d46d696`, `74c9019`)
- Evidence:
  - `.planning/phases/phase-01/P1-T110-VERIFICATION.md`
  - `.planning/phases/phase-01/P1-T111-VERIFICATION.md`
  - `node debug/p1-t110-resolver-regression.mjs` => `REMOTE_FIRST=192.168.0.80`, `REMOTE_HAS_LOCALHOST=false`, `OVERRIDE_FIRST=localhost`
  - Node-API-Repro: `HEALTH=200 OPTIONS=204 SAVE=[200,200,200,200,200] SAVE_AFTER_RESTART=200` (Port 4180)

## Execution Results (Phase 1 Plan 20)
- Status: completed
- Summary: `.planning/phases/phase-01/1-20-SUMMARY.md`
- Task Commits: 5 atomare Commits (`3b56f06`, `d74a58d`, `cf23e34`, `e786892`, `a7dfec4`)
- Evidence:
  - `.planning/phases/phase-01/P1-T116-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)
  - `node debug/p1-t115-resolver-snapshot-regression.mjs` => `SNAPSHOT_SAVE=UI-Host 192.168.0.80 -> API-Host 192.168.0.80`, `SNAPSHOT_DIAG=...`, `INVALID_ENDPOINT_FALLBACK=http://192.168.0.80:4173`
  - Python-Static-Negativtest (Port 4173): `PY_HEALTH=404 PY_POST=501 PY_SERVER=SimpleHTTP/0.6 Python/3.14.3`
- Node-API-Positivtest (gleicher Port 4173): `NODE_HEALTH=200 NODE_OPTIONS=204 NODE_SAVES=[200,200,200,200,200] NODE_AFTER_RESTART=200`

## Execution Results (Phase 1 Plan 21)
- Status: completed
- Summary: `.planning/phases/phase-01/1-21-SUMMARY.md`
- Task Commits: 5 atomare Commits (`96345d4`, `d5fb34a`, `9e50f94`, `ce8330b`, `2edff83`)
- Evidence:
  - `.planning/phases/phase-01/P1-T121-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)
  - Pattern-Checks: kein `run-api-diagnose`/`API Diagnose (One-Click)` und kein `Notfall`-Wording in `index.html`, `src/app.js`, `README.md`
  - Node-API-Smoke (Port 4180): `HEALTH=200 OPTIONS=204 SAVE=200`

## Execution Results (Phase 2 Plan 1)
- Status: completed
- Summary: `.planning/phases/phase-02/2-1-SUMMARY.md`
- Task Commits: 10 atomare Commits (`9a9a157`, `22ffe34`, `44e9c7f`, `ffaa6cf`, `e6e89ea`, `ce8b948`, `4e67972`, `1cb6cf1`, `c082c9c`, `ce53529`)
- Evidence:
  - `.planning/phases/phase-02/P2-T1-MOBILE-UX-BLUEPRINT.md`
  - `.planning/phases/phase-02/P2-T4-TOUCH-TARGET-CHECKLIST.md`
  - `.planning/phases/phase-02/P2-T6-FEHLKLICK-PROTOKOLL.md`
  - `.planning/phases/phase-02/P2-T7-LESBARKEIT-PROTOKOLL.md`
  - `.planning/phases/phase-02/P2-T8-ORIENTATION-ROUNDTRIP.md`
  - `.planning/phases/phase-02/P2-T9-MOBILE-PERFORMANCE.md`
  - `.planning/phases/phase-02/P2-T10-SPIELTISCH-VERIFIKATION.md`
  - `node --check src/app.js` (Regression Syntax Check)
