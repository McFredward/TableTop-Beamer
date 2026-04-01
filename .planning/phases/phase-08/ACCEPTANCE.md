# Phase 8 Acceptance

## Regression- und Verifikationsstrategie
- Model-first: Mehrbereichsmodell und Migration sind zuerst fachlich korrekt, danach UX-Polish.
- Union-first: inside/outside wird ausschliesslich ueber die Union aller Play-Areas verifiziert.
- Migration-first: Bestandsdaten duerfen weder verschwinden noch stillschweigend verfremdet werden.
- Import-safety-first: Upload validiert Typ/Groesse/Pfad robust vor Persistenz.
- Evidence-first: jeder P0-Pfad benoetigt reproduzierbare Verify-Evidenz.
- Non-regression-duty: bestehende Trigger/Running/Save/Reload/Final-Output bleiben stabil.

## Pflichtmatrix (Plan 8-1)
- Multi-Play-Area-Create/Delete-Test: mehrere getrennte Areas koennen erstellt/geloescht und persistent gespeichert werden.
- Active-Area-Selection-Test: Editoraktionen wirken nur auf die aktive Play-Area und springen nicht implizit.
- Union-Inside-Render-Test: inside-Effekte erscheinen in jeder Area der Vereinigungsflaeche.
- Union-Outside-Render-Test: outside-Effekte erscheinen ausschliesslich ausserhalb der Vereinigungsflaeche.
- Union-Boundary-Leak-Test: keine Pixel-/Maskenlecks an Kanten oder zwischen getrennten Areas.
- Render-Input-Parity-Test: Hit-Tests/Selektion folgen derselben Geometriequelle wie das Clipping.

- Legacy-Migration-Load-Test: alte Single-Area-Daten werden beim Laden korrekt nach `playAreas[]` migriert.
- Migration-Idempotenz-Test: wiederholtes Laden/Speichern erzeugt keinen Drift und keine Doppelkonvertierung.
- Data-Preservation-Test: bestehende Raum-/Polygon-/Konfigurationsdaten bleiben nach Migration unveraendert nutzbar.
- Save-Reload-Restart-Test: Mehrbereichsdaten bleiben ueber Save/Reload/Restart konsistent erhalten.

- Image-Upload-Success-Test: gueltige Bilddatei (`jpg`/`jpeg`/`png`/`webp`) wird serverseitig gespeichert und als Board angelegt.
- Image-Upload-Validation-Test: ungueltige Typen/Groessen werden sauber mit klarer Fehlermeldung abgewiesen.
- Image-Board-Catalog-Test: neues Bildboard erscheint nach Upload im Katalog und ist direkt waehlbar.
- Image-Board-Manual-Polygon-Test: nach Upload ist manuelles Zeichnen von Play-Areas/Rooms sofort moeglich.
- Image-Import-Immediate-Select-Test: nach Upload+Import ist das neue Board direkt im Dropdown sichtbar und unmittelbar aktiv selektiert.
- Image-Import-Empty-Start-Test: importiertes Bildboard ohne vorhandene Play-Areas/Rooms startet stabil und erlaubt anschliessendes manuelles Anlegen.

- Settings-Room-Click-Priority-Test: Klick auf Room selektiert den Room deterministisch, auch wenn Room innerhalb einer Play-Area liegt.
- Settings-Play-Area-Click-Removed-Test: Board-Klick selektiert keine Play-Area mehr; Room-Selektion bleibt priorisiert.
- Selection-Edit-NonRegression-Test: Vertex-/Room-Edit und Keyboard-Aktionen bleiben nach Selection-Arbitration-Fix stabil.

