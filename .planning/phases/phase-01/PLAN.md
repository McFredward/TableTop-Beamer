# Phase 1 Plan

## Zielbild
Phase 1 liefert einen stabilen Vertical Slice: Board auswaehlen, kalibrieren, globale und raumspezifische Effekte getrennt steuern und sicher auf die Projektionsflaeche routen.

## Prioritaetsfokus (Plan-Update 11)
- P0: Hex-Hitareas muessen auf beiden Boards deckungsgleich auf den realen Raumflaechen liegen.
- P0: Verifikationsfokus wird auf klar dokumentierte manuelle Pflichttests im realen Setup angehoben.
- P1: Fuenf Special-Raeume werden zusaetzlich aufgenommen (Cockpit links, Cryoschlaf Mitte, drei Maschinenraeume rechts).
- P1: Event-Sounds fuer Intruder Alert, Reactor Pulse und Power Outage werden integriert.
- P1: Settings erhalten globale Audio-Steuerung (Master Enable/Disable + Lautstaerke).
- P0: Hitarea-Auto-Tuning wird nicht weiter verfolgt; stattdessen kommt eine kleine Einstellungsseite mit Slidern fuer Offset/Scale, pro Board persistent speicherbar.
- P0: Spezialraum-Animationen muessen sichtbar laufen, nicht nur in der Running-List erscheinen.
- P0: Kombination `Spezialraum + Alarm Beacon` darf den visuellen Animationspfad nicht mehr stoppen; Regression-Guard wird Pflicht.
- P0: Kalibrierung wird um raumindividuelle Geometrie erweitert (Position relativ/absolut je Raum), damit auch Distanzen zwischen Raeumen korrigierbar sind.
- P0: Unabhaengiges Stretching pro Raum (Breite und Hoehe separat) wird live justierbar.
- P0: Alle Kalibrier- und Shape-Funktionen wandern aus dem Haupt-Dashboard in eine eigene Einstellungsseite.
- P0: Spezialraum-Polygone sind in der Einstellungsseite praezise editierbar (Ecke einfuegen/loeschen/frei verschieben) und als beliebige Polygonform speicherbar.
- P1: Die komplette Kalibrier- und Polygon-Konfiguration wird pro Board persistent gespeichert und beim Laden deterministisch wiederhergestellt.
- P0: Settings muss ein echter View-Switch sein; beim Wechsel auf `Settings` darf das Trigger-Dashboard inkl. Raumgeometrie- und Spezialraum-Editor nicht sichtbar bleiben.
- P0: Spezialraum-Polygoneditor bekommt Photoshop-aehnliches Vertex-Editing mit klar sichtbaren Handles direkt auf dem Board.
- P0: Ausgewaehlter Vertex wird visuell deutlich hervorgehoben (z. B. rot) und ist als aktiver Bearbeitungspunkt eindeutig erkennbar.
- P0: Ausgewaehlter Vertex muss loeschbar sein; neue Vertices muessen an Kanten einfuegbar sein; Vertices muessen frei per Drag verschiebbar sein.
- P0: Persistenz bleibt rueckwaertskompatibel; bestehende kalibrierte Raumdaten bleiben ohne manuelle Nacharbeit nutzbar.
- P0: View-Switch bleibt hart exklusiv; `Dashboard` zeigt nur Trigger-/Animations-Bedienelemente, `Settings` nur Geometrie/Polygon/Kalibrierung.
- P0: Vertex-Handles werden deutlich transparenter gestaltet, bleiben aber klar sichtbar und sicher selektierbar.
- P0: Raumspezifische Animationen skalieren immer auf die volle Flaeche des Ziel-Polygons (keine kleine Insel in grossen Raeumen).
- P0: Bereits gezeichnete Spezialraum-Polygone bleiben bei Save/Reload/Restart verlustfrei erhalten.
- P0: Tab-Bug bleibt blocker-kritisch; Dashboard-Elemente duerfen in `Settings` nicht sichtbar sein und umgekehrt.
- P0: Board bleibt beim Scrollen fixiert; nur der rechte Steuerbereich darf vertikal scrollen.
- P0: Aktive Animationen erhalten einen separaten, klar sichtbaren Bereich fuer schnelle Bedienung.
- P0: Settings braucht stufenloses Board-Zoom, damit Polygonpunkte praezise auch in dichten Bereichen bearbeitet werden koennen.
- P0: Klick auf einen Spezialraum im Settings-Board muss den Raum direkt im Polygon-Editor-Dropdown selektieren.
- P0: Der Dashboard-Block `Aktive Animationen` bleibt beim Scrollen sticky sichtbar und jederzeit bedienbar.
- P0: Im Settings-Tab muss das Board bei aktivem Zoom per Maus pannbar sein, ohne Room-/Vertex-Editing zu blockieren.
- P0: Pan-vs-Edit braucht eine klare, robuste Interaktionsregel (primaer `Space + Drag`, optional mittlere Maustaste als Alias) und darf keine Fehltrigger erzeugen.
- P0: Event-Sounds muessen in Phase 1 vorhandene Sound-Assets aus `resources` nutzen (keine rein synthetischen Cues mehr) und sinnvoll auf Trigger/Animationen gemappt sein.
- P0: Audio-Settings (`Sound an/aus`, `Lautstaerke`) muessen unveraendert auf alle assetbasierten Sounds greifen.
- P0: Es gibt einen globalen, ein-/ausschaltbaren Outside-Effekt fuer den Aussenbereich (z. B. vorbeiziehende Sterne/Weltraum-Motion).
- P0: Im Settings-Tab ist das gesamte Schiff als editierbares Polygon markierbar; die Outside-Maske wird deterministisch aus diesem Ship-Polygon abgeleitet.
- P1: Ship-Polygon und Outside-Effekt-Settings werden pro Board persistent gespeichert und bei Boardwechsel/Reload stabil wiederhergestellt.
- P0: Sounddauer ist strikt an die Laufzeit der zugehoerigen Animation gekoppelt (Start gemeinsam, Stop sofort, kein Nachklingen nach Animationsende).
- P0: Laeuft eine Animation laenger als ihre Audiodatei, wird der zugeordnete Sound ohne hoerbare Luecke geloopt, bis die Animation endet.
- P0: Stop/Beenden einer Animation (inkl. `Clear All`) beendet den zugeordneten Soundpfad sofort und deterministisch.
- P0: Pro Animation ist das Sound-Mapping in der UI editierbar (kein fest verdrahtetes Trigger-only Mapping).
- P1: Allgemeine Animations-Settings werden um Geschwindigkeitssteuerung erweitert (mindestens globaler Speed-Faktor mit sofortiger Wirkung).
- P1: Fuer den Outside-Bereich wird eine immersive Alternativanimation integriert und in der UI als umschaltbare Option angeboten, ohne die bestehende Outside-Logik zu brechen.

