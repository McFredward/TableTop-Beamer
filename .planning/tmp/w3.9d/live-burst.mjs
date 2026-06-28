// Rapid toggle burst: 50 cycles of trigger-room + stop-animation interleaved
// with unrelated higher-sequence state mutations, to exercise the fair-scheduler
// reorder that used to stale-drop the stop. After a final stop, the target must
// be gone (no wedge).
const PORT = 4588;
const ws = new WebSocket(`ws://127.0.0.1:${PORT}/api/live/ws?role=control`);
let seq = 1;
const snapshots = [];
function send(mutationType, payload) {
  ws.send(JSON.stringify({
    type: "live-mutation", mutationType, payload,
    mutationId: `b-${Date.now().toString(36)}-${seq}`,
    clientSequence: seq++, clientTimestamp: new Date().toISOString(),
  }));
}
function ridsFrom(m) {
  const rt = m?.snapshot?.runtime ?? m?.runtime ?? m?.session?.snapshot?.runtime;
  return Array.isArray(rt?.runningAnimations) ? rt.runningAnimations.map((a) => a?.id).filter(Boolean) : null;
}
ws.addEventListener("message", (ev) => {
  let m; try { m = JSON.parse(ev.data.toString()); } catch { return; }
  const ids = ridsFrom(m); if (ids) snapshots.push(ids);
});
const anim = (id) => ({ id, scope: "room", type: "wave", roomId: "r1", boardId: "frostpunk", playbackMode: "loop", durationSec: 0, hold: true, startedAtEpochMs: Date.now() });
ws.addEventListener("open", async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const id = "room-burst";
  for (let i = 0; i < 50; i++) {
    // toggle ON then OFF rapidly, with an unrelated edit (higher seq) between
    send("trigger-room", { animationId: id, animation: anim(id) });
    send("edit-room", { animationId: "other", animation: anim("other") }); // higher seq state mutation
    send("stop-animation", { animationId: id, priorityHint: "high", targetScope: "room", targetType: "wave", roomId: "r1", boardId: "frostpunk" });
    if (i % 7 === 0) await sleep(15); // occasional yield to vary queue timing
  }
  // final explicit stop of both, then settle
  await sleep(600);
  send("stop-animation", { animationId: id, priorityHint: "high", targetScope: "room", targetType: "wave", roomId: "r1", boardId: "frostpunk" });
  send("stop-animation", { animationId: "other", priorityHint: "high", targetScope: "room", targetType: "wave", roomId: "r1", boardId: "frostpunk" });
  await sleep(800);
  const last = snapshots.length ? snapshots[snapshots.length - 1] : null;
  console.log(JSON.stringify({
    frames: snapshots.length,
    finalIds: last,
    burstGone: !(last || []).includes("room-burst"),
    otherGone: !(last || []).includes("other"),
  }, null, 2));
  ws.close(); process.exit(0);
});
ws.addEventListener("error", (e) => { console.error("WS error", e?.message ?? e); process.exit(1); });
setTimeout(() => { console.error("timeout"); process.exit(2); }, 20000);
