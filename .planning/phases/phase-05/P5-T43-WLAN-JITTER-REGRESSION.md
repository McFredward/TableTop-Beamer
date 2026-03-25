# P5-T43 WLAN-Jitter Regression

Datum: 2026-03-25

## Scope

Nachweis fuer den Plan-5-5-Hotfix, dass kurze WLAN-Aussetzer die Session nicht sofort in einen harten Reconnect-/Terminal-Pfad druecken.

Gepruefte Guards:

- dediziertes Session-Timeout groesser als Global-HTTP-Timeout
- Heartbeat-N-Failure-Toleranz (kein Reconnect nach Einzel-Fehler)
- serialisierte Reconnect-Transition ohne stale Timer-Rennen
- Retry-Grace-Window gegen schnellen terminal state
- Retry-Reset erst nach stabilem Heartbeat-Erfolg

## Ausgefuehrter Check

```bash
node debug/p5-t43-session-jitter-regression.mjs
```

Output:

```text
SESSION_TIMEOUT_DECOUPLED=true
SESSION_CONNECT_HEARTBEAT_TIMEOUT_WIRED=true
SESSION_STREAM_TIMEOUT_GUARD=true
HEARTBEAT_N_FAILURE_GUARD=true
RECONNECT_TRANSITION_SERIALIZED=true
RETRY_GRACE_WINDOW_GUARD=true
RETRY_RESET_ON_STABLE_HEARTBEAT=true
JITTER_REGRESSION_GUARD=true
```

## Ergebnis

P5-T43 bestanden: Die Session-Resilience-Guards fuer Kurzjitter sind aktiv und als reproduzierbarer Regression-Check erfasst.
