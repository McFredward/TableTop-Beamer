# Phase 1 Risks

## R1 Projektionsverzerrung
- Risiko: Beamerwinkel verzerrt Overlay auf realem Tisch.
- Impact: Mittel bis hoch, Kalibrierung wird unzuverlaessig.
- Gegenmassnahme: frueher Real-Table-Test, konservative Defaults, schnelle Reset-Moeglichkeit.

## R2 Helligkeitskonflikte
- Risiko: Overlays ueberstrahlen Karten/Marker oder gehen unter.
- Impact: Mittel, Lesbarkeit und Stimmung leiden.
- Gegenmassnahme: Intensitaetsregler im Raum-Submenu nutzen und Outage-Visual auf Sichtbarkeit gegenpruefen.

## R3 UI-Ueberladung im Spielbetrieb
- Risiko: Zu viele Optionen erschweren schnelle Trigger.
- Impact: Mittel, Operator-Reaktionszeit sinkt.
- Gegenmassnahme: priorisierte Controls, klare Gruppen, kein versteckter Safety-Pfad.

## R4 Safety unter Last
- Risiko: `Clear All` reagiert bei Last zu spaet.
- Impact: Hoch, laufende Runde wird gestoert.
- Gegenmassnahme: globaler Stop-Pfad mit Prioritaet, expliziter Lasttest.

## R5 Room-Click Fehltrigger
- Risiko: Falsche Raumzuordnung oder unpraezise Hit-Areas fuehren zu Fehltriggern.
- Impact: Mittel bis hoch, Operator verliert Tempo und Vertrauen.
- Gegenmassnahme: board-spezifische Hex-Polygone auf Realboard nachkalibrieren, Rand/Mitte manuell vermessen, Trefferquote protokollieren.

## R7 Special-Room Mapping Drift
- Risiko: Die fuenf Special-Raeume werden zwischen Board A/B inkonsistent positioniert oder benannt.
- Impact: Mittel bis hoch, gezielte Trigger treffen falsche Raeume.
- Gegenmassnahme: feste Mapping-Tabelle fuer `Cockpit`, `Cryoschlaf`, `Maschinenraum 1-3` pro Board, manueller Lageabgleich je Release.

## R8 Scope-Verwechslung global vs room
- Risiko: Bedienende verwechseln globale Effekte mit raumspezifischen Eintraegen in der Running-Liste.
- Impact: Mittel, falsche Stop/Edit Aktionen.
- Gegenmassnahme: getrennte UI-Sektionen, Scope in Listeneintrag anzeigen, `Edit` nur fuer room aktiv.

## R6 Output Device Drift
- Risiko: Ausgabe landet auf falschem Display/Geraet nach Wechsel.
- Impact: Mittel, Session-Flow wird unterbrochen.
- Gegenmassnahme: explizite Geraeteauswahl mit eindeutigem Fallback und Wechsel-Smoke-Test.

## R9 Audio Feedback Failure
- Risiko: Event-Sounds spielen nicht, sind zu laut/leise oder laufen trotz deaktiviertem Master weiter.
- Impact: Mittel, Atmosphaere und Bedienvertrauen leiden.
- Gegenmassnahme: globales Audio-Setting zentral pruefen (on/off + Volume), manuelle Event-Sound-Checks als Pflichtabnahme.

## R10 Hitarea Calibration Drift (User-seitig)
- Risiko: Ohne Auto-Tuning werden Offset/Scale falsch eingestellt und pro Board uneinheitlich gespeichert.
- Impact: Mittel bis hoch, Trefferquote sinkt trotz vorhandener Kalibrierfunktion.
- Gegenmassnahme: klare Slider-Limits, Reset pro Board, sichtbarer Board-Kontext und Persistenztest als Pflichtabnahme.

## R11 Visual Pipeline Break bei Trigger-Kombination
- Risiko: Kombination `Spezialraum + Alarm Beacon` wirft den visuellen Renderpfad aus dem Takt (Timer stoppt, andere Layer verschwinden).
- Impact: Hoch, laufende Runde verliert alle visuellen Hinweise.
- Gegenmassnahme: Effekt-Isolation im Runtime-Loop, Guarding fuer Exceptions, expliziter Regressionstest fuer den Kombi-Trigger.

