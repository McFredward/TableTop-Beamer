# Execute Phase 5

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 5-1 (verbindlich, erste execute-ready Welle)
1. P0 zuerst: P5-T1..P5-T3 (Final-Output-Route + FX-only Rendervertrag).
2. P0 danach: P5-T4..P5-T7 (serverautoritiver Shared-State + Broadcast + Join-Snapshot).
3. P0 danach: P5-T8..P5-T10 (Align-Mode global + rollenklare Polygon-Sichtbarkeit).
4. P0 danach: P5-T11..P5-T12 (Audio-Routing strikt nach Output-Rolle).
5. P0 danach: P5-T13..P5-T14 (persistentes strukturiertes Server-Logging).
6. P0 Abschluss: P5-T15 (3-Client-E2E-Regression + Nachweisdoku).

## Priority Execution - Plan 5-HF1 (verbindlich, priorisierter Hotfix)
1. P0 zuerst: P5-T19..P5-T21 (Outside-State Vollsync inkl. Join/Reconnect).
2. P0 danach: P5-T22..P5-T23 (`/output/final` Bootstrap-/Renderpfad stabil + FX-only ohne UI-Leaks).
3. P0 Abschluss: P5-T24 (Hotfix-Regression und artefaktbasierter Nachweis).

## Priority Execution - Plan 5-HF2 (verbindlich, priorisierter Sync-Reliability-Hotfix)
1. P0 zuerst: P5-T25 (Root-Cause auf Event/Mutation/Dedup/Ack fuer First-Click-Sync isolieren und fixieren).
2. P0 danach: P5-T26..P5-T27 (idempotentes serverautoritatives Apply + sofortige Broadcast-Bestaetigung pro Mutation).
3. P0 danach: P5-T28..P5-T29 (Ordering/Versioning + Join/Reconnect/Inflight ohne Drift).
4. P0 Abschluss: P5-T30..P5-T31 (Single-Click-Regression + Burst-Soak + 3-Client-Nachweis).

## Priority Execution - Plan 5-HF3 (verbindlich, priorisierter Context-Parity-Hotfix)
1. P0 zuerst: P5-T32..P5-T34 (Board/Layout als Shared-State inkl. serverautoritivem Sync + Join/Reconnect).
2. P0 danach: P5-T35 (`Output Route` dekommissionieren; `/output/final` bleibt dedizierter Output-Pfad).
3. P0 Abschluss: P5-T36 (HF3-Regression + artefaktbasierter 3-Client-Nachweis).

## Priority Execution - Plan 5-2 (verbindlich, nach P0-Hotfixes)
1. P1 zuerst: P5-T16 (sichtbare Sync-/Connection-Diagnostik in Control-Views).
2. P1 danach: P5-T17 (Burst-/Latenz-Soak unter parallelen Triggern).
3. P1 Abschluss: P5-T18 (formale Real-Setup-Abnahme auf Handy + PC + Raspberry Pi/Beamer).

## Gate-Regeln
- Kein Weitergehen zu P5-T4+, bevor P5-T2 den FX-only-Vertrag nachweisbar einhaelt.
- Kein Weitergehen zu P5-T8+, bevor P5-T7 Join/Reconnect-Snapshot stabil liefert.
- Kein Weitergehen zu P5-T11+, bevor P5-T10 die Align-/Polygon-Sichtbarkeitsregeln pro Rolle nachweist.
- Kein Weitergehen zu P5-T13+, bevor P5-T12 Audio-Leaks in Control-Views ausschliesst.
- Kein Weitergehen zu P5-T19+, bevor P5-T15 den 3-Client-E2E-Nachweis ohne P0-Blocker dokumentiert.
- Kein Weitergehen zu P5-T22+, bevor P5-T21 den Outside-Vollsync inkl. Join/Reconnect nachweist.
- Kein Weitergehen zu P5-T25+, bevor P5-T24 den Hotfix-Nachweis ohne P0-Blocker dokumentiert.
- Kein Weitergehen zu P5-T28+, bevor P5-T27 den Ack-gebundenen serverautoritativ-idempotenten Apply-Pfad nachweist.
- Kein Weitergehen zu P5-T32+, bevor P5-T31 den Sync-Reliability-Hotfix-Nachweis ohne P0-Blocker dokumentiert.
- Kein Weitergehen zu P5-T35+, bevor P5-T34 Board/Layout-Sync inkl. Join/Reconnect versionstreu nachweist.
- Kein Weitergehen zu P5-T16+, bevor P5-T36 den Context-Parity-Hotfix-Nachweis ohne P0-Blocker dokumentiert.
- Kein Phase-5-Exit ohne persistente Log-Nachweise und aktualisierte Planungsartefakte.

## Update Rules
- Taskstatus in `TASKS.md` nach jedem abgeschlossenen Task aktualisieren.
- Relevante Architekturentscheidungen in `.planning/STATE.md` Decision Log erfassen.
- Bei Scope-Anpassungen `PLAN.md`, `BACKLOG.md` und `ACCEPTANCE.md` im selben Schritt synchronisieren.
