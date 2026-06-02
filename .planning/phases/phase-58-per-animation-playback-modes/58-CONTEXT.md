# Phase 58 — Per-animation playback modes (loop / play-once / boomerang)

**Status:** DISCUSS complete (2026-06-02)
**Operator:** Frederik (frederik@lissek.info)
**Predecessor:** Phase 57 (closed PASS 2026-06-02 → v1.1.7)

---

## Domain

Heute loopen alle gif/mp4-Animationen automatisch und unbegrenzt. Phase
58 macht den Playback-Mode **per Animationsdefinition** konfigurierbar
und führt drei neue Modi ein: `play-once-disappear`, `play-then-freeze`
(mit drei On-Retrigger-Sub-Varianten) und `boomerang`. Anwendbar auf
`assetType` ∈ {`gif`, `mp4`} in allen drei Animationsbereichen
(room / inside / outside).

Diese Phase klärt das Schema, die Editor-UX, die Lifecycle-State-Machine
und die Reverse-Playback-Architektur. Neue Animationsklassen, Audio-
Sync für reverse, und Migration auf das neue Schema-Feld
(`loopUntilStopped` bleibt legacy-kompatibel readable) gehören NICHT
in diese Phase.

---

## Specifics (operator-locked)

### Anwendbarkeit
- Nur für `assetType ∈ {gif, mp4}`. `coded`-Effekte (z.B. starfield,
  fire, snow) behalten ihre eigene Lifecycle-Logik unverändert.
- Geltungsbereich: alle drei Animationsklassen (room + inside +
  outside). Konsistente UX in allen drei Editoren.

### Modi und State-Machine (vollständig spezifiziert)

```
mode = loop                        (Default — heutiges Verhalten)
       play-once-disappear
       play-then-freeze
         + onRetrigger = instant-disappear
         + onRetrigger = reverse-then-freeze-first
         + onRetrigger = reverse-then-disappear
       boomerang
```

**States** (intern, pro Animation-Instance):
`idle` → `forward-playing` → `frozen-last` → `reverse-playing` →
`frozen-first` → `disappeared`

#### `loop` (unverändert)
- idle → forward-playing (trigger)
- forward-playing → forward-playing (automatischer Loop am Clip-Ende)
- forward-playing → disappeared (re-trigger = stop)

#### `play-once-disappear`
- idle → forward-playing (trigger)
- forward-playing → disappeared (Clip-Ende)
- forward-playing → disappeared (re-trigger während Forward; siehe D-04)
- Board-Switch / Clear / Reset → disappeared (D-05)

#### `play-then-freeze` + `onRetrigger = instant-disappear`
- idle → forward-playing (trigger)
- forward-playing → frozen-last (Clip-Ende)
- forward-playing → disappeared (re-trigger während Forward)
- frozen-last → disappeared (re-trigger)
- Board-Switch / Clear / Reset → disappeared

#### `play-then-freeze` + `onRetrigger = reverse-then-freeze-first`
- idle → forward-playing (trigger)
- forward-playing → frozen-last (Clip-Ende)
- forward-playing → reverse-playing (re-trigger während Forward; reverse
  startet **ab aktueller Position** — siehe D-04)
- frozen-last → reverse-playing (re-trigger, reverse vom letzten Frame)
- reverse-playing → frozen-first (reverse erreicht Frame 0)
- frozen-first → forward-playing (re-trigger; **Toggle-Pattern**, manuell
  gesteuerter Boomerang; siehe D-06)
- Board-Switch / Clear / Reset → disappeared

#### `play-then-freeze` + `onRetrigger = reverse-then-disappear`
- idle → forward-playing (trigger)
- forward-playing → frozen-last (Clip-Ende)
- forward-playing → reverse-playing (re-trigger während Forward; reverse
  startet ab aktueller Position)
- frozen-last → reverse-playing (re-trigger)
- reverse-playing → disappeared (reverse erreicht Frame 0)
- Board-Switch / Clear / Reset → disappeared