## Prioritaetsfokus (Plan-Update 12)
- P0: Tab-Trennung wird fachlich verschaerft: `Dashboard` darf nur Animationen triggern und laufende Animationen stoppen.
- P0: Im `Dashboard` sind keinerlei Settings-/Mapping-/Calibration-/Editor-Controls erlaubt; diese sind exklusiv dem `Settings`-Tab zugeordnet.
- P0: Globale Animationen werden fachlich in `Innerhalb des Schiffs` und `Ausserhalb des Schiffs` getrennt (eigene Kategorien, eigene Bedienung, eigener Runtime-Kontext).
- P0: Outside-Animationen werden immersiver ueberarbeitet (hohe Fluggeschwindigkeit, vorbeirasende Sterne/Parallax, tiefer Raumfluss).
- P0: Outside-Renderpfad bleibt strikt als Outside-Layer isoliert und darf Innenraum-Visuals oder Innenraum-Animationen nicht beeinflussen.

## Prioritaetsfokus (Plan-Update 13)
- P0: Rendering-Clipping wird beidseitig hart korrigiert: Inside-Animationen sind ausschliesslich innerhalb des Ship-Polygons sichtbar, Outside-Animationen ausschliesslich ausserhalb.
- P0: Outside-Visual wird von glitzerartigem Effekt auf High-Speed-Spaceflow umgebaut (mehrere Tiefenebenen, klar unterscheidbare Geschwindigkeiten, deutliche Motion-Streaks).
- P0: Persistenz wird im Single-User-Setup von rein browser-lokal auf server/Repo-konfigurierbar erweitert.
- P0: `Settings` erhaelt einen expliziten `Speichern`-Button, der aktuelle Browserdaten in eine globale Default-Config schreibt.
- P0: Browserdaten bleiben die priorisierte Quellbasis fuer das Schreiben der globalen Config; bestehende Polygon- und Geometriedaten duerfen dabei nicht verloren gehen.

## Prioritaetsfokus (Plan-Update 14)
- P0: Outside-Animation erhaelt eine umschaltbare Bewegungsrichtung (vorwaerts/rueckwaerts) als direkte UI-Option.
- P0: Outside-Layer bleibt farblich tiefschwarz; bisheriger blauer Hintergrund wird entfernt, sichtbar sind nur Sterne und Motion-Streaks.
- P0: Per-Room-Animationen erhalten pro Instanz einstellbare Parameter fuer Geschwindigkeit, Intensitaet und Sound-Lautstaerke.
- P0: Runtime-Modell speichert diese Per-Animation-Werte instanzscharf und nutzt sie bei Edit/Stop/Reload ohne Vermischung.
- P0: `Edit` fuer laufende Room-Animationen wird als Blocker-Bug behoben: bestehende Instanz laden und Aenderungen auf genau diese Instanz anwenden.

## Prioritaetsfokus (Plan-Update 15)
- P0: Global-Defaults-Save darf im vorgesehenen Setup nicht mehr an `POST` mit `501 Unsupported method` scheitern; der Server-Save-Pfad muss robust funktionieren.
- P0: Save-UX muss bei fehlendem API-Server eine kurze, klare Fehlermeldung mit konkreter Startanweisung liefern (kein HTML-Fehlerdump in der UI).
- P0: Start-Flow wird explizit dokumentiert: fuer `POST` ist ein Node-API-Server noetig; statischer File-/Static-Server allein reicht nicht.
- P1: Optionaler Fallback (z. B. Download/Export) ist zulaessig, darf aber den primaeren Server-Save (`lokal -> globale Defaults`) nicht ersetzen oder kaschieren.

