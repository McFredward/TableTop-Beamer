# Phase 32: SSR Stream Performance + Connection Stability - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 32-ssr-stream-performance-connection-stability
**Areas discussed:** Stream FPS Lift (A), Connection Stability (B)
**Mode:** Single-pass plain-text Q&A — user went AFK after delegating
full autonomous execution.

---

## A1 — Target FPS

| Option | Description | Selected |
|--------|-------------|----------|
| (a) 30 fps consolidate | Hit the preset target ~25 → 30 | |
| (b) 40-50 fps stretch | Visibly smoother drag in align-mode | |
| (c) 60 fps ambitious | Match getDisplayMedia constraint, native-feel drag | |
| (d) Align-mode boost only | Bump to 60 only during drag, else 30 | |

**User's choice:** "Das Ziel ist im SSR mindesten 30 fps zu bekommen,
aber besser noch höher — trotzdem mit hoher Streaming Qualität, man
soll ausreitzen was das Netzwerk schafft, allerdings immer mit
Einstellungsmöglichkeiten in 'System'."

**Synthesis:** Hybrid of (c) + (d) — push hardware/network limit;
operator-configurable cap. No fixed target.

**Notes:** "Außerhalb des Align modes ist es ok das SSR und Stream
von den fps her identisch ist, da es hier keinen Sinn machen würde
mehr fps zu sehen als gerendert werden. Im align mode hingegen werden
die Transformationen auch angezeigt und die sollen so smooth wie
möglich sein." → SSR/stream coupling depends on mode.

**Notes:** "Der Stream läuft jetzt auf potenterer Hardware, es kann
nicht sein, dass es nur 20 bis 25fps schafft — schau was das
verbessert werden kann, guck ruhig in die Tiefe." → Root-cause
investigation mandated, not just settings tweak.

---

## A2 — Quality vs FPS trade-off

| Option | Description | Selected |
|--------|-------------|----------|
| (a) FPS wins | Auto-drop to 720p to keep target FPS | |
| (b) 1080p wins | Auto-drop fps-target to keep 1080p | |
| (c) Operator chooses | Preset/UI decides | ✓ |

**User's choice:** Implicit via "immer mit Einstellungsmöglichkeiten in 'System'."

**Synthesis:** (c) — operator-controllable via System-settings.
Default = (a) FPS-wins because user prioritizes drag smoothness.

---

## B1 — Reconnect-cap

| Option | Description | Selected |
|--------|-------------|----------|
| (a) Forever-retry | Current behavior — endless loop | |
| (b) Bounded retries | N attempts then error-screen + manual button | |
| (c) Adaptive backoff forever | 1s → 2s → 5s → 10s → 30s, but never give up | ✓ |
| (d) Bounded with auto page-reload | Try N, then full page reload | |

**User's choice:** "Der storm an sich soll verhindert werden, finde
die Ursachen, und wenn es wirklich mal ein Problem gibt, soll es so
stabil sein, dass es sich so schnell wie möglich wieder fängt."

**Synthesis:** (c) for the recovery side, but the PRIMARY goal is to
prevent the storm at root. Researcher must find the cold-boot fail-mode
cause. LAN-only justifies forever-retry (no give-up).

---

## B2 — Stuck-state visibility

| Option | Description | Selected |
|--------|-------------|----------|
| (a) Pi-side status overlay | Red bar "RECONNECTING — Xs" on /output/ | ✓ |
| (b) Dashboard alert | Banner "Pi receiver disconnected" | |
| (c) Both | Pi overlay + dashboard alert | |
| (d) Logs only | No UI surface | |

**User's choice:** "B2: a"

---

## B3 — Server-side proactive boot-cleanup

**User's choice:** "B3=ja" (implicit via "Der storm an sich soll
verhindert werden ... finde die Ursachen").

**Synthesis:** Defense-in-depth — clear stale state from previous run.

---

## Claude's Discretion

User explicitly delegated full autonomy:
> "implementiere alles so selbständig wie möglich und teste ausgiebig,
> isoliere und behebe die Probleme"

Discretionary areas:
- Wave/plan structure (researcher → planner output)
- Specific repro-script format for cold-boot reconnect-storm
- Test coverage shape (target ≥ 30 new tests)
- UI styling of "RECONNECTING" overlay (follow existing receiver-status-ui patterns)
- Default values for new System-settings (FPS cap default, boost on/off default)

---

## Deferred Ideas

- Multi-Pi receiver support (single Pi for now)
- WAN/Internet streaming + TURN-server (LAN-only constraint)
- Codec change to AV1/VP9 (Pi 5 generation deferred)
- Dashboard reconnect-alert (explicitly rejected — Pi overlay sufficient)
- Render-fallback if server unreachable (defer; Pi shows error overlay)
