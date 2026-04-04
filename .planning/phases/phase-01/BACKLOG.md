# Phase 1 Backlog

Prioritaetslegende: P0 = kritisch, P1 = hoch, P2 = mittel.

## Epic 1 - Projection Core

### P1-S1.1 Board laden
- Als Operator moechte ich ein Nemesis-Board auswaehlen.
- Akzeptanzkriterien:
  - Beide Boardbilder sind auswaehlbar.
  - Wechsel dauert unter 1 Sekunde.
  - Projektion bleibt stabil ohne sichtbares Flackern.

### P1-S1.2 Basis-Kalibrierung
- Als Operator moechte ich Offset/Scale/Rotation in Echtzeit anpassen.
- Akzeptanzkriterien:
  - X/Y/Scale/Rotation reagieren sofort.
  - Werte bleiben waehrend Session erhalten.
  - Anpassung ohne Neustart moeglich.

### P1-S1.3 [P0] Hitarea Feinkalibrierung pro Board
- Als Operator moechte ich Hitarea-Offset und Hitarea-Scale pro Board manuell kalibrieren und speichern.
- Akzeptanzkriterien:
  - Es gibt eine kleine Einstellungsseite mit Slidern fuer Hitarea-X, Hitarea-Y und Hitarea-Scale.
  - Werte wirken live auf Hover/Hit-Test und sind ohne App-Neustart pruefbar.
  - Werte werden pro Board persistent gespeichert und beim Board-Wechsel korrekt geladen.
  - Auto-Tuning ist fuer diesen Pfad deaktiviert bzw. nicht mehr Teil der Bedienung.

### P1-S1.4 [P0] Raumindividuelle Geometrie-Kalibrierung
- Als Operator moechte ich jeden Raum einzeln kalibrieren koennen, inklusive relativer oder absoluter Positionierung.
- Akzeptanzkriterien:
  - Pro Raum sind X/Y-Parameter vorhanden und live wirksam auf Hit-Test, Hover und Render-Clip.
  - Pro Raum kann zwischen `relativ` und `absolut` umgestellt werden; Modus ist pro Raum persistent.
  - Distanzen zwischen Raeumen lassen sich sichtbar korrigieren, ohne andere Raumdaten unkontrolliert zu verschieben.

### P1-S1.5 [P0] Unabhaengiges Stretching pro Raum
- Als Operator moechte ich Breite und Hoehe je Raum separat skalieren.
- Akzeptanzkriterien:
  - Jeder Raum hat getrennte Werte fuer `stretchX` und `stretchY`.
  - Aenderungen sind live sichtbar und beeinflussen Klickflaeche plus Polygon-Clip deckungsgleich.
  - Reset pro Raum stellt definierte Board-Defaults wieder her.

### P1-S1.6 [P1] Persistenzprofil pro Board (Geometry + Shapes)
- Als Operator moechte ich die gesamte Geometrie- und Polygonkonfiguration board-spezifisch laden und speichern.
- Akzeptanzkriterien:
  - Persistiert werden globale Kalibrierung, raumindividuelle Position/Stretch und Spezialraum-Polygone pro Board.
  - Board-Wechsel laedt konsistent das passende Profil ohne Datenverlust.
  - Nach App-Neustart sind die zuletzt gespeicherten Boardprofile reproduzierbar vorhanden.

### P1-S1.7 [P0] Persistenz-Rueckwaertskompatibilitaet fuer kalibrierte Bestandsdaten
- Als Operator moechte ich bestehende Kalibrierprofile weiterverwenden, auch wenn das Profilschema erweitert wurde.
- Akzeptanzkriterien:
  - Legacy-Raumdaten (globale Kalibrierung, Raumgeometrie, Spezialraum-Polygone) werden beim Laden deterministisch in das aktuelle Profil uebernommen.
  - Bestehende kalibrierte Raumdaten bleiben ohne manuelle Neuanlage editier- und triggerbar.
  - Save/Reload/App-Neustart erzeugen keinen Datenverlust zwischen Legacy- und aktuellem Profilformat.

### P1-S1.8 [P0] Persistenzschutz fuer gezeichnete Spezialraum-Polygone
- Als Operator moechte ich bereits gezeichnete Spezialraum-Polygone sicher behalten, auch nach weiteren Geometrie-/Render-Anpassungen.
- Akzeptanzkriterien:
  - Vorhandene Spezialraum-Polygone bleiben bei Save/Reload/App-Neustart unveraendert erhalten.
  - Ein Wechsel zwischen `Dashboard` und `Settings` veraendert Polygondaten nicht implizit.
  - Persistenz ist board-spezifisch und ueberschreibt keine Daten des jeweils anderen Boards.

### P1-S1.9 [P1] Persistenz fuer Ship-Polygon + Outside-Settings pro Board
- Als Operator moechte ich das Schiffspolygon und die Outside-Effekt-Settings pro Board dauerhaft speichern.
- Akzeptanzkriterien:
  - Ship-Polygon und Outside-Effekt-Settings werden board-spezifisch persistiert und bei Boardwechsel korrekt geladen.
  - Save/Reload/App-Neustart behalten beide Datentypen ohne Verlust oder Vermischung zwischen Board A/B.
  - Bestehende Profile ohne Ship-Polygon/Outside-Settings bleiben ladbar (kompatibler Default/Fallback).

### P1-S1.10 [P0] Globale Default-Config aus Browserdaten schreiben (Single-User)
- Als Operator moechte ich meinen aktuellen lokalen Settings-Stand als globale Default-Config im Repo/Server speichern koennen.
- Akzeptanzkriterien:
  - Es gibt einen server-/repo-seitigen Persistenzpfad fuer eine globale Default-Config (Single-User-Setup).
  - Schreibvorgang verwendet den aktuellen Browserzustand als Quelle und uebernimmt Geometrie-/Polygon-/Outside-Daten vollstaendig.
  - Bestehende lokale Polygondaten gehen beim Export in die globale Default-Config nicht verloren.
  - Ein erneuter App-Start kann die gespeicherte globale Default-Config reproduzierbar laden.

