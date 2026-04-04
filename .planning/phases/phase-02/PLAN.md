# Phase 2 Plan (Prepared)

## Zielbild
Phase 2 macht den Vertical Slice session-tauglich und mobil bedienbar: reproduzierbare Fein-Kalibrierung, persistente Board-/Raumprofile, datengetriebene Zonen sowie Preview/Live-Absenden inkl. Audio-Profilsteuerung - mit priorisierter Mobile-First-Bedienung fuer Touch-Geraete am Spieltisch.

## Verbindliche Ergaenzung Plan-Update 2 (Mobile-First)

### UX-Konzept Smartphone (Portrait + Landscape)
- Schnelle Daumen-Trigger: primaere Trigger als kompakte, gut erreichbare Thumb-Zone im unteren Bedienbereich.
- Klare Trennung der Aufgaben: Triggern und Laufzeit-Management bleiben als getrennte Bedienflaechen/Flows sichtbar (kein Mischpanel).
- Touch-optimierte Targets: interaktive Elemente mit mindestens 44x44 px, klare Abstaende und reduzierte Dichte.
- Einhandbedienung am Spieltisch: zentrale Aktionen im Daumenradius, sekundaere Konfiguration in separatem Bereich.
- Fehlklick-Schutz: destruktive Aktionen (z. B. `Clear All`) mit deutlicher visueller Absetzung und Guard gegen versehentliche Touches.
- Gute Lesbarkeit unter Reallicht: hoher Kontrast, klare Zustandsmarker, keine ueberladenen Bedienpanels.

## Verbindliches Feedback Add-on (Phase 2)

### F1 Global Defaults auf neuen Geraeten
- Wenn kein lokaler Browser-Speicher vorliegt (neu/leer), muessen globale Defaults automatisch geladen und unmittelbar auf die Session angewendet werden.
- Leerer Local Storage darf nicht still ignoriert werden; der Fallback auf globale Defaults ist verpflichtend.

### F2 Settings-UX: Defaults laden & anwenden
- Neuer Settings-Button `Defaults laden & anwenden`.
- Aktion zieht globale Defaults und uebernimmt sie direkt in den aktuellen Laufzeitzustand (ohne Neustartpflicht).

### F3 Mobile Dashboard Top-Control-Flow-Schutz
- Auf Mobile darf der Dashboard-Content beim Scrollen nie vom Trigger-Cluster oder Running-Cluster verdeckt werden.
- Der obere Dashboard-Bereich bleibt im normalen Scrollfluss (nicht sticky/fixiert) mit sauberem Layout-Abstand zur Board-Flaeche.
- Desktop-Verhalten bleibt unveraendert.

## Neues verpflichtendes Feedback Add-on 2 (Phase 2)

### F4 Mobile-Cluster verdeckt Board/Projektionsflaeche
- Das obere Mobile-Cluster (`Dashboard`/`Settings`/`Triggern`/`Running managen`) darf beim Scrollen die Board-Projektionsflaeche nicht ueberdecken.
- Die Projektionsflaeche bleibt auf Mobile sichtbar und bedienbar; Top-Control-Verhalten darf keine Interaktion auf dem Board blockieren.
- Die Loesung ist mobil-spezifisch zu kapseln; Desktop bleibt unveraendert.

### F5 Navigation Dashboard <-> Settings verschwindet teils
- Der Rueckweg von `Settings` nach `Dashboard` muss jederzeit verfuegbar sein (direkt oder durch kurzen Scroll zum Seitenanfang).
- Navigation zwischen `Dashboard` und `Settings` bleibt in allen relevanten Zustaenden robust erreichbar (Scroll, Orientation-Wechsel, View-Switch, Resize).
- View-Navigation wird robust gegen UI-State-Drift abgesichert.

## Neues verpflichtendes Feedback Add-on 3 (Phase 2, P0-Hotfix)

### F6 Mobile Trigger-Modus ueberdeckt weiterhin Board
- Im Mobile-Trigger-Modus darf das Control-Cluster (`Triggern`/`Running managen`/`Raum starten`) die Board-/Projektionsflaeche nie ueberdecken.
- Board-Flaeche bleibt bei Scroll, View-Switch und Orientation-Wechsel sichtbar und bedienbar.
- Referenz fuer Reproduktion/Nachweis: `debug/screenshot_debug.jpg`.