## Prioritaetsfokus (Plan-Update 16)
- P0: Save-Flow fuer globale Defaults muss auch bei statisch gehostetem Frontend praktikabel funktionieren (explizite API-Base-Konfiguration, robuster Port-Fallback, klarer API-Health-Check vor POST).
- P0: Save-Fehlerfeedback muss den konkret genutzten API-Endpunkt transparent anzeigen und den Fehlgrund handlungsorientiert erklaeren (inkl. Methode/Status/naechster Schritt).
- P0: `Settings` erhaelt einen klaren Diagnosepfad fuer API-Erreichbarkeit und POST-Faehigkeit mit klaren Folgeaktionen pro Fehlerklasse.
- P0: Bei korrekt laufendem API-Server ist globale Speicherung reproduzierbar erfolgreich (kein intermittierendes Endpunkt-/Routing-Fehlverhalten).

## Prioritaetsfokus (Plan-Update 17)
- P0: Im headless/remote LAN-Setup darf Save nicht auf `localhost` des aufrufenden Client-Geraets zeigen; Default-API-Host muss der Host der aufgerufenen UI sein (z. B. `192.168.0.80`).
- P0: API-Override bleibt erlaubt, aber der sichere Default fuer Remote/LAN funktioniert ohne manuelle Eingriffe reproduzierbar.
- P0: Save-/Diagnose-Feedback nennt explizit den final verwendeten Host und gibt bei Remote-Fehlkonfiguration konkrete LAN-Hinweise statt generischer Fehltexte.
- P0: Save via IP-Aufruf der UI (z. B. `http://192.168.x.x:4173`) wird als Pflicht-Regression reproduzierbar nachgewiesen.

## Prioritaetsfokus (Plan-Update 18)
- P0: Fehlkonfiguration `python3 -m http.server 4173` bzw. statischer Host wird explizit erkannt (Health 404 + typische Static-Signatur), statt als generischer API-Fehler behandelt.
- P0: Diagnose- und Save-Fehlertext nennt eindeutig: `Static-only Server aktiv, Save nicht moeglich`.
- P0: Guided-Fix-UX zeigt im headless/LAN-Setup konkrete, host-korrekte Next Steps (z. B. `node server.mjs --host 0.0.0.0 --port 4173`) statt statischem Python-Server.
- P0: Endpoint-Resolver bleibt host-transparent ohne verwirrenden `localhost`-Rueckfall im Remote-IP-Betrieb; UI-Host-Flow und finaler API-Host sind stets sichtbar.
- P0: Pflichtabnahme enthaelt einen echten Negativtest mit aktivem Python-Static-Server und anschliessenden Positivtest mit Node-API-Server.

## Prioritaetsfokus (Plan-Update 19)
- P0: Der dedizierte UI-Button `API Diagnose` wird wieder entfernt; Diagnose bleibt funktional ueber Save-Preflight und endpoint-transparentes Feedback ohne eigenen Triggerbutton.
- P0: Download-Funktion und zugehoerige Hinweise werden neutral benannt; `Notfall`-Wording wird im Settings-Save-Umfeld entfernt.
- P0: Save-/Diagnose-Texte bleiben handlungsorientiert und host-transparent (`UI-Host -> API-Host`), ohne dass dafuer ein separater Diagnose-Button noetig ist.

## Umsetzungsansatz nach Epics

### Epic 1 - Projection Core
- Board-Assets mit klarer ID/Label-Zuordnung verwalten.
- Board-Wechsel ohne Flackern und unter 1 Sekunde sicherstellen.
- Kalibrierregler mit Echtzeit-Update auf Stage verdrahten.
- Nutzbare Defaults und Reset-Logik bereitstellen.
- Kalibrierung fuer Hitareas als dedizierte Mini-Settingsseite mit X/Y-Offset und Scale pro Board anbieten.
- Kalibrierwerte pro Board persistent speichern und beim Board-Wechsel deterministisch laden.
- Pro Raum ein Geometrieprofil mit Position (relativ/absolut), Offset und Stretch X/Y fuehren.
- Raumindividuelle Geometrie live auf Hit-Test, Hover und Render-Clip anwenden.
- Persistenzschema fuer globale + raumindividuelle Kalibrierwerte pro Board versionierbar halten.
- Legacy-Profil-Ladeschicht fuer vorhandene Kalibrierdaten absichern, damit alte Raumdaten in das aktuelle Boardprofil uebernommen werden.
- Ship-Polygon als zusaetzliche board-spezifische Geometrieebene fuehren und als Quelle fuer die Outside-Maske bereitstellen.
- Persistenzschema um Ship-Polygon und Outside-Effekt-Settings pro Board erweitern (inkl. kompatiblem Fallback fuer Bestandsprofile).
- Single-User-Config-Pfad ergaenzen, der browser-lokale Profile als globale Default-Config auf Server/Repo-Ebene serialisiert.
- Persistenz-Merge-Regeln festlegen: lokale Browserdaten sind Source-of-Truth fuer `Save to Global Defaults`; bestehende Polygondaten bleiben verlustfrei erhalten.
- Save-Transport fuer globale Defaults robust machen: API-Basis und HTTP-Methode werden fail-safe validiert, damit im Zielsetup keine `501 Unsupported method POST`-Fehler mehr auftreten.
- API-Fehlerpfad fuer fehlenden/unerreichbaren Node-Server klar klassifizieren und als kurze Operator-Meldung (inkl. Startkommando) bereitstellen.
- API-Zielauflosung explizit konfigurierbar machen (z. B. `window.__TT_BEAMER_API_BASE__`/`localStorage`/URL-Param), mit deterministischer Fallback-Kette fuer Localhost-Ports.
- API-Health-Probe als vorgelagerter Guard einbauen (`GET /api/health` oder gleichwertig), bevor `POST /api/global-defaults` ausgefuehrt wird.
- Save-Runtime muss den final verwendeten Endpoint, HTTP-Methode und Fehlerklasse strukturiert zur UX rueckmelden.
- Endpoint-Resolver fuer Remote/LAN haerten: bei UI-Aufruf ueber IP/Hostname wird derselbe Origin-Host als Default fuer API-Kandidaten priorisiert, bevor `localhost`-Fallbacks geprueft werden.
- Resolver darf `localhost`/`127.0.0.1` nur nutzen, wenn die UI selbst lokal auf diesem Host aufgerufen wurde oder ein expliziter Override gesetzt ist.
- Preflight und Save teilen einen identischen, host-transparenten Resolve-Snapshot (UI-Host, finaler API-Host, Quelle der Entscheidung), damit Diagnose und Save nicht auseinanderlaufen.
- Static-only-Fehllage wird als eigene Fehlerklasse gefuehrt: `GET /api/health` liefert 404/HTML + Header/Body-Signaturen eines Static-Servers (insb. Python SimpleHTTP) und blockiert Save mit klarer Operator-Meldung.
- Fehlerklassifizierung unterscheidet robust zwischen `static-only`, `api-offline`, `method-not-allowed` und `server-error`; jede Klasse hat klaren Next-Step-Text fuer headless/LAN.