### P1-S1.11 [P0] Robuster POST-Save-Pfad fuer globale Defaults im Zielsetup
- Als Operator moechte ich, dass `Speichern` fuer globale Defaults im vorgesehenen Setup zuverlaessig funktioniert und nicht an `501 Unsupported method POST` scheitert.
- Akzeptanzkriterien:
  - Der Save-Pfad nutzt im vorgesehenen Start-Setup einen POST-faehigen API-Server und liefert bei korrektem Setup einen erfolgreichen Persistenz-Write.
  - Aufruf ueber statischen Server/File-Host wird sauber erkannt; der Flow faellt kontrolliert in den klaren Fehlerpfad statt in einen unlesbaren Rohfehler.
  - Save bleibt nicht-destruktiv fuer lokale Browserdaten und behaelt bestehende Ship-/Spezialraum-Polygone unveraendert.

### P1-S1.12 [P1] Optionaler Export-Fallback bei fehlendem API-Server
- Als Operator moechte ich bei nicht verfuegbarem API-Server optional einen Download/Export ausloesen koennen, um den aktuellen Stand nicht zu verlieren.
- Akzeptanzkriterien:
  - Bei fehlender API ist ein optionaler Export-/Downloadpfad verfuegbar.
  - Der Fallback ist klar als Ersatz fuer den Moment gekennzeichnet, nicht als neuer Standard-Save.
  - Primaerer Server-Save bleibt unveraendert sichtbar und wird nicht durch den Fallback ersetzt.

### P1-S1.13 [P0] API-Base-Aufloesung + Fallback fuer statisches Frontend-Hosting
- Als Operator moechte ich den API-Endpunkt fuer `Speichern` explizit setzen koennen und bei statischem Frontend-Hosting einen robusten Port-Fallback haben.
- Akzeptanzkriterien:
  - Save-Flow nutzt eine dokumentierte Endpoint-Prioritaet (explizite API-Base-Konfiguration vor automatischem Fallback).
  - Bei statischem Frontend-Hosting wird ein passender API-Endpunkt deterministisch gefunden oder sauber als nicht erreichbar klassifiziert.
  - Die Endpoint-Aufloesung ist fuer den Operator nachvollziehbar (in Diagnose oder Save-Feedback sichtbar).

### P1-S1.14 [P0] Save-Guard mit vorgelagertem API-Health-Check
- Als Operator moechte ich vor dem Schreiben erkennen, ob die API erreichbar und POST-faehig ist, damit Save-Fehler vorhersagbar und handhabbar bleiben.
- Akzeptanzkriterien:
  - Save prueft vor `POST /api/global-defaults` die API-Erreichbarkeit (Health oder gleichwertiger Probe-Call).
  - Bei nicht erreichbarer API wird kein blinder POST versucht; stattdessen folgt ein klar klassifizierter Fehlerpfad.
  - Bei erreichbarer API und erlaubtem POST wird Save reproduzierbar erfolgreich ausgefuehrt.

### P1-S1.15 [P0] LAN-sichere API-Host-Aufloesung fuer Save
- Als Operator moechte ich bei remote/headless Nutzung (UI per LAN-IP auf anderem Geraet) automatisch den richtigen API-Host nutzen, ohne auf `localhost` des Client-Geraets zu fallen.
- Akzeptanzkriterien:
  - Bei UI-Aufruf ueber `http://<lan-ip>:<port>` verwendet Save standardmaessig denselben Host fuer API-Kandidaten.
  - `localhost`/`127.0.0.1` wird nur dann als Default-Kandidat genutzt, wenn die UI selbst lokal darueber aufgerufen wurde.
  - Endpoint-Resolver bleibt deterministisch und zeigt im Fehlerfall den final gewaehlten Host nachvollziehbar an.

### P1-S1.16 [P0] API-Override bleibt kompatibel bei LAN-Default
- Als Operator moechte ich weiterhin einen expliziten API-Host setzen koennen, auch wenn der neue LAN-Default aktiv ist.
- Akzeptanzkriterien:
  - Explizite API-Overrides (z. B. global var/URL/localStorage) haben weiterhin Vorrang vor automatischer Host-Aufloesung.
  - Override-Quelle und finaler Endpoint sind im Diagnose-/Save-Feedback klar ersichtlich.
  - Ohne Override bleibt der LAN-sichere Default aktiv und funktioniert reproduzierbar.

### P1-S1.17 [P0] Static-only-Server-Erkennung fuer Save-Preflight
- Als Operator moechte ich explizit erkennen, wenn ich gegen einen statischen Server (z. B. Python `http.server`) statt gegen eine API laufe, damit ich den Fehler sofort korrekt behebe.
- Akzeptanzkriterien:
  - Preflight klassifiziert `GET /api/health` mit `404` plus typischer Static-Signatur (Header/Body) als `static-only` statt als generischen API-Fehler.
  - Erkannte `static-only`-Faelle blockieren den POST-Save deterministisch und melden klar `Static-only Server aktiv, Save nicht moeglich`.
  - Erkennung deckt den realen Betriebsfall `python3 -m http.server 4173` reproduzierbar ab.

### P1-S1.18 [P0] Host-transparenter Resolver-Snapshot ohne Remote-Localhost-Drift
- Als Operator moechte ich in Save und Diagnose dieselbe, transparente Host-Aufloesung sehen, damit kein verwirrender `localhost`-Fallback im LAN-Betrieb entsteht.
- Akzeptanzkriterien:
  - Save und Diagnose nutzen einen identischen Resolve-Snapshot (`UI-Host`, `API-Host`, Resolver-Quelle, Endpoint, Methode).
  - Bei UI-Aufruf ueber LAN-IP wird kein stiller Fallback auf Client-`localhost` angezeigt oder verwendet, ausser bei explizitem Override.
  - Fehlermeldungen bleiben host-konsistent und widersprechen sich zwischen Diagnose und Save nicht.

## Epic 2 - Effect Engine

### P1-S2.1 Dauerhafte Atmosphaere
- Als Gruppe moechte ich subtile Ambient-Effekte sehen.
- Akzeptanzkriterien:
  - Ambient Drift ein/aus.
  - Ash Fall ein/aus.
  - Hull Flicker ein/aus.

### P1-S2.2 [P1] Event-Effekte Basis
- Als Operator moechte ich situative Effekte sofort ausloesen.
- Akzeptanzkriterien:
  - Intruder Alert, Reactor Pulse und Power Outage triggerbar.
  - Effektstart unter 150 ms nach Klick.
  - Sichtbarer Power-Outage-Effekt ist separat verfuegbar und klar erkennbar.