- Outside-Sandstorm-Availability-Test: `Outside Sandstorm` ist als Outside-Animation auswuehlbar und an `sandstorm.mp4` gebunden.
- Outside-Sandstorm-Muted-Test: `Outside Sandstorm` laeuft verpflichtend ohne Audio (auch bei globalen Audio-Einstellungen unveraendert stumm).
- Outside-Section-Ownership-Test: Outside-Animationscontrols sind ausschliesslich in `Outside Animations`; `Play Area Editor` enthaelt keine Outside-Config-Controls.
- Outside-Animation-Dropdown-Test: Dropdown waehlt deterministisch die zu bearbeitende Outside-Animation; Settings aendern nur den aktiven Eintrag.
- Outside-Asset-Mapping-Type-Test: pro Animation sind Asset-Typen `gif`/`mp4`/coded key validierbar und persistierbar.
- Outside-Animation-Create-Test: UI kann neue Outside-Animation anlegen; neuer Eintrag ist direkt editierbar und triggerbar.
- Outside-Resource-Picker-Test: vorhandene Dateien aus `resources` sind auswuehlbar und werden korrekt als `assetRef` uebernommen.
- Outside-Persistence-Definitions-Test: Definitionen + Settings ueberleben Save/Reload/Restart und Defaults-Apply ohne Drift.
- Outside-Legacy-Migration-Test: bestehende Legacy-Outside-Konfigurationen werden verlustfrei in das neue Definitionsmodell ueberfuehrt.

- Outside-Coded-Space-Restore-Test: `Coded/Space` rendert wieder erwartungskonform und bleibt nicht auf schwarzem Frame/Fallback stehen.
- Outside-Sandstorm-Stability-Test: `Outside Sandstorm` spielt kontinuierlich ohne permanentes Restart/Rewind-Flackern im Laufzeitbetrieb.
- Outside-Asset-Type-Stability-Test: Asset-Type-Dropdown (`gif`/`mp4`/coded key) springt nicht zurueck und bleibt bis explizitem Apply stabil editierbar.
- Outside-Apply-Atomicity-Test: `Apply changes` uebernimmt Type + Resource + Optionen atomar im selben Commit, ohne Teilapply bei Zwischenzustand.

- Outside-Coded-StarSpace-Restore-Test: `Coded/Space` zeigt wieder den funktionierenden coded Star-Space Effekt statt schwarzem Frame/Fallback.
- Outside-Asset-Picker-Coded-Filter-Test: bei `assetType=coded` listet der Picker ausschliesslich coded renderer keys.
- Outside-Asset-Picker-MP4-Filter-Test: bei `assetType=mp4` listet der Picker ausschliesslich `.mp4` Assets aus `resources`.
- Outside-Asset-Picker-GIF-Filter-Test: bei `assetType=gif` listet der Picker ausschliesslich `.gif` Assets aus `resources`.
- Outside-Asset-Picker-Type-Switch-Test: Wechsel zwischen `coded`/`mp4`/`gif` aktualisiert die Pickerliste deterministisch ohne stale Optionen oder Auto-Revert.
- Outside-Historical-HF5-Closure-Reference: HF5-Evidenz bleibt als abgeschlossene Historie dokumentiert (`P8-T47`..`P8-T51`), ist aber kein aktiver Zielpfad mehr nach Boomerang-Decommission.
- Outside-MP4-Restore-Test: Outside-Animationen mit `assetType=mp4` spielen wieder stabil (Forward-Loop, non-boomerang) statt no-op/Black-Frame.
- Outside-MP4-Root-Cause-Evidence-Test: HF8 dokumentiert reproduzierbar Ursache und fixierten Lifecycle fuer den mp4-Ausfall im Outside-Pfad.
- Outside-Conditional-Mode-Direction-Visible-Test: `outside mode` und `outside direction` erscheinen nur bei kontextfaehigen Kombinationen (z. B. `coded` + `outside-space`).
- Outside-Conditional-Mode-Direction-Hidden-Test: bei `gif`/`mp4` und nicht-applicable coded renderern sind `outside mode`/`outside direction` konsequent ausgeblendet.
- Outside-Conditional-Strict-Unmount-Test: nicht-applicable `outside mode`/`outside direction` sind nicht nur disabled, sondern vollstaendig aus dem DOM entfernt.
- Outside-Visibility-Transition-Test: Wechsel zwischen `coded`/`gif`/`mp4` sowie coded-non-applicable `assetRef` toggelt die Sichtbarkeit deterministisch ohne stale UI-Reste.
- Outside-Editor-Apply-Only-UX-Test: redundante `Use selected resource asset`-Buttons sind entfernt; `Apply changes` ist der einzige sichtbare Commit-CTA fuer Asset-/Optionsaenderungen.
- Outside-MP4-Start-Stop-Restart-Test: Outside-mp4 startet, stoppt und startet erneut deterministisch ohne Black-Frame/no-op/frozen-first-frame.
- Outside-MP4-Reload-Restart-Stability-Test: Save/Reload/Restart behaelt funktionales Outside-mp4-Playback ohne Rueckfall.
- Outside-MP4-Deterministic-Visibility-Test: Outside-mp4 ist bei jedem Triggerstart sichtbar auf der Outside-Layer (kein hidden/no-op/first-frame-black).
- Outside-MP4-Seamless-Loop-Continuity-Test: mindestens N aufeinanderfolgende Loop-Zyklen laufen ohne sichtbaren Replay-Break, Black-Frame oder Restart-Gap/Flicker.
- Outside-MP4-Visibility-Lifecycle-Continuity-Test: Sichtbarkeit bleibt ueber Start/Stop/Re-Start sowie Save/Reload/Restart ohne intermittierenden Visibility-Verlust stabil.
- Outside-MP4-Apply-Persistence-NonRegression-Test: `Apply changes`, Save/Reload/Restart und bestehende Editor-Persistenz bleiben nach Visibility/Loop-Fix unveraendert deterministisch.
- Outside-MP4-Runtime-Evidence-Matrix-Test: runtime-fokussierte Evidenz dokumentiert Visibility- und Loop-Kontinuitaet reproduzierbar ueber Mehrzykluslauf.

