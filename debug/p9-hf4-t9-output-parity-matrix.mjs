import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_HF4_T9_OUTPUT ?? "debug/p9-hf4-t9-output-parity-matrix-output.json";

async function requestJson(path, init = {}) {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function sendCommand({ mutationType, payload, mutationId }) {
  const { response, payload: ack } = await requestJson("/api/live/command", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      role: "control",
      clientId: "p9-hf4-t9-output-parity",
      mutationId,
      mutationType,
      payload,
    }),
  });
  if (response.status !== 202) {
    throw new Error(`command ${mutationType} rejected (${response.status})`);
  }
  return ack;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const boardsResponse = await requestJson("/api/boards");
  const boards = Array.isArray(boardsResponse.payload?.boards)
    ? boardsResponse.payload.boards.map((entry) => entry?.boardId).filter(Boolean)
    : [];
  if (boards.length === 0) {
    throw new Error("board catalog is empty");
  }

  const matrix = [];
  for (const boardId of boards) {
    const boardCatalogEntry = boardsResponse.payload?.boards?.find((entry) => entry?.boardId === boardId);
    const boardImageSrc = boardCatalogEntry?.metadata?.imageSrc ?? boardCatalogEntry?.board?.src ?? null;
    const hasBoardImageInCatalog = Boolean(boardImageSrc);

      const boardAck = await sendCommand({
        mutationType: "context-update",
        mutationId: `hf4-t9-board-${boardId}-${Date.now().toString(36)}`,
        payload: {
          reason: "hf4-t9-board-select",
          selectedBoard: boardId,
          runtime: {
            selectedBoard: boardId,
            finalOutputMode: "stream",
          },
        },
      });

      const triggerAck = await sendCommand({
        mutationType: "trigger-global",
        mutationId: `hf4-t9-sandstorm-${boardId}-${Date.now().toString(36)}`,
        payload: {
          action: "start",
          animationType: "outside-space",
          outsideHint: true,
          boardId,
          animation: {
            id: `hf4-t9-outside-${boardId}`,
            scope: "global",
            type: "outside-space",
            boardId,
            assetType: "mp4",
            assetRef: "/resources/nemesis/animations/sandstorm.mp4",
            startedAtEpochMs: Date.now(),
          },
        },
      });

      const expectedVersion = Math.max(Number(boardAck?.version ?? 0), Number(triggerAck?.version ?? 0));
      await sleep(120);
      const state = await requestJson("/api/live/state");
      const snapshot = state.payload?.session?.snapshot ?? {};
      const runtime = snapshot?.runtime ?? {};
      const selectedBoard = snapshot?.selectedBoard ?? runtime?.selectedBoard ?? runtime?.boardId ?? null;
      const runningAnimations = Array.isArray(runtime?.runningAnimations) ? runtime.runningAnimations : [];

      const boardMatch = selectedBoard === boardId;
      const hasOutsideAnimation = runningAnimations.some(
        (entry) => entry?.type === "outside-space" && entry?.boardId === boardId,
      );
      const versionAdvanced = Number(state.payload?.session?.version ?? 0) >= expectedVersion;

      matrix.push({
        boardId,
        selectedBoard,
        versionAdvanced,
        boardMatch,
        hasBoardImage: hasBoardImageInCatalog,
        hasOutsideAnimation,
      });

      await sendCommand({
        mutationType: "trigger-global",
        mutationId: `hf4-t9-stop-${boardId}-${Date.now().toString(36)}`,
        payload: {
          action: "stop",
          animationType: "outside-space",
          outsideHint: true,
          boardId,
        },
      });
  }

  const health = await requestJson("/api/final-stream/health");
  const result = {
    schema: "tt-beamer.p9-hf4-t9-output-parity-matrix.v1",
    measuredAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    boardCount: boards.length,
    matrix,
    streamHealth: health.payload?.health ?? null,
  };
  result.pass = matrix.every((entry) => (
    entry.boardMatch
    && entry.versionAdvanced
    && entry.hasBoardImage
    && entry.hasOutsideAnimation
  ));

  await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  if (!result.pass) {
    throw new Error("output parity matrix failed");
  }
}

main().catch((error) => {
  console.error(`[p9-hf4-t9-output-parity-matrix] ${error.message}`);
  process.exitCode = 1;
});
