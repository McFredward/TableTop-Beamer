# Changelog

All notable user-facing changes to TT-Beamer are documented in this file.

Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Cadence (operator-confirmed 2026-05-22): every closed phase ships a PATCH bump
(1.0.0 → 1.0.1 → 1.0.2 → …). MINOR bumps (e.g. 1.0.x → 1.1.0) are reserved
for operator-cut release milestones — multiple PATCH entries may be rolled
up into one MINOR release section at cut-time.

---

## Release-Rollup 1.1.4 → 1.2.24 (Kurzfassung für Release-Notes)

**Per-Animation Playback-Modi (Phase 58).** Jede Raum-Animation kann
jetzt konfiguriert werden mit: `Loop`, `Play once (disappear)`,
`Play then freeze`, `Boomerang` sowie Re-Trigger-Verhalten
(`reverse, then freeze first` / `reverse, then disappear`) und
Initial-Richtung (vorwärts/rückwärts). Gilt für **mp4 UND gif**,
Einzelräume UND Cluster, Dashboard UND Beamer-Output. Ein erneuter
Trigger dreht die Abspielrichtung — auch mitten im Abspielen — nahtlos
und ohne Aufblitzen; Cluster-Trigger drehen jeden Raum individuell von
seiner eigenen Phase aus.

- mp4-Reverse wird server-seitig einmalig vorberechnet und gecacht
  (`/api/animation-reverse`); gif-Reverse läuft ohne Transcoding über
  Timeline-Spiegelung.
- **Adaptive Video-Qualität:** Bei anhaltenden Framedrops mit vielen
  parallelen Videos schalten Raum-Videos automatisch und
  positionserhaltend auf eine 480p-Variante um (`/api/animation-proxy`,
  gecacht) und später wieder zurück. Abschaltbar unter
  Einstellungen → System. Macht 10+ parallele Räume praktikabel.
- **Stream-/SSR-Stabilität:** Strobo- und Flacker-Fixes auf Dashboard
  und `/output/` (u.a. Pressure-Frameskip malt nie mehr transparent),
  gefrorene Animationen erzeugen null Render-Last, Firefox-spezifische
  Frame-Callback-Aushungerung kompensiert, Vulkan-Backend für
  SSR-Video-Playback.
- **Robuste Live-Sync:** Laufende/gefrorene Animationen können nicht
  mehr durch Snapshot-Races verschwinden (Absence-Grace-Modell:
  Entfernung nur durch explizites Stop/Clear, Board-Wechsel oder
  anhaltende Abwesenheit).
- **Align-Modus:** Ecken-Skalierungs-Handles bleiben bei extremem Zoom
  im sichtbaren Bereich (wie der Rotations-Handle) — das Board ist
  immer skalierbar.
- **Editor:** Überarbeitete Playback-Dropdowns, Live-Vorschau
  respektiert Modus + Richtung; Loop-Animationen in mehreren Räumen
  gefixt; Auswahl einer frisch erstellten Animation greift sofort.
- **Diagnose:** Permanente `[58]`-Konsolen-Logs erklären jeden
  Playback-Lebenszyklus (Phasenwechsel, Entfernungen mit Grund,
  Qualitätswechsel) — Fehlerberichte sind direkt aus der Console
  belegbar.

---

## [1.2.39] — 2026-06-08

**Inside-Animationen bekommen Transform 1:1 wie Raum-Animationen (Phase 58-w3.8n).**
Operator: "Ich will das 'transform' auch 1:1 wie bei den room animations, d.h. hier exakt die selbe Logik: Der default ist bei der Animation im Animationseditor anpassbar und während der Animation editierbar und per Knopfdruck auch für die Animation abspeicherbar." Mp4/gif-Inside-Animationen unterstützen jetzt Rotation / Stretch / Scale / Offset über denselben Mechanismus wie Räume.

### Added
- **Per-Definition-Transform im Inside-Normalizer** (`runtime-fx-normalizers.js`): `rotationDeg / stretchToPolygon / widthScale / heightScale / offsetXScale / offsetYScale`, identische Clamps wie beim Raum-Normalizer. Defaults erhalten das bisherige Verhalten (Stretch an, keine Transformation).
- **Transform-Karte im Animations-Editor für Inside** (`animation-editor-edit-pane.js`): `buildTransformCard` greift jetzt auch für Scope `inside` (mp4/gif) — der Default ist dort einklappbar einstellbar (persistiert via `patchAnimation`). Die Editor-Vorschau spiegelt die Transformation bereits (scope-agnostischer CSS-Transform).
- **Transform im Live-Editor für Inside**: Das Transform-Fieldset erscheint für laufende Inside-mp4/gif-Animationen (Gate liest die Instanz-`roomAssetType`, mit Fallback auf die Inside-Definition); Slider editieren die laufende Instanz live, "Save as default" schreibt die Werte in die Definition.

### Changed
- **Render wendet die Inside-Transformation an** (`runtime-draw-loop.js`): neue `resolveInsideAssetDrawRect` (volle Projektions-Canvas als Bezug — Stretch=true ⇒ pixelidentisch zum bisherigen Vollbild) + alle Inside-gif/mp4-Paints laufen jetzt über `drawRoomAssetImage` (Rotation/Scale/Offset). Bevorzugt Instanz-Werte (Live-Edits sofort sichtbar), Fallback auf die Definition.
- **Trigger seedet die Inside-Instanz mit Transform + `roomAssetType`** (`runtime-runtime-controls.js`, nur Inside, nicht Outside) und der Server trägt diese Felder durch den `trigger-global`-Roundtrip (`server.mjs`) — sonst würden Render und Live-Editor die Instanz-Werte nicht sehen.

### Fixed
- **"Save as default"-Button war global tot.** `liveEditorSaveDefault` war nie in den Orchestration-Ctx destrukturiert/durchgereicht, daher hängte `init` nie einen Click-Handler an — der Button tat für JEDEN Scope (auch Raum) nichts. Jetzt verdrahtet (`runtime-orchestration.js`).
- **`saveLiveEditorAsDefault` mappte Global-Scope nicht.** Inside/Outside laufen als Scope `global`; die Save-Zweige prüften aber `"inside"`/`"outside"`, sodass nichts gespeichert wurde. Global wird jetzt via `isOutsideAnimationType` auf inside/outside abgebildet (`runtime-lifecycle-live-editor.js`); der Inside-Zweig persistiert zusätzlich die Transform-Felder.

### Notes
- Verifiziert auf isoliertem Server (Frostpunk, Inside "Snow" mp4): Editor-`patchAnimation` persistiert Transform (rot/w/ox, übersteht Settle); Trigger-Instanz trägt Transform durch den Server-Roundtrip; SSR-Projektor-Render unterscheidet skaliert (17 KB) vs. Vollbild (41 KB); Live-Editor-Transform sichtbar, Slider editieren die Instanz (rot=35), "Save as default" schreibt rot=35/ox=0.15 in die Definition (persistent). `npm test` 383 pass / 14 fail (unveränderte vorbestehende SSR-Encoder-Config-Failures).

---

## [1.2.38] — 2026-06-08

**Dashboard-Switch "Loop until stopped" komplett entfernt (Phase 58-w3.8m).**
Operator: "entferne aber ganz den 'Loop until stopped' switch im Dashboard". Der separate Per-Trigger-Toggle über den Inside-Trigger-Buttons ist weg — Loop-Verhalten wird jetzt ausschließlich aus dem `playbackMode` der Animation selbst abgeleitet (wie bei Raum-Animationen). Eine Loop-Animation läuft bis zum Abschalten weiter; Non-Loop-Modi (play-once-disappear / play-then-freeze / boomerang) steuern ihren eigenen Lifecycle. Der "Play sound"-Toggle bleibt.

### Changed
- **`upsertGlobalAnimation` leitet das Loop-Verhalten aus dem `playbackMode` ab** statt aus dem entfernten Switch (`runtime-runtime-controls.js`): `effectiveLoopUntilStopped = isOutside || playbackMode === "loop"`. Damit entfällt die alte 4s-`GLOBAL_ONE_SHOT_DURATION_SEC`-Auto-Entfernung für Inside-Globals — die griff vorher nur, wenn eine Loop-Animation mit ausgeschaltetem Switch getriggert wurde, und entfernte die Loop-Animation nach 4s wieder (das Gegenteil von "wie eingestellt").
- **Switch-Markup + Verdrahtung entfernt:** `#dashboard-global-loop-until-stop` aus `index.html`; Trigger-Click-Binder liest den Switch nicht mehr (`runtime-wire-overlay-window-binders.js`); Change-Listener + DOM-Ref + Orchestration-Ctx-Durchreichungen bereinigt (`runtime-wire-room-audio-binders.js`, `runtime-dom-refs.js`, `runtime-orchestration.js`). Server akzeptiert das `loopUntilStopped`-Payload-Feld weiterhin (Back-Compat für Live-Sync-Clients).

### Notes
- Verifiziert auf isoliertem Server (Frostpunk): Switch im DOM + ausgeliefertem HTML weg, "Play sound" bleibt. Loop-Animation (Snow, mp4 loop) läuft jetzt dauerhaft (`hold=true`, `durMs=null`, > 7s aktiv) statt nach 4s zu verschwinden; Toggle-Off entfernt sie sauber. Inside-"Freeze" (play-then-freeze + reverse-then-freeze-first): erster Trigger → forward, Re-Trigger → reverse → forward (Reverse-Zyklus unverändert). Keine Runtime-Fehler durch die Entfernung; `npm test` 383 pass / 14 fail (unveränderte vorbestehende SSR-Encoder-Config-Failures).

---

## [1.2.37] — 2026-06-08

**Inside-Animationen übernehmen das Playback-Modus-System (Phase 58-w3.8l).**
Operator: "Gleiche die Inside-Animationen an die neue Logik an: entferne den 'Loop until stopped' switch und gehe damit so um wie es in der Animation selber eingestellt ist, so soll auch hier z.B. 'reverse on-retrigger' funktionieren — nur dass Trigger hier ausschließlich der entsprechende Button ist." Inside-Animationen nutzen jetzt dasselbe per-Definition-Schema (`playbackMode` / `onRetrigger` / `playbackDirection`) wie Raum-Animationen — der alte `loopUntilStopped`-Switch ist im Editor weg (das ganze Legacy-Inside-Sidebar-Panel war bereits entfernt; der ganzseitige Animations-Editor zeigt die Playback-Dropdowns für gif/mp4 in allen drei Scopes). Re-Trigger geschieht ausschließlich über den jeweiligen Inside-Button.

### Fixed
- **Inside reverse-on-retrigger funktioniert jetzt (war komplett kaputt).** Drei Lücken gegenüber dem Raum-Pfad geschlossen:
  - **Server stripte das Playback-Schema bei `trigger-global`.** Das server-autoritative Global-Animations-Objekt wurde Feld für Feld neu aufgebaut (anders als `trigger-room`, das den vollen Snapshot trägt) und ließ `playbackMode` / `onRetrigger` / `playbackPhase` weg. Die laufende Inside-Instanz kam ohne diese Felder zurück, weshalb die Re-Trigger-Phasen-Prüfung (`existing.playbackMode !== "play-then-freeze"`) durchfiel und die Animation bei erneutem Druck VERSCHWAND statt rückwärts zu laufen. Die Felder werden jetzt aus dem eingehenden Snapshot übernommen (`server.mjs`).
  - **Der `ctx.getGifPlaybackFrame`-Wrapper verwarf 2 Argumente.** Er reichte nur `(path, elapsed, playbackMode)` durch und ließ `playbackDirection` + `playbackPhase` fallen — der Inside- (und Outside-)Gif-Pfad ruft diesen Wrapper direkt auf, sodass Reverse/Phase nie wirkte. Der Raum-Gif-Pfad war zufällig immun, weil er über `resolveRoomGifRenderConfig` (lokale Funktion, volle 5 Argumente) läuft. Wrapper reicht jetzt alle 5 Argumente durch (`runtime-orchestration.js`).
  - **Der Inside-Gif-Render-Pfad fuhr die Phasen-Statemaschine nicht.** Er rief `maybeTransitionGifPlaybackPhase` nicht auf und übergab nur die statische Initial-Richtung statt der `playbackPhase`. Jetzt identisch zum Raum-Gif-Pfad: `forward → frozen-last → reverse → frozen-first` (`runtime-draw-loop.js`).
- **Mid-Playback-Flip für Inside (Raum-Parität, w3.7m).** `advanceReversibleFreezePhaseIfPossible` akzeptiert jetzt JEDE Phase statt nur `frozen-*`: ein Tap MITTEN im Abspielen dreht die Richtung vom aktuellen Frame, statt die Instanz zu stoppen (`runtime-runtime-controls.js`).

### Notes
- **Migration / Back-Compat:** `loopUntilStopped:true` → `playbackMode "loop"`, `loopUntilStopped:false` → `play-once-disappear` (in `normalizePlaybackMode`); Legacy-`loopUntilStopped` wird weiterhin als Fallback gelesen, sodass alte Boards/Configs nicht brechen.
- **Coded Inside-Effekte** (hull-flicker etc.) unberührt: die Playback-Dropdowns erscheinen nur für gif/mp4 (`isMedia`-Gate im Editor), coded behält seine eigene Lifecycle-Semantik.
- **Snapshots/Live-Sync:** Inside-Phasen reiten über dieselbe scope-agnostische `RENDER_PLAYBACK_FIELDS`-Preservation + Re-Stamp-Acceptance wie Räume (deckt Global-Scope bereits ab).
- Verifiziert auf isoliertem Server (PORT 4575, Frostpunk-Board): Inside-"Freeze"-Gif (play-then-freeze + reverse-then-freeze-first) — Button → vorwärts → `frozen-last` (ct=10.01, dur=10s), Button → `reverse` → `frozen-first`, Button → wieder vorwärts; Instanz verschwindet nie (Live-State + `[58] phase`-Logs). Mid-Playback-Flip beidseitig bestätigt. Projektor-Pfad: SSR-Render-Tab zeichnet das Inside-Gif (Pixel-Diff Baseline↔aktiv, bbox 559,207–1304,865). Dashboard-Screenshot-Serie: forward-Frames byte-identisch, frozen-last/reverse/frozen-first unterschiedlich.

---

## [1.2.36] — 2026-06-07

**Kein Stream-Hänger mehr beim allerersten GIF-Trigger nach Server-Neustart (Phase 58-w3.8k).**
Operator: "Wenn ich zum allerersten Mal nach dem Server-Neustart die 'freeze gif' Animation gestartet habe, hat der Stream kurz komplett gehangen — danach nicht mehr." Reproduziert und vermessen: Der erste Trigger eines Board-definierten GIFs (freeze.gif, 18 MB / 280 Frames) blockierte den Main-Thread des SSR-Render-Tabs für **3555 ms am Stück** (rAF-Gap-Messung) — der Encoder sendete solange dasselbe eingefrorene Bild. Der Fetch war unschuldig (18 MB in 85 ms vom Disk-Cache); der synchrone Parser-Decode war der Blocker. Zwei Ursachen, zwei Fixes:

- **Prewarm war seit 26-h9 komplett tot:** `getBoards: () => getBoards()` in der GIF-Playback-Modul-Initialisierung referenzierte eine nicht existierende Binding (jede andere Ctx-Stelle nutzt `() => BOARDS`) — der Aufruf warf ReferenceError, den das bare `catch {}` in `warmRoomGifAssets` verschluckte. Folge: Board-definierte GIFs wurden auf KEINEM Client je vorgewärmt, nur die 3 statischen Legacy-GIFs. Gefixt; zusätzlich wärmt jetzt jeder Snapshot-Apply (Live-Hello / Board-Aktivierung) die GIF-Definitionen des aktiven Boards — auch auf dem Projektor, wo der CONTROL-gegatete `switchBoard`-Pfad nie läuft. Projektor wärmt alle Boards (Board-Wechsel darf nie kalt decodieren), Dashboards nur das aktive Board (ImageDecoder-Fast-Path speichert Frames in voller Auflösung — alle Boards wären hunderte MB). Nicht-Final-Clients decodieren gestaffelt einen Asset pro Idle-Slot statt als Herde; doppelte Warm-Aufrufe sind über Cache-Status + Queue-Flag No-Ops.
- **Auch ein kalter Decode darf den Stream nicht mehr anhalten:** Der Parser yieldet auf Nicht-Pi-Umgebungen jetzt nach je ~12 ms akkumulierter synchroner Arbeit einen Macrotask (`setTimeout(0)` — bewusst NICHT rAF, damit der h11-Xvfb-rAF-Throttling-Hänger nicht zurückkommen kann; Pi behält seinen dedizierten rAF-Yield für den GL-Watchdog). Messung: kalter Trigger-Decode von snow.gif (10,9 MB / 190 Frames, 1080p-Frames) → max. rAF-Gap 60 ms statt Sekunden; der Stream läuft während des ~11 s gestückelten Decodes sichtbar weiter.

Verifiziert auf isoliertem Server (Kalt-Start): Vorher 3555 ms Gap beim ersten Trigger; nachher sind alle Board-GIFs vor jedem Trigger fertig decodiert (280 Frames ready, 0 Gaps > 50 ms während des Idle-Prewarms) und der erste Trigger erzeugt 0 Gaps > 50 ms. Play-then-freeze → frozen-last, Reverse-Zyklus → frozen-first, Loop-GIFs, Editor-Vorschau und mp4-Pfad unverändert (Screenshot-Serie + Phasen-Probe). Speicher: Parser-Pfad (Projektor) ~41 MB ImageData + ~41 MB Bitmaps für freeze.gif (256-px-Cap), Frostpunk hat 2 Board-GIFs (fire + freeze) — unkritisch auf Server-Klasse, Pi baked keine Bitmaps.

---

## [1.2.35] — 2026-06-07

**City Workers: sanfte Präsenz-Hüllkurve — kein abruptes Erscheinen/Verschwinden mehr (Phase 58-w3.8h).**
Operator (Top-Immersionskiller): "Die laufenden Worker verschwinden manchmal plötzlich und tauchen wieder auf — manchmal derselbe Worker." Alpha-Trace über 3+ volle Zyklen × 4 Räume bewies: die reine Zyklus-Mathematik ist sprungfrei (0 Alpha-Sprünge > 0.1/Frame in ~78k Frames); jeder Pop kam von diskontinuierlichen EINGÄNGEN — (a) der adaptive `nonCriticalDensityScale` kippt mit dem Frame-Druck 1↔0.74↔0.54 und ließ die gerundete Figurenzahl um ±1 springen (die Figur mit dem höchsten Index poppte bei VOLLEM Alpha rein/raus — daher "derselbe Worker"), (b) Age-Resets durch Snapshot-/Live-Sync-Restarts. Fixes: Figurenzahl liest den adaptiven Density-Scale nicht mehr (≤12 Mini-Ellipsen sind vernachlässigbar, deterministische Zahl = wieder Client-übergreifend pixelidentisch unter Last) UND eine Präsenz-Hüllkurve klammert das GERENDERTE Alpha jeder Figur als letzte Stufe: ein voller Fade dauert nie unter 1,75 s Wandzeit, egal was Zyklus, Count oder Age tun; verschwindet das Ziel hart, faded die Figur als Geist an ihrer letzten Position aus. Natürliche Zyklus-Fades (≤ ~0.31 Alpha/s) passieren ungebremst — Determinismus im Steady-State bleibt.

**City Workers: EIN konfigurierbarer Effekt statt zwei Varianten (Phase 58-w3.8i).**
"city-workers" und "city-workers-lit" sind wieder EIN Effekt ("City Workers" im Effect-Picker); der lit-Schlüssel bleibt als Rückwärts-Kompatibilitäts-Alias erhalten (bestehende Definitionen/Snapshots rendern unverändert beleuchtet). Neue Optionen pro Definition (Editor, Coded-Effect-Karte):
- **"Darstellung"**: Silhouette (Dashboard) | Beleuchtet (Beamer) — die beiden bisherigen Render-Styles.
- **"Anzahl Bewohner"** (1-12): explizite Basis-Population, von der Intensität ENTKOPPELT (Alt-Definitionen migrieren auf ihren historischen intensitätsabgeleiteten Wert; der für diesen Effekt damit tote Intensity-Slider ist ausgeblendet). Die Pro-Raum-Varianz (×0.75-1.3) bleibt.
- **"Gruppen"**: aus | selten | normal | häufig (Gruppen-Wahrscheinlichkeit + Pausenlänge; "normal" = exakt die bisherigen Konstanten).
- **"Laternen-Anteil"** (0-100 %, Standard 30 = historisches Band).
- **"Spuren im Schnee"** (Standard AN).
Defaults rendern die bisherige dunkle Variante byte-identisch (Szenen-Vergleich über alle 32 Frostpunk-Räume); Felder reiten wie die heat-Optionen per Definition → Normalizer → draftPayload → alle 6 createAnimation-Call-Sites → Instanz → Snapshot-Spread.

**City Workers: dunkle Variante übersteht das Stream-Encoding besser — /output deutlich weniger abgehackt (Phase 58-w3.8j).**
A/B-Beweis mit identisch wiederabgespielten Figuren-Trajektorien (gleiche Räume, gleiches Age-Fenster): der SSR-Canvas animiert in beiden Styles kontinuierlich, aber die historische Fast-Schwarz-Palette (Kanäle 7-36) erzeugte nur ~2-10 Luma Frame-Delta — unter der Encoder-Dead-Zone, der Encoder ließ die Bewegung aus, bis das akkumulierte Delta als Sprung durchbrach (Consumer-Stall-Anteil bis 0.56 dunkel vs. 0.09-0.34 beleuchtet im selben Fenster). Fix inhaltsseitig: alle Farb-Konstanten des dunklen Styles werden beim Laden ×3.0 geliftet (2.0 wurde zuerst gemessen und registrierte nur canvas-seitig; jenseits von 3.0 verlieren die Figuren den Silhouetten-Charakter bei kaum weiterem Gewinn). Gemessen sinkt der Consumer-Stall-Anteil in jedem Raum (Laternen-Räume 0.22 → 0.08; reine Silhouetten-Räume verbessern sich weniger — die Subpixel-Bewegung einer 3-px-Figur bleibt für jeden Encoder hart). Auf dem Dashboard weiterhin klar dunkle Silhouetten; **"Beleuchtet (Beamer)" ist und bleibt die für den Projektor empfohlene Darstellung** (die Style-Labels benennen das Zielgerät genau deshalb).

---

## [1.2.34] — 2026-06-07

**Heat: Schimmer-Streifen entfernt (Phase 58-w3.8f).**
Die von oben nach unten laufenden Hitze-Schimmer-Streifen des heat-Effekts sind komplett entfernt (Operator: "Entferne diese Streifen die von oben nach unten gehen, die mag ich nicht — sonst ist top"). Der atmende Radial-Glow bleibt exakt unverändert; die zugehörige Streak-Seed-Tabelle und Konstanten sind mit ausgebaut (der seeded Hash bleibt für city-workers erhalten).

**Heat: Hitzequellen-Sichtbarkeit + Puls-Synchronisation mit der nächsten Quelle (Phase 58-w3.8g).**
Zwei neue Optionen pro heat-Animationsdefinition (Editor, Coded-Effect-Karte neben dem Heat-tint):
- **"Hitzequelle anzeigen"** (Standard AN): AN = bisheriger Look mit hellem atmendem Kern. AUS = der Raum zeigt nur noch ein flächiges, deutlich rot pulsierendes Glühen ohne sichtbaren Hotspot (flaches Ambient-Feld, Alpha atmet mit derselben Puls-Kurve; malt in jedem Frame — SSR-Strobe-Falle).
- **"Mit nächster Hitzequelle synchronisieren"** (Standard AUS, nur ohne sichtbare Quelle wirksam — bei sichtbarer Quelle ausgegraut): Räume ohne sichtbare Quelle übernehmen die Puls-PHASE der nächstgelegenen (Raum-Polygon-Zentroid-Distanz in normalisierten Board-Koordinaten, gleiche Auswahl auf allen Clients) LAUFENDEN heat-Animation mit sichtbarer Quelle auf demselben Board. Als Takt dient die epoch-hydrierte Startzeit + Speed der QUELLE, daher atmen Dashboard, /output und SSR identisch (gemessene Puls-Korrelation Dashboard↔SSR: 0.995; Luma-Zeitreihen: Quelle + 2 Sync-Räume peak-gleich, ein nicht-synchronisierter Raum driftet sichtbar).
- Auflösung der nächsten Quelle ist memoisiert (Quellen-Scan max. 1× pro Frame pro Board, Nearest-Wahl gecacht per Quellen-Set-Signatur) — kein O(N)-Scan pro Raum pro Frame. Fällt die Quelle weg, wird auf die nächstnähere Quelle bzw. auf die eigene Uhr zurückgefallen (Phasen-SNAP, kein Blend — bewusst einfach gehalten).
- Felder reiten wie playbackMode per Definition → draftPayload → createAnimation auf jede Instanz (Phase-50-Factory-Default-Falle an allen 6 Dispatch-Call-Sites explizit bedient) und via Snapshot-Spread über Live-Sync. Der Legacy-Alias `generator-heat` rendert weiter und zählt als Quelle.

---

## [1.2.33] — 2026-06-06

**Neuer Coded-Effekt "City Workers (Beamer)" — projektions-lesbare A/B-Variante (Phase 58-w3.8e).**
Der Beamer bildet reines Schwarz als "kein Licht" ab und dunkle Töne nur schwach — die fast schwarzen Silhouetten des normalen city-workers-Effekts sind auf dem physischen Brett daher praktisch unsichtbar (nur die Laternen tragen). Statt den Effekt zu ersetzen gibt es jetzt eine ZWEITE Registry-Variante `city-workers-lit` (Editor-Label "City Workers (Beamer)", gleiche users-Ikone) zum direkten A/B-Vergleich am Beamer: identische Verhaltens-Engine (Seeding, Anker, Gruppen, Gangart inkl. w3.8d-Tempo/Sway-Tuning, Trail-Geometrie, Varianz-Traits) — nur die Bemalung wird über ein Render-Style-Objekt umgeschaltet. Lit-Style: Mäntel in mittel-dunklen, entsättigten Grau-/Blaugrau-/Brauntönen (7-Tint-Varianz erhalten, ~6× Luminanz), interne Kontraste (kaltes Top-Light auf den Schultern, Unterseiten-Schattierung statt des auf Schwarz wirkungslosen reinschwarzen Schattens, Kopf einen Hauch heller als der Mantel), Schlitten/Bündel in angehobenen Tönen, Laternen unverändert; Schneespuren INVERTIERT zu schwach LEUCHTEND gestampften Pfaden (deutlich dunkler als die Snow-Flocken). Der normale city-workers-Effekt rendert byte-identisch weiter (Canvas-Command-Stream über 840 Vergleichsframes unverändert).

## [1.2.32] — 2026-06-06

**city-workers: Obergrenze fürs Schritttempo + fast gerades Stapfen (Phase 58-w3.8d).**
Die schnellsten Figuren laufen jetzt max. ≈ 4,5 px/s auf dem 133-px-Hex (vorher bis ≈ 7,9; Gruppenmitglieder liefen auf gestreckten Streurouten bis ~2× Leader-Tempo), beladene Figuren bleiben die langsamsten; das seitliche Hin-und-her-Schwenken ist auf einen Hauch Drift reduziert (max. Abweichung von der Geraden 10,4 % → 2,8 %), Heading-Wackeln erneut halbiert.

## [1.2.31] — 2026-06-06

**city-workers: Per-Figur-Varianz (Phase 58-w3.8c).** Die Bewohner der
Frostpunk-Kraterstadt sind jetzt individuell — jede Figur bekommt
deterministisch (Raum × Figur-Index gesät, auf allen Clients identisch)
ein festes Erscheinungsbild für ihr ganzes Leben:

- **Getragene Feuerlaternen:** Ein gesäter Anteil der Figuren (~25-35 %,
  pro Raum unterschiedlich dicht — Teil der Raum-Identität) trägt eine
  alte Feuerlaterne: warmer Lichtpunkt auf der gesäten Hand-Seite, der
  im Schrittrhythmus mitpendelt, mit weichem warmem Glühhalo (2,2-2,8×
  Figurgröße, additiv) und langsam atmendem organischem Flackern (Zwei-
  Sinus-Mix, ~2-3 s Perioden — nie stroboskopisch). In Gruppen trägt
  höchstens der Anführer.
- **Kleidung & Statur:** Gedeckte dunkle Mantel-Palette (kalte Grau-,
  Braungrau-, Blaugrau-Töne, entsättigtes Dunkelrot/-grün — die Menge
  bleibt düster), Statur-Varianz (Länge ±20 %, Schulterbreite ±25 % —
  stämmig bis schmal), Kapuze (größerer mantelfarbener Kopf-Blob) vs.
  Mütze (kleinerer dunkler Punkt), teils gesäte gebeugte Haltung.
- **Lasten:** Einzelne Figuren ziehen einen kleinen Schlitten (dunkle
  Kufenkiste an kurzer Zugleine, etwas breitere Schneespur, langsamstes
  Watt-Tempo) oder tragen ein Schulterbündel. Größen-Gate: unter
  ~3,2 px Figurlänge wird die Last nicht gezeichnet (würde bei der
  Größe vermatschen) — die Figur bleibt dort ein einfacher Geher.
- Spuren übernehmen Statur-Breite und Schlitten-Verbreiterung
  automatisch; Knob-Semantik unverändert.

## [1.2.30] — 2026-06-06

Phase 58 Wave 3.8b — Operator-Feedback (2026-06-06): "Viel zu schnell
und unnatürliche Bewegung - eher vergleichbar mit einer Fliege! Oder
als wäre es in doppelter Geschwindigkeit. Versuche die Bewegung
menschlicher zu machen - bedenke sie stapfen durch SCHNEE, das dauert
und ist anstrengend."

### Fixed
- **City Workers: doppelte Speed-Anwendung entfernt** — der Draw-Loop
  skalierte das Alter bereits mit dem Speed-Regler UND multiplizierte
  für codierte Raum-Effekte ein zweites Mal (Speed²; dieselbe
  Bug-Klasse wie früher bei outside-space). Für city-workers geht der
  Regler jetzt exakt EINMAL ein: speed=2 ⇒ exakt doppeltes Tempo
  (linear, gemessen: Leg-Dauern halbieren sich exakt), und die
  Editor-Live-Vorschau stimmt mit dem Board überein.

