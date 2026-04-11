# ROADMAP

## Direction
Liefere zuerst einen stabilen Vertical Slice fuer OG-Nemesis (Phase 1), erweitere danach auf wiederholbaren Session-Betrieb mit Profilen und Datenzonen (Phase 2), halte den Runtime-Operator-Flow in Phase 4 bewusst preview-frei, fuehre in Phase 5 einen serverautoritativen Multi-Device-Livebetrieb mit dediziertem Final-Beamer-Output ein, generalisiere in Phase 6 auf boardspiel-agnostischen Betrieb mit englischem Operator-Flow, haerte in Phase 7 die Multi-Device-Synchronisation fuer deterministisches Low-Latency-Verhalten auf allen Clients und fokussiere in Phase 8 Multi-Play-Area-Support plus boardseitigen Bildupload-Import sowie ein verpflichtendes Outside-/Inside-Animationspaket inklusive priorisierter P0-Wellen fuer Outside-Regressionen, Final-Output-Fullscreen-Fit, Boomerang-Entfernung mit Inside-Editor-Paritaet, HF8 (Outside-mp4-Restore/conditional-visibility/Apply-only-UX), HF9 (lifecycle-stabiles Outside-mp4 + strict conditional unmounting), HF10 (deterministische mp4-Sichtbarkeit plus nahtloser Loopbetrieb ohne Replay-Break/Black-Frame/Gap), HF11 (definitionsgetriebene Room-Animationen fuer alle Typen + first-start Default-Autoload mit explizitem Reset-Button-Flow) und HF12 (Room-Editor Unified-Speed-Refinement ohne dedizierten GIF-Speed-Slider sowie Opacity-Paritaet inkl. mp4); Phase 9 priorisiert danach erst die umfassende Refaktorierung von `src/app.js` in modulare Domaenengrenzen, dann die verpflichtende Stabilitaets-Hotfix-Welle fuer lifecycle-correct rehydrate/no-replay expired events und low-end load hardening, gefolgt von einem verpflichtenden P0-Hotfixpaket fuer cross-browser Polygon-Mapping, `/output/final` mixed-media lifecycle integrity, weak-hardware `mp4` performance controls und explizites Fehlerfeedback ohne silent no-op, plus einem neuen verpflichtenden P0-Follow-up fuer strict outside-sandstorm lifecycle independence ohne restart durch room/cluster/global starts; Phase 10 fokussiert anschliessend einen speed-first Operator-UX-Track mit Settings-Subtabs, robusten one-handed mobile Rails und expliziten tap-gesteuerten Quick-Modes (`activate`/`deactivate`/`clear`), gefolgt von P0-Hotfixes fuer fail-open final compositor (10-HF1), multi-area schema hydration (10-HF2), shared polygon hydration parity (10-HF3), runtime panel observability/final-blackout-parity (10-HF4), multi-area precedence/fallback override (10-HF5), canonical multi-area retention ueber save/defaults/import (10-HF6), extraction decoupling + startup/reload retention (10-HF7), strict canonical play-area resolution ohne fallback override (10-HF8) sowie command reliability/performance hardening (10-HF9); Phase 11 implementiert danach verpflichtende UX-Korrekturen (outside-apply first-click, global expired event replay guard, dashboard global per-trigger loop toggle), board storage unification (11-HF1), global runtime recovery (11-HF2) und full-duration playback recovery plus per-trigger audio toggle (11-HF3), bevor operator ergonomics refinements folgen.

## Phase 11 - UX Operation Acceleration + Mobile Parity (CLOSED PASS)
Ziel: Schneller Operator-Betrieb auf Desktop + Mobile durch tap-gesteuerte Raumanimationen (Quick-Modes), strukturierte Settings-Gliederung, gesicherte Einhandbedienung sowie deterministische first-apply Sync-Pfade und per-trigger Loop/Audio-Steuerung.

Status: Plan 11-1 (12/12 Tasks), Plan 11-HF1 (12/12 Tasks), Plan 11-HF2 (8/8 Tasks), Plan 11-HF3 (7/7 Tasks), Plan 11-HF4 (7/7 Tasks), Plan 11-HF5 (8/8 Tasks) und Plan 11-HF6 (8/8 Tasks) sind implementiert. Plan 11-2 ist nach HF6 PASS wieder freigegeben.

Milestones:
1. M1 UX Operation Flow: tabellarische Settings + mobile one-handed rails + tap-gesteuerte Quick-Modes.
2. M2 HF1 Recovery Package: outside sync first-click, loop-checkbox in globals, expired-event replay guard, room hold unification, board storage consolidation.
3. M3 HF2 Recovery Package: global animations runtime fix, per-trigger loop choice in dashboard.
4. M4 HF3 Recovery Package: global one-shot full-duration fix (~4s), per-trigger audio choice in dashboard.
5. M5 HF4 Recovery Package: non-loop global final-output suppression root-cause fix with one-shot full-duration exactly-once parity.
6. M6 HF5 Recovery Package: non-loop global initiator-only desync closure via server-authoritative exactly-once multi-client replication.
7. M7 HF6 Recovery Package: polling/hydration-safe seen-once full-duration one-shot playback contract with explicit-cancel-only guard.