## R12 Raumgeometrie-Drift durch Mischmodus relativ/absolut
- Risiko: Falscher Modus oder fehlerhafte Umrechnung fuehrt zu inkonsistenten Distanzen zwischen Raeumen.
- Impact: Hoch, Raumtreffer und visuelle Lage driften trotz Kalibrierung.
- Gegenmassnahme: klarer Modusindikator pro Raum, deterministische Konvertierung, Distanz-Checks in Pflichtabnahme.

## R13 Polygon-Editor erzeugt ungueltige Spezialraumformen
- Risiko: Vertex-Insert/Delete/Move kann Selbstueberschneidungen oder degenerierte Flaechen erzeugen.
- Impact: Mittel bis hoch, Hit-Test/Clip verhalten sich unvorhersehbar.
- Gegenmassnahme: geometrische Guards (Mindestpunkte, keine Nullflaeche), visuelle Warnung und Reset auf letzten gueltigen Stand.

## R14 Board-Persistenzkonflikte fuer Geometry/Shape-Profile
- Risiko: Profile werden board-uebergreifend ueberschrieben oder unvollstaendig geladen.
- Impact: Hoch, Setup verliert Reproduzierbarkeit zwischen Sessions.
- Gegenmassnahme: strikt board-keyed Speicherung, Versionsfeld im Profil, Save/Load/Restart-Regression als Pflichttest.

## R15 Settings-Abkopplung verschlechtert Bedientempo
- Risiko: Auslagerung aus dem Dashboard kann Setup- und Live-Bedienung verlangsamen.
- Impact: Mittel, Operator braucht mehr Schritte in kritischen Momenten.
- Gegenmassnahme: klare Navigation Dashboard <-> Settings, kurze Wege, Dashboard bleibt auf Trigger fokussiert.

## R16 Defekter Tab-Switch zeigt gemischte Views
- Risiko: `Settings` blendet Dashboard-/Editor-Zustaende nicht sauber aus; Bedienende sehen widerspruechliche Controls gleichzeitig.
- Impact: Hoch, Fehlbedienung und falsche Kalibrierungen waehrend Live-Betrieb.
- Gegenmassnahme: exklusives View-Rendering per aktivem Tab-State, UI-Regression fuer Desktop + Small-Screen, Pflichttest fuer 10x Toggle ohne Leak.

## R17 Vertex-Handle-UX unklar oder instabil
- Risiko: Handles sind schlecht sichtbar oder Drag/Selection ist unzuverlaessig, wodurch Polygonanpassungen unpraezise werden.
- Impact: Hoch, Spezialraum-Formen werden falsch editiert und Trigger treffen ungenau.
- Gegenmassnahme: kontraststarke Handle-Darstellung inkl. aktiver Ecke, Pointer-Capture fuer Drag, Insert/Delete-Guards und manuelle UX-Checks.

## R18 Legacy-Persistenz bricht bei Schemawechsel
- Risiko: Bestehende kalibrierte Raumdaten werden durch neue Profileigenschaften unvollstaendig geladen oder ueberschrieben.
- Impact: Hoch, produktive Kalibrierungen gehen verloren und muessen neu erstellt werden.
- Gegenmassnahme: explizite Compatibility-Layer mit Versionshandling, Migrations-Regression (Load/Edit/Save/Reload/Restart) als Pflichtabnahme.

## R19 View-Leak zwischen Dashboard und Settings bleibt bestehen
- Risiko: Einzelne Bediengruppen (z. B. Editor-Handles) bleiben beim Tabwechsel sichtbar, obwohl der Rest der View wechselt.
- Impact: Hoch, Bedienende arbeiten in gemischten UI-Zustaenden und treffen falsche Aktionen.
- Gegenmassnahme: harte Sichtbarkeitsmatrix je Tab (Dashboard-only vs Settings-only), automatisierter Toggle-Regressionstest und manuelle 10x-Checkliste.

## R20 Handle-Visuals verdecken Boardinhalte
- Risiko: Vertex-Bubbles sind zu opak und dominant; Raumkonturen und Marker werden visuell ueberdeckt.
- Impact: Mittel bis hoch, Polygonkorrekturen werden unpraezise und langsamer.
- Gegenmassnahme: Transparenz deutlich erhoehen, Active-State ueber Rand/Farbe statt Vollflaechen-Deckung definieren, Hitflaeche separat robust halten.