### P1-S2.4 [P0] Power Outage Prioritaetspfad
- Als Operator moechte ich Power Outage jederzeit zuverlaessig triggern.
- Akzeptanzkriterien:
  - Power Outage hat dedizierten Triggerpfad mit sichtbarer Rueckmeldung.
  - Startlatenz bleibt unter 150 ms auch unter Last.
  - Gleichzeitiges `Clear All` fuehrt zu deterministischem Stop-Verhalten.

### P1-S2.5 [P1] Per-Room Animation Config
- Als Operator moechte ich Effekte pro Raum konfigurieren.
- Akzeptanzkriterien:
  - Raum-Submenu bietet Animation, Intensitaet sowie Dauer/Hold.
  - Start erzeugt raumspezifische Animation mit Scope `room`.
  - Rendering ist auf das Polygon des gewaehlten Raums geclippt.

### P1-S2.6 [P1] Event-Sound Layer
- Als Operator moechte ich relevante Event-Sounds gezielt mit den Triggern ausloesen.
- Akzeptanzkriterien:
  - Intruder Alert, Reactor Pulse und Power Outage spielen jeweils einen zugeordneten Sound ab.
  - Soundstart erfolgt unter 150 ms nach Trigger.
  - Bei deaktiviertem Audio-Master werden keine Event-Sounds abgespielt.
  - Lautstaerke-Setting wirkt sofort auf neu getriggerte Event-Sounds.

### P1-S2.7 [P0] Spezialraum-Animation Runtime-Fix
- Als Operator moechte ich, dass Spezialraum-Animationen sichtbar laufen, wenn sie in der Running-List aktiv sind.
- Akzeptanzkriterien:
  - Jeder Start einer Spezialraum-Animation erzeugt sichtbares Rendering im Zielraum.
  - Running-List-Status und sichtbarer Effektzustand sind konsistent (kein Ghost-Running ohne Visual).
  - Stop/Edit fuer Spezialraum-Eintraege bleibt funktional.

### P1-S2.8 [P0] Alarm-Beacon Isolationsfix
- Als Operator moechte ich `Alarm Beacon` mit Spezialraeumen kombinieren koennen, ohne dass andere Visuals ausfallen.
- Akzeptanzkriterien:
  - Triggerfolge `Spezialraum` + `Alarm Beacon` stoppt weder globalen Timer noch andere laufende Animationen.
  - Audio kann parallel laufen, ohne den visuellen Pipelinezustand zu beeinflussen.
  - Fehler in einem Effektpfad fuehren nicht mehr zum kompletten Visual-Reset.

### P1-S2.9 [P0] Vollflaechige Spezialraum-Animationen
- Als Operator moechte ich, dass raumspezifische Animationen die gesamte Ziel-Polygonflaeche ausfuellen, auch bei sehr grossen Spezialraeumen.
- Akzeptanzkriterien:
  - Die Render-Skalierung orientiert sich an der kompletten Polygon-Bounding-Box des Zielraums.
  - Es entstehen keine deutlich unterfuellten Insel-Effekte in grossen Polygonen.
  - Clip und Animation bleiben deckungsgleich ueber die volle Flaeche.

### P1-S2.10 [P0] Assetbasierter Event-Sound Layer
- Als Operator moechte ich fuer kritische Trigger vorhandene Sounddateien nutzen statt rein synthetischer Cues.
- Akzeptanzkriterien:
  - Intruder Alert, Reactor Pulse und Power Outage spielen jeweils gemappte Sounds aus `resources/nemesis/sounds/`.
  - Mapping ist nachvollziehbar dokumentiert und deckt mindestens `alarm.mp3`, `electricity.mp3`, `monsters/048.wav`, `power/3.wav` sinnvoll ab.
  - Audio-Master `off` unterdrueckt alle Event-Sounds; Volume wirkt sofort auf neu gestartete Asset-Sounds.

### P1-S2.11 [P0] Globaler Outside-Effekt mit Ship-Maske
- Als Operator moechte ich einen globalen Weltraum-Outside-Effekt ein-/ausschalten koennen, der nur ausserhalb des Schiffes sichtbar ist.
- Akzeptanzkriterien:
  - Outside-Effekt ist als globaler Trigger/Toggle vorhanden und ohne Neustart umschaltbar.
  - Rendering ist konsequent auf den Bereich ausserhalb des Ship-Polygons maskiert.
  - `Clear All` stoppt auch den Outside-Effekt deterministisch.

### P1-S2.12 [P0] Sound-Lifecycle an Animationslaufzeit koppeln
- Als Operator moechte ich, dass zugeordnete Sounds nur waehrend der aktiven Animation laufen und bei langen Animationen automatisch geloopt werden.
- Akzeptanzkriterien:
  - Start einer Animation startet den zugeordneten Sound synchron; endet/stoppt die Animation, stoppt der Sound sofort.
  - Wenn die Animation laenger als die Sounddatei laeuft, wird der Sound ohne Luecke geloopt bis zum Animationsende.
  - `Stop` und `Clear All` beenden alle zugehoerigen Sounds deterministisch ohne Restton.

### P1-S2.13 [P1] Allgemeine Animationsgeschwindigkeit steuern
- Als Operator moechte ich die Geschwindigkeit von Animationen global anpassen koennen, um die Wirkung an den Tischzustand anzupassen.
- Akzeptanzkriterien:
  - Es gibt mindestens einen globalen Speed-Regler/Faktor in den allgemeinen Animations-Settings.
  - Aenderungen wirken ohne Neustart unmittelbar auf den Renderpfad.
  - Speed-Aenderungen brechen weder Laufzeitliste noch Stop/Edit-Verhalten.

### P1-S2.14 [P1] Immersive Outside-Alternativanimation
- Als Operator moechte ich fuer den Outside-Bereich zwischen Standard- und immersiver Alternativanimation umschalten koennen.
- Akzeptanzkriterien:
  - UI bietet einen klaren Modus-Toggle/Selector fuer Outside (`Standard`/`Immersive`).
  - Beide Modi bleiben auf denselben Outside-Maskenbereich ausserhalb des Ship-Polygons begrenzt.
  - Moduswechsel zur Laufzeit verursacht keinen Ausfall bestehender Outside- oder anderer Animationen.