### Epic 2 - Effect Engine
- Einheitliche Effekt-API fuer Start/Stop etablieren.
- Globale Animationen separat von raumspezifischen Animationen fuehren.
- Power-Outage-Effekt sichtbar und unter Last konsistent halten.
- Raumspezifische Animationen auf den ausgewaehlten Hex-Polygonraum clippen.
- Event-Sounds als eigener Pfad pro Event-Trigger (Intruder/Reactor/Outage) mit niedriger Latenz abspielen.
- Audio-Lifecycle an Animations-Lifecycle koppeln: Sound startet/stoppt synchron zur Animation und wird bei Ueberlaenge geloopt.
- Stop-Pfade (`Stop`, Ablauf, `Clear All`) so verdrahten, dass zugeordnete Sounds sofort beendet werden.
- `Clear All` als priorisierten globalen Stop-Pfad implementieren.
- Spezialraum-Animationen durchgaengig ueber denselben Render-Lifecycle wie normale Raeume fuehren.
- `Alarm Beacon` gegen Seiteneffekte auf Timer/Render-Queue isolieren, damit andere Visuals stabil weiterlaufen.
- Fehlerfall-Guards einbauen: Ausnahme in einer Animation darf weder globalen Tick noch andere Layer stoppen.
- Raum-Renderer fuer Spezialraeume auf polygon-normalisierte Skalierung umstellen, damit Effekte die komplette Polygonflaeche ausfuellen.
- Event-Sound-Mapping auf vorhandene Dateien aus `resources/nemesis/sounds/` umstellen (u. a. `alarm.mp3`, `electricity.mp3`, `monsters/048.wav`, `power/3.wav`).
- Triggerpfade fuer Intruder/Reactor/Power-Outage und passende globale Animationen so mappen, dass Asset-Sounds priorisiert abgespielt werden.
- Editierbares Sound-Mapping pro Animation bereitstellen (inkl. Default-Mapping + validem Fallback bei fehlendem Asset).
- Globalen Outside-Effekt als eigenen Render-Layer einfuehren und auf den Bereich ausserhalb des Ship-Polygons maskieren.
- Outside-Effekt um immersive Alternativanimation erweitern; Umschaltung erfolgt zur Laufzeit ueber denselben Outside-Maskenpfad.
- Globales Animationsmodell fachlich auftrennen: Kategorie `Innerhalb des Schiffs` getrennt von Kategorie `Ausserhalb des Schiffs` (Routing, Runtime-Liste, Stop-Pfade).
- Outside-Engine auf hochdynamische Tiefenwirkung erweitern (mehrlagige Sternenstroeme, Parallax-Geschwindigkeiten, kontinuierlicher Raumfluss).
- Outside-Layer-Guard verankern: kein Leak ins Ship-Polygon, keine Seiteneffekte auf Innenraum-Layer, Trigger oder Raum-Renderer.
- Inside-vs-Outside-Clip-Guards auf Engine-Ebene absichern: Inside rendert nur in Ship-Maske, Outside nur im inversen Maskenbereich.
- Outside-Renderer auf High-Speed-Flight-Look mit Multi-Depth-Starfields und deutlichen Motion-Streaks umstellen.
- Outside-Renderer um Richtungsparameter erweitern (`forward`/`reverse`) und Sternen-/Streak-Drift deterministisch invertierbar halten.
- Outside-Farbregeln haerten: kein blauer Vollflaechen-Background, Outside-Basis bleibt tiefschwarz mit additiven Stern-/Streak-Layern.
- Room-Animation-Runtime um instanzbezogene Parameter (`speed`, `intensity`, `soundVolume`) erweitern und im Edit-Lifecycle als Source-of-Truth nutzen.

