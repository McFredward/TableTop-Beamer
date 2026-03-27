# STATE

## Project
- Name: TT Beamer - Nemesis Overlay Prototype
- Context: Brettspiel-Beamer-Projekt fuer visuelle, nicht spielbeeinflussende Overlays
- Product Focus: Transition von OG-Nemesis auf boardspiel-agnostischen Katalogbetrieb

## Lifecycle
- Planning Mode: active
- Current Phase: 7
- Current Phase Key: phase-07
- Last Prepared: 2026-03-27
- Execution Readiness: READY
- Last Executed Plan: 7-HF6
- Planned Next Execution: 7-2
- Last Execution Summary: `.planning/phases/phase-07/7-HF6-SUMMARY.md`

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
- Verpflichtendes Feedback fuer Phase 2 ist gesetzt: Global-Defaults-Bugfix fuer neue Geraete, Settings-Button `Defaults laden & anwenden`, Mobile-Top-Control-Schutz ohne Content-Ueberdeckung.
- Bootstrap-Regel (Phase 2): leerer/fehlender Local Storage ist ein verpflichtender Fallback-Fall; globale Defaults werden automatisch geladen und direkt angewendet.
- Settings-Regel (Phase 2): `Defaults laden & anwenden` zieht globale Defaults bewusst nach und aktualisiert den aktuellen Laufzeitzustand ohne Neustart.
- Mobile-Layout-Regel (Phase 2): Mobile Top-Controls folgen dem normalen Dokumentfluss; Trigger-/Running-Cluster duerfen keinen Scroll-Content verdecken.
- Desktop-Paritaets-Regel (Phase 2): Mobile-Layout-Anpassungen sind breakpoint-begrenzt; Desktop-Verhalten bleibt unveraendert.
- Phase-2 Plan 2 setzt Prioritaetsfokus: P2-T26..P2-T30 (Global-Defaults-Bootstrap, Startup-Guard, Settings-Reapply, Mobile-Top-Control-Flow, Desktop-Paritaet).
- Startup-Fallback fuer neue/geleerte Geraete ist jetzt explizit abgesichert: Empty-Storage wird als Pflichtfall verfolgt (`applied` oder `failed-explicit`), nie still uebersprungen.
- Settings besitzt `Defaults laden & anwenden`; globale Defaults werden ohne Neustart in den laufenden Runtime-Zustand uebernommen.
- Mobile Dashboard nutzt eine topnahe Steuerzone im normalen Scrollfluss ohne Content-Overlap; Desktop-Paritaet wird in Runtime-Regression + P2-T30-Protokoll nachgewiesen.
- Neues verpflichtendes Feedback fuer Phase 2 ist gesetzt: P0-Bugfix fuer Mobile-Cluster-Overlap zur Board-Projektionsflaeche plus robuste, verlaesslich erreichbare Navigation `Dashboard` <-> `Settings`.
- Projektions-Regel (Phase 2, Plan-Update 3): oberes Mobile-Cluster darf Board-Flaeche beim Scrollen nicht ueberdecken; Board bleibt sichtbar und bedienbar.
- Navigations-Regel (Phase 2, Plan-Update 3): Dashboard-Button in `Settings` bleibt robust erreichbar; kein Navigations-Dead-End bei Scroll/Orientation/Resize/View-Switch.
- Mobile-Control-Cluster wird per Runtime-Offset unterhalb der Projektionsflaeche verankert; Board bleibt bei Scroll sichtbar und interaktiv.
- Primary-View-Navigation (`Dashboard`/`Settings`) ist strukturell persistent und nicht mehr an Dashboard-only-Sichtbarkeit gebunden.
- Navigation/Projection-Resilienz wird ueber kombinierte Guards fuer Scroll, Orientation, Resize und View-Switch regressionsgeprueft.
- Neues verpflichtendes Feedback fuer Phase 2 (Plan-Update 4) ist gesetzt: P0-Hotfix fuer non-sticky `Dashboard`/`Settings` und finales No-Overlay-Mobile-Layout (Referenz `debug/screenshot_debug.jpg`).
- Top-Control-Regel (Phase 2, Plan-Update 4): `Dashboard`/`Settings` sind am Scroll-Start sichtbar, aber explizit nicht sticky/fixiert und duerfen beim Scrollen normal verschwinden.
- Trigger-Layout-Regel (Phase 2, Plan-Update 4): `Triggern`/`Running managen`/`Raum starten` ueberdecken die Board-Flaeche in keinem mobilen Zustand.
- No-Overlay-Regel (Phase 2, Plan-Update 4): Scroll, Orientation-Wechsel, Resize und View-Switch behalten Board-Sichtbarkeit und Interaktion ohne Control-Overlay.
- Mobile Dashboard/Settings und Trigger-Cluster gelten in Plan-Update 4 als harte Non-Sticky-Regel (nur normaler Dokumentfluss auf Mobile).
- Board-Containment-Verification nutzt fuer Plan-Update 4 kombinierte Style-Checks (kein sticky/fixed) und Multi-Point Pointer-Probes.
- Plan-Update 5 setzt Prioritaetsfokus: formale Gap-Closure fuer Phase 2 mit (a) externen Zonen-JSON inkl. Validator/Fallback, (b) echtem Preview/Kombi/Absenden-Flow inkl. Rollback und (c) README-Finalisierung.
- Datenregel fuer Plan-Update 5: `config/zones/*.json` wird kanonische Board-Zonenquelle; Inline-Zonen gelten nur noch als expliziter Notfall-Fallback.
- Live-Flow-Regel fuer Plan-Update 5: Preview-Staging und Live-Commit teilen ein konsistentes Zustandsmodell; letzter Send ist ruecknehmbar (Undo/Rollback).
- Abschlussregel fuer Plan-Update 5: Phase 2 ist formal erst abschliessbar, wenn Gap-Re-Verification + README-Workflow-Update dokumentiert sind.
- Zonenquelle fuer Phase-2-Abschluss ist jetzt extern (`config/zones/*.json`) mit strikter Validierung und klassifiziertem Fallback (`last-known-good`/Inline).
- Preview/Kombi und Live-Commit sind als getrennte Zustandsmodelle umgesetzt; letzter Live-Send ist per Undo/Rollback ruecknehmbar.
- Phase-2-README wurde auf den finalen Operator-Workflow (Defaults -> Kalibrierung -> Preview -> Live -> Rollback) aktualisiert.
- Phase-3 Planung ist vorbereitet: Nemesis Animations-Overhaul mit kombinierten Raumzustaenden (`kaputt`, `brennend`, `alienCount 0-2`, `leiche`), Spezialraum-Effekten (`nest`, `slime`, `decompression`), sauberem Raum-Clipping und immersiver Darstellung.
- Plan-3-1 ist als erste Ausfuehrungswelle execute-ready gesetzt; P0 umfasst Zustandsmodell, Kompositionsregeln, Clipping-Guard, Kombinationsrenderer und Spezialraum-Integration.
- Phase-3 Plan 3-1 ist ausgefuehrt: kombinierbare Raumzustaende laufen als persistente Per-Room-Profile mit zentraler Layer-Komposition.
- Spezialraum-Effekte `nest`, `slime`, `decompression` sind in Trigger/Edit/Runtime integriert und bleiben strikt auf Raum-Polygone geclippt.
- Runtime-Hardening fuer Plan 3-1 nutzt adaptive Quality-Skalierung auf Framekostenbasis und dokumentierte Acceptance-Nachweise in `.planning/phases/phase-03/3-1-VERIFICATION.md`.
- Verbindliches User-Feedback fuer Phase 3 setzt Rework 3-2: Rueckkehr zum separaten Trigger-Modell pro Raumanimation statt kombinierten Raumzustandsobjekten.
- Rework-Regel Plan 3-2: Running-Uebersicht fuehrt jede aktive Raumanimation als eigenen Eintrag; Kombinationen entstehen nur durch parallele Einzeltrigger.
- Verbindliches Raumset fuer Plan 3-2 ist fix: `kaputt`, `feuer`, `schleim`, `nest`, `dekompression`, `lichtflackern`, `alarm`.
- Renderer-Regel Plan 3-2: `alarm` und `lichtflackern` nutzen globale Aequivalente, bleiben aber strikt auf den Zielraum geclippt.
- Asset-/Parameter-Regel Plan 3-2: `kaputt`/`feuer`/`schleim` nutzen feste GIF-Assets; GIF-Instanzen unterstuetzen `opacity` + `playbackSpeed` und laufen default im `hold`-Modus bis Stop.
- Plan-3-2-Rework ist ausgefuehrt: Room-Trigger laufen wieder als separate Instanzen statt Kombi-Objekt.
- Running-Liste zeigt Instanz-ID/Typ 1:1 pro aktiver Raumanimation; Edit/Stop bleiben instanzgenau.
- `alarm` und `lichtflackern` rendern als globale Aequivalente nur innerhalb des Zielraum-Clips.
- GIF-Assets `malfunction.gif`/`fire.gif`/`final.gif` sind fuer `kaputt`/`feuer`/`schleim` live und instanzscharf mit `opacity` + `playbackSpeed` steuerbar.
- Neues verpflichtendes Feedback fuer Phase 3 (Plan-Update 3-3) ist gesetzt: GIF-Raumanimationen laufen aktuell nicht als echte GIF-Loops, sondern zeigen Pulse-/Zoom-Muster.
- P0-Regel Plan-Update 3-3: Renderer muss fuer `kaputt`/`feuer`/`schleim` native GIF-Framefolge + echten Loop aus den Assets abspielen (kein Pseudoersatz).
- Paritaets-Regel Plan-Update 3-3: `opacity`/`playbackSpeed` bleiben instanzscharf unter nativer GIF-Wiedergabe.
- Regression-Regel Plan-Update 3-3: Running-List-1:1, hold-by-default und Clipping bleiben unveraendert Pflicht-Gates.
- Plan-3-3-Bugfix ist umgesetzt: `kaputt`/`feuer`/`schleim` rendern als native GIF-Frame-Loops ohne Pulse-/Zoom-Ersatz.
- Instanzparitaet bleibt fuer natives GIF-Playback erhalten (`opacity`/`playbackSpeed` je `animation.id` querwirkungsfrei).
- Plan-3-3-Nachweise sind dokumentiert: `P3-T29-REGRESSION.md`, `P3-T30-SOAK.md`, `3-3-VERIFICATION.md`.
- Neues verpflichtendes Feedback fuer Phase 3 (Plan-Update 3-4) ist gesetzt: GIF-Raumanimationen koennen im Fallback-Pfad als Standbild enden, wenn native Decoder nicht verfuegbar sind.
- P0-Regel Plan-Update 3-4: `kaputt`/`feuer`/`schleim` muessen auf allen Zielbrowsern als echte Loops laufen, unabhaengig von `ImageDecoder`.
- Fallback-Regel Plan-Update 3-4: Ersatzpfad muss echten Frame-Fortschritt inkl. Loop liefern; statisches Erstframe ist ein Blocker.
- Paritaets-Regel Plan-Update 3-4: `opacity`/`playbackSpeed` bleiben pro Instanz in nativen und fallback Pfaden konsistent.
- Regression-Regel Plan-Update 3-4: Running-Liste 1:1, hold-by-default und raumstrenges Clipping bleiben Pflicht-Gates ohne Regression.
- Plan-Update-3-4 Umsetzung: GIF-Playback ist decoder-agnostisch; bei fehlendem `ImageDecoder` liefert der Parser-Fallback echte Frame-Loops statt Standbild.
- Phase-7 Plan 7-1 execution: server sync path now uses deterministic ordered queue lanes with bounded backpressure/coalescing and mutation envelopes (`mutationId`, `serverVersion`, `serverTimestamp`, class, priority).
- Phase-7 Plan 7-1 execution: client apply path is version-aware/idempotent with receive/apply acknowledgements and final-output fast-path optimizations for lower apply overhead.
- Phase-7 Plan 7-1 execution: telemetry/regression/report artifacts added (`/api/live/telemetry`, `p7-t12/p7-t13/p7-t14` scripts, phase evidence docs).
- Phase-7 Plan 7-HF1 execution: P7-T12 verifier enforces canonical `hopsMs` only and rejects missing-field payloads via explicit negative-path assertion.
- Phase-7 Plan 7-HF1 execution: P7-T13 non-regression became an executable behavior matrix for room/cluster/align/audio-role/persistence including reload/rejoin parity checks.
- Phase-7 Plan 7-HF1 execution: evidence refreshed to PASS with `debug/p7-hf1-t12-output.json`, `debug/p7-hf1-t13-output.json`, `debug/p7-hf1-t14-output.json` and synchronized phase/global artifacts.
- Phase-7 Entscheidungsauftrag (Realbetrieb): Sync-Architektur pivotet auf serverautoritative Snapshot-Polling-Semantik mit Versionsnummern als verbindlichem Korrektheitspfad.
- Phase-7 Architekturregel (Plan 7-HF2): Clients schreiben nur Commands an den Server und uebernehmen sichtbaren Zustand ausschliesslich aus serverseitigen Snapshots; optimistische lokale Zielstates sind verboten.
- Phase-7 Taktregel (Plan 7-HF2): adaptives Polling 120-250 ms fuer 3-4 Clients ist akzeptierter Betriebsstandard; WebSocket bleibt optionaler Wakeup-Hint ohne Korrektheitsrolle.
- Plan-Update-3-4 Umsetzung: GIF-Renderpfad zeichnet nur Timeline-Frames (kein Erstframe-Fallback), waehrend `opacity`/`playbackSpeed` pro Instanz unveraendert isoliert bleiben.
- Phase-4 Planung ist vorbereitet: umfassendes Refactoring fuer Wartbarkeit mit modularer Zielarchitektur statt monolithischem `src/app.js`.
- Phase-4 Scope-Regel: Verhaltensparitaet ist verpflichtend fuer Dashboard/Settings, Room-Animationen, GIF-Playback, Persistenz, Save/API und mobile UX.
- Phase-4 Migrationsregel: inkrementelle Extraktion (Config/State/API/Persistenz/GIF/Render/UI) mit Pflicht-Regressionsgate nach jedem Block.
- Phase-4 Plan 4-1 extrahiert Config/Normalizer/State/Persistenz/API als modulare Facades, waehrend Runtime-Paritaet ueber bestehende App-Callsites erhalten bleibt.
- Save/Load fuer Global Defaults laeuft ab Plan 4-1 ueber eine dedizierte API-Facade mit unveraenderter Resolver-/Preflight-/Error-Semantik.
- Verbindliche Erweiterung fuer Phase 4: Raummodell wird generalisiert (`room create/delete`, freie Polygone, editierbare Custom-Namen) statt statischem Raumset.
- Phase-4 Plan 4-2 ist als priorisierte P0-Ausfuehrungswelle fuer Room-Generalisierung + Datenmigration execute-ready gesetzt.
- Datenregel fuer Plan 4-2: Defaults/Profile migrieren auf neuen Room-JSON-Standard; Legacy-Staende bleiben ladbar und werden beim Speichern auf den neuen Standard normalisiert.
- Plan-4-2 Umsetzung: Room-Ownership ist modularisiert (`src/app/domain/rooms`, `src/app/ui/settings/rooms`), waehrend `src/app.js` die Orchestrierung beibehlt.
- Plan-4-2 Umsetzung: Kanonisches Raummodell nutzt `roomCatalog` (`id`,`name`,`polygon`,`meta`), UI erlaubt Room-Create/Delete, freie Polygonbearbeitung und Custom-Namen.
- Plan-4-2 Umsetzung: Legacy-Roomdaten bleiben ladbar; Save schreibt konsistent das neue roomCatalog-Schema.
- Neues verpflichtendes Feedback fuer Phase 4 ist gesetzt: Desktop-Problem mit wachsender Running-Liste wird als P0 behandelt; Liste muss begrenzt/scrollbar oder layout-separiert sein, damit Controls immer erreichbar bleiben.
- Scope-Entscheidung fuer Phase 4: Preview-Staging wird vollstaendig entfernt (UI + Runtime + State/Flows), solange Trigger/Edit/Stop/Save-Kernfunktionen regressionsfrei bleiben.
- Plan-4-3 ist entsprechend neu priorisiert als execute-ready P0-Hotfixpaket (Running-Containment + Preview-Decommission + Fokus-Regression).
- Plan-4-3 Umsetzung: Running-Overview ist auf Desktop nicht mehr sticky, die Liste ist hoehenbegrenzt und besitzt einen eigenen Scrollbereich mit Layout-Containment.
- Plan-4-3 Umsetzung: Preview-Staging ist aus UI, Runtime-State, Event-Flows und `/api/live/*` Serverpfaden entfernt; Trigger/Edit/Stop/Save bleiben preview-frei stabil.
- Neues verpflichtendes Feedback fuer Phase 4 (Plan-Update 4-4) ist gesetzt: Polygon-Editor braucht einstellbare Handle-Groesse nahe Zoom fuer Praezisionsarbeit bei hohem Zoom.
- Immersion-Regel fuer Plan-Update 4-4: `lichtflackern` wird als unregelmaessiges, kaputtes Random-Flicker statt Pulsieren gefuehrt und bleibt strikt raumbegrenzt geclippt.
- Edit-Mode-Regel fuer Plan-Update 4-4: gesamtes Room-Polygon ist per LMB-Flaechen-Drag verschiebbar (Photoshop-aehnlich), ohne Vertex-Insert/Delete/Move zu brechen.
- Plan-4-4 ist als priorisierter P0-Hotfix execute-ready; nachgelagerte GIF/Render/UI-Isolation verschiebt sich auf Plan 4-5.
- Plan-4-4 Umsetzung: Polygon-Handle-Groesse ist als zoomnaher Slider (70..220%) eingebaut und wirkt sofort auf Overlay-Handles.
- Plan-4-4 Umsetzung: `lichtflackern` nutzt jetzt unregelmaessiges Random-Flicker (Burst/Dip/Glitch) statt periodischem Puls.
- Plan-4-4 Umsetzung: Room-Polygon-Flaechen-Drag per LMB ist aktiv und gegen Vertex-Edit/Pan-Kollisionen guardiert.
- Neues verpflichtendes Feedback fuer Phase 4 (Plan-Update 4-5) ist gesetzt: Handle-Groesse muss fuer alle Editor-Punkte inkl. Ship-Polygon-Vertices gelten.
- Visual-Regel fuer Plan-Update 4-5: `lichtflackern` behaelt den Stil, entfernt aber stoerende horizontale weisse Streifen (kein Glitch-Look).
- Speed-Regel fuer Plan-Update 4-5: Mindest-Speed fuer `lichtflackern` wird auf 10% abgesenkt, konsistent in UI/Runtime/Persistenz.
- Persistenz-Regel fuer Plan-Update 4-5: Sound-Mapping/Sound-Auswahl bleibt nach Reload erhalten und ist ueber Global Defaults speicher-/ladbar.
- Plan-4-5 ist als priorisierter P0-Hotfix execute-ready gesetzt; GIF/Render/UI-Isolation verschiebt sich auf Plan 4-6.
- Plan-Update-4-5 Umsetzung: Room- und Ship-Polygoneditor nutzen denselben Handle-Metrikpfad inklusive gemeinsamer Handle-Scale-Quelle.
- Plan-Update-4-5 Umsetzung: `lichtflackern`-Cleanup ersetzt horizontale Glitch-Baender durch lokale Spark-Bursts bei unveraendert unregelmaessigem Flicker-Charakter.
- Plan-Update-4-5 Umsetzung: Board-Profile persistieren `audio`, `animationSpeed` und `animationSoundMap`; Reload + Global-Defaults-Apply bleiben fuer Sound-Mapping konsistent.
- Plan-Update 4-5b setzt Prioritaetsfokus: P0 Mini-Hotfix fuer Persist-on-change in Audio/Sound-Mapping-Handlern und deterministischen Direkt-Reload.
- Plan-Update-4-5b Umsetzung: Audio-Enable/Volume und Animation-Sound-Mapping persistieren sofort; Mapping-Normalisierung schreibt ebenfalls direkt, damit Reload ohne Timing-Luecke den letzten Stand liest.
- Phase-5 Planung ist vorbereitet: Multi-Device Live-Sync mit serverautoritativem Shared-State und dediziertem Final-Beamer-Output.
- Final-Output-Regel fuer Phase 5: Serverpfad `/output/final` zeigt ausschliesslich FX/Animationen; kein Board-Bild, keine Raum-Polygone, keine Raumnamen.
- Sync-Regel fuer Phase 5: Aenderungen eines Controllers werden sofort an alle verbundenen Clients (Handy/PC/Beamer) repliziert.
- Align-Regel fuer Phase 5: globaler Align-Mode blendet Polygon-Overlay nur im Final-Output ein/aus; Controller-Views behalten Polygone immer sichtbar.
- Audio-Regel fuer Phase 5: Audio ist strikt output-gebunden (`final-output` hoerbar, `control` stumm).
- Logging-Regel fuer Phase 5: serverseitiges persistentes Dateilog erfasst Session-Events, State-Aenderungen und Fehler mit Kontext.
- Plan-5-1 Umsetzung: `/output/final` laeuft als dedizierte Final-Output-Rolle mit FX-only-Rendervertrag.
- Plan-5-1 Umsetzung: Shared-Live-State ist serverseitig versioniert und repliziert per WebSocket-Broadcast inklusive Join-Snapshot.
- Plan-5-1 Umsetzung: Align-Mode ist global und wirkt nur auf Final-Output-Polygone; Control-Polygone bleiben immer sichtbar.
- Plan-5-1 Umsetzung: Audio ist rollenbasiert hart getrennt (control muted, final-output audible).
- Plan-5-1 Umsetzung: Persistentes JSONL-Logging schreibt `session_event`, `state_change` und `error` Eintraege.
- Neues verpflichtendes Feedback fuer Phase 5 ist gesetzt: Outside-Space-Sync ist unvollstaendig und `/output/final` verletzt im Bugfall den FX-only-Vertrag (UI-Leaks/White-Page).
- Hotfix-Regel fuer Phase 5: Outside-State (`enabled`, `speed`, relevante Parameter) ist als vollstaendiger Shared-State inkl. Join/Reconnect-Snapshot verpflichtend.
- Hotfix-Regel fuer Phase 5: Final-Output muss stabil als Vollbild-FX-only booten/rendern; Slider/Settings/UI sind dort verboten, Align-Polygon-Overlay bleibt einzige Ausnahme.
- Phase-5 Plan 5-HF1 ist als priorisierte execute-ready P0-Welle vor Plan 5-2 gesetzt.
- Plan-5-HF1 Umsetzung: Outside-FX wird im Shared-State vollstaendig synchronisiert (`outsideFxByBoard` inkl. Toggle/Speed/Intensity/Mode/Direction) und bei Join/Reconnect ueber Snapshot hydratisiert.
- Plan-5-HF1 Umsetzung: `/output/final` nutzt root-absolute Bootstrap-Assets und harte FX-only Guards; Align-Overlay bleibt die einzige erlaubte Sichtbarkeitsausnahme.
- Neues verpflichtendes Feedback fuer Phase 5 ist gesetzt: Outside `direction`/`mode` und vereinzelt Room-Animation-Aktionen benoetigen teils Mehrfachklicks fuer sichtbare Synchronisierung.
- Hotfix-Regel fuer Phase 5 (Plan 5-HF2): jede Aktion muss beim ersten Ausloesen deterministisch ueber alle Clients synchron sein (kein Retry-/Mehrfachklick-Zwang).
- Architektur-Regel fuer Plan 5-HF2: Mutationen sind serverautoritativ-idempotent und werden nur mit sofortigem Broadcast-Ack (Mutation-ID + Version) als bestaetigt betrachtet.
- Ordering-Regel fuer Plan 5-HF2: schnelle Toggle-Folgen nutzen monotone Versionierung mit stale-drop und deterministic last-write.
- Verifikations-Regel fuer Plan 5-HF2: verpflichtende Single-Click-Regression fuer Outside mode/direction und Room trigger/edit/stop/clear-all inklusive Burst-Soak.
- Plan-5-HF2 Umsetzung: HF2-kritische Mutationen (`outside-update`, `trigger-room`, `edit-room`, `stop-animation`, `clear-all`) werden serverautoritativ als mutationsspezifische Patches statt Vollsnapshot-Overwrite angewendet.
- Plan-5-HF2 Umsetzung: Live-Ack/Broadcast tragen `mutationId` + `version`; Duplicate/Stale-Mutationen werden bestaetigt, aber nicht erneut broadcast-applied.
- Plan-5-HF2 Umsetzung: Client fuehrt `lastSessionVersion`-Guard und Pending-Replay nach `live-hello`, damit Join/Reconnect + Inflight ohne State-Drift bleiben.
- Neues verpflichtendes Feedback fuer Phase 5 ist gesetzt: Layout/ausgewaehltes Board muss ueber alle Clients synchronisiert werden.
- Neues verpflichtendes Feedback fuer Phase 5 ist gesetzt: Legacy-`Output Route` wird entfernt; dedizierter Ausgabepfad bleibt `/output/final`.
- Hotfix-Regel fuer Phase 5 (Plan 5-HF3): Board/Layout ist ein verpflichtender Shared-State mit serverautoritiver Mutation, Ack/Version und Join/Reconnect-Paritaet.
- Decommission-Regel fuer Phase 5 (Plan 5-HF3): `Output Route` wird aus UI/State/Runtime-Pfaden vollstaendig entfernt und per Negativtests abgesichert.
- Phase-5 Plan 5-HF3 ist als priorisierte execute-ready P0-Welle vor Plan 5-2 gesetzt.
- Plan-5-HF3 Umsetzung: Board/Layout-Kontext wird serverautoritativ ueber `context-update` mit Ack/Version synchronisiert und auf allen Clients repliziert.
- Plan-5-HF3 Umsetzung: Join/Reconnect-Hydrierung uebernimmt `selectedBoard`/`selectedLayout` deterministisch aus dem Live-Snapshot ohne manuelles Nachstellen.
- Plan-5-HF3 Umsetzung: Legacy-`Output Route` ist aus UI/Runtime/State entfernt; `/output/final` bleibt der einzige dedizierte Output-Pfad.
- Phase-6 Planung ist vorbereitet: boardspiel-agnostischer Betrieb mit importierbaren Boards, serverseitiger Persistenz und dynamischer Katalogauswahl statt Nemesis-only A/B-Hardcoding.
- Board-Katalog-Regel fuer Phase 6: Board-Auswahl basiert auf kanonischem Catalog-Schema (`boardId`, Metadaten, Raumdaten, optionale Cluster); Runtime/UI lesen ausschliesslich aus dem Katalog.
- English-Flow-Regel fuer Phase 6: Operator-relevante UI-Texte, Statusmeldungen, Dokumentationshinweise sowie Logs/Errors werden auf durchgaengiges Englisch vereinheitlicht.
- Cluster-Regel fuer Phase 6: Room-Clusters sind frei definierbar und als Dropdown-Ziel waehlbar; Trigger/Edit starten fuer alle enthaltenen Raeume, waehrend Board-Klick auf Einzelraum weiterhin nur den angeklickten Raum selektiert.
- Migrations-Regel fuer Phase 6: bestehende Nemesis-Daten inklusive Polygonen und Animationskonfigurationen werden verlustfrei, idempotent und rueckwaertskompatibel in den neuen Standard ueberfuehrt.
- Phase-6 Plan 6-1 ist als priorisierte execute-ready P0-Welle gesetzt (Catalog/Import, English-Flow, Clusters, Migration).
- Plan-6-1 execution: board catalog now loads via `/api/boards` with server-side import endpoint `/api/boards/import` and persisted storage in `config/boards/imported`.
- Plan-6-1 execution: room target model supports `room` + `cluster`; cluster launch fans out per room while board click remains single-room only.
- Plan-6-1 execution: operator-facing README and major board/catalog/target UI copy migrated to English for phase-6 workflows.
- verify-work-6 follow-up re-opens a P0 blocker: `English-only operator flow` is still incomplete in operator-facing paths.
- Hotfix-Regel fuer Phase 6 (Plan 6-HF1): keine deutschen operatorrelevanten Texte in `Control`/`Settings`/`Final-Flow`, inklusive Statusmeldungen und Fehlermeldungen.
- Dokumentations-Regel fuer Plan 6-HF1: `README.md` und Phase-06-Artefakte muessen die English-only Operator Policy konsistent widerspiegeln.
- Verifikations-Regel fuer Plan 6-HF1: blocker closure erfordert ein dediziertes Language-Sweep-Artefakt (`.planning/phases/phase-06/P6-HF1-LANGUAGE-SWEEP.md`).
- Plan-6-HF1 execution: Control/Settings/Final-flow operator text + status/error paths are fully English-only.
- Plan-6-HF1 execution: README + Phase-06 workspace docs now state the English-only operator policy consistently.
- Plan-6-HF1 execution: blocker closure documented in `.planning/phases/phase-06/P6-HF1-LANGUAGE-SWEEP.md` (PASS, no open P0 language blocker).
- Neues verpflichtendes Feedback fuer Phase 6 ist gesetzt: Polygon-Editor braucht getrennte Vertex-Visibility-Toggles fuer Room-Vertices und Play-Area-Vertices.
- Terminologie-Regel fuer Phase 6 (Plan 6-2): `Ship Polygon` wird in UI/Model/Operator-Wording auf `Play Area` generalisiert; Legacy-Bezeichner sind nur als Ladealias erlaubt.
- Visual-Regel fuer Phase 6 (Plan 6-2): ehemalige Spezialraum-Sondermarkierungen entfallen; Spezialraeume werden visuell wie normale Raeume behandelt.
- Creation-Regel fuer Phase 6 (Plan 6-2): neue Raeume koennen aus bestehenden Polygonvorlagen erzeugt werden; Geometriepunkte werden als Startform kopiert.
- Phase-6 Plan 6-2 ist als priorisierte execute-ready P0-Welle gesetzt (Vertex-Split, Play-Area-Rename, no-special-room-visuals, Polygon-Template-Copy).
- Plan-6-2 execution: Polygon editor now has independent vertex visibility toggles for room polygons vs Play Area polygons with hidden-group drag/selection guards.
- Plan-6-2 execution: Operator-facing `Ship Polygon` wording is generalized to `Play Area`; persistence canonical key is `playAreaPolygon` with legacy ship aliases for load/merge migration.
- Plan-6-2 execution: Special-room visual highlighting is removed and room creation can clone polygon templates from Play Area or existing rooms.
- Neues verpflichtendes Feedback fuer Phase 6 ist gesetzt: Room-Copy muss vollstaendig alle Room-Geometry-Eigenschaften inkl. Scale/Offset/Transform uebernehmen.
- Keyboard-Regel fuer Phase 6 (Plan 6-HF2): bei selektiertem Room muss `CTRL+C` kopieren, `CTRL+V` einfuegen und `Delete` loeschen.
- Selection-Regel fuer Phase 6 (Plan 6-HF2): Klick auf leere Boardflaeche setzt Room-Selektion auf `none`.
- Non-Regression-Regel fuer Phase 6 (Plan 6-HF2): Play-Area-Editing/-Selection bleibt durch Room-Copy/Keyboard/Deselection unberuehrt.
- Phase-6 Plan 6-HF2 ist als priorisierte execute-ready P0-Welle vor Plan 6-3 gesetzt.
- Plan-6-Hardening ist als Plan 6-3 nachgelagert und startet erst nach Plan-6-HF2-Regressionsevidenz.
- Plan-6-HF2 execution: room template-copy now preserves full room geometry parity (transform fields plus roomGeometry scale/offset/absolute/stretch values).
- Plan-6-HF2 execution: selected-room keyboard editing supports `CTRL/CMD+C`, `CTRL/CMD+V`, and `Delete` with typing/play-area conflict guards.
- Plan-6-HF2 execution: empty-board click clears selected room deterministically while Play-Area editing/selection remains unchanged.
- Neues verpflichtendes Feedback fuer Phase 6 ist gesetzt: `Delete` funktioniert aktuell nur waehrend LMB-Hold auf dem Room, obwohl der Room visuell selektiert ist.
- Selection-Regel fuer Phase 6 (Plan 6-HF3): visuell selektierter Room (Polygon/Handles sichtbar) ist kanonisch aktiv selektiert und dient als einzige Source-of-Truth fuer Room-Hotkeys.
- Delete-Regel fuer Phase 6 (Plan 6-HF3): `Delete` loescht den aktiv selektierten Room sofort ohne Pointer-Hold-/Drag-Voraussetzung.
- Regression-Regel fuer Phase 6 (Plan 6-HF3): kombinierte Matrix fuer Copy/Paste/Delete + Empty-space deselect + Play-Area-Guard ist als P0-Hotfix-Pflichtnachweis erforderlich.
- Artefakt-Regel fuer Phase 6 (Plan 6-HF3): PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP werden im selben Schritt konsistent synchronisiert.
- Phase-6 Plan 6-HF3 ist als priorisierte execute-ready P0-Welle vor Plan 6-3 gesetzt.
- Plan-6-HF3 execution: visuelle Room-Selektion ist als persistente aktive Selection normalisiert und verhindert Selection-/Handle-Drift nach Pointer-Up.
- Plan-6-HF3 execution: `Delete` loescht den aktiv selektierten Room ohne Hold-/Drag-Abhaengigkeit und behaelt Typing-/Play-Area-Guards bei.
- Plan-6-HF3 execution: kombinierte Regression fuer Copy/Paste/Delete + Empty-space deselect + Play-Area-Guard ist als `P6-T37-REGRESSION.md` dokumentiert.
- Neues verpflichtendes Feedback fuer Phase 6 ist gesetzt: persistente Room-Selection regressiert im Pointer-Arbitration-Pfad (Polygone/Handles nur waehrend LMB-Hold sichtbar).
- Pointer-Arbitration-Regel fuer Phase 6 (Plan 6-HF4): `Click` aktiviert persistente Selection, `Hold/Move` startet Drag; Pointer-Up darf Selection nicht invalidieren.
- Lifecycle-Regel fuer Phase 6 (Plan 6-HF4): sichtbare Room-Polygone/Handles bleiben bis Empty-Space-Deselect oder Room-Wechsel aktiv.
- Input-Regel fuer Phase 6 (Plan 6-HF4): Delete/Copy/Paste + Buttons lesen ausschliesslich persistente Selection (kein transienter Hold-State).
- Phase-6 Plan 6-HF4 ist als priorisierte execute-ready P0-Welle vor Plan 6-3 gesetzt.
- Plan-6-HF4 execution: pointer arbitration now uses pending drag promotion (`click => persistent selection`, `hold+move => area drag`).
- Plan-6-HF4 execution: pointerup keeps persistent room selection/handles visible until empty-space deselect or room switch.
- Plan-6-HF4 execution: room keyboard/buttons resolve actions from persisted selected-room state; combined regression documented in `P6-T42-REGRESSION.md`.
- Neues verpflichtendes Feedback fuer Phase 6 ist gesetzt: kurzer Click selektiert Room nicht persistent ohne Move; Selection bleibt nur waehrend Hold sichtbar.
- P0-Regel fuer Phase 6 (Plan 6-HF5): no-move short-click muss persistente Selection aktivieren; Drag darf dafuer nicht erforderlich sein.
- Lifecycle-Regel fuer Phase 6 (Plan 6-HF5): Pointer-Up nach no-move Click behaelt Polygon/Handles sichtbar bis Empty-Space-Deselect oder Room-Wechsel.
- Guard-Regel fuer Phase 6 (Plan 6-HF5): Empty-space deselect, Play-Area-Guard sowie Copy/Paste/Delete bleiben unter Click-Fix regressionsfrei.
- Phase-6 Plan 6-HF5 ist als priorisierte execute-ready P0-Welle vor Plan 6-3 gesetzt.
- Plan-6-HF5 execution: no-move short-click persists room selection without move/drag requirement.
- Plan-6-HF5 execution: pointer-up lifecycle keeps persistent selection visuals/handles active until explicit deselect or room switch.
- Plan-6-HF5 execution: drag parity + guard matrix remain PASS, documented in `P6-T46-DRAG-PARITY.md` and `P6-T47-REGRESSION.md`.
- Neues verpflichtendes Feedback fuer Phase 6 ist gesetzt (Regression nach HF5): Vertex-Click darf Room-Selektion nicht verlieren; Vertex-Auswahl fuer Move/Delete muss stabil bleiben.
- Pointer-Arbitration-Regel fuer Phase 6 (Plan 6-HF6): Room- und Vertex-Pointerpfade sind deterministisch getrennt; Vertex-Interaktion darf persistente Room-Selektion/Handles nicht invalidieren.
- Selection-Lifecycle-Regel fuer Phase 6 (Plan 6-HF6): direkter Vertex-Click ist primaerer Editpfad (Move/Delete/Panel/Delete-Key) ohne Re-Select ueber Dropdown.
- UX-Guard-Regel fuer Phase 6 (Plan 6-HF6): unbeabsichtigte Text-Selektion wird waehrend Room-Drag unterdrueckt, sofern der Fix ohne Risiko fuer Input-Felder und bestehende Drag-Flows bleibt.
- Plan-6-HF6 execution: vertex pointerup now preserves persistent room selection lifecycle and blocks same-cycle deselect races.
- Plan-6-HF6 execution: direct vertex click remains stable as active selection for move/delete; delete key + delete panel share the same vertex selection source.
- Plan-6-HF6 execution: room-area drag suppresses browser text selection via low-risk drag-only guard; combined HF6 regression matrix is PASS (`P6-T53-REGRESSION.md`).
- Neues verpflichtendes Feedback fuer Phase 6 ist gesetzt (nach HF6): Edge-Bubble-Click zwischen Vertices deselektiert den Room; Room-Delete ist gegen Global-Defaults-Rehydrate nicht persistent.
- Pointer-Arbitration-Regel fuer Phase 6 (Plan 6-HF7): Edge-Bubble-Click folgt dem Vertex-Lifecycle, behaelt persistente Room-Selektion und laesst aktive Edge fuer Insert-Vertex stabil.
- Delete-Persistenz-Regel fuer Phase 6 (Plan 6-HF7): geloeschte Rooms werden als board-spezifische Tombstones persistiert; Defaults-Merge/Overlay darf getombstonete Rooms nicht wiederherstellen.
- Regression-Regel fuer Phase 6 (Plan 6-HF7): Pflichtnachweis umfasst Insert-Vertex-Flow (edge click ohne reselect), delete persistence (reload/restart/defaults apply) und bestehende Guards (empty-space deselect, play-area parity).
- Artefakt-Regel fuer Phase 6 (Plan 6-HF7): PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE werden im selben Schritt konsistent synchronisiert.
- Phase-6 Plan 6-HF7 ist als priorisierte execute-ready P0-Welle vor Plan 6-3 gesetzt.
- Plan-6-HF7 execution: edge-bubble click now preserves persistent room selection and stable active edge lifecycle for direct insert-vertex without reselect.
- Plan-6-HF7 execution: room deletions persist as board-scoped `deletedRoomIds` tombstones; catalog apply and defaults export merge enforce `tombstone > defaults` precedence.
- Plan-6-HF7 execution: combined regression matrix is PASS and documented in `P6-T59-REGRESSION.md`; Plan 6-3 is unblocked.
- Neues verpflichtendes Feedback fuer Phase 6 ist gesetzt (nach HF7): Room-Animation-Drafts resetten bei Room-Wechsel; Cluster-UX/Flow ist unvollstaendig (fehlendes CRUD, fehlendes `stagger start`).
- Draft-Regel fuer Phase 6 (Plan 6-HF8): zuletzt gewaehlte Room-Animation sowie aktuelle Trigger-Parameter bleiben ueber Room-/Target-Wechsel und Trigger-Start als aktive Voreinstellung erhalten.
- Cluster-UX-Regel fuer Phase 6 (Plan 6-HF8): Cluster sind im Operator-Flow board-spezifisch voll verwaltbar (create/edit/delete) und in `target` waehlbar.
- Trigger-Option-Regel fuer Phase 6 (Plan 6-HF8): `stagger start` ist pro Trigger schaltbar (`off` = synchron, `on` = kurzer randomisierter Room-Versatz).
- Artefakt-Regel fuer Phase 6 (Plan 6-HF8): PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE werden im selben Schritt konsistent synchronisiert.
- Phase-6 Plan 6-HF8 ist als priorisierte execute-ready P0-Welle vor Plan 6-3 gesetzt.
- Neues verpflichtendes Feedback fuer Phase 6 ist gesetzt (nach HF8): Draft-Persistenz wird praezisiert (`animation + parameter` stabil, `target` ausgenommen); Room-Klick muss `target` automatisch auf den geklickten Room setzen.
- Target-Regel fuer Phase 6 (Plan 6-HF9): `target`-Dropdown bleibt immer manuell bedienbar, auch ohne aktive Room-Selektion; selection-basierte Deaktivierung ist unzulaessig.
- Auto+Manual-Regel fuer Phase 6 (Plan 6-HF9): nach Room-Autofill bleibt manueller Wechsel auf Room/Cluster jederzeit moeglich, unabhaengig vom Selection-State.
- Artefakt-Regel fuer Phase 6 (Plan 6-HF9): PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE werden im selben Schritt konsistent synchronisiert.
- Phase-6 Plan 6-HF9 ist als priorisierte execute-ready P0-Welle vor Plan 6-3 gesetzt.
- Plan-6-HF9 execution: Draft-Persistenz bleibt fuer Animation + Parameter stabil; `target` ist explizit aus Selection-Lifecycle-Resets ausgenommen.
- Plan-6-HF9 execution: Board-Raumklick setzt `target` deterministisch auf den geklickten Raum; Target-Dropdown bleibt auch ohne aktive Room-Selektion manuell bedienbar.
- Plan-6-HF9 execution: Auto+Manual-Target-Paritaet ist mit `P6-T71-REGRESSION.md` als PASS nachgewiesen; nachfolgendes Pflichtfeedback setzt jedoch HF10 vor Plan 6-3.
- Neues verpflichtendes Feedback fuer Phase 6 ist gesetzt (nach HF9): Cluster-Start fanout startet aktuell nur in einem Raum statt allen Cluster-Membern (betrifft sync + `stagger start`).
- Running-Regel fuer Phase 6 (Plan 6-HF10): Running-Model/-Rendering fuehrt Cluster-Starts als dedizierten Scope `CLUSTER` mit eigener Farbe und separatem Eintrag.
- Fanout-Regel fuer Phase 6 (Plan 6-HF10): Cluster-Start verarbeitet alle Cluster-Member-Raeume robust (kein First-Room-Only), fuer `stagger start = off|on` gleichermassen verbindlich.
- Stop/Edit-Regel fuer Phase 6 (Plan 6-HF10): Aktionen auf dem `CLUSTER`-Eintrag bleiben konsistent und regressieren bestehende Room/Global-Guards nicht.
- Artefakt-Regel fuer Phase 6 (Plan 6-HF10): PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE werden im selben Schritt konsistent synchronisiert.
- Phase-6 Plan 6-HF10 ist als priorisierte execute-ready P0-Welle vor Plan 6-3 gesetzt.
- Plan-6-HF10 execution: cluster start fanout now dispatches to all valid cluster members in both sync and stagger modes without first-room truncation.
- Plan-6-HF10 execution: running model/list now includes dedicated `CLUSTER` scope entries with distinct scope color and linked member semantics.
- Plan-6-HF10 execution: cluster stop/edit actions on the `CLUSTER` entry operate consistently across linked member instances; combined evidence is PASS in `P6-T76-REGRESSION.md`.
- Neues verpflichtendes Feedback fuer Phase 6 ist gesetzt (nach HF10): Cluster-Animationen sind instabil und koennen nach ~1s verschwinden; Start wirkt teils wirkungslos.
- Cluster-Lifecycle-Regel fuer Phase 6 (Plan 6-HF11): Cluster-Instanzen folgen denselben hold-by-default- und lifetime-Regeln wie Room-Instanzen; kein implizites Self-cleanup/overwrite ohne expliziten Stop oder Ablauf.
- Overwrite/Cleanup-Regel fuer Phase 6 (Plan 6-HF11): Cluster-Fanout, Instanz-Merge und Cleanup-Pfade arbeiten instanzscharf (`animation.id`/run-context) und duerfen keine fremden Member-Instanzen vorzeitig entfernen.
- Sync-Regel fuer Phase 6 (Plan 6-HF11): Board-Wechsel in Settings ist serverautoritativ mit Ack/Version/Ordering und repliziert deterministisch auf alle Clients inkl. `/output/final` ohne Mehrfach-Toggle.
- Reconnect-Regel fuer Phase 6 (Plan 6-HF11): Join/Reconnect-InFlight-Replay respektiert monotone Kontext-Versionen; stale Kontext-Patches werden verworfen, aktuelle Versionen deterministisch angewendet.
- Artefakt-Regel fuer Phase 6 (Plan 6-HF11): PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE werden im selben Schritt konsistent synchronisiert.
- Phase-6 Plan 6-HF11 ist als priorisierte execute-ready P0-Welle vor Plan 6-3 gesetzt.
- Plan-6-HF11 execution: cluster lifecycle prune/cleanup keeps hold-by-default parity and no longer self-removes cluster runs via parent-race paths.
- Plan-6-HF11 execution: cluster edit/stop semantics are run-context isolated (`animation.id`/`parentClusterRunId`) with in-place cluster updates and id-scoped member reconciliation.
- Plan-6-HF11 execution: board context sync uses reconnect-safe mutation-id dedup + stale context replay drop + socket ordering guards; first-toggle propagation is deterministic across clients incl. `/output/final`.
- Plan-6-HF11 execution: combined regression matrix is PASS and documented in `P6-T81-REGRESSION.md`; Plan 6-3 is unblocked.
- Neues verpflichtendes Feedback fuer Phase 6 ist gesetzt (nach HF11): Cluster-Start bleibt inkonsistent; Running zeigt teils zusaetzliche `ROOM`-Eintraege oder nur `CLUSTER` ohne sichtbare Member-Wirkung.
- Running-Determinismus-Regel fuer Phase 6 (Plan 6-HF12): pro Cluster-Trigger existiert genau ein kanonischer Running-Eintrag `CLUSTER`; member-`ROOM`-Duplikate fuer denselben Trigger sind unzulaessig.
- Runtime-Determinismus-Regel fuer Phase 6 (Plan 6-HF12): der dedupte `CLUSTER`-Eintrag bleibt ein wirksamer Controller und animiert weiterhin alle Cluster-Member (sync + `stagger start`).
- Stop/Edit-Regel fuer Phase 6 (Plan 6-HF12): Aktionen auf `CLUSTER` propagieren run-kontextscharf und konsistent auf alle zugeordneten Member-Instanzen.
- Regression-Regel fuer Phase 6 (Plan 6-HF12): `targetType=room` bleibt unveraendert funktionsstabil; room-flow ist Pflicht-Non-Regression im HF12-Gate.
- Artefakt-Regel fuer Phase 6 (Plan 6-HF12): PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE werden im selben Schritt konsistent synchronisiert.
- Phase-6 Plan 6-HF12 ist als priorisierte execute-ready P0-Welle vor Plan 6-3 gesetzt.
- Plan-6-HF12 execution: running projection now exposes exactly one `CLUSTER` controller row per cluster trigger without member-`ROOM` duplicates in the running list.
- Plan-6-HF12 execution: deduped cluster controller keeps full-member runtime fanout deterministic (sync + stagger), including controller-first snapshot fallback rendering.
- Plan-6-HF12 execution: cluster stop/edit propagation resolves members via merged `memberAnimationIds` + `parentClusterRunId` linkage; room-target flow remains non-regressed (`P6-T86-ROOM-TARGET-REGRESSION.md`).
- Plan-6-HF12 execution: combined regression matrix is PASS in `P6-T87-REGRESSION.md`; Plan 6-3 remains unblocked.
- Neues verpflichtendes Feedback nach Realtest setzt Phase-7-Fokus: Multi-Device-Sync muss fuer spuerbar low-latency first-click Verhalten umfassend umgebaut werden.
- Architektur-Regel fuer Phase 7: Event-Pipeline wird auf deterministisches `ingest -> order -> commit -> fanout -> apply` mit `mutationId`/Version/Ack/Dedup umgestellt.
- Prioritaets-Regel fuer Phase 7: `stop/toggle-off/clear-all` erhalten preemptiven Kontrollpfad ohne visual/audio Restartefakte.
- Final-Output-Regel fuer Phase 7: `/output/final` ist priorisierter low-latency apply/render/audio Pfad mit minimalem UI-overhead.
- Messbarkeits-Regel fuer Phase 7: E2E-Telemetrie und Latenz-SLOs (P50/P95/P99) sind verbindliche Abnahmebasis.
- Non-Regression-Regel fuer Phase 7: room/cluster, align-mode, audio-role-routing und persistence bleiben verpflichtend stabil.
- Phase-7 Plan 7-1 ist als erste execute-ready Welle gesetzt.
- Neues verpflichtendes Feedback fuer Phase 7 setzt Plan 7-HF3 als priorisierte P0-Welle: globale Trigger koennen client-inkonsistent zu kurz laufen, Audio ist sporadisch/verspaetet inkonsistent, Cluster-Stagger braucht deterministischen Offset statt Zufallsversatz.
- Snapshot-Trigger-Regel fuer Phase 7 (Plan 7-HF3): Trigger im Snapshot startet globale Effekte auf allen Clients genau einmal pro Trigger-Revision und laeuft vollstaendig.
- Stop-Regel fuer Phase 7 (Plan 7-HF3): vorzeitiger Abbruch globaler Effekte ist nur mit explizitem Snapshot-Stop zulaessig.
- Audio-Regel fuer Phase 7 (Plan 7-HF3): Audio folgt derselben Trigger-Revision wie Visuals, mit strict stale-drop gegen Alt-Effekt-Nachlauf.
- Stagger-Regel fuer Phase 7 (Plan 7-HF3): Cluster-Member starten sequenziell mit konfigurierbarem Offset-Slider (ms), repliziert ueber Command/Snapshot.
- Plan-7-HF3 execution: Server vergibt trigger-/stop-revisions pro globalem Trigger-Key (`runtime.globalTriggerRevisions`, `runtime.globalStopRevisions`) als snapshotautoritatives Lifecycle-Signal.
- Plan-7-HF3 execution: Client-Apply nutzt once-per-revision replay + stale-reapply-drop fuer globale Trigger und revision-aware Audio-Idempotenz (kein stale replay).
- Plan-7-HF3 execution: Cluster-Stagger ist deterministisch sequenziell (`index * staggerOffsetMs`), Sliderwert wird ueber `runtime.roomDraft` repliziert und in Cluster-Runtime-Metadaten gespiegelt.
- Neues verpflichtendes Feedback fuer Phase 7 ist gesetzt (nach HF3): Start einer room/cluster Animation mutiert unerlaubt Draft-Felder (`target` springt auf `cluster`, `animation` springt auf erstes Element) und bricht Serienstarts mit gleichen Einstellungen.
- Draft-Invarianten-Regel fuer Phase 7 (Plan 7-HF4): Start-Operationen sind strikt draft-immutable; Dropdowns (`animation`, `target`) und Slider bleiben nach Start unveraendert.
- Klick-Regel fuer Phase 7 (Plan 7-HF4): Board-Raumklick darf weiterhin ausschliesslich `target` auto auf den geklickten Raum setzen; Start selbst aendert keine Draft-Felder.
- Scope-Regel fuer Phase 7 (Plan 7-HF4): Verhalten bleibt stabil fuer `targetType=room` und `targetType=cluster`.
- Artefakt-Regel fuer Phase 7 (Plan 7-HF4): PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE werden im selben Schritt konsistent synchronisiert.
- Neues verpflichtendes Feedback fuer Phase 7 ist gesetzt (nach HF4): Align-Mode sync driftet zwischen Clients und Board-Wechsel laesst Running-Reste vom alten Board stehen.
- Align-Regel fuer Phase 7 (Plan 7-HF5): Align-Mode ist serverautoritiver Shared-State und wird nur ueber Command->Snapshot-Versionen auf alle Clients inkl. `/output/final` repliziert.
- Board-Switch-Regel fuer Phase 7 (Plan 7-HF5): Kontextwechsel leert Running atomar und deterministisch; boardfremde Running-Eintraege duerfen nicht rehydrieren.
- Artefakt-Regel fuer Phase 7 (Plan 7-HF5): PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE werden im selben Schritt konsistent synchronisiert.
- Plan-7-HF5 execution: align toggle is now a server-authoritative `context-update` command with ack/version/dedup and snapshot-only apply (no local optimistic align state).
- Plan-7-HF5 execution: align snapshot apply parity now includes `/output/final`; stale/equal-version payloads are rejected deterministically in polling and reconnect replay.
- Plan-7-HF5 execution: board-switch context update clears running atomically server-side and client snapshot apply blocks old-board running residue rehydration.
- Plan-7-HF5 execution: HF5 regression and evidence PASS (`debug/p7-hf5-t12-output.json`, `debug/p7-hf5-t13-output.json`, `debug/p7-hf5-t14-output.json`); Plan 7-2 is unblocked.
- Plan-7-HF6 execution: board-switch now commits as authoritative atomic context transaction with idempotent `contextSwitchTransactionId` guard and deterministic running clear.
- Plan-7-HF6 execution: server snapshot commit path sanitizes running entries by selected board before persist/broadcast; cross-board residue is no longer serializable.
- Plan-7-HF6 execution: reconnect/join apply hard-filters running by board context; deterministic regression/evidence confirms `crossBoardResidueCount = 0` across 4 clients incl. `/output/final` (`debug/p7-hf6-*`).

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

