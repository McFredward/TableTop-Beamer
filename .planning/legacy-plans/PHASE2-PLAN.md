# Nemesis Prototype - Phase 2 Plan

## Zielbild
Phase 2 hebt den Vertical Slice auf einen robusten Session-Betrieb: schneller Setup pro Spielabend, reproduzierbare Kalibrierung und konsistente Effekt-Zonen pro Board - inklusive verbindlicher Mobile-First-Bedienung fuer Smartphone am Spieltisch.

## Verbindliche Ergaenzung (Plan Update 2)
- Smartphone-Bedienung (Portrait + Landscape) ist Prioritaet P0 fuer Phase 2.
- Triggern und laufende Animationen managen sind im UI klar getrennte Bedienaufgaben.
- Touch-Targets sind fuer Daumenbedienung optimiert (mindestens 44x44 px, klare Abstaende).
- Einhandbedienung, Lesbarkeit und geringe Fehlklickrate am realen Spieltisch sind Pflicht.
- Mobile Performance/Responsiveness-Verifikation ist fester Bestandteil der Abnahme.

## Neues verpflichtendes Feedback (Plan Update 3)
- P0-Bugfix: Das obere Mobile-Cluster (`Dashboard`/`Settings`/`Triggern`/`Running managen`) darf beim Scrollen die Board-/Projektionsflaeche nicht ueberdecken.
- P0-Bugfix: Die Board-Flaeche bleibt auf Mobile sichtbar und bedienbar; Sticky-Verhalten darf keine Board-Interaktion blockieren.
- P0-Bugfix: Navigation `Dashboard` <-> `Settings` bleibt jederzeit sichtbar und robust; der Dashboard-Button in `Settings` verschwindet nicht.
- Regression-Guard: Scroll, Orientation-Wechsel, Resize und View-Switch duerfen weder Board-Sichtbarkeit noch View-Navigation verlieren.

## Scope (Phase 2)
- Mobile-First UX fuer Touch-Endgeraete (Portrait/Landscape, Thumb-Speed, Trigger-vs-Manage-Trennung).
- P0-Hotfix fuer Mobile-Board-Sichtbarkeit/Bedienbarkeit trotz Sticky-Clustern.
- P0-Hotfix fuer persistente View-Navigation zwischen `Dashboard` und `Settings`.
- Kalibrierungsprofile speichern/laden pro Board.
- Operator-Hotkeys fur Trigger, Clear-All und Presets.
- Board-Zonen als externe Datendatei statt hardcodierter Anchors.
- Stabilitat und Bedienqualitat fur 3-6h Laufzeit.
- UI-Preview fur einzelne und kombinierte Animationen vor dem Ausspielen.
- Aktive Anzeige: gewahltes Board + aktuell laufende Animationen/Kombination.
- "Absenden"-Flow: gewahlte Kombination wird auf Beamer ausgegeben.
- Beamer-Output als Overlay ohne Board-Hintergrund (physisches Board liegt auf dem Tisch).

## Nicht im Scope (Phase 2)
- Kamera-/CV-basierte automatische Ausrichtung.
- Netzwerk-Remote auf mehreren Clients.
- Mehrspieler-Synchronisation.
- Vollwertiger visueller Effekt-Editor mit Timeline/Node-Graph.

## Epic 0 - Mobile-First Operator UX

### Story 0.1 - Smartphone Portrait Trigger-Zone
- Als Operator mochte ich auf dem Smartphone (Portrait) die wichtigsten Trigger im Daumenbereich sofort erreichen, damit ich waehrend der Runde schnell reagieren kann.
- Akzeptanzkriterien:
  - Primaere Trigger ohne Scrollen im unteren Bedienbereich erreichbar.
  - Trigger-Ausloesung in maximal zwei Touch-Schritten.
  - Keine Ueberlagerung mit Running-Management-Controls.

### Story 0.2 - Smartphone Landscape Split
- Als Operator mochte ich in Landscape Triggern und laufende Animationen getrennt sehen, damit ich ohne Fehlbedienung zwischen Starten und Stop/Edit wechseln kann.
- Akzeptanzkriterien:
  - Klar getrennte Bereiche fuer Trigger und Running-Management.
  - Running-Liste inklusive Stop/Edit bleibt dauerhaft sichtbar.
  - Kein Mischpanel mit widerspruechlichen Kernaktionen.

### Story 0.3 - Touch-Hardening + Einhandbetrieb
- Als Operator mochte ich grosse, treffsichere Touch-Ziele und klar erkennbare Zustaende, damit ich am Spieltisch einhaendig und fehlklickarm bedienen kann.
- Akzeptanzkriterien:
  - Interaktive Kernziele >=44x44 px.
  - Kritische Aktionen (z. B. Clear-All) sind visuell getrennt und fehlklicksicher.
  - Lesbarkeit ist unter Reallichtbedingungen gegeben.

