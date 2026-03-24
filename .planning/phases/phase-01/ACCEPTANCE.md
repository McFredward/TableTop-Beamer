# Phase 1 Acceptance

## Testplan
- Smoke-Test: Board wechseln, kalibrieren, alle Trigger einmal ausloesen.
- Safety-Test: `Clear All` waehrend gleichzeitig laufender Effekte.
- Performance-Test: mindestens 30 Minuten Dauerbetrieb ohne visuelle Artefakte.
- Table-Check: Lesbarkeit auf realem Tisch bei variierender Helligkeit.
- Priority-Test P0: Power Outage unter Last triggern, Startlatenz und sichtbare Outage-Wirkung pruefen.
- Priority-Test P0b: Hex-Hitareas (board-spezifisch) muessen auf realen Raeumen deckungsgleich liegen (beide Boards, Rand/Mitte).
- Priority-Test P1a: Special-Room Mapping fuer Cockpit/Cryoschlaf/Maschinenraum 1-3 auf beiden Boards pruefen.
- Priority-Test P1b: Raum-Submenu (Auswahl, Intensitaet, Dauer/Hold) und Running-List Stop/Edit pruefen.
- Priority-Test P1c: Event-Sounds (Intruder/Reactor/Outage) inkl. Audio-Master an/aus und Lautstaerke-Regler pruefen.
- Priority-Test P0c: Hitarea-Calibration-Settings (Slider fuer X/Y/Scale) pruefen; Werte pro Board speichern, wechseln, erneut laden.
- Priority-Test P0d: Spezialraum-Animation starten und gegen Running-List spiegeln; kein Eintrag ohne sichtbares Rendering.
- Priority-Test P0e: Triggerfolge `Spezialraum + Alarm Beacon` unter Last pruefen; visueller Timer und andere Animationen laufen stabil weiter.
- Priority-Test P0f: Raumindividuelle Kalibrierung pruefen (Position pro Raum relativ/absolut); Distanzkorrektur zwischen mindestens zwei Raeumen sichtbar nachweisen.
- Priority-Test P0g: Unabhaengiges Stretching pro Raum pruefen (`stretchX` != `stretchY`); Hit-Test und Clip muessen deckungsgleich bleiben.
- Priority-Test P0h: Haupt-Dashboard darf keine Kalibrier-/Shape-Editoren enthalten; Bearbeitung ausschliesslich in separater Settings-Seite.
- Priority-Test P0i: Spezialraum-Polygoneditor pruefen (Ecke einfuegen, Ecke loeschen, Ecke frei verschieben) und freie Polygonform speichern/wiederladen.
- Priority-Test P0j: Tab-Switch `Dashboard` <-> `Settings` pruefen; Views muessen gegenseitig exklusiv sichtbar sein (kein Overlay-Leak von Dashboard- oder Editor-Elementen).
- Priority-Test P0k: Polygoneditor-Handles pruefen; jeder Vertex klar sichtbar, aktive Ecke deutlich hervorgehoben, Drag frei und stabil.
- Priority-Test P0l: Vertex-Loeschen + Vertex-Einfuegen an Kante pruefen; Polygon bleibt gueltig und direkt trigger-/clip-faehig.
- Priority-Test P0m: Persistenz-Rueckwaertskompatibilitaet pruefen; bestehende kalibrierte Raumdaten aus altem Profil laden, bearbeiten, speichern und nach Neustart unveraendert nutzen.
- Priority-Test P0n: Tab-Exklusivitaet hart pruefen; `Dashboard` zeigt nur Trigger/Animation, `Settings` nur Geometrie/Polygon/Kalibrierung (kein einzelnes Rest-Element sichtbar).
- Priority-Test P0o: Handle-Transparenz pruefen; Vertex-Bubbles sind deutlich weniger dominant, bleiben aber auf Desktop und Touch sicher selektierbar.
- Priority-Test P0p: Spezialraum-Animation in grossen Polygonen pruefen; Render fuellt die volle Polygonflaeche ohne kleine Insel.
- Priority-Test P0q: Bestehende Spezialraum-Polygone gegen Persistenzverlust pruefen (Save/Reload/App-Neustart/Boardwechsel).
- Priority-Test P0r: Tab-Leak-Regression pruefen; in `Dashboard` sind ausschliesslich Animations-/Trigger-Controls sichtbar, in `Settings` ausschliesslich Geometrie/Polygon/Kalibrierung.
- Priority-Test P0s: Layout-Scroll pruefen; Board bleibt fixiert/sticky sichtbar, nur der rechte Steuerbereich scrollt vertikal.
- Priority-Test P0t: Running-Animations-Uebersicht pruefen; aktive Animationen sind als separater, klar sichtbarer Abschnitt priorisiert und voll bedienbar.
- Priority-Test P0u: Settings-Board-Zoom pruefen; Polygonpunkte sind auch bei hoher Zoomstufe praezise selektier-/verschiebbar, inkl. Fit/Reset.
- Priority-Test P0v: Spezialraum-Klick-Sync pruefen; Klick auf Spezialraum waehlt denselben Eintrag direkt im Polygon-Editor-Dropdown.
- Priority-Test P0w: Dashboard-Sticky pruefen; Block `Aktive Animationen` bleibt beim Scrollen sichtbar und Stop/Edit bleibt ohne Zurueckscrollen nutzbar.
- Priority-Test P0x: Settings-Pan pruefen; bei Zoom > 100% verschiebt `Space + Drag` (optional mittlere Maustaste) die Board-Ansicht reproduzierbar ohne Geometrieaenderung.
- Priority-Test P0y: Pan-vs-Edit-Arbitration pruefen; mit `Space` startet ausschliesslich Pan, ohne `Space` bleiben Room-/Vertex-Interaktionen unveraendert aktiv.
- Priority-Test P0z: Zoom+Pan+Edit-Roundtrip pruefen; nach Pan und Fit/Reset liegen Vertex-Positionen, Room-Klick und Insert/Delete weiterhin korrekt und stabil.
- Priority-Test P0aa: Event-Sounds nutzen vorhandene Assets aus `resources/nemesis/sounds/` (kein rein synthetischer Pfad fuer Intruder/Reactor/Power Outage); Mapping ist in der Session nachvollziehbar.
- Priority-Test P0ab: Audio-Master/Volume wirken weiterhin auf assetbasierte Sounds (Master `off` = stumm; Volume-Staffelung klar hoerbar).
- Priority-Test P0ac: Globaler Outside-Effekt ist schaltbar und rendert nur ausserhalb des Ship-Polygons (kein Effekt innerhalb der Schiffsmaske).
- Priority-Test P0ad: Ship-Polygon ist im Settings-Tab editierbar (Insert/Delete/Drag) und aktualisiert die Outside-Maske live.
- Priority-Test P0ae: Sounddauer ist an Animationsdauer gekoppelt; Sound startet mit der Animation, loopt bei Bedarf und stoppt sofort bei Ablauf/Stop/`Clear All`.
- Priority-Test P0af: Pro Animation ist das Sound-Mapping in der UI editierbar; neue Zuordnung greift sofort fuer neu gestartete Animationen.
- Priority-Test P0ag: `Dashboard` zeigt ausschliesslich Live-Bedienung (Animation triggern/stoppen); es sind keine Settings-, Mapping-, Calibration- oder Editor-Controls sichtbar.
- Priority-Test P0ah: `Settings` enthaelt saemtliche Konfigurationen exklusiv; beim Wechsel ins Dashboard bleibt kein Konfigurations-Control sichtbar.
- Priority-Test P0ai: Globale Animationen sind klar in `Innerhalb des Schiffs` und `Ausserhalb des Schiffs` getrennt (UI, Running-Liste, Start/Stop).
- Priority-Test P0aj: Outside-Immersion vermittelt hohe Fluggeschwindigkeit (mehrlagige Sterne/Parallax, tiefer Raumfluss) und bleibt ueber laengere Laufzeit stabil.
- Priority-Test P0ak: Outside-Layer beeinflusst Innenraum nicht: kein Maskenleck, keine Veraenderung an Innenraum-Animationen, keine Stop/Edit-Nebenwirkung bei Parallelbetrieb.
- Priority-Test P0al: Inside-Animationen sind strikt auf das Ship-Polygon geclippt; ausserhalb der Schiffsmaske ist kein Inside-Pixel sichtbar.
- Priority-Test P0am: Outside-Animationen sind strikt invers geclippt; innerhalb des Ship-Polygons ist kein Outside-Pixel sichtbar.
- Priority-Test P0an: Outside-Visual zeigt High-Speed-Spaceflow mit mehreren Tiefenebenen und klar unterscheidbaren Geschwindigkeiten.
- Priority-Test P0ao: Outside-Visual zeigt deutliche Motion-Streaks/Striche mit Vorbeiflug-Eindruck, ohne Glitzercharakter.
- Priority-Test P0ap: `Settings`-Button `Speichern` schreibt den aktuellen Browserzustand in eine globale Default-Config (server/Repo) und meldet den Status reproduzierbar.
- Priority-Test P0aq: Save-Export uebernimmt bestehende lokale Polygondaten vollstaendig (Ship + Spezialraeume) ohne Datenverlust nach Reload/Restart.
- Priority-Test P0ar: Outside-Richtung ist in der UI zwischen `forward` und `reverse` umschaltbar; Sternen-/Streak-Bewegung kehrt sichtbar um, ohne Layer-Ausfall.
- Priority-Test P0as: Outside-Hintergrund bleibt tiefschwarz; es gibt keine blaue Flaechenfaerbung, sichtbar sind nur Sterne/Streaks.
- Priority-Test P0at: Pro laufender Room-Animation sind `Speed`, `Intensity` und `Sound Volume` separat einstellbar und wirken auf genau diese Instanz.
- Priority-Test P0au: Running-Edit laedt existierende Instanzwerte und speichert Aenderungen in-place auf dieselbe `animation.id` (kein zusaetzlicher Running-Eintrag).
- Priority-Test P0av: Der bisherige P0-Bug `Edit` inaktiv/funktionslos ist behoben; Room-Eintraege bleiben durchgehend editierbar.
- Priority-Test P0aw: `Settings`-Save auf POST-faehigem Node-Server funktioniert reproduzierbar ohne `501 Unsupported method POST`.
- Priority-Test P0ax: Bei statischem Server ohne API zeigt Save eine kurze Klartextmeldung mit konkreter Startanweisung (kein HTML-Errordump).
- Priority-Test P0ay: Startdoku beschreibt eindeutig, dass fuer POST ein API-Server noetig ist (`node server.mjs`); statischer Server allein ist explizit als unzureichend markiert.
- Priority-Test P0az: Optionaler Export-/Download-Fallback ist bei API-Ausfall verfuegbar, bleibt klar sekundaer und ersetzt nicht den primaeren Server-Save.
- Priority-Test P0ba: Save zeigt den konkret verwendeten API-Endpunkt (inkl. Port) und die Methode an; Fehlgrund ist endpoint-bezogen nachvollziehbar.
- Priority-Test P0bb: API-Base-Konfiguration + Port-Fallback funktionieren im statischen Frontend-Hosting reproduzierbar (kein stilles Routing auf nicht-POST-faehige Hosts).
- Priority-Test P0bc: One-Click `API Diagnose` prueft Erreichbarkeit und POST-Faehigkeit und liefert pro Check klare naechste Schritte.
- Priority-Test P0bd: Bei laufendem API-Server ist `Speichern` in mindestens 5 aufeinanderfolgenden Versuchen erfolgreich (inkl. Reload/Restart-Roundtrip).
- Priority-Test P0be: Bei UI-Aufruf ueber LAN-IP (`http://192.168.x.x:4173`) nutzt Save als Default den UI-Host als API-Host und faellt nicht auf Client-`localhost` zurueck.
- Priority-Test P0bf: Expliziter API-Override bleibt wirksam; Save/Diagnose zeigen Quelle des Overrides und den final verwendeten Host transparent an.
- Priority-Test P0bg: Save- und Diagnose-Meldungen zeigen explizit `UI-Host` und `API-Host`; bei Remote-Mismatch enthalten sie konkrete LAN-Hinweise.
- Priority-Test P0bh: LAN-Repro besteht aus mindestens 5 erfolgreichen Saves von einem zweiten Geraet im LAN plus Reload/Restart ohne Host-Drift.
- Priority-Test P1f: Allgemeiner Speed-Regler aendert die Animationsgeschwindigkeit live, ohne Laufzeitliste, Stop/Edit oder Clip-Verhalten zu brechen.
- Priority-Test P1g: Outside-Alternativanimation ist per UI-Option umschaltbar und bleibt strikt auf die Outside-Maske begrenzt.
- Priority-Test P1e: Ship-Polygon + Outside-Effekt-Settings sind pro Board persistent (Save/Reload/Restart/Boardwechsel ohne Vermischung).
- Priority-Test P1d: Board-spezifische Persistenz fuer komplette Geometrie-/Shape-Profile nach Board-Wechsel und App-Neustart validieren.
- Priority-Test P2: Output-Route Wechsel inkl. Fullscreen-Fallback ohne Neustart pruefen.

