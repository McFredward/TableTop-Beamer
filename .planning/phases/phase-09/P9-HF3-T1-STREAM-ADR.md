# P9-HF3-T1 - Server-Composed Final Output ADR

## Decision

- **Decision:** adopt server-composed stream delivery as the primary `/output/final` path for weak clients.
- **Fallback:** keep the existing client-render final mode as a deterministic fallback and explicit operator override target.
- **Contract rule:** sync ordering/version/idempotent apply invariants and align-mode semantics stay unchanged; stream mode is presentation-only.

## Why

Weak devices (Raspberry Pi class) are currently CPU/GPU constrained when decoding and rendering layered FX in-browser. A server-composed stream path shifts composition cost to the server and lowers final-client render work to lightweight stream decode.

## Feasibility Summary

| Dimension | Assessment |
| --- | --- |
| Latency | Viable for display-only output with sub-second glass-to-glass target |
| Visual quality | Acceptable floor with cadence stability prioritized over perfect detail |
| CPU shift | Significant load moved from weak client to server |
| Complexity | Moderate increase (stream endpoint, health/fallback, mode controls) |
| Deployment | Requires Node server endpoint only for this wave (no protocol redesign) |

## Go / No-Go Criteria

### Go

- `/output/final` can consume server stream continuously without blocking control views.
- Stream health detection can auto-fallback deterministically to current client render.
- Manual operator override can force stream/client mode explicitly.
- Align-mode ON/OFF parity holds across stream and fallback.

### No-Go

- Control-view responsiveness regresses under stream load.
- Stream failure leaves final output blank without deterministic fallback.
- Sync contract behavior diverges from current authoritative pipeline.

## Scope Guard

- No mutation protocol redesign.
- No control-view conversion to streamed rendering.
- No per-client non-deterministic semantics.