### Changed
- **City Workers: stapfen jetzt durch tiefen Schnee** — komplette
  Gang-Neuabstimmung auf "erschöpfte Überlebende":
  - Gehtempo aus der WEGLÄNGE abgeleitet (konstante, langsame
    Wat-Geschwindigkeit statt gleicher Zeit pro Leg): Peak ≈ 4,9-5,9
    px/s auf einem 133-px-Hex (vorher ~26-30 px/s), Anker-zu-Anker
    ~15-30 s, skaliert proportional mit der Polygon-Größe.
  - Schwerer Schritt-Takt ~1,2-1,6 Schritte/s mit kleinem Körper-Bob
    pro Schritt; Lurch-Amplituden reduziert.
  - Fliegen-Jitter entfernt: laterales Mäandern auf höchstens EINE
    träge Schwankung pro Leg reduziert, Heading-Wobble halbiert.
  - Anstrengung: Mid-Leg-Verlangsamungen (Tiefschnee-Stellen),
    häufigere und breitere Atempausen-Stopps, längere Arbeits- und
    Off-Stage-Phasen (Zyklen jetzt ~110-220 s), Werkzeug-Rhythmus
    auf ~1 langsamen Schlag alle 1,5-2,5 s entschleunigt.
  - Trampelpfade (1.2.29) folgen automatisch der neuen Pose-Funktion;
    Sampling auf 1 s gestreckt (räumlich weiterhin ~3 px Abstand),
    75-s-Verblassen unverändert.

---

## [1.2.29] — 2026-06-06

Phase 58 Wave 3.8a — Operator-Idee (2026-06-06): "Die Arbeiter könnten
im Schnee Wege/Pfade hinterlassen (die dann nach einer Zeit wieder
verblassen), damit es so aussieht als ob sie im Schnee gestampft sind."

### Added
- **City Workers: festgestampfte Schnee-Pfade** — Figuren hinterlassen
  beim Gehen Spuren im Schnee, die über ~75 s wieder verblassen
  (Smoothstep-Ausblendung). Kühle, dunkle, niedrig-transparente
  Striche in Schulterbreite der jeweiligen Figur, UNTER den Figuren
  gerendert; mehrfaches Begehen derselben Route verdichtet die Spur
  natürlich zu einem "etablierten" Trampelpfad, Gruppen hinterlassen
  ein locker geflochtenes Spurenband (jedes Mitglied seine eigene,
  leicht versetzte Spur). Spuren folgen exakt dem gewundenen Gang
  (Meander/Pace/Hesitation) und entstehen nur, solange die Figur
  sichtbar ist (Fade-Rampen respektiert).
- **Kein Akkumulations-Canvas** — vergangene Positionen werden pro
  Frame deterministisch aus dem Alter re-evaluiert (Position ist eine
  reine Funktion der Zykluszeit); Dashboard, /output und SSR rendern
  mathematisch identische Spuren (hash-verifiziert), Spuren überleben
  Reloads automatisch. Pfad-Samples sind pro Figur memoisiert (der
  Zykluspfad wiederholt sich exakt), Segmente werden alpha-quantisiert
  zu wenigen stroke()-Aufrufen gebündelt: Mehrkosten ≈ 0,11 ms pro
  Raum-Frame (133-px-Tile, gemessen), 0 wenn der Effekt nicht läuft.

---

## [1.2.28] — 2026-06-06

Phase 58 Wave 3.7z — "City Workers"-Iteration nach Operator-Feedback
(2026-06-06): Per-Raum-Zufälligkeit, Gruppen, menschlicher Gang.

### Changed
- **City Workers: jeder Raum sieht anders aus** — die Figurentabellen
  werden nicht mehr nur über den Figuren-Index geseedet (Cluster-Start
  zeigte in jedem Raum dieselbe Szene), sondern pro Raum aus einem
  FNV-1a-Hash der Raum-ID × Figuren-Index: eigenes Anker-Layout,
  eigene Zyklus-Offsets, eigene Bevölkerungsdichte (countScale
  ×0,75-1,3) pro Raum. Gleiche Raum-ID ⇒ weiterhin deterministisch
  identische Szene auf Dashboard, /output und SSR
  (pixel-hash-verifiziert); Szenen sind pro Raum memoisiert
  (gedeckelter Cache).
- **Gruppen-Events** — etwa die Hälfte der Räume (raum-geseedet)
  bekommt eine Gruppe von 2-4 Figuren mit gemeinsamer Route:
  Leader-Anker + kleiner Streuversatz pro Mitglied und Anker (sie
  laufen locker parallel und streuen an den Arbeitspunkten
  auseinander), gemeinsame Zyklusdauer/Versteck-Phase mit minimalem
  Phasen-Lag pro Mitglied — die Gruppe erscheint als gelegentliches
  Event zusammen, "atmet" aber durch individuelle Gang-Seeds. Figur 0
  bleibt immer Einzelgänger; Laternen tragen nur Nicht-Gruppen-Figuren.
- **Menschlicher Gang statt "Fahrzeug"** — Punkt-zu-Punkt-Bewegung
  humanisiert: (a) mäandernde Pfade (zwei inkommensurable Sinuswellen
  als seitlicher Drift um die Gerade, an beiden Ankern festgepinnt),
  Blickrichtung folgt der Kurven-Tangente statt starr aufs Ziel;
  (b) variables Schritttempo — Smoothstep-Easing in und aus jedem
  Stopp, subtiler Beschleunigungs-/Verzögerungszyklus, bei einigen
  Figuren ein kurzes Zögern auf halbem Weg; (c) Körper-Bob quer zur
  Laufachse + leichtes Heading-Wackeln im Schritt-Rhythmus, Amplitude
  skaliert mit dem aktuellen Tempo (Figur "setzt sich" beim Einlaufen
  in einen Stopp). Alles weiterhin rein deterministisch aus `age` +
  Seeds (kein per-Frame Math.random); Always-Paint-Vignette und
  Knob-Semantik (Intensity = Anzahl, Speed = Tempo) unverändert.
  Trajektorien-Messung am echten Render: Tempo-Rampe 1→26 px/s rein,
  30→2 px/s raus, max. seitliche Abweichung ~17 % der Sehne —
  "gehen, nicht fahren".

---

## [1.2.27] — 2026-06-06

Phase 58 Wave 3.7x+y — "Heat"-Feinschliff + neue Coded-Raum-Animation
"City Workers" für das Frostpunk-Board (Operator-Spec 2026-06-06).

### Changed
- **„Generator Heat" → „Heat", Glut-Partikel entfernt** — die
  aufsteigenden Glut-„Bläschen" brachen die Immersion und sind komplett
  raus; der atmende radiale Glow und die Heat-Shimmer-Streifen bleiben
  unverändert. Kanonischer Effekt-Key ist jetzt `heat` (Editor-Label
  „Heat"); der alte Key `generator-heat` funktioniert weiter als
  Rückwärts-Kompatibilitäts-Alias — bestehende Animationen rendern
  unverändert und werden beim nächsten Speichern transparent auf
  `heat` normalisiert.

### Added
- **Neuer Coded-Effekt „City Workers"** — winzige Top-Down-Bewohner
  beleben die Kraterstadt: dunkle Silhouetten (Schulter-Ellipse +
  Kopfpunkt in Laufrichtung + weicher Schatten, kalt-blaugrau getönt),
  die zwischen 2-4 geseedeten Ankerpunkten um das Zentrum stapfen, an
  den Ankern stehenbleiben und mit rhythmischem Werkzeug-Ruckeln
  „arbeiten", dann weich aus-/einblenden. Bewusst spärlich („hin und
  wieder"): lange Off-Stage-Phasen pro Figur, meist nur 0-2 Figuren in
  Bewegung, ruhige Perioden inklusive. Figurengröße relativ zum
  Raum-Polygon mit absoluten Grenzen (≈2,5 % der Polygonbreite,
  2-7 px) — Bewohner bleiben klein gegenüber den Gebäuden. Wenige
  Figuren tragen eine gedämpfte warme Laterne (Tint-Farbe einstellbar,
  Standard `#c98a4b`). Regler: Intensity = Bewohnerzahl (Standard ~4
  bei 0,8), Speed = Geh-/Arbeitstempo, Opacity gesamt. Komplett
  deterministisch (kein Per-Frame-Zufall — Dashboard, /output und SSR
  identisch); eine ultraschwache kalte Vignette malt in jedem Frame
  (SSR-Strobo-Schutz). Im Animation-Editor als „City Workers" unter
  Effect (coded) wählbar, inkl. Live-Preview und neuem
  Zwei-Figuren-Icon.

---

## [1.2.26] — 2026-06-06

Phase 58 Wave 3.7w — Neue Coded-Raum-Animation "Generator Heat" für das
Frostpunk-Board (Operator-Spec 2026-06-06).

### Added
- **Neuer Coded-Effekt „Generator Heat"** — simuliert die vom zentralen
  Generator abgestrahlte Hitze/Wärme: atmender radialer Glow vom
  Raumzentrum (~0,24 Hz × Speed, Radius ±15 %), subtile aufsteigende
  Heat-Shimmer-Streifen (additiv) und spärliche Glut-Partikel, die mit
  seitlichem Pendeln nach oben treiben und dabei schrumpfen/verblassen.
  Komplett deterministisch aus dem Animations-Alter (keine
  Per-Frame-Zufallswerte) — Dashboard, /output und SSR rendern
  identische Frames. Regler: Opacity (gesamt), Intensity (Glow-Stärke +
  Glut-Dichte), Speed (Puls + Partikel), Heat-Tint-Farbe (Standard
  Glut-Orange `#ff7a1a`; wird beim Auswählen des Effekts im Editor
  automatisch gesetzt). Im Animation-Editor als „Generator Heat" unter
  Effect (coded) wählbar, inkl. Live-Preview und Flammen-Icon.

---

## [1.2.25] — 2026-06-06

Phase 58 Wave 3.7v — Animation-Editor: Bibliotheksliste zeigt Typ-Wechsel
sofort. Operator-Meldung 2026-06-06.

### Fixed
- **Die Typ-Zeile unter dem Animationsnamen in der linken
  Bibliotheksliste aktualisiert sich jetzt sofort, wenn der Typ im
  Edit-Pane per Dropdown geändert wird** — vorher zeigte die Liste den
  alten Typ bis zum Schließen und erneuten Öffnen des Editors, auch nach
  bestätigtem Apply. Ursache: der `assetType`-Change-Handler baute nur
  das Edit-Pane neu, rief aber nie `renderList()` auf (der Apply-Pfad
  synchronisiert nur die Dirty-Bar). Fix: `renderList()` beim
  Typ-Wechsel — Auswahl und Scroll-Position bleiben erhalten
  (gap-closure-21), das Zeilen-Icon zieht mit. Der Name war nicht
  betroffen (Name-Input patcht die Listenzeile bereits direkt).

## [1.2.24] — 2026-06-06

Phase 58 Wave 3.7u — align-mode corner scale handles stay reachable at
extreme zoom. Operator spec 2026-06-06.

### Fixed
- **Corner scale handles (⤢) on /output/ align mode now clamp into the
  visible viewport when the board is scaled so large that their natural
  outward placement (corner ±62 px) lands off-screen** — previously the
  handles became unreachable at extreme zoom, making scale-down impossible.
  Mirrors the rotate handle's Phase-36 stay-visible behavior: the outward
  offset flips inward when it would leave the viewport ("zapp"), plus a
  hard viewport clamp (14 px margin) as a safety net. Drag math is
  unaffected — scaling measures the pointer's distance from the grid
  centroid, not the handle's rendered position, so dragging a clamped
  handle applies the exact same transform as dragging from the true corner.
  Clamped handles carry `data-clamped="1"` for diagnostics/E2E. Rotate
  handle behavior, the align transform model, and align-grid-snapshot /
  align-corner-drag payloads are unchanged.

## [1.2.23] — 2026-06-06

Phase 58 Wave 3.7t — mp4 boomerang playback. Operator UAT 2026-06-06.

### Fixed
- **playbackMode="boomerang" now actually ping-pongs for MP4 room/inside/
  outside animations** (was visually identical to "loop" on dashboard AND
  /output/). Root cause: boomerang manages no `playbackPhase`, so the draw
  loop's `expectedSrcUrl` (Wave 3.6 in-place phase swap) was ALWAYS the
  forward URL — one rAF after the EOS handler's forward→reverse src swap,
  `ensureRoomMp4Playback`/`ensureOutsideMp4Playback` classified the reverse
  src as a direction mismatch and yanked it straight back to forward,
  killing the reverse leg instantly. The expectedSrcUrl swap is now skipped
  for boomerang — the EOS ping-pong handler owns the src.
- Boomerang EOS handler now detects the current leg's direction by ROUTE
  (`/api/animation-reverse`) instead of exact URL equality, so adaptive
  quality-tier (v1.2.19) changes mid-leg no longer break the ping-pong.
  Tier changes apply at the next EOS swap (both directions move to the
  proxy variants together); never mid-leg — no src fight.
- The per-rAF ensure no longer races the EOS handler with `play()` on an
  ended boomerang video (which would have restarted the forward leg at 0
  before the reverse swap).

### Added
- Permanent `[58] boomerang-degraded` console warn (once per element) when
  no reverse variant is resolvable for a boomerang mp4 (asset outside
  `/resources/animations/`), making the silent loop-fallback diagnosable.

## [1.2.22] — 2026-06-06

Phase 58 Wave 3.7r+s — cluster gif re-trigger desync on /output/ +
re-trigger flash. Operator UAT 2026-06-06.

### Fixed
- **Cluster re-trigger now flips ALL member rooms on /output/ — no more
  partially-flipped clusters.** A cluster re-trigger emits one
  edit-room mutation per member (12 + parent); on the projector role
  the HTTP snapshot poll (scheduled by every WS broadcast) could
  resolve BEFORE the remaining edit-room WS frames arrived. The poll
  apply preserved the projector's local `playbackPhase` (the v1.2.16/17
  anti-revert guard) while accepting the re-stamped timestamp, and the
  late WS frames were then version-rejected as stale — the flip for
  those members was permanently lost ("einige Räume unberührt",
  compounding into opposite-direction desync on repeat). Measured on an
  isolated server with a CPU-throttled + latency-emulated FINAL client:
  4/10 cluster cycles desynced pre-fix. Fix: re-trigger re-stamp
  detection in the snapshot preservation block, symmetric on ALL roles
  — an incoming `startedAtEpochMs` more than 250 ms NEWER than the
  previously known epoch for the same animation id marks a re-trigger;
  the incoming phase + render bookkeeping is then authoritative
  (preservation skipped, permanent `[58] re-stamp-accepted` log).
  Identical/older epochs keep the existing preservation, so
  client-derived transitions (forward→frozen-last, mid-reverse) are
  still protected from stale snapshots. Post-fix: 10/10 gif cluster
  cycles and 10/10 mp4 cluster cycles flip all 12 members on the
  dashboard, the /ssr FINAL client, and the SSR render tab
  (.planning/debug/phase-58-gif-final-desync.md).
