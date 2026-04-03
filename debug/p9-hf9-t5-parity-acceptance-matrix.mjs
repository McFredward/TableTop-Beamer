import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_HF9_T5_OUTPUT ?? "debug/p9-hf9-t5-parity-acceptance-matrix-output.json";
const FRAME_TIMEOUT_MS = Math.max(1200, Number(process.env.TT_BEAMER_HF9_T5_FRAME_TIMEOUT_MS ?? 2200));
const HARD_LIMIT_MS = 1200;

async function requestJson(path, init = {}) {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function sendCommand({ mutationType, payload, mutationId }) {
  const startedAt = Date.now();
  const { response, payload: ack } = await requestJson("/api/live/command", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      role: "control",
      clientId: "hf9-t5",
      mutationType,
      mutationId,
      payload,
    }),
  });
  if (response.status !== 202 || ack?.applied !== true) {
    throw new Error(`command ${mutationType} rejected`);
  }
  return {
    ack,
    ackLatencyMs: Date.now() - startedAt,
  };
}

async function openVideoStream() {
  const response = await fetch(`${BASE_URL}/api/final-stream/video`, {
    headers: { accept: "multipart/x-mixed-replace" },
  });
  if (!response.ok || !response.body) {
    throw new Error(`video stream subscribe failed (${response.status})`);
  }
  const contentType = response.headers.get("content-type") || "";
  if (!/multipart\/x-mixed-replace/i.test(contentType)) {
    throw new Error(`unexpected video content-type (${contentType || "unknown"})`);
  }
  return {
    reader: response.body.getReader(),
    decoder: new TextDecoder(),
    buffer: "",
  };
}

async function waitForVideoFrameFromEndpoint(predicate, timeoutMs = FRAME_TIMEOUT_MS, label = "frame") {
  const stream = await openVideoStream();
  try {
    return await waitForVideoFrame(stream, predicate, timeoutMs, label);
  } finally {
    await stream.reader.cancel("hf9-t5-single-close").catch(() => {});
  }
}

function getSourceVersion(svg) {
  const match = /data-source-version="(\d+)"/.exec(svg);
  return Number(match?.[1] ?? 0);
}

function getBoardId(svg) {
  const match = /data-board-id="([^"]*)"/.exec(svg);
  return String(match?.[1] ?? "");
}

function getAlignMode(svg) {
  const match = /data-align-mode="(true|false)"/.exec(svg);
  return match?.[1] === "true";
}