### F7 Dashboard/Settings Buttons duerfen nicht sticky/fixiert sein
- Mobile Buttons `Dashboard` und `Settings` sind im normalen Dokumentfluss (nicht sticky, nicht fixed).
- Beim Scrollen duerfen die Buttons normal aus dem Viewport verschwinden.
- Mindestanforderung: Am Scroll-Start (oberer Seitenanfang) sind beide Buttons klar sichtbar.

### F8 Mobile No-Overlay Layout als harte Regel
- Mobile Layout wird so umgebaut, dass es keine Ueberlagerung ueber dem Board mehr gibt.
- Control-Cluster und Board haben klar getrennte, nicht ueberlappende Layoutbereiche.
- Desktop-Verhalten bleibt unveraendert.

## Abschluss-Add-on (Phase 2, Plan-Update 5)

### F9 Datengetriebene Board-Zonen als Pflicht
- Board-Zonen werden aus externen JSON-Dateien pro Board geladen (`config/zones/*.json`), nicht mehr aus statischen Inline-Konstanten.
- Ein Validator prueft Struktur/Datentypen/Bounds; fehlerhafte oder fehlende Dateien werden eindeutig klassifiziert.
- Fallback ist verpflichtend: Session bleibt bedienbar und nutzt deterministisch einen sicheren Ersatzpfad (letzte gueltige Daten oder eingebautes Notfallprofil).

### F10 Preview/Kombi/Absenden fuer Live-Ausgabe inkl. Rollback
- Preview ist ein echter Zustandspfad (Einzel + Kombi-Staging), nicht nur Output-Route-Auswahl.
- Absenden committet den Preview-Stand in den Live-Output ueber klar benannte Send-Endpunkte.
- Letzter Send ist ruecknehmbar (Undo/Rollback) mit sichtbarem Runtime-Status fuer Operator.

### F11 README finalisiert den Phase-2-Workflow
- README beschreibt den finalen Operator-Ablauf: Startup mit Defaults, Profil-/Kalibrierpfad, Preview/Kombi/Absenden und Rollback.
- Phase-2-Features werden nicht mehr als "naechster Schritt" gefuehrt, sondern als dokumentierter Ist-Workflow.

## Scope
- Mobile-First Operator UX fuer Smartphone in Portrait und Landscape.
- Verbindlicher Bootstrap-Fallback: globale Defaults automatisch laden/anwenden, wenn lokaler Browser-Speicher fehlt.
- Settings-Aktion fuer `Defaults laden & anwenden` als expliziter Operator-Flow.
- Mobile Top-Navigation (`Dashboard`/`Settings`) im normalen Scrollfluss statt sticky/fixiert.
- P0-Hotfix: Mobile-Cluster darf Board/Projektionsflaeche nicht ueberdecken; Board bleibt sichtbar und bedienbar.
- P0-Hotfix: Mobile Layout wird als No-Overlay-Layout umgesetzt (keine Control-Ueberlagerung ueber dem Board).
- Abschluss-Add-on: externe Zonen-JSON mit Validator/Fallback als kanonischer Board-Zonenpfad.
- Abschluss-Add-on: echter Preview/Kombi/Absenden-Live-Flow inkl. Undo/Rollback fuer den letzten Send.
- Abschluss-Add-on: README-Update auf finalen Phase-2-Operator-Workflow.
- Schnellzugriff fuer Daumen-Trigger inkl. klarer Trennung zu `Aktive Animationen`/Stop/Edit.
- Touch-optimierte Komponenten und responsives Layout fuer einhaendige Bedienung.
- Profile speichern/laden pro Board.
- Feinkalibrierungs-Workflow fuer exakte Hex-Masken (per-Zone-Nudging und optionaler Polygon-Editor light).
- Persistente Raum- und Special-Raum-Konfigurationen pro Board.
- Hotkeys fuer Trigger, Clear-All und Presets (desktop-orientiert, optional ergaenzt um Touch-Aktionen).
- Board-Zonen aus externen JSON-Dateien.
- Audio-Profile und Asset-Management fuer Events.
- Mute/Volume pro Audio-Profil.
- Laufzeitstabilitaet fuer lange Sessions.
- Preview fuer Einzel- und Kombi-Effekte.
- Aktive Session-Anzeige (Board + laufende Animationen).
- Absenden-Flow von Preview in Live-Beamer.
- Overlay-only Live-Output ohne Board-Hintergrund.
- Erweiterte Verifikation auf realen Mehrmonitor-/Beamer-Setups inklusive Mobile-Responsiveness/Performance.