Exit Criteria:
- Any client that sees a non-loop trigger revision completes exactly one full-duration local playback.
- Polling snapshots do not prematurely cancel started one-shot playback without explicit stop/clear revision.
- Loop-mode behavior plus global stop/clear semantics remain non-regressed.
- Deterministic multi-client polling seen-once full-playback parity (initiator + peers + `/output/final`) has explicit FAIL->PASS evidence.
- All artifact and regression matrices are PASS.

Execution Update (11-HF4):
- Completed: non-loop global suppression on `/output/final` closed via server-authoritative one-shot epoch rebasing.
- Verification PASS: `.planning/phases/phase-11/11-HF4-VERIFICATION.md` + `debug/p11-hf4-acceptance-regression-output.json`.

Execution Update (11-HF5):
- Completed: initiator-only non-loop desync is closed through server-authoritative fanout payloads and optimistic-path guard removal.
- Verification PASS: `.planning/phases/phase-11/11-HF5-VERIFICATION.md` + `debug/p11-hf5-acceptance-regression-output.json`.

Execution Update (11-HF6):
- Completed: seen non-loop trigger revisions now enforce local full-duration exactly-once playback with revision-key retention.
- Completed: polling snapshots cannot cancel started one-shots without explicit stop/clear revision authority.
- Verification PASS: `.planning/phases/phase-11/11-HF6-VERIFICATION.md` + `debug/p11-hf6-acceptance-regression-output.json`.

Phase 11 Closure:
- Status: CLOSED PASS after Plan 11-HF6. All binding objectives (operator UX acceleration, mobile parity, server-authoritative non-loop one-shot replication, polling/hydration-safe seen-once full-duration contract) are implemented and verified.
- Follow-up telemetry item `P11-T13` deferred to Phase 12 discovery if needed; no outstanding blockers.

## Phase 12 - Concurrent Room Animation Layering (Plan 12-1 CLOSED PASS)
Ziel: Mehrere Raumanimationen (coded, mp4, gif) muessen im selben Raum gleichzeitig und in beliebiger Trigger-Reihenfolge voll sichtbar uebereinandergelegt werden. Aktuell blockiert/verdraengt eine neu gestartete Animation eine bereits laufende Animation desselben Typs/Raums je nach Reihenfolge (z. B. Alarm verschwindet, wenn er nach Malfunction startet).

Status: Plan 12-1 ist CLOSED PASS am 2026-04-11 (`.planning/phases/phase-12/12-1-VERIFICATION.md`, `debug/p12-1-acceptance-regression-output.json`).

Execution Update (12-1):
- Completed: Generic additive layering guard in `src/app/runtime/runtime-orchestration.js` — `roomConcurrencyByKey` map build in `draw()`, `ctx.globalCompositeOperation = "lighter"` switch in room branch + cluster-member branch of `drawAnimation()` when room concurrency >= 2.
- Completed: Type-independent — coded, mp4 and gif room animations inherit the guard via shared `drawRoomComposition` wrapper inside `ctx.save()` / `clipToRoom` scope.
- Completed: Single-animation rooms preserve `source-over` blend; no visual regression for lone effects.
- Completed: RED baseline (alarm->malfunction r=3.996, malfunction->alarm r=87.228) vs. GREEN proof (identisches r=106.7 in beiden Ordnungen + triple permutation invariance coded/mp4/gif).
- Completed: Loop-mode, stop/clear immediate-authority, and Phase 11 HF6 seen-once retention non-regressed with static guards.
- Verification PASS: `.planning/phases/phase-12/12-1-VERIFICATION.md`, `debug/p12-1-acceptance-regression-output.json`.

Milestones:
1. M1 Root-Cause: Warum verdraengt eine reihenfolgeabhaengige Animationsstart die bereits laufende Animation im selben Raum?
2. M2 Unified Layering Contract: Pro Raum koennen mehrere gleichzeitige Animationen beliebigen Typs (coded/mp4/gif) additiv sichtbar koexistieren.
3. M3 Explicit-Stop-Only: Eine laufende Raumanimation wird nur durch explizites `stop`/`clear` oder natuerliches Ende beendet, niemals durch den Start einer weiteren Animation im selben Raum.
4. M4 Non-Regression: Loop-/One-Shot-Lifecycle, Global-Trigger-Pfade und bestehende Stop/Clear-Semantik bleiben unveraendert.
5. M5 Deterministic Evidence: FAIL->PASS Proof fuer Reihenfolgen-Invarianz (A->B == B->A) ueber Control-View und `/output/final`.

Exit Criteria:
- Jede beliebige Kombination aus gleichzeitig laufenden Raumanimationen (coded, mp4, gif) ist auf Control-View und `/output/final` vollstaendig sichtbar uebereinandergelegt.
- Der Start einer zweiten Animation im selben Raum loescht/maskiert keine bestehende laufende Animation desselben Raums.
- Stop/Clear und Ende-des-Loops bleiben die einzigen Wege, eine laufende Animation zu beenden.
- A->B vs. B->A Trigger-Reihenfolge produziert identisches visuelles Endergebnis, wenn beide Animationen gleichzeitig laufen.
- Loop-Mode, Global-Trigger und bestehende Regression-Matrix sind unveraendert PASS.