## R21 Unterfuellte Raumanimation in grossen Polygonen
- Risiko: Spezialraum-Animationen werden nicht auf volle Polygonflaeche skaliert und erscheinen als kleine Insel.
- Impact: Hoch, Effektwirkung verliert Lesbarkeit und wirkt funktional defekt.
- Gegenmassnahme: polygon-normalisierte Render-Skalierung, Vollflaechen-Checks in grossen Spezialraeumen als Pflichttest.

## R22 Persistenzverlust bereits gezeichneter Spezialraum-Polygone
- Risiko: Bestehende Polygone gehen bei Save/Reload/Restart oder Boardwechsel teilweise verloren bzw. werden veraendert.
- Impact: Hoch, bereits kalibrierte Spieltisch-Geometrie muss neu erstellt werden.
- Gegenmassnahme: unveraenderte Roundtrip-Regression fuer Bestandsdaten, board-keyed Persistenzschutz und expliziter Vergleich vor/nach Neustart.

## R23 Tab-Leak trotz vermeintlicher Exklusivitaet
- Risiko: Einzelne Settings- oder Dashboard-Container bleiben nach Tabwechsel gemountet/sichtbar und erzeugen erneute Mischansichten.
- Impact: Hoch, Fehlbedienung im Live-Betrieb durch widerspruechliche Controls.
- Gegenmassnahme: Root-Container-Sichtbarkeitsmatrix je Tab, Toggle+Resize-Regressionstest und Pflichttest fuer 10x Wechsel auf Desktop/Small-Screen.

## R24 Scroll-Kopplung verschiebt das Board aus dem Sichtfeld
- Risiko: Gesamtseiten-Scroll oder fehlerhafte Overflow-Konfiguration laesst das Board beim Arbeiten mit den Controls mitscrollen.
- Impact: Hoch, Orientierung auf der Projektion geht verloren und Bedientempo sinkt.
- Gegenmassnahme: separates Scroll-Container-Design (rechts), Board-Spalte sticky/fixed auslegen und auf kleinen Displays explizit gegenpruefen.

## R25 Running-Animations-Liste geht im Control-Stack unter
- Risiko: Aktive Animationen sind nicht als eigener Bereich priorisiert und werden zwischen Triggergruppen uebersehen.
- Impact: Mittel bis hoch, Stop/Edit dauert zu lange oder wird vergessen.
- Gegenmassnahme: separater Running-Abschnitt mit klarer visueller Prioritaet, feste Platzierung nahe Einstieg des Control-Bereichs und Usability-Regression.

## R26 Zoom-Koordinatenversatz im Polygoneditor
- Risiko: Board-Zoom verschiebt Pointer-zu-Vertex-Mapping; Punkte springen oder werden an falscher Stelle editiert.
- Impact: Hoch, Spezialraum-Polygone werden unpraezise und Trigger-Zuordnung verschlechtert sich.
- Gegenmassnahme: konsistente Transform-Pipeline fuer Hit-Test/Drag/Insert/Delete, Zoom-Regression mit Vorher/Nachher-Koordinaten und Fit/Reset-Checks.

## R27 Spezialraum-Selektion driftet zwischen Board-Klick und Dropdown
- Risiko: Klick auf Spezialraum aktualisiert Dropdown nicht deterministisch (oder umgekehrt), wodurch falscher Raum bearbeitet wird.
- Impact: Hoch, Operator editiert unbeabsichtigt den falschen Spezialraum.
- Gegenmassnahme: eine gemeinsame Source-of-Truth fuer Spezialraum-Selektion, bidirektionale Sync-Guards und 5/5-Raumtest pro Board.

## R28 Sticky-Running-Block verliert Bedienbarkeit
- Risiko: Sticky-Positionierung kollidiert mit Scroll-Containern oder z-index, sodass `Aktive Animationen` verdeckt ist bzw. Fokus verliert.
- Impact: Mittel bis hoch, Stop/Edit ist im Live-Betrieb verzoegert.
- Gegenmassnahme: klares Sticky-Offset im Dashboard-Container, Scroll-/Tab-/Small-Screen-Regression und expliziter Bediencheck unter langem Scroll.

## R29 Pan/Edit-Moduskonflikt im gezoomten Settings-Board
- Risiko: Neue Pan-Interaktion faengt Pointer-Events falsch ab; Room-Klick, Vertex-Selektion oder Vertex-Drag reagieren unzuverlaessig.
- Impact: Hoch, Polygonbearbeitung wird unpraezise und fuehrt zu Fehlkalibrierungen.
- Gegenmassnahme: eindeutige Modusregel (`Space + Drag` fuer Pan, sonst Edit), deterministische Pointer-Capture-Guards und Regressionstests fuer Insert/Delete/Move.

