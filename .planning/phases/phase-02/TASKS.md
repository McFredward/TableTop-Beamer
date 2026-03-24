# Phase 2 Tasks

Statuslegende: TODO | IN-PROGRESS | DONE
Prioritaetslabel: [P0] kritisch | [P1] hoch | [P2] mittel

## Priority Add-on - Plan Update 2 (Mobile-First Bedienung)
- [x] DONE P2-T1 [P0] Mobile UX-Blueprint fuer Smartphone definieren (Portrait/Landscape, Thumb-Zonen, Trigger-vs-Manage-Trennung).
- [x] DONE P2-T2 [P0] Dashboard-Layout fuer Portrait umsetzen: schnelle Daumen-Trigger ohne Scrollpflicht fuer Kernaktionen.
- [ ] TODO P2-T3 [P0] Dashboard-Layout fuer Landscape umsetzen: klare Trennung Triggern vs `Aktive Animationen`/Stop/Edit.
- [ ] TODO P2-T4 [P0] Touch-Target-Hardening: interaktive Targets auf >=44x44 px und konsistente Abstaende bringen.
- [ ] TODO P2-T5 [P0] Einhand-Bedienpfad optimieren: primaere Aktionen im Daumenradius, sekundaere Aktionen entkoppeln.
- [ ] TODO P2-T6 [P0] Fehlklick-Schutz fuer Touch einbauen (insb. `Clear All`, nahe Targets, versehentliche Doppeltaps).
- [ ] TODO P2-T7 [P1] Mobile Lesbarkeit am Spieltisch absichern (Kontrast, Typografie, Zustandskennzeichnung unter Beamer-/Raumlicht).
- [ ] TODO P2-T8 [P1] Orientation-Handling stabilisieren: Portrait/Landscape-Wechsel ohne State-Verlust und ohne UI-Drift.
- [ ] TODO P2-T9 [P1] Mobile Performance-Checks integrieren (Trigger-Reaktionszeit, Scroll/Touch-Fluessigkeit, 30+ min Laufzeit).
- [ ] TODO P2-T10 [P1] Verifikationsprotokoll fuer reales Spieltisch-Setup (einhaendig, Fehlklickquote, Lesbarkeit) erstellen.

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
