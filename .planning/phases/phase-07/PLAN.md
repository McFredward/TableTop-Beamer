# Phase 7 Plan (Prepared)

## Zielbild
Phase 7 fokussiert einen umfassenden Umbau der Multi-Device-Synchronisation auf messbar niedrige End-to-End-Latenz und deterministische Sofortreaktion. Aktionen aus Controller-Clients (insbesondere Handy) sollen ohne wahrnehmbare Verzoegerung ueber den Server auf alle verbundenen Clients replizieren und unmittelbar im Render-/Audio-Pfad angewendet werden. Der kritische Pfad fuer `/output/final` wird dabei priorisiert: minimale UI-Overheads, fruehes Apply, stabile Stop-Semantik und robustes Verhalten unter Burst-Input. Ergebnis ist ein first-click-stabiler Betrieb ohne Nachtrigger, ohne haengende visuelle/audio-Reste und ohne Lag-Spitzen bei GIF-Room-Animationen.

## Trigger aus Realtest (verbindlich)
- Handy-Aktionen kommen auf `/output/final` teils verzoegert an.
- Stop/Toggle (`global alarm off` etc.) hinterlaesst kurz sicht-/hoerbare Reste.
- GIF-Room-Animationen triggern teils mit spuerbaren Lags.
- Erwartung ist sofortige, deterministische Reaktion auf allen Clients, besonders auf `/output/final`.

## Verbindliche Architekturentscheidungen
- Server bleibt kanonische Autoritaet fuer Live-Mutationen, Reihenfolge und Commit-Zeitpunkt.
- Jede relevante Live-Mutation traegt `mutationId`, monotone `serverVersion` und `serverTimestamp`.
- Event-Pipeline trennt klar in `ingest -> order -> commit -> fanout -> apply-ack` statt impliziter Snapshot-Overwrites.
- Deterministisches Ordering ist verpflichtend: stale/out-of-order Events werden verworfen, nicht best effort angewendet.
- Dedup ist verpflichtend auf Server und Client (`mutationId`/`appliedVersion`) zur Vermeidung von Doppel-Apply.
- `Stop`/`Toggle-Off` sind high-priority control mutations mit Preemption gegen langsame Renderpfade.
- `/output/final` nutzt einen low-latency apply path ohne nicht notwendige Controller-UI-Arbeit.
- Renderpfad priorisiert final-output fuer sofortige visuelle Wirkung; Audio-Stop wird hard-cut faehig (kein Tail-Leak ohne expliziten Fade).
- GIF-Startpfad ist prewarmed (decode/cache readiness), damit Trigger nicht am Decoder-Start blockieren.
- Backpressure ist explizit: bounded queues, coalescing fuer redundante Updates, kein unendliches backlog growth.
- Ack-Vertrag ist zweistufig: `server-ack` (commit bestaetigt) und optional `client-apply-ack` fuer Telemetrie.
- Coalescing ist nur fuer semantisch sichere Klassen erlaubt (z. B. wiederholte slider-like updates), niemals fuer `start/stop/toggle` Kontrollereignisse.
- Join/Reconnect nutzt versioniertes Snapshot + delta replay; apply darf keine bereits obsolete Zwischenzustaende sichtbar machen.
- Telemetrie ist first-class Bestandteil der Laufzeit (ingest/apply/render/audio markers, per-client latency histograms).
- Regression-Guard ist verpflichtend fuer room/cluster, align-mode, audio-role-routing und persistence.

## Scope
- End-to-end Sync-Latenz entlang `input -> server -> all clients -> render/apply` reduzieren und stabilisieren.
- Deterministisches first-click Apply/Stop ohne zweiten Klick und ohne Restartefakte liefern.
- Event-Pipeline mit ordering, ack, dedup, backpressure und gezieltem batching/coalescing haerten.
- Low-latency Runtime-Pfad fuer `/output/final` umsetzen (render/audio-first, keine vermeidbaren UI-Kosten).
- GIF-Room-Triggerpfad auf geringe Startlatenz optimieren (preload/decode-guard/scheduling).
- Tracing/Telemetrie fuer Latenzpfad implementieren (Mutation-Timeline pro Hop, P50/P95/P99).
- Regression-Suite fuer Sync-Determinismus und Performance einfuehren (single-click, burst, reconnect, soak).

## Out of Scope
- Vollstaendige Neugestaltung der Operator-UI ohne Sync-/Latency-Relevanz.
- Neue Effektarten ohne Bezug zum Sync-Overhaul.
- Cloud-/WAN-Architekturumbau ausserhalb des bestehenden lokalen Multi-Device-Betriebs.