### P1-S2.15 [P0] Fachliche Trennung globaler Animationen in Inside/Outside
- Als Operator moechte ich globale Animationen klar in `Innerhalb des Schiffs` und `Ausserhalb des Schiffs` getrennt steuern, damit die Wirkung eindeutig bleibt.
- Akzeptanzkriterien:
  - Globale Animationen sind in Runtime-Modell und UI in zwei getrennte Kategorien aufgeteilt (`inside-ship`, `outside-ship`).
  - Start/Stop/Running-List zeigt die Kategorie pro Eintrag eindeutig an.
  - `Clear All` stoppt beide Kategorien deterministisch, ohne die Trennung aufzuheben.

### P1-S2.16 [P0] Immersiver Outside-High-Speed-Layer
- Als Operator moechte ich fuer den Aussenbereich eine deutlich immersivere Hochgeschwindigkeitsdarstellung sehen.
- Akzeptanzkriterien:
  - Outside-Rendering nutzt mehrlagige Sternenbewegung mit klar wahrnehmbarer Parallax und Richtung.
  - Bewegung vermittelt hohen Vorbeiflug-/Raumfluss-Eindruck auch bei laengerer Laufzeit.
  - Intensitaet/Geschwindigkeit bleiben ueber bestehende Outside-Settings steuerbar.

### P1-S2.17 [P0] Outside-Layer-Isolation gegen Innenraumbeeinflussung
- Als Operator moechte ich sicher sein, dass Outside-Animationen keine Innenraum-Layer veraendern oder verdecken.
- Akzeptanzkriterien:
  - Outside-Effekte bleiben strikt auf den Bereich ausserhalb des Ship-Polygons begrenzt.
  - Innenraum-Animationen (global-inside und room-scope) laufen unveraendert weiter, wenn Outside aktiv ist.
  - Es gibt keinen visuellen, timing- oder state-basierten Seiteneffekt auf Innenraum-Trigger und Raum-Renderer.

### P1-S2.18 [P0] Bidirektionales Ship-Clipping fuer Inside/Outside
- Als Operator moechte ich eindeutige Layer-Grenzen, damit Inside-Effekte niemals ausserhalb und Outside-Effekte niemals innerhalb des Schiffs erscheinen.
- Akzeptanzkriterien:
  - Inside-Animationen sind ausschliesslich innerhalb des Ship-Polygons sichtbar.
  - Outside-Animationen sind ausschliesslich ausserhalb des Ship-Polygons sichtbar.
  - Bei fehlender/ungueltiger Maske entsteht kein Fullscreen-Leak; betroffene Layer werden fail-safe deaktiviert.

### P1-S2.19 [P0] Outside-Visual als High-Speed-Spaceflow
- Als Operator moechte ich statt glitzerartiger Partikel einen klaren Hochgeschwindigkeits-Raumflug sehen.
- Akzeptanzkriterien:
  - Outside-Renderer nutzt mehrere Sternen-Tiefenebenen mit deutlich unterschiedlichen Geschwindigkeiten.
  - Motion-Streaks/Striche simulieren Vorbeiflug klar sichtbar ueber die gesamte Laufzeit.
  - Intensitaet und Speed bleiben ueber vorhandene Outside-Controls steuerbar, ohne Innenraumregression.

### P1-S2.20 [P0] Outside-Richtungsumschaltung zur Laufzeit
- Als Operator moechte ich die Outside-Bewegungsrichtung zwischen vorwaerts und rueckwaerts umschalten koennen.
- Akzeptanzkriterien:
  - Outside bietet eine explizite Richtungsoption (`forward`/`reverse`) in der UI.
  - Richtungswechsel wirkt waehrend laufender Session sofort auf Sterne und Streaks, ohne Layer-Neustartpflicht.
  - Umschalten beeinflusst weder Inside-Layer noch Running-List-/Stop-Pfade.

### P1-S2.21 [P0] Outside-Background strikt tiefschwarz
- Als Operator moechte ich einen tiefschwarzen Outside-Bereich ohne blauen Hintergrund sehen.
- Akzeptanzkriterien:
  - Outside rendert keinen blauen Flaechenhintergrund mehr.
  - Sichtbar bleiben nur Stern-/Streak-Elemente auf schwarzer Basis.
  - Die schwarze Basis bleibt mit Intensitaet/Speed/Richtung konsistent und leak-frei ausserhalb der Ship-Maske.

### P1-S2.22 [P0] Instanzscharfes Runtime-Modell fuer Room-Animation-Parameter
- Als Operator moechte ich, dass pro laufender Room-Animation eigene Werte fuer Speed, Intensity und Sound-Volume gespeichert und verwendet werden.
- Akzeptanzkriterien:
  - Runtime-Eintrag jeder Room-Animation enthaelt instanzbezogen `speed`, `intensity` und `soundVolume`.
  - Mehrere gleichartige Room-Animationen koennen parallel mit unterschiedlichen Werten laufen, ohne gegenseitige Ueberschreibung.
  - Stop/Edit/Ablauf verwenden durchgaengig die Parameter der jeweiligen Instanz als Source-of-Truth.

### P1-S2.3 Sicherheitssteuerung
- Als Operator moechte ich jederzeit alle Effekte stoppen.
- Akzeptanzkriterien:
  - `Clear All` stoppt alle laufenden Effekte sofort.
  - Funktion bleibt auch unter Last reaktionsfaehig.

## Epic 3 - Operator Dashboard

### P1-S3.1 [P1] Schnellbedienung
- Als Operator moechte ich Trigger blind schnell finden.
- Akzeptanzkriterien:
  - Trigger in klarem Grid.
  - Aktive Dauer-Effekte visuell markiert.
  - Kleine Displays bleiben bedienbar.

### P1-S3.2 Session-Flow
- Als Operator moechte ich Setup in wenigen Schritten erledigen.
- Akzeptanzkriterien:
  - Startablauf: Board auswaehlen, kalibrieren, loslegen.
  - Kernfunktionen ohne Untermenues erreichbar.

### P1-S3.3 [P0] Room-Click UX Precision
- Als Operator moechte ich direkt auf Raumzonen klicken, um Effekte schnell ausgeloest zu bekommen.
- Akzeptanzkriterien:
  - Raumzonen sind als echte, board-spezifische Hex-Polygone klickbar und liegen deckungsgleich auf den realen Raeumen.
  - Beide Boards bestehen den manuellen Treffer-Test fuer Rand- und Zentralraeume.
  - Hover- und Auswahlzustand sind visuell eindeutig.
  - Standard-Hexes bleiben neutral (`Hex A-01`, `Hex B-07`), ohne erfundene Zusatzsemantik.

