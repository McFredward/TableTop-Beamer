# Phase 2 Tasks

Statuslegende: TODO | IN-PROGRESS | DONE
Prioritaetslabel: [P0] kritisch | [P1] hoch | [P2] mittel

## Priority Add-on - Plan Update 2 (Mobile-First Bedienung)
- [x] DONE P2-T1 [P0] Mobile UX-Blueprint fuer Smartphone definieren (Portrait/Landscape, Thumb-Zonen, Trigger-vs-Manage-Trennung).
- [x] DONE P2-T2 [P0] Dashboard-Layout fuer Portrait umsetzen: schnelle Daumen-Trigger ohne Scrollpflicht fuer Kernaktionen.
- [x] DONE P2-T3 [P0] Dashboard-Layout fuer Landscape umsetzen: klare Trennung Triggern vs `Aktive Animationen`/Stop/Edit.
- [x] DONE P2-T4 [P0] Touch-Target-Hardening: interaktive Targets auf >=44x44 px und konsistente Abstaende bringen.
- [x] DONE P2-T5 [P0] Einhand-Bedienpfad optimieren: primaere Aktionen im Daumenradius, sekundaere Aktionen entkoppeln.
- [x] DONE P2-T6 [P0] Fehlklick-Schutz fuer Touch einbauen (insb. `Clear All`, nahe Targets, versehentliche Doppeltaps).
- [x] DONE P2-T7 [P1] Mobile Lesbarkeit am Spieltisch absichern (Kontrast, Typografie, Zustandskennzeichnung unter Beamer-/Raumlicht).
- [x] DONE P2-T8 [P1] Orientation-Handling stabilisieren: Portrait/Landscape-Wechsel ohne State-Verlust und ohne UI-Drift.
- [x] DONE P2-T9 [P1] Mobile Performance-Checks integrieren (Trigger-Reaktionszeit, Scroll/Touch-Fluessigkeit, 30+ min Laufzeit).
- [x] DONE P2-T10 [P1] Verifikationsprotokoll fuer reales Spieltisch-Setup (einhaendig, Fehlklickquote, Lesbarkeit) erstellen.

## Priority Add-on - Verpflichtendes Feedback Phase 2
- [x] DONE P2-T26 [P0] Bugfix Global Defaults: bei leerem/fehlendem Local Storage globale Defaults automatisch laden und sofort auf Session anwenden.
- [x] DONE P2-T27 [P0] Startup-Guard gegen stilles Ignorieren implementieren (expliziter Fallback-Pfad fuer neue Geraete, inkl. Regression-Check).
- [x] DONE P2-T28 [P0] Settings-UX erweitern: Button `Defaults laden & anwenden` integrieren und Laufzeitzustand unmittelbar aktualisieren.
- [x] DONE P2-T29 [P0] Mobile Dashboard Sticky/Fixierung so anpassen, dass Trigger-/Running-Cluster beim Scrollen keinen Content ueberdecken.
- [x] DONE P2-T30 [P1] Desktop-Paritaetscheck fuer P2-T29 dokumentieren (Desktop-Layout/Scrollverhalten unveraendert).

## Priority Add-on - Neues verpflichtendes Feedback Phase 2 (Plan Update 3)
- [x] DONE P2-T31 [P0] Mobile Overlap-Bugfix: oberes Mobile-Cluster so kapseln/offsetten, dass Board-Projektionsflaeche beim Scrollen sichtbar und bedienbar bleibt.
- [x] DONE P2-T32 [P0] Sticky-Interaktionsguard: sicherstellen, dass Mobile-Sticky-Bereiche keine Pointer-Interaktion auf der Board-Flaeche blockieren.
- [x] DONE P2-T33 [P0] View-Navigation-Hardening: `Dashboard`/`Settings`-Switch dauerhaft sichtbar machen; Dashboard-Button darf in `Settings` nie verschwinden.
- [x] DONE P2-T34 [P0] Navigation-State-Guard + Regression: Scroll, Orientation-Wechsel, Resize und View-Switch ohne Navigationsverlust absichern.
- [x] DONE P2-T35 [P1] Nachweisprotokoll fuer P2-T31..P2-T34 erstellen (Mobile + Desktop Paritaet).

## Priority Add-on - Neues verpflichtendes Feedback Phase 2 (Plan Update 4, P0-Hotfix)
- [x] DONE P2-T36 [P0] Mobile Trigger-Modus refactoren: Control-Cluster (`Triggern`/`Running managen`/`Raum starten`) in non-overlapping Layoutfluss bringen, sodass kein Board-Overlay mehr auftritt.
- [ ] TODO P2-T37 [P0] Mobile `Dashboard`/`Settings` Buttons von sticky/fixed auf normalen Dokumentfluss umstellen; Sichtbarkeit nur am Scroll-Start garantieren.
- [ ] TODO P2-T38 [P0] Mobile Board-Containment-Guard einbauen: Board bleibt bei Scroll, View-Switch und Orientation-Wechsel sichtbar/bedienbar ohne ueberlagernde Controls.
- [ ] TODO P2-T39 [P0] Regression-Checks fuer No-Overlay-Layout (Triggern/Running managen/Raum starten) plus Desktop-Paritaet erweitern.
- [ ] TODO P2-T40 [P1] Verifikationsnachweis mit Referenz `debug/screenshot_debug.jpg` und aktualisiertem Mobile-Nachher-Protokoll dokumentieren.

## Milestone A - Core Data
- [ ] TODO P2-T11 [P1] Session-Profile speichern/laden pro Board inkl. sicherem Fallback umsetzen.
- [ ] TODO P2-T12 [P1] Board-Zonen aus externen JSON-Dateien laden und validieren.
- [ ] TODO P2-T13 [P1] Persistente Raum-/Special-Raum-Mappings pro Board absichern.

## Milestone B - Calibration UX
- [ ] TODO P2-T14 [P1] Per-Zone-Nudging fuer Hex-Masken implementieren.
- [ ] TODO P2-T15 [P1] Polygon-Editor light fuer Feinkorrekturen bereitstellen.
- [ ] TODO P2-T16 [P2] Kalibrierungs-Quick-Reset je Zone ergaenzen.

## Milestone C - Control & Audio
- [ ] TODO P2-T17 [P1] Trigger-Hotkeys und Preset-Slots integrieren.
- [ ] TODO P2-T18 [P1] Safety-Priorisierung (`Clear All`) im erweiterten Control-Flow absichern.
- [ ] TODO P2-T19 [P2] Audio-Profile inkl. Asset-Management sowie Mute/Volume pro Profil integrieren.

## Milestone D - Preview/Live
- [ ] TODO P2-T20 [P2] Aktive Session-Anzeige (Board + laufende Animationen) fuer Preview/Live konsolidieren.
- [ ] TODO P2-T21 [P2] Preview fuer Einzel- und Kombi-Effekte inkl. Absenden-Flow auf Live-Beamer umsetzen.
- [ ] TODO P2-T22 [P2] Overlay-only Live-Output und Undo/Rollback fuer letzten Send absichern.

## Milestone E - Hardening & Verification
- [ ] TODO P2-T23 [P1] Mobile + Desktop Soak-Test (mindestens 3h Gesamtbetrieb) dokumentieren.
- [ ] TODO P2-T24 [P1] Reale Mehrmonitor-/Beamer-Verifikation fuer Standard-/Special-Raumprofile dokumentieren.
- [ ] TODO P2-T25 [P1] README um Mobile-First-Bedienung, Preview-vs-Live und Phase-2-Operator-Flow erweitern.
