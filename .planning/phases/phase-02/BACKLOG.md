# Phase 2 Backlog (Prepared)

## Epics
- Global Defaults Reliability & Settings Apply UX (Autoload bei leerem Local Storage + manuelles Apply im Settings-Flow)
- Mobile Top-Control Flow Safety (Dashboard/Settings nicht sticky, kein Overlap mit Board)
- Mobile Projection Surface Visibility (oberes Mobile-Cluster verdeckt Board/Projektionsflaeche nicht)
- View Navigation Reliability (Dashboard <-> Settings robust erreichbar im Mobile-Flow)
- Mobile-First Operator UX (Smartphone Portrait/Landscape, Thumb-Speed, Trigger-vs-Manage-Trennung)
- Session Profiles (speichern/laden/fallback)
- Fine Calibration (Hex-Masken exakt, per-Zone-Nudging, Polygon-Editor light)
- Room Config Persistence (Raum/Special-Raum pro Board)
- Input & Control (Hotkeys, Presets, Safety-Prioritaet)
- Data-driven Zones (JSON, Validierung, Debug-Overlay)
- Audio Profiles & Assets (Event-Sounds, Mute/Volume pro Profil)
- Reliability & Performance (Soak, UX-Haerten)
- Preview, Kombination, Publish (Preview/LIVE + Absenden)
- Phase-2 Closure Add-on (externe Zonen + Live-Flow-Rollback + README-Finalisierung)
- Real Setup Verification (Mehrmonitor/Beamer)

## Story Mapping
- P2-S0.1 Smartphone-Layout Portrait: Thumb-Trigger-Zone + reduzierte Paneldichte
- P2-S0.2 Smartphone-Layout Landscape: klare Split-Ansicht Triggern vs laufende Animationen managen
- P2-S0.3 Touch-Target-System: Mindestgroesse, Abstaende, klare Interaktionshierarchie
- P2-S0.4 Einhand-Flow am Spieltisch: primaere Aktionen im Daumenradius, sekundaere Bedienung entkoppelt
- P2-S0.5 Fehlklick-Schutz und Safety-UX auf Touch (insb. `Clear All`)
- P2-S0.6 Mobile Responsiveness/Performance-Verifikation (Portrait/Landscape + reale Tischbedingungen)
- P2-S0.7 Bootstrap-Fallback fuer neue Geraete: globale Defaults bei leerem Local Storage automatisch laden und anwenden
- P2-S0.8 Settings-Shortcut: `Defaults laden & anwenden` als explizite Operator-Aktion in der laufenden Session
- P2-S0.9 Mobile Layout-Safety: Trigger-/Running-Cluster ueberdecken beim Scrollen keinen Dashboard-Content
- P2-S0.10 Desktop-Paritaet: Mobile-Layout-Anpassungen aendern Desktop-Layout/Scrollverhalten nicht
- P2-S0.11 Mobile-Projektionsflaeche sichtbar/bedienbar halten: oberes Cluster ueberdeckt Board beim Scrollen nicht
- P2-S0.12 View-Navigation robust halten: `Dashboard`/`Settings` sind am Scroll-Start sichtbar, nicht sticky/fixiert und im normalen Flow erreichbar
- P2-S0.13 Navigation-/Layout-Regression absichern: Scroll/Orientation/Resize/View-Switch ohne Overlap oder Interaktionsverlust
- P2-S0.14 P0-Hotfix Trigger-Modus: Control-Cluster (`Triggern`/`Running managen`/`Raum starten`) ueberdeckt Board nie
- P2-S0.15 P0-Hotfix Top-Navigation: `Dashboard`/`Settings` explizit non-sticky, beim Scrollen normal ausblendbar
- P2-S0.16 P0-Hotfix No-Overlay-Mobile-Layout: keine Ueberlagerung ueber Board in allen mobilen Kernzustaenden
- P2-S1.1 Kalibrierung speichern
- P2-S1.2 Kalibrierung laden/wechseln
- P2-S1.3 Sicherer Fallback
- P2-S2.1 Per-Zone-Nudging fuer Hex-Masken
- P2-S2.2 Polygon-Editor light fuer Feinkorrekturen
- P2-S2.3 Kalibrierungs-Quick-Reset je Zone
- P2-S3.1 Raumkonfiguration pro Board speichern
- P2-S3.2 Special-Raum als persistente Variante pro Board
- P2-S3.3 Board-Wechsel mit konsistentem Raum-Mapping
- P2-S4.1 Trigger-Hotkeys
- P2-S4.2 Preset-Slots
- P2-S4.3 Safety-Prioritaet
- P2-S5.1 Zonen auslagern
- P2-S5.2 Zonen validieren
- P2-S5.3 Visual Debug Overlay
- P2-S6.1 Audio-Profil an Session binden
- P2-S6.2 Audio-Assets verwalten und referenzieren
- P2-S6.3 Mute/Volume pro Profil steuern
- P2-S7.1 Langzeitstabilitaet
- P2-S7.2 Kleine UX-Haerten entfernen
- P2-S8.1 Aktive Session-Anzeige
- P2-S8.2 Vorschau einzelner Animationen
- P2-S8.3 Kombinationen bauen und testen
- P2-S8.4 Absenden auf den Beamer
- P2-S8.5 Zwei Ausgabemodi
- P2-S10.1 Externe Zonen-Dateien pro Board als Source-of-Truth
- P2-S10.2 Zonen-Validator mit deterministic fallback bei malformed/missing payload
- P2-S10.3 Preview-Modell fuer Einzel/Kombi-Staging im Operator-Flow
- P2-S10.4 Live-Send + letzter Undo/Rollback als durchgaengiger Datenpfad (UI + API)
- P2-S10.5 README beschreibt finalen Phase-2-Workflow statt offenen Next-Step
- P2-S10.6 Re-Verification und Exit-Gate fuer formalen Phase-2-Abschluss
- P2-S9.1 Testmatrix fuer reale Mehrmonitor-/Beamer-Topologien
- P2-S9.2 Verifikation Standard-Raum (Single + Extended Display)
- P2-S9.3 Verifikation Special-Raum (abweichende Aufloesung/Offsets)