### P1-S3.5 [P1] Running-Animations-Uebersicht
- Als Operator moechte ich alle laufenden Animationen sehen und einzeln bedienen.
- Akzeptanzkriterien:
  - Liste zeigt Scope, Raum/Global-Kontext, Intensity und Restzeit/Hold.
  - Jeder Eintrag hat `Stop`; Room-Eintraege haben zusaetzlich `Edit`.
  - `Edit` uebernimmt Werte in das Raum-Submenu.

### P1-S3.4 [P2] Output Device Auswahl
- Als Operator moechte ich das Ausgabegeraet fuer die Projektion gezielt waehlen.
- Akzeptanzkriterien:
  - Output-Routen `auto`, `beamer-fullscreen` und `windowed-preview` sind auswaehlbar.
  - Auswahl kann ohne Neustart umgestellt werden.
  - Bei Fullscreen-Fehler oder Exit greift klarer Fallback auf `windowed-preview`.

### P1-S3.6 [P1] Special-Room Mapping
- Als Operator moechte ich die fuenf zentralen Spezialraeume direkt ansteuern.
- Akzeptanzkriterien:
  - Folgende Special-Raeume sind zusaetzlich vorhanden und eindeutig markiert: `Cockpit (links)`, `Cryoschlaf (Mitte)`, `Maschinenraum 1-3 (rechts)`.
  - Die Positionen sind fuer beide Boards separat gemappt und stimmen mit den realen Raumflaechen ueberein.
  - Special-Room Auswahl funktioniert identisch zu normalen Room-Hitareas (Hover, Select, Triggerpfad).

### P1-S3.7 [P1] Audio Settings UX
- Als Operator moechte ich Event-Sounds global steuern koennen.
- Akzeptanzkriterien:
  - Settings bieten `Sound an/aus` als globalen Master-Toggle.
  - Settings bieten einen globalen Lautstaerke-Regler (0-100%).
  - Aenderungen greifen sofort ohne Neustart.

### P1-S3.8 [P0] Separate Calibration/Shape Settings UX
- Als Operator moechte ich Kalibrierung und Shape-Bearbeitung auf einer separaten Einstellungsseite durchfuehren, nicht im Haupt-Dashboard.
- Akzeptanzkriterien:
  - Haupt-Dashboard enthaelt keine Geometrie- oder Polygon-Editor-Controls mehr.
  - Settings-Seite ist klar als Setup-Bereich gekennzeichnet und vom Dashboard getrennt.
  - Board-Kontext ist immer sichtbar; Save/Reset wirkt auf das aktive Board-Profil.

### P1-S3.9 [P0] Spezialraum-Polygoneditor
- Als Operator moechte ich Spezialraum-Polygone praezise bearbeiten (Ecke einfuegen/loeschen/verschieben).
- Akzeptanzkriterien:
  - Ecken koennen an beliebiger Kante eingefuegt und wieder geloescht werden.
  - Jede Ecke kann frei per Drag verschoben werden; Form muss nicht hexagonal bleiben.
  - Beliebige Polygonform pro Spezialraum ist speicherbar und beim erneuten Laden identisch.

### P1-S3.10 [P0] Settings als echter View-Switch
- Als Operator moechte ich zwischen Dashboard und Settings eindeutig umschalten, damit Setup und Live-Bedienung nicht vermischt sind.
- Akzeptanzkriterien:
  - Beim Klick auf `Settings` ist nur die Settings-View sichtbar; Dashboard-Trigger, Raumgeometrie-Controls und laufende Dashboard-Editoren sind nicht parallel sichtbar.
  - Beim Zurueckwechsel auf `Dashboard` erscheinen nur Trigger-/Runtime-Bedienelemente; Settings-Editorzustand bleibt konsistent erhalten.
  - View-Wechsel funktioniert reproduzierbar auf Desktop und kleinem Display.

### P1-S3.11 [P0] Polygoneditor UX mit sichtbaren Vertex-Handles
- Als Operator moechte ich Spezialraum-Polygone wie in einem Grafikeditor direkt ueber Handles bearbeiten.
- Akzeptanzkriterien:
  - Jeder Vertex wird als klar sichtbarer Handle direkt auf dem Board gerendert.
  - Der ausgewaehlte Vertex ist visuell deutlich hervorgehoben (z. B. rot).
  - Ausgewaehlter Vertex kann geloescht werden (Mindestpunktzahl des Polygons bleibt abgesichert).
  - Neue Vertices koennen gezielt an Kanten eingefuegt werden.
  - Vertices lassen sich frei per Drag verschieben, inklusive sofortigem visuellen Feedback.

### P1-S3.12 [P0] Harte exklusive Sichtbarkeit je Tab
- Als Operator moechte ich pro Tab nur die jeweils relevanten UI-Elemente sehen, damit kein Mischzustand zwischen Live-Triggern und Setup entsteht.
- Akzeptanzkriterien:
  - `Dashboard` zeigt ausschliesslich Animations-/Trigger-Bedienelemente.
  - `Settings` zeigt ausschliesslich Raum-Geometrie, Polygon-Editor und Kalibrierungsfunktionen.
  - Beim Tabwechsel werden nicht relevante Bediengruppen konsequent ausgeblendet (kein partieller Leak).

### P1-S3.13 [P0] Vertex-Handle Visual Tuning
- Als Operator moechte ich transparentere Vertex-Handles sehen, damit das Boardmotiv lesbar bleibt und die Handles dennoch gut getroffen werden.
- Akzeptanzkriterien:
  - Handle-Fuellung ist deutlich transparenter als im bisherigen Stand.
  - Kontrast von Rand/Active-State bleibt ausreichend fuer schnelle Selektion.
  - Pointer-/Touch-Hitflaeche bleibt robust, trotz reduzierter visueller Dominanz.

### P1-S3.14 [P0] Tab-Exklusivitaet ohne Rest-Leaks
- Als Operator moechte ich je Tab nur den exakt vorgesehenen Arbeitsbereich sehen, damit keine Fehlbedienung durch gemischte UI entsteht.
- Akzeptanzkriterien:
  - `Dashboard` zeigt ausschliesslich Animations-/Trigger-Bedienelemente; Geometrie-/Polygon-/Kalibriergruppen sind vollstaendig verborgen.
  - `Settings` zeigt ausschliesslich Geometrie/Polygon/Kalibrierung; Trigger-Buttons, Running-Editorfragmente oder Dashboard-Gruppen sind unsichtbar.
  - Der Wechsel `Dashboard` <-> `Settings` bleibt reproduzierbar leak-frei (inkl. Resize/Small-Screen).