### Epic 3 - Operator Dashboard
- Globale Trigger in kompaktem Grid mit klarer Hierarchie darstellen.
- Raum-Submenu mit Animation, Intensitaet, Dauer/Hold direkt erreichbar machen.
- Laufende Animationen als Liste mit Stop/Edit je Eintrag pflegen.
- Setup-Reihenfolge im UI fuehren: Board -> Kalibrieren -> Triggern.
- Touch-gerechte Targets fuer kleine Displays sicherstellen.
- Special-Raumzuordnung in der Board-Interaktion klar sichtbar halten.
- Audio-Settings (Master + Volume) schnell erreichbar und waehrend Session sofort wirksam machen.
- Sound-Mapping pro Animation in der UI editierbar machen (Animation -> Sounddatei/none), inkl. nachvollziehbarer Default-Belegung.
- Allgemeine Animations-Settings um Geschwindigkeitssteuerung erweitern (mindestens globaler Speed-Regler, optional presets).
- Kleine Hitarea-Kalibrierseite mit Slidern schlank in den Setup-Flow integrieren (ohne versteckte Auto-Korrektur).
- Kalibrierung/Shape-Bearbeitung als dedizierte Settings-Seite ausserhalb des Trigger-Dashboards fuehren.
- Spezialraum-Polygoneditor mit Vertex-Operationen (Insert/Delete/Drag) und sicherem Save/Reset bereitstellen.
- Dashboard auf Trigger- und Laufzeitkontrolle fokussieren; Geometrie-/Shape-Aenderungen nur im Settings-Bereich.
- Tab-Navigation als echten View-Switch umsetzen: Dashboard und Settings sind gegenseitig exklusiv sichtbar.
- Vertex-Handles fuer Spezialraum-Polygone auf dem Board immer klar sichtbar rendern; aktive Ecke farblich stark hervorheben.
- Vertex-Loeschen nur fuer aktive Ecke erlauben und Mindestanzahl an Polygonpunkten robust absichern.
- Tab-Rendering strikt entkoppeln: pro Tab nur die jeweils freigegebenen Bediengruppen mounten/anzeigen.
- Vertex-Handle-Styling auf transparente, weniger dominante Bubbles reduzieren (Hitflaeche bleibt touch-tauglich).
- Harte Sichtbarkeitsmatrix pro Tab auf Root-Container-Ebene absichern, damit keine Dashboard-Controls in `Settings` leaken.
- Zweispalten-Layout so aufsetzen, dass das Board als sticky/fixed Arbeitsflaeche stehen bleibt und nur der Control-Stack scrollt.
- Running-Animations-Bereich als eigenstaendiges UI-Modul oberhalb der Triggerliste platzieren und visuell priorisieren.
- Im Settings-Board einen klaren Pan-Modus fuer gezoomte Ansichten anbieten (`Space + Drag`; optional mittlere Maustaste), ohne Polygon-Edit-Regression.
- Interaktions-Arbitration zwischen Pan, Room-Klick und Vertex-Drag explizit absichern (Pointer-Capture, Guardrails, deterministischer Mode-Wechsel).
- Settings um einen Ship-Polygon-Editor erweitern (Vertex Insert/Delete/Drag analog Spezialraum-Editor, klare aktive Auswahl).
- Outside-Effekt-Controls (global an/aus, Intensitaet/Geschwindigkeit falls vorgesehen) im Settings-Flow mit sofortiger Wirkung integrieren.
- Outside-Effekt-Controls um einen Modus-Toggle erweitern (Standard vs immersive Alternative), ohne die bestehende Outside-Steuerung zu verlieren.
- Dashboard auf Runtime-Bedienung verengen: nur Triggern und Stoppen laufender Animationen; keine Konfigurations- oder Editorfunktionen.
- Alle Konfigurationsflaechen (Settings, Mapping, Calibration, Polygon-/Ship-Editor) ausschliesslich im `Settings`-Tab fuehren.
- Globale Trigger-UI in zwei klar getrennte Sektionen ausweisen: `Innerhalb des Schiffs` und `Ausserhalb des Schiffs`.
- Outside-Sektion visuell/inhaltlich als externer Layer kommunizieren (kein Eindruck, dass Innenraum mitgesteuert wird).
- `Settings` um `Speichern`-Aktion erweitern: aktueller Browserzustand wird explizit als globale Default-Config persistiert.
- Save-UX muss den Datenursprung klar machen (`lokaler Stand -> globale Defaults`) und vor stillen Datenverlusten bei Polygonen schuetzen.
- Running-List-Edit fuer Room-Animationen muss die selektierte laufende Instanz vorladen und als in-place Update statt Neuinstanz ausfuehren.
- Per-Room-Editor erweitert die Runtime-Bedienung um `Speed`, `Intensity` und `Sound Volume` pro laufender Instanz mit klarer Rueckmeldung.
- Save-Feedback in `Settings` zeigt bei API-Fehlern keine Roh-HTML-Antworten, sondern eine knappe Handlungsanweisung (`API-Server starten`, erwarteter Startbefehl).
- Optionalen Export-/Download-Fallback im Save-Umfeld sichtbar anbieten, aber klar als Sekundaerpfad kennzeichnen; der Standard bleibt Server-Save.
- Save-Feedback zeigt zusaetzlich den konkret verwendeten API-Endpunkt (inkl. Port) und den zuletzt getesteten Health-Status.
- `Settings` bietet einen diagnosefaehigen Save-Pfad ohne separaten `API Diagnose`-Button; Reachability + POST-Faehigkeit werden im Preflight geprueft und endpoint-transparent rueckgemeldet.
- Save-/Diagnose-Meldungen zeigen explizit `UI-Host -> API-Host` und enthalten bei erkannten Remote-Mismatchs eine kurze LAN-Hilfe (z. B. "UI via 192.168.x.x aufrufen oder API-Override setzen").
- `Settings` zeigt fuer den Save-Pfad konkrete Headless/LAN-Startanweisungen mit host-offenen Kommandos (`node server.mjs --host 0.0.0.0 --port <port>`) und benennt den statischen Python-Server explizit als nicht POST-faehig.
- API-Base-Feld bleibt erhalten; die Diagnoseausgabe nennt explizit die erkannte Serverart (`API-Server` vs `Static-only`) plus empfohlenen naechsten Schritt, jedoch ohne dedizierten Diagnose-Button.