#### `boomerang`
- idle → forward-playing (trigger)
- forward-playing → reverse-playing (Clip-Ende)
- reverse-playing → forward-playing (reverse erreicht Frame 0)
- forward-playing | reverse-playing → disappeared (re-trigger = sofortiger
  Stop; siehe D-07)
- Board-Switch / Clear / Reset → disappeared

### Per-Trigger Override (Dashboard)
- Per-definition Mode setzt den Default.
- Im Dashboard kann der Operator pro Trigger den Mode überschreiben
  (alle 6 Varianten verfügbar).
- Der bestehende "Loop until stopped"-Toggle pro Trigger wird in einen
  Mode-Picker konvertiert (oder erweitert um den gleichen stufenweisen
  Picker wie im Editor; siehe D-09).

### Reverse-Playback-Architektur
- gif-Reverse: trivial via existierendem `runtime-gif-decoder.js`
  (Frame-Buffer + Index, beide Richtungen).
- mp4-Reverse: zweistufig
  - Bevorzugt **in-Code**: WebCodecs `VideoDecoder` decodiert
    forward einmal in einen Frame-Buffer (ImageBitmap-Array oder
    VideoFrame-Pool), Reverse spielt den Buffer rückwärts. Erfordert
    Speichercheck (großer 1080p-mp4 sprengt RAM, kleine Clips
    unproblematisch). Forschung muss die Schwelle finden.
  - Fallback **server-seitig**: ffmpeg `-vf reverse` produziert eine
    `*.reverse.mp4` Datei on-disk, gecached. **Automatisch** beim
    Speichern der reverse-aktivierenden Mode-Option ausgelöst —
    nicht manueller Operator-Schritt. UI zeigt Lade-Indikator bis
    fertig.

### Counter-examples (must not regress)
- Bestehende Animationen ohne explizite Mode-Konfiguration behalten
  Loop-Verhalten (default = `loop`).
- Phase 8 Boomerang-Lehre (`P8-T47-REVERSE-ROOT-CAUSE.md`): KEIN
  Runtime-`video.currentTime`-Seek pro rAF-Tick für mp4-Reverse.
  Decoder-Thrash auf h264 ist eine prinzipielle Grenze von
  HTMLVideoElement-Seek, nicht ein Implementierungsbug.
- Phase 57 v1.1.7 (`project_canvas_clears_each_rAF.md`): bei jedem
  paint-Branch muss SOMETHING gezeichnet werden, sonst Strobo. Reverse-
  Paint-Pfad braucht Fallback-Frame-Logik.
- Phase 12 (`project_animation_layering_composite.md`): Layering-
  Concurrency-Map muss erweitert werden wenn der Reverse-Pfad neue
  Render-Branches einführt.

---

## Decisions

### D-01 — Stufenweise UI: Mode-Dropdown + kontextabhängiges Sub-Dropdown
Erstes Feld im Editor: `Playback mode` mit 4 Optionen (Loop,
Play-once-freeze, Play-once-disappear, Boomerang). Bei
`Play-once-freeze` erscheint zweites Feld `On re-trigger` mit 3
Optionen (Disappear / Reverse to start, freeze / Reverse to start,
disappear). Saubere Hierarchie, keine ungenutzten Felder. Lebt in
der Defaults-Card unter den existierenden Slidern (analog zum heutigen
`Loop`-Toggle für inside-scope).

### D-02 — Schema-Feld: `playbackMode` + `onRetrigger`
Zwei neue Felder pro Animationsdefinition:
- `playbackMode`: enum `"loop" | "play-once-disappear" | "play-then-freeze" | "boomerang"`. Default `"loop"`.
- `onRetrigger`: enum `"instant-disappear" | "reverse-then-freeze-first" | "reverse-then-disappear"`. Default `"instant-disappear"`. Wird nur verwendet wenn `playbackMode === "play-then-freeze"`.

