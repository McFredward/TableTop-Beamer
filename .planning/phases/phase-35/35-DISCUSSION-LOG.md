# Phase 35: Thin /output/ Refactor + Align-Mode Decoupling + Banding Fix - Discussion Log

> **Audit trail only.** Decisions are captured in CONTEXT.md.

**Date:** 2026-05-10
**Phase:** 35-thin-output-refactor-align-banding
**Source of truth:** Phase 34 post-UAT operator report + closure addendum

---

## Track A — Wie polygon-editor + projection-handle-ui entkoppeln?

| Option | Description | Selected |
|--------|-------------|----------|
| Pure-extract: explizite bootAlignMode(args) API (Recommended) | Alle implizit injected refs werden explizite Parameter | ✓ |
| Hybrid: thin-mode flag in runtime-orchestration | Kein refactor, flag-based branching | |
| Move-to-output-receiver: align-mode komplett umziehen | Eigenständige module unter output-receiver/ | |

**User's choice:** Pure-extract
**Notes:** Größter diff aber sauberste API. Dashboard re-uses same module via new API → single source of truth.

---

## Track C — Wie Banding angehen?

| Option | Description | Selected |
|--------|-------------|----------|
| Erst Dithering (C1), dann SwiftShader (C2) als Fallback (Recommended) | Sequentiell: low-risk first | ✓ |
| Alle drei parallel testen, beste wählen | Empirical R&D approach | |
| Nur Dithering, andere Pfade explizit aufgeschoben | Reduzierter scope | |

**User's choice:** Sequentiell C1 → C2-fallback
**Notes:** C3 (VAAPI opt-in) bleibt deferred. Visual confirmation gate via gaming-PC smoketest.

---

## Wave-0 Live-E2E-Smoketest — wie streng?

| Option | Description | Selected |
|--------|-------------|----------|
| Headless server + Playwright + system Chrome auf dev-host (Recommended) | Mittelaufwand, viel coverage | ✓ |
| Minimal: nur stream-playback verifizieren | Phase 34 Niveau | |
| Maximum: + Pi-hardware-UAT in Wave-V | Pi UAT als phase-close-gate | |

**User's choice:** Headless server + Playwright + system Chrome
**Notes:** Phase 34's miss kam daher dass automated tests code-shape geprüft haben aber niemand `/output/` mit beiden Tracks live geladen hat. Live E2E ist die fehlende layer.

---

## Wenn Banding-Fix den Stream-FPS reduziert — was tun?

| Option | Description | Selected |
|--------|-------------|----------|
| Banding-Fix prioritär, FPS-drop akzeptieren bis ~25fps (Recommended) | Visual quality > peak FPS | ✓ |
| FPS sacred — keine fix der unter 30fps geht | 30fps minimum | |
| Du entscheidest empirisch nach measurement | Claude judges | |

**User's choice:** Banding-priorität, akzeptiere bis 25fps
**Notes:** Falls C1 dithering FPS unter 25 drückt, escalate auf C2 SwiftShader im selben plan.

---

## Claude's Discretion (per CONTEXT.md)

- Exact dithering algorithm (Bayer 4×4, blue-noise, white-noise)
- Exact API shape for `bootAlignMode({ ... })`
- Whether handle-ui.js etc. are split into smaller files during refactor
- Live-sync minimal subset module file location

## Deferred Ideas (per CONTEXT.md)

- C3 VAAPI opt-in test
- Pi-hardware visual UAT
- GL-renderer SwiftShader-only path
- Animation-engine refactor
- Pixel-diff visual regression suite