## Execution Results (Phase 2 Plan 2)
- Status: completed
- Summary: `.planning/phases/phase-02/2-2-SUMMARY.md`
- Task Commits: 5 atomare Commits (`add84bb`, `94a61fd`, `6b97253`, `3964df8`, `4c8cca3`)
- Evidence:
  - `.planning/phases/phase-02/P2-T30-DESKTOP-PARITAET.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)

## Execution Results (Phase 2 Plan 3)
- Status: completed
- Summary: `.planning/phases/phase-02/2-3-SUMMARY.md`
- Task Commits: 5 atomare Commits (`324bce2`, `c0e4c46`, `703c371`, `eeb68a6`, `befb9da`)
- Evidence:
  - `.planning/phases/phase-02/P2-T35-NAV-AND-PROJECTION-VERIFIKATION.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)

## Execution Results (Phase 2 Plan 4)
- Status: completed
- Summary: `.planning/phases/phase-02/2-4-SUMMARY.md`
- Task Commits: 5 atomare Commits (`5110c2f`, `47d5867`, `4d25bb6`, `b6aefb7`, `ad06399`)
- Evidence:
  - `.planning/phases/phase-02/P2-T40-MOBILE-NO-OVERLAY-VERIFIKATION.md`
  - `debug/screenshot_debug.jpg` (Vorher-Referenz)
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 2 Plan 5)
- Status: completed
- Summary: `.planning/phases/phase-02/2-5-SUMMARY.md`
- Task Commits: 7 atomare Commits (`9cf5083`, `a64c45b`, `b7c8e25`, `3b2f6c6`, `dc8456a`, `fc150fb`, `543e11c`)
- Evidence:
  - `.planning/phases/phase-02/2-VERIFICATION.md` (Follow-up: 6/6 must-haves verified)
  - `.planning/phases/phase-02/P2-T43-ZONEN-NEGATIVTESTS.md`
  - `.planning/phases/phase-02/P2-T47-EXIT-GATE.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)

## Execution Results (Phase 3 Plan 1)
- Status: completed
- Summary: `.planning/phases/phase-03/3-1-SUMMARY.md`
- Task Commits: 12 atomare Commits (`4e959aa`, `2272d2b`, `6b4f96b`, `4ccc445`, `105e5d2`, `c63e07f`, `8f42c2f`, `7ce0b9d`, `90956dc`, `2a0e6f3`, `f563afe`, `364c4a6`)
- Evidence:
  - `.planning/phases/phase-03/3-1-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)