## Priorisierte Umsetzungsstrecke - Plan Update 5 (Phase-2 Abschluss, verbindlich)

### Prioritaet P0 - Restluecken aus Verification schliessen
- Story P2-S10.1: Externe Zonen-Dateien pro Board einziehen.
  - Ziel: Board-Rendering liest Zonen nicht mehr aus Inline-`BOARDS`, sondern aus `config/zones/*.json`.
- Story P2-S10.2: Zonen-Validator mit Fallback.
  - Ziel: malformed/missing/partial JSON wird sicher abgefangen; Session bleibt bedienbar und meldet den Fallback klar.
- Story P2-S10.3: Echter Preview-Flow (Einzel + Kombi-Staging).
  - Ziel: Operator kann Vorschauzustand gezielt aufbauen statt nur Output-Route umzuschalten.
- Story P2-S10.4: Live-Send + Undo/Rollback.
  - Ziel: Preview wird bewusst auf Live committet; letzter Send ist ruecknehmbar.

### Prioritaet P1 - Formale Abschlussfaehigkeit
- Story P2-S10.5: README finalisieren.
  - Ziel: finaler Phase-2-Workflow ist als Operator-Runbook dokumentiert.
- Story P2-S10.6: Re-Verification + Exit-Gate.
  - Ziel: `2-VERIFICATION.md` Gap-Closure nachvollziehbar und formaler Phase-2-Abschluss dokumentiert.

## Priorisierte Umsetzungsstrecke - Plan Update 3 (verbindlich)

