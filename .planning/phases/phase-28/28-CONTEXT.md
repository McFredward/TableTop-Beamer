# Phase 28: Cross-cutting UX & State Polish - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Sechs voneinander entkoppelte UX/State-Korrekturen nach Phase-27-Closure. Kein
neues Feature-Set — nur Lifecycle-Hygiene, Save-Gate-Parität und sichtbare
UI-Cleanups auf bestehender Infrastruktur. Scope:

- **B1** — Per-Board "last-used" Align-Profil-Memory + Auto-Load on Board-Switch.
- **B2** — Board-Switch save-gate parallel zur Phase-27-B5-Sperre des Align-Toggles.
- **B3** — Asset-Upload/Delete Dirty-Flag-Hygiene (nur dirty wenn aktive Animation
  effektiv anders rendert).
- **B4** — Custom Asset-Delete-Modal anstelle von `window.confirm()`.
- **B5** — Asset-Cache-Invalidierung bei Re-Upload mit identischem Dateinamen.
- **B6** — Diagnostic-Overlay live-sync auf alle Clients + Topbar-Integration
  ohne Logo/Title-Overlap.

**Explizit nicht im Scope:**
- Neue Asset-Typen oder Animationsklassen.
- Erweiterungen der Align-Mode-Editor-Tools (Phase 27 ist final).
- Server-seitige Storage-Schema-Migrationen außerhalb des Minimum für B5
  (Asset-Manifest mit Content-Hash).
- Multi-Beamer / Multi-/output/ Identitäts-Infrastruktur (verschoben aus
  Phase 27 D-04, bleibt deferred).

</domain>

<decisions>
## Implementation Decisions

### B1 — Per-Board "last-used profile" Memory

- **D-01:** **Trigger semantics — on Save AND on Load.** Das `lastUsedProfileName`
  Feld eines Boards wird aktualisiert, sobald der User entweder ein Profil
  explizit speichert (`saveLoadedProfileFlow`, `createNewProfileFlow`) ODER ein
  Profil explizit aus der Profile-Picker-Liste lädt. Discard/Reset/Default-Fall
  ändert das Feld NICHT (sodass beim nächsten Board-Switch das zuletzt aktive
  benannte Profil restauriert wird, nicht der Default).
- **D-02:** **Storage — per-Board JSON server-side.** Neues Feld
  `lastUsedProfileName: string | null` direkt in `config/boards/<id>.json`
  (kein neuer Top-Level-Storage, kein localStorage). Live-gesynced via existing
  `global-config-update` Broadcast (Phase 26 pattern). Konsistenz über alle
  Geräte (Dashboard + /output/) ist garantiert.
- **D-03:** **Auto-load on Board-Switch.** Beim Board-Switch:
  1. Wenn `lastUsedProfileName` existiert UND ein Profil mit diesem Namen für
     das Board existiert → automatisch laden + Snapshot setzen + Dirty=false.
  2. Wenn `lastUsedProfileName === null` ODER das benannte Profil nicht mehr
     existiert → Fall-back auf den Default (`buildNewProfileDefaultGrid()`),
     `_loadedProfileName = null`, kein Profile-Picker-Pop-Up.

### B2 — Board-Switch Save-Gate (Phase-27-B5-Parallel)

- **D-04:** **Inherit from Phase 27 D-04..D-06.** Board-Switch-Aktionen (alle
  Pfade: Dropdown / Cluster-Picker / Hotkeys / Keyboard) werden disabled
  solange `session.snapshot.alignModeDirtyOnOutput === true`. Identische
  Mechanik: Server-authoritativ via existing fanout, 10 s Grace-Timer bei
  /output/-Disconnect, kein neues WebSocket-Channel.
- **D-05:** **Hint copy + Disable-Style identisch zu Phase 27 B5.** Tooltip
  bzw. visible Hint:
  - **Lang (in `title` / `aria-label`):** *"Unsaved align changes on /output/ —
    save or discard there first to switch board."*
  - **Kurz (visible amber chip neben Board-Switch):** *"Unsaved on /output/"*
    (identische Copy zu Phase 27 hint chip; ein gemeinsames CSS-Token-Set, ein
    gemeinsamer JS-Helper `syncAlignModeDirtyDashboardState()` wird erweitert,
    nicht dupliziert).