### Story 0.4 - Mobile Responsiveness & Performance
- Als Operator mochte ich, dass Orientation-Wechsel und laufende Animationen auf Smartphone stabil bleiben, damit die Bedienung auch in langen Sessions nicht einbricht.
- Akzeptanzkriterien:
  - Portrait/Landscape-Wechsel ohne State-Verlust.
  - Touch-Bedienung bleibt unter Last responsiv.
  - Mobile Verifikation am realen Spieltisch dokumentiert.

## Epic 1 - Session Profiles

### Story 1.1 - Kalibrierung speichern
- Als Operator mochte ich meine aktuelle Kalibrierung als Profil speichern, damit ich beim nachsten Aufbau keine Regler neu einrichten muss.
- Akzeptanzkriterien:
  - Profilname frei vergebbar (z. B. "Wohnzimmer Nord").
  - Gespeichert werden: Board-ID, Offset X/Y, Scale, Rotation, Master Intensity.
  - Speichern ohne Seiten-Reload in unter 300 ms.

### Story 1.2 - Kalibrierung laden/wechseln
- Als Operator mochte ich ein gespeichertes Profil laden konnen, damit der Start in wenigen Klicks erfolgt.
- Akzeptanzkriterien:
  - Profile als Liste auswahlen.
  - Geladene Werte werden sofort auf Stage + UI-Regler angewandt.
  - Wechsel zwischen Profilen ohne visuelle Artefakte oder Hanger.

### Story 1.3 - Sicherer Fallback
- Als Operator mochte ich bei fehlerhaften Profildaten einen sicheren Fallback erhalten, damit die Projektion nie unbenutzbar wird.
- Akzeptanzkriterien:
  - Bei unvollstandigen/defekten Daten werden Defaults geladen.
  - UI zeigt einen kurzen Hinweis auf Fallback.
  - App bleibt voll bedienbar.

## Epic 2 - Input & Control

### Story 2.1 - Trigger-Hotkeys
- Als Operator mochte ich Trigger uber Tastatur auslosen, damit ich wahrend der Runde schneller reagieren kann.
- Akzeptanzkriterien:
  - Hotkeys fur alle Trigger inkl. Clear-All.
  - Keine Mehrfachauslosung durch Key-Repeat bei One-shot-Events.
  - Hotkeys sind in einer kleinen Hilfe sichtbar.

### Story 2.2 - Preset-Slots
- Als Operator mochte ich 2-3 Presets fur Effekt-Kombinationen starten konnen, damit typische Spielsituationen mit einem Tastendruck aktiviert werden.
- Akzeptanzkriterien:
  - Mindestens drei Presets (z. B. "Stealth", "Alarm", "Catastrophe").
  - Preset setzt nur Effektzustande, nicht Kalibrierung.
  - Wechsel zwischen Presets in unter 150 ms.

### Story 2.3 - Safety Prioritat
- Als Operator mochte ich, dass Clear-All immer Vorrang hat, damit ich Effekte sofort stoppen kann.
- Akzeptanzkriterien:
  - Clear-All funktioniert auch bei gleichzeitigem Event-Triggering.
  - Restlaufzeiten von Events werden auf 0 gesetzt.
  - Gemessene Reaktionszeit unter 100 ms.

## Epic 3 - Data-driven Zones

### Story 3.1 - Zonen auslagern
- Als Entwickler mochte ich Board-Zonen in Datenfiles halten, damit neue Layouts ohne Codeanderung moglich sind.
- Akzeptanzkriterien:
  - Pro Board existiert eine JSON-Datei mit Zone-Definitionen.
  - App ladt Zonen anhand der gewahlten Board-ID.
  - Fehlende Datei fallt auf sinnvolle Default-Zonen zuruck.

### Story 3.2 - Zonen validieren
- Als Entwickler mochte ich geladene Zonen validieren, damit fehlerhafte Daten keine Laufzeitfehler auslosen.
- Akzeptanzkriterien:
  - Koordinatenbereich wird gepruft (0..1).
  - Ungultige Zonen werden ignoriert und geloggt.
  - Render-Loop bleibt stabil.

### Story 3.3 - Visual Debug Overlay
- Als Operator mochte ich Zonen bei Bedarf sichtbar machen, damit ich die Ausrichtung schnell prufen kann.
- Akzeptanzkriterien:
  - Toggle fur Debug-Overlay im Dashboard.
  - Zonen mit Label/Index sichtbar, ohne Spielbetrieb zu storen.
  - Overlay ist standardmassig deaktiviert.