async function waitForVideoFrame(stream, predicate, timeoutMs = FRAME_TIMEOUT_MS, label = "frame") {
  const startedAt = Date.now();
  let maxSeenVersion = 0;
  while (Date.now() - startedAt < timeoutMs) {
    const { done, value } = await stream.reader.read();
    if (done) {
      break;
    }
    stream.buffer += stream.decoder.decode(value, { stream: true });
    const svgMatches = stream.buffer.match(/<svg[\s\S]*?<\/svg>/gi) || [];
    if (svgMatches.length > 6) {
      stream.buffer = svgMatches.slice(-2).join("\n");
    }
    for (const svg of svgMatches) {
      const frame = {
        sourceVersion: getSourceVersion(svg),
        boardId: getBoardId(svg),
        alignMode: getAlignMode(svg),
        svg,
      };
      if (frame.sourceVersion > maxSeenVersion) {
        maxSeenVersion = frame.sourceVersion;
      }
      if (!predicate || predicate(frame)) {
        return {
          frame,
          waitMs: Date.now() - startedAt,
        };
      }
    }
  }
  throw new Error(`${label}: expected video frame update not observed in time (maxSeenVersion=${maxSeenVersion})`);
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const checks = {};

  const { response: healthResponse, payload: healthPayload } = await requestJson("/api/health");
  ensure(healthResponse.status === 200, "health endpoint unavailable");
  checks.videoEndpointAdvertised = healthPayload?.finalStreamVideoEndpoint === "/api/final-stream/video";

  const finalPageResponse = await fetch(`${BASE_URL}/output/final`);
  const finalPageHtml = await finalPageResponse.text();
  checks.finalPageStatus = finalPageResponse.status;
  checks.finalPageHasNoScripts = !/<script\b/i.test(finalPageHtml);
  checks.finalPageHasVideoImg = /<img[^>]+src="\/api\/final-stream\/video"/i.test(finalPageHtml);

  const { payload: h1 } = await requestJson("/api/final-stream/health");
  await new Promise((resolve) => setTimeout(resolve, 120));
  const { payload: h2 } = await requestJson("/api/final-stream/health");
  await new Promise((resolve) => setTimeout(resolve, 900));
  const { payload: h3 } = await requestJson("/api/final-stream/health");

  const frameIdShortBefore = Number(h1?.health?.frameId ?? 0);
  const frameIdShortAfter = Number(h2?.health?.frameId ?? 0);
  const frameIdNormalAfter = Number(h3?.health?.frameId ?? 0);
  checks.shortWindowFrameAdvance = frameIdShortAfter > frameIdShortBefore;
  checks.normalWindowFrameAdvance = frameIdNormalAfter > frameIdShortAfter;
  checks.compositorAlwaysOn = h3?.health?.compositorAlwaysOn === true;
  checks.lifecycleSignalsActive =
    h3?.health?.producer?.running === true
    && h3?.health?.producer?.watchdogActive === true
    && h3?.health?.producer?.timerActive === true;

  async function waitForHealthVersionAtLeast(version, timeoutMs = FRAME_TIMEOUT_MS) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const { payload } = await requestJson("/api/final-stream/health");
      const sourceVersion = Number(payload?.health?.sourceVersion ?? 0);
      if (sourceVersion >= version) {
        return {
          waitMs: Date.now() - startedAt,
          sourceVersion,
        };
      }
      await new Promise((resolve) => setTimeout(resolve, 90));
    }
    throw new Error(`health: sourceVersion did not reach ${version}`);
  }

  const mutationSamples = [];
  const baseline = await waitForVideoFrameFromEndpoint((frame) => frame.sourceVersion >= 0, FRAME_TIMEOUT_MS, "baseline");
  checks.videoStreamProducesFrames = baseline.frame.sourceVersion >= 0;

  const start = await sendCommand({
    mutationType: "trigger-global",
    mutationId: `hf9-t5-start-${Date.now().toString(36)}`,
    payload: {
      action: "start",
      animationType: "outside-space",
      outsideHint: true,
      boardId: "nemesis-board-a",
      animation: {
        id: `hf9-t5-${Date.now().toString(36)}`,
        scope: "global",
        type: "outside-space",
        boardId: "nemesis-board-a",
        assetType: "mp4",
        assetRef: "/resources/nemesis/animations/sandstorm.mp4",
        startedAtEpochMs: Date.now(),
      },
    },
  });
  const startVersion = Number(start.ack?.version ?? 0);
  const startFrame = await waitForVideoFrameFromEndpoint((frame) => frame.sourceVersion >= startVersion, FRAME_TIMEOUT_MS, "start");
  mutationSamples.push({ mutation: "start", ackMs: start.ackLatencyMs, streamMs: startFrame.waitMs, version: startVersion });

  const boardSwitch = await sendCommand({
    mutationType: "context-update",
    mutationId: `hf9-t5-board-${Date.now().toString(36)}`,
    payload: {
      reason: "hf9-t5-board-switch",
      runtime: {
        selectedBoard: "nemesis-board-b",
        boardId: "nemesis-board-b",
        selectedLayout: "nemesis-board-b",
        layoutId: "nemesis-board-b",
      },
      selectedBoard: "nemesis-board-b",
      selectedLayout: "nemesis-board-b",
    },
  });
  const boardVersion = Number(boardSwitch.ack?.version ?? 0);
  const boardFrame = await waitForVideoFrameFromEndpoint((frame) => frame.sourceVersion >= boardVersion && frame.boardId === "nemesis-board-b", FRAME_TIMEOUT_MS, "board-switch");
  mutationSamples.push({ mutation: "board-switch", ackMs: boardSwitch.ackLatencyMs, streamMs: boardFrame.waitMs, version: boardVersion });

  const alignOn = await sendCommand({
    mutationType: "context-update",
    mutationId: `hf9-t5-align-on-${Date.now().toString(36)}`,
    payload: {
      reason: "hf9-t5-align-on",
      alignMode: true,
      runtime: { alignMode: true },
    },
  });
  const alignVersion = Number(alignOn.ack?.version ?? 0);
  const alignVisibility = await waitForHealthVersionAtLeast(alignVersion);
  mutationSamples.push({ mutation: "align-on", ackMs: alignOn.ackLatencyMs, streamMs: alignVisibility.waitMs, version: alignVersion });

  const stop = await sendCommand({
    mutationType: "trigger-global",
    mutationId: `hf9-t5-stop-${Date.now().toString(36)}`,
    payload: {
      action: "stop",
      animationType: "outside-space",
      outsideHint: true,
      boardId: "nemesis-board-b",
    },
  });
  const stopVersion = Number(stop.ack?.version ?? 0);
  const stopFrame = await waitForVideoFrameFromEndpoint((frame) => frame.sourceVersion >= stopVersion, FRAME_TIMEOUT_MS, "stop");
  mutationSamples.push({ mutation: "stop", ackMs: stop.ackLatencyMs, streamMs: stopFrame.waitMs, version: stopVersion });

  const alignOff = await sendCommand({
    mutationType: "context-update",
    mutationId: `hf9-t5-align-off-${Date.now().toString(36)}`,
    payload: {
      reason: "hf9-t5-align-off",
      alignMode: false,
      runtime: { alignMode: false },
    },
  });
  const alignOffVersion = Number(alignOff.ack?.version ?? 0);
  const alignOffVisibility = await waitForHealthVersionAtLeast(alignOffVersion);
  mutationSamples.push({ mutation: "align-off", ackMs: alignOff.ackLatencyMs, streamMs: alignOffVisibility.waitMs, version: alignOffVersion });

  checks.purityNoDiagnosticsOverlay = !/SERVER STREAM ACTIVE|diagnostics|running animations/i.test(boardFrame.frame.svg);

  const { payload: finalHealth } = await requestJson("/api/final-stream/health");
  const latencyGate = finalHealth?.health?.latencyGate ?? {};
  const ackMaxMs = mutationSamples.length > 0 ? Math.max(...mutationSamples.map((entry) => entry.ackMs)) : 0;
  const streamMaxMs = mutationSamples.length > 0 ? Math.max(...mutationSamples.map((entry) => entry.streamMs)) : 0;

  const result = {
    schema: "tt-beamer.p9-hf9-t5-parity-acceptance-matrix.v1",
    measuredAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    checks,
    mutationSamples,
    summary: {
      ackMaxMs,
      streamMaxMs,
      hardLimitMs: HARD_LIMIT_MS,
      latencyGate,
    },
  };

  result.pass =
    checks.videoEndpointAdvertised
    && checks.finalPageStatus === 200
    && checks.finalPageHasNoScripts
    && checks.finalPageHasVideoImg
    && checks.compositorAlwaysOn
    && checks.lifecycleSignalsActive
    && checks.normalWindowFrameAdvance
    && checks.videoStreamProducesFrames
    && checks.purityNoDiagnosticsOverlay
    && ackMaxMs <= 700
    && streamMaxMs <= HARD_LIMIT_MS
    && Boolean(latencyGate.pass);

  await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  if (!result.pass) {
    throw new Error("hf9 parity matrix failed");
  }
}

main().catch((error) => {
  console.error(`[p9-hf9-t5-parity-acceptance-matrix] ${error.message}`);
  process.exitCode = 1;
});
