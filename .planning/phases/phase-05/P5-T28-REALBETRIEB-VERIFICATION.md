# P5-T28 Realbetrieb Hotfix Verification (P5-T23..P5-T28)

Datum: 2026-03-25

## Scope

- Resolver-Default bleibt auf UI-Origin-Port (`:4173`) statt Legacy-Portdrift (`:8080`).
- Stale/legacy API-Base-Overrides aus `localStorage` werden nur genutzt, wenn erreichbar; sonst UI-Origin-Fallback.
- Session-Diagnose zeigt konsistent `resolved endpoint + selected via + fallback reason`.
- Runbook/README enthalten klare Start- und Client-URL-Anweisungen fuer Operator/Alignment/Final-Output.

## Nachweise gemaess Acceptance

### 1) Resolver-Default-Test (UI-Origin `:4173`)

- Nachweis per Codepfad + Regression-Script:
  - `resolveSessionApiCandidates()` setzt `session:ui-origin-default` als Standardquelle.
  - Kein Session-Candidate-Loop mehr ueber `resolveGlobalDefaultsApiCandidates()` (kein stiller `:8080` Drift).

### 2) Stale-Override-Negativtest (`localStorage` auf `:8080`)

- Guard-Verhalten:
  - unreachable/invalid `localStorage`-Override wird als Fallback-Ursache dokumentiert.
  - stale `localStorage`-Override wird aktiv aus `localStorage` entfernt.
  - Session-Connect faellt auf UI-Origin (`:4173`) zurueck.

### 3) Diagnose-Konsistenz-Test

- `Session Endpoint` nutzt `resolvedEndpoint || retry.lastEndpoint`.
- `Session Fehler` zeigt denselben Endpoint-Kontext (`Endpoint ...`) statt widerspruechlicher Aussagen.
- `Session Status` fuehrt `selected via` + `fallback reason` konsistent fuer Connect/Reconnect.

## Automated Check Output

Command:

`node debug/p5-t28-session-resolver-regression.mjs`

Output:

```text
SESSION_USES_UI_ORIGIN_DEFAULT=true
SESSION_NO_GLOBAL_PORT_CANDIDATE_DRIFT=true
STALE_LOCALSTORAGE_OVERRIDE_CLEARED=true
DIAG_ENDPOINT_PREFERS_RESOLVED_OR_LAST=true
DIAG_SHOWS_SELECTED_VIA_AND_FALLBACK_REASON=true
```

## Dokumentations-Update (P5-T27)

- `README.md`: LAN-Start (`node server.mjs --host 0.0.0.0 --port 4173`) + klare Rollen-URLs + Resolver-Verhalten.
- `.planning/phases/phase-05/README.md`: kompaktes Feld-Runbook mit URL-Muster und Diagnosezielbild.

## Ergebnis

Acceptance fuer Plan-5-3 Hotfixblock P5-T23..P5-T28 ist fuer den Resolver-/Diagnose-/Runbook-Scope erfuellt.