- **Re-triggering a frozen gif no longer flashes ("Blitz") — the frozen
  image holds through the phase transition, frame-perfect.** The
  dispatch-side flip re-stamps `startedAt = performance.now()` from an
  input/WS task inside the current frame; the next draw tick's rAF
  timestamp is the frame's vsync BEGIN time, which can predate the
  re-stamp (measured: +3.7 ms). The draw loop's `now < startedAt`
  stagger guard then skipped the paint for that tick on a canvas that
  clears every rAF → 1-frame transparent hole = the flash (mp4 had the
  same 1-frame hole). Fix: play-then-freeze instances with a playback
  phase set (re-stamps always set one; fresh staggered dispatches never
  do) are exempt from the not-yet-started skip and render with age
  clamped to 0 — which IS the frozen boundary frame (reverse at age 0 =
  last frame = frozen-last image; forward at age 0 = first frame =
  frozen-first image). Genuine staggered future starts keep the skip.
  Verified with a per-rAF paint probe on dashboard AND /ssr: zero
  unpainted ticks across re-trigger transitions; flip ticks paint
  frame 279 → 278 → … (and 0 → 1 → … for frozen-first→forward) with no
  frame-0 jump.

---

## [1.2.21] — 2026-06-06

Phase 58 Wave 3.7p+q — gif reverse-on-retrigger + first-selection sync
after editor return. Operator UAT 2026-06-06.

### Fixed
- **GIF room animations now honor the playback phases on re-trigger
  (reverse / frozen-last / frozen-first).** Re-triggering a gif with
  play-then-freeze + reverse-onRetrigger played it FORWARD from frame 0
  again — the dispatch-side phase flip already routed for any asset
  type, but the timeline-based gif renderer ignored
  `animation.playbackPhase`. The gif timeline now mirrors instead of
  server-transcoding: phase `reverse` walks the frame cursor backwards
  from the last frame (identical speed multipliers), `frozen-last` /
  `frozen-first` clamp to a constant frame with zero per-frame timeline
  work. A new `maybeTransitionGifPlaybackPhase` (gif equivalent of the
  mp4 `maybeTransitionPlaybackPhase`, same idempotent style and `[58]
  phase` log) advances forward→frozen-last at EOS and
  reverse→frozen-first (or reverse→disappear via a single idempotent
  stop for reverse-then-disappear). Mid-play taps flip the direction in
  ANY phase (v1.2.18 parity) and cluster re-triggers flip gif member
  phases (v1.2.20 parity) — both fall out of the existing dispatch
  machinery. Inside/outside gif usages and loop / boomerang /
  play-once-disappear room gifs are unchanged. Also fixed: the
  orchestration ctx wrapper dropped the `playbackState` third param of
  the mp4 `maybeTransitionPlaybackPhase` (Wave 3.7i freeze-frame
  pinning), now forwarded.
- **First library selection after returning from the animation editor
  no longer triggers the FIRST animation.** Creating an animation in
  the editor and returning to the dashboard left the room-animation
  dropdown's options stale (the editor never re-synced the dashboard
  panels on close). Selecting the new animation via the Tap-Action
  pill then assigned `select.value` an id with no matching option —
  which yields `""` per HTML spec — and the dropdown's change handler
  "validated" `""` back to `animations[0]`, silently overwriting the
  pill's just-set draft id; the next room tap fired the first
  animation in the list. Fixed at the root: the editor's `close()` now
  re-syncs the dashboard FX panels (room/inside/outside), and the
  change handler falls back to the current draft id when the select
  value is empty (defense-in-depth for any other stale-options
  source). A permanent `[58] select` log (user-action frequency) makes
  raw→resolved selection mapping visible in the console.

## [1.2.20] — 2026-06-06

Phase 58 Wave 3.7o — reverse-on-retrigger now works at CLUSTER level.
Operator spec 2026-06-06: "wenn Animationen in einem Cluster getriggert
wurden und dann der Cluster-Room erneut getriggert wird, VERSCHWINDEN
alle Animationen im Cluster. Gewollt: in allen Räumen des Clusters
beginnt das Reverse."

### Fixed
- **Cluster re-trigger flips every member's playback direction instead
  of stopping the cluster.** The cluster-level equivalent of the
  v1.2.16 quick-tap bug lived in `dispatchClusterToggle`
  (runtime-lifecycle-cluster-pads.js): a pad re-tap on a cluster with a
  running same-type entry took the toggle-OFF branch, and
  `collectAnimationStopIds` cascades a cluster stop to ALL member
  instances — every animation in the cluster vanished. When the
  matching cluster entry runs play-then-freeze with a reverse
  `onRetrigger` (ANY phase, v1.2.18 semantics), the tap now diverts to
  the start path, where a new cluster phase-advance candidate block in
  `startRoomAnimationFromDraft` (the single-room block was explicitly
  gated `targetType === "room"` — "cluster phase transitions deferred")
  flips EACH member by ITS OWN phase (forward/unset/frozen-last →
  reverse; reverse/frozen-first → forward). Mixed phases — e.g. one
  room individually re-triggered between cluster taps — stay
  independent per member. The cluster-scope parent entry mirrors the
  flip on its own phase field for pad-UI/snapshot consistency. Members
  in other playback modes fall through to the existing toggle-stop, and
  Clear mode / the running list still stop reverse-retriggerable
  clusters. Staggered clusters flip all members SIMULTANEOUSLY
  (per-member staggered reversal intentionally not implemented).
  Reverse/proxy src swaps (incl. adaptive 480p tier) ride the existing
  per-instance machinery.

### Added
- **`[58] cluster-toggle` / `[58] cluster-retrigger` diagnostics** —
  permanent console.warn on every cluster pad toggle decision
  (retrigger vs stop) and every cluster dispatch's phase-advance check
  ({clusterId, candidateMatched, memberCount, per-member
  {id, roomId, phaseBefore, phaseAfter}}). User-action frequency only.

---

## [1.2.19] — 2026-06-05

Phase 58 Wave 3.7n — adaptive video quality (operator feature request
2026-06-05): "Einen (optionalen) Modus, in dem die Videos automatisch
runterskalieren und z.B. eine 480p-Variante nutzen, sobald erkannt
wird, dass es massive Framedrops gibt." Per-instance playback
(play-then-freeze) means N rooms = N×1080p decoders; 2-3 rooms already
dropped fps badly, and the operator wants 10+ rooms via clusters.
Permanent quality reduction was explicitly rejected — the tier adapts.

### Added
- **Adaptive video quality (default ON).** A global quality tier for
  non-loop room mp4 instances. Under sustained distress (rAF fps EMA
  < 20 OR runtime pressure level ≥ 2 continuously for ≥ 2.5 s, with
  ≥ 2 actively playing room-mp4 instances) the runtime downswitches
  every playing instance to a server-encoded 480p proxy variant.
  Mid-play swaps preserve playback position (currentTime is captured,
  re-applied on `loadedmetadata`, clamped to duration; the fallback
  canvas bridges the load window). FROZEN instances never swap
  mid-freeze — they adopt the current tier on their next phase change.
  Upswitch back to full resolution requires sustained health (fps > 28
  AND pressure 0 for ≥ 10 s) AND ≤ 1 playing instance — the anti-
  oscillation hysteresis: while a heavy multi-video scene is still
  playing, returning to full would immediately re-create the distress;
  in practice recovery lands once the burst is frozen/over, and new
  instances then start at full quality. Loop-mode room mp4s are exempt
  by design (they share ONE decoder per asset across rooms — no
  N×decoder pressure — and their src is owned by the Phase 28
  hash-bust).
- **`GET /api/animation-proxy?asset=…&height=480`** — ffmpeg-downscaled
  proxy variant (`-vf scale=-2:<h>`, fps preserved, h264, audio
  dropped) of a `/resources/animations/*.mp4` asset. Height whitelist
  360/480/720 (default 480; anything else → 400). Cached at
  `resources/.proxy-cache/<basename>-<mtimeMs>-h<height>.mp4` with the
  same validation, in-flight dedup, and atomic temp-file rename as the
  Phase 58 reverse cache. Encode start/done logged server-side
  (`[58] proxy encode …`).
- **`/api/animation-reverse` optional `height` param** — encodes
  reverse + downscale in one pass (`-vf reverse,scale=-2:<h>`), cached
  under a height-suffixed key, so the reverse-on-retrigger cycle stays
  seamless at the proxy tier. Without the param the endpoint is
  byte-identical to before (backward compatible).
- **Settings → System toggle "Adaptive Video-Qualität (auto 480p bei
  Framedrops)"** — per-client persisted flag (localStorage
  `tt-beamer.adaptive-video-quality.v1`). Note: the flag is per
  rendering client (dashboard, /output/, SSR tab each have their own
  localStorage); default is ON everywhere.
- **`[58] quality` / `[58] quality-swap` diagnostics** — permanent
  console.warn on every tier change ({from, to, reason, fps, pressure,
  activeMp4Count}) and on every position-preserving src swap.

---

## [1.2.18] — 2026-06-05

Phase 58 Wave 3.7m — direction flip works mid-playback, not only when
frozen. Operator UAT after v1.2.17: "Loop-Modus funktioniert, ABER nur
wenn das video schon am Ende angelangt ist (freezed frame), wenn man
mitten während dem abspielen drückt, möchte ich dass es trotzdem …
in der anderen Richtung das video abspielt".

### Changed
- **Re-trigger of a play-then-freeze instance now flips direction in
  ANY phase.** Previously the phase-advance candidate (and the v1.2.16
  quick-tap diversion) only matched frozen-last/frozen-first; a tap
  mid-playback fell through to tap-to-stop. Now: forward (or unset) /
  frozen-last → reverse-from-last-frame; reverse / frozen-first →
  forward-from-first-frame — the src swap enters the other file at its
  first frame, exactly the requested behavior. Stopping these instances
  remains available via quick-mode Deactivate/Clear modes and the
  running list (tap no longer stops them in toggle mode).

---

## [1.2.17] — 2026-06-05

Phase 58 Wave 3.7k/3.7l — the /output/ playback flicker root-caused and
fixed (resolves the v1.2.16 "Known issues" item), plus the multi-room
same-asset loop-mode side-bug found during the investigation.

### Fixed
- **Pressure-skipped rooms paint the fallback frame instead of
  transparent — SSR /output/ flicker during multi-video playback.**
  Under sustained runtime pressure level 2 (the SSR tab reaches and
  HOLDS it for the whole playback window with 8 concurrent 1080p room
  mp4s: decode + canvas + GL warp + tab capture + software encode),
  `shouldSkipRoomMp4Frame` bare-returned from `drawRoomComposition` for
  every PLAYING room on alternating frames. The canvas clears each rAF,
  so the skipped room's polygon was TRANSPARENT that frame → black in
  the GL-warped output and the encoded stream; the two seed-parity
  groups swapped each frame at ~3.5 Hz — the operator's /output/
  flicker (third occurrence of the "bare return on a clearing canvas"
  class). The skip is now folded into the live-paint gate: a pressure-
  skipped frame takes the existing fallback-blit branch (one cheap
  canvas blit, same cost profile as a frozen paint) instead of leaving
  the region unpainted. Pressure relief preserved — live full-res
  paints are still halved at level 2. Measured before/after on an
  isolated SSR host (per-frame in-tab sampler, 8 videos, p=2
  sustained): 173 blank room-frames → 0; visible-surface coverage
  alternation eliminated (mean per-frame delta 2.49 → 0.40 cells, no
  jumps ≥ 20); frozen-state soak stays byte-stable (v1.2.15 behavior);
  dashboard at pressure 0 unchanged (loop mp4 paints live at 30/s).
- **Multi-room same-asset loop mode never played.** Loop-mode rooms
  share ONE per-path video element, but the Wave 3.1 instance-change
  rewind in `ensureRoomMp4Playback` reset `currentTime = 0` whenever
  the ensure call's instanceId differed from the element's stamp — with
  N>1 rooms on the same asset that rewound the shared video EVERY
  frame, pinning it at readyState 1 / t=0 forever (rooms showed only
  fallback stills/black). The rewind is now skipped for loop mode (it
  exists to restart per-INSTANCE videos when a new animation instance
  adopts a cached element; the shared loop element must keep its
  position). Verified: two rooms + same mp4 + loop → both advance in
  lockstep at 30 live paints/s.

---

## [1.2.16] — 2026-06-05

Phase 58 Wave 3.7j — Bug A actual root cause: quick-tap toggle, not
live-sync. Found via the operator's v1.2.15 `[58]` console logs.

### Fixed
- **Bug A — re-trigger removed the frozen animation instead of playing
  reverse.** The operator's `[58]` logs showed the smoking gun: every
  removal was `reason:"explicit-remove", mutationType:"stop-animation"`,
  and the `[58] re-trigger` candidate log only ever fired for EMPTY
  rooms (`sameRoomCount:0`). Tapping a room with a running/frozen
  instance never reached `startRoomAnimationFromDraft` (where the
  Wave 3.4 phase-advance lives) — `toggleRoomAnimationByQuickTap`
  intercepted the tap and STOPPED the instance (tap-to-toggle
  semantics). That's why 9 live-sync/render fixes (v1.2.6–1.2.15)
  changed nothing and why every debugger repro (which called the
  dispatch function directly) passed. Fix: when the tapped room holds a
  frozen (`frozen-last`/`frozen-first`) play-then-freeze instance with a
  reverse `onRetrigger`, the tap now routes to the activate path →
  phase-advance → reverse playback. Actively playing instances keep
  tap-to-stop. New `[58] quick-toggle` log shows the decision
  (retrigger vs stop) for every tap on an occupied room.

### Known issues
- /output/ (SSR) still shows flicker WHILE videos play (dashboard clean
  since v1.2.15; frozen state clean on both). Under investigation —
  likely SSR-capture-side, distinct from the fixed dashboard mechanisms.

---

## [1.2.15] — 2026-06-05

Phase 58 Wave 3.7i — frozen instances stop doing video work, and the
runtime gets PERMANENT `[58]` diagnostics. Operator UAT on v1.2.14: all
8 frozen rooms started flickering SECONDS after freezing ("ein einziges
Bild zu zeigen sollte keine Last erzeugen" — correct, and that was the
defect), and re-trigger of a frozen animation still occasionally removed
it (Firefox "Ungültige URI").

### Fixed
- **Frozen instances paint exclusively from the frozen fallback frame —
  zero per-frame video work.** For a video paused at EOS, rVFC stops
  firing, so the v1.2.14 freshness gate degraded every frozen room to
  time-gated LIVE `drawImage(video)` + per-paint fallback capture —
  continuous full-res video work per frozen room. Room, inside, and
  outside mp4 paths now branch on `playbackPhase` frozen-last /
  frozen-first and paint only the fallback canvas (one cheap blit per
  rAF, keeping the Win32 capture budget); the freeze frame is pinned at
  the phase transition.
- **Ended-video blank-frame capture guard.** On Firefox, `drawImage` of
  an ENDED video can intermittently yield a BLANK frame under load
  (decoder reclaims the buffer); a blank capture clobbered the good
  fallback and the blank then replayed → flicker. `captureRoomMp4-`/
  `captureOutsideMp4FallbackFrame` now skip the capture when
  `video.ended` unless no usable fallback exists yet (first capture).
