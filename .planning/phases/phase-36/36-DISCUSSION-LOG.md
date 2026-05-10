# Phase 36: Comprehensive Align-Mode-on-Thin-/output/ - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 36-comprehensive-alignmode-thin-output
**Areas discussed:** Refactor-Strategie, Event-handling Architektur, RED-Test Form für T1-T10, Undo / Right-click / Dirty-flag Daten-Pfad

---

## Refactor-Strategie

| Option | Description | Selected |
|--------|-------------|----------|
| Hybrid (Recommended) | Wave 1-3 = Option D-extended mit aggressiver Vorab-ctx-Inventur. Nach Wave-3 closure entscheiden ob Option H als zusätzliche Wave 4 lohnt. Kleinster initialer Diff, ehrlichstes Risiko-Profil. | |
| Option D-extended | Volle ctx-Inventur als Vorbedingung, aber NIE auf Option H aufstocken. Wenn neue ctx-fields auftauchen → sequentielle hotfix-Phasen. Pragmatisch, nicht-architektur-getrieben. | |
| Option H | Direkt zum first-class thin-export pattern. Aufwendigster initialer Diff aber sustainable. Empfehlung wenn align-mode-related work in Phasen 38-40+ erwartet wird. | ✓ |

**User's choice:** Option H — first-class thin-export pattern.
**Notes:** User committed to long-term sustainability over short-term diff size. Consistent with their "ganze Idee dieser Phase ist die Trennung der vollen APP und /output/" philosophy. handle-ui itself becomes a thin-exportable building block; every internal module-global becomes an explicit named arg of bootHandleUi.

---

## Event-handling Architektur

| Option | Description | Selected |
|--------|-------------|----------|
| (a) Overlay none, Handles fangen (Recommended) | #ssr-input-overlay bekommt pointer-events:none wenn align-mode aktiv. Handles fangen Klicks direkt — handle-ui's interne Handler laufen unverändert. Image-pan landet auf #stage darunter. Right-click reicht zum context-menu natürlich. Konsistent mit Option H. | ✓ |
| (b) Handles z-index swap | Handles bekommen explizit z:9999 über overlay. Pointer-events:none Regel für handles entfernt. Image-pan area (zwischen handles) fällt zum overlay durch → zwei separate Pfade nötig. | |
| (c) Bubble über hitTest | Aktueller Phase 34/35-A Ansatz. Overlay fängt alles, hitTestVertex erweitert um alle Handle-Typen. Macht Option H sinnlos — handle-ui's interne Handler liefen nie. | |

**User's choice:** (a) Overlay pointer-events:none when align-mode active.
**Notes:** Single event-routing rule. handle-ui's INTERNAL pointer-handlers run unchanged on /output/ — same code path as dashboard. Phase 35-A's CSS workaround `pointer-events: none !important` for handles is REMOVED in Phase 36.

---

## RED-Test Form für T1-T10

| Option | Description | Selected |
|--------|-------------|----------|
| Pure Live-E2E (Recommended) | Alle 10 Tests via Playwright + system Chrome unter Xvfb. Server-spawn, page.mouse.* gestures, DOM + mutation-log + visual assertions. Setup-Patterns aus Phase 35 W0 (scripts/with_server.py, test/live-e2e/conftest.py). | ✓ |
| Hybrid (Smoke + Mechanik) | T1+T6+T7+T10 via Playwright (sizing + image-pan + context-menu + conflict). T2-T5 via Playwright synthetic mouse. T8+T9 via unit-tests mit DOM-mocks. Beste Balance Coverage/Speed aber doppelter Test-Setup. | |
| Pure Unit + Smoke | T1-T9 via unit-tests mit gemockter DOM + fake liveSync. T10 als ein Live-E2E smoke. Schnellste Iteration aber hohes Risiko echter Bugs zu missen. | |