Bestehendes `loopUntilStopped` (boolean) bleibt im Schema readable
für Legacy-Lade-Kompatibilität (no-op, wenn `playbackMode` explizit
gesetzt). Save-Pfad schreibt nur noch `playbackMode` /
`onRetrigger`.

### D-03 — Mp4-Reverse: WebCodecs first, ffmpeg server fallback
Research-Phase MUSS zwei Architektur-Pfade prototypisch validieren:
1. **WebCodecs `VideoDecoder`** + Frame-Buffer (ImageBitmap[]). Messung
   notwendig: bei welcher mp4-Größe (Auflösung × Länge × fps)
   überschreitet der Buffer ein vertretbares Speicher-Budget (z.B.
   200MB)? Snow.mp4 720p × ~5s × 24fps ≈ 132MB raw, knapp aber drin.
   Bei größeren Clips: fallback.
2. **ffmpeg server-side pre-compute**: `ffmpeg -i input.mp4 -vf reverse
   -an output.mp4` automatisch beim Speichern einer reverse-aktivierenden
   Mode-Option ausgelöst. Datei nach `./resources/.reverse-cache/<hash>.mp4`,
   Hash via `mtime + size` der Quelle. Falls Cache-Hit, direkt verwenden.
   Falls fehlend, server berechnet und UI zeigt Lade-Indikator.

Wahl der Pfade ist research-driven. Plan-Phase entscheidet basierend
auf Memory-Messung und Encode-Latenz.

ffmpeg ist auf dem Linux-Server bereits verfügbar
(`/home/linuxbrew/.linuxbrew/bin/ffmpeg` v8.0.1 mit libx264).

### D-04 — Re-Trigger während Forward: sofortige On-Retrigger-Aktion ab aktueller Position
Wenn der Operator während laufender Forward-Phase klickt (Animation
noch nicht am letzten Frame), startet die On-Retrigger-Aktion sofort
ab aktueller Position. Kein Snap zum letzten Frame, kein Beschleunigen.
Reverse-Dauer ist proportional zur aktuellen Forward-Position.

Konsequenz: Reverse muss von beliebigem Frame-Index starten können —
kein "play whole reverse clip" Modell. Sowohl WebCodecs- als auch
ffmpeg-Pfad müssen Frame-Index-Random-Access unterstützen.

Für `play-once-disappear` mit re-trigger während Forward (kein
explizites onRetrigger konfiguriert): semantisch konsistent =
sofortige Disappear (kein Reverse). Modelltechnisch: play-once-disappear
ist ein degenerierter Fall von play-then-freeze mit
onRetrigger=instant-disappear ohne Freeze-Pause.

### D-05 — Board-Switch / Clear-All / System-Reset: sofortige Disappear
Bei jedem dieser Events verschwinden play-once-freeze-Animationen
**ohne** reverse-Playback. Operator-intent ist "alles weg". Die
On-Retrigger-Aktion gilt strikt nur für explizites Re-Klicken auf
den Animation-Trigger. Konsistent mit heutigem Clear-All-Verhalten.

### D-06 — `frozen-first` ist NICHT terminal: nächster Klick = forward wieder
Für `play-then-freeze` + `reverse-then-freeze-first`: nachdem die
Animation am ersten Frame gefroren ist, startet der nächste Klick
wieder eine Forward-Phase. Daraus ergibt sich ein **Toggle-Pattern**
(manuell gesteuerter Boomerang): Klick 1 = forward+freeze-last,
Klick 2 = reverse+freeze-first, Klick 3 = forward+freeze-last, …

Geeignet für Effekte wie "Licht an / Licht aus" mit voller Operator-
Kontrolle pro Richtung.

### D-07 — Boomerang ist endlos + re-trigger stoppt sofort
Boomerang läuft forever bis manuellem Stop. Re-Trigger während
laufender Boomerang-Animation: sofortiges Stop + Disappear (symmetrisch
zu heutigem Loop-Verhalten). Kein Warten auf nächsten Endpunkt, keine
Reverse-Playback-Exit-Animation. Konsequente und vorhersehbare
Operator-UX.