## Delivery Reihenfolge
1. Priority Lane P0: Exakte Hitarea-Kalibrierung beider Boards + manueller Pflichttest-Plan.
2. Priority Lane P1: Special-Room Mapping (Cockpit/Cryoschlaf/Maschinenraeume) in Board-UX integrieren.
3. Priority Lane P1: Event-Sound Layer + globale Audio-Settings implementieren und absichern.
4. Hardening: Lastchecks, Restbugs, Regression inkl. manuellem End-to-End Durchlauf.

## Priority Add-on (Plan-Update 3)
1. P0 zuerst: Manuelle Hitarea-Feinkalibrierung per Sliderseite (Offset/Scale) statt Auto-Tuning, inkl. Persistenz pro Board.
2. P0 danach: Spezialraum-Animationen im visuellen Pfad reparieren (Running-List und Renderstatus muessen konsistent sein).
3. P0 danach: Crash-Pfad `Spezialraum + Alarm Beacon` isolieren, Timer/Layer-Stabilitaet wiederherstellen.
4. Hardening: Regression-Absicherung fuer den kombinierten Triggerpfad inkl. Nachweis in Acceptance-Artefakten.

## Priority Add-on (Plan-Update 4)
1. P0 zuerst: Raumindividuelle Kalibrierung einbauen (Position relativ/absolut je Raum, Distanzkorrektur zwischen Raeumen, Stretch X/Y pro Raum).
2. P0 danach: Alle Kalibrier- und Shape-Funktionen in eine separate Settings-Seite aus Dashboard herausloesen.
3. P0 danach: Spezialraum-Polygoneditor fuer Vertex Insert/Delete/Drag plus beliebige Polygonform-Speicherung umsetzen.
4. P1 Hardening: Persistenz pro Board fuer die gesamte Raumgeometrie (inkl. Spezialraum-Polygone) verifizieren und dokumentieren.

## Priority Add-on (Plan-Update 5)
1. P0 zuerst: Settings als echte, exklusive View herstellen (kein sichtbarer Dashboard-/Editor-Leak im Settings-Tab).
2. P0 danach: Polygoneditor-UX auf Handle-basiertes Vertex-Editing heben (sichtbare Handles, aktive Ecke hervorheben, Drag stabilisieren).
3. P0 danach: Vertex-Operationen komplettieren (aktive Ecke loeschen, neue Ecke an Kante einfuegen) und Guardrails fuer gueltige Polygonformen halten.
4. P0 Hardening: Persistenz-Rueckwaertskompatibilitaet fuer bestehende kalibrierte Raumdaten mit Reload/Restart-Checks nachweisen.

## Priority Add-on (Plan-Update 6)
1. P0 zuerst: View-Switch-Leak vollstaendig schliessen (Dashboard <-> Settings hart exklusiv, keine gemischte UI).
2. P0 danach: Polygoneditor-Handles visuell entschlacken (deutlich mehr Transparenz) bei gleichbleibender Selektierbarkeit.
3. P0 danach: Spezialraum-Animationen auf volle Polygonflaeche normalisieren und in grossen Raeumen vollflaechig rendern.
4. P0 Hardening: Persistenzschutz fuer bereits gezeichnete Polygone mit Save/Reload/Restart-Regressionsnachweis.

## Priority Add-on (Plan-Update 7)
1. P0 zuerst: Tab-Exklusivitaet final korrigieren (Dashboard nur Animations-UI, Settings nur Geometrie/Polygon/Kalibrierung).
2. P0 danach: Board im Operator-Layout fixieren; Scroll-Verhalten auf den rechten Steuerbereich begrenzen.
3. P0 danach: Aktive Animationen separat und klar sichtbar oberhalb der Steuerung anordnen.
4. P0 Hardening: Sichtbarkeits-/Scroll-/Uebersichts-Regression auf Desktop und Small-Screen mit Pflichtnachweis.

