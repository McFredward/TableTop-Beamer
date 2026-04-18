# Phase 18 — UX Overhaul: Simplicity & Mobile-First

## Goal
Umfassende UX-Ueberarbeitung fuer intuitive Bedienung ohne Funktionalitaetsverlust. Mobile ist der primaere Nutzungskontext waehrend des Spiels. Quick Mode ist der Haupt-Workflow.

## Key Principles
- Quick Mode ist der primaere Weg, Animationen zu starten/stoppen — muss prominent sein
- Mobile-first: ein-Tap-Aktionen, grosse Touch-Targets, minimales Scrollen
- Progressive Disclosure: einfach zuerst, Optionen nur bei Bedarf
- Status-Rauschen eliminieren: nur dynamische, nuetzliche Info
- Klare Terminologie statt technischer Begriffe

## Plan 18-1: Dashboard UX Overhaul

### T1 — Quick Mode Promotion & Renaming
- Quick Mode an prominentere Position bringen (oberste Section nach View-Switch)
- Umbenennung: "Selection mode" → "Tap Mode" (oder besserer Name nach Diskussion)
- Buttons umbenennen: "Activate" → "Start", "Deactivate" → "Stop", "Clear room" → "Clear"
- Quick-Mode-Status klarer: "Tap a room to start animation" statt "Quick mode: OFF"
- Mobile: Quick Mode Buttons groesser, prominenter

### T2 — Room Animation Section Simplification
- "More options" → noch weiter verstecken, z.B. "Advanced override" mit Icon
- Override-Slider nur bei Bedarf: Default-Werte aus Definition werden als Hint angezeigt
- "Default animation" Checkbox aus dem versteckten Bereich herausnehmen — prominenter platzieren
- Color Picker bleibt bedingt sichtbar (nur bei Solid Color), ist bereits implementiert
- Stagger-Optionen nur bei Cluster-Target sichtbar

### T3 — Status Lines Cleanup
- Entferne alle statischen Hinweis-Zeilen die keinen dynamischen Wert haben:
  - "Room animations run in hold mode by default until stopped." → entfernen
  - "Touch safety: Clear All requires an explicit double confirmation." → entfernen
  - "Note: Download export is a secondary fallback..." → entfernen
  - "Board source: checked at startup" → entfernen
  - "API diagnostics: checked in save preflight" → entfernen
  - "Calibrate hit areas and room geometry..." (Settings header lead) → kuerzen
  - "Priority section: runtime status with direct Stop/Edit actions." → entfernen
- Behalte dynamische Status: "Active board: X", "Zoom: 100%", "Quick mode: ...", "Selected room: ..."
- Behalte die Apply-Config-Bar unverändert (ist bereits gut — nur sichtbar wenn dirty)

### T4 — Empty States & Micro-Onboarding
- Leere Zustaende mit hilfreichen Hinweisen:
  - Kein Raum ausgewaehlt → "Tap a room on the board to select it"
  - Keine laufenden Animationen → "No active animations — use Tap Mode or start from the panel above"
  - Kein Board geladen → klarer Hinweis
- Dashboard-Header-Text kuerzen/vereinfachen

### T5 — Active Animations Panel Polish
- "Active animations" bleibt — ist klar
- Running-Item kompakter: weniger vertikaler Platz pro Eintrag
- Edit/Stop Buttons besser sichtbar
- Live Editor Panel: Transform-Section standardmaessig eingeklappt (ist selten genutzt)

## Plan 18-2: Settings UX Overhaul

### T6 — Settings Panel Consolidation
- "Board catalog + output" + "Board zoom" → zusammenlegen zu "Board Setup"
- "Room management" + "Polygon editor" → zusammenlegen zu "Room Editor"
- Weniger separate Panels = weniger Scrollen
- Status-Zeilen in Settings ebenfalls aufraeumen

### T7 — Animation Create/Edit Workflow Rework
- Aktuell: Create- und Edit-UI sind vermischt in derselben Section — unklar ob man gerade erstellt oder bearbeitet
- Neu: Klarer zweigeteilter Flow:
  - Oberer Bereich: Dropdown zur Auswahl existierender Animationen (Edit-Modus)
  - Unterer Bereich oder separater Button: "New animation" oeffnet einen Create-Flow
  - Create-Flow fuehrt schrittweise: Name → Type → Source → Sound → Defaults → Create
- "Delete" Button nur sichtbar wenn eine Animation ausgewaehlt ist
- Visuell klarer Zustand: "Editing: Fire" vs "Creating new animation"
- Konsistente Reihenfolge in Room/Inside/Outside Animations

### T8 — Animation Settings Terminology
- "Asset type: Coded / GIF / MP4" → "Type: Effect / GIF / Video" (nutzerfreundlicher)
- "Asset reference" Feld entfernen wenn Resource-Picker vorhanden (redundant)
- "Resource asset picker" → "Animation source"
- Workflow klarer: Name → Type → Source → Sound → Defaults

