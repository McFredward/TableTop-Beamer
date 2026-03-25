# Phase 3 Risks

## R1 Rueckbau-Breakage vom Kombi-Modell
- Risiko: Entfernen des kombinierten Zustandsmodells bricht bestehende Trigger-/Edit-Pfade.
- Impact: Hoch, inkonsistente Runtime oder verlorene Bedienpfade.
- Gegenmassnahme: schrittweiser Rueckbau mit Kompatibilitaets-Guards und verpflichtendem Roundtrip-Test.

## R2 Running-List-Drift
- Risiko: Trigger, Runtime und Running-Uebersicht laufen auseinander (fehlende/doppelte Eintraege).
- Impact: Hoch, Operator verliert Instanzkontrolle.
- Gegenmassnahme: 1:1-Instanz-ID als Source-of-Truth, Integritaetschecks fuer Start/Edit/Stop.

## R3 Clipping-Leaks ueber Raumgrenzen
- Risiko: Partikel/Shader zeichnen ausserhalb der Zielpolygone.
- Impact: Hoch, visuelle Artefakte und falscher Raumbezug.
- Gegenmassnahme: einheitlicher Clipping-Guard fuer alle Renderpfade + Negativtests mit Grenzfaellen.

## R4 Global-Aequivalent leakt ausserhalb Zielraum
- Risiko: `alarm`/`lichtflackern` nutzen globale Renderer und zeichnen ausserhalb des Zielraums.
- Impact: Hoch, falscher Raumbezug und visuelle Artefakte.
- Gegenmassnahme: harte Raum-Clip-Gates vor jedem Draw + Negativtests fuer Nachbarraeume.

## R5 Runtime-State-Drift bei Edit
- Risiko: Edit-Aktionen verlieren Raum-/Instanzbezug und erzeugen inkonsistente Running-States.
- Impact: Hoch, Operator verliert Kontrolle.
- Gegenmassnahme: stabile IDs, atomare Update-Pfade und Roundtrip-Regression fuer Trigger/Edit.

## R6 Performance-Einbruch bei Mehrfachinstanz
- Risiko: mehrere daueraktive Einzelanimationen (hold) ueberlasten GPU/CPU.
- Impact: Hoch, Trigger-Latenz und Framedrops.
- Gegenmassnahme: fruehes Profiling, Effekt-Budgets, adaptive Dichte/Quality je Last.

## R7 GIF-Parameter wirken global statt instanzscharf
- Risiko: Aenderung von `opacity`/`playbackSpeed` einer Instanz beeinflusst andere laufende Instanzen.
- Impact: Hoch, unvorhersehbare Darstellung.
- Gegenmassnahme: Parameter strikt an `animation.id` binden und gegen Querwirkung regressionspruefen.

## R8 Regression bestehender Spezialraum-Renderpfade
- Risiko: Rework bricht stabile Spezialraeume (`nest`, `dekompression`).
- Impact: Mittel bis hoch, alte Trigger funktionieren unzuverlaessig.
- Gegenmassnahme: Regression-Suite fuer bestehende Effektpfade und schrittweise Umstellung pro Task.

## R9 Uneinheitliche Parametersemantik
- Risiko: `opacity`/`playbackSpeed` und hold-Semantik werden je Renderer unterschiedlich interpretiert.
- Impact: Mittel, schwer wartbarer Code und unvorhersehbares Verhalten.
- Gegenmassnahme: gemeinsame Parameterdefinition mit klaren Grenzen/Defaults.

## R10 Unzureichende Verifikation realer Parallelkombinationen
- Risiko: Nur Einzeltrigger getestet, nicht reale Mehrfachaktivierung ueber laengere Laufzeit.
- Impact: Hoch, Live-Betrieb zeigt spaete Fehler.
- Gegenmassnahme: Pflichtmatrix fuer 7x Einzelanimation + Parallel- und Soak-Tests als Gate.

## R11 GIF-Renderer faellt auf Pseudoanimation zurueck
- Risiko: `kaputt`/`feuer`/`schleim` zeigen nur Pulse-/Zoom-Verhalten statt nativer GIF-Framefolge.
- Impact: Kritisch, Pflichtanforderung fuer Assettreue und Immersion verletzt.
- Gegenmassnahme: GIF-Renderpfad auf echten Decoder/Frame-Loop fixieren und Pseudo-Fallback fuer diese 3 Typen deaktivieren.

## R12 PlaybackSpeed skaliert falsche Zeitbasis
- Risiko: `playbackSpeed` wirkt nicht auf native GIF-Framezeiten oder erzeugt Timing-Jitter/Frame-Skips.
- Impact: Hoch, instanzscharfe Kontrolle unzuverlaessig.
- Gegenmassnahme: einheitliche Zeitbasis je Instanz (`animation.id`) und Regression mit mehreren Geschwindigkeitsstufen.

## R13 Native GIF-Loops brechen bestehende Guards
- Risiko: Umstellung auf echtes GIF-Playback beeinflusst Running-List-Paritaet, hold-default oder Clipping.
- Impact: Hoch, zuvor geschlossene Rework-3-2-Defekte kehren zurueck.
- Gegenmassnahme: verpflichtende Regression fuer Running/hold/Clipping als P0-Gate vor Plan-3-3-Abnahme.

## Statusupdate nach Plan 3-2
- R2/R4/R5/R7/R10 wurden fuer den aktuellen Rework-Scope durch Regression + Soak-Nachweise auf "beobachten" reduziert.

## Statusupdate fuer Plan 3-3
- R11 (Pseudoanimation statt nativer GIF-Loop) ist durch P3-T26..P3-T27 auf "geschlossen" gesetzt.
- R12 (PlaybackSpeed-Zeitbasis) und R13 (Regression bestehender Guards) sind nach P3-T28..P3-T30 auf "beobachten" reduziert.