### P1-S3.15 [P0] Fixed-Board Layout mit isoliertem Control-Scroll
- Als Operator moechte ich das Board beim Scrollen fixiert sehen, damit die Orientierung auf der Projektionsflaeche stabil bleibt.
- Akzeptanzkriterien:
  - Das Board bleibt in der Hauptansicht sichtbar fixiert/sticky, waehrend der rechte Steuerbereich unabhaengig vertikal scrollt.
  - Es gibt keinen Gesamtseiten-Scroll, der das Board aus dem sichtbaren Bereich schiebt.
  - Das Verhalten ist auf Desktop und kleinem Display konsistent und ohne Bedienblocker.

### P1-S3.16 [P0] Klare Running-Animations-Zone
- Als Operator moechte ich aktive Animationen in einem separaten, sofort sichtbaren Bereich sehen, um schnell stoppen/editieren zu koennen.
- Akzeptanzkriterien:
  - Aktive Animationen sind als eigener Abschnitt klar vom Triggerbereich getrennt platziert.
  - Abschnitt bleibt beim Arbeiten im rechten Steuerbereich schnell erreichbar und visuell priorisiert.
  - Stop/Edit-Aktionen bleiben unveraendert funktional und eindeutig dem Running-Abschnitt zugeordnet.

### P1-S3.17 [P0] Board-Zoom im Settings-Polygoneditor
- Als Operator moechte ich das Board im Settings-Tab zoomen koennen, um Polygonpunkte praezise zu bearbeiten.
- Akzeptanzkriterien:
  - Im Settings-Tab steht ein stufenloser Zoom fuer das Board zur Verfuegung (inkl. sinnvoller Min/Max-Grenzen).
  - Vertex-Handles und Kanten bleiben bei gezoomter Ansicht selektier- und verschiebbar.
  - Zoomzustand ist waehrend der laufenden Settings-Bearbeitung stabil und kann auf Fit/Default zurueckgesetzt werden.

### P1-S3.18 [P0] Spezialraum-Klick synchronisiert Polygon-Editor-Auswahl
- Als Operator moechte ich per Klick auf einen Spezialraum im Settings-Board direkt den passenden Eintrag im Polygon-Editor ausgewaehlt haben.
- Akzeptanzkriterien:
  - Klick auf einen Spezialraum setzt unmittelbar den identischen Raum im Polygon-Editor-Dropdown.
  - Die aktuelle Selektion ist visuell eindeutig am Board und im Dropdown synchron sichtbar.
  - Synchronisation funktioniert fuer alle 5 Spezialraeume auf Board A und Board B.

### P1-S3.19 [P0] Sticky Running-Animations-Block im Dashboard
- Als Operator moechte ich den Block `Aktive Animationen` beim Scrollen dauerhaft sichtbar haben, um Stop/Edit ohne Zurueckscrollen auszufuehren.
- Akzeptanzkriterien:
  - Der Block `Aktive Animationen` bleibt im Dashboard waehrend des Scrollens sticky im sichtbaren Bereich.
  - Sticky-Verhalten kollidiert nicht mit Triggergruppen, Tab-Switch oder Small-Screen-Bedienung.
  - Stop/Edit im sticky Block bleibt ohne Fokusverlust bedienbar.

### P1-S3.20 [P0] Zoom-Pan im Settings-Board
- Als Operator moechte ich das gezoomte Board im Settings-Tab mit der Maus verschieben koennen, damit ich entfernte Polygonbereiche ohne Zoom-Reset erreiche.
- Akzeptanzkriterien:
  - Pan ist im Settings-Tab klar definiert: primaer `Space + Linke-Maus-Drag`; optional mittlere Maustaste als gleichwertiger Alias.
  - Pan wirkt nur auf die Board-Ansicht (Viewport), nicht auf gespeicherte Raum-/Polygonkoordinaten.
  - Pan ist bei Zoom > 100% fluesig und bleibt mit Fit/Reset reproduzierbar kombinierbar.

### P1-S3.21 [P0] Interaktions-Guards fuer Pan vs Polygon-Edit
- Als Operator moechte ich trotz Pan-Funktion weiterhin exakt auf Raeume und Vertices klicken/draggen koennen, ohne Fehlmodus.
- Akzeptanzkriterien:
  - Ohne gedrueckte `Space`-Taste bleibt Linksklick-Drag vollstaendig im Polygon-Edit-Modus (Vertex bewegen, Kante einfuegen, Raum selektieren).
  - Mit gedrueckter `Space`-Taste startet kein Vertex-/Room-Edit, sondern ausschliesslich Pan.
  - Pointer-Capture und Mode-Wechsel sind robust: losgelassene `Space`-Taste oder Pointer-Up beendet Pan deterministisch.
  - Bestehende Zoom-Workflows (Handle-Selektion, Vertex-Drag, Insert/Delete) zeigen keine Regression.

### P1-S3.22 [P0] Ship-Polygon-Editor im Settings-Tab
- Als Operator moechte ich das gesamte Schiff als Polygon in `Settings` markieren und bearbeiten, um die Outside-Maske korrekt abzuleiten.
- Akzeptanzkriterien:
  - `Settings` bietet fuer das Ship-Polygon dieselben Kerninteraktionen wie beim Spezialraum-Editor (Insert/Delete/Drag, aktive Ecke sichtbar).
  - Die aus dem Ship-Polygon abgeleitete Outside-Maske aktualisiert sich live bei jeder Polygonaenderung.
  - Ship-Polygon-Bearbeitung bleibt unter Zoom/Pan stabil und kollidiert nicht mit bestehender Spezialraum-Bearbeitung.

### P1-S3.23 [P0] Editierbares Sound-Mapping pro Animation
- Als Operator moechte ich pro Animation direkt in der UI festlegen koennen, welcher Sound abgespielt wird.
- Akzeptanzkriterien:
  - Jede relevante Animation bietet ein editierbares Sound-Feld (Asset-Auswahl oder `none`).
  - Mapping-Aenderungen greifen fuer neue Trigger sofort ohne Neustart.
  - Fehlende/ungueltige Zuordnungen haben einen sichtbaren Fallback (z. B. stumm oder dokumentierter Default) ohne Runtime-Fehler.

