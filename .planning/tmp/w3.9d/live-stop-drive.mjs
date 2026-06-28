// Live driver: connect as a control client to the isolated server, trigger a
// room loop animation, then stop it, and report whether the server removed it.
// Also drives a rapid toggle-off/on burst to exercise the reorder path.
const PORT = 4588;
const url = `ws://127.0.0.1:${PORT}/api/live/ws?role=control`;
const ws = new WebSocket(url);

let seq = 1;
const snapshots = [];
function send(mutationType, payload) {
  ws.send(JSON.stringify({
    type: "live-mutation",
    mutationType,
    payload,
    mutationId: `m-${Date.now().toString(36)}-${seq}`,
    clientSequence: seq++,
    clientTimestamp: new Date().toISOString(),
  }));
}

function runningIdsFromFrame(m) {
  const rt = m?.snapshot?.runtime ?? m?.runtime ?? m?.session?.snapshot?.runtime;
  const list = rt?.runningAnimations;
  return Array.isArray(list) ? list.map((a) => a?.id).filter(Boolean) : null;
}

ws.addEventListener("message", (ev) => {
  let m; try { m = JSON.parse(ev.data.toString()); } catch { return; }
  const ids = runningIdsFromFrame(m);
  if (ids) snapshots.push({ type: m.type, ids });
});

const anim = (id) => ({
  id, scope: "room", type: "wave", roomId: "r1", boardId: "frostpunk",
  playbackMode: "loop", durationSec: 0, hold: true, startedAtEpochMs: Date.now(),
});

ws.addEventListener("open", async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // 1) trigger a room loop animation
  send("trigger-room", { animationId: "room-live-1", animation: anim("room-live-1") });
  await sleep(400);
  // 2) stop it (normal) — expect server-stop idMatched=true + removal
  send("stop-animation", { animationId: "room-live-1", priorityHint: "high",
    targetScope: "room", targetType: "wave", roomId: "r1", boardId: "frostpunk" });
  await sleep(400);
  // 3) stop a NON-existent id but with room meta -> exercise fallback match
  send("trigger-room", { animationId: "room-live-2", animation: anim("room-live-2") });
  await sleep(300);
  send("stop-animation", { animationId: "STALE-ID-MISS", priorityHint: "high",
    targetScope: "room", targetType: "wave", roomId: "r1", boardId: "frostpunk" });
  await sleep(500);

  const lastIds = snapshots.length ? snapshots[snapshots.length - 1].ids : null;
  console.log(JSON.stringify({
    frames: snapshots.length,
    sawRoom1: snapshots.some((s) => s.ids.includes("room-live-1")),
    sawRoom2: snapshots.some((s) => s.ids.includes("room-live-2")),
    finalIds: lastIds,
    room1GoneAtEnd: !(lastIds || []).includes("room-live-1"),
    room2GoneAtEnd_viaFallback: !(lastIds || []).includes("room-live-2"),
  }, null, 2));
  ws.close();
  process.exit(0);
});

ws.addEventListener("error", (e) => { console.error("WS error", e?.message ?? e); process.exit(1); });
setTimeout(() => { console.error("timeout"); process.exit(2); }, 8000);