## R30 Viewport-Drift durch Zoom+Pan-Kombination
- Risiko: Pan-Bounds oder Reset/Fit-Logik sind inkonsistent, wodurch das Board aus dem Arbeitsbereich driftet oder Koordinaten scheinbar springen.
- Impact: Mittel bis hoch, Setup wird langsam und fehleranfaellig.
- Gegenmassnahme: gemeinsame Transform-Source fuer Zoom/Pan, harte Bounds-Clamps, Roundtrip-Checks (Zoom -> Pan -> Fit/Reset -> Edit) als Pflichtabnahme.

## R31 Asset-Sound-Mapping fehlerhaft oder unvollstaendig
- Risiko: Event-Trigger greifen auf falsche Datei, stumme Pfade oder fallen unbemerkt auf synthetische Sounds zurueck.
- Impact: Mittel bis hoch, Atmosphaere und Operator-Vertrauen sinken.
- Gegenmassnahme: feste Mapping-Matrix fuer Intruder/Reactor/Outage (+ relevante globale Events), Asset-Existenzchecks und Pflichttest mit Dateinachweis.

## R32 Outside-Maskenleck ins Schiffsinnere
- Risiko: Outside-Effekt wird nicht sauber ausmaskiert und ueberdeckt Innenraeume oder Marker.
- Impact: Hoch, visuelle Lesbarkeit und Trigger-Verstaendnis leiden.
- Gegenmassnahme: Ship-Polygon als einzige Maskenquelle verwenden, Live-Preview im Settings-Editor und explizite Outside-vs-Inside-Regressionspruefung.

## R33 Ship-Polygon-Editor erzeugt instabile Aussenmaske
- Risiko: Ungueltige Polygonzustaende (zu wenige Punkte, Selbstschnitt, Pointer-Fehler) zerstoeren die Ableitung der Outside-Maske.
- Impact: Hoch, Outside-Effekt wird unbrauchbar oder blockiert weitere Bearbeitung.
- Gegenmassnahme: gleiche Vertex-Guards wie bei Spezialraeumen (Mindestpunkte, robustes Insert/Delete/Drag), letzter gueltiger Zustand als Fallback.

## R34 Board-Persistenzkonflikt bei Ship- und Outside-Daten
- Risiko: Ship-Polygon oder Outside-Settings werden board-uebergreifend vermischt oder bei Legacy-Loads verworfen.
- Impact: Hoch, reproduzierbares Setup pro Board geht verloren.
- Gegenmassnahme: strikt board-keyed Persistenz, kompatible Defaults fuer Altprofile, Save/Reload/Restart/Boardwechsel als Pflicht-Regression.

## R35 Audio entkoppelt sich von Animationslaufzeit
- Risiko: Sounds laufen nach Animationsende weiter oder stoppen zu frueh, wodurch visuelle und akustische Rueckmeldung auseinanderlaufen.
- Impact: Hoch, Operator verliert Vertrauen in Triggerzustand und Safety-Verhalten.
- Gegenmassnahme: gemeinsamer Lifecycle-Key pro Animation/Sound, harter Stop-Hook auf Ablauf/Stop/`Clear All`, Regression fuer Start/Loop/Stop-Sync.

## R36 Looping erzeugt Audio-Artefakte oder Leaks
- Risiko: Lange Animationen starten mehrfach ueberlappende Instanzen oder loopen mit Knacksern/Luecken.
- Impact: Mittel bis hoch, Atmosphaere leidet und Laufzeitstabilitaet sinkt.
- Gegenmassnahme: kontrolliertes Voice-Pooling mit Single-Instance-Guard pro Zuordnung, Loop-Crosscheck unter Last und Leak-Monitoring in Pflichttests.

## R37 Fehlkonfiguration im Sound-Mapping pro Animation
- Risiko: Editierbares Mapping fuehrt zu ungueltigen/fehlenden Zuordnungen und stummen oder falschen Sounds.
- Impact: Mittel, Triggerfeedback wird inkonsistent.
- Gegenmassnahme: UI-Validierung, klarer `none`-Pfad, dokumentierte Defaults und Fallback-Verhalten ohne Runtime-Exception.