## Manueller Verifikationsfokus (Pflicht)
- Hitarea-Passung: pro Board mindestens 10 Klicks (inkl. Randraeume + Special-Raeume), Soll/Ist als Trefferquote protokollieren.
- Special-Room Lage: Cockpit links, Cryoschlaf Mitte, Maschinenraum 1-3 rechts jeweils visuell gegen Realboard bestaetigen.
- Audio-Trigger: jeden Event-Trigger dreimal ausloesen; Start wahrnehmbar, kein falscher Sound.
- Audio-Settings: Master auf `off` -> keine Sounds; Master auf `on` + Volume 25/50/100 -> deutlich unterschiedliche Lautheit.
- Safety unter Audio-Last: waehrend Event-Sounds und laufender Effekte `Clear All` pruefen; visuelle Stops bleiben deterministisch.
- Kombi-Stabilitaet: `Spezialraum + Alarm Beacon` mehrfach triggern (inkl. waehrend Audio laeuft); kein kompletter Visual-Ausfall.
- Raumgeometrie-Check: mindestens 3 Raeume pro Board jeweils im Modus `relativ` und `absolut` justieren; Soll/Ist-Distanzen protokollieren.
- Stretch-Check: pro Board mindestens 2 Raeume mit unterschiedlichem `stretchX`/`stretchY` pruefen; Klickflaeche und Rendergrenze vergleichen.
- Polygon-Editor-Check: pro Spezialraum mindestens eine Ecke einfuegen, eine loeschen, eine verschieben und danach reload-stabil bestaetigen.
- View-Switch-Check: mindestens zehn Wechsel zwischen `Dashboard` und `Settings`; kein gleichzeitiges Sichtbarsein beider Arbeitsbereiche.
- Handle-UX-Check: pro Spezialraum alle Vertex-Handles sichtbar bestaetigen, aktive Ecke eindeutig markieren, Drag auf Desktop und kleinem Display pruefen.
- Legacy-Persistenz-Check: vorhandenes Altprofil importieren/laden, danach Save + App-Neustart; Raumdaten muessen identisch weiter nutzbar sein.
- Tab-Exklusivitaets-Check: in mindestens zehn Wechseln sicherstellen, dass je Tab nur die freigegebenen Bediengruppen sichtbar sind.
- Handle-Transparenz-Check: Lesbarkeit des Boardmotivs hinter Handles pruefen, ohne Trefferverlust bei Selektion/Drag.
- Vollflaechen-Render-Check: mindestens zwei grosse Spezialraum-Polygone triggern; Animation muss die gesamte Flaeche ausnutzen.
- Polygon-Persistenz-Check: bestehende Polygone in beiden Boards laden, nicht veraendern, speichern, reloaden und nach Neustart unveraendert vergleichen.
- Tab-Leak-Check: mindestens zehn Tabwechsel plus Resize (Desktop/Small-Screen); keine fremde Bediengruppe je Tab sichtbar.
- Fixed-Board-Scroll-Check: beim Scrollen des rechten Control-Bereichs bleibt das Board dauerhaft im Sichtbereich ohne Seitensprung.
- Running-Zone-Check: aktive Animationen sind im separaten Abschnitt sofort sichtbar; Stop/Edit ist mit maximal einem Scroll erreichbar.
- Zoom-Precision-Check: pro Board mindestens zwei Spezialraeume bei >150% Zoom editieren (Move + Insert/Delete) und auf korrekte Punktposition nach Zoom-Reset pruefen.
- Special-Room-Sync-Check: alle 5 Spezialraeume per Board-Klick durchgehen; Dropdown und Board-Highlight muessen 1:1 synchron bleiben.
- Sticky-Running-Check: waehrend tiefem Dashboard-Scroll bleibt `Aktive Animationen` sichtbar; Stop/Edit wird ohne Ruecksprung erfolgreich ausgefuehrt.
- Zoom-Pan-Check: pro Board bei >150% Zoom mindestens drei Pan-Verschiebungen mit `Space + Drag` durchfuehren; optional mittlere Maustaste gegentesten.
- Pan-Mode-Check: waehrend gedrueckter `Space`-Taste startet kein Vertex-/Room-Edit; nach Loslassen arbeitet Polygon-Edit sofort wieder normal.
- Pan-Regression-Check: nach Zoom+Pan je Spezialraum mindestens ein Vertex Move + ein Insert/Delete ausfuehren; Koordinaten und Selektion bleiben stabil.
- Asset-Audio-Check: Intruder/Reactor/Outage jeweils mindestens dreimal triggern; verwendete Datei pro Event pruefen und auf konsistente Zuordnung protokollieren.
- Outside-Mask-Check: Outside-Effekt ein/aus schalten und pruefen, dass Bewegung strikt ausserhalb des Ship-Polygons bleibt.
- Ship-Polygon-Editor-Check: Schiffspolygon pro Board editieren (mindestens ein Insert, ein Delete, ein Move) und Live-Maskenupdate bestaetigen.
- Ship-Outside-Persistenz-Check: Ship-Polygon + Outside-Setting auf Board A und B unterschiedlich setzen, speichern, reloaden, Neustart; beide Profile muessen getrennt reproduzierbar bleiben.
- Audio-Lifecycle-Check: mindestens drei Animationen mit Sound starten, Laufzeit variieren (kurz/lang), nahtlosen Loop bei langer Laufzeit bestaetigen; bei Stop/Ablauf/`Clear All` sofortige Stille pruefen.
- Sound-Mapping-Check: fuer mindestens drei Animationen Mapping in der UI aendern (`Asset A` -> `Asset B`/`none`) und korrekte Uebernahme bei neuem Trigger verifizieren.
- Speed-Regler-Check: globalen Speed-Faktor in mindestens drei Stufen pruefen; sichtbare Rendergeschwindigkeit muss sich live aendern ohne Stop/Edit-Regression.
- Outside-Modus-Check: zwischen Standard- und immersiver Outside-Animation waehrend laufender Session wechseln; kein Maskenleck und kein Ausfall anderer Effekte.
- Dashboard-Strictness-Check: mindestens zehn Tabwechsel + Resize pruefen; im Dashboard sind nur Trigger/Stop sichtbar, kein einziges Konfigurations- oder Editor-Element.
- Settings-Only-Config-Check: Mapping/Calibration/Editor/Outside-Parameter nur in Settings bedienen; Rueckwechsel zu Dashboard zeigt weiterhin ausschliesslich Runtime-Bedienung.
- Inside-Outside-Trennung-Check: mindestens drei globale Inside- und drei globale Outside-Animationen ausloesen; Kategorie muss in UI und Running-Liste pro Eintrag eindeutig bleiben.
- Outside-Immersion-Check: bei mindestens zwei Speed-Stufen den Eindruck von hohem Vorbeiflug pruefen (Parallax klar erkennbar, kontinuierlicher Raumfluss ohne sichtbare Brueche).
- Outside-Isolation-Check: waehrend paralleler Innenraum-Animationen Outside starten/stoppen; Innenraum darf weder visuell ueberlagert noch im Lifecycle beeinflusst werden.
- Clip-Boundary-Check: mindestens drei Inside- und drei Outside-Animationen parallel pruefen; Inside bleibt strikt im Ship-Polygon, Outside strikt ausserhalb (keine Grenzlecks).
- Streak-Depth-Check: Outside bei mindestens zwei Speed-Stufen pruefen; mehrere Tiefenebenen plus sichtbare Motion-Streaks muessen klar wahrnehmbar bleiben.
- Global-Save-Check: im Settings-Tab `Speichern` ausfuehren (`lokal -> globale Defaults`), Erfolg rueckmelden lassen und nach Reload/Restart denselben Stand reproduzieren.
- Polygon-Retention-Check: vor/nach globalem Save Ship- und Spezialraum-Polygone vergleichen; keine Vertices duerfen fehlen oder still ersetzt werden.
- API-Method-Check: Save auf vorgesehenem Node-Setup ausfuehren und bestaetigen, dass POST erfolgreich verarbeitet wird (kein `501 Unsupported method POST`).
- API-Offline-UX-Check: Save bei rein statischem Hosting ohne API triggern; UI zeigt kurze Handlungsanweisung mit konkretem Server-Startkommando statt HTML-Rohantwort.
- Start-Flow-Doku-Check: README/Startanleitung pruefen, dass POST-Anforderung und Startreihenfolge (API + Frontend) klar, kurz und konsistent beschrieben sind.
- Optional-Fallback-Check: bei API-Ausfall optionalen Export/Download pruefen; Hinweistext markiert ihn als Notfallpfad, Server-Save bleibt primaerer Weg.
- Endpoint-Transparenz-Check: Save-Erfolg/-Fehler zeigt finalen API-Endpunkt + Methode; angezeigter Endpoint muss mit realer Konfiguration/Request uebereinstimmen.
- API-Base-Fallback-Check: statisches Frontend mit mindestens zwei API-Port-Szenarien pruefen (ein falscher, ein korrekter Port); Diagnose und Save muessen den korrekten Endpunkt reproduzierbar nutzen oder klar ablehnen.
- Diagnose-One-Click-Check: `API Diagnose` fuehrt Health + POST-Check aus und zeigt fuer jede Fehllage konkrete Handlungsanweisung ohne Roh-HTML.
- Save-Repro-Check: bei korrekt laufendem API-Server 5x Save hintereinander plus Reload/Restart pruefen; kein intermittierender 4xx/5xx-Fehler.
- Remote-LAN-Default-Check: UI von zweitem Geraet via `http://192.168.x.x:4173` oeffnen und Save pruefen; genutzter API-Host muss dem UI-Host entsprechen, kein Client-`localhost`.
- Override-Precedence-Check: expliziten API-Override setzen und bestaetigen, dass Resolver diesen weiterhin priorisiert; Save-/Diagnose-Text nennt Override-Quelle und finalen Endpoint.
- Host-Transparenz-Check: Save-/Diagnose-Fehlertexte enthalten `UI-Host -> API-Host` und geben bei Mismatch konkrete Remote/LAN-Hinweise statt generischer Fehltexte.
- LAN-Save-Repro-Check: im LAN-Szenario mindestens 5x Save plus Reload/Restart durchfuehren; Endpoint-Auswahl bleibt stabil ohne Host-Drift.
- Outside-Direction-Check: waehrend laufendem Outside-Effekt zwischen `forward` und `reverse` wechseln; Bewegungsrichtung muss sofort sichtbar invertieren.
- Outside-Black-Base-Check: bei mehreren Intensity-/Speed-Stufen pruefen, dass der Outside-Hintergrund tiefschwarz bleibt und kein blauer Fill erscheint.
- Room-Instance-Param-Check: zwei gleichartige Room-Animationen parallel mit unterschiedlichen `Speed`/`Intensity`/`Sound Volume` starten; Werte duerfen sich nicht gegenseitig ueberschreiben.
- Edit-In-Place-Check: laufende Room-Animation per `Edit` laden, Parameter aendern und speichern; derselbe Running-Eintrag (`animation.id`) wird aktualisiert statt dupliziert.
- Edit-Bug-Regression-Check: `Edit` fuer Room-Eintraege in mindestens zehn Start/Stop/Edit-Zyklen pruefen; kein inaktiver oder funktionsloser Zustand.