## Execution Results (Phase 3 Plan 2)
- Status: completed
- Summary: `.planning/phases/phase-03/3-2-SUMMARY.md`
- Task Commits: 13 atomare Commits (`87c8b0e`, `1eec785`, `0e27d86`, `0b933d2`, `66924cf`, `735e1b2`, `a257923`, `d85028a`, `74c5485`, `3bc2e3e`, `a3c222a`, `a5a3019`, `42da20b`)
- Evidence:
  - `.planning/phases/phase-03/3-2-VERIFICATION.md`
  - `.planning/phases/phase-03/P3-T23-REGRESSION.md`
  - `.planning/phases/phase-03/P3-T24-SOAK.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)

## Execution Results (Phase 3 Plan 3)
- Status: completed
- Summary: `.planning/phases/phase-03/3-3-SUMMARY.md`
- Task Commits: 6 atomare Commits (`ed34cd3`, `772ae75`, `9888c46`, `578c367`, `b06f498`, `998dada`)
- Evidence:
  - `.planning/phases/phase-03/3-3-VERIFICATION.md`
  - `.planning/phases/phase-03/P3-T29-REGRESSION.md`
  - `.planning/phases/phase-03/P3-T30-SOAK.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)

## Execution Results (Phase 3 Plan 4)
- Status: completed
- Summary: `.planning/phases/phase-03/3-4-SUMMARY.md`
- Task Commits: 6 atomare Commits (`807de04`, `e2b08da`, `ce12e43`, `cd62c92`, `3e5cde9`, `da1b9f5`)
- Evidence:
  - `.planning/phases/phase-03/3-4-VERIFICATION.md`
  - `.planning/phases/phase-03/P3-T35-REGRESSION.md`
  - `.planning/phases/phase-03/P3-T36-BROWSER-MATRIX-SOAK.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)

## Execution Results (Phase 4 Plan 1)
- Status: completed
- Summary: `.planning/phases/phase-04/4-1-SUMMARY.md`
- Task Commits: 7 atomare Commits (`c8a36be`, `3bc677b`, `f822097`, `bf889dd`, `480b5d3`, `6186e3c`, `8ad1af8`)
- Evidence:
  - `.planning/phases/phase-04/P4-T7-SMOKE-REGRESSION.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `GET /api/health=200`, `OPTIONS /api/global-defaults=204`, `POST/GET /api/global-defaults=200` (Port 4199)