**User's choice:** Pure Live-E2E.
**Notes:** Phase 35 lesson: jsdom has no layout engine, unit-tests passed while real bugs slipped through. ~10s per test acceptable for BLOCKING-rail. Reuses Phase 35 W0 infrastructure (scripts/with_server.py, conftest.py, _flake_retry.py).

---

## Undo / Right-click / Dirty-flag Daten-Pfad

### Sub-Question: Undo State Location

| Option | Description | Selected |
|--------|-------------|----------|
| Client-lokal auf /output/ (Recommended) | Handle-ui's bestehender lokaler History-Stack läuft auf /output/ via Option H. Jede Geste pusht zum Stack, CTRL+Z poppt. Broadcast nur des Resultats via existierender align-grid-snapshot Mutation. Kein neuer Server-State. | ✓ |
| Server-side Mutation Log | Server tracked grid-snapshot history. Neue undo-mutation type. CTRL+Z fragt 'rewind to N-1'. Macht beide Pages konsistent wenn gleichzeitig offen, aber addet Komplexität + breaking change für dashboard's existing undo. | |

**User's choice:** Client-lokal auf /output/.
**Notes:** No new server mutation type. Each page (dashboard + /output/) has its own undo stack. Grid-snapshot broadcasts keep grids synced.

### Sub-Question: Right-click Context-Menu Rendering

| Option | Description | Selected |
|--------|-------------|----------|
| Voll im /output/ DOM (Recommended) | handle-ui's bestehender context-menu Code läuft via bootHandleUi auf /output/. Menu erscheint natürlich beim right-click. Add-line / remove-line mutations gehen via existing mutation types zum Server. Konsistent Phase 31 + Option H. | ✓ |
| Dashboard-side rendering, /output/ forwarded | /output/ forwarded right-click event zu Dashboard. Dashboard rendert Menu, sendet add/remove mutation zum Server zurück. Operator müsste Dashboard-Tab sichtbar haben. | |

**User's choice:** Voll im /output/ DOM.
**Notes:** Phase 31 architecture explicitly says "Pi /output/ owns the entire align-mode UX". Operator works on /output/ directly without needing dashboard tab.

### Sub-Question: Dirty-flag Tracking

| Option | Description | Selected |
|--------|-------------|----------|
| Lokal + Broadcast (Recommended) | Lokal auf /output/ via handle-ui's existing markDirty Logik (Option H wired). Bei jeder Geste setzen + via existing mutation type zum Server propagieren — Dashboard's dirty-indicator reflectet via live-sync. | ✓ |
| Nur lokal auf /output/ | Dirty-flag bleibt nur auf /output/. Dashboard sieht keinen dirty-Indikator. Einfacher aber inkonsistent wenn beide Pages offen sind. | |

**User's choice:** Lokal + Broadcast.
**Notes:** Piggybacks on `align-grid-snapshot` mutation (already syncs grid state). No new mutation type. Both pages stay consistent if both open.

---

## Claude's Discretion

- Exact API shape of `bootHandleUi({...})` — researcher proposes, planner formalizes.
- Whether handle-ui / handle-drag / polygon-editor are split into smaller files during refactor.
- Exact ctx-trace harness implementation (Proxy wrapper at runtime-orchestration.js:50-122 is one candidate).
- Wave parallelization within M3-M5 (sizing+corner / vertex+midpoint+rotation / pan+context+undo+dirty).
- Dashboard regression coverage form (existing E2E test endpoint mismatch from Phase 35 W0 deferred-items.md — Phase 36 must fix or replace).

## Deferred Ideas

- Pi-hardware visual UAT (carry-forward pattern from Phase 33/34/35).
- handle-ui internal modularization (optional, planner judges if it reduces refactor risk).
- Pixel-diff visual regression suite.
- Phase 37 transformation banding (separate phase).
- Animation-engine refactor.
- Server-side undo log (revisit if cross-tab undo coordination needed).
- Right-click forwarding to dashboard (revisit if keyboard-only workflow needed).