Keine konfigurierbaren Endpunkt-Pausen in dieser Phase (deferred —
falls jemals gewünscht, separate Phase).

### D-08 — Reverse-Speed === Forward-Speed
Reverse spielt mit der gleichen `speed`-Einstellung wie Forward. Keine
separate `reverseSpeed`-Konfiguration. Konsistenter, weniger UI-
Komplexität.

### D-09 — Dashboard-Trigger-UI: gleicher stufenweiser Picker wie Editor
Dashboard ersetzt den heutigen Boolean "Loop until stopped"-Toggle
pro Trigger durch den gleichen stufenweisen Mode-Picker (Mode + ggf.
On-Retrigger). Erste Option im Dropdown: **"Use animation default"**
(default-active) — Operator overridet bewusst durch explizite Auswahl.
Konsistent zwischen Editor und Dashboard.

### D-10 — Out of Scope
- Audio-Playback während Reverse (mp4 audio bleibt forward-only; in
  reverse-Phasen kein Audio).
- N-cycle limit für Boomerang (deferred).
- Endpunkt-Pausen für Boomerang (deferred).
- Per-trigger Speed-Override (existiert heute nicht für non-loop
  Animationen, nicht in dieser Phase einführen).
- Migration des `loopUntilStopped`-Felds aus persistierten Defaults —
  legacy-readable reicht; neue Animationen nutzen `playbackMode`.

---

## Code Context (initial pointers, validate in research)

### Schema + Persistenz
- `src/app/lib/shared/config.js` — Animations-Defaults (Zeilen 62-190 mit
  `assetType` definitionen). Hier kommen `playbackMode` /
  `onRetrigger` Felder.
- `src/app/runtime/state/runtime-fx-normalizers.js` — Normalizer für
  Inside/Outside fx-state (heute liest `loopUntilStopped`). Erweitern
  um `playbackMode` mit Backwards-Compat-Mapping (`loopUntilStopped =
  false` → `playbackMode = "play-once-disappear"`?).
- `config/global-defaults.json`, `config/boards/<id>.json` — persistierte
  Animation-Definitionen. Schema-Version-Bump unklar (Phase 29 schema
  v4; ggf. v5).

### Animation-Editor UI
- `src/app/runtime/ui/animation-editor-edit-pane.js` — Stelle für neue
  Mode/Sub-Felder (Zeilen 410-450 wo heute `loopUntilStopped` toggle
  + outside `mode/direction` controls leben).
- `src/app/runtime/ui/animation-editor-shell.js`,
  `animation-editor-edit-pane-asset-picker.js`,
  `animation-editor-library-list.js`,
  `animation-editor-view.js` — wahrscheinlich nur kleine Anpassungen
  für display der Mode-Info im Library-List.

### Trigger-Dispatch + Lifecycle
- `src/app/runtime/animation/runtime-runtime-controls.js` (Zeilen 213-340
  `upsertGlobalAnimation`) — heute `loopUntilStopped` + Forced-True-
  für-Outside-Logik. Hier landen Mode-Conversions + Default-Override.
- `src/app/runtime/animation/runtime-lifecycle-state.js`,
  `runtime-lifecycle-running-list.js` — Animations-Instances. Neue
  State-Variable für `phase` (forward/reverse/frozen-last/frozen-first).
- `src/app/runtime/animation/runtime-room-dispatch.js` — room scope
  trigger-dispatch.

### Render-Pfad
- `src/app/runtime/render/runtime-draw-loop.js` — Haupt-rAF-Loop.
  Phase 57 v1.1.5/v1.1.7 Patterns (rVFC + Fallback-Canvas) als Vorlage
  für reverse-Pfad.
- `src/app/runtime/render/runtime-outside-mp4.js` — outside mp4
  rendering (Zeilen 74, 394, 556 setzen `video.loop`). Reverse-Pfad
  hier ergänzen oder neuer Modul `runtime-mp4-reverse.js`.