- **Frozen rooms are exempt from the pressure frame-skip.** Under
  runtime pressure level 2, `shouldSkipRoomMp4Frame` bare-returned
  every 2nd frame — on a canvas that clears each rAF that strobed the
  whole room region. With v1.2.14's frozen rooms still doing full video
  work, pressure climbed seconds after the last freeze and ALL frozen
  rooms blinked at once (stopped when animations were removed =
  pressure dropped). Frozen paint is now cheap AND never skipped.
- **Outside-mp4 rVFC chain accumulation (v1.2.14 regression).**
  `ensureOutsideMp4Playback` recreated its playback-state object every
  rAF; with Wave 3.7h's per-(state, video) rVFC binding this registered
  one NEW perpetual capture chain per tick (~60/s), each doing a
  full-res fallback capture per decoded frame. The state object is now
  reused (mirrors the room path).
- **Loop-mode room mp4s with a manifest hash never played (pre-existing
  since Wave 3.6, verified broken on v1.2.14).** The expectedSrcUrl
  phase swap compared the hash-suffixed src against the plain forward
  URL and fought the Phase 28 hash-bust — `video.src` round-tripped
  every rAF, `readyState` pinned at 0. The swap is now gated to
  non-loop modes and compares srcs ignoring the `?v=<hash>` suffix.

### Added
- **Permanent `[58]` console diagnostics (operator request)** — one
  compact line per event, event-driven only (no per-frame logs):
  `[58] re-trigger` (every room-trigger's phase-advance check incl.
  per-instance phase/mode/onRetrigger), `[58] anim-removed` (every
  snapshot removal with reason: explicit-remove / board-mismatch /
  sustained-absence + absentMs), `[58] anim-absent-start` /
  `anim-absent-recovered` (absence-grace tracking), `[58] release-video`
  (immediately precedes any Firefox "Ungültige URI" line, names the
  instance), `[58] phase` (playback phase transitions), `[58] src-swap`
  (forward↔reverse swaps), `[58] prune-release` (release-debounce
  decisions). Future failures are now explainable from console output.

### Verification
- Playwright Firefox (isolated server): 5 rooms frozen, 45s soak with
  2s pixel sampling — all samples non-blank and byte-stable; frozen
  instance shows 0 decodes/captures over the soak; full re-trigger
  cycle forward→frozen-last→reverse→frozen-first→forward passes with
  the same instance id and no release/media errors; `[58]` logs fire on
  transitions and are absent during steady state. Playwright Chromium:
  loop-mode room mp4 decodes ~30fps with live pixels (fixed vs the
  broken v1.2.14 baseline). `npm test`: 383 pass / 14 fail — identical
  to the pre-change baseline. The re-trigger removal itself could NOT
  be reproduced locally; the permanent `[58]` logs exist to identify it
  in the operator environment if it recurs
  (.planning/debug/_verify_v1215.py).

## [1.2.14] — 2026-06-05

Phase 58 Wave 3.7h — root-defect fixes for Bug A (re-trigger disappear)
and Bug B (Firefox multi-video flicker). The 8 prior patches
(v1.2.6–1.2.13) were narrow; the completed debug investigations
(.planning/debug/phase-58-bugA-firefox.md, phase-58-bugB-flicker.md)
converged on three root defects, all fixed here. Operator environment is
FIREFOX — both bugs were invisible in Chromium-only repros.

### Fixed
- **Bug A root: snapshot omission == removal (live-sync).** Snapshot
  apply wholesale-replaces `state.runningAnimations`, so a TRANSIENT
  snapshot omission removed running instances. Prior patches protected
  only <500ms-old instances + frozen/reverse phases — phase `forward`
  instances older than 500ms had no protection (evidence: operator's
  10× Firefox "Ungültige URI" = 10 per-instance videos released after a
  wholesale wipe). New model in `applyLiveRuntimeSnapshot`: an animation
  is removed only by explicit remove mutation (stop-animation /
  clear-all), board mismatch, or SUSTAINED absence (>2s) from snapshots
  (`absentSinceMsById` grace tracking). Frozen/reverse phases never
  expire by absence (client-derived); explicit removes clear the
  bookkeeping and still remove immediately.
- **Bug B root 1: Firefox rVFC starvation (render layer).** Firefox
  delivers `requestVideoFrameCallback` for multiple concurrent off-DOM
  videos only sporadically (3-13 fires/s for a 25fps source at ~5+
  videos) — the draw-loop gate trusted `videoFrameCallbackBound` and
  replayed a frozen fallback between fires, then jumped forward on each
  fire = the operator's flicker/blinking (vanishes with devtools open =
  scheduling change). New `isRvfcFresh()` (fired within 150ms): the gate
  is now `newFrame || (!fresh && time-gate)` on room/inside/outside mp4
  paths, with per-paint fallback capture while rVFC is not fresh.
  Healthy rVFC (Chromium, SSR) keeps the exact previous behavior.
- **Bug B root 2: stale playback-state inheritance.** rVFC binding is
  now tracked per (state, video-element) pair (`_rvfcBoundVideo`) so a
  new video element under a preserved state always re-binds, and
  `releaseMp4VideoElementsForInstance` now also purges the per-instance
  `roomMp4PlaybackStateByKey` entries (previously leaked forever).
