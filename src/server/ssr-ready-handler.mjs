// src/server/ssr-ready-handler.mjs
//
// Phase 32 Block B (D-B5): producer-readiness gate helper.
// Extracted from server.mjs route handler so it can be unit-tested
// without spinning up an HTTP server.

/**
 * Build the response shape for GET /api/ssr/ready.
 *
 * @param {{ videoProducer: object | null } | null} signalingState
 * @returns {{ status: number, body: { ready: boolean, reason: string } }}
 */
export function buildSsrReadyResponse(signalingState) {
  if (!signalingState) {
    return { status: 503, body: { ready: false, reason: "signaling-not-attached" } };
  }
  const ready = signalingState.videoProducer != null;
  return {
    status: ready ? 200 : 503,
    body: { ready, reason: ready ? "producer-up" : "producer-starting" },
  };
}
