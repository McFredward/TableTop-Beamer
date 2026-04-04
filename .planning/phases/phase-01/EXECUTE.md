# Execute Phase 1

## Input Pack
- Scope: `SCOPE.md`
- Plan: `PLAN.md`
- Rework Plan: `1-3-PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Execution Order
1. Projection Core (P1-T1..P1-T4)
2. Effects Core (P1-T5..P1-T8)
3. Operator UX (P1-T9..P1-T12)
4. Safety & Hardening (P1-T13..P1-T16)

## Priority Execution Add-on (Plan Update 1)
1. P0 zuerst: P1-T17..P1-T18 (Power Outage + Safety-Pfad)
2. P1 danach: P1-T19..P1-T21 (Hex-Hitareas + Room-Submenu + Room-Clip + Scope-Trennung)
3. P2 zuletzt: P1-T22..P1-T23 (Output-Route + Running-List Stop/Edit + Smoke)

## Priority Execution Add-on (Plan Update 2)
1. P0 zuerst: P1-T24 + P1-T28 (exakte Hitarea-Passung beider Boards + manuelle Pflichtabnahme).
2. P1 danach: P1-T25 (Special-Room Mapping Cockpit/Cryoschlaf/Maschinenraeume).
3. P1 danach: P1-T26..P1-T27 (Event-Sound Layer + globale Audio-Settings).
4. Hardening: gesamter manueller Verifikationskatalog aus `ACCEPTANCE.md` im realen Beamer-Setup.

## Priority Execution Add-on (Plan Update 3)
1. P0 zuerst: P1-T29..P1-T30 (Hitarea-Calibration-Settings per Slider + Persistenz pro Board, Auto-Tuning aus Setup entfernen).
2. P0 danach: P1-T31 (Spezialraum-Animationen im visuellen Pfad reparieren, Running-List/Render konsistent machen).
3. P0 danach: P1-T32 (Kombi-Bug `Spezialraum + Alarm Beacon` beheben, Timer-/Layer-Stabilitaet sichern).
4. Hardening: P1-T33 inkl. Regression-Protokoll und manueller Kombi-Tests gemaess `ACCEPTANCE.md`.

## Priority Execution Add-on (Plan Update 4)
1. P0 zuerst: P1-T34..P1-T35 (raumindividuelle Kalibrierung relativ/absolut + Stretch X/Y pro Raum, live wirksam auf Hit-Test/Clip).
2. P0 danach: P1-T36 (Kalibrier-/Shape-Funktionen vollstaendig in separate Settings-Seite auslagern; Dashboard bereinigen).
3. P0 danach: P1-T37 (Spezialraum-Polygoneditor mit Vertex Insert/Delete/Drag und freier Polygon-Speicherung).
4. P1 Hardening: P1-T38..P1-T39 (board-spezifische Persistenz komplett absichern, Pflichtabnahme inkl. Reload/Restart-Protokoll).

## Priority Execution Add-on (Plan Update 5)
1. P0 zuerst: P1-T40 (Tab-/View-Switch reparieren: `Settings` und `Dashboard` strikt exklusiv rendern).
2. P0 danach: P1-T41..P1-T43 (Polygoneditor-UX auf sichtbare Handles + aktive Ecke + stabile Insert/Delete/Drag-Interaktionen anheben).
3. P0 danach: P1-T44 (Persistenz-Compatibility-Layer fuer bestehende kalibrierte Raumdaten umsetzen und migrieren).
4. P1 Hardening: P1-T45 inkl. Pflichtabnahme/Regression gemaess `ACCEPTANCE.md` (View-Switch, Handle-UX, Legacy-Persistenz).

## Priority Execution Add-on (Plan Update 6)
1. P0 zuerst: P1-T46..P1-T47 (harte Tab-Exklusivitaet finalisieren + Sichtbarkeits-Regression gegen Rest-Element-Leaks).
2. P0 danach: P1-T48 (Vertex-Handles deutlich transparenter machen, ohne Selektionsverlust auf Desktop/Touch).
3. P0 danach: P1-T49 (Spezialraum-Animationen polygon-normalisiert auf volle Ziel-Flaeche skalieren).
4. P0 Hardening: P1-T50..P1-T51 (Persistenzschutz fuer bestehende Polygone und Pflichtabnahme gemaess `ACCEPTANCE.md`).

## Priority Execution Add-on (Plan Update 7)
1. P0 zuerst: P1-T52 (Tab-Bug final schliessen: harte Exklusivitaet `Dashboard` vs `Settings` ohne Rest-Leaks, auch nach Resize).
2. P0 danach: P1-T53 (Layout-Refactor auf Fixed-Board + rechtsseitigen, isolierten Scroll-Container fuer Controls).
3. P0 danach: P1-T54 (aktive Animationen in separaten Uebersichtsbereich mit klarer Prioritaet umplatzieren).
4. P0 Hardening: P1-T55..P1-T56 (Desktop/Small-Screen Regression + Pflichtabnahme gemaess `ACCEPTANCE.md`).

## Priority Execution Add-on (Plan Update 8)
1. P0 zuerst: P1-T57..P1-T58 (Settings-Board-Zoom implementieren und Polygon-Editing unter Zoom praezise/stabil halten).
2. P0 danach: P1-T59 (Spezialraum-Klick im Settings-Board direkt mit Polygon-Editor-Dropdown synchronisieren).
3. P0 danach: P1-T60 (Dashboard-Block `Aktive Animationen` sticky fixieren, ohne Scroll-/Tab-Regressions).
4. P1 Hardening: P1-T61 inkl. Pflichtabnahme/Regression gemaess `ACCEPTANCE.md`.

## Priority Execution Add-on (Plan Update 9)
1. P0 zuerst: P1-T62..P1-T63 (Pan fuer gezoomtes Settings-Board einbauen, inkl. klarer Interaktionsregel und Zoom/Fit/Reset-kompatibler Viewport-Logik).
2. P0 danach: P1-T64 (Pan/Edit-Arbitration haerten, damit Room-Klick, Vertex-Selektion, Drag sowie Insert/Delete nicht regressieren).
3. P0 danach: P1-T65 (Regression fuer Zoom+Pan+Polygon-Editing auf Desktop/Small-Screen inkl. Tabwechsel und Pointer-Capture-Grenzfaellen).
4. P1 Hardening: P1-T66 inkl. Pflichtabnahme/Regression gemaess `ACCEPTANCE.md`.

## Priority Execution Add-on (Plan Update 10)
1. P0 zuerst: P1-T67..P1-T68 (Event-Sounds von synthetischen Cues auf Asset-Dateien aus `resources/nemesis/sounds/` umstellen und Audio-Settings-Kompatibilitaet absichern).
2. P0 danach: P1-T69 (globalen Outside-Effekt implementieren und strikt auf den Bereich ausserhalb des Ship-Polygons maskieren).
3. P0 danach: P1-T70 (Ship-Polygon-Editor in `Settings` bereitstellen; Outside-Maske live aus Polygon ableiten).
4. P1 Hardening: P1-T71 inkl. Persistenz-Regression fuer Ship-Polygon + Outside-Settings gemaess `ACCEPTANCE.md`.

## Priority Execution Add-on (Plan Update 11)
1. P0 zuerst: P1-T72..P1-T73 (Sound-Lifecycle an Animationslaufzeit koppeln, inklusive nahtlosem Loop bei langen Animationen und sofortigem Stop bei Ablauf/Stop/`Clear All`).
2. P0 danach: P1-T74 (editierbares Sound-Mapping pro Animation in die UI integrieren, inklusive validem `none`/Fallback-Pfad).
3. P1 danach: P1-T75 (allgemeine Animationsgeschwindigkeit ueber globalen Speed-Faktor steuerbar machen, live wirksam ohne Stop/Edit-Regression).
4. P1 danach: P1-T76 (immersive Outside-Alternativanimation per UI-Toggle auf bestehender Maskenlogik integrieren).
5. P1 Hardening: P1-T77 inkl. Pflichtabnahme/Regression fuer Audio-Sync, Mapping, Speed und Outside-Modus gemaess `ACCEPTANCE.md`.

## Priority Execution Add-on (Plan Update 12)
1. P0 zuerst: P1-T78..P1-T79 (Tab-Trennung verschaerfen: `Dashboard` nur Trigger/Stop, komplette Konfiguration exklusiv in `Settings`, Leak-Guards gegen Restsichtbarkeit).
2. P0 danach: P1-T80 (globale Animationen fachlich in `Innerhalb des Schiffs` und `Ausserhalb des Schiffs` trennen; Routing/Running-Liste/Stop-Pfade angleichen).
3. P0 danach: P1-T81..P1-T82 (Outside-High-Speed-Immersion mit Parallax/Tiefenfluss umsetzen und Layer-Isolation gegen Innenraumbeeinflussung haerten).
4. P1 Hardening: P1-T83 inkl. Pflichtabnahme/Regression fuer Tab-Exklusivitaet, Inside/Outside-Trennung, Outside-Immersion und Isolation gemaess `ACCEPTANCE.md`.

## Priority Execution Add-on (Plan Update 13)
1. P0 zuerst: P1-T84..P1-T85 (Rendering-Clipping hart korrigieren: Inside nur innerhalb Ship-Polygon, Outside nur ausserhalb inkl. Fail-safe bei Maskenproblemen).
2. P0 danach: P1-T86..P1-T87 (Outside-Visual auf High-Speed-Spaceflow mit Tiefenebenen, unterschiedlichen Geschwindigkeiten und deutlichen Motion-Streaks umstellen).
3. P0 danach: P1-T88..P1-T89 (`Settings`-Button `Speichern` fuer `lokal -> globale Defaults` umsetzen und Persistenz-Merge ohne Polygonverlust absichern).
4. P1 Hardening: P1-T90 inkl. Pflichtabnahme/Regression fuer Clip-Isolation, Outside-Flight-Look und globale Config-Persistenz gemaess `ACCEPTANCE.md`.

## Priority Execution Add-on (Plan Update 14)
1. P0 zuerst: P1-T91..P1-T92 (Outside-Richtungsumschaltung `forward`/`reverse` liefern und blauen Outside-Background entfernen; Basis bleibt tiefschwarz mit Sternen/Streaks).
2. P0 danach: P1-T93..P1-T94 (Per-Room-Controls um `Speed`/`Intensity`/`Sound Volume` pro Instanz erweitern und Runtime-Modell instanzscharf verdrahten).
3. P0 danach: P1-T95 (P0-Bugfix Running-`Edit`: existierende Instanz laden und in-place auf derselben `animation.id` aktualisieren, ohne Neuinstanz).
4. P1 Hardening: P1-T96 inkl. Pflichtabnahme/Regression fuer Outside-Richtung/Black-Background, Instanzparameter und Edit-in-place gemaess `ACCEPTANCE.md`.

## Priority Execution Add-on (Plan Update 15)
1. P0 zuerst: P1-T97 (Global-Defaults-Save-Pfad reparieren und POST-Flow auf den vorgesehenen Node-API-Server haerten; `501 Unsupported method POST` als Blocker eliminieren).
2. P0 danach: P1-T98 (Save-Fehler-UX verbessern: klare Kurzmeldung mit konkreter Startanweisung bei fehlendem API-Server, kein HTML-Fehlerdump in der UI).
3. P0 danach: P1-T99 (Start-Flow-Doku fuer POST-faehigen Server ergaenzen, inkl. kurzer Startsequenz fuer API + Frontend).
4. P1 danach: P1-T100 (optionalen Export-/Download-Fallback fuer API-Ausfall implementieren, explizit sekundaer gegenueber Server-Save).
5. P1 Hardening: P1-T101 inkl. Pflichtabnahme/Regression fuer Save-Robustheit, API-offline UX, Startdoku und Fallback-Labeling gemaess `ACCEPTANCE.md`.

## Priority Execution Add-on (Plan Update 16)
1. P0 zuerst: P1-T102 (API-Base-Resolving fuer statisches Frontend-Hosting robust machen: konfigurierbarer Endpoint + deterministische Port-Fallback-Reihenfolge).
2. P0 danach: P1-T103 (Save-Preflight einbauen: Reachability/Health + POST-Faehigkeit pruefen, Fehlerpfade klar klassifizieren).
3. P0 danach: P1-T104..P1-T105 (endpoint-transparente Save-UX plus klarer Diagnosepfad fuer Reachability/POST mit konkreten Next Steps).
4. P0 Hardening: P1-T106 inkl. Mehrfach-Save-Reproduzierbarkeit bei laufender API (mindestens 5x Save + Reload/Restart) gemaess `ACCEPTANCE.md`.

## Priority Execution Add-on (Plan Update 17)
1. P0 zuerst: P1-T107 (Endpoint-Resolver fuer headless/remote Betrieb korrigieren: API-Default vom UI-Host ableiten; `localhost` nur im lokalen Sonderfall oder bei explizitem Override).
2. P0 danach: P1-T108 (Override-Prioritaet haerten: explizite API-Base weiterhin vor LAN-Default/Fallbacks, Resolver-Quelle transparent halten).
3. P0 danach: P1-T109 (Save-/Diagnose-Feedback um `UI-Host -> API-Host`, finalen Endpoint und Remote/LAN-Hinweise erweitern).
4. P0 Hardening: P1-T110 (LAN-IP-Repro mit zweitem Geraet, mindestens 5x Save + Reload/Restart, kein Host-Drift auf Client-`localhost`).
5. P1 Hardening: P1-T111 (Pflichtabnahme + Doku-Sync fuer Plan-Update 17 gemaess `ACCEPTANCE.md`).

## Priority Execution Add-on (Plan Update 18)
1. P0 zuerst: P1-T112 (Misconfiguration-Detection haerten: Python-Static-/SimpleHTTP-Signatur fuer `GET /api/health` robust erkennen und als `static-only` klassifizieren).
2. P0 danach: P1-T113..P1-T114 (Save-/Diagnose-Fehlertexte auf klaren Static-only-Blocker heben und Guided-Fix-UX mit headless/LAN-kompatiblen Startkommandos ausbauen).
3. P0 danach: P1-T115 (Resolve-Snapshot vereinheitlichen: Save + Diagnose mit identischem Host-/Endpoint-Trace, kein verwirrender Remote-`localhost`-Fallback).
4. P0 Hardening: P1-T116 (Pflicht-Roundtrip: echter Python-Static-Negativtest gefolgt von Node-API-Positivtest auf demselben Host/Port, Nachweis in `ACCEPTANCE.md`).

## Priority Execution Add-on (Plan Update 19)
1. P0 zuerst: P1-T117 (Settings-Save-UI bereinigen: dedizierten Button `API Diagnose` entfernen; Diagnose bleibt ueber Save-Preflight und Feedback verfuegbar).
2. P0 danach: P1-T118..P1-T119 (Download-/Export-Texte neutralisieren, `Notfall`-Label entfernen, Save-/Diagnose-Copy ohne Button-Referenzen konsolidieren).
3. P1 danach: P1-T120 (Phase-01-Doku-/QA-Texte auf neutrales Fallback-Wording angleichen).
4. P0 Hardening: P1-T121 (Pflichtabnahme + Regression fuer no-button Diagnosepfad und neutrales Export-Wording gemaess `ACCEPTANCE.md`).

## Update Rules
- Taskstatus im `TASKS.md` laufend pflegen.
- Abweichungen am Scope in `STATE.md` Decision Log dokumentieren.
- Vor Phase-Abschluss alle Punkte in `ACCEPTANCE.md` nachweisen.
- Keine erfundene Raumsemantik in Doku oder UI eintragen; erlaubt sind nur neutrale Hex-IDs plus die freigegebenen 5 Special-Raeume.
- Plan-Update-3-Pflicht: keine Auto-Hitarea-Korrektur im Operator-Flow; Kalibrierung erfolgt ausschliesslich ueber die dokumentierte Sliderseite.
- Plan-Update-4-Pflicht: Geometrie-/Shape-Editoren sind nur in der separaten Settings-Seite erlaubt, nicht im Haupt-Dashboard.
- Plan-Update-4-Pflicht: Save/Load muss pro Board das komplette Profil (global + je Raum + Spezialraum-Polygone) deterministisch wiederherstellen.
- Plan-Update-5-Pflicht: `Settings` ist ein echter View-Switch; Dashboard-Elemente bleiben im Settings-Tab unsichtbar und umgekehrt.
- Plan-Update-5-Pflicht: Polygoneditor bietet sichtbare Vertex-Handles, aktive Ecke, Insert/Delete/Drag als vollstaendigen Bearbeitungspfad.
- Plan-Update-5-Pflicht: Bestehende kalibrierte Raumdaten bleiben trotz Schemafortschreibung kompatibel und nach Restart weiterhin nutzbar.
- Plan-Update-6-Pflicht: `Dashboard` zeigt ausschliesslich Trigger/Animationsbedienung; `Settings` ausschliesslich Geometrie/Polygon/Kalibrierung.
- Plan-Update-6-Pflicht: Vertex-Handles sind deutlich transparenter, bleiben aber klar sicht- und selektierbar.
- Plan-Update-6-Pflicht: Spezialraum-Animationen fuellen die komplette Ziel-Polygonflaeche, unabhaengig von Raumgroesse.
- Plan-Update-6-Pflicht: Bereits gezeichnete Spezialraum-Polygone bleiben bei Save/Reload/Restart/Boardwechsel unveraendert erhalten.
- Plan-Update-7-Pflicht: Tab-Sichtbarkeit bleibt strikt exklusiv je View; Dashboard-Elemente in Settings und Settings-Elemente im Dashboard sind Blocker.
- Plan-Update-7-Pflicht: Board bleibt beim Scrollen fixiert; ausschliesslich der rechte Steuerbereich darf scrollen.
- Plan-Update-7-Pflicht: Running-Animations-Uebersicht ist als separater, klar sichtbarer Bereich priorisiert und jederzeit schnell bedienbar.
- Plan-Update-8-Pflicht: Settings muss Board-Zoom fuer den Polygoneditor bereitstellen; Handle-Interaktionen bleiben unter Zoom praezise und stabil.
- Plan-Update-8-Pflicht: Klick auf einen Spezialraum im Settings-Board setzt unmittelbar die gleiche Auswahl im Polygon-Editor-Dropdown.
- Plan-Update-8-Pflicht: Dashboard-Block `Aktive Animationen` bleibt im Scrollbetrieb sticky sichtbar und direkt bedienbar.
- Plan-Update-9-Pflicht: Gezoomtes Settings-Board ist per `Space + Drag` pannbar; mittlere Maustaste darf als Alias angeboten werden.
- Plan-Update-9-Pflicht: Pan und Polygon-Edit sind strikt getrennt; Pan darf Room-/Vertex-Interaktionen ausserhalb des Pan-Modus nicht beeinflussen.
- Plan-Update-9-Pflicht: Zoom/Pan/Fit/Reset bilden einen stabilen Roundtrip ohne Koordinatenversatz oder verlorene Arbeitsflaeche.
- Plan-Update-10-Pflicht: Event-Sounds fuer Intruder/Reactor/Power Outage nutzen vorhandene Assets aus `resources/nemesis/sounds/` statt rein synthetischer Cues.
- Plan-Update-10-Pflicht: Audio-Master und Lautstaerke greifen unveraendert auf alle assetbasierten Sounds.
- Plan-Update-10-Pflicht: Outside-Effekt ist global schaltbar und rendert ausschliesslich ausserhalb des Ship-Polygons.
- Plan-Update-10-Pflicht: Ship-Polygon ist im Settings-Tab editierbar und bleibt gemeinsam mit Outside-Settings pro Board persistent reproduzierbar.
- Plan-Update-11-Pflicht: Soundwiedergabe ist an Animationslaufzeit gekoppelt (Start/Loop/Stop) und endet bei Ablauf/Stop/`Clear All` sofort.
- Plan-Update-11-Pflicht: Sound-Mapping pro Animation ist in der UI editierbar; `none`/Fallback bleibt robust ohne Runtime-Fehler.
- Plan-Update-11-Pflicht: Allgemeine Animations-Settings enthalten mindestens eine Geschwindigkeitssteuerung mit Live-Wirkung.
- Plan-Update-11-Pflicht: Outside-Alternativanimation ist per UI-Option schaltbar, nutzt denselben Ship-Maskenpfad und regressiert bestehende Outside-Controls nicht.
- Plan-Update-12-Pflicht: `Dashboard` zeigt ausschliesslich Trigger/Stop fuer Animationen; Settings-/Mapping-/Calibration-/Editor-Controls sind dort strikt verboten.
- Plan-Update-12-Pflicht: Saemtliche Konfiguration (inkl. Mapping, Calibration, Polygon-/Ship-Editing und Outside-Parameter) liegt exklusiv im `Settings`-Tab.
- Plan-Update-12-Pflicht: Globale Animationen sind fachlich getrennt in `Innerhalb des Schiffs` und `Ausserhalb des Schiffs` (UI, Runtime-Liste, Start/Stop).
- Plan-Update-12-Pflicht: Outside-Animationen muessen hochimmersiv wirken (Parallax/hohe Fluggeschwindigkeit), bleiben aber strikt als Outside-Layer isoliert ohne Innenraum-Seiteneffekte.
- Plan-Update-13-Pflicht: Inside-Animationen sind ausschliesslich innerhalb des Ship-Polygons sichtbar; Outside-Animationen ausschliesslich ausserhalb.
- Plan-Update-13-Pflicht: Outside-Look ist klar als High-Speed-Spaceflow umgesetzt (mehrere Tiefenebenen, differenzierte Geschwindigkeiten, deutliche Motion-Streaks statt Glitzerwirkung).
- Plan-Update-13-Pflicht: `Settings` bietet einen expliziten `Speichern`-Button, der den aktuellen Browserzustand als globale Default-Config server/Repo-seitig persistiert.
- Plan-Update-13-Pflicht: Export `lokal -> globale Defaults` uebernimmt bestehende Daten verlustfrei; insbesondere Ship- und Spezialraum-Polygone bleiben erhalten.
- Plan-Update-14-Pflicht: Outside-Animation bietet eine UI-Richtungsoption (`forward`/`reverse`) mit sofortiger Wirkung ohne Layer-Neustart.
- Plan-Update-14-Pflicht: Outside-Hintergrund bleibt tiefschwarz; blauer Background ist entfernt, sichtbar sind nur Sterne/Streaks.
- Plan-Update-14-Pflicht: Pro laufender Room-Animation sind `speed`, `intensity` und `soundVolume` instanzscharf einstellbar und im Runtime-Modell gespeichert.
- Plan-Update-14-Pflicht: Running-`Edit` fuer Room-Animationen ist blocker-frei funktional und schreibt Aenderungen in-place auf dieselbe `animation.id`.
- Plan-Update-15-Pflicht: Save fuer globale Defaults funktioniert im vorgesehenen Node-Setup reproduzierbar ueber POST; `501 Unsupported method POST` gilt als blocker-kritischer Defekt.
- Plan-Update-15-Pflicht: Bei fehlendem API-Server zeigt Save eine kurze Klartextmeldung mit konkreter Startanweisung; HTML-Fehlerdump ist unzulaessig.
- Plan-Update-15-Pflicht: Startdokumentation nennt explizit den noetigen POST-faehigen Server (z. B. `node server.mjs`) und eine knappe Startsequenz fuer API + Frontend.
- Plan-Update-15-Pflicht: Optionaler Export-/Download-Fallback darf den primaeren Server-Save nicht ersetzen und muss als sekundaerer Fallbackpfad gekennzeichnet sein.
- Plan-Update-16-Pflicht: Save-Endpunkt muss fuer statisches Frontend-Hosting robust aufloesbar sein (konfigurierbare API-Base + deterministischer Port-Fallback).
- Plan-Update-16-Pflicht: Save zeigt immer den konkret verwendeten API-Endpunkt (inkl. Port) und eine klare Fehlerklassifizierung mit naechstem Schritt.
- Plan-Update-16-Pflicht: `Settings` bietet einen klaren Diagnosepfad fuer Reachability und POST-Faehigkeit des realen Save-Endpunkts.
- Plan-Update-16-Pflicht: Bei korrekt laufendem API-Server bleibt Global-Defaults-Save reproduzierbar erfolgreich (Mehrfach-Save + Reload/Restart ohne intermittierende Fehler).
- Plan-Update-17-Pflicht: Im Remote/LAN-Betrieb nutzt Save standardmaessig den Host der aufgerufenen UI als API-Host; Client-`localhost` ist als stiller Default unzulaessig.
- Plan-Update-17-Pflicht: Explizite API-Overrides bleiben erlaubt und haben harte Prioritaet vor automatischer Host-Aufloesung.
- Plan-Update-17-Pflicht: Save- und Diagnose-Feedback zeigen explizit `UI-Host`, `API-Host` und finalen Endpoint inkl. konkretem Remote/LAN-Hinweis bei Mismatch.
- Plan-Update-17-Pflicht: Pflichtabnahme enthaelt reproduzierbaren LAN-IP-Save-Test von einem zweiten Geraet (mindestens 5x Save + Reload/Restart ohne Host-Drift).
- Plan-Update-18-Pflicht: Static-only-Hosts (insb. `python3 -m http.server 4173`) muessen explizit erkannt und als `Static-only Server aktiv, Save nicht moeglich` klassifiziert werden.
- Plan-Update-18-Pflicht: Guided-Fix-UX liefert konkrete headless/LAN-Startkommandos fuer den Node-API-Server (`node server.mjs --host 0.0.0.0 --port 4173`), nicht nur generische Fehltexte.
- Plan-Update-18-Pflicht: Save und Diagnose teilen einen identischen Resolve-Snapshot (`UI-Host`, `API-Host`, Resolver-Quelle, Endpoint, Methode) ohne widerspruechliche localhost-Hinweise.
- Plan-Update-18-Pflicht: Abnahme muss den realen Roundtrip enthalten: Python-Static-Negativtest und anschliessender Node-API-Positivtest auf gleichem Host/Port.
- Plan-Update-19-Pflicht: Der dedizierte Button `API Diagnose` wird aus der UI entfernt; Diagnose bleibt ueber Save-Preflight und Save-Feedback voll nutzbar.
- Plan-Update-19-Pflicht: Download-/Export-Fallback nutzt neutrales Wording ohne `Notfall`-Label und bleibt klar sekundaer gegenueber Server-Save.