### T9 — Settings Header & Navigation
- Settings-Header-Text kuerzen: "Configure board geometry, animations, and system settings."
- Subtab-Labels kuerzen: "Board" / "Animations" / "System" (statt "Board & Geometry" etc.)
- Settings-Subtab-Status-Zeile entfernen (redundant — aktiver Tab ist visuell markiert)

## Plan 18-3: Polygon Workflow & Undo/Redo

### T10 — Direct Polygon Creation on Board
- Aktuell: Neues Polygon nur ueber "Room management" Section (weit weg vom Board, verwechselbar mit Play Area Add)
- Neu: Polygon-Erstellung direkt am Board moeglich:
  - Rechtsklick (Desktop) oder Long-Press (Mobile) auf leere Stelle im Board → "Add room here"
  - Alternativ: sichtbarer "+" Button im Polygon-Editor-Bereich der direkt ein neues Polygon an der Board-Mitte erstellt
- "Room management" und "Play Area" Buttons klar visuell getrennt (Farbe, Icon, Gruppierung) um Verwechslung zu vermeiden
- Room-Create und Play-Area-Create sollten NICHT nebeneinander stehen

### T11 — Undo/Redo System
- Ctrl+Z (Undo) und Ctrl+Shift+Z (Redo) fuer Polygon-Editing-Aktionen:
  - Vertex-Drag (Position)
  - Vertex-Insert / Vertex-Delete
  - Room-Create / Room-Delete
  - Room-Rename
- Undo/Redo Stack: max ~50 Eintraege, wird bei Board-Switch geleert
- Sichtbare Buttons: Undo/Redo Buttons im Polygon-Editor-Bereich (neben den Vertex-Buttons)
- Buttons disabled wenn Stack leer
- Keyboard-Shortcut funktioniert wenn Polygon-Editor aktiv (Settings-View, Board-Subtab)
- Kein Undo fuer Animation-Trigger oder Live-Editor-Aenderungen (nur Polygon/Room Geometry)

## Plan 18-4: Mobile-First Polish

### T12 — Mobile Quick Mode Optimization
- Quick Mode Buttons als Haupt-Interaktionsbereich auf Mobile
- Mobile Zone Switch: "Trigger" → "Control" (umfasst Quick Mode + Room Panel)
- Groessere Touch-Targets fuer Quick Mode Buttons (min 48px)
- Quick Mode Status prominent sichtbar auch beim Scrollen

### T13 — Mobile Running Animations
- Running-Items kompakter auf Mobile
- Swipe-to-Stop oder prominentere Stop-Buttons
- Live Editor auf Mobile: weniger Scrollen noetig, wichtigste Slider zuerst

### T14 — Mobile Settings
- Settings auf Mobile: einzelne Section pro Screen-Hoehe anstreben
- Subtab-Switch als horizontale Pill-Navigation statt vertikale Buttons

## Plan 18-5: Visual Hierarchy & Modern Aesthetic

### T15 — Visual Differentiation
- Quick Mode Panel visuell prominenter (staerkerer Rand, leichter Hintergrund)
- Settings-Defaults vs Dashboard-Overrides vs Live-Editor visuell unterscheidbar
- "Default values" in Settings mit einem Label/Badge "Definition defaults"
- Dashboard Override-Section mit Label "Override for this start"

### T16 — Modern Button & Control Styling
- Modernere Button-Aesthetik: subtilere Gradients, glassmorphism-Anklang, bessere Hover/Active/Focus States
- Danger-Buttons (Clear All, Delete) deutlicher differenziert
- Active/Selected States klarer mit Glow-Effekten
- Disabled States deutlicher grayed-out
- Start-Button prominenter (groesser, Accent-Farbe)

### T17 — Modern Panel & Input Styling
- Panels: subtilere Borders, modernere Schatten, leichte Glassmorphism-Effekte
- Inputs/Selects: modernere Focus-States, sanfte Transitions
- Range-Slider: Custom-Styling mit Accent-Farbe statt Browser-Default
- Konsistentes 8px-Grid-System fuer Spacing
- Headings-Hierarchie und Label-Styling konsistenter

## Dependencies
- Plan 18-1 und 18-2 sind unabhaengig voneinander
- Plan 18-3 (Polygon Workflow) ist unabhaengig
- Plan 18-4 (Mobile) haengt von 18-1 ab (Dashboard-Struktur muss stehen)
- Plan 18-5 (Visual Polish) kann parallel zu 18-4 laufen

## Execution Waves
- Wave 1: Plan 18-1 (Dashboard) + Plan 18-2 (Settings) + Plan 18-3 (Polygon/Undo) parallel
- Wave 2: Plan 18-4 (Mobile) + Plan 18-5 (Visual Polish) parallel