### P1-S3.24 [P1] Outside-Modus-Option in Settings
- Als Operator moechte ich den Outside-Modus in den Settings schnell umschalten, ohne andere Outside-Parameter zu verlieren.
- Akzeptanzkriterien:
  - Outside-Modus ist als eigener UI-Parameter in den Settings verfuegbar.
  - Bestehende Outside-Controls (enable/intensity/speed) bleiben funktionsfaehig und unveraendert bedienbar.
  - Der Modus bleibt bei Save/Reload/Boardwechsel konsistent im aktiven Boardprofil.

### P1-S3.25 [P0] Dashboard strikt auf Trigger/Stop begrenzen
- Als Operator moechte ich im Dashboard ausschliesslich Live-Bedienung (Triggern/Stoppen), um Fehlkonfigurationen waehrend der Session zu vermeiden.
- Akzeptanzkriterien:
  - `Dashboard` zeigt nur Triggerflaechen und Running-Animations-Bedienung (`Stop`, ggf. laufzeitbezogene Runtime-Controls).
  - Im `Dashboard` gibt es keine Settings-, Mapping-, Calibration- oder Editor-Controls.
  - Tabwechsel fuehrt nicht zu Rest-Leaks von Konfigurationsbedienung im Dashboard.

### P1-S3.26 [P0] Konfiguration exklusiv in Settings konsolidieren
- Als Operator moechte ich alle Konfigurationswege zentral im Settings-Tab haben, damit die Zustandsverantwortung eindeutig ist.
- Akzeptanzkriterien:
  - Mapping-, Calibration- und Editorfunktionen sind nur in `Settings` vorhanden.
  - Outside-Konfiguration (inkl. Modus/Speed/Intensity/Maskenquelle) bleibt vollstaendig in `Settings`.
  - Globale Inside/Outside-Kategorien sind im Settings-Kontext klar benannt und fuer den Operator nachvollziehbar.

### P1-S3.27 [P0] Settings-Button `Speichern` fuer globale Defaults
- Als Operator moechte ich im Settings-Tab per explizitem Button meinen aktuellen lokalen Stand in die globale Default-Config schreiben.
- Akzeptanzkriterien:
  - `Settings` zeigt einen klar benannten Button `Speichern` fuer den Export `Browserdaten -> globale Defaults`.
  - Save-Rueckmeldung zeigt Erfolg/Fehler ohne stilles Scheitern; bei Erfolg ist der Persistenzstand nachvollziehbar.
  - Button-Flow veraendert lokale Browserdaten nicht destruktiv und verliert keine vorhandenen Ship-/Spezialraum-Polygone.

### P1-S3.28 [P0] Per-Room-Controls um Speed/Intensity/Sound-Volume pro Instanz erweitern
- Als Operator moechte ich pro einzelner Room-Animation Geschwindigkeit, Intensitaet und Sound-Lautstaerke einstellen koennen.
- Akzeptanzkriterien:
  - Room-Submenu und/oder Edit-Dialog bietet `Speed`, `Intensity` und `Sound Volume` als klar erkennbare Felder.
  - Start uebernimmt die Werte in den erzeugten Room-Runtime-Eintrag; erneute Starts erzeugen neue Instanzen mit jeweils eigenen Werten.
  - Werteaenderungen sind hoer-/sichtbar und verursachen keine Regression bei Clip, Running-Liste oder Stop-Verhalten.

### P1-S3.29 [P0] Running-Edit wendet Aenderungen auf bestehende Instanz an
- Als Operator moechte ich bei Klick auf `Edit` eine laufende Room-Animation laden und genau diese Instanz aktualisieren statt eine neue zu erzeugen.
- Akzeptanzkriterien:
  - `Edit` ist fuer laufende Room-Eintraege aktiv und oeffnet den Editor mit den aktuellen Instanzwerten.
  - Speichern aus dem Edit-Flow aktualisiert dieselbe `animation.id` (in-place) und erzeugt keinen zusaetzlichen Running-Eintrag.
  - Der derzeitige P0-Defekt (`Edit` inaktiv/funktionslos) ist behoben und durch Regressionstest abgesichert.

### P1-S3.30 [P0] Save-Fehlermeldung bei fehlendem API-Server verstaendlich machen
- Als Operator moechte ich bei nicht laufendem API-Server eine kurze, klare Fehlermeldung mit konkreter Startanweisung erhalten statt eines HTML-Fehlerdumps.
- Akzeptanzkriterien:
  - Save-Fehler durch fehlenden POST-Server zeigen einen kompakten Klartext (kein HTML-Rohinhalt in Toast/Dialog).
  - Fehlermeldung enthaelt eine konkrete Startanweisung (z. B. `node server.mjs`) fuer den API-Server.
  - Fehlerzustand bleibt fuer Operator eindeutig (`Save fehlgeschlagen` + naechster Schritt), ohne die UI zu blockieren.

### P1-S3.31 [P0] Start-Flow fuer POST-faehigen Server dokumentieren
- Als Operator moechte ich klar dokumentiert sehen, welcher Server fuer `POST / globale Defaults` noetig ist und wie ich ihn starte.
- Akzeptanzkriterien:
  - Doku beschreibt kurz und eindeutig: statischer Server allein reicht nicht fuer Save via POST.
  - Doku enthaelt eine minimale Schrittfolge zum Start des API-Servers und zum Start des Frontends.
  - Save-Button-Text/Hinweis und README-Startanleitung sind konsistent.

### P1-S3.32 [P0] Endpoint-transparente Save-Fehlermeldung
- Als Operator moechte ich im Save-Fehlerfall den konkret verwendeten API-Endpunkt sehen, damit ich zielgerichtet korrigieren kann.
- Akzeptanzkriterien:
  - Save-Feedback nennt den final verwendeten Endpoint (Schema/Host/Port/Pfad) und die Methode (`POST`).
  - Fehlermeldung unterscheidet mindestens `API nicht erreichbar`, `POST nicht erlaubt`, `Serverfehler` und nennt je Fall den naechsten Schritt.
  - Es werden keine Roh-HTML-Fehlerseiten im UI angezeigt.

