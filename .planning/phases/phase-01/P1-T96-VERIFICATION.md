# P1-T96 Verification — Plan-Update 14

Datum: 2026-03-24  
Scope: P1-T91 .. P1-T96 (Outside-Richtung + Deep-Black-Outside, per-instanz Room-Parameter, Edit-in-place)

## 1) Umsetzungsscope

- **P1-T91:** Outside-Richtung `forward`/`reverse` in Settings integriert und im Runtime-Renderpfad live wirksam gemacht.
- **P1-T92:** Blauer Outside-Background entfernt; Outside-Basis auf tiefschwarz gestellt, Sterne/Streaks bleiben sichtbar.
- **P1-T93:** Room-Panel um `Speed` und `Sound Volume` erweitert (inkl. Edit-Load bestehender Werte).
- **P1-T94:** Runtime-Modell um instanzscharfe Room-Parameter (`intensity`, `speed`, `soundVolume`) erweitert und in Draw/Audio/Running-Meta verdrahtet.
- **P1-T95:** Running-`Edit` repariert: bestehende Room-Instanz wird auf derselben `animation.id` in-place aktualisiert (kein Duplikat).

## 2) Akzeptanzabgleich (Plan Update 14)

### A) Outside-Richtung live umschaltbar (P0ar)

Nachweis:
- Neue Settings-Option `#outside-direction` mit `forward`/`reverse`.
- Renderpfad nutzt Direction-Multiplikator fuer Sterne, Streaks und Express-Lanes.
- Umschaltung wirkt unmittelbar, da pro Frame das aktuelle Outside-Profil gelesen wird.

Ergebnis:
- **PASS**.

### B) Outside-Basis tiefschwarz (P0as)

Nachweis:
- Outside-Layer startet jetzt mit explizitem schwarzem Basis-Fill (`rgba(0,0,0,1)`) innerhalb des Outside-Clips.
- Fruehere blaue Nebula-/Depth-Gradient-Fills wurden entfernt.

Ergebnis:
- **PASS**.

### C) Per-Instance Room-Parameter (P0at)

Nachweis:
- Room-Controls bieten jetzt `Intensity`, `Speed`, `Sound Volume` fuer Start + Edit.
- Running-Instanzen speichern `speed` + `soundVolume` direkt am Animationsobjekt.
- Draw-Age fuer Room-Effekte nutzt instanzspezifischen Speed; Audio nutzt instanzspezifisches Volume.

Ergebnis:
- **PASS**.

### D) Edit-in-place auf gleicher `animation.id` (P0au/P0av)

Nachweis:
- `Edit` setzt Room-Form in Edit-Modus (`editTargetId`) und laedt aktuelle Instanzwerte.
- Speichern aktualisiert bestehende Instanz in-place (selbe `animation.id`) statt neuer Running-Instanz.
- Edit-Modus wird bei Stop/Clear/Prune sauber zurueckgesetzt.

Ergebnis:
- **PASS**.

## 3) Regression Checks

Automatisierte Checks:
- `node --check src/app.js` -> **PASS**

In-App Guards (weiterhin aktiv):
- `runViewVisibilityRegression()`
- `runLayoutScrollRegression()`
- `runZoomPanEditRegression()`
- `runPanPointerCaptureRegression()`
- `runOutsideIsolationRegression()`
- `runShipClipRegression()`

## 4) Manuelle Pflichtchecks (gem. ACCEPTANCE.md)

1. **Outside-Direction-Check:** laufenden Outside-Effekt mehrfach `forward` <-> `reverse` umschalten; sichtbare Richtungsinversion pruefen.
2. **Outside-Black-Base-Check:** bei mehreren Speed-/Intensity-Stufen verifizieren, dass ausserhalb nur tiefschwarz + Sterne/Streaks sichtbar sind.
3. **Per-Instance-Parameter-Check:** zwei Room-Instanzen mit unterschiedlichen Speed/Sound-Werten starten; Laufzeit/Meta/Audio vergleichen.
4. **Edit-In-Place-Check:** Room-Eintrag via `Edit` laden, Werte aendern und speichern; gleiche `animation.id`, kein neuer Running-Eintrag.
5. **Edit-Bug-Regression-Check:** mindestens zehn Start/Edit/Stop-Zyklen ohne inaktiven/funktionslosen `Edit`-Button.

## 5) Betroffene Dateien

- `src/app.js`
- `index.html`
- `.planning/phases/phase-01/TASKS.md`
- `.planning/phases/phase-01/P1-T96-VERIFICATION.md`

## 6) Fazit

Plan-Update-14 ist im Implementationsscope umgesetzt: Outside-Richtung ist live schaltbar, die Outside-Basis ist tiefschwarz, Room-Instanzen fuehren eigene Speed/Intensity/Sound-Parameter, und der Running-Edit-Flow aktualisiert bestehende Instanzen in-place auf derselben `animation.id`.