- **D-06:** **Disable-Coverage:** Alle Eingriffspunkte sind im Dashboard-Source
  zu instrumentieren — minimum: Board-Dropdown, Cluster-Picker-Buttons, jede
  `setActiveBoard()`/`switchBoard()`-Bindung. (Forensik beim
  Phase-Researcher liefert die exakte Liste.)

### B3 — Asset-Upload/Delete Dirty-Flag-Hygiene

- **D-07:** **"Only effective change" Definition.** Dirty-Flag wird NUR
  getriggert, wenn ALLE folgenden gelten:
  1. Das hochgeladene/gelöschte Asset (durch Pfad+Name identifiziert) ist im
     `assetRef` der **aktuell ausgewählten** Animation des Edit-Targets
     referenziert.
  2. Der effektive `assetRef`-resolution-Status hat sich tatsächlich geändert:
     entweder verschwindet das Asset (Delete → Animation bricht) oder die
     content-hash der Bytes ist nach dem Upload anders (Replace → Animation
     rendert anders).
  3. Identischer Re-Upload (gleicher content-hash) zählt nicht als Change und
     fliegt kein Dirty.
- **D-08:** **Pure-Library-Mutation ohne Selection-Match → no-op auf Dirty.**
  Upload eines Assets, das von keiner aktuell ausgewählten Animation
  referenziert wird, fliegt kein Dirty. Delete eines Assets, das nur in
  unbenutzten Library-Einträgen vorkommt, fliegt kein Dirty.

### B4 — Custom Asset-Delete-Modal

- **D-09:** **1:1 Style-Copy des Board-Delete-Modals.** Eigener Modal-Component
  im selben Glassmorphism-Stil:
  - Title-Slot, Body-Slot mit Asset-Name + (optional) Hinweis "Used by N
    animations" wenn Selection-Match.
  - Esc / Click-Outside dismisses (no-op).
  - "Cancel" + "Delete" buttons (destructive Akzent für Delete).
  - Asset-Picker zeigt das Modal anstelle des `window.confirm()`-Aufrufs in
    `animation-editor-edit-pane-asset-picker.js`.
- **D-10:** **Konsistenz-Regel:** Wenn ein zukünftiger Modal-Helper-Component
  bereits existiert (z.B. in `runtime-panels-controller.js` oder als
  bord-deleting Modal-Pattern), reuse it — nicht duplizieren. Phase-Researcher
  identifiziert den exakten Component.

### B5 — Asset-Cache-Invalidierung bei Re-Upload

- **D-11:** **Content-hash query param Strategie.** Server-Seite:
  1. Beim `POST /api/assets/<type>` Upload → server berechnet `sha256(bytes)`,
     speichert `{ name, hash, bytes }` in einem Asset-Manifest (entweder im
     filesystem als `.<hash>.meta` Sidecar oder im RAM-Manifest). Beim
     Schreiben den Hash zurück an Client.
  2. Beim Read der Asset-Liste/Detail liefert Server immer den aktuellen Hash
     pro Asset.
  
  Client-Seite:
  1. Alle Asset-URLs werden als `/path/file.gif?v=<hash>` konstruiert (nicht
     `?v=` weglassen — `v=<hash>` immer aktiv, sodass Hashing den Cache
     ersetzen kann).
  2. Wenn `<hash>` sich nach Re-Upload ändert, sieht der Browser eine andere
     URL → Cache-Bypass automatisch. In-Memory-`Image`/`HTMLVideoElement`-Caches
     werden ebenfalls per neuer URL invalidiert.
  3. Bestehender Asset-Resolver in `runtime-gif-playback` /
     `runtime-effect-visuals` baut den Hash-suffixed URL.
- **D-12:** **Hash-Algorithmus:** `sha256` (Node-builtin `crypto.createHash`,
  kein extra dep). Ausgabe als hex truncated auf 12 Chars für URL-Kompaktheit.
  Truncated hash kollidiert für die hier zu erwartenden Asset-Anzahlen
  praktisch nie.