- `src/app/runtime/render/runtime-gif-decoder.js` +
  `runtime-gif-playback.js` — gif Frame-Pump mit ImageDecoder. Reverse-
  Index-Walk hier einfügen.

### Dashboard / Per-Trigger UI
- `src/app/runtime/wire/runtime-wire-overlay-window-binders.js` (Zeile
  676) — heutiger per-trigger `loopUntilStopped` Toggle. Hier kommt
  der neue Mode-Picker.
- `src/app/runtime/wire/runtime-wire-fx-panel-binders.js` (Zeile
  453-455, 469) — heutiger inside loop binder.

### Server (für ffmpeg-Pfad)
- ffmpeg verfügbar: `/home/linuxbrew/.linuxbrew/bin/ffmpeg` (v8.0.1
  mit libx264).
- `src/server/` enthält noch keinen ffmpeg-shellout. Neues Modul:
  `src/server/reverse-encode.mjs` (oder ähnlich) — child_process spawn
  + Cache-Verwaltung in `./resources/.reverse-cache/`.
- WebSocket-Event für Encode-Progress: existierendes Pattern in
  Phase 57 `[mp4-diag]` als Vorlage, oder neuer Server-State-Event.

### Phase 8 Boomerang-Residuen
- `git log --all --oneline --grep="boomerang"` zeigt 13 Commits in
  Phase 8 (e22db7d → caee59e). Komplett entfernt in 8-HF7
  (`ca638ce`, `cc9c0c8`). Keine Code-Residuen mehr erwartet aber
  research soll bestätigen via grep.

---

## Canonical refs

- `.planning/phases/phase-08/P8-T47-REVERSE-ROOT-CAUSE.md` —
  **MUST READ** vor mp4-reverse-Implementierung. Erklärt warum
  `video.currentTime`-Seek-per-rAF auf h264 fundamental nicht
  funktioniert.
- `.planning/phases/phase-08/RISKS.md` § R15, R26, R28, R29, R37 —
  Boomerang-Risiko-Register, alle adressieren in Plan.
- `.planning/phases/phase-08/8-HF5-SUMMARY.md`,
  `.planning/phases/phase-08/8-HF7-VERIFICATION.md`,
  `.planning/phases/phase-08/8-HF8-SUMMARY.md` — Verlauf des
  ursprünglichen Boomerang-Versuchs (build → fix-fail → remove →
  fix-residue).
- Project memory `project_animation_layering_composite.md` — Phase 12
  concurrency-map; Reverse-Branches müssen ggf. extended werden.
- Project memory `project_canvas_clears_each_rAF.md` — bare `return`
  in render branch erzeugt Strobo; reverse paint-Pfad MUSS fallback
  zeichnen.
- Project memory `project_angle_vulkan_for_ssr_video.md` — ANGLE
  Vulkan Backend ist gesetzt; WebCodecs VideoDecoder profitiert
  davon.
- `CHANGELOG.md` § `[1.1.7]` — Phase 57 closure, Baseline.
- WebCodecs API spec: https://www.w3.org/TR/webcodecs/ — VideoDecoder
  interface, ImageBitmap conversion, memory characteristics.
- ffmpeg `-vf reverse` filter docs — Encode-Pfad.

---

## Open Questions for Research

1. **WebCodecs Memory-Budget**: bei welcher mp4-Größe (Auflösung × Länge
   × fps) überschreitet der ImageBitmap-Buffer ein vertretbares
   Speicher-Budget? Konkrete Messung mit existierenden assets
   (`snow.mp4`, `sandstorm.mp4`, andere). Welche Strategie für
   Buffer-Overflow: chunk-and-stream, downscale, oder direkt ffmpeg-
   Fallback?
2. **WebCodecs Codec-Support**: ist VideoDecoder im SSR Chromium-Tab
   für alle relevanten Codecs (h264 baseline/main/high) verfügbar?
   Mit ANGLE Vulkan und unseren Launch-Flags?