- Room-Animations-Definition-CRUD-Parity-Test: Room-Animationen sind wie outside/effects per create/edit/delete im UI verwaltbar.
- Room-Animations-AssetType-Parity-Test: Room-Animationen unterstuetzen `assetType` `coded`/`mp4`/`gif` inkl. typspezifischem Asset-Mapping.
- Room-Animations-No-Code-Extension-Test: neu angelegte Room-Animation ist ohne Codeaenderung sofort triggerbar/start-edit-stop-faehig und bleibt nach Save/Reload erhalten.
- First-Start-Defaults-Autoload-Test: bei leerem lokalen Browserzustand werden serverseitige Defaults automatisch geladen und angewendet.
- Defaults-Button-Reset-Semantics-Test: `Load and apply defaults` bleibt in spaeteren Sessions ein expliziter Reset-/Wiederherstellen-Flow und funktioniert deterministisch.

- Final-Output-Fullscreen-Fit-Test: `/output/final` fuellt im Browser-Fullscreen den vorgesehenen Renderbereich vollstaendig ohne Top-Left-Teilausschnitt.
- Final-Output-Resize-Recompute-Test: Stage/Canvas passen sich bei Window-Resize deterministisch auf neue Aufloesung an (kein stale viewport).
- Final-Output-Orientation-Recompute-Test: Orientation-Wechsel recalculiert Geometrie/Viewport korrekt ohne Clipping-/Coords-Drift.
- Final-Output-Fullscreenchange-Recompute-Test: Eintritt/Austritt Browser-Fullscreen triggern konsistenten Reflow ohne Letterbox-/Offset-Artefakte.
- Final-Output-DPR-Recompute-Test: Device-Pixel-Ratio-Aenderung (Display-Switch/Zoom) aktualisiert Backbuffer sauber ohne unscharfen oder versetzten Ausschnitt.
- Final-Output-Render-Coord-Clip-NonRegression-Test: inside/outside Masken, Room-Clips und globale Renderer bleiben unter Reflow/Fit semantisch korrekt.