### P1-S3.33 [P0] API-Diagnose im Save-Flow
- Als Operator moechte ich die API-Faehigkeit ohne separaten Diagnose-Button nachvollziehen koennen, damit Save-Probleme weiterhin zielgerichtet behebbar bleiben.
- Akzeptanzkriterien:
  - Save-Flow prueft mindestens Erreichbarkeit (Health) und POST-Faehigkeit fuer den Save-Endpunkt.
  - Diagnoseinformationen sind im Settings-/Save-Feedback sichtbar, ohne dass ein eigener `API Diagnose`-Button noetig ist.
  - Ergebnis zeigt pro Check klare Handlungsschritte (z. B. API starten, Port anpassen, Proxy konfigurieren).

### P1-S3.34 [P0] Reproduzierbarer Global-Defaults-Save bei laufendem API-Server
- Als Operator moechte ich bei korrekt laufendem API-Server den Save-Vorgang mehrfach hintereinander erfolgreich ausfuehren koennen.
- Akzeptanzkriterien:
  - Mehrere aufeinanderfolgende Save-Vorgaenge liefern konsistent Erfolg ohne intermittierende 4xx/5xx-Fehler.
  - Nach Reload/Restart bleibt die zuletzt gespeicherte globale Default-Config konsistent ladbar.
  - Save-Erfolg/Fehler ist im UI klar unterscheidbar und ohne Mehrdeutigkeit protokolliert.

### P1-S3.35 [P0] Host-transparente Save-/Diagnose-Fehlermeldung fuer Remote-Setup
- Als Operator moechte ich in Save- und Diagnosemeldungen explizit sehen, welcher UI-Host und welcher API-Host verwendet wurde, damit Remote-Fehlrouting sofort erkennbar ist.
- Akzeptanzkriterien:
  - Fehlermeldung und Diagnose zeigen mindestens `UI-Host`, `API-Host` und den finalen Endpoint inkl. Methode.
  - Bei erkanntem Remote-Mismatch (z. B. UI via `192.168.x.x`, API via `localhost`) wird ein klarer Hinweis mit naechstem Schritt angezeigt.
  - Roh-HTML wird weiterhin unterdrueckt; Operator sieht kurze, handlungsorientierte Texte.

### P1-S3.36 [P0] Repro-Check Save ueber LAN-IP-Aufruf
- Als Operator moechte ich den Save-Pfad explizit im LAN-Szenario verifiziert haben, damit der reale headless Betrieb abgesichert ist.
- Akzeptanzkriterien:
  - UI wird ueber LAN-IP von einem zweiten Geraet aufgerufen (z. B. `http://192.168.0.80:4173`), Save bleibt erfolgreich.
  - In mindestens 5 Saves hintereinander bleibt der API-Host konsistent auf dem Server-Host und driftet nicht auf Client-`localhost`.
  - Reload/Restart im LAN-Szenario behaelt reproduzierbare Save-Funktion.

### P1-S3.37 [P0] Guided Fix UX fuer Static-only-Fehler im Headless/LAN-Betrieb
- Als Operator moechte ich bei erkanntem Static-only-Server konkrete, host-korrekte Schritte sehen, damit ich den Save-Flow ohne Trial-and-Error reparieren kann.
- Akzeptanzkriterien:
  - Save-/Diagnose-Fehler nennen explizit `Static-only Server aktiv, Save nicht moeglich`.
  - UI zeigt konkrete Next Steps fuer headless/LAN (inkl. `node server.mjs --host 0.0.0.0 --port 4173`) und markiert Python-Static als nicht POST-faehig.
  - Hinweise bleiben kompakt, enthalten keinen HTML-Rohdump und nennen den final getesteten Endpoint.

### P1-S3.38 [P1] API-Base-Feld + API-Test als operatorfreundlicher Reparaturpfad
- Als Operator moechte ich API-Base explizit setzen und mit einem Klick testen koennen, um den richtigen Endpoint im LAN-Setup schnell zu verifizieren.
- Akzeptanzkriterien:
  - API-Base-Feld bleibt verfuegbar und erlaubt host-korrekte Overrides ohne den sicheren Default-Flow zu brechen.
  - Der Diagnosepfad im Save-/Settings-Kontext zeigt klar, ob `API-Server` oder `Static-only` erkannt wurde und welche Aktion als naechstes noetig ist.
  - Save verwendet danach transparent den final aufgeloesten Endpoint inklusive Quellenangabe.

### P1-S3.39 [P0] Pflicht-Regression Python-Static negativ -> Node-API positiv
- Als Operator moechte ich, dass die Abnahme meinen Realbetrieb exakt prueft: erst mit Python-Static-Server fehlschlagen, danach mit Node-API erfolgreich speichern.
- Akzeptanzkriterien:
  - Negativtest mit `python3 -m http.server 4173` zeigt deterministisch `static-only`-Diagnose und blockiert Save mit klarer Meldung.
  - Positivtest direkt danach mit Node-API-Server auf gleichem Host/Port zeigt erfolgreiche Diagnose und erfolgreichen Save.
  - Beide Ergebnisse sind als verpflichtender Nachweis in den Phase-01-Abnahmeartefakten dokumentiert.

### P1-S3.40 [P0] UI-Rollback: `API Diagnose`-Button entfernen
- Als Operator moechte ich keinen separaten Diagnose-Button mehr sehen, damit der Settings-Bereich auf den primaeren Save-Flow fokussiert bleibt.
- Akzeptanzkriterien:
  - Der dedizierte Button `API Diagnose` ist aus der Settings-UI entfernt.
  - Diagnose bleibt funktional ueber Save-Preflight und endpoint-transparentes Feedback verfuegbar.
  - Save-/Diagnose-Rueckmeldungen enthalten weiterhin klare Next Steps ohne zusaetzlichen Diagnose-Trigger.

### P1-S3.41 [P0] Download-Fallback neutral benennen (kein Notfall-Label)
- Als Operator moechte ich neutrales Wording fuer den Download-Fallback, damit die UI ohne Alarmbegriffe auskommt.
- Akzeptanzkriterien:
  - Button-/Hint-/Status-Texte verwenden kein `Notfall`-Wording.
  - Download bleibt klar als sekundaerer Fallback gegenueber dem primaeren Server-Save gekennzeichnet.
  - Wording ist in Settings, Save-Meldungen und Doku innerhalb Phase-01-Artefakten konsistent.
