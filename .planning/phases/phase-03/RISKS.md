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

## R11 GIF bleibt auf Einzelbild-Pulsing statt echter Loop-Wiedergabe
- Risiko: GIF-Raumanimationen werden weiterhin als statischer Frame mit Alpha-/Scale-Puls simuliert statt als echte GIF-Framefolge.
- Impact: Hoch, verpflichtendes Feedback nicht erfuellt; visuelle Qualitaet und inhaltliche Erwartung verletzt.
- Gegenmassnahme: Decoder-/Renderpfad auf echte GIF-Framefolge umstellen, Loop-Verifikation mit Frame-Differenz-Nachweis als Pflichtgate.

## R12 GIF-Mapping pro Animation driftet oder ist nicht persistent
- Risiko: UI-Mapping wird nicht sauber pro Animation gespeichert oder beim Reload/Restart verloren/ueberschrieben.
- Impact: Hoch, Operator verliert reproduzierbare Konfiguration.
- Gegenmassnahme: explizites Persistenzschema pro Animation, Normalisierung/Validierung beim Laden, Save/Reload/Restart-Regression als Gate.

## R13 Mapping-Edit beeinflusst laufende Instanzen unkontrolliert
- Risiko: Aenderung des GIF-Mappings wirkt auf falsche Instanzen oder erzeugt Running-List-Drift.
- Impact: Mittel bis hoch, Kontrollverlust bei Live-Triggern.
- Gegenmassnahme: Mapping auf Konfigurationsschicht trennen, laufende Instanzen ueber stabile `animation.id` isolieren, Edit-Roundtrip-Tests fuer aktive Sessions.

## R14 Direct-Start umgeht GIF-Mapping im Startpfad
- Risiko: Beim direkten Raumstart wird gemapptes GIF nicht bis `createAnimation` durchgereicht; Runtime faellt implizit auf Default-GIF zurueck.
- Impact: Hoch, Ende-zu-Ende-Mapping verletzt und Operator bekommt inkonsistente GIF-Ausgabe.
- Gegenmassnahme: Direct-Start-Parameterpfad explizit auf gemapptes `gifAssetPath` verdrahten; Regression fuer Direct-Start + Edit + Reload verpflichtend.

## Statusupdate nach Plan 3-2
- R2/R4/R5/R7/R10 wurden fuer den aktuellen Rework-Scope durch Regression + Soak-Nachweise auf "beobachten" reduziert.
- Neues verpflichtendes Feedback fuer Plan 3-3 hebt R11/R12 auf Blocker-Niveau (P0), bis echte GIF-Loops und Mapping-Persistenz nachgewiesen sind.

## Statusupdate nach Plan 3-3
- R11 ist durch Decoder-basierte GIF-Frame-Loop-Runtime mit Verifikation in `3-3-VERIFICATION.md` auf "beobachten" reduziert.
- R12 ist durch GIF-Mapping-UI + Persistenzpfad (`animationGifMap`) und Nachweise in `P3-T30-REGRESSION.md` auf "beobachten" reduziert.
- R13 bleibt als Betriebsrisiko auf "beobachten" (instanzscharfer `gifAssetPath` aktiv, weitere Langzeitbeobachtung empfohlen).

## Statusupdate fuer Plan 3-4 Hotfix-Add-on
- Verify-Work-3-Follow-up hebt R14 auf Blocker-Niveau (P0), bis Direct-Start den gemappten GIF-Pfad deterministisch an `createAnimation` uebergibt und Regression + Artefakt-Sync vorliegen.

## Statusupdate nach Plan 3-4
- R14 ist durch Direct-Start-Parameterverdrahtung (`gifAssetPath` -> `createAnimation`) sowie Regression in `P3-T33-REGRESSION.md` auf "beobachten" reduziert.