- Boomerang-Removed-UI-Test: Outside-Editor zeigt keine Boomerang-Controls mehr; Nutzer kann Boomerang nicht mehr aktiv setzen.
- Boomerang-Removed-Runtime-Test: Outside-MP4-Playback nutzt keinen Forward/Reverse-Boomerang-Zyklus mehr; normaler Playback-Pfad bleibt stabil.
- Boomerang-Removed-Persistence-Test: Save schreibt keine aktive Boomerang-Konfiguration; Legacy-Input mit boomerang-Feld bleibt ladbar ohne Aktivierung.
- Inside-Section-Parity-Test: `Inside Animations` existiert als eigene Settings-Sektion mit Outside-paritaetischer Struktur.
- Inside-Animation-Create-Test: neue Inside-Animation ist in UI anlegbar, sofort editierbar und runtime-nutzbar.
- Inside-Asset-Type-Selection-Test: pro Inside-Animation ist `assetType` als `coded`/`gif`/`mp4` deterministisch waehlbar.
- Inside-Asset-Picker-Coded-Filter-Test: bei `assetType=coded` listet der Picker ausschliesslich coded renderer keys.
- Inside-Asset-Picker-MP4-Filter-Test: bei `assetType=mp4` listet der Picker ausschliesslich `.mp4` Assets aus `resources`.
- Inside-Asset-Picker-GIF-Filter-Test: bei `assetType=gif` listet der Picker ausschliesslich `.gif` Assets aus `resources`.
- Inside-Apply-Atomicity-Test: `Apply changes` uebernimmt `assetType` + `assetRef` + Optionen atomar ohne Teilapply.
- Inside-Persistence-Definitions-Test: Inside-Definitionsmodell bleibt ueber Save/Reload/Restart/Defaults deterministisch erhalten.
- Definition-Driven-Extensibility-Test: neue Inside/Outside-Animationseintraege sind ueber Definitionsdaten/UI hinzufuegbar, ohne codegebundene Sonderintegration pro neuem Eintrag.

- Non-Regression-Running-Test: Start/Edit/Stop/Clear verhalten sich unveraendert stabil.
- Non-Regression-Final-Output-Test: `/output/final` bleibt funktional und zeigt korrekte inside/outside Separation.
- Non-Regression-Sync-Test: Multi-Client-Synchronisation bleibt fuer relevante Kontexte stabil.