- **D-13:** **Manifest-Persistierung:** Hash wird im Asset-Manifest gehalten
  (Server-Memory + auf disk in `config/asset-manifest.json` oder pro-Asset
  Sidecar). Phase-Researcher wählt den präzisen Speicherort basierend auf
  bestehendem Asset-Storage-Layout.

### B6 — Diagnostic-Overlay UX

- **D-14:** **Dashboard-Placement: Inline in der Topbar.** Der bisherige
  `.output-status-chip` (fixed top:8px right:8px) wird im Dashboard-Layout
  in den Topbar-Flex-Container hineingelegt — als Pill rechts neben dem
  bestehenden Version-Chip. CSS-Switch via Selektor
  `body:not([data-output-role="final-output"]) .output-status-chip` für die
  Inline-Variante; auf /output/ bleibt der bisherige Fixed-Position-Style.
- **D-15:** **/output/-Rendering: Identische Chip-Optik.** Der `.output-status-chip`
  auf /output/ behält seinen bestehenden visuellen Stil (rechts oben grün-getinted
  Pill, monospace Font). Einzige Änderung: nicht mehr per-client toggled, sondern
  via `global-config-update` live-gesynced.
- **D-16:** **Live-Sync-Transport:** existing `global-config-update`-Broadcast
  (Phase 26 pattern). Server hält `runtimeFlags.diagnosticOverlay: boolean`
  in `global-defaults.json`. Toggle im Dashboard schreibt es auf Server →
  Server broadcastet → alle Clients applizieren via
  `applyGlobalDefaultsPayloadToState`. **Kein neuer Channel, kein neuer
  Endpoint.**
- **D-17:** **Toggle-Quelle:** Bestehender System-Tab-Toggle bleibt der
  einzige Eingriffspunkt. Toggle wird zu einem server-write umfunktioniert
  (statt nur lokales `data-diagnostic-overlay` zu setzen).

### Claude's Discretion

- **D-18:** Genaue Schema-Form von `lastUsedProfileName` im Board-JSON (nullable
  string vs. optional field; Default = absent). Implementer wählt nach
  bestehendem Schema-Konventionen.
- **D-19:** Genaue Asset-Manifest-Form (separate `config/asset-manifest.json`
  vs. inline pro Asset im bestehenden `global-defaults.json` vs. filesystem
  `.meta`-Sidecar). Implementer wählt basierend auf was für die bestehende
  Asset-Storage am wenigsten invasiv ist.
- **D-20:** Exakte Pixel-Größen + Spacing für den inline Diagnostic-Chip in der
  Topbar — visuelle Feinheit, soll konsistent zum Version-Chip wirken.
- **D-21:** Reuse-vs-New beim Custom-Modal (B4): Nutze einen bestehenden
  Modal-Component falls vorhanden; sonst neu mit board-delete-Modal als
  Style-Vorlage.

### Folded Todos

[None — no pending todos in the GSD todo system matched Phase 28 scope.]

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 28 inputs
- `.planning/phases/phase-28/28-BACKLOG.md` — verbatim B1..B6 user-test-feedback.
- `.planning/ROADMAP.md` §`Phase 28 - Cross-cutting UX & State Polish` —
  M1..M4 milestones + exit criteria.

### Phase 27 inheritance (must read before B2)
- `.planning/phases/phase-27/27-CONTEXT.md` §`Multi-device save-gate` —
  D-04..D-06 mechanism Phase 28 B2 inherits 1:1.
- `.planning/phases/phase-27/SUMMARY.md` §`Wave delivery W5` — exact
  implementation of `alignModeDirtyOnOutput` broadcast + 10 s grace timer +
  dashboard `syncAlignModeDirtyDashboardState()`.

### Existing align-mode + profile code (must read before B1)
- `src/app/runtime/viewport/runtime-projection-profile-persistence.js` —
  profile load/save flows, `_loadedProfileName`, `_loadedProfileSnapshot`,
  `notifyDirtyChanged`. B1 must hook into Save+Load to persist
  `lastUsedProfileName`.