## Definition of Done
- Stories aus `.planning/phases/phase-01/BACKLOG.md` sind inkl. Akzeptanzkriterien umgesetzt.
- `Clear All` arbeitet reproduzierbar auch unter Last.
- Globale und raumspezifische Animationen sind im UI und Laufzeitmodell klar getrennt.
- Raumanimationen rendern ausschliesslich innerhalb des gewaehlten Hex-Polygons.
- Hex-Hitareas treffen auf beiden Boards die realen Raumflaechen reproduzierbar.
- Die 5 Special-Raeume (Cockpit, Cryoschlaf, Maschinenraum 1-3) sind vorhanden und korrekt positioniert.
- Event-Sounds fuer Intruder/Reactor/Outage funktionieren und respektieren Audio-Master + Lautstaerke.
- Hitarea-Kalibrierung ist ueber Settings-Slider pro Board feinjustierbar und persistent gespeichert.
- Spezialraum-Animationen laufen sichtbar und bleiben mit Running-List-Zustand synchron.
- Kombination aus Spezialraum und `Alarm Beacon` bricht den visuellen Animationspfad nicht.
- Jeder Raum ist individuell kalibrierbar (Position relativ/absolut) und kann ohne Seiteneffekt auf andere Raeume verschoben werden.
- Breite und Hoehe sind pro Raum unabhaengig skalierbar; Hit-Test und Render-Clip bleiben synchron.
- Kalibrierung und Shape-Editing liegen ausschliesslich in einer separaten Settings-Seite, nicht im Trigger-Dashboard.
- Spezialraum-Polygone sind frei editierbar (Insert/Delete/Move) und als beliebige Form pro Board persistent gespeichert.
- `Settings` ist ein echter, exklusiver Tab/View-Switch gegenueber dem Trigger-Dashboard.
- Polygoneditor zeigt sichtbare Vertex-Handles mit klar markierter aktiver Ecke sowie stabilen Insert/Delete/Drag-Workflows.
- Bestehende kalibrierte Raumdaten bleiben trotz Profilschema-Weiterentwicklung rueckwaertskompatibel nutzbar.
- Je Tab gilt harte Sichtbarkeit: `Dashboard` nur Trigger/Runtime, `Settings` nur Geometrie/Polygon/Kalibrierung.
- Vertex-Handles sind deutlich transparenter, bleiben aber schnell auffindbar und selektierbar.
- Raumspezifische Animationen fuellen Spezialraum-Polygone flaechig aus, unabhaengig von Polygongroesse.
- Bereits gezeichnete Spezialraum-Polygone bleiben bei Save/Reload/Restart/Boardwechsel verlustfrei erhalten.
- Tab-Leak ist vollstaendig behoben: kein Dashboard-Element ist in `Settings` sichtbar und kein Settings-Element in `Dashboard`.
- Operator-Layout trennt Board und Controls sauber: Board bleibt fixiert, nur der rechte Steuerbereich scrollt.
- Aktive Animationen sind in einem separaten, klar priorisierten Uebersichtsbereich platziert.
- Settings bietet Board-Zoom fuer praezises Polygon-Editing; Handle-Interaktionen bleiben auch bei Zoom stabil.
- Settings erlaubt bei Zoom eine robuste Pan-Interaktion (`Space + Drag`, optional mittlere Maustaste), ohne Polygon-/Room-Editing zu beeintraechtigen.
- Spezialraum-Klick in Settings synchronisiert direkt die Polygon-Editor-Auswahl im Dropdown.
- Dashboard haelt den Block `Aktive Animationen` sticky sichtbar waehrend des Scrollens.
- Event-Sounds werden in Phase 1 ueber vorhandene Sound-Assets abgespielt; Mapping fuer Intruder/Reactor/Outage ist stabil und reproduzierbar.
- Audio-Master und Lautstaerke greifen weiterhin auf alle Event-Sounds trotz Asset-Umstellung.
- Soundwiedergabe ist an den Animations-Lifecycle gekoppelt (Start/Loop/Stop) und endet deterministisch mit der Animation.
- Sound-Mapping ist pro Animation in der UI editierbar und fuer neue Trigger sofort wirksam.
- Allgemeine Animations-Settings enthalten mindestens eine Geschwindigkeitssteuerung mit Live-Wirkung.
- Es gibt einen global schaltbaren Outside-Effekt, der ausschliesslich ausserhalb des Schiffes sichtbar ist.
- Outside bietet zusaetzlich eine immersive Alternativanimation, die per UI-Option toggelbar ist, ohne bestehende Outside-Logik zu brechen.
- `Dashboard` ist strikt runtime-fokussiert: nur Animationen triggern/stoppen; keine Settings-/Mapping-/Calibration-/Editor-Controls.
- Saemtliche Konfigurationsfunktionen sind exklusiv im `Settings`-Tab gebuendelt und leaken beim Tabwechsel nicht in das Dashboard.
- Globale Animationen sind fachlich getrennt in `Innerhalb des Schiffs` und `Ausserhalb des Schiffs` mit eindeutiger Kennzeichnung in UI und Running-Liste.
- Outside-Animationen vermitteln klaren High-Speed-Flug im Weltraum (Parallax/Tiefenfluss), ohne den Innenraum-Layer zu beeinflussen.
- Outside-Layer bleibt strikt ausserhalb der Ship-Maske isoliert und verursacht keine Nebenwirkung auf Innenraum-Trigger, Room-Renderer oder Lifecycle-Pfade.
- Inside-Layer bleibt strikt innerhalb der Ship-Maske isoliert und zeigt keine Visual-Leaks ausserhalb des Schiffs.
- Outside-Visual nutzt mehrere Tiefenebenen mit klar unterschiedlichen Geschwindigkeiten sowie deutlichen Motion-Streaks fuer Vorbeiflugwirkung.
- Das Schiff ist als eigenes editierbares Polygon im Settings-Tab vorhanden; Outside-Maske wird daraus live abgeleitet.
- Ship-Polygon und Outside-Effekt-Settings sind pro Board persistent und nach Reload/Restart unveraendert wiederhergestellt.
- Settings bietet einen expliziten `Speichern`-Button, der den aktuellen lokalen Browserstand als globale Default-Config server/Repo-seitig persistiert.
- Der Export `lokal -> globale Defaults` erhaelt bestehende Ship- und Spezialraum-Polygone verlustfrei.
- Der Save-Flow fuer globale Defaults funktioniert im vorgesehenen Node-Setup robust; `POST`-Fehler `501 Unsupported method` tritt nicht mehr auf.
- Bei fehlendem API-Server zeigt die UI eine kurze, konkrete Startanweisung statt HTML-Fehlerinhalt.
- Der Start-Flow ist dokumentiert: fuer POST ist ein API-Server erforderlich (z. B. `node server.mjs`), statischer Server allein reicht nicht.
- Ein optionaler Export-/Download-Fallback darf angeboten werden, bleibt aber klar sekundaer gegenueber dem primaeren Server-Save.
- Save-Feedback zeigt den genutzten API-Endpunkt transparent an und erklaert Fehler endpoint-bezogen mit klaren naechsten Schritten.
- `Settings` bietet eine One-Click-API-Diagnose (Reachability + POST-Faehigkeit) mit eindeutiger Operator-Hilfe.
- API-Base-Konfiguration und Port-Fallback sind fuer statisches Frontend-Hosting robust; bei korrekt laufender API funktioniert Global-Save reproduzierbar.
- Save-Default fuer headless/remote Setup nutzt den Host der aufgerufenen UI (LAN/IP/Hostname) statt `localhost` des Client-Geraets.
- Explizite API-Overrides bleiben verfuegbar und behalten Vorrang, ohne den LAN-sicheren Default-Pfad zu brechen.
- Save-/Diagnose-Feedback zeigt explizit `UI-Host` und `API-Host` mit konkreter Remote/LAN-Hilfe bei Fehlrouting.
- Save ueber IP-Aufruf der UI ist reproduzierbar verifiziert (Mehrfach-Save + Reload/Restart ohne Endpoint-Drift).
- Outside-Richtung ist als UI-Option verfuegbar und wirkt zur Laufzeit stabil auf Sterne/Motion-Streaks.
- Outside-Hintergrund bleibt tiefschwarz; blauer Background ist entfernt.
- Per-Room-Animationen haben instanzscharfe Parameter fuer `Speed`, `Intensity` und `Sound Volume` im Runtime-Modell.
- Running-`Edit` fuer Room-Animationen ist funktional und aktualisiert exakt die bestehende Instanz statt eine neue anzulegen.
- Dashboard bleibt auf Desktop und kleinem Display bedienbar.
- Setup (Board -> Kalibrieren -> Loslegen) ist in unter 2 Minuten moeglich.
- README beschreibt den realen Session-Flow und die Safety-Bedienung.