## Priority Add-on (Plan-Update 8)
1. P0 zuerst: Settings-Board-Zoom fuer Polygon-Editing liefern (Zoombereich, Reset/Fit, stabile Handle-Selektion bei Zoom).
2. P0 danach: Spezialraum-Klick im Settings-Board bidirektional mit Polygon-Editor koppeln (Board-Auswahl -> Dropdown und Dropdown -> Board-Highlight).
3. P0 danach: Running-Animations-Block im Dashboard als sticky Abschnitt im scrollenden Control-Panel fixieren.
4. P0 Hardening: Zoom-/Selection-/Sticky-Regression auf Desktop und Small-Screen inkl. Scroll- und View-Switch-Kombinationen.

## Priority Add-on (Plan-Update 9)
1. P0 zuerst: Gezoomtes Settings-Board pannbar machen (primaer `Space + Drag`, optional mittlere Maustaste) inkl. sichtbarem Pan-Status/Cursor.
2. P0 danach: Pan/Edit-Arbitration haerten, damit Room-Klick, Vertex-Selektion und Vertex-Drag unveraendert praezise bleiben.
3. P0 danach: Pan-Grenzen und Zoom-Reset/Fit zusammenspielen lassen (keine verlorene Arbeitsflaeche, kein unkontrolliertes Wegdriften).
4. P1 Hardening: Regression fuer Zoom+Pan+Polygon-Editing auf Desktop und Small-Screen inkl. mehrfachem Tabwechsel dokumentieren.

## Priority Add-on (Plan-Update 10)
1. P0 zuerst: Event-Sound-Pfad auf vorhandene Asset-Dateien umstellen und Mapping fuer Intruder/Reactor/Power Outage (+ passende globale Events) deterministisch verdrahten.
2. P0 danach: Globalen Outside-Effekt als schaltbaren Layer implementieren und auf ausserhalb des Schiffs sichtbaren Bereich begrenzen.
3. P0 danach: Ship-Polygon-Editor im Settings-Tab bereitstellen; Outside-Maske aus dem editierten Polygon ableiten.
4. P1 Hardening: Board-spezifische Persistenz fuer Ship-Polygon + Outside-Effekt-Settings inkl. Reload/Restart/Boardwechsel regressionssicher nachweisen.

## Priority Add-on (Plan-Update 11)
1. P0 zuerst: Audio-Lifecycle an Animationslaufzeit koppeln (Start/Loop/sofortiger Stop) inkl. robustem Stop-Verhalten bei Ablauf, manuellem Stop und `Clear All`.
2. P0 danach: UI fuer editierbares Sound-Mapping pro Animation liefern und Default-Mappings auf bestehende Asset-Sounds konsistent vorbesetzen.
3. P1 danach: Allgemeine Animations-Settings um Geschwindigkeitssteuerung erweitern und live auf aktive/neu gestartete Animationen anwenden.
4. P1 danach: Immersive Outside-Alternativanimation integrieren und per Toggle/Option im UI schaltbar machen, ohne den bestehenden Outside-Maskenpfad zu brechen.
5. Hardening: Regression fuer Audio-Loop/Stop-Sync, Mapping-Persistenz, Speed-Einfluss und Outside-Moduswechsel gemaess `ACCEPTANCE.md` dokumentieren.

## Priority Add-on (Plan-Update 12)
1. P0 zuerst: Tab-Grenzen schaerfen (`Dashboard` nur Trigger/Stop; alle Settings-/Mapping-/Calibration-/Editor-Controls exklusiv in `Settings`).
2. P0 danach: Globale Animationen fachlich trennen (`Innerhalb des Schiffs` vs `Ausserhalb des Schiffs`) in Datenmodell, Runtime-Liste und UI.
3. P0 danach: Immersive Outside-Animation auf High-Speed-Flugwirkung ausbauen (Parallax-Sterne, tiefer Raumfluss) bei strikt isoliertem Outside-Layer.
4. P0 Hardening: Regression fuer Tab-Sichtbarkeit, Inside/Outside-Kategorisierung, Outside-Isolation und Performance gemaess `ACCEPTANCE.md` dokumentieren.

## Priority Add-on (Plan-Update 13)
1. P0 zuerst: Rendering-Clip-Pfade haerten (Inside strikt im Ship-Polygon, Outside strikt ausserhalb) inkl. Guard gegen Maskenlecks bei Parallelbetrieb.
2. P0 danach: Outside-Layer visuell auf High-Speed-Spaceflow umstellen (mehrere Tiefenebenen + differenzierte Geschwindigkeiten + klare Motion-Streaks).
3. P0 danach: Server/Repo-Config-Persistenz ergaenzen und `Settings`-Button `Speichern` fuer `lokal -> globale Defaults` integrieren.
4. P0 Hardening: Datenmigration/Save-Pfad so absichern, dass bestehende lokale Polygon-/Geometriedaten vollstaendig erhalten bleiben.
5. P1 Hardening: Pflichtabnahme + Regression fuer Clipping-Isolation, Outside-Flight-Look und globale Config-Persistenz gemaess `ACCEPTANCE.md` dokumentieren.