3. **Frame-Index-Random-Access**: kann WebCodecs `VideoDecoder` zu
   beliebigem Frame springen (für re-trigger ab aktueller Position),
   oder muss man immer am Anfang dekodieren? Wie teuer ist das?
4. **Reverse-File-Cache-Schema**: Hash-Strategy für Cache-Keys (mtime+
   size? content-hash? path?). Cleanup-Policy (nie? on-clear-asset?).
5. **Encode-Progress UI**: WebSocket-event-pattern oder ein einfacher
   GET-polling endpoint? Wo lebt der Lade-Indikator (Modal? Inline-
   Button-State? Toast?). Was passiert bei Encode-Fehler?
6. **Forward-Seek bei `frozen-last`-State**: HTMLVideoElement.pause() +
   currentTime=duration sollte stabilen Last-Frame produzieren — ist
   das in unserem SSR-Pfad zuverlässig (Phase 57 Erkenntnisse zu
   rVFC + ANGLE Vulkan)?
7. **Lifecycle-State-Persistenz**: was passiert bei einem Server-
   Restart mit einer "frozen-last" Animation auf dem Dashboard? Wird
   sie nach Restart rehydrated, oder verschwindet sie? (Server-
   authoritative state — Phase 13 / Phase 31.)
8. **Re-Trigger-Latenz**: für re-trigger-during-forward muss der
   aktuelle Frame-Index sofort verfügbar sein. Wie wird dieser State
   getrackt?
9. **gif Frame-Count-Limit**: existierender `runtime-gif-decoder.js`
   buffer-Größe-Verhalten für große gifs? (Snow-Animation gif-Variant
   evtl. mehrere hundert Frames.)
10. **Migration `loopUntilStopped` → `playbackMode`**: gibt es
    persistierte Definitionen mit `loopUntilStopped: false`? Wenn ja,
    auf welchen Modus mappen wir die? (`play-once-disappear`?). Oder
    no-op + alle bestehenden bleiben loop?

---

## Next Steps

1. **Research** — gsd-phase-researcher exploriert WebCodecs vs ffmpeg
   Architektur prototypisch (gerne mit Web-Suche für WebCodecs
   Memory-Patterns, ImageBitmap-Pool-Sizing, ffmpeg `-vf reverse`
   Performance-Benchmarks). Output: RESEARCH.md mit konkretem
   Architektur-Vorschlag + Memory-Budget-Threshold + Migration-Plan
   für Schema-Feld.
2. **Plan** — gsd-planner schreibt 1-3 Plans:
   - Plan A: Schema + Editor-UI (stateless, no rendering).
   - Plan B: Lifecycle State-Machine + non-reverse Modi (play-once-
     disappear, play-then-freeze + instant-disappear). Validates the
     state-tracking infrastructure ohne reverse-Komplexität.
   - Plan C: Reverse-Pfad (WebCodecs oder ffmpeg, research-determined)
     + reverse-aktivierende Modi (reverse-then-freeze-first, reverse-
     then-disappear, boomerang). Höchstes Risiko.
3. **Execute** — wave-basiert. Plan C in eigene Welle nach A + B PASS.
4. **Verify** — operator UAT auf Frostpunk-Board (snow.mp4 boomerang)
   + Lockdown-A (nemesis-mp4 play-once-freeze) + alle drei
   Animationsklassen.

---

## Deferred Ideas

- N-cycle limit für Boomerang.
- Endpunkt-Pausen für Boomerang (forward → pause → reverse → pause →
  forward).
- Per-trigger Reverse-Speed override (separate `reverseSpeed`).
- Audio-Sync für reverse mp4.
- "Reverse preview" Button im Editor zum Testen vor Save.
- Mode-Indikator-Icon im Library-List (heute zeigt `loopUntilStopped`
  als Tooltip — könnte zu einem visuellen Badge werden).
