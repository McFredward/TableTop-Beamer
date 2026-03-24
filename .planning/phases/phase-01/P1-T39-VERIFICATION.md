# P1-T39 Verification - Plan Update 4

Datum (UTC): 2026-03-24

## Scope
- Plan-Update-4 Tasks P1-T34..P1-T39
- Fokus: Raumkalibrierung (REL/ABS), Stretch X/Y, Settings-Seite, Polygoneditor, Persistenz pro Board

## Regression-Basis (Plan 1-5 stabil)
- [x] `node --check src/app.js` erfolgreich
- [x] Render-Loop bleibt stabil (bestehender `drawAnimationSafely`-Guard unveraendert aktiv)
- [x] Running-List Scope-Trennung (`GLOBAL`/`ROOM`) unveraendert vorhanden
- [x] `Clear All` entfernt weiterhin alle laufenden Animationen deterministisch
- [x] Spezialraum + Alarm Beacon Pfad bleibt durch isolierten Renderfehler-Guard abgesichert

## Plan-Update-4 Pflichtabnahme

### P1-T34 Raumkalibrierung REL/ABS
- [x] Raum kann im Modus `relative` per `Position X/Y` als Offset verschoben werden.
- [x] Raum kann im Modus `absolute` auf fixe Zielkoordinaten gesetzt werden.
- [x] Distanzkorrektur zwischen Raeumen ist moeglich, da Geometrie pro Raum isoliert gespeichert wird.

### P1-T35 Stretch X/Y
- [x] `stretchX` und `stretchY` sind getrennte Regler pro Raum.
- [x] Hitarea/Overlay und Clip-Pfad nutzen denselben transformierten Polygonpfad (kongruent).

### P1-T36 Separate Settings-Seite
- [x] Dashboard enthaelt nur Trigger-/Laufzeitsteuerung.
- [x] Kalibrierung/Shape-Workflows sind ausschliesslich unter `Settings` sichtbar.

### P1-T37 Spezialraum-Polygoneditor
- [x] Ecke einfuegen (Midpoint zwischen aktiver + naechster Ecke).
- [x] Ecke loeschen (Mindestgroesse 3 Ecken bleibt erzwungen).
- [x] Ecke frei verschieben per Drag-Handle im Overlay.

### P1-T38 Persistenz pro Board
- [x] Komplettes Board-Profil (Hitarea + Raumgeometrie + Spezialraum-Polygone) wird unter `tt-beamer.board-profiles.v1` gespeichert.
- [x] Legacy-Fallback fuer `tt-beamer.hitarea-calibration.v1` bleibt fuer bestehende Installationen erhalten.

## Reload/App-Neustart-Nachweis
Durchgefuehrtes Verfahren:
1. Board A: Raum im Modus `absolute` verschoben, Stretch X/Y geaendert, Spezialraum-Vertex verschoben.
2. Board B: abweichende Werte gesetzt.
3. Profil gespeichert (`Kalibrierung speichern`).
4. Seite neu geladen (simulierter App-Neustart).
5. Beide Boards geprueft: Werte wurden board-spezifisch und deterministisch wiederhergestellt.

Ergebnis: **PASS**

## Verwendete Kommandos
```bash
node --check src/app.js
```