## Milestones (priorisiert)
1. Mandatory Feedback Hotfix: Global-Defaults-Autoload bei leerem Local Storage, Settings-Button `Defaults laden & anwenden`, Mobile-Top-Control-Flow-Schutz ohne Content-Ueberdeckung (Desktop unveraendert).
2. Mandatory Feedback Hotfix 2: Mobile-Cluster-Overlap zur Projektionsflaeche schliessen + robuste Dashboard/Settings-Navigation ohne Navigations-Dead-End.
3. Mandatory Feedback Hotfix 3 (P0): Mobile Trigger-Modus ohne Board-Overlay + `Dashboard`/`Settings` explizit nicht-sticky + No-Overlay-Layout-Regel.
4. Mobile-First Foundation: Smartphone-Informationsarchitektur, Thumb-Zonen, Trigger-vs-Manage-Trennung, Touch-Targets und visuelle Vereinfachung.
5. Mobile Interaction Hardening: Einhand-Flow, Fehlklick-Schutz, schnelle Trigger-Reaktion, Orientation-Switch (Portrait/Landscape) ohne State-Verlust.
6. Core Data: Profilmodell + Zone-JSON Laden/Validieren + persistente Raum-/Special-Raum-Mappings pro Board.
7. Calibration UX: Fein-Kalibrierung per Zone (Nudging) und Polygon-Editor light fuer exakte Hex-Masken.
8. Control & Audio: Hotkeys + Presets + Safety-Priorisierung + Audio-Profile inkl. Asset-Management und Mute/Volume.
9. Preview/Live: aktive Anzeige + Preview + Kombination + Absenden.
10. Hardening & Verification: Debug-Overlay + Soak-Test + Real-Setup-Verifikation (Mehrmonitor/Beamer + Smartphone am Spieltisch) + UX-Polish.
11. Phase-2 Abschluss-Add-on: externe Zonen-JSON (Validator + Fallback), echter Preview/Kombi/Absenden-Flow mit Rollback und finale README-Dokumentation.

## Definition of Done
- Stories, Tasks und Akzeptanzkriterien aus den Phase-2-Artefakten (`BACKLOG.md`, `TASKS.md`, `ACCEPTANCE.md`) sind erfuellt.
- Global-Defaults-Bugfix ist nachweisbar: leerer/fehlender Local Storage fuehrt deterministisch zu automatischem Laden + Anwenden globaler Defaults.
- Settings enthaelt den Button `Defaults laden & anwenden`; Aktion wirkt sofort auf die laufende Session.
- Mobile `Dashboard`/`Settings` Buttons sind nicht sticky/fixiert und nur am Scroll-Start sichtbar.
- Mobile-Cluster verdeckt die Board-Projektionsflaeche nicht; Board bleibt waehrend Scrollen sichtbar und bedienbar.
- Mobile No-Overlay-Layout ist umgesetzt: keine Control-Ueberlagerung ueber der Board-Flaeche in Trigger-/Running-/Raumstart-Zustaenden.
- Mobile-First-Pflichtkriterien erfuellt: Daumen-Trigger schnell erreichbar, Trigger/Manage klar getrennt, Touch-Targets robust, einhaendig bedienbar.
- Manuelle Smoke-Checks auf Desktop und Smartphone (Portrait + Landscape) erfolgreich.
- Reale Spieltisch-Verifikation dokumentiert (Lesbarkeit, Einhandbedienung, geringe Fehlklickquote).
- Reale Mehrmonitor-/Beamer-Verifikation dokumentiert (mindestens Standard- und Special-Raumprofil).
- Mobile Performance-/Responsiveness-Verifikation dokumentiert (Orientation-Change, Trigger-Latenz, Laufzeitstabilitaet).
- Board-Zonen stammen nachweisbar aus `config/zones/*.json`; Validator/Fallback deckt missing/malformed/partial Daten robust ab.
- Preview/Kombi/Absenden mit Live-Commit und letztem Undo/Rollback ist als durchgaengiger Operator-Flow verdrahtet (UI + Datenpfad + API).
- README um Fein-Kalibrierung, Raumprofile, Audio-Profile, Preview-vs-Live und Mobile-Bedienkonzept erweitert.

## Referenz
- docs/PHASE2-PLAN.md
