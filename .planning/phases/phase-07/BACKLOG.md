# Phase 7 Backlog (Prepared)

## Epics
- Deterministic Event Contract
- Ordered Server Mutation Pipeline
- Deterministic Client Apply Engine
- Priority Stop/Toggle Control Path
- Final-Output Low-Latency Runtime Path
- GIF Trigger Latency Hardening
- End-to-End Telemetry and Tracing
- Sync Regression and Soak Hardening
- Compatibility and Non-Regression Guard

## Story Mapping
- P7-S1.1 Mutation envelope standardisieren (`mutationId`, `serverVersion`, `serverTimestamp`, `kind`, `scope`).
- P7-S1.2 Mutation classes definieren (`control-critical`, `state-sync`, `config-noisy`) inkl. Coalescing-Regeln.
- P7-S1.3 Ack-Vertrag praezisieren (`server-ack`, optional `client-apply-ack`) und Fehlercodes vereinheitlichen.

- P7-S2.1 Ordered ingest queue auf Server einfuehren (single authoritative commit order).
- P7-S2.2 Commit/Fanout als getrennte Stufen mit klaren Sequenzgrenzen umsetzen.
- P7-S2.3 Backpressure-Strategie einfuehren (bounded queues, overflow policy, observability hooks).
- P7-S2.4 Dedup/stale-drop auf Server absichern (idempotente Verarbeitung).

- P7-S3.1 Clientseitige version-aware apply engine implementieren (`appliedVersion`, stale-drop).
- P7-S3.2 Idempotente mutation apply guards je mutation kind absichern.
- P7-S3.3 Reconnect/Join replay mit snapshot+delta deterministisch integrieren.

- P7-S4.1 Priority path fuer `stop`, `toggle-off`, `clear-all` einziehen.
- P7-S4.2 Preemptive render/audio teardown ohne Restartefakte ausfuehren.
- P7-S4.3 Control-vs-noncritical fairness absichern, ohne starvation zu erzeugen.

- P7-S5.1 `/output/final` role path auf low-latency apply trimmen (no unnecessary UI work).
- P7-S5.2 Final-first scheduling bei fanout/apply aktivieren.
- P7-S5.3 Final-output fallback guards gegen white/no-op states bei Lastspitzen absichern.

- P7-S6.1 GIF prewarm/caching fuer haeufige room animations einfuehren.
- P7-S6.2 Decode scheduling und first-frame readiness optimieren.
- P7-S6.3 Trigger jitter unter burst conditions begrenzen.

- P7-S7.1 Telemetriepunkte entlang des kompletten latency path instrumentieren.
- P7-S7.2 P50/P95/P99 Latenzhistogramme pro Hop und pro Rolle auswertbar machen.
- P7-S7.3 Trace correlation ueber `mutationId` fuer root-cause debug bereitstellen.

- P7-S8.1 Regression matrix fuer deterministisches click/apply/stop Verhalten erstellen.
- P7-S8.2 Burst-/Soak-/Reconnect-Tests fuer ordering und backpressure erstellen.
- P7-S8.3 Zielwert-Compliance Reports als Pflichtartefakt dokumentieren.

- P7-S9.1 Non-regression matrix fuer room/cluster, align-mode, audio-role-routing, persistence pflegen.
- P7-S9.2 Rollout-Flag und safe fallback fuer stufenweise Aktivierung bereitstellen.
- P7-S9.3 Artefakt-Sync mit globalen Planungsdateien nach jeder Welle sicherstellen.

## Priorisierte erste Ausfuehrungswelle (P0) - Plan 7-1 execute-ready
- Story P7-S1.1 + P7-S1.2 + P7-S1.3.
  - Ziel: ein deterministischer, messbarer und idempotenter Event-Vertrag als gemeinsame Basis.
- Story P7-S2.1 + P7-S2.2 + P7-S2.3 + P7-S2.4.
  - Ziel: serverautoritiver ordered commit/fanout Pfad ohne burst drift.
- Story P7-S3.1 + P7-S3.2 + P7-S3.3.
  - Ziel: client apply bleibt first-click-deterministisch bei replay/reconnect.
- Story P7-S4.1 + P7-S4.2.
  - Ziel: stop/toggle-off reagieren sofort und raeumen visual/audio ohne Reste.
- Story P7-S5.1 + P7-S5.2.
  - Ziel: `/output/final` wird als low-latency Zielpfad priorisiert.
- Story P7-S6.1 + P7-S6.2.
  - Ziel: GIF room triggers starten spuerbar smoother und lag-aermer.
- Story P7-S7.1 + P7-S7.2 + P7-S7.3.
  - Ziel: Latenzpfad ist objektiv messbar und auf Mutationsebene nachvollziehbar.
- Story P7-S8.1 + P7-S8.2 + P7-S8.3 + P7-S9.1 + P7-S9.3.
  - Ziel: harte Regression- und non-regression Absicherung plus konsistente Artefaktlage.

## Nachgelagerte Wellen (vorlaeufig)
- Plan 7-2 Hardening: adaptive coalescing tuning, fairness tuning, long-run soak stabilization.
- Plan 7-3 Production Gate: stricter SLO compliance window, operator sign-off im Realsetup.

## Execution Update 7-1
- Stories P7-S1..P7-S9 for the initial wave were implemented in code paths `server.mjs` and `src/app.js` with dedicated regression and report artifacts (`P7-T12..P7-T14`).