## Nachweisartefakte
- Messergebnis Board-Wechselzeit (<1s).
- Latenzproben fuer Event-Trigger (<150ms Ziel).
- Kurzprotokoll 30-Minuten-Dauerlauf.
- Screenshot/Notiz zu Bedienbarkeit Small-Screen.
- Messprotokoll Power Outage inkl. Parallel-Last, sichtbarer Wirkung und `Clear All`.
- Kurzprotokoll Room-Click Trefferquote (beide Boards, Rand/Mitte) inkl. Polygon-Clip.
- Mapping-Protokoll fuer 5 Special-Raeume inkl. Board-A/B Screenshot oder Foto-Notiz.
- Audio-Testprotokoll fuer Intruder/Reactor/Outage inkl. Master-Toggle und Volume 25/50/100.
- Kalibrierprotokoll fuer Hitarea-Slider (X/Y/Scale) pro Board inkl. Persistenz-Nachweis nach Boardwechsel.
- Bugfix-Nachweis fuer Spezialraum-Rendering (Running-List vs sichtbarer Effekt) mit Repro-Schritten vorher/nachher.
- Stabilitaetsprotokoll fuer Triggerfolge `Spezialraum + Alarm Beacon` inkl. Timer- und Parallel-Animation-Verhalten.
- Geometrie-Protokoll fuer Raumkalibrierung (relativ/absolut) inkl. Distanzvergleich vor/nach Korrektur.
- Stretch-Protokoll (`stretchX`/`stretchY`) mit Nachweis Hit-Test/Clip-Kongruenz.
- Polygon-Editor-Protokoll fuer Spezialraeume (Insert/Delete/Move) inkl. gespeicherter Zielkoordinaten.
- Persistenzprotokoll pro Board fuer komplette Geometry-/Shape-Profile inkl. App-Neustart-Nachweis.
- View-Switch-Protokoll mit Screenshots/Notizen fuer `Dashboard` vs `Settings` (gegenseitig exklusive Sichtbarkeit).
- Polygoneditor-UX-Protokoll (sichtbare Handles, aktive Ecke, Insert/Delete/Drag) inkl. mindestens eines Spezialraums pro Board.
- Legacy-Compat-Protokoll fuer kalibrierte Altprofile (Load -> Edit -> Save -> Reload/Restart) ohne Datenverlust.
- Sichtbarkeits-Protokoll je Tab (Dashboard-only vs Settings-only) inkl. 10x Toggle und Small-Screen-Nachweis.
- Handle-Visual-Protokoll mit Vorher/Nachher zur Transparenzreduktion bei gleichbleibender Selektierbarkeit.
- Render-Flaechen-Protokoll fuer grosse Spezialraum-Polygone (kein Insel-Effekt, volle Polygonabdeckung).
- Persistenz-Protokoll fuer bereits gezeichnete Spezialraum-Polygone (Save/Reload/Restart/Boardwechsel ohne Veraenderung).
- Tab-Leak-Protokoll (Dashboard-only/Settings-only) inkl. 10x Toggle + Resize-Nachweis auf Desktop und Small-Screen.
- Layout-Scroll-Protokoll mit Nachweis `Board fixed` + `Control-Panel scroll-only`.
- Running-Overview-Protokoll mit UI-Screenshot/Notizen zur separaten Platzierung und Erreichbarkeit von Stop/Edit.
- Zoom-Edit-Protokoll (mind. 2 Spezialraeume je Board) mit Vorher/Nachher-Koordinaten, Zoomstufe und Fit/Reset-Nachweis.
- Spezialraum-Sync-Protokoll fuer 5/5 Raeume je Board (Board-Klick -> Dropdown-Selektion -> Highlight konsistent).
- Sticky-Running-Protokoll mit Scroll-Sequenz und Nachweis, dass Stop/Edit im sticky Block ohne Rueckscrollen ausfuehrbar bleibt.
- Zoom-Pan-Protokoll mit Interaktionsregel, Zoomstufe und Viewport-Verschiebungsnachweis (inkl. Fit/Reset-Roundtrip ohne Geometrieaenderung).
- Pan-vs-Edit-Protokoll mit mindestens 10 Wechseln zwischen Pan-Modus und Vertex-/Room-Edit ohne Fehltrigger.
- Asset-Audio-Mapping-Protokoll (Intruder/Reactor/Outage) mit Dateinachweis aus `resources/nemesis/sounds/` und Trigger-Latenz/Hoerbarkeit.
- Audio-Settings-Protokoll fuer assetbasierte Sounds (Master on/off + Volume-Stufen) ohne Regression.
- Outside-Effekt-Masken-Protokoll mit Nachweis `nur ausserhalb Ship-Polygon` (Screenshot/Video-Notiz vor/nach Polygon-Edit).
- Ship-Polygon-Editor-Protokoll (Insert/Delete/Move) inkl. Live-Maskenreaktion pro Board.
- Persistenz-Protokoll fuer Ship-Polygon + Outside-Settings (Board A/B getrennt, Save/Reload/Restart/Boardwechsel).
- Audio-Lifecycle-Protokoll (Animation Start/Loop/Stop) inkl. Nachweis sofortiger Stopp bei Ablauf, manuellem Stop und `Clear All`.
- Sound-Mapping-Protokoll pro Animation mit dokumentierter UI-Zuordnung, Triggernachweis und Fallback-Verhalten bei `none`/ungueltigem Mapping.
- Animations-Speed-Protokoll mit mindestens drei Speed-Stufen inkl. Vergleich der sichtbaren Rendergeschwindigkeit und Stop/Edit-Stabilitaet.
- Outside-Modus-Protokoll (`Standard` vs `Immersive`) mit Laufzeit-Umschaltung, Maskenkonsistenz und Regression-Nachweis fuer bestehende Outside-Controls.
- Dashboard-Strictness-Protokoll (10x Tabwechsel + Resize) mit Nachweis, dass nur Trigger/Stop sichtbar sind und keinerlei Konfigurations-/Editor-Controls leaken.
- Settings-Only-Config-Protokoll mit Checkliste fuer Mapping/Calibration/Editor/Outside-Controls und Nachweis exklusiver Bedienbarkeit im `Settings`-Tab.
- Inside-vs-Outside-Kategorisierungs-Protokoll mit Triggerliste und Running-List-Screenshots fuer eindeutige globale Trennung.
- Outside-Immersion-Protokoll mit dokumentierten Speed-/Parallax-Stufen (kurze Videonotiz oder Sequenz-Screenshots) und Stabilitaetsbeobachtung.
- Outside-Isolation-Protokoll mit Paralleltests (`inside` + `outside`) und Nachweis, dass Innenraum-Layer und Room-Animationen unbeeinflusst bleiben.
- Clip-Boundary-Protokoll fuer Inside/Outside mit Gegenprobe an Ship-Kanten (kein Inside ausserhalb, kein Outside innerhalb).
- Outside-Streak-Depth-Protokoll mit Sequenz-Screenshots fuer mehrere Tiefenebenen, differenzierte Geschwindigkeiten und sichtbare Motion-Streaks.
- Global-Defaults-Save-Protokoll (`Settings`-Button `Speichern`) inkl. server/Repo-Ziel, Erfolgsmeldung und Reload/Restart-Nachweis.
- Polygon-Retention-Protokoll vor/nach globalem Save mit Vertex-Anzahl/Shape-Vergleich fuer Ship- und Spezialraum-Polygone.
- Save-Transport-Protokoll fuer Plan-Update 15 mit Nachweis, dass `POST` im vorgesehenen Node-Setup erfolgreich verarbeitet wird (kein `501 Unsupported method POST`).
- API-offline-UX-Protokoll mit Screenshot/Notiz der kurzen Fehlermeldung inkl. konkreter Startanweisung anstelle eines HTML-Errordumps.
- Start-Flow-Doku-Protokoll mit Verweis auf README/Runbook, das API-Server-Pflicht fuer POST und die Startsequenz eindeutig beschreibt.
- Optional-Fallback-Protokoll (Download/Export) mit Nachweis, dass der Fallback nur sekundaer angeboten wird und den Server-Save nicht ersetzt.
- Endpoint-Transparenz-Protokoll mit Save-Logs/UI-Nachweis, dass genutzter Endpoint (Host/Port/Pfad) und Methode angezeigt werden.
- API-Base-Fallback-Protokoll fuer statisches Frontend-Hosting (Konfigurationswert, Fallback-Reihenfolge, Ergebnis pro Endpoint-Kandidat).
- One-Click-Diagnose-Protokoll mit Ergebnissen fuer Reachability + POST-Check und den jeweils ausgegebenen naechsten Schritten.
- Save-Reproduzierbarkeits-Protokoll mit mindestens 5 erfolgreichen Save-Vorgaengen bei laufendem API-Server sowie Reload/Restart-Nachweis.
- Remote-LAN-Host-Resolution-Protokoll mit Nachweis `UI-Host -> API-Host` bei Aufruf ueber `http://192.168.x.x:4173` von einem zweiten Geraet (kein Rueckfall auf Client-`localhost`).
- Override-Prioritaets-Protokoll mit mindestens einem expliziten API-Override und dokumentierter Resolver-Entscheidungsquelle.
- Host-Transparenz-Protokoll fuer Save/Diagnose-Fehler mit expliziten Hostwerten und konkretem Remote/LAN-Hinweis.
- LAN-Save-Repro-Protokoll mit mindestens 5 erfolgreichen Saves plus Reload/Restart im IP-Szenario.
- Outside-Direction-Protokoll mit Sequenznachweis `forward` <-> `reverse` (sichtbare Richtungsinversion der Sterne/Streaks ohne Nebenwirkung auf Inside).
- Outside-Black-Background-Protokoll mit Screenshot/Video-Notiz bei mehreren Intensitaets-/Speed-Stufen (kein blauer Fill).
- Room-Instance-Parameter-Protokoll mit mindestens zwei parallelen Room-Instanzen gleicher Animationsart und unterschiedlichen `speed`/`intensity`/`soundVolume`-Werten.
- Edit-In-Place-Protokoll mit Vorher/Nachher derselben `animation.id` inkl. geaenderter Parameter und Nachweis `kein neuer Running-Eintrag`.
- Edit-Bugfix-Regression-Protokoll fuer `Edit`-Button (aktiv/funktional in wiederholten Start/Edit/Stop-Sequenzen).
- Nachweis Running-Animations-Liste mit Stop/Edit je Eintrag.
- Nachweis Output-Route Wechselpfad inkl. Fullscreen-Fallback-Fall.