## Inkrementelle Pflicht-Gates
- Nach P8-T1..P8-T3: Datenmodell + Loader/Save-Migration sind konsistent und idempotent.
- Nach P8-T4..P8-T7: Multi-Area-Editor + Union-Clipping sind funktional und leak-frei.
- Nach P8-T8..P8-T10: Bild-Upload-Import ist serverseitig sicher und UX-seitig bedienbar.
- Nach P8-T11..P8-T12: Regression ist PASS und alle Artefakte/globalen Tracking-Dateien sind synchron.
- Nach P8-T18..P8-T20: Room-Selection-Prioritaet ist hergestellt; Play-Area-Click-Selection ist entfernt.
- Nach P8-T21..P8-T23: Import-Success zeigt sofort Dropdown-Sichtbarkeit + Auto-Select; Empty-Start ist stabil.
- Nach P8-T24: Hotfix-Verifikation ist PASS und alle Artefakte/globalen Tracking-Dateien sind synchron.
- Nach P8-T25..P8-T27: Outside-Sandstorm ist verfuegbar/stumm und Boomerang-Playback arbeitet lifecycle-stabil.
- Nach P8-T28..P8-T32: Outside-Settings sind ausgelagert, Dropdown/Edit/Create/Asset-Picker funktionieren deterministisch.
- Nach P8-T33..P8-T34: Persistenz/Migration fuer Outside-Animationen ist PASS und Artefakt-Sync ist abgeschlossen.
- Nach P8-T35..P8-T37: Outside-Playback-/Editor-Regressionen (`Coded/Space`, Sandstorm, Boomerang, Asset-Type) sind geschlossen.
- Nach P8-T38..P8-T39: `Apply changes` atomisiert Outside-Edit-Commits; Save/Reload/Restart-Determinismus ist PASS.
- Nach P8-T40: Hotfix-Verifikation ist PASS und alle Artefakte/globalen Tracking-Dateien sind synchron.
- Nach P8-T41: `Coded/Space` ist erneut auf funktionierendem coded Star-Space Verhalten verifiziert.
- Nach P8-T42..P8-T44: Asset-Picker-Filterung ist pro `assetType` strikt und deterministisch ohne stale/revert Drift.
- Nach P8-T45: Boomerang-Full-Cycle (Forward->Reverse->Repeat) ist ohne sichtbares Flicker/Restart-Jump PASS.
- Nach P8-T46: Hotfix-Verifikation ist PASS und alle Artefakte/globalen Tracking-Dateien sind synchron.
- Nach P8-T47: Root-Cause fuer Reverse-Flicker ist reproduzierbar dokumentiert und fix-gerichtet isoliert.
- Nach P8-T48..P8-T49: Sandstorm-Boomerang-Reverse ist visuell stabil; normaler mp4-Non-Boomerang-Pfad bleibt regressionsfrei PASS.
- Nach P8-T50..P8-T51: Apply/Persistenz-Paritaet bleibt intakt; Regression- und Evidence-Matrix ist vollstaendig dokumentiert.
- Nach P8-T52: Hotfix-Verifikation ist PASS und alle Artefakte/globalen Tracking-Dateien sind synchron.
- Nach P8-T53..P8-T54: Fullscreen-Root-Cause ist isoliert; Stage/Canvas-Recompute ist viewport- und DPR-korrekt umgesetzt.
- Nach P8-T55..P8-T56: Resize/Orientation/Fullscreen/DPR-Events fuehren deterministisch zu vollem `/output/final`-Fit ohne Top-Left-Offset/Letterbox.
- Nach P8-T57: Rendering/Coords/Clip bleiben unter dynamischem Reflow regressionsfrei PASS.
- Nach P8-T58: Hotfix-Verifikation ist PASS und alle Artefakte/globalen Tracking-Dateien sind synchron.
- Nach P8-T59..P8-T60: Boomerang ist aus UI/Runtime/Persistenz entfernt; Legacy-Ladekompatibilitaet bleibt als no-op-Guard erhalten.
- Nach P8-T61..P8-T62: `Inside Animations` ist Outside-paritaetisch lieferbar (Create/Dropdown/Type-Filter/Apply-Atomicity).
- Nach P8-T63: Inside-Definitionsmodell ist ueber Save/Reload/Restart/Defaults migrationsstabil PASS.
- Nach P8-T64: P0-Verifikation ist PASS und alle Artefakte/globalen Tracking-Dateien sind synchron.
- Nach P8-T65..P8-T66: Outside-mp4-Playback ist wiederhergestellt und bleibt gegen Regression auf gif/coded/non-boomerang Pfade abgesichert.
- Nach P8-T67..P8-T68: `outside mode`/`outside direction` folgen strikt der kontextsensitiven Visibility-Regel (sichtbar nur wenn applicable, sonst hidden).
- Nach P8-T69: UI ist auf Apply-only Commit bereinigt; redundante `Use selected resource asset`-Buttons sind entfernt.
- Nach P8-T70: HF8-Verifikation ist PASS und alle Artefakte/globalen Tracking-Dateien sind synchron.
- Nach P8-T71..P8-T72: Outside-mp4-Rueckfallpfad ist root-cause-basiert geschlossen; Start/Stop/Re-Start bleibt stabil.
- Nach P8-T73: gif/coded und Persistenz-/Apply-Pfade bleiben nach mp4-Fix regressionsfrei PASS.
- Nach P8-T74..P8-T75: nicht-applicable Controls sind strikt unmounted; Visibility-Transitions bleiben deterministic ohne disabled-only Restzustand.
- Nach P8-T76: HF9-Verifikation ist PASS und alle Artefakte/globalen Tracking-Dateien sind synchron.
- Nach P8-T77..P8-T78: Outside-mp4-Nicht-Sichtbarkeitsursache ist reproduzierbar isoliert und deterministischer Visible-Start ist hergestellt.
- Nach P8-T79..P8-T80: Outside-mp4 looped nahtlos ohne replay break/black frame/gap und bleibt lifecycle-stabil ueber Start/Stop/Re-Start/Reload.
- Nach P8-T81: `Apply changes` und Persistenzpfade bleiben nach HF10-Fix regressionsfrei PASS.
- Nach P8-T82: HF10-Verifikation inkl. runtime-fokussierter Visibility/Loop-Evidence ist PASS und alle Artefakte/globalen Tracking-Dateien sind synchron.
- Nach P8-T83..P8-T85: Room-Animationen sind definitionsgetrieben CRUD-faehig mit typed assets (`coded`/`mp4`/`gif`) und ohne codegebundene Einzelintegration runtime-stabil.
- Nach P8-T86..P8-T87: first-start ohne lokale Daten autoloaded server defaults; `Load and apply defaults` bleibt als expliziter spaeterer Reset-Flow erhalten.
- Nach P8-T88: HF11-Verifikation ist PASS und alle Artefakte/globalen Tracking-Dateien sind synchron.

