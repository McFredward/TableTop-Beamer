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

## R15 Kritische Render-Regression: Board bleibt visuell leer bei laufendem Audio
- Risiko: Renderpfad/Tick bricht oder zeichnet nicht mehr, obwohl Audio-Lifecycle weiterlaeuft; Operator bekommt false-positive Laufzeitindikatoren.
- Impact: Kritisch (P0), Kernfunktionalitaet im Live-Betrieb nicht nutzbar.
- Gegenmassnahme: reproduzierbarer Bugfall + P0-Hotfix mit explizitem Sichtbarkeits-Regressionstest (Board-Frame-Delta statt Audio-Indikator).

## R16 Gross-Refactor in `app.js` erzeugt Integrationsbrueche
- Risiko: Modultrennung verschiebt Seiteneffekte/Reihenfolgen und bricht Trigger, Running-Liste, Edit oder Persistenz.
- Impact: Hoch, funktionaler Drift nach Umbau.
- Gegenmassnahme: strangler-artige Extraktion pro Domane, klare API-Grenzen, Integrationsregression nach jedem Modulschritt.

## R17 Modulgrenzen erosieren nach initialer Aufteilung
- Risiko: Cross-Imports/Shared Mutable State verwischen Grenzen zwischen `state`/`rendering`/`effects`/`audio`/`ui`/`persistence`/`api/save`.
- Impact: Mittel bis hoch, Wartbarkeit sinkt und Fehlerlokalisierung wird teuer.
- Gegenmassnahme: verbindliche Ownership pro Modulpaket, minimierte Schnittstellen und Review-Check auf Grenzverletzungen.

## R18 Lesbarkeit bleibt trotz Refactor unzureichend
- Risiko: nicht-offensichtliche Kontrollfluesse bleiben implizit; Onboarding/Debugging wird langsam und fehleranfaellig.
- Impact: Mittel, erhoehte Betriebs- und Wartungskosten.
- Gegenmassnahme: gezielte Kommentare nur an kritischen Stellen (Timing, Fallback, Entkopplung, Persistenznormalisierung) als Pflichtpunkt.

## R19 Paritaetsverlust oder neue Instabilitaet nach Modulumbau
- Risiko: Refactor besteht strukturell, aber Verhalten weicht von bestehender Runtime ab oder wird unter Last instabil.
- Impact: Hoch, Rework verfehlt Ziel trotz "sauberer" Struktur.
- Gegenmassnahme: verpflichtender Vorher/Nachher-Regression- und Soak-Nachweis als Exit-Gate fuer Plan 3-5.

## R20 Preview-Restpfade blockieren wieder sichtbares Live-Rendering
- Risiko: verbliebene Preview-State-/Routing-/Send-Rollback-Logik uebersteuert oder verzweigt den direkten Renderpfad; Animationen laufen intern, bleiben aber unsichtbar.
- Impact: Kritisch (P0), Kernworkflow unbrauchbar.
- Gegenmassnahme: Preview-Flow vollstaendig entfernen (UI + State + Routing + Send/Rollback) und direkten Live-Pfad als einzige Runtime-Quelle erzwingen.

## R21 P0-Hotfix verliert Running-/Edit-/Stop-Integritaet
- Risiko: schneller Preview-Rueckbau repariert Sichtbarkeit, verursacht aber Drift in Running-Liste oder bricht `Stop`/`Edit`.
- Impact: Hoch, Kontrollverlust im Live-Betrieb.
- Gegenmassnahme: verpflichtende Integritaets-Regression fuer Running 1:1 + `Stop`/`Edit` plus Soak vor Refactor-Fortsetzung.

## R22 Render-Loop-Komplettausfall durch Einzel-Layer-Fehler
- Risiko: Exception in einem Layer-/Clip-Path reisst den gesamten Draw-Tick ab; Board wirkt statisch bei weiterlaufendem Audio.
- Impact: Kritisch (P0), Kernnutzen der Projektion faellt aus.
- Gegenmassnahme: fail-safe Render-Scheduler mit per-layer Isolation, Tick-Liveness-Guard und expliziter Repro-Regression.

## R23 Outside-/Ship-Clip-Inkompatibilitaet auf mobilen WebViews
- Risiko: Canvas-evenodd oder Clip-Verhalten unterscheidet sich browserabhaengig; Outside-/Inside-Maskierung wird fehlerhaft oder leer.
- Impact: Kritisch (P0), sichtbare Effekte fehlen oder leaken.
- Gegenmassnahme: Capability-Detection + deterministischer Fallback-Clip-Pfad ohne evenodd-Abhaengigkeit und Mobile-Nachweis.

## R24 Outside-Fehler kaskadiert auf Inside/Room/GIF
- Risiko: Fehler im Outside-Layer stoppt nachgelagerte Layer, wodurch Inside/Room/GIF ebenfalls unsichtbar werden.
- Impact: Kritisch (P0), Mehrfachausfall trotz teilweiser Funktionalitaet.
- Gegenmassnahme: Layer-Isolation mit fail-open fuer Outside und verpflichtender Negativtest `outside fail -> inside/room/gif still visible`.