## Feedback Rework (Plan 1-3) - Zusatzabnahme
- Room-Hitareas bleiben board-spezifische Hex-Polygone ohne Hover-Verschiebung.
- Room-Submenu startet Effekte nur fuer die aktuelle Selektion und uebernimmt Edit-Loads aus der Running-Liste.
- Scope-Trennung ist im Runtime-Listing klar sichtbar (`GLOBAL` vs `ROOM`).
- `power-outage` dunkelt in beiden Boards sichtbar ab; Output-Routing meldet Fullscreen-Fallback explizit.
- Regression-Check: `node --check src/app.js` erfolgreich.

## Plan Update 2 - Pflichtabnahme (P1-T24..P1-T28)
- Hitarea-Nachkalibrierung ist fuer Board A/B per Rand-/Mitte-Probe dokumentiert.
- Fuenf Special-Raeume sind auf beiden Boards selektierbar und korrekt benannt.
- Event-Sounds sind fuer Intruder/Reactor/Outage im Triggerpfad aktiv.
- Audio-Master (default ON) und Lautstaerke 0-100 wirken sofort auf Event-Sounds.
- Pflichtprotokoll liegt in `.planning/phases/phase-01/P1-T28-MANUAL-VERIFICATION.md`.

## Plan Update 3 - Pflichtabnahme (P1-T29..P1-T33)
- Hitarea-Feinjustierung erfolgt ueber Settings-Slider (X/Y/Scale), nicht ueber Auto-Tuning.
- Kalibrierwerte sind pro Board persistent und nach Boardwechsel reproduzierbar geladen.
- Spezialraum-Animationen sind sichtbar aktiv, sobald sie in der Running-List laufen.
- Triggerfolge `Spezialraum + Alarm Beacon` stoppt weder visuellen Timer noch fremde Animationen.
- Regression-Nachweis fuer kombinierten Triggerpfad liegt als Protokoll in den Phase-01 Artefakten.
- Pflichtprotokoll liegt in `.planning/phases/phase-01/P1-T33-REGRESSION.md`.