## Execution Results (Phase 4 Plan 3)
- Status: completed
- Summary: `.planning/phases/phase-04/4-3-SUMMARY.md`
- Task Commits: 5 atomare Commits (`dbe1704`, `ef97862`, `269c770`, `0d88d8e`, `c8ad4b1`)
- Evidence:
  - `.planning/phases/phase-04/P4-T21-HOTFIX-REGRESSION.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check src/app/state/runtime-state.js` (State Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)

## Execution Results (Phase 4 Plan 4)
- Status: completed
- Summary: `.planning/phases/phase-04/4-4-SUMMARY.md`
- Task Commits: 5 atomare Commits (`8cc1841`, `fec3884`, `5182609`, `6c1d025`, `1efbf52`)
- Evidence:
  - `.planning/phases/phase-04/P4-T32-HOTFIX-REGRESSION.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check src/app/state/runtime-state.js` (State Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)

## Execution Results (Phase 4 Plan 5)
- Status: completed
- Summary: `.planning/phases/phase-04/4-5-SUMMARY.md`
- Task Commits: 6 atomare Commits (`f04c09f`, `8e09d7e`, `4fc2308`, `a597c66`, `482a313`, `09e01a9`)
- Evidence:
  - `.planning/phases/phase-04/P4-T38-HOTFIX-REGRESSION.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check src/app/state/runtime-state.js` (State Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)