- **Animation id collision across page loads.** Ids were
  `anim-${counter}` with the counter resetting per page load — a reload
  or second client reused ids of still-running instances, which then
  inherited stale video/playback caches (rVFC never bound, previous
  animation's frozen frame painted forever). Ids now carry a per-load
  session suffix: `anim-<session>-<counter>`. Ids are opaque strings
  everywhere; `global-*` ids unchanged.

### Verification
- Playwright Firefox 148 (isolated server): full re-trigger cycle
  (forward → frozen-last → reverse → frozen-first → forward →
  frozen-last) with the instance surviving throughout; 5-room omitting-
  snapshot survival (<2s) + sustained-absence removal (>2s) + immediate
  explicit-stop removal; reload-mid-running with fresh rVFC bindings and
  collision-free ids. 17/17 checks pass.

---

## [1.2.13] — 2026-06-05

Phase 58 Wave 3.7g — frozen animations must survive snapshot omission.

### Fixed
- **Bug A, actual gap found via operator console evidence.** Firefox
  logged "Ungültige URI. Laden der Medienressource fehlgeschlagen" ×5 at
  re-trigger — that message only comes from
  `releaseMp4VideoElementsForInstance` setting `video.src = ""`, proving
  the frozen instances really were dropped from `state.runningAnimations`
  for >500ms. The v1.2.11 in-flight merge only protects animations whose
  `startedAtEpochMs` is <500ms old — but a FROZEN play-then-freeze
  instance is minutes old by the time the operator re-triggers. Any
  snapshot that transiently omits it (reconnect live-hello, interleaved
  mutation, align-profile apply) removed it instantly → release debounce
  killed its video element → frozen image vanished. Fix: instances in a
  client-derived playback phase (`frozen-last`, `frozen-first`,
  `reverse`) are now preserved across snapshot omission unconditionally
  (board-bound via `filterRunningAnimationsForBoard`); explicit
  `stop-animation` / `clear-all` still remove them.

---

## [1.2.12] — 2026-06-05

Phase 58 Wave 3.7f — FPS: drop redundant per-frame fallback capture.

### Changed
- **Room mp4 FPS under many concurrent videos.** The room draw path
  captured the fallback canvas (a full-resolution `drawImage` of the
  `<video>`) on EVERY painted frame, on top of `_bindRoomMp4FrameCallback`
  already capturing on every decoded frame via rVFC. With N concurrent
  room videos that was N redundant full-res blits per rAF — the dominant
  cost behind the operator's "spürbarer FPS-Einbruch bei vielen
  gleichzeitigen Videos". Now the per-live-paint capture only runs when
  rVFC is NOT bound (browsers lacking `requestVideoFrameCallback`);
  otherwise the fallback stays fresh from rVFC alone. No change to
  fallback freshness on Chromium/the SSR tab.

---

## [1.2.11] — 2026-06-05

Phase 58 Wave 3.7e — Bug A finally fixed (6th iteration), found by
spawning a dedicated debugger after 5 fixes (v1.2.6–1.2.10) failed.

### Fixed
- **Bug A — re-trigger of a frozen play-then-freeze room animation
  makes the image DISAPPEAR on the beamer instead of playing reverse.**
  Real root cause (all 5 prior fixes targeted the wrong layer): the
  disappear happens on the PROJECTED output (`/ssr` + `/output`, the
  `final-output` role), not on the dashboard (`control`). On re-trigger,
  CONTROL sets `playbackPhase=reverse`, re-stamps `startedAtEpochMs`, and
  broadcasts an `edit-room` mutation. The server bumps the session
  version and, during interleaved mutation processing, briefly serves a
  snapshot whose board-filtered `runningAnimations` transiently OMITS the
  just-re-triggered instance. `applyLiveRuntimeSnapshot` wholesale-
  replaces `state.runningAnimations` with that array. The v1.2.10
  in-flight merge that re-inserts a <500ms-old locally-mutated animation
  (which masked this on the dashboard) was **gated to
  `OUTPUT_ROLE_CONTROL`**, so the projector got zero protection and
  dropped the animation → vanish. Opening devtools (`TT_DEBUG_58`) only
  slowed timing so the omitting snapshot and the re-add snapshot no
  longer collided in the sub-frame window — the race-vanishes-with-
  devtools signature. Fix: dropped the `OUTPUT_ROLE_CONTROL` gate on the
  in-flight merge in `runtime-live-sync-core.js` so it runs on the
  projector too (the 500ms `startedAtEpochMs` grace + `snapshotIds`
  de-dup keep it safe; `!isExplicitRemoveMutation` still lets clear-all /
  stop-animation through). Verified by the debugger via direct
  snapshot-apply repro: a `final-output` tab dropped a 164ms-old
  animation (inside the grace window that protects CONTROL) until the
  gate was removed.
- **Bug B — flicker on rapid concurrent triggers persists in `/output`
  though fixed in the dashboard.** Same defect, same fix: the in-flight
  merge was CONTROL-gated, so `/output` (FINAL role) never got it. The
  single gate change above resolves both A and B.

### Changed
- `playbackPhase` / `_endedDispatched` / `_phaseChangedAt` preservation
  across non-edit-room snapshots now applies on the projector role too
  (the projector locally derives its playback phase via the draw loop).
  Live-editor fields (opacity/speed/scale/...) stay CONTROL-only —
  they're server-authoritative on the projector, so preserving stale
  copies there would mask legitimate server updates.

---

## [1.2.10] — 2026-06-05

Phase 58 Wave 3.7d — fixes BOTH remaining bugs via the same root cause:
snapshot-apply races against locally-pushed / locally-mutated state.

### Fixed
- **Bug A — re-trigger of play-then-freeze still disappears (4th
  iteration, this one actually works).** Root cause: the phase-advance
  dispatcher mutates `candidate.playbackPhase = "reverse"` locally and
  broadcasts via `edit-room` asynchronously. The CONTROL snapshot-apply
  pipeline preserves a hardcoded list of `LOCAL_EDIT_FIELDS` across
  non-edit-room snapshots — and `playbackPhase` was NOT in that list.
  Any periodic / non-edit-room snapshot arriving during the round-trip
  window REVERTED the local mutation back to the server's pre-edit
  value ("frozen-last"). The next rAF saw phase="frozen-last", swapped
  video.src back to the forward URL, then the edit-room round-trip
  arrived and swapped it back to reverse, on alternating rAFs → video
  stuck in `load()` loop → polygon never renders → operator UAT
  "verschwindet". Fix: added `playbackPhase`, `_endedDispatched`, and
  `_phaseChangedAt` to the preservation list in
  `runtime-live-sync-core.js`. v1.2.9's `currentTime >= duration - 0.5`
  guard in `maybeTransitionPlaybackPhase` is still correct defense in
  depth (prevents the stale-`ended` race in the render layer too).
- **Bug B — wild flicker when 4+ animations triggered concurrently
  (vanishes when devtools is open — classic timing race signature).**
  Root cause: same family as Bug A — snapshot-apply replaces
  `state.runningAnimations` wholesale. Operator rapid-clicks N rooms;
  the client pushes anim1..N to local state and emits N trigger-room
  mutations. The server processes mutations one at a time and
  broadcasts a snapshot after each, so snapshot#1 has [anim1],
  snapshot#2 has [anim1, anim2], etc. Each intermediate snapshot
  REMOVES the locally-pushed-but-not-yet-broadcast-back animations
  from state.runningAnimations → polygons render empty → next
  snapshot brings them back → flicker. Devtools opens slows JS just
  enough that snapshots arrive after the operator's hand stopped
  clicking, eliminating the race. Fix: on CONTROL, the snapshot-apply
  pipeline now MERGES recently-started animations (startedAtEpochMs
  within the last 500ms) from the previous local state back into the
  incoming snapshot when not present, treating them as "in-flight."
  500ms is tight enough that genuine auto-expire (hold:false +
  durationSec >= 1s) isn't masked.
- Render-side belt-and-braces: `releaseMp4VideoElementsForInstance`
  now waits for 500ms of SUSTAINED absence before destroying a
  per-instance video element. Defensively guards against any
  remaining transient-snapshot scenario by preventing video element
  destruction on a single missed frame.

## [1.2.9] — 2026-06-05

Phase 58 Wave 3.7c — actual fix for "reverse-on-retrigger disappears."

### Fixed
- **Bug A revisited (third time's the charm).** After v1.2.7 and
  v1.2.8 each addressed *symptoms* of the stale `video.ended` race,
  the actual mechanism is in `maybeTransitionPlaybackPhase`. The
  draw loop calls it right after `ensureRoomMp4Playback` swaps src
  and `load()`s the reverse mp4. HTML spec: load() resets resource
  selection asynchronously, so `video.ended` is observably `true`
  for the rest of the current rAF. The transition handler gated
  only on `video.ended` and `phase === "reverse"` → fired
  immediately → animation jumped to `frozen-first` BEFORE reverse
  playback ever started → operator UAT "trotz reverse on
  re-trigger verschwindet das Bild". Fix: require
  `currentTime >= duration - 0.5s` for the transition to fire.
  After load() currentTime is 0, so the stale-ended state cannot
  trigger a spurious transition. When reverse actually completes,
  currentTime is at the end → transition fires normally.

### Diagnostic
- Added `window.TT_DEBUG_58` gated console.warn instrumentation in
  three places to help diagnose Bug B (4+ concurrent flicker —
  cause still unidentified): `ensureRoomMp4Playback` logs video
  state on every swap or once per second; phase-advance check logs
  whether the candidate matched and what same-room animations
  exist; draw-loop room mp4 logs paint outcomes accumulated per
  instance per 1000ms window. Enable in browser console with
  `window.TT_DEBUG_58 = true` before reproducing.

## [1.2.8] — 2026-06-05

Phase 58 Wave 3.7b — two defensive fixes after v1.2.7 UAT.

### Fixed
- **Re-trigger of a "Freeze, reverse on re-trigger" mp4 still
  disappeared instead of reversing.** Root cause: after the in-place
  `video.src` swap to the reverse URL, `video.ended` stayed `true`
  for a microtask window (HTML spec — load() resets resource
  selection via a queued task, not synchronously). The
  `isFrozenAtEnd` gate in `ensureRoomMp4Playback` /
  `ensureOutsideMp4Playback` skipped `play()` on the exact tick we
  swapped → reverse src loaded but never started. Fix: track a
  `srcWasSwapped` flag and force-bypass the `isFrozenAtEnd` gate
  when the swap fired this tick.
- **Wild flicker across all room polygons with 4+ concurrent
  animations of the same mp4, until all froze.** Root cause:
  concurrent `video.load()` + rVFC race. During the first 100–300ms
  after 4 fresh per-instance video elements load(), `readyState`
  flips transiently below 2 AND rVFC hasn't fired its first frame
  yet → `haveLiveFrame=false` AND `fallbackCanvas` empty →
  `getRoomMp4FallbackSource` returns null → polygon went
  transparent for that rAF → next rAF readyState recovered → flicker
  cycle. Fix: extend the v1.1.7 "last-resort live-paint" pattern
  from the `haveLiveFrame` branch to the `!haveLiveFrame` branch.
  When fallback canvas is null AND `videoWidth > 0` AND
  `readyState >= 1` (HAVE_METADATA) AND not seeking, paint the live
  `<video>` directly. Browser-defined as safe — draws the poster
  frame or no-ops; strictly better than transparent. Applied to all
  three mp4 paths (room/inside/outside).

## [1.2.7] — 2026-06-05

Phase 58 Wave 3.7 — hotfix for the v1.2.6 regression. Re-trigger of a
play-then-freeze animation no longer "disappears"; first trigger plays
forward instead of jumping straight to the frozen frame.

### Fixed
- **mp4 room/outside trigger only showed the frozen-last frame; no
  playback ever happened.** Root cause: the v1.2.6 `expectedSrcUrl`
  in-place src swap added to `ensureRoomMp4Playback` /
  `ensureOutsideMp4Playback` fought the pre-existing Phase 28 B5
  hash-bust swap in `getMediaVideoElement`. Every rAF the two
  mechanisms swapped `video.src` between the hashed URL
  (`…/generator_boost.mp4?v=2437bdc3c310`) and the bare phase URL,
  each calling `video.load()` → readyState never reached 2 → no live
  frame → fallback canvas showed whatever was last captured (the
  frozen frame for re-triggers, black for fresh instances). Fix:
  gate the Phase 28 hash-bust swap on `_tt58PlaybackMode === "loop"`
  (or undefined). Non-loop modes own `video.src` via the phase swap
  and the hash-bust is unnecessary for per-instance video elements
  anyway (re-uploads can't happen mid-playback).
- **Outside-fx layer was reading `animation.*` from an undefined
  variable — the surrounding `drawOutsideFxLayer` scope only has
  `runningInstance`.** Optional-chain masked the ReferenceError but
  silently fell back to definition defaults, so outside-scope mp4
  and gif never honored per-instance `playbackMode`,
  `playbackDirection`, or `playbackPhase`. Replaced `animation?.*`
  with `runningInstance?.*` in the outside-gif and outside-mp4
  branches.

## [1.2.6] — 2026-06-05

Phase 58 Wave 3.6 — per-instance playback state + in-place src swap.
Superseded by v1.2.7 the same day after operator UAT exposed the
two-sided src swap regression (see v1.2.7 Fixed).

### Fixed (later regressed; see v1.2.7)
- Multi-room sync of shared frozen frame: `_roomMp4Key` now uses a
  composite per-instance key (`${assetRef}#${instanceId}`) for
  non-loop modes so each instance owns its own playback state +
  fallback canvas + rVFC binding.
- Phase transition forward↔reverse: introduced `expectedSrcUrl` for
  in-place `video.src` swap to keep the same playback state across
  the transition. (This change introduced the swap-fight regression
  fixed in v1.2.7.)

## [1.2.5] — 2026-06-04

Phase 58 Wave 3.5 — fix the reverse-on-retrigger broadcast so /output/
actually picks up the phase change.

### Fixed
- **Re-trigger of a "Freeze, reverse on re-trigger" animation
  disappeared the instance instead of reversing it.** Root cause:
  Wave 3.4 emitted a custom `trigger-room-phase` / `trigger-global`
  with action="phase-advance" mutation, but the server's
  `LIVE_MUTATION_TYPES` guard silently dropped these unknown action
  names → the broadcast never reached /output/. Local CONTROL state
  showed the phase advance but the server-snapshot pipeline
  overwrote it back. Fix: reuse the existing `edit-room` mutation
  type with the mutated animation snapshot. The server already
  knows how to propagate `edit-room`; the snapshot includes
  `playbackPhase` automatically (spread of all instance fields).
- Phase-advance now also re-stamps `startedAt` / `startedAtEpochMs`
  on the existing instance so the render layer treats the phase
  transition as a new playback lifecycle (and the per-instance
  cache lookup for the alternate URL gets a clean video element).

## [1.2.4] — 2026-06-04

Phase 58 Wave 3.4 — implement the reverse-on-retrigger phase
state machine. Closes the operator-blocking issue from Wave 3.3 UAT
where re-triggering a "Freeze, reverse on re-trigger" animation
disappeared the instance instead of reversing it.

### Added
- **Phase-aware re-trigger** for `play-then-freeze` with
  `reverse-then-freeze-first` / `reverse-then-disappear`:
  - First trigger → plays forward → freezes (phase = `frozen-last`)
  - Re-trigger → transitions phase to `reverse` → plays reverse
    (using the ffmpeg-cached reverse URL)
  - When reverse ends:
    - `reverse-then-freeze-first` → phase = `frozen-first`; further
      re-trigger transitions to `forward` again (manual ping-pong)
    - `reverse-then-disappear` → emits `stopAnimation`, removes
      instance
- Implemented in two trigger surfaces:
  - `upsertGlobalAnimation` (inside / outside global triggers) via
    new `advanceReversibleFreezePhaseIfPossible()` helper called
    BEFORE the existing stop-on-re-trigger path.
  - `startRoomAnimationFromDraft` (room scope, single-room target)
    via inline phase-advance check before the new-instance creation.
    Cluster mode falls through to existing behavior (cluster phase
    transitions deferred).
- New `maybeTransitionPlaybackPhase(animation, video)` helper in
  `runtime-outside-mp4.js`, called from all three mp4 paint paths
  after each render tick. Observes `video.ended` and advances the
  instance's `playbackPhase` based on the configured `onRetrigger`.
- Render layer now picks the asset URL based on
  `animation.playbackPhase`:
  - `forward` / `frozen-last` → forward URL
  - `reverse` / `frozen-first` → ffmpeg reverse URL
  Phase transitions automatically swap to the appropriate cached
  per-instance video element.

### Notes
- Live-sync emits a `trigger-global` / `trigger-room-phase`
  mutation with the updated `playbackPhase` so `/output/` clients
  receive the new phase via the standard snapshot pipeline. Server
  treats unknown actions as a snapshot-only broadcast, so no server
  code change required.
- Per-instance video cache (Wave 3.2) means each phase transition
  creates a new video element keyed by the new src URL +
  `instanceId`. Brief load delay (~50-300ms typical) at the
  transition is bridged by the canvas painting the underlying
  board image during the gap. Phase 57 fallback canvas does not
  apply to per-instance elements (would require additional
  plumbing).

## [1.2.3] — 2026-06-04

Phase 58 Wave 3.3 — direction bug + per-room independent lifecycle +
editor UX restructure. Closes the operator-blocking issues from
Wave 3.1's first round of UAT.

### Fixed
- **mp4 always played reverse in the dashboard** regardless of the
  Direction dropdown setting. Root cause: the boomerang src-swap
  marker (`_tt58ReverseSrc`) persisted across mode changes; the
  cache-reset skip kept the video pointing at the reverse URL even
  after the operator switched away from boomerang. Fix is two-sided:
  the skip-reset condition now also requires `_tt58PlaybackMode ===
  "boomerang"`, and `attachMp4LifecycleHandlers` clears the boomerang
  markers whenever the new mode is not boomerang.
- **Multiple rooms running the same play-then-freeze animation
  showed only the frozen frame on the 2nd+ rooms.** Root cause: mp4
  video elements were cached per asset path and shared across all
  active instances → Room A's at-EOS-frozen video was inherited by
  Room B's just-triggered instance. Fix: per-instance video element
  for any non-loop mode (cache key becomes `${path}#${instanceId}`).
  Each room now has independent lifecycle. Loop mode keeps the
  shared-per-path behavior (no benefit from desync).
  Cleanup hook in `pruneFinishedAnimations` releases instance-keyed
  video elements when the instance leaves the running list, so
  long-running sessions don't leak `<video>` elements.

### Changed
- **Animation editor playback dropdown restructured** for clarity.
  Replaced the confusing 4-mode + 3-sub-option layout with 5
  self-describing top-level entries under "When ended":
  - Loop forever
  - Disappear
  - Freeze (re-trigger removes)
  - Freeze, reverse on re-trigger
  - Boomerang (auto forward & reverse)
  The "After reverse on re-trigger" sub-dropdown only appears when
  the reversible-freeze mode is selected (Freeze at first frame /
  Disappear). Schema (`playbackMode` + `onRetrigger`) is unchanged —
  the UI just translates to/from a clearer `_uiPlaybackMode` token.
- **"Direction" dropdown renamed to "Initial direction"** with
  clearer option labels ("Forward (start to end)" / "Reverse (end to
  start)") so the operator understands it sets the FIRST direction,
  not the only one.
- **Editor preview now restarts on every change** for non-loop modes
  (slider nudges, sub-option flips, etc.) so the operator always
  sees a fresh playthrough of the currently-tuned animation. Loop
  mode keeps the fast-path so the in-flight loop doesn't stutter on
  numeric changes.
- **Preview "disappear" outcome is now visualised**: when mode is
  play-once-disappear, the video / gif canvas hides itself via
  `style.visibility = hidden` at EOS so the operator sees the
  disappear semantics literally. Slider nudges restart and re-show.
- **GIF preview honors mode + direction** in the canvas-driven
  preview tick (`startGifPreview`). Boomerang ping-pongs the cursor
  through `_resolveFrameIndex`; reverse direction walks frames
  backward; play-once-disappear hides the canvas at EOS. Previously
  the gif preview only ever played forward at native rate.

## [1.2.2] — 2026-06-04

Phase 58 Wave 3.1 — fix mp4 playback modes and editor preview parity.

### Fixed
- **mp4 play-once-disappear / play-then-freeze actually freeze /
  disappear** instead of looping. Three converging root causes:
  - `ensureRoomMp4Playback` / `ensureOutsideMp4Playback`
    unconditionally called `video.play()` whenever the video was
    paused — restarting the playback the lifecycle handler had just
    paused at EOS. Added `isFrozenAtEnd` guard that skips auto-play
    when `video.ended === true` and mode ∈ {play-once-disappear,
    play-then-freeze}.
  - `maybeWrapRoomMp4Loop` / `maybeWrapOutsideMp4Loop` skipped only
    play-once and play-then-freeze, NOT boomerang — but for
    boomerang the wrap also preempted the natural EOS so the
    ended-listener src-swap never fired. Gate tightened to: only
    plain `loop` keeps the seam-preventing wrap.
  - `getMediaVideoElement` cache-hit logic detected a `video.src`
    mismatch (after boomerang src-swap) and reset back to the
    canonical forward URL → boomerang cycled forever as forward-only
    loop with rapid ABORTs (operator-observed `[ssr-tab:reqfailed]
    net::ERR_ABORTED` for both forward and reverse URLs). Cache
    reset now skipped when the current src matches the stamped
    boomerang reverse URL.
- **Re-trigger after play-once-disappear plays from the beginning**
  instead of inheriting the previous instance's `video.ended=true`
  state (which would make the new instance freeze immediately). Both
  ensure functions now stamp `_tt58InstanceId` on the video element;
  a different id resets `currentTime = 0` so the new playthrough
  starts fresh.
- **Editor preview respects per-animation playback mode + direction**
  (`animation-editor-live-preview.js`). Previously the preview
  hardcoded `video.loop = true`. Now: `loop` only when mode is
  `loop`; reverse direction loads the
  `/api/animation-reverse?asset=...` URL; play-once modes freeze at
  EOS; boomerang src-swaps. The edit-pane forces a full preview
  rebuild when `playbackMode` or `playbackDirection` change in the
  patch so the new flags actually apply (numeric-patch fast path was
  silently skipping the rebuild for these fields).

## [1.2.1] — 2026-06-04

Phase 58 follow-up: Wave 2.5 (cleanup-dispatch + bug fix) + Wave 3
(gif reverse / boomerang + mp4 ffmpeg-reverse infrastructure +
direction field).

### Fixed
- **play-once-disappear correctly disappears** instead of freezing
  at the last frame. The render layer now detects video.ended (mp4)
  or cursor-past-total (gif) and dispatches `stopAnimation(id)`
  exactly once per instance (idempotent via
  `animation._endedDispatched`). The animation cleanly removes from
  the running list. Wired in all three render paths (room-mp4,
  inside-mp4, outside-mp4) and all three gif paths.

### Added
- **Per-animation Direction control** (Forward / Reverse) in the
  editor, separate from playback mode. Reverse plays the animation
  from end to start. Combined with a mode:
  - Loop + Reverse = reverse-loop (plays backwards forever)
  - Play-once-disappear + Reverse = plays once backward then
    disappears
  - Play-then-freeze + Reverse = plays once backward, freezes at the
    first frame
  - Boomerang + Reverse = starts reverse, then ping-pongs
- **gif reverse playback** via cursor math in
  `_resolveFrameIndex` (`runtime-gif-playback.js`). Boomerang
  ping-pongs the cursor across `[0, 2 * totalDurationMs)`; the
  second half mirrors back so the same frame-walk produces a
  reverse playthrough. No frame buffering needed.
- **mp4 reverse playback** via server-side ffmpeg pre-compute. New
  `/api/animation-reverse?asset=<path>` endpoint
  (`server.mjs::getOrEncodeReverseMp4`) spawns `ffmpeg -vf reverse`
  on first request, caches the output under
  `resources/.reverse-cache/<basename>-<mtime>.mp4`. Subsequent
  requests serve from disk (typical: 1.8s first encode, 5ms cache
  hit). Path-traversal guarded; in-flight encodes deduped via a
  shared promise.
- **mp4 boomerang** via src-swap on `ended`. The lifecycle handler
  alternates between the forward asset URL and the
  `/api/animation-reverse?...` URL so the same `<video>` element
  alternates direction. Brief load-and-play stall (50-300ms) at
  each swap is bridged by the Phase 57 fallback canvas.
- New schema field `playbackDirection` on every gif/mp4 animation
  definition (default `"forward"`). Persisted to disk; carried
  through `createAnimation` → instance → render.

### Notes
- Phase 8 boomerang lesson (`P8-T47-REVERSE-ROOT-CAUSE.md`) honored:
  zero `video.currentTime` seeks per rAF. mp4 reverse uses
  pre-encoded files via ffmpeg; mp4 boomerang src-swaps between
  forward and reverse files at EOS.
- Still deferred to Phase 59: reverse-then-X sub-options of
  play-then-freeze (the on-retrigger reverse-playback). These need
  per-instance phase tracking (frozen-last → reverse → frozen-first /
  disappeared) plus the dashboard per-trigger mode override.

## [1.2.0] — 2026-06-04

Phase 58 — Per-animation playback modes. Operator can now configure
each gif / mp4 animation in the editor with one of four playback
modes: **Loop** (default, legacy behavior), **Play once and
disappear**, **Play once and freeze** (with three On-retrigger sub-
options: Disappear / Reverse-to-first-freeze / Reverse-to-first-
disappear), and **Boomerang**. Applies to all three animation
scopes (room + inside + outside).

### Added
- **Per-animation `playbackMode` + `onRetrigger` schema fields**
  on every gif/mp4 animation definition (`src/app/runtime/state/
  runtime-fx-normalizers.js`). Backwards-compat: definitions without
  the new fields default to `playbackMode = "loop"`. Legacy
  `loopUntilStopped = false` infers `play-once-disappear` on read.
- **Stufenweise picker in the animation editor**: Mode dropdown
  (Loop / Play-once-disappear / Play-then-freeze / Boomerang) plus
  a conditional On-retrigger sub-dropdown that appears only when
  Mode = Play-then-freeze. Lives in the Defaults card alongside the
  existing sliders (`animation-editor-edit-pane.js`). Replaces the
  legacy inside-only Loop toggle with a unified picker available in
  all three scopes for gif/mp4.

### Changed
- **Runtime state machine for non-reverse modes** carries
  `playbackMode` + `onRetrigger` through `createAnimation`,
  `upsertGlobalAnimation`, and the room-dispatch path onto every
  running animation instance. Render layer reads `animation.playbackMode`
  to decide loop semantics:
  - `loop` — `video.loop = true` (mp4) / gif modulo-wrap (legacy).
  - `play-once-disappear` — mp4: `video.loop = false`, native EOS
    pause; gif: cursor clamps to final frame.
  - `play-then-freeze + instant-disappear` — same as play-once-
    disappear visually (video frozen at last frame); re-trigger uses
    existing upsert→stop flow for instant cleanup.
  - `attachMp4LifecycleHandlers` installs an idempotent `ended`
    listener that pauses the video for non-loop modes; the per-mode
    flag lives on the video element so mid-playback mode changes
    take effect at the next EOS.
  - `maybeWrapRoomMp4Loop` / `maybeWrapOutsideMp4Loop` skip the
    near-EOS seek-back for non-loop modes so the freeze-at-end
    actually persists.

### Deferred (selectable in UI but not yet fully implemented; will
ship in Phase 59)
- **`boomerang` mode** — falls back to loop behavior at runtime.
  Requires reverse-playback infrastructure (mp4: server-side ffmpeg
  pre-compute + cache + WS progress event; gif: frame-walk-backward
  via the existing `_resolveFrameIndex` cursor math).
- **`reverse-then-freeze-first` + `reverse-then-disappear` sub-
  options** of `play-then-freeze` — currently behave the same as
  `instant-disappear` because the reverse-playback infrastructure
  above isn't wired yet. The On-retrigger dropdown still saves the
  operator's choice; once Phase 59 lands the selected behavior takes
  effect automatically without an editor re-save.
- **Dashboard per-trigger mode override** — operator-confirmed scope
  but not yet wired. Today's `loopUntilStopped` per-trigger toggle
  stays as-is. Phase 59 will replace it with the same stufenweise
  picker plus a `Use animation default` first option.

### Notes
- Phase 8 Boomerang lesson (`P8-T47-REVERSE-ROOT-CAUSE.md`) is
  honored: the Wave 2 implementation does NOT use `video.currentTime`
  seeks per rAF for reverse playback. The Phase 59 reverse pipeline
  will use ffmpeg pre-computed reverse mp4 files (cached on disk) +
  the existing Phase 57 mp4 playback pipeline pointed at the reversed
  source. gif reverse will use ImageDecoder frame-index walking via
  `runtime-gif-decoder.js`.
- Per-board JSON files now persist the new schema fields. Operators
  can configure modes today; Loop / Play-once-disappear / Play-then-
  freeze + Instant-disappear are visible at runtime. Selecting
  Boomerang or a reverse-on-retrigger sub-option saves correctly and
  becomes active when Phase 59 lands.

## [1.1.7] — 2026-06-02

Phase 57 Sammelphase continuation: closes two operator-reported
follow-up bugs surfaced when overlaying mp4 animations on the same
board after v1.1.6 shipped.

### Fixed
- **Bug A — Strobo / black-flicker on overlaid mp4** (`src/app/
  runtime/render/runtime-outside-mp4.js` + `runtime-draw-loop.js`).
  The v1.1.5 rVFC paint gate's fallback branch returned `null` from
  `getRoomMp4FallbackSource` / `drawOutsideMp4FallbackFrame` when the
  fallback canvas was older than 1500 ms OR when the fallback hadn't
  been captured yet. The paint sites in turn left the region
  UNPAINTED → the main rAF's `clearRect` bled black through →
  operator-visible random black flashes when two mp4s overlay with
  desynced decode cadences (operator UAT 2026-06-02: snow.mp4 inside-
  animation + generator_boost.mp4 room animation). Three-part fix:
  (1) drop the 1500 ms age guard on both fallback helpers (returning a
  stale fallback is strictly better than returning null);
  (2) eagerly capture the fallback canvas inside the rVFC frame
  callback so the fallback is always populated after the first
  decoded frame regardless of the paint site's `haveLiveFrame` check;
  (3) add a "paint live `<video>` directly" last-resort branch in all
  three mp4 paint sites for the initial-state case where no fallback
  has been captured yet. Linux Playwright verification with both
  mp4s overlay: post-startup `no-frame` paint count is **0/0** across
  21+ one-second samples (down from ~2 % pre-fix); snow-only regression
  baseline preserved (0 stale, 0 no-frame).
- **Bug B — Inside animation overwrites room animations** (`src/app/
  runtime/render/runtime-draw-loop.js`). Phase 12 room-room
  concurrency lifts `globalCompositeOperation` to `"lighter"` via
  `roomConcurrencyByKey` but that map only counts `scope === "room"`
  entries — inside (`scope === "global"`) animations were never
  counted, so a room+inside combination drew the inside animation
  opaquely on top of the room region (operator quote: "Wenn erst
  raum animationen gestartet werden und dann die inside animation —
  dann sieht man die room animationen nicht mehr"). Fix: build
  parallel `insideAnimationCountByBoard` and
  `roomAnimationCountByBoard` maps each rAF; both room-scope draw
  branches (cluster member + single room) and the inside-animation
  draw branch now lift to additive composite when the other side is
  concurrently active, mirroring the Phase 12 pattern. Layering is
  order-independent regardless of trigger order.

### Notes
- Linux Playwright verification with the snow.mp4 (inside) +
  generator_boost.mp4 (room) overlay scenario; visual frames captured
  on /output/ show both animations visible continuously with no black
  flashes.

---

## [1.1.6] — 2026-06-02

Phase 57 Sammelphase continuation: closes the residual SSR-tab
dropped-frame gap left after v1.1.5.

v1.1.5 fixed the paint gate (rVFC-driven, no more stale paints) but
the operator's Linux UAT still showed `vpq.droppedFps≈4-7/s` in the
SSR Chromium tab — Chromium's video pipeline was dropping decoded
frames UPSTREAM of any paint logic, even after `--disable-renderer-
backgrounding` / `--disable-background-timer-throttling` /
`--disable-backgrounding-occluded-windows` etc. Root cause: the
ANGLE backend was defaulting to Mesa llvmpipe (software GL), which
made the Chromium compositor too slow to keep up with 24fps content,
so the compositor scheduler dropped frames between decode and
display.

### Changed
- **`--use-angle=default` → `--use-angle=vulkan` on Linux SSR
  Chromium** (`src/server/ssr-render-host.mjs#buildChromiumLaunchArgs`).
  ANGLE now selects a Vulkan ICD (Intel / RADV / nouveau on real
  hardware; Mesa lavapipe as software fallback) instead of GL over
  llvmpipe. Measured impact on Linux dev box driving the Phase 57
  Playwright SSR-tab harness against snow.mp4 (23.976fps source,
  loop-until-stopped, 26+ one-second samples per run):

  | Metric (SSR-tab, post-settle) | v1.1.5 baseline | v1.1.6 (Vulkan) |
  |---|---|---|
  | `vpq.droppedFps` mean | 4.27 / s | **0.39 / s** |
  | `vpq.droppedFps` median | 4 | **0** |
  | `vpq.droppedFps` max | 6 | **1** |
  | Decoded frames / s | 19.77 | **24.0** (matches source) |
  | Live mp4 paints / s | 19.77 | **24.0** |
  | Gated-out paints / s | 32.1 | **0.97** |
  | Stream HUD drops (60s) | non-zero | **0/67** |

  88% reduction in `droppedFps`; the median sample now has zero
  drops. Decoded frame rate fully matches source. ANGLE's automatic
  fallback to GL (and then SwiftShader) is preserved — if a Linux
  host has no Vulkan ICD at all the worst case is the v1.1.5
  baseline; no new failure mode is introduced. On Win32 the
  `--use-gl=`/`--use-angle=` pair is still dropped under the
  headless-new default (`dropOnHeadlessNew` gate from Phase 47
  Wave 2) — Win32 behavior unchanged. The SSR_WIN_HEADLESS=0
  escape-hatch path on Win32 picks up the new Vulkan backend, which
  on Windows means ANGLE→D3D11 (Vulkan absent on most Win Chrome
  builds) — same fallback chain as today, just a different default
  preference order.

### Notes — investigation
- Tried and reverted (no measurable impact on `droppedFps`):
  `--disable-features=VideoBackgroundedFrameDropping`,
  `--disable-features=BackgroundVideoTrackOptimization`,
  `--disable-features=MediaSessionService`,
  `--disable-features=UseSurfaceLayerForVideo`,
  `--disable-background-media-suspend`. The Phase 57 prior debugger
  had flagged these as the "standard suspects" for backgrounded-tab
  video dropping. Empirically none changed the measured droppedFps
  more than noise — confirming the drops were NOT a tab-
  backgrounding optimization but a compositor-throughput limit.
- `--ignore-gpu-blocklist --enable-gpu-rasterization` (ungated)
  also tried and reverted: same regression as documented in Phase 34
  h2 (snow.mp4 fetch aborts with ERR_ABORTED, JS thread blocks).
  The Vulkan ANGLE backend is the only path that gives the
  compositor a real GPU without re-triggering Phase 34's hot-loop.

---

## [1.1.5] — 2026-06-02

Phase 57 Sammelphase: follow-up to v1.1.4 after operator UAT
(2026-06-01) reported residual mp4 stutter: "Immer noch die selben
kleine hänger wie zuvor, es ist nicht das es komplett freezed,
sondern eher immer wieder eine frame drop auftaucht — aber nur bei
dem mp4 video während die SSR und Stream fps stabil bleiben."

### Changed
- **mp4 paint gate now consumes the rVFC `hasVisibleFrame` signal
  instead of a pure time throttle.** The Phase 57 v1.1.4 fix tier-
  gated paints to 22 ms (45 fps in balanced tier) but ignored
  the `requestVideoFrameCallback` signal that
  `bindOutsideMp4FrameCallback` was already producing. Linux
  Playwright diagnostic (this version's new instrumentation, see
  below) showed the SSR-tab inside-mp4 path painting ~30
  `drawImage(video)` per second of which ~12 (40%) re-drew the
  prior decoded frame (no new rVFC tick) — perfectly identical
  bytes, but a wasted pipeline op and a misleading paint cadence.
  New `hasNewDecodedFrame(state)` helper consumes the rVFC
  `_decodedFrameCount` counter; paint sites in
  `runtime-draw-loop.js` (inside / room / outside-final) now only
  paint the live `<video>` when a new decoded frame is available
  since the previous paint, and `markMp4FramePainted(state)`
  stamps the counter after each successful live paint. On rAF
  ticks without a new frame, the fallback canvas (the most recent
  decoded frame) is replayed — same pixels as the prior
  duplicate-paint would have produced, so the Win32 canvas-damage
  budget is preserved at one `drawImage` per rAF
  (`project_win32_ssr_canvas_damage.md`). On browsers without
  `requestVideoFrameCallback` (none modern), the v1.1.4 time gate
  remains as a fallback.

### Added
- **`SSR_PUBLISHER_DEBUG=1` now also forwards `[mp4-diag]`
  console lines from the SSR Chromium tab to the server log**
  (`src/server/ssr-render-host.mjs`) and appends `?mp4diag=1` to
  the SSR navigation URL so the in-page diagnostic activates
  automatically. The diagnostic emits one JSON line per
  playback-state per second with `decoded` (rVFC ticks),
  `decodeFps`, `paints` (broken down into `live` / `stale` /
  `gated-out` / `fallback` / `no-frame`), `rafTicks`, and
  `vpq` (Chromium's `getVideoPlaybackQuality()` snapshot:
  `totalFps`, `droppedFps`, `currentTime`, `readyState`). This
  is the operator-facing toolkit for capturing the Win11 RTX 4090
  symptom in detail: `droppedFps > 0` indicates Chromium's
  video presentation pipeline is dropping decoded frames upstream
  of our paint code; `stale > 0` (should be ≈ 0 after the rVFC
  gate above) indicates the paint gate logic regressed. In-page
  flag also accepts `?mp4diag=1` or `window.TT_MP4_DIAG = true`.

### Notes — root-cause investigation summary
- Linux Playwright (headless Chromium + Xvfb SSR tab): snow.mp4
  is a 23.976 fps source (`r_frame_rate=24000/1001`, 198 frames
  in 8.26 s). Dashboard `getVideoPlaybackQuality` reports
  `totalFps=24, droppedFps=0` (no drops). **SSR tab** reports
  `totalFps=24, droppedFps=6` — Chromium's video presentation
  pipeline drops ~6 frames/s in the SSR tab, so only ~18 unique
  decoded frames per second reach the canvas even though the
  source delivered all 24. `rVFC` fires only for the non-dropped
  frames, so the paint code is already painting every available
  frame; the visible "frame drop" residue likely reflects that
  upstream-drop pattern. Win11 testing with the new
  `SSR_PUBLISHER_DEBUG=1` build will tell us whether Win11 has the
  same upstream-drop pattern; if `droppedFps=0` on Win11 and
  stutter is still reported, the symptom is encoder-side and needs
  its own phase. If `droppedFps>0` on Win11, the next plan is to
  suppress Chromium's hidden-tab video throttling.

---

## [1.1.4] — 2026-06-01

Post-v1.1.3 hotfix. Resolves the operator-reported "konstantes
leichtes Stockeln" on snow.mp4 in the SSR `/output/` stream.

### Fixed
- **SSR mp4 stream stutter ("constant low-FPS feel") on the
  `/output/` WebRTC consumer.** Universal root cause: the three
  internal mp4 render paths (inside-mp4, room-mp4, outside-mp4
  final-output) were painting `<video>` to the canvas on every rAF
  tick (~60 Hz on a modern PC) without rate-gating to the source
  cadence. snow.mp4 is 30 fps source, so every other rAF tick was
  sampling the same decoded frame → the SSR encoder picked this up
  as visible duplicate frames and the consumer saw 23–26 fps
  stuttery video while the dashboard rendered the same mp4 smoothly
  at full 30 fps. Fix is symmetric: all three paths now route
  through the same defense pattern that outside-mp4 (non-final-
  output) has used since Phase 30 — `shouldDrawOutsideMp4Now()`
  tier-gates the live paint to 33/22/16 ms (= 30/45/60 fps per
  perf tier), and a fallback canvas bridges the gated-out ticks so
  the SSR capture pipeline still sees a canvas op every frame
  (Win32 capture budget preserved per
  `project_win32_ssr_canvas_damage.md`). Inside-mp4 also gained
  the manual loop-wrap + fallback machinery it never had —
  previously a bare `video.loop=true` with no `readyState` check
  and no fallback canvas, making it the worst-case path. The
  Phase 30 T4 "always paint on `/output/`" optimization was
  removed: it was correct on Pi (~16 fps rAF, gate never fired)
  but wrong on modern Win11 / RTX 4090 (~60 Hz rAF, gate fires
  often) — that asymmetry is what produced the operator's reported
  stutter. No platform branches added; the fix is universal. Phase
  50's outside-mp4 loop-seam machinery is reused, not modified.

---

## [1.1.3] — 2026-05-25

Post-v1.1.1 hotfix.

### Fixed
- **Align handles + grid lines persist on `/output/` after a
  board switch with align mode OFF.** Reproducible sequence:
  toggle align mode ON, then OFF, then switch to a different
  board → the corner / rotate / scale / squish handles + the
  grid line overlay reappear on `/output/` even though align is
  off. Two distinct internal causes, both fixed: (a) the
  WebSocket grid-snapshot handler in the receiver rebuilt the
  handle DOM unconditionally whenever a new board's saved grid
  arrived, even when align was off — gated now on
  `getHandlesVisible() === true`; (b) the polygon-editor's
  room-overlay SVG (the "points") was repopulated by profile-
  persistence during the async board refresh, and a brief class
  flicker exposed it — `deactivate()` now also empties the
  `#room-overlay` children, and the `onProjectionProfileChange`
  handler pre-scrubs before awaiting any network refresh. The
  grid state itself is still restored by `restoreGridSnapshot`
  so the next align-mode activation rebuilds handles against
  the correct grid for the new board.

---

## [1.1.1] — 2026-05-25

Hotfix release. Restores the SSR stream on Windows after v1.1.0
shipped a regression that pinned `/output/` to ~1 fps on Win32
operator boxes (Linux unaffected).

### Fixed
- **Win32 SSR stream stuck at 1-2 fps with `outside-space` mode
  active.** The v1.0.31 starfield render optimization
  (`f6383b2`) batched ~600-800 per-frame canvas state changes down
  to ~30. On Linux+Xvfb this was a clean win (smoother SSR for the
  outside-space animation). On Win32 Chrome headless=new the
  drastic reduction in canvas state changes removed an implicit
  page-composition damage signal — Chromiums compositor stopped
  committing frames at 60 Hz and the tab-capture pipeline starved
  to ~1 fps. Revert restores the original per-star draw on all
  platforms; the Linux outside-space smoothness regression that
  motivated f6383b2 returns but is strictly better than the Win32
  1-fps break. Empirically root-caused via git-bisect on operator
  Win11 RTX 4090 box (2026-05-25 UAT: cef4da7/d4e8b6f/8527c77/
  2559e77 all smooth; f6383b2 broken).

### Added
- **`SSR_PUBLISHER_DEBUG=1` env var.** Gates two in-page diagnostic
  log lines emitted by the publisher: `[ssr-publisher] gpu-probe:
  vendor=... renderer=...` once at boot, and `[ssr-publisher]
  track-state [t+...]:` per encoder-stats poll showing
  `videoTrack.muted`, `readyState`, and source dimensions. Off by
  default so prod logs stay clean. Built up during the v1.1.0
  regression hunt — kept in gated form because they distinguish
  capture-pipeline from encoder-pipeline issues in one operator run.

---

## [1.1.0] — 2026-05-25

First MINOR release since the 1.0.0 cut on 2026-05-19. Rolls up
Phase 50, the post-launch operator-led Sammelphase: production fixes
from real-world use, animation-editor UX polish, SSR streaming
quality + smoothness, and broader board-aspect-ratio support so
any board game (not just Nemesis-shaped) displays without
distortion.

### Added
- **Boards of any aspect ratio.** Imported boards (square,
  rectangular, ultrawide) now render at their natural pixel ratio
  instead of being letterboxed into the original Nemesis-specific
  1.46:1 frame. Polygons stored as normalized [0..1] coordinates so
  they scale automatically. Server probes PNG/JPEG dimensions on
  import and attaches them to the runtime board record.
- **Aspect-aware play-area + align-mode defaults.** When you create
  a new play-area polygon (or hit Reset) the default hexagon now
  preserves the board image's width/height ratio. When you create
  a new align-mode profile, the default destination rectangle has
  the board's pixel proportions instead of the screen's 16:9.
  Equal-pixel margins on all four sides regardless of board shape.
- **VP9 codec option** alongside H.264 in Settings → Server Side
  Rendering. Most operators stay on H.264 (lower CPU); VP9 trades
  CPU for sharper detail at the same bitrate.
- **Content-hint dropdown** (`detail` / `motion` / `auto`) biases
  the encoder for either crisp particle/text/UI or smooth motion.
- **3-button bitrate preset radio** (Low 3 Mbit / Standard 10 Mbit
  / Maximum 30 Mbit) replaces the misleading raw-number slider in
  Settings → Server Side Rendering.
- **Live transform preview in the Animation Editor.** Rotation /
  width / height / X / Y offset edits now show on the preview
  thumbnail in real time. The preview clips to its box so
  `scale(4)` doesn't bleed across the page.
- **"Import from other board"** button in the projection profile
  UI for one-click profile copy.
- **`?ttApiBase=…` / `?apiBase=…` URL parameter** to point the
  client at a non-default API host (legacy carryover from 1.0.0,
  now exposed in the troubleshooting docs).

### Changed
- **"Save as default for this animation"** in the live editor now
  also closes the editor (was: two clicks — Save then Done).
- **"Default animation (auto-start on load)" checkbox renamed to
  "Auto-start animation"** for clarity. DOM IDs unchanged.
- **Animation editor: Transform sliders grey out** when "Stretch
  to polygon" is on, so the operator can see at a glance that the
  switch is what blocks the slider (was: sliders disabled
  internally but looked active).
- **`/api/global-defaults` now embeds the live `selectedBoard`**
  so a mobile cold-start lands directly on the right board (was:
  briefly displayed the alphabetically-first board, then switched
  ~60 s later when the WebSocket snapshot arrived).
- **All user-facing strings are now English.** Six leftover
  German strings (overlay text, reconnect status, host-down errors)
  translated. Operator UAT quotes kept verbatim in code comments.
- **Settings → System polish:** detected-encoders badge now has 3
  honest states (probing / software-only / hardware-list) instead
  of getting stuck at "(auto-detection in progress…)". Codec /
  Optimization help text moved from a wall-of-text into `ⓘ`
  info-icon tooltips.
- **Optimization mode + content-hint visible in /output/ overlay**
  on the ENCODE line (`hint=detail · target=2.0Mbps · 30fps`).
- **`recv=` field in /output/ overlay now stable.** No more
  flickering between a value and `?` — module-level persistent
  anchor + 15 s sticky cache + counter-rollback detection across
  peer-connection rebuilds.
- **Cadence note (operator-confirmed 2026-05-22):** every closed
  phase ships a PATCH bump (1.0.X). MINOR bumps (1.1.0, 1.2.0, …)
  are operator-cut release milestones rolling up multiple PATCH
  entries — this release is the first such cut.

### Fixed
- **Editor transform edits are now respected at trigger time.** The
  six `createAnimation()` call sites in `runtime-room-dispatch.js`
  silently dropped `rotationDeg / stretchToPolygon / widthScale /
  heightScale / offsetXScale / offsetYScale` from the spread —
  factory defaults (`stretchToPolygon: true, widthScale: 1, …`)
  then overwrote whatever the operator had edited. Animation edits
  now actually take effect on next Start.
- **MP4 loop seam in SSR stream eliminated.** Room MP4 animations
  used native `<video loop>` which stalls for 1 capture frame at
  EOS — invisible on the dashboard (canvas re-paint hides it) but
  captured + amplified by the SSR encoder. Ported the existing
  outside-MP4 seam machinery (manual early-wrap + cached fallback
  frame during `seeking`) to the room path. Operator UAT: "es
  darf NIEMALS zu einer Unterbrechung kommen". Now smooth.
- **outside-space (parallax starfield) smoothness in SSR.** The
  effect emitted ~600-800 canvas state changes per frame. Batched
  by 4 alpha buckets per layer → ~30 state changes per frame.
  Visually identical (natural sine-driven twinkle quantizes
  imperceptibly into the buckets). Was choppy in SSR only;
  dashboard's real GPU batched these into a few draw-calls so the
  operator never saw the cost.
- **Mobile loading-stuck root cause** (`/api/resources` had no
  AbortController + 12 s safety timer registered too late +
  onError didn't dismiss overlay). Three coordinated fixes:
  AbortController on the raw fetch, safety timer registered FIRST
  in initializeApplication, error path explicitly hides loading
  overlay. Loading-screen-forever no longer reproducible.
- **`API_REQUEST_TIMEOUT_MS` bumped 3 s → 8 s** so mobile cold-
  start DNS + LAN hop + first-byte doesn't trip the timeout.
- **Animation Name field keeps focus on dirty transition.** Was:
  typing the first letter dismissed the soft keyboard mid-word
  (the syncDirtyBar handler blurred the active input). Fix: skip
  blur when activeElement is a text-entry input/textarea.
- **Asset upload syncs def.assetRef.** Uploading a new GIF/MP4 in
  the editor auto-selected it in the dropdown but kept the old
  `assetRef` in state — renderer played the old file until the
  operator manually bounced the dropdown. Fix: any uploaded path
  that differs from the def's current `assetRef` fires a
  patchAnimation.
- **Per-board play areas restored** after a v1.0.17 regression
  where the boot reorder caused setupBoardState's default maps
  to overwrite hydrated per-board data. Fix: split off the board-
  ID picker into its own step so setupBoardState stays in the
  original slot (before hydration).
- **Active-bind preflight catches the VS Code "Code"-named server
  squatter** on Windows so the launcher doesn't accidentally bind
  to it. Plus the new `start.ps1` PowerShell 5 compatibility
  fixes (em-dash removal, `::new` → `New-Object`).
- **Win32 verdict-line crash on `producerIds` shape.** Pi
  diagnostic overlay no longer crashes when the live snapshot's
  `producerIds` field arrives as an unexpected shape.
- **Windows dashboard white-page** on first launch
  (path.normalize root).
- **Dashboard hiccup on align-mode exit** smoothed.
- **Cross-board profile leak on board switch** — switching boards
  no longer keeps the previous board's projection profile on the
  new board's stream.
- **Undo on /output/ now clears the dashboard's dirty flag** so
  the topbar chip doesn't stay yellow after a remote undo.
- **Dashboard CPU spike during /output/ align drag** smoothed
  (per-rAF accumulation moved to a single batched paint).
- **Polygon edit propagation to SSR** (handle-drag was racing the
  live-sync broadcast).
- **Mobile default board scale** so the cluster rail is visible
  out of the box.
- **`recv=?` flicker in /output/ overlay** (three iterations,
  final fix is the persistent anchor + counter-rollback).

### Phase 50 commit detail
The Sammelphase shipped as 31 PATCH releases (1.0.1 → 1.0.31)
each documented in commit messages. Older CHANGELOG entries
covering the same ground have been rolled up into this section
for the release notes — see `git log --since=2026-05-19
--grep="^fix(50)"` for the chronological detail.

---

## [1.0.0] — 2026-05-19

Initial public release. Phase 49 closure shipped the first live build
after a long iteration cycle of operator UAT polish on top of the
Phase 47 Windows process-supervision work. Highlights below — the
full per-fix list is in `git log --grep "49-gap-closure-"`.

### Added
- **"Import from other board" button** in the projection profile UI:
  one-click flow to copy a profile from another board into the active
  one. (`3eb4e92`, Phase 49 / gap-closure-25)

### Changed
- **Mobile portrait viewport** zoom-out + cluster-rail clipping rework
  so the rail (cluster pads) is visible by default without horizontal
  swipe, and never overlays the dashboard controls when the board is
  panned. (`756e21e` + `167d660`, Phase 49 / gap-closure-34/35)
- **Animation editor dirty-bar** redesigned for mobile: shrink-wrapped
  bar (no more right-edge clipping), no auto-focus on touch devices
  (no more soft-keyboard popping up on entry), hover styles gated to
  real-hover devices via `@media (hover: hover)`, Discard handler
  reworked to fire syncDirtyBar AFTER the async server reload finishes
  (no more "first-tap-did-nothing" perception on slow networks).
  (`de7af52` + `37fb6a9` + `3ac579b` + `7b32e04`, Phase 49 / gap-closure-25 through 28)
- **Mobile drag-to-reorder** in the animation library list now
  preserves native scrolling AND drag with auto-scroll-during-drag
  (Sortable.js-style `touchmove.preventDefault()` pattern instead of
  static `touch-action: none`). (`c935da6`, Phase 49 / gap-closure-23)
- **Board switch** falls back to the first available saved profile
  when no profile is remembered, instead of forcing the 80%-inset
  default. (`c9ea5e4`, Phase 49 / gap-closure-26)
- **Polygon edits** now broadcast to /output/ SSR + Pi immediately on
  save, not only after a full page reload. (`69e6f4d`, Phase 49 / gap-closure-23)

### Fixed
- **Align-mode fresh-boot desync**: typo in the polygon-editor hook
  meant the /output/ tab silently skipped the warp-grid apply path on
  cold boot. (`b79a9b3`, Phase 49 / gap-closure-22)
- **Dashboard CPU drain** when a remote operator was align-dragging
  on /output/: dashboard was running a self-perpetuating 8 Hz
  poll-and-apply loop, draining battery + starving animations.
  Three-round empirical debug located the documentVisible fast-mode
  trigger as the actual culprit (after fixing two earlier red
  herrings). (`c868c75` + `10eac9a` + `ca573f9`, Phase 49 / gap-closure-27/29/32)
- **Undo to baseline on /output/** now correctly clears the dashboard's
  "Unsaved on /output/" chip. (`92ab41d`, Phase 49 / gap-closure-30)
- **Reorder back to baseline** in the animation editor now auto-clears
  the dirty flag (was pinned at true because the fast-path skipped
  the baseline comparison). (`432e3f5`, Phase 49 / gap-closure-24)
- **Board-switch loses cross-board profile** when the operator picked
  a board that didn't have a saved profile. (`c74a406`, Phase 49 / gap-closure-24)
- **Win32**: dashboard rendered a white page on first boot
  (path.normalize root issue) + verdict-line crashed on a producerIds
  shape mismatch. (`b8ad1f1` + `db0b53a`, Phase 49 gap-closure-8/9)
- Numerous mobile-touch interaction polishes — see
  `git log --grep "49-gap-closure-1" --grep "49-gap-closure-2"` for
  the full sequence.

### Process
- TT-Beamer went LIVE with this build (2026-05-19). Going forward
  every closed phase ships a version bump + a CHANGELOG entry.