## Plan Update 4 - Pflichtabnahme (P1-T34..P1-T39)
- Raumindividuelle Kalibrierung ist pro Raum im Modus `relativ` oder `absolut` moeglich und wirkt sofort.
- `stretchX` und `stretchY` sind pro Raum getrennt einstellbar und bleiben mit Hit-Test/Clip deckungsgleich.
- Haupt-Dashboard enthaelt keine Kalibrier-/Shape-Editorfunktionen; diese liegen ausschliesslich in einer separaten Settings-Seite.
- Spezialraum-Polygone lassen sich praezise per Vertex Insert/Delete/Move bearbeiten und als freie Form speichern.
- Boardprofil laedt/speichert die komplette Geometrie-/Shape-Konfiguration reproduzierbar (inkl. App-Neustart).
- Pflichtprotokoll liegt in `.planning/phases/phase-01/P1-T39-VERIFICATION.md`.

## Plan Update 5 - Pflichtabnahme (P1-T40..P1-T45)
- `Settings` ist ein klarer, exklusiver View-Switch; Dashboard-Inhalte bleiben im Settings-Tab unsichtbar.
- Spezialraum-Polygoneditor zeigt pro Vertex sichtbare Handles; aktive Ecke ist deutlich hervorgehoben.
- Vertex-Workflows sind komplett: Insert an Kante, Delete auf aktiver Ecke, freies Dragging mit sofortigem Feedback.
- Bestehende kalibrierte Raumdaten aus Legacy-Profilen bleiben nach Migration, Save, Reload und Neustart unveraendert nutzbar.
- Pflichtprotokoll liegt in `.planning/phases/phase-01/P1-T45-VERIFICATION.md`.