## Definition of Done
- Plan 8-1 P0-Tasks P8-T1..P8-T12 sind abgeschlossen.
- Mehrere Play-Areas pro Board sind produktiv nutzbar (create/delete/select/persist).
- Inside/Outside-Semantik basiert fachlich korrekt auf der Union aller Play-Areas.
- Legacy-Datenmigration ist verlustfrei und idempotent nachgewiesen.
- Board-Import per Bildupload ist funktional, validiert und serverseitig persistiert.
- Nach Bildupload ist der manuelle Polygonworkflow sofort verfuegbar.
- Room-Klick in Settings priorisiert Selektion deterministisch; Play-Area-Selektion per Klick ist entfernt.
- Erfolgreicher Bildupload fuehrt zu sofort sichtbarem Board im Dropdown und direkter Aktivselektion.
- Importierte Bildboards ohne initiale Polygone sind als gueltiger Startzustand ohne Runtime-/Editorfehler bedienbar.
- `Outside Sandstorm` ist als neue Outside-Animation produktiv verfuegbar, nutzt `sandstorm.mp4` und bleibt ohne Audio.
- Outside-Animationseinstellungen leben in eigenstaendiger Sektion `Outside Animations`; `Play Area Editor` ist davon entkoppelt.
- Asset-Mapping pro Outside-Animation ist in UI bearbeitbar (`gif`/`mp4`/coded key) inkl. Auswahl vorhandener `resources`-Dateien.
- UI kann neue Outside-Animationen anlegen; Definitionen + Settings sind persistent ueber Profile/Defaults.
- `Coded/Space` ist auf den zuletzt funktionierenden coded Star-Space Renderpfad zurueckgefuehrt und bleibt sichtbar stabil.
- `Outside Sandstorm` spielt stabil ohne sichtbares Restart-/Rewind-Flackern.
- `Apply changes` ist als verpflichtender Commit-Schritt im Outside-Animation-Editor vorhanden und uebernimmt Type/Resource/Optionen atomar.
- Asset-Picker filtert strikt typspezifisch (`coded` keys, `mp4` nur `.mp4` aus `resources`, `gif` nur `.gif` aus `resources`).
- `Apply changes` und Persistenz (`Save/Reload/Restart`) bleiben fuer Outside-Definitionen voll funktionsfaehig und deterministisch.
- `/output/final` passt im Browser-Fullscreen auf jede Display-Aufloesung ohne Top-Left-Teilausschnitt, Offset oder Letterbox-Bug.
- Canvas/Stage werden bei Resize, Orientation, Browser-Fullscreen-Wechsel und Device-Pixel-Ratio-Aenderung deterministisch neu berechnet.
- Rendering-, Koordinaten- und Clipping-Pfade bleiben unter Reflow/Fit stabil; keine Masken- oder Coords-Regression.
- Boomerang ist vollstaendig entfernt (keine UI-Bedienung, keine Runtime-Ausfuehrung, keine aktive Persistenznutzung).
- Legacy-Daten mit Boomerang-Feldern bleiben ladbar, werden aber ohne Boomerang-Semantik normalisiert.
- `Inside Animations` bietet Outside-paritaetischen Editor inkl. Create-Flow, `assetType` (`coded`/`gif`/`mp4`), typspezifischem Asset-Picker und `Apply changes`.
- Inside-Animationsdefinitionen + Settings bleiben ueber Save/Reload/Restart/Defaults deterministisch und migrationsstabil.
- Neue Inside-/Outside-Animationen sind definitionsgetrieben hinzufuegbar, ohne Codeaenderung pro neuem Animationseintrag.
- Outside-mp4-Playback funktioniert wieder stabil fuer non-boomerang Betrieb und bleibt in Save/Reload/Restart regressionsfrei.
- `outside mode`/`outside direction` sind kontextsensitiv sichtbar und fuer `gif`/`mp4` sowie nicht-applicable coded renderer nicht sichtbar.
- Nicht-applicable `outside mode`/`outside direction` sind strikt unmounted (kein disabled-only Platzhalter/Rest-Element sichtbar).
- Outside-mp4 bleibt ueber Start/Stop/Re-Start sowie Save/Reload/Restart deterministisch stabil ohne Black/no-op/frozen Rueckfall.
- Outside-mp4 ist in jedem gueltigen Startpfad deterministisch sichtbar auf der Outside-Layer (kein hidden/no-op/first-frame-black).
- Outside-mp4 looped nahtlos ohne sichtbaren Replay-Break, Black-Frame oder Restart-Gap/Flicker.
- Redundante `Use selected resource asset`-Buttons sind entfernt; `Apply changes` ist der einzige explizite Commit-Button.
- Runtime-fokussierte Evidence-Matrix fuer Outside-mp4 dokumentiert Visibility-Continuity + Seamless-Loop-Continuity reproduzierbar ueber Mehrzykluslaeufe.
- Room-Animationen folgen demselben definitionsgetriebenen Editiermodell wie outside/effects (create/edit/delete) und unterstuetzen `coded`/`mp4`/`gif`.
- Neue Room-Animationen koennen ohne Codeaenderung angelegt, gestartet, bearbeitet, gestoppt und persistent gespeichert werden.
- Bei first-start ohne lokale Browserdaten werden serverseitige Defaults automatisch geladen und angewendet.
- `Load and apply defaults` bleibt als expliziter Reset-/Wiederherstellen-Flow fuer spaetere Session-Aenderungen erhalten.
- Keine Regression in Running, Save/Reload/Restart, Sync und `/output/final`.
- Phase-8-Artefakte sowie `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/CURRENT_PHASE.md` sind konsistent aktualisiert.