## Execution Results (Phase 4 Plan 5b)
- Status: completed
- Summary: `.planning/phases/phase-04/4-5b-SUMMARY.md`
- Task Commits: 3 atomare Commits (`4382929`, `9be9c36`, `55e374e`)
- Evidence:
  - `.planning/phases/phase-04/P4-T41-HOTFIX-REGRESSION.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - Static Nachweis: Persist-on-change Hook fuer `audio.enabled`, `audio.volume`, `animationSoundMap` + persistierte Mapping-Normalisierung (`src/app.js`)

## Execution Results (Phase 5 Plan 1)
- Status: completed
- Summary: `.planning/phases/phase-05/5-1-SUMMARY.md`
- Task Commits: 16 atomare Commits (`cbc8d1e` .. `ad02f93`, inkl. Hotfix `63ce2ee`)
- Evidence:
  - `.planning/phases/phase-05/P5-T12-AUDIO-LIFECYCLE.md`
  - `.planning/phases/phase-05/P5-T15-REGRESSION.md`
  - Endpoint Smoke: `FINAL=200 LIVE=200 HEALTH=200`
  - WebSocket Sync: `WS_SYNC=ok`, `SYNC_3C=ok receivers=2`

## Execution Results (Phase 5 Plan HF1)
- Status: completed
- Summary: `.planning/phases/phase-05/5-HF1-SUMMARY.md`
- Task Commits: 6 atomare Commits (`5d3caa3`, `494a805`, `e690a27`, `3d0d276`, `11eabe0`, `1e41e7a`)
- Evidence:
  - `.planning/phases/phase-05/P5-T24-HOTFIX-REGRESSION.md`
  - `node debug/p5-t24-outside-join-regression.mjs` => `OUTSIDE_JOIN_SYNC=PASS`
  - `node debug/p5-t24-final-output-contract-check.mjs` => `FINAL_CONTRACT=PASS`

## Execution Results (Phase 5 Plan HF2)
- Status: completed
- Summary: `.planning/phases/phase-05/5-HF2-SUMMARY.md`
- Task Commits: 7 atomare Commits (`fbcfce4`, `0b71203`, `a7b1925`, `31cafdc`, `41cb473`, `1df1d66`, `e4267c1`)
- Evidence:
  - `.planning/phases/phase-05/P5-T25-ROOT-CAUSE.md`
  - `.planning/phases/phase-05/P5-T31-SYNC-RELIABILITY-VERIFICATION.md`
  - `node debug/p5-t30-single-click-sync-regression.mjs` => `P5_T30_SINGLE_CLICK_SYNC_GUARDS=PASS`

## Execution Results (Phase 5 Plan HF3)
- Status: completed
- Summary: `.planning/phases/phase-05/5-HF3-SUMMARY.md`
- Task Commits: 5 atomare Commits (`e3eab15`, `9d1cb44`, `5918370`, `bba951d`, `8781189`)
- Evidence:
  - `.planning/phases/phase-05/P5-T36-CONTEXT-PARITY-VERIFICATION.md`
  - `node debug/p5-t36-context-parity-regression.mjs` => `P5_T36_CONTEXT_PARITY_GUARDS=PASS`

## Execution Results (Phase 6 Plan HF8)
- Status: completed
- Summary: `.planning/phases/phase-06/6-HF8-SUMMARY.md`
- Task Commits: 6 atomare Commits (`f24f0c8`, `3af979c`, `884c308`, `e1d8c41`, `1150c47`, `47878f4`)
- Evidence:
  - `.planning/phases/phase-06/P6-T66-REGRESSION.md`
  - `node --check src/app.js` => PASS
  - `node --check src/app/state/runtime-state.js` => PASS

## Decision Log Addendum (HF8)
- Room/vertex/edge selection darf `roomDraft.targetType/targetId` nicht implizit ueberschreiben; Target-Auswahl bleibt operator-owned.
- Cluster-Startmodus `stagger start` ist cluster-only mit kurzem randomisiertem Versatz; `off` bleibt deterministisch synchron.

## Execution Results (Phase 7 Plan HF2)
- Status: completed
- Summary: `.planning/phases/phase-07/7-HF2-SUMMARY.md`
- Task Commits: 3 commits (`162b589`, `3443bf1`, `d4991f2`)
- Evidence:
  - `debug/p7-hf2-t12-output.json`
  - `debug/p7-hf2-t13-output.json`
  - `debug/p7-hf2-t14-output.json`

## Decision Log Addendum (HF2)
- Korrektheitspfad ist serverautoritatives Snapshot-Polling; WebSocket bleibt optionaler `state-dirty`-Wakeup-Hint.
- Control-Clients senden Mutationen write-only an den Server und zeigen Pending, bis die entsprechende Snapshot-Version sichtbar angewendet wurde.

## Execution Results (Phase 7 Plan HF4)
- Status: completed
- Summary: `.planning/phases/phase-07/7-HF4-SUMMARY.md`
- Task Commits: 7 atomare Commits (`bd3bcf4`, `24e8186`, `3ce8487`, `748d5a9`, `9d176e7`, `d64ba6e`, `35218e9`)
- Evidence:
  - `debug/p7-hf4-t12-output.json`
  - `debug/p7-hf4-t13-output.json`
  - `debug/p7-hf4-t14-output.json`

## Decision Log Addendum (HF4)
- Start-Operationen fuer room/cluster sind draft-immutable; Draft-UI-Felder (`animation`, `target`, Slider) duerfen durch Start nicht mutieren.
- Snapshot-Polling schreibt `runtime.roomDraft` auf Control-Clients nicht mehr in lokale Draft-Controls zurueck.
- Room-Klick bleibt der einzige Auto-Pfad fuer Target-Autofill (`targetType=room`, `targetId=<clickedRoomId>`).

## Execution Results (Phase 7 Plan HF5)
- Status: completed
- Summary: `.planning/phases/phase-07/7-HF5-SUMMARY.md`
- Task Commits: 7 atomare Commits (`0a80369`, `b2cdc5e`, `e295609`, `5bdd733`, `db7b7a4`, `d39a6ae`, `2308c03`)
- Evidence:
  - `debug/p7-hf5-t12-output.json`
  - `debug/p7-hf5-t13-output.json`
  - `debug/p7-hf5-t14-output.json`

## Decision Log Addendum (HF5 follow-up)
- verify-work 7-HF5 Follow-up oeffnet zwei verbleibende P0-Blocker: nicht-deterministischer board-switch clear in Randfaellen und reconnect cross-board residue rehydrate.
- Naechste verpflichtende Welle ist Plan 7-HF6 (Board-Context Residue Elimination), bevor Plan 7-2 gestartet werden darf.
- Verbindliche HF6-Invariante: `switch -> reconnect` darf auf keinem Client boardfremde Running-Eintraege rehydrieren (`crossBoardResidueCount = 0`).