## Plan Update 6 - Pflichtabnahme (P1-T46..P1-T51)
- Tab-Switch ist hart exklusiv: `Dashboard` zeigt nur Trigger/Animation, `Settings` nur Geometrie/Polygon/Kalibrierung.
- Vertex-Handles sind deutlich transparenter als zuvor, bleiben aber klar selektierbar und aktiv markierbar.
- Spezialraum-Animationen fuellen auch grosse Spezialraum-Polygone vollflaechig aus (kein Insel-Rendering).
- Bereits gezeichnete Spezialraum-Polygone bleiben bei Save/Reload/Restart/Boardwechsel unveraendert erhalten.
- Pflichtprotokoll liegt in `.planning/phases/phase-01/P1-T51-VERIFICATION.md`.

## Plan Update 7 - Pflichtabnahme (P1-T52..P1-T56)
- Tab-Bug ist geschlossen: je Tab sind ausschliesslich die freigegebenen Bediengruppen sichtbar (Dashboard nur Animations-UI, Settings nur Geometrie/Polygon/Kalibrierung).
- Board bleibt beim Arbeiten und Scrollen fixiert; vertikales Scrollen findet ausschliesslich im rechten Steuerbereich statt.
- Aktive Animationen sind in einem separaten, klar priorisierten Uebersichtsabschnitt platziert und direkt bedienbar.
- Pflichtprotokoll liegt in `.planning/phases/phase-01/P1-T56-VERIFICATION.md`.

## Plan Update 8 - Pflichtabnahme (P1-T57..P1-T61)
- Settings erlaubt stufenlosen Board-Zoom; Polygon-Editing (Move/Insert/Delete) bleibt bei Zoom praezise und stabil.
- Klick auf Spezialraum im Settings-Board selektiert denselben Raum sofort im Polygon-Editor-Dropdown.
- Dashboard-Block `Aktive Animationen` bleibt beim Scrollen sticky sichtbar und Stop/Edit bleibt direkt bedienbar.
- Pflichtprotokoll liegt in `.planning/phases/phase-01/P1-T61-VERIFICATION.md`.

## Plan Update 9 - Pflichtabnahme (P1-T62..P1-T66)
- Settings-Board ist bei Zoom robust pannbar (primaer `Space + Drag`, optional mittlere Maustaste), ohne Polygondaten zu veraendern.
- Pan- und Edit-Modi sind klar getrennt: mit `Space` nur Pan, ohne `Space` vollstaendiges Room-/Vertex-Editing.
- Zoom+Pan+Fit/Reset-Roundtrip bleibt stabil; Vertex-Move/Insert/Delete und Room-Klick zeigen keine Regression.
- Pflichtprotokoll liegt in `.planning/phases/phase-01/P1-T66-VERIFICATION.md`.

## Plan Update 10 - Pflichtabnahme (P1-T67..P1-T71)
- Event-Sounds fuer Intruder/Reactor/Power Outage laufen ueber vorhandene Assets aus `resources/nemesis/sounds/` und nicht mehr als rein synthetische Cues.
- Audio-Master und Lautstaerke greifen unveraendert auf den assetbasierten Soundpfad.
- Outside-Effekt ist global schaltbar und rendert ausschliesslich ausserhalb des Ship-Polygons.
- Ship-Polygon ist in `Settings` editierbar (Insert/Delete/Move); Outside-Maske folgt live jeder Aenderung.
- Ship-Polygon + Outside-Effekt-Settings sind pro Board persistent und bleiben nach Reload/Restart/Boardwechsel stabil.
- Pflichtprotokoll liegt in `.planning/phases/phase-01/P1-T71-VERIFICATION.md`.