## Execution Result (Plan 8-1)
- Status: PASS
- Evidence: `.planning/phases/phase-08/8-1-VERIFICATION.md`

## Execution Result (Plan 8-HF1)
- Status: PASS
- Evidence:
  - `.planning/phases/phase-08/8-HF1-VERIFICATION.md`
  - `.planning/phases/phase-08/P8-T20-REGRESSION.md`
  - `.planning/phases/phase-08/P8-T23-EMPTY-START-VALIDATION.md`

## Execution Result (Plan 8-HF2)
- Status: PASS
- Evidence:
  - `.planning/phases/phase-08/8-HF2-VERIFICATION.md`
  - `debug/p8-hf2-api-resources.json`
  - `debug/p8-hf2-api-health.json`

## Execution Result (Plan 8-HF3)
- Status: PASS
- Evidence:
  - `.planning/phases/phase-08/8-HF3-VERIFICATION.md`
  - `.planning/phases/phase-08/P8-T39-OUTSIDE-EDITOR-REGRESSION.md`
  - `debug/p8-hf3-api-resources.json`
  - `debug/p8-hf3-api-health.json`

## Execution Result (Plan 8-HF4)
- Status: PASS
- Evidence:
  - `.planning/phases/phase-08/8-HF4-VERIFICATION.md`
  - `.planning/phases/phase-08/P8-T45-BOOMERANG-REGRESSION.md`