- `src/app/runtime/viewport/runtime-projection-grid-state.js` — grid data
  model + `buildNewProfileDefaultGrid()`. B1 default fall-back uses this when
  no last-used profile is remembered.

### Board-switch flow (must read before B1 + B2)
- `src/app/runtime/state/runtime-board-profiles.js` — per-board JSON
  serialization + `getBoardProfile()` / `applyBoardConfig()`. B1 adds
  `lastUsedProfileName` field here.
- `src/app/runtime/core/runtime-board-switch.js` — board-switch entry point.
  B2 disable-gate hooks here.
- `src/app/runtime/wire/runtime-wire-navigation-binders.js` — board-switch
  UI bindings (dropdown/picker). B2 disable-target.
- `src/app/runtime/runtime-orchestration-ctx-builder.js` — `setActiveBoard`
  invocation point.

### Live-sync infrastructure (must read for B2 + B5 + B6)
- `src/app/runtime/live-sync/runtime-global-defaults.js` —
  `applyGlobalDefaultsPayloadToState` + ctx wiring. B6 toggle hooks here.
- `src/app/runtime/live-sync/runtime-live-sync-core.js` — snapshot fanout
  + `live-hello` seed. B2 inherits B5's `alignModeDirtyOnOutput` payload.
- `server.mjs` — `liveSessionState.snapshot`, `POST /api/global-defaults`,
  `POST /api/align-mode-dirty`. B6 toggle becomes server-write; B5 needs
  asset-upload-with-hash endpoint extension.

### Animation editor + asset library (must read for B3 + B4 + B5)
- `src/app/runtime/animation/runtime-lifecycle-live-editor.js` — animation
  editor bootstrapping + dirty propagation.
- `src/app/runtime/ui/animation-editor-shell.js` — editor shell + dirty UX.
- `src/app/runtime/ui/animation-editor-edit-pane-asset-picker.js` — asset
  picker + currently-uses `window.confirm()` for delete (B4 replacement).
- `src/app/runtime/render/runtime-gif-playback.js` — GIF playback. B5
  root-cause investigation: in-memory `Image` cache layer, `decode()` calls.
- `src/app/runtime/render/runtime-effect-visuals.js` — effect rendering.
  B5 must invalidate `<video>` srcs on hash change.

### Diagnostic overlay (must read for B6)
- `src/styles.css` §`.output-status-chip` — current chip CSS (top:8px
  right:8px fixed). B6 adds dashboard-inline variant.
- `index.html` — topbar layout (B6 inline-chip insertion target).
- `src/app/runtime/runtime-orchestration.js` — diagnostic-overlay flag
  application.
- `src/app/lib/state/runtime-state.js` — `runtimeFlags.diagnosticOverlay`
  state slot.

### Phase 26 closure context (foundation for B6)
- `.planning/phases/phase-26/SUMMARY.md` — render-mode + diagnostic-overlay
  infra Phase 28 B6 builds on.

### Server endpoints (must read for B5)
- `server.mjs` §`POST /api/upload` (or equivalent) — asset upload endpoint.
  B5 extends this to compute + return content hash.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`global-config-update` WebSocket broadcast** — Phase 13/26 pattern
  carried into B6 (overlay live-sync). No new channel.
- **`syncAlignModeDirtyDashboardState()` JS helper** (Phase 27 W5) — extend
  to also gate board-switch elements (B2). Single helper covers both.
- **Phase 27 hint chip CSS (`#align-mode-dirty-hint`)** — reuse styling tokens
  for B2 board-switch hint chip.
- **Existing dirty-flag system** (`notifyDirtyChanged`,
  `_loadedProfileSnapshot` deep-equal) — B1 hooks into this when loading
  remembered profile (snapshot must match loaded state so `isDirty()` returns
  false on auto-load).
- **`crypto.createHash('sha256')`** — Node-builtin, no new dependency for B5.

### Established Patterns
- **Server-authoritative state via `global-defaults.json` + WebSocket
  broadcast** — Phase 13/26 pattern. B5 asset-manifest extension follows the
  same pattern (server holds the truth, broadcasts on change).