### Prioritaet P0 - Mobile-First Bedienung
- Story P2-S0.14: Trigger-Modus-Overlap final schliessen (Referenz `debug/screenshot_debug.jpg`).
  - Ziel: Control-Cluster liegt in keinem mobilen Zustand mehr ueber der Projektionsflaeche.
- Story P2-S0.15: `Dashboard`/`Settings` im Normalfluss statt sticky/fixiert.
  - Ziel: Buttons sind am Scroll-Start sichtbar und duerfen beim Scrollen regulaer verschwinden.
- Story P2-S0.16: Mobile No-Overlay-Layout als harte Regel.
  - Ziel: Triggern/Running managen/Raum starten ueberlagern das Board nicht.
- Story P2-S0.7: Bootstrap-Fallback bei leerem Local Storage.
  - Ziel: Neue/geleerte Browserinstanzen starten nie ohne wirksame globale Defaults.
- Story P2-S0.8: Settings-Button `Defaults laden & anwenden`.
  - Ziel: Operator kann globale Defaults jederzeit bewusst ziehen und sofort auf die Session anwenden.
- Story P2-S0.9: Mobile Top-Control-Flow ohne Ueberdeckung.
  - Ziel: Trigger-/Running-Cluster bleiben auf Mobile bedienbar, verdecken aber nie den gescrollten Dashboard-Content.
- Story P2-S0.10: Desktop-Paritaet.
  - Ziel: Desktop-Verhalten bleibt gegenueber Plan-Stand unveraendert.
- Story P2-S0.11: Mobile-Projektionsflaeche bleibt sichtbar/bedienbar.
  - Ziel: Beim mobilen Scrollen verdeckt kein Control-Cluster das Board; Projektion bleibt bedienbar.
- Story P2-S0.12: View-Navigation Dashboard <-> Settings bleibt robust erreichbar.
  - Ziel: Kein Navigations-Dead-End mehr; Rueckweg aus Settings ist in allen relevanten Zustanden verfuegbar (inkl. Scroll-zurueck-zum-Start).
- Story P2-S0.13: Regression-Absicherung fuer Navigation/Layout.
  - Ziel: Scroll, Orientation-Wechsel, Resize und View-Switch erzeugen keine Sichtbarkeits- oder Interaktionsverluste.
- Story P2-S0.1: Smartphone-Layout Portrait mit Trigger-Thumb-Zone.
  - Ziel: Trigger in <2 Touch-Schritten, ohne Scrollpflicht fuer Kernaktionen.
- Story P2-S0.2: Smartphone-Layout Landscape mit klarer Trennung Triggern vs Running-Management.
  - Ziel: Kein Mischpanel, Running-Stop/Edit als eigener stabiler Arbeitsbereich.
- Story P2-S0.3: Touch-Target-System.
  - Ziel: Interaktive Controls >= 44x44 px, robuste Treffer bei Daumenbedienung.
- Story P2-S0.4: Einhandbedienung am Spieltisch.
  - Ziel: Primaere Live-Aktionen im Daumenradius, gute Lesbarkeit unter variabler Beleuchtung.

### Prioritaet P1 - Safety + Verifikation mobil
- Story P2-S0.5: Fehlklick-Schutz fuer Touch und Safety-UX.
  - Ziel: Destruktive Aktionen klar abgesichert, keine ungewollten Stops durch Nah-Targets.
- Story P2-S0.6: Mobile Responsiveness/Performance-Verifikation.
  - Ziel: Orientierungwechsel ohne State-Drift, stabile Trigger-Latenz und 30+ min mobile Laufzeit ohne Bedienabfall.

### Prioritaet P1/P2 - Phase-2 Kernausbau
- P1: Session Profiles, Fine Calibration, Room Config Persistence, Input & Control.
- P2: Data-driven Zones, Audio Profiles, Preview/Live, Real Setup Verification.

Quelle: docs/PHASE2-PLAN.md