## Execution Result (Plan 8-HF5)
- Status: PASS
- Evidence:
  - `.planning/phases/phase-08/8-HF5-VERIFICATION.md`
  - `.planning/phases/phase-08/P8-T47-REVERSE-ROOT-CAUSE.md`
  - `.planning/phases/phase-08/P8-T49-MP4-NON-BOOMERANG-REGRESSION.md`
  - `.planning/phases/phase-08/P8-T50-APPLY-PERSISTENCE-REGRESSION.md`
  - `.planning/phases/phase-08/P8-T51-HF5-REGRESSION.md`

## Execution Result (Plan 8-HF6)
- Status: PASS
- Evidence:
  - `.planning/phases/phase-08/8-HF6-VERIFICATION.md`
  - `.planning/phases/phase-08/P8-T53-FINAL-OUTPUT-FULLSCREEN-ROOT-CAUSE.md`
  - `.planning/phases/phase-08/P8-T57-FINAL-OUTPUT-REFLOW-REGRESSION.md`

## Execution Result (Plan 8-HF7)
- Status: PASS
- Evidence:
  - `.planning/phases/phase-08/8-HF7-VERIFICATION.md`
  - `.planning/phases/phase-08/P8-T64-HF7-REGRESSION.md`

## Execution Result (Plan 8-HF8)
- Status: PASS
- Evidence:
  - `.planning/phases/phase-08/8-HF8-VERIFICATION.md`
  - `.planning/phases/phase-08/P8-T65-OUTSIDE-MP4-ROOT-CAUSE.md`
  - `.planning/phases/phase-08/P8-T66-MP4-NON-REGRESSION.md`

## Execution Result (Plan 8-HF9)
- Status: PASS
- Evidence:
  - `.planning/phases/phase-08/8-HF9-VERIFICATION.md`
  - `.planning/phases/phase-08/P8-T71-OUTSIDE-MP4-LIFECYCLE-ROOT-CAUSE.md`
  - `.planning/phases/phase-08/P8-T73-MP4-REGRESSION-GUARD.md`
  - `.planning/phases/phase-08/P8-T74-STRICT-CONDITIONAL-UNMOUNT.md`
  - `.planning/phases/phase-08/P8-T75-VISIBILITY-TRANSITION-REGRESSION.md`

## Execution Result (Plan 8-HF10)
- Status: PASS
- Evidence:
  - `.planning/phases/phase-08/8-HF10-VERIFICATION.md`
  - `.planning/phases/phase-08/P8-T77-OUTSIDE-MP4-VISIBILITY-ROOT-CAUSE.md`
  - `.planning/phases/phase-08/P8-T80-VISIBILITY-LOOP-LIFECYCLE-REGRESSION.md`
  - `.planning/phases/phase-08/P8-T81-APPLY-PERSISTENCE-NON-REGRESSION.md`

## Execution Result (Plan 8-HF11)
- Status: PASS
- Evidence:
  - `.planning/phases/phase-08/8-HF11-VERIFICATION.md`
  - `.planning/phases/phase-08/P8-T88-HF11-REGRESSION.md`
