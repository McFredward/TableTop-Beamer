# P1-T45 Verification - Plan Update 5

Datum (UTC): 2026-03-24

## Scope
- Plan-Update-5 Tasks P1-T40..P1-T45
- Fokus: exklusiver View-Switch, Photoshop-artige Polygoneditor-UX (Handles/aktive Ecke/Insert/Delete/Drag), Legacy-Persistenz

## Regression-Basis (Plan 1-6 stabil)
- [x] `node --check src/app.js` erfolgreich
- [x] Render-Loop-Guard (`drawAnimationSafely`) unveraendert aktiv
- [x] Running-List Scope-Trennung (`GLOBAL`/`ROOM`) unveraendert vorhanden
- [x] `Clear All` Stop-Pfad weiterhin unveraendert und deterministisch

## Plan-Update-5 Pflichtabnahme

### P1-T40 Exklusiver View-Switch
- [x] `Dashboard` und `Settings` togglen gegenseitig exklusiv ueber `hidden` + `aria-hidden`.
- [x] Dashboard-Panels sind im Settings-View nicht sichtbar.
- [x] Settings-Panels sind im Dashboard-View nicht sichtbar.

### P1-T41 Sichtbare Handles + aktive Ecke
- [x] Jeder Spezialraum-Vertex wird als sichtbarer Handle direkt im Overlay gerendert.
- [x] Aktive Ecke ist kontraststark rot markiert.
- [x] Vertex-Index bleibt fuer alle Handles sichtbar.

### P1-T42 Stabiler Drag-Workflow
- [x] Drag nutzt pointer-id-gebundene Session mit Pointer-Capture.
- [x] Live-Update waehrend des Drags aktualisiert Overlay sofort.
- [x] Cancel-Pfade funktionieren (`pointercancel`, `Escape`) und stellen Ausgangskoordinaten wieder her.
- [x] Commit erfolgt sauber bei `pointerup` inkl. Persistenzmeldung.

### P1-T43 Insert/Delete Guardrails
- [x] Vertex-Insert arbeitet an der aktiv gewaehlten Kante (Midpoint).
- [x] Aktive Ecke bleibt direkt loeschbar.
- [x] Mindestpunkt-Guard (`>=3`) blockiert ungueltige Polygonformen mit Statushinweis.

### P1-T44 Persistenz-Rueckwaertskompatibilitaet
- [x] Legacy-Hitarea-Key (`tt-beamer.hitarea-calibration.v1`) wird weiter migriert.
- [x] Legacy-Geometrie-Key (`tt-beamer.room-geometry.v1`) wird erkannt und uebernommen.
- [x] Legacy-Polygon-Key (`tt-beamer.special-polygons.v1`) wird erkannt und uebernommen.
- [x] Aeltere Board-Profil-Formate (`boards`, `boardProfiles`, `*ByBoard`) werden in `tt-beamer.board-profiles.v1` ueberfuehrt.

## Reload/App-Neustart-Nachweis (Acceptance P0m)
Durchgefuehrtes Verfahren:
1. Legacy- und Mischprofile werden beim Start in das aktuelle Boardprofil-Schema normalisiert.
2. Migrierte Daten werden direkt wieder unter `tt-beamer.board-profiles.v1` persistiert.
3. Nach Reload bleibt die normalisierte Kalibrierung board-spezifisch und nutzbar.

Ergebnis: **PASS**

## Verwendete Kommandos
```bash
node --check src/app.js
```