## R38 Globaler Speed-Regler verursacht Render- oder UX-Regression
- Risiko: Geschwindigkeitssteuerung destabilisiert Tick-Logik, Timing in Running-Liste oder Stop/Edit-Reaktionszeit.
- Impact: Hoch, Live-Bedienung wird unzuverlaessig.
- Gegenmassnahme: Speed-Faktor zentral im Renderpfad kapseln, Grenzwerte setzen, Regression fuer Running-List, Clip und Stop/Edit in mehreren Speed-Stufen.

## R39 Outside-Alternativmodus bricht bestehende Outside-Logik
- Risiko: Neuer immersiver Outside-Modus ignoriert Ship-Maske oder kollidiert mit Enable/Intensity/Speed und bestehender Persistenz.
- Impact: Hoch, Outside-Effekt wird unberechenbar oder unbrauchbar.
- Gegenmassnahme: Moduswechsel auf bestehendem Masken-/Settings-Fundament aufsetzen, identische Stop-/Persistenzpfade nutzen und Standard-vs-Immersive-A/B-Regression dokumentieren.

## R40 Tab-Grenzen verwischen erneut zwischen Runtime und Konfiguration
- Risiko: Dashboard zeigt versehentlich wieder Mapping/Calibration/Editor-Controls oder Settings verliert exklusive Konfigurationshoheit.
- Impact: Hoch, Live-Bedienung wird fehleranfaellig und Setup-Aenderungen passieren im falschen Kontext.
- Gegenmassnahme: harte Sichtbarkeitsmatrix (`Dashboard` nur Trigger/Stop, `Settings` nur Konfiguration), Toggle+Resize-Regression und blocker-kritische Leak-Checks.

## R41 Fehlrouting globaler Animationen zwischen Inside und Outside
- Risiko: Globale Effekte werden falsch kategorisiert oder im falschen Layer gestartet/gestoppt.
- Impact: Hoch, Operator verliert Kontrolle ueber die fachliche Wirkung und stoppt unbeabsichtigt falsche Animationen.
- Gegenmassnahme: explizites Kategorienmodell (`inside-ship`/`outside-ship`) im Datenmodell, eindeutige UI-Kennzeichnung und kategoriebasierte Runtime-Assertions.

## R42 Immersive Outside-High-Speed ueberlastet Renderpfad
- Risiko: Mehrlagige Parallax-Animationen erzeugen Framedrops, Flackern oder instabile Timing-Spruenge.
- Impact: Mittel bis hoch, Immersion sinkt und Parallelanimationen reagieren zoegerlich.
- Gegenmassnahme: Outside-Performance-Budget (Layer/Partikelgrenzen), adaptive Drosselung ueber Speed/Intensity und Lasttests mit parallelen Innenraum-Effekten.

## R43 Outside-Layer beeinflusst Innenraum trotz Maskierung
- Risiko: Outside-Effekte leaken visuell oder lifecycle-seitig in Innenraum-Layer (Ueberlagerung, Stop/Edit-Nebenwirkungen, Triggerdrift).
- Impact: Hoch, Innenraumdarstellung wird verfremdet und Bedienvertrauen sinkt.
- Gegenmassnahme: strikt getrennte Render-/State-Pfade fuer Inside vs Outside, Masken-Regression unter Paralleltriggern und explizite Isolationstests als Pflichtabnahme.

## R44 Inside-Clip leakt ausserhalb der Ship-Maske
- Risiko: Inside-Animationen werden nicht hart geclippt und sind ausserhalb des Ship-Polygons sichtbar.
- Impact: Hoch, fachliche Trennung Inside/Outside wird gebrochen und Visuals wirken fehlerhaft.
- Gegenmassnahme: Inside-Clip als Pflicht-Guard im zentralen Renderpfad verankern, Kanten-Regression mit Paralleltriggern und fail-safe bei ungueltiger Maske.

## R45 Outside-High-Speed-Streaks erzeugen visuelles Chaos oder Performance-Einbruch
- Risiko: Neue Motion-Streaks und Tiefenebenen ueberzeichnen den Screen oder verursachen Framedrops.
- Impact: Mittel bis hoch, Lesbarkeit sinkt und Bedienreaktion wird zoegerlich.
- Gegenmassnahme: Layer-/Partikelbudget definieren, Streak-Laenge an Speed/Intensity koppeln und Lasttests mit parallelen Innenraum-Effekten durchfuehren.