- **Phase 27 D-04..D-06 multi-device save-gate** — `alignModeDirtyOnOutput`
  flag + 10 s grace timer + `applyGlobalDefaultsPayloadToState`-driven
  dashboard sync. B2 reuses identically without new infrastructure.
- **`replace_all: false` line-by-line edits** — match existing convention.

### Integration Points
- **Topbar layout** lives in `index.html`. B6 inline-chip is a Flex-container
  insertion right after the existing version-chip element.
- **Asset-Picker context-menu** lives in
  `animation-editor-edit-pane-asset-picker.js`. B4 modal replaces the
  `window.confirm()` call here.
- **Per-board JSON read+write** lives in `runtime-board-profiles.js`. B1
  field addition is local to this module.
- **Board-switch entry** lives in `runtime-board-switch.js`. B2 disable
  gate hooks here, mirroring how Phase 27 W5 hooked the align-toggle.

### Risks / Watch-outs
- **B5 cache invalidation must reach /output/.** /output/ is a separate
  browser context — confirm the live-sync broadcast triggers asset
  re-resolution (not just dashboard).
- **B5 hash truncation collision risk.** sha256[:12] = 48 bits. For typical
  game-asset volumes (<1000 assets) collision probability is ≪10⁻⁹ — safe,
  but document the limit.
- **B1 field absence in legacy boards.** Existing boards lack
  `lastUsedProfileName` — D-08 D-08 schema validation must accept absent /
  null without erroring; default = null.
- **B6 inline-chip in dashboard topbar may conflict with existing Phase
  27 hint chips** (#align-mode-dirty-hint at `top: 116px`). Phase-Researcher
  must verify no z-index / layout collision.

</code_context>

<specifics>
## Specific Ideas

- **Auto-load is silent.** B1 D-03 explicitly does NOT prompt the user when
  switching boards — it just loads the remembered profile. The user expects
  this to feel like "the board remembers where it was set up".
- **Default fall-back stays visually identical to Phase 27 default.** When
  `lastUsedProfileName === null`, B1 D-03 calls the same
  `buildNewProfileDefaultGrid()` Phase 27 W1 produced (80% rectangle + 1H + 1V
  midline). User must not see a different "no-profile" appearance.
- **B3 dirty hygiene is about fairness, not safety.** Dirty exists to gate
  multi-device save-gate; firing it on every asset upload makes the gate
  spammy. Real meaning of "dirty" is "user has unsaved deltas to align-mode
  geometry OR animation defs". Pure asset-library mutations that don't change
  what the user sees should never fire it.
- **B5 root cause is unconfirmed.** The user observed stale playback after
  re-upload, but the exact layer (HTTP cache, in-memory Image/Video, decoder)
  is open. Researcher must confirm via repro before D-11..D-13 strategy is
  cemented. If root cause is purely browser HTTP cache (Cache-Control
  missing), the simpler fix is server-side `Cache-Control: no-cache` on asset
  responses + a query-param-only client change. D-11 hash strategy remains
  preferred for in-memory Image-cache invalidation regardless.
- **B6 "ganz oben integriert"** (User-Wortlaut) bedeutet im Dashboard-
  Topbar selbst, nicht direkt darunter. D-14 ist verbindlich.

</specifics>

<deferred>
## Deferred Ideas

- **Asset-Versions-History.** Mehrere Versionen desselben Asset-Namens
  parallel halten (für Undo). Aktuell nicht — B5 ersetzt einfach.
- **Multi-/output/ Identität / Friendly-Names.** Aus Phase 27 deferred,
  bleibt deferred. B2 inheritet die Single-/output/-Annahme.
- **Diagnostic-Overlay-Erweiterungen** (FPS, Render-Mode, Zone-ID inline).
  Auf /output/ bleibt der Chip identisch zum Status quo. Erweiterung
  später möglich, nicht in B6.
- **Asset-Library-Suche / -Filterung.** Asset-Picker bleibt funktional
  unverändert außer für B4 Modal-Ersatz.

### Reviewed Todos (not folded)
[None — no todos were surfaced for review.]

</deferred>

---

*Phase: 28-cross-cutting-ux-state-polish*
*Context gathered: 2026-05-04*