## Priorisierte erste Ausfuehrungswelle (Plan 7-1, execute-ready)
1. Event-Vertrag finalisieren (`mutation envelope`, ordering rules, ack semantics, dedup keys).
2. Serverseitige ordered mutation queue + commit/fanout pipeline mit bounded backpressure umsetzen.
3. Clientseitige apply engine auf version-aware deterministic apply umstellen (stale-drop + idempotent apply).
4. Priority controls (`stop/toggle-off/clear-all`) mit preemptivem apply auf allen Rollen einfuehren.
5. `/output/final` low-latency apply path aktivieren (minimal work before render/audio stop/start).
6. GIF-start latency reduzieren (prewarm/decode scheduling) und trigger jitter glatten.
7. Telemetrie-Hooks E2E integrieren (ingest, commit, fanout, receive, apply, first-frame, audio-start/stop).
8. Regression- und latency-suite fuer 7-1 als Pflichtartefakt liefern.

## Migrationsstrategie (sichere Inkremente)
1. Bestehenden Live-Sync-Vertrag inventarisieren und semantisch in Mutation-Klassen trennen.
2. Serverseitige ordered commit pipeline hinter Feature-Flag einfuehren.
3. Client-Apply auf version/dedup guards heben, zunaechst shadow-observed.
4. Priority controls auf preemptive path migrieren und gegen alte Pfade absichern.
5. `/output/final` runtime path separat optimieren und mit role-guard kapseln.
6. Telemetrie/Tracing aktivieren und Baseline vs. neue Pfade vergleichen.
7. Regression-/soak-matrix durchlaufen und erst danach Flag-default umstellen.

## Milestones
1. M1 Deterministic Mutation Contract: einheitlicher Event-Umschlag mit ordering/ack/dedup.
2. M2 Ordered Server Pipeline: commit/fanout/backpressure ohne drift unter Burst.
3. M3 Deterministic Client Apply: stale-drop, idempotent apply, no second-click effects.
4. M4 Priority Stop/Toggle Path: sofortiges Stoppen ohne visuelle/audio-Reste.
5. M5 Final-Output Fast Path: `/output/final` reagiert zuerst und stabil.
6. M6 GIF Trigger Responsiveness: reduzierte trigger-to-first-frame Latenz fuer room GIFs.
7. M7 Telemetry + SLO Tracking: messbarer Latenzpfad mit P50/P95/P99 pro Hop.
8. M8 Regression Closure: keine Regression fuer room/cluster, align-mode, audio-role-routing, persistence.

## Messziele (Targets)
- E2E input-to-apply (`controller -> final apply`): P50 <= 90 ms, P95 <= 180 ms, P99 <= 280 ms.
- Control-stop-to-silence (`stop/toggle-off -> audio hard-stop`): P95 <= 120 ms.
- Control-stop-to-visual-clear (`stop/toggle-off -> final no-active-visual`): P95 <= 150 ms.
- GIF room trigger-to-first-frame (`trigger -> first decoded frame on final`): P95 <= 220 ms.
- Determinism: 0 tolerierte stale-applications in Regression-Matrix; 0 second-click-required defects.

## Verbindliches Feedback (Phase 7)
- End-to-end Sync-Latenz muss spuerbar sinken (input bis render/apply auf allen Clients).
- Apply/Stop muss deterministisch first-click funktionieren.
- Event-Pipeline braucht ordering, acks, dedup und backpressure; batching/coalescing nur wo sicher.
- `/output/final` ist priorisierter low-latency Zielpfad.
- Telemetrie/Tracing + klare Targets + Regression-Suite sind Pflicht.
- Bestehende Features duerfen nicht regressieren (room/cluster, align-mode, audio-role-routing, persistence).
- Plan 7-1 ist als verbindliche execute-ready erste Welle vor Folgearbeiten auszufuehren.

## Definition of Done
- Mutation envelope mit `mutationId`/`serverVersion`/`serverTimestamp` ist live in allen kritischen Mutationen.
- Ordered commit/fanout pipeline ist aktiv und verhindert out-of-order/stale apply.
- Client apply ist version-aware idempotent; duplicate/stale events erzeugen keine sichtbare Nebenwirkung.
- `stop/toggle-off/clear-all` greifen preemptiv und hinterlassen keine kurz haengenden visual/audio Reste.
- `/output/final` nutzt den priorisierten fast path und zeigt die niedrigste Reaktionslatenz im Verbund.
- GIF-Room-Starts sind subjektiv smooth und objektiv im Targetbereich (P95).
- E2E-Telemetrie liefert pro Mutation eine nachvollziehbare Timeline ueber alle Hops.
- Regression-Suite deckt single-click, burst, reconnect, join, soak und non-regression-Matrix ab.
- Keine Regression in room/cluster, align-mode, audio-role-routing, persistence.
- Phase-7-Artefakte (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE`) sowie `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/CURRENT_PHASE.md` sind konsistent synchronisiert.

## Execution Update 7-1
- Plan 7-1 implementation completed for P7-T1..P7-T15.
- Core outcomes: ordered mutation queue, priority stop preemption, final-output apply fast-path, GIF prewarm, and telemetry hooks (`/api/live/telemetry`).