## R25 Fehlender harter Mobile-Nachweis fuer Sichtbarkeit
- Risiko: Desktop-Checks bestehen, mobile Trigger-Pfade bleiben visuell unbewiesen und regressieren unentdeckt.
- Impact: Hoch bis kritisch, reale Spieltischnutzung unsicher.
- Gegenmassnahme: verpflichtende Mobile-Matrix (global + room + GIF nach Trigger sichtbar/bewegt) als P0-Exit-Gate.

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

## Statusupdate fuer Plan 3-5 (verpflichtendes neues Feedback)
- R15 ist auf Blocker-Niveau (P0) bis Board-Rendering sichtbar wiederhergestellt und per Regression abgesichert ist.
- R16 und R19 sind bis Abschluss von Modulrefactor + Paritaetsnachweis auf Blocker-Niveau gesetzt.
- R17 und R18 sind als aktive Architektur-/Wartbarkeitsrisiken im Plan-3-5-Hardening zu bearbeiten.

## Statusupdate nach Plan 3-5
- R15 ist durch sichtbaren Render-Fallback-Guard und Verifikation (`3-5-VERIFICATION.md`) auf "beobachten" reduziert.
- R16/R17 sind nach eingefuehrter Modulstruktur (`state`, `rendering`, `effects`, `audio`, `ui`, `persistence`, `api/save`) auf "beobachten" reduziert.
- R18 ist durch gezielte Kommentierung kritischer Kontrollfluesse auf "beobachten" reduziert.
- R19 ist durch dokumentierte Regression + Soak (`P3-T42-REGRESSION.md`, `P3-T43-SOAK.md`) auf "beobachten" reduziert.

## Statusupdate fuer Plan 3-6 (P0 Hotfix)
- Neues verpflichtendes Feedback hebt Preview-bezogene Restpfade (R20) auf Blocker-Niveau, bis der Preview-Flow vollstaendig entfernt ist.
- Sichtbarkeitsdefekt fuer laufende Animationen wird erneut als P0-Blocker gefuehrt, bis Matrix-Nachweis `global`/`room`/`gif` bestanden ist.
- R21 ist als aktives Integritaetsrisiko gesetzt, bis Running-Liste sowie `Stop`/`Edit` nach Preview-Rueckbau regressionsfest dokumentiert sind.
- R16/R17/R18/R19 bleiben waehrend P0-Hotfix auf "beobachten", weiterer Refactor wird bis P0-Stabilitaetsgate eingefroren.

## Statusupdate nach Plan 3-6
- R20 ist durch vollstaendige Preview-Entfernung (UI/State/Routing/Send/Rollback) auf "beobachten" reduziert.
- Sichtbarkeitsblocker ist durch Render-Fallback-Hotfix fuer `global`/`room`/`gif` auf "beobachten" reduziert.
- R21 ist durch Running-Integritaetsguard und Nachweise in `P3-T49-REGRESSION.md`/`P3-T49-SOAK.md` auf "beobachten" reduziert.
- Refactor-Resume-Gate bleibt aktiv: weiterer Umbau erst nach dokumentiert stabilem Plan-3-6-Hotfix-Nachweis (`3-6-VERIFICATION.md`).

## Statusupdate fuer Plan 3-7 (3. P0-Blocker-Meldung)
- Reopen: Sichtbarkeitsblocker ist erneut aktiv (Board statisch bei laufendem Audio) und bis Root-Cause-Fix wieder auf P0-Blocker gesetzt.
- R22 ist neu auf Blocker-Niveau gesetzt, bis Render-Loop-Liveness unter Layer-Fehlern nachgewiesen stabil bleibt.
- R23 ist neu auf Blocker-Niveau gesetzt, bis Outside-/Ship-Clip auf mobilen WebViews ohne evenodd-Abhaengigkeit robust laeuft.
- R24 ist neu auf Blocker-Niveau gesetzt, bis Outside-Layer-Fehler Inside/Room/GIF nachweislich nicht mehr ausfallen lassen.
- R25 ist als P0-Abnahme-Gate aktiv, bis mobiler Sichtbarkeits-Hartnachweis (`global` + `room` + `gif`) dokumentiert vorliegt.

## Statusupdate nach Plan 3-7
- R22 ist durch per-Tick-Fail-Safe, Layer-Isolation und Render-Telemetrie (`window.__TT_BEAMER_RENDER_HARNESS__`) auf "beobachten" reduziert.
- R23 ist durch Capability-Detection plus Composite-Fallback fuer Outside-/Ship-Maskierung auf "beobachten" reduziert.
- R24 ist durch Outside-Failure-Isolation-Regression (Outside-Fail -> Inside/Room/GIF sichtbar) auf "beobachten" reduziert.
- R25 ist durch dokumentierten Mobile-Hard-Proof (`P3-T55-REGRESSION.md`, `P3-T55-SOAK.md`) auf "beobachten" reduziert.