## Plan Update 11 - Pflichtabnahme (P1-T72..P1-T77)
- Sound-Lifecycle ist an die Animationslaufzeit gekoppelt: Start synchron, Loop bei Ueberlaenge, sofortiger Stop bei Ablauf/manuellem Stop/`Clear All`.
- Sound-Mapping ist pro Animation in der UI editierbar; Mapping-Aenderungen greifen fuer neue Trigger sofort und robust (inkl. `none`/Fallback).
- Allgemeine Animations-Settings enthalten Geschwindigkeitssteuerung; Speed-Aenderungen wirken live ohne Regression bei Running-List, Stop/Edit und Clip.
- Outside-Alternativanimation ist als UI-Option verfuegbar (`Standard`/`Immersive`) und bleibt strikt auf Outside-Maske begrenzt.
- Bestehende Outside-Logik (Enable, Intensity, Speed, Ship-Maske, Persistenz) bleibt durch den Modusausbau funktional und regressionsfrei.
- Pflichtprotokoll liegt in `.planning/phases/phase-01/P1-T77-VERIFICATION.md`.

## Plan Update 12 - Pflichtabnahme (P1-T78..P1-T83)
- `Dashboard` zeigt ausschliesslich Trigger-/Stop-Bedienung fuer Animationen; es gibt keinerlei Settings-, Mapping-, Calibration- oder Editor-Controls.
- Alle Konfigurationspfade sind ausschliesslich im `Settings`-Tab verfuegbar und bleiben beim Tabwechsel leak-frei.
- Globale Animationen sind fachlich getrennt in `Innerhalb des Schiffs` und `Ausserhalb des Schiffs` (UI + Runtime-Liste + Start/Stop).
- Outside-Animationen vermitteln klaren High-Speed-Raumflug (Parallax-Sterne, tiefer Raumfluss) und bleiben lauffaehig stabil.
- Outside-Layer bleibt strikt isoliert ausserhalb der Ship-Maske und beeinflusst Innenraum-Animationen/-Renderer nicht.
- Pflichtprotokoll liegt in `.planning/phases/phase-01/P1-T83-VERIFICATION.md`.

## Plan Update 13 - Pflichtabnahme (P1-T84..P1-T90)
- Inside-Animationen rendern ausschliesslich innerhalb des Ship-Polygons; ausserhalb sind keine Inside-Visuals sichtbar.
- Outside-Animationen rendern ausschliesslich ausserhalb des Ship-Polygons; innerhalb sind keine Outside-Visuals sichtbar.
- Outside-Look ist als High-Speed-Spaceflow erkennbar (mehrere Tiefenebenen, unterschiedliche Geschwindigkeiten, deutliche Motion-Streaks statt Glitzereffekt).
- `Settings` bietet einen expliziten `Speichern`-Button fuer `lokaler Browserstand -> globale Default-Config (server/Repo)` mit klarer Erfolg/Fehler-Rueckmeldung.
- Global-Save uebernimmt bestehende lokale Daten verlustfrei; insbesondere Ship- und Spezialraum-Polygone bleiben nach Save/Reload/Restart unveraendert.
- Pflichtprotokoll liegt in `.planning/phases/phase-01/P1-T90-VERIFICATION.md`.

## Plan Update 14 - Pflichtabnahme (P1-T91..P1-T96)
- Outside-Animation bietet eine sichtbare Richtungsumschaltung (`forward`/`reverse`) mit sofortiger Wirkung auf Sterne und Motion-Streaks.
- Outside-Hintergrund ist tiefschwarz; ein blauer Outside-Background ist nicht mehr vorhanden.
- Room-Animationen unterstuetzen pro laufender Instanz getrennte Werte fuer `Speed`, `Intensity` und `Sound Volume`.
- Runtime-Modell fuehrt diese Werte instanzscharf je Animation und verwendet sie konsistent in Start/Edit/Stop.
- `Edit` fuer laufende Room-Animationen ist funktional, laedt bestehende Instanzwerte und schreibt Aenderungen in-place auf dieselbe `animation.id`.
- Pflichtprotokoll liegt in `.planning/phases/phase-01/P1-T96-VERIFICATION.md`.

## Plan Update 15 - Pflichtabnahme (P1-T97..P1-T101)
- Save fuer globale Defaults funktioniert im vorgesehenen Setup reproduzierbar ueber POST auf dem Node-API-Server, ohne `501 Unsupported method POST`.
- Bei fehlendem API-Server liefert die Save-UX eine kurze, klare Fehlermeldung mit konkreter Startanweisung; HTML-Rohfehler werden nicht direkt angezeigt.
- Startdokumentation beschreibt eindeutig, welcher Server fuer POST noetig ist und wie API + Frontend kurz gestartet werden.
- Optionaler Export-/Download-Fallback ist nur sekundaer vorhanden und ersetzt den primaeren Server-Save nicht.
- Pflichtprotokoll liegt in `.planning/phases/phase-01/P1-T101-VERIFICATION.md`.

## Plan Update 16 - Pflichtabnahme (P1-T102..P1-T106)
- Save-Endpunkt wird fuer statisches Frontend-Hosting robust aufgeloest (konfigurierbare API-Base + Port-Fallback) und bleibt fuer den Operator nachvollziehbar.
- Save-Flow fuehrt einen klaren API-Preflight (Reachability/Health + POST-Faehigkeit) aus und scheitert bei Fehlern kontrolliert mit handlungsorientierter Meldung.
- Save-Feedback zeigt den konkret verwendeten Endpoint, Methode und Fehlerklasse statt technischer Rohantworten.
- `Settings` bietet eine One-Click-`API Diagnose`, die API-Erreichbarkeit und POST-Erlaubnis prueft und klare Next Steps liefert.
- Bei korrekt laufendem API-Server funktioniert `Speichern` reproduzierbar in Mehrfachdurchlaeufen inkl. Reload/Restart.
- Pflichtprotokoll liegt in `.planning/phases/phase-01/P1-T106-VERIFICATION.md`.

## Plan Update 17 - Pflichtabnahme (P1-T107..P1-T111)
- Endpoint-Resolver nutzt im headless/remote LAN-Setup den Host der aufgerufenen UI als Default fuer Save und Diagnose; Client-`localhost` wird nicht mehr versehentlich verwendet.
- Explizite API-Overrides bleiben kompatibel und haben weiterhin Vorrang; die genutzte Override-Quelle ist im Feedback nachvollziehbar.
- Save- und Diagnose-UX zeigen explizit `UI-Host`, `API-Host`, finalen Endpoint und Methode sowie konkrete Remote/LAN-Hinweise bei Host-Mismatch.
- Save via UI-IP-Aufruf (`http://192.168.x.x:4173`) ist von einem zweiten Geraet aus reproduzierbar erfolgreich (mindestens 5x Save plus Reload/Restart ohne Host-Drift).
- Pflichtprotokolle liegen in `.planning/phases/phase-01/P1-T110-VERIFICATION.md` (Regression) und `.planning/phases/phase-01/P1-T111-VERIFICATION.md` (Abnahme + Doku-Sync).