## R46 Global-Config-Save ueberschreibt lokale Bestandsdaten fehlerhaft
- Risiko: Export `lokal -> globale Defaults` schreibt unvollstaendige Payload und verliert bestehende Ship-/Spezialraum-Polygondaten.
- Impact: Hoch, kalibrierte Geometrie geht verloren und muss manuell rekonstruiert werden.
- Gegenmassnahme: Browserzustand als Source-of-Truth vollstaendig serialisieren, Merge-Guards fuer Polygonfelder einbauen und Vorher/Nachher-Vergleich als Pflichtabnahme fordern.

## R47 Outside-Richtungsumschaltung verursacht Layer- oder Zeitdrift
- Risiko: Wechsel `forward`/`reverse` setzt Outside-Timer, Depth-Phasen oder Streak-Berechnung inkonsistent zurueck.
- Impact: Mittel bis hoch, sichtbare Spruenge oder instabiles Laufverhalten im Outside-Layer.
- Gegenmassnahme: Richtungswechsel als deterministische Vorzeichenumkehr im bestehenden Tick-Modell implementieren, ohne Runtime-Neuinitialisierung.

## R48 Blauer Outside-Background bleibt als Rest-Renderpfad aktiv
- Risiko: Alte Fill-/Gradient-Pfade rendern weiterhin blau hinter Sternen/Streaks.
- Impact: Mittel, geforderte Deep-Space-Optik wird verfehlt und visuelle Konsistenz leidet.
- Gegenmassnahme: zentrale Outside-Background-Regel auf tiefschwarz erzwingen, Alt-Fills entfernen und visuelle Regression bei mehreren Intensitaets-/Speed-Stufen pruefen.

## R49 Per-Room-Parameter vermischen sich zwischen Instanzen
- Risiko: `speed`/`intensity`/`soundVolume` werden global oder pro Raum statt pro Instanz gehalten und ueberschreiben sich bei parallelen Animationen.
- Impact: Hoch, Operator verliert Kontrolle ueber einzelne Effekte.
- Gegenmassnahme: instanzscharfes Runtime-Schema pro `animation.id`, keine stillen Fallbacks auf globale Werte, Parallelinstanz-Pflichttests.

## R50 Running-Edit bleibt funktionslos oder erzeugt Neuinstanzen
- Risiko: `Edit` bleibt inaktiv, laedt falsche Daten oder schreibt Aenderungen als neue Animation statt in-place.
- Impact: Hoch, P0-Bug blockiert Laufzeitkorrekturen im Spielbetrieb.
- Gegenmassnahme: Edit-Flow hart an selektierte `animation.id` binden, in-place Update-Guard implementieren und Start/Edit/Stop-Regression mit Mehrfachzyklen verpflichtend machen.

## R51 Save-Flow scheitert auf statischem Host mit HTTP 501
- Risiko: `Speichern` sendet POST gegen einen statischen Server/Dateihost ohne API-Unterstuetzung und erhaelt `501 Unsupported method POST`.
- Impact: Hoch, globale Defaults koennen im Praxisbetrieb nicht persistiert werden.
- Gegenmassnahme: Save-Pfad auf verpflichtenden Node-API-Server ausrichten, Transport-/Method-Checks ergaenzen und Erfolgs-/Fehlerpfad robust trennen.

## R52 HTML-Fehlerdump statt handlungsfaehiger Save-Rueckmeldung
- Risiko: Bei API-Fehlern zeigt die UI rohe HTML-Fehlerseiten oder technische Rohantworten statt kurzer Operator-Hinweise.
- Impact: Mittel bis hoch, Bedienende erkennen Ursache/naechsten Schritt nicht und verlieren Zeit.
- Gegenmassnahme: Fehlerklassifizierung fuer Save (`API nicht erreichbar`, `Methode nicht erlaubt`, `Serverfehler`) und kompakte Klartextmeldungen mit Startanweisung.

## R53 Start-Flow unklar fuer POST-abhaengigen Save
- Risiko: Doku nennt keinen verpflichtenden API-Server; Nutzer starten nur statischen Frontend-Server und erwarten funktionierenden Save.
- Impact: Hoch, wiederholte Fehlstarts und inkonsistenter Betrieb im Single-User-Setup.
- Gegenmassnahme: README/Runbook mit kurzer, eindeutiger Startsequenz fuer API + Frontend ergaenzen; Hinweis auf Save-Anforderung direkt in Settings verankern.

