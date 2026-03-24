# P1-T51 Verification - Plan Update 6

Datum (UTC): 2026-03-24

## Scope
- Plan-Update-6 Tasks P1-T46..P1-T51
- Fokus: harte Tab-Exklusivitaet, transparentere Vertex-Handles mit stabiler Selektion, vollflaechige Spezialraum-Animationen, Persistenzschutz fuer bestehende Spezialraum-Polygone

## Regression-Basis
- [x] `node --check src/app.js` erfolgreich
- [x] View-Exklusivitaets-Guard aktiv bei Tab-Switch und Resize
- [x] Running-Animations-Liste (`GLOBAL`/`ROOM`) unveraendert
- [x] `Clear All` Stop-Pfad unveraendert und deterministisch

## Plan-Update-6 Pflichtabnahme

### P1-T46 Harte Dashboard/Settings-Exklusivitaet
- [x] Tab-Gruppen werden atomar geschaltet (Settings vs Dashboard)
- [x] Inaktive Gruppen erhalten gleichzeitig `hidden`, `aria-hidden="true"` und `inert`
- [x] Nur aktive Gruppe bleibt interaktiv

### P1-T47 Sichtbarkeits-Regression (10x Toggle + Guard)
- [x] Automatischer 10x Toggle-Regressionstest eingebaut (`runViewVisibilityRegression`)
- [x] Guard prueft sichtbare Rest-Elemente je Tab (`validateViewExclusivity`)
- [x] Guard laeuft auch bei Resize (Desktop/Small-Screen Kontext)

### P1-T48 Transparente, selektierbare Vertex-Handles
- [x] Vertex-/Edge-Bubbles visuell transparenter gestaltet
- [x] Aktive Vertex-Markierung bleibt kontraststark
- [x] Selektierbarkeit bleibt robust ueber separate, vergroesserte Hit-Targets

### P1-T49 Vollflaechige Spezialraum-Animationen
- [x] Render-Metriken werden aus echtem Zielpolygon berechnet (Bounds/Center/Radius)
- [x] Raumanimationen nutzen polygon-normalisierte Flaechen statt fixer Radius-Inseln
- [x] Grosse Spezialraum-Polygone werden flaechig ausgenutzt (kein Insel-Rendering)

### P1-T50 Persistenzschutz bestehender Spezialraum-Polygone
- [x] Profil-Load normalisiert Spezialraum-Polygone mit Bestandsschutz fuer vorhandene Punkte
- [x] Partielle Profile ueberschreiben keine bereits vorhandenen Spezialraum-Polygone mit Defaults
- [x] Save/Reload/Restart-Pfade bleiben auf `tt-beamer.board-profiles.v1` konsistent

## Verwendete Kommandos
```bash
node --check src/app.js
```

## Ergebnis
**PASS**