## Epic 4 - Reliability & Performance

### Story 4.1 - Langzeitstabilitat
- Als Operator mochte ich die App uber einen ganzen Spielabend stabil betreiben, damit kein Neustart notwendig wird.
- Akzeptanzkriterien:
  - 3h Soak-Test ohne Crash.
  - Keine kontinuierliche Speicherzunahme durch Partikel.
  - Eingaben bleiben durchgehend responsiv.

### Story 4.2 - Kleine UX-Harten entfernen
- Als Operator mochte ich klare Zustandsanzeigen sehen, damit ich aktive Effekte sofort erkenne.
- Akzeptanzkriterien:
  - Dauer-Effekte haben klare aktive/inaktive Darstellung.
  - Event-Buttons geben kurzes visuelles Feedback bei Trigger.
  - Mobile/kleine Displays bleiben bedienbar.

## Epic 5 - Preview, Kombination, Publish

### Story 5.1 - Aktive Session-Anzeige
- Als Operator mochte ich jederzeit sehen, welches Board aktiv ist und welche Animationen gerade laufen, damit ich den Zustand sicher steuern kann.
- Akzeptanzkriterien:
  - Sichtbare Anzeige fur aktives Board in der UI.
  - Sichtbare Liste "Aktiv jetzt" fur Dauer- und Event-Effekte.
  - Kombinationsname sichtbar, falls Preset oder manuelle Kombination aktiv ist.

### Story 5.2 - Vorschau einzelner Animationen
- Als Operator mochte ich Animationen in der UI vorab ansehen, damit ich vor dem Ausspielen Wirkung und Intensitat beurteilen kann.
- Akzeptanzkriterien:
  - Preview-Panel zeigt ausgewahlte Animation ohne sofortigen Beamer-Output.
  - Intensitat in der Preview entspricht der gewahlten Master-Intensity.
  - Vorschau bleibt reaktionsfahig bei schnellen Wechseln.

### Story 5.3 - Kombinationen bauen und testen
- Als Operator mochte ich mehrere Animationen kombinieren und als Stack testen, damit ich stimmige Atmospharen vorbereiten kann.
- Akzeptanzkriterien:
  - Mehrfachauswahl fur kombinierbare Effekte.
  - Preview zeigt die Kombination als Gesamtergebnis.
  - Konflikte (z. B. Blackout + starke Leucht-Effekte) werden mit klaren Regeln behandelt.

### Story 5.4 - "Absenden" auf den Beamer
- Als Operator mochte ich eine in der Preview gewahlte Kombination gezielt absenden, damit erst dann der Live-Beamer aktualisiert wird.
- Akzeptanzkriterien:
  - Button "Absenden" ubernimmt exakt den Preview-Zustand in den Live-Output.
  - Live-Beamer zeigt nur Overlays/Animationen, kein Board-Hintergrund.
  - Rollback auf letzten Live-Zustand in einem Schritt moglich (Undo Last Send).

### Story 5.5 - Zwei Ausgabemodi
- Als Operator mochte ich zwischen "Preview" und "Live" unterscheiden, damit ich ohne Risiko vorbereiten kann.
- Akzeptanzkriterien:
  - Klarer Modusindikator in der UI.
  - Kein unbeabsichtigtes Live-Triggering aus dem Preview-Modus.
  - Optionaler Quick-Send-Hotkey mit Sicherheitsbestatigung.

## Delivery-Vorschlag
- Milestone A (Mobile-First Foundation): Smartphone Portrait/Landscape, Touch-Targets, Trigger-vs-Manage-Trennung, Einhand-Flow.
- Milestone B (Core Data): Profilmodell + Zone-JSON laden.
- Milestone C (Control): Hotkeys + Presets + Safety-Finalisierung.
- Milestone D (Preview/Live): Aktive Session-Anzeige + Preview-Panel + Kombination + Absenden-Flow.
- Milestone E (Hardening): Debug-Overlay + Soak-Test + UX-Polish + Undo-Absenden-Check + Mobile-Verifikation.

## Definition of Done (Phase 2)
- Alle Akzeptanzkriterien der Stories umgesetzt.
- Manuelle Smoke-Checks auf Desktop sowie Smartphone in Portrait und Landscape durchgefuhrt.
- 3h Laufzeit-Test dokumentiert.
- Reale Spieltisch-Verifikation fuer Mobile-Bedienung (einhaendig, lesbar, fehlklickarm) dokumentiert.
- README um neue Bedienung (Profile/Hotkeys) erweitert.
- README um Preview-vs-Live Workflow und "Overlay-only" Beamer-Modus erweitert.