## R54 Optionaler Fallback verdraengt den primaeren Server-Save
- Risiko: Export-/Download-Fallback wird als Hauptweg missverstanden und kaschiert defekten Server-Save.
- Impact: Mittel, betriebliche Defaults divergenzieren und Reproduzierbarkeit sinkt.
- Gegenmassnahme: Fallback explizit als sekundaeren Pfad labeln; primaeren Server-Save weiterhin prominent und funktionsfaehig halten.

## R55 Falscher API-Endpunkt durch statisches Frontend-Hosting
- Risiko: Frontend laeuft auf Static-/Python-Server und leitet Save auf einen unpassenden Same-Origin-Endpunkt statt auf den Node-API-Server.
- Impact: Hoch, Save scheitert reproduzierbar (z. B. 404/405/501) trotz verfuegbarem API-Server.
- Gegenmassnahme: explizite API-Base-Konfiguration mit deterministischer Prioritaet und dokumentiertem Port-Fallback; genutzten Endpoint in UI sichtbar machen.

## R56 Fehlende Preflight-Diagnose fuehrt zu blindem POST-Fehler
- Risiko: Save versucht POST ohne vorherige Reachability-/Methodenpruefung; Fehler wirken zufaellig und schwer einzugrenzen.
- Impact: Mittel bis hoch, Troubleshooting kostet Zeit und erzeugt unsicheren Bedienablauf.
- Gegenmassnahme: vorgeschalteter Health-/POST-Check mit klarer Fehlerklassifizierung und eindeutigen Operator-Anweisungen.

## R57 Endpoint-Information fehlt im Fehlerfall
- Risiko: UI meldet nur generisches `Save fehlgeschlagen`, ohne den tatsaechlich verwendeten Host/Port/Pfad.
- Impact: Mittel bis hoch, Operator korrigiert falsche Systeme oder startet unnoetige Serverprozesse.
- Gegenmassnahme: Save-Feedback muss finalen Endpoint + Methode + Fehlerklasse anzeigen; Diagnose nutzt dieselben Datenquellen.

## R58 Diagnosepfad prueft nicht die reale Save-Faehigkeit
- Risiko: Diagnose zeigt `API erreichbar`, obwohl POST auf dem Save-Endpunkt nicht erlaubt oder falsch geroutet ist.
- Impact: Hoch, falsches Sicherheitsgefuehl; Save bleibt im Echtbetrieb defekt.
- Gegenmassnahme: Diagnose im Save-/Settings-Flow immer als Doppelcheck auslegen (Reachability + POST-Faehigkeit fuer echten Save-Endpunkt) und Ergebnis differenziert darstellen.

## R68 UI-Rueckbau entfernt Diagnose sichtbar, aber nicht funktional abgesichert
- Risiko: Der Button `API Diagnose` wird entfernt, aber der verbleibende Diagnosepfad ueber Save-Preflight liefert unvollstaendige oder schwer auffindbare Rueckmeldung.
- Impact: Mittel bis hoch, Operator verliert Troubleshooting-Transparenz trotz technisch intaktem Save.
- Gegenmassnahme: verpflichtende Save-Feedback-Guards fuer Health/POST/Endpoint-Trace und klare Next-Steps-Texte ohne separaten Diagnose-Button.

## R69 Alarmistisches Export-Wording erzeugt Fehlpriorisierung
- Risiko: Begriffe wie `Notfall-Export` lenken vom primaeren Server-Save ab oder erzeugen unnötigen Krisenmodus im Normalbetrieb.
- Impact: Mittel, Bedienentscheidungen werden inkonsistent und Dokumentation driftet.
- Gegenmassnahme: neutrales, konsistentes Wording (`Download/Export` als sekundaerer Fallback) in UI, Doku und Abnahmekriterien durchsetzen.

## R59 Intermittierende Save-Fehler trotz laufender API
- Risiko: Endpoint-Aufloesung/Fallback ist nicht deterministisch; aufeinanderfolgende Saves nutzen unterschiedliche Ziele.
- Impact: Hoch, globale Defaults sind nicht reproduzierbar speicherbar.
- Gegenmassnahme: stabile Endpoint-Resolution mit fixierter Reihenfolge pro Session und Mehrfach-Save-Regression (mindestens 5x Save + Reload/Restart).