## Priority Add-on (Plan-Update 14)
1. P0 zuerst: Outside-Animation um Richtungsumschaltung erweitern (`vorwaerts`/`rueckwaerts`) und den blauen Outside-Background entfernen (Basis bleibt tiefschwarz).
2. P0 danach: Per-Room-Animation-Controls um `Speed`, `Intensity` und `Sound Volume` pro einzelner laufender Instanz erweitern.
3. P0 danach: Runtime-Modell auf instanzscharfe Room-Parameter umbauen und Edit-Apply strikt auf dieselbe laufende Instanz verdrahten.
4. P0 Hardening: P0-Bug `Edit` in Running-Liste beheben (Button aktiv + funktional), inkl. Regression fuer in-place Edit ohne Neuinstanz.
5. P1 Hardening: Pflichtabnahme + Regression fuer Outside-Richtung/Black-Background, Per-Room-Instanzparameter und Edit-Flow gemaess `ACCEPTANCE.md` dokumentieren.

## Priority Add-on (Plan-Update 15)
1. P0 zuerst: Save-Endpunkt/Transport fuer `Speichern` robust machen, damit `POST` im vorgesehenen Node-Setup deterministisch erfolgreich ist.
2. P0 danach: Save-Fehler-UX haerten: bei fehlendem API-Server kurze Klartextmeldung + konkrete Startanweisung statt HTML-Fehlerdump.
3. P0 danach: Start-Flow-Doku fuer den verpflichtenden POST-faehigen Server ergaenzen (`node server`), inkl. kurzer Setup-Sequenz.
4. P1 danach: Optionalen Export-/Download-Fallback fuer API-Ausfall anbieten, ohne den primaeren Server-Save zu ersetzen.
5. P1 Hardening: Pflichtabnahme + Regression fuer Save-Robustheit, API-offline Fehlermeldung und dokumentierten Start-Flow gemaess `ACCEPTANCE.md`.

## Priority Add-on (Plan-Update 16)
1. P0 zuerst: API-Base-Strategie fuer statisches Frontend-Hosting haerten (konfigurierbarer Base-Endpoint + Port-Fallback + klare Auswahlreihenfolge).
2. P0 danach: Save-Flow um vorgelagerten Health-Check und endpoint-transparente Fehlermeldung erweitern (genutzter Endpoint, Methode, Status, konkrete Aktion).
3. P0 danach: Diagnosepfad in `Settings` liefern (API erreichbar? POST erlaubt?) inklusive klarer Ergebnistexte und naechster Schritte.
4. P0 Hardening: Reproduzierbarkeitstest fuer `Speichern` bei korrekt laufendem API-Server (mehrfacher Save, Reload/Restart, kein intermittierender Fail).
5. P1 Hardening: Doku-/Runbook-Abgleich fuer API-Base-Konfiguration und Diagnose-Flow gemaess `ACCEPTANCE.md`.

## Priority Add-on (Plan-Update 17)
1. P0 zuerst: Endpoint-Resolver fuer headless/remote LAN korrigieren (UI-Host als Default-API-Host; `localhost` nur noch als lokaler Sonderfall oder expliziter Override).
2. P0 danach: API-Override-Flow kompatibel halten und Prioritaet transparent dokumentieren (Override > Remote/LAN-Default > sichere Fallbacks).
3. P0 danach: Save-/Diagnose-UX um explizite Host-Transparenz und Remote-Hinweise erweitern (`UI-Host`, `API-Host`, naechster Schritt bei Mismatch).
4. P0 Hardening: Pflicht-Repro fuer Save bei UI-Aufruf ueber LAN-IP (mindestens 5x Save + Reload/Restart ohne Rueckfall auf `localhost`).

## Priority Add-on (Plan-Update 18)
1. P0 zuerst: Static-only-Misconfiguration-Detection haerten (Python SimpleHTTP/Static-Server Signatur erkennen; klare Fehlerklasse statt generischem API-Fail).
2. P0 danach: Guided-Fix-UX in `Settings` erweitern (headless/LAN-kompatible Startkommandos, expliziter Hinweis `Static-only Server aktiv, Save nicht moeglich`).
3. P0 danach: Resolver-/Snapshot-Transparenz durchgaengig halten (kein verwirrender `localhost`-Fallback im Remote-IP-Flow; identischer Host-Trace in Save und Diagnose).
4. P0 Hardening: Pflichtabnahme mit echtem Negativtest `python3 -m http.server 4173` und direkt folgendem Positivtest auf Node-API-Server.

## Priority Add-on (Plan-Update 19)
1. P0 zuerst: Settings-Save-UI bereinigen und den dedizierten Button `API Diagnose` entfernen; Diagnose bleibt ueber Save-Preflight/Feedback verfuegbar.
2. P0 danach: Download-/Export-Wording auf neutralen Begriff umstellen (kein `Notfall`-Label in Button, Hint, Status oder Fehlertext).
3. P0 danach: Save-/Diagnose-Copy konsolidieren (host-transparente Anleitung beibehalten, aber ohne Button-Referenzen und ohne Notfall-Begriffe).
4. P0 Hardening: Pflichtabnahme fuer UI-Bereinigung und Wording-Regression gemaess `ACCEPTANCE.md` dokumentieren.

## Referenzen
- docs/PHASE1-BACKLOG.md
- docs/PHASE1-PLAN.md