## R60 LAN-Remote-Save faellt auf Client-`localhost` zurueck
- Risiko: Bei UI-Aufruf von einem zweiten LAN-Geraet zeigt Endpoint-Resolver auf `localhost` des Clients statt auf den Server-Host.
- Impact: Hoch, Save ist im realen headless Setup reproduzierbar defekt.
- Gegenmassnahme: UI-Host-basierte Default-Aufloesung (`window.location.hostname`) priorisieren; `localhost` nur bei lokalem UI-Aufruf oder explizitem Override zulassen.

## R61 API-Override wird durch LAN-Default versehentlich gebrochen
- Risiko: Neue Remote-Default-Logik ignoriert explizite API-Overrides oder mischt Prioritaeten inkonsistent.
- Impact: Mittel bis hoch, kontrollierte Spezialsetups (Proxy/abweichender API-Host) funktionieren nicht mehr.
- Gegenmassnahme: harte Prioritaetsregel `explicit override > ui-host default > fallback`, plus Diagnoseanzeige der Resolver-Quelle.

## R62 Fehlermeldung zeigt Host-Kontext nicht ausreichend
- Risiko: Save-/Diagnosefehler nennen keinen klaren `UI-Host` vs `API-Host`, Remote-Mismatch bleibt fuer Operator unsichtbar.
- Impact: Mittel bis hoch, Troubleshooting wird langsam und fuehrt zu falschen Korrekturen.
- Gegenmassnahme: host-transparente Fehlermeldung mit `UI-Host -> API-Host`, finalem Endpoint und konkreter LAN-Handlungsempfehlung.

## R63 LAN-Repro nicht Teil der Pflichtabnahme
- Risiko: Save wird nur lokal auf dem Servergeraet getestet; Defekt bei IP-Aufruf von anderen Geraeten bleibt unentdeckt.
- Impact: Hoch, Release besteht Labortests, scheitert aber im realen Spielbetrieb.
- Gegenmassnahme: verpflichtender LAN-IP-Reprotest (zweites Geraet, 5x Save, Reload/Restart) als Blocker-Kriterium in Acceptance/Execute.

## R64 Static-only-Server wird nur als generischer API-Fehler erkannt
- Risiko: Python `http.server`/statische Hosts liefern 404/HTML, werden aber nicht explizit als `static-only` klassifiziert.
- Impact: Hoch, Operator erhaelt unpraezise Fehlermeldungen und Save bleibt im Realbetrieb dauerhaft defekt.
- Gegenmassnahme: Signaturbasierte Static-only-Erkennung (Health-404 + Header/Body-Muster) als eigene Fehlerklasse mit blocker-klarer Meldung.

## R65 Guided Fix bleibt zu generisch fuer Headless/LAN
- Risiko: Fehlertexte nennen keine konkreten host-offenen Startkommandos und fuehren zu Trial-and-Error im LAN-Setup.
- Impact: Mittel bis hoch, Inbetriebnahme dauert zu lange und wird inkonsistent durchgefuehrt.
- Gegenmassnahme: feste Guided-Fix-Texte mit konkretem Kommando (`node server.mjs --host 0.0.0.0 --port 4173`) und Hinweis, dass statischer Python-Server fuer Save nicht ausreicht.

## R66 Save- und Diagnose-Resolver driften auseinander
- Risiko: Diagnose zeigt einen anderen Host/Endpoint als der echte Save-Call; Operator korrigiert dadurch das falsche System.
- Impact: Hoch, Fehlerbehebung wird verlangsamt und wirkt zufaellig.
- Gegenmassnahme: identischer Resolve-Snapshot fuer Save und Diagnose (`UI-Host`, `API-Host`, Quelle, Endpoint, Methode) als verpflichtender Guard.

## R67 Kein echter Negativ-zu-Positiv-Roundtrip in der Abnahme
- Risiko: Ohne expliziten Test `python-static negativ -> node-api positiv` bleibt die Kernfehlkonfiguration unentdeckt.
- Impact: Hoch, Release besteht Teiltests, scheitert aber erneut im produktiven headless/LAN-Betrieb.
- Gegenmassnahme: Pflichtabnahme erweitert um realen Python-Static-Negativtest plus direkten Node-API-Positivtest auf gleichem Host/Port.
