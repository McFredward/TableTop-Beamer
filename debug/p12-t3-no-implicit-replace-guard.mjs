import { readFileSync, writeFileSync, readdirSync } from "node:fs";

// Phase 14-2: startRoomAnimationFromDraft now lives in
// runtime-room-dispatch.js. Concatenate every runtime/*.js so the
// brace-balance scan still finds the function body.
const runtimeDir = new URL("../src/app/runtime/", import.meta.url);
const runtimeSource = readdirSync(runtimeDir, { recursive: true, withFileTypes: false })
  .filter((name) => name.endsWith(".js"))
  .sort()
  .map((name) => readFileSync(new URL(name, runtimeDir), "utf8"))
  .join("\n");

// Locate startRoomAnimationFromDraft body via simple brace balance scan.
const startSignature = "function startRoomAnimationFromDraft() {";
const startIdx = runtimeSource.indexOf(startSignature);
if (startIdx < 0) {
  throw new Error("startRoomAnimationFromDraft not found");
}
let depth = 0;
let endIdx = -1;
for (let i = startIdx + startSignature.length - 1; i < runtimeSource.length; i += 1) {
  const ch = runtimeSource[i];
  if (ch === "{") depth += 1;
  else if (ch === "}") {
    depth -= 1;
    if (depth === 0) {
      endIdx = i;
      break;
    }
  }
}
if (endIdx < 0) {
  throw new Error("startRoomAnimationFromDraft body not parseable");
}
const startBody = runtimeSource.slice(startIdx, endIdx + 1);

// Guard 1: Any `stopAnimation(` call inside the body must be guarded by an
// explicit editTargetId branch (i.e. user-initiated edit of an existing
// animation), NOT emitted as a side-effect of a fresh trigger.
const stopAnimationCalls = (startBody.match(/stopAnimation\s*\(/g) || []).length;

// Guard 2: No "upsert" style room-scope logic — the function must not
// search runningAnimations by (type, roomId) and remove an existing match
// before pushing a new one outside the editTargetId branch.
const roomUpsertByTypePattern =
  /state\.runningAnimations\.find\s*\([^)]*type\s*===\s*[^)]*roomId/;
const hasRoomUpsertByType = roomUpsertByTypePattern.test(startBody);

// Guard 3: New non-edit triggers must use state.runningAnimations.push or
// createAnimation (confirming additive insertion). We assert the start path
// contains at least one push/createAnimation outside a cluster reuse block.
const hasCreateAnimationFresh = startBody.includes("createAnimation({");

// Guard 4: No "implicit cancel same-room running animation" stop-emission
// pattern outside an editTargetId branch. We brace-scan the function body
// to enumerate every `if (state.roomDraft.editTargetId)` block and require
// that every `emitLiveMutation("stop-animation", ...)` call index falls
// inside one of those ranges.
const editTargetIdBranches = [];
{
  const pattern = /if\s*\(\s*state\.roomDraft\.editTargetId\s*\)\s*\{/g;
  let m;
  while ((m = pattern.exec(startBody)) !== null) {
    const braceOpen = m.index + m[0].length - 1;
    let d = 0;
    let close = -1;
    for (let i = braceOpen; i < startBody.length; i += 1) {
      const ch = startBody[i];
      if (ch === "{") d += 1;
      else if (ch === "}") {
        d -= 1;
        if (d === 0) {
          close = i;
          break;
        }
      }
    }
    if (close >= 0) {
      editTargetIdBranches.push([m.index, close]);
    }
  }
}

const implicitStopEmitPattern = /emitLiveMutation\(\s*["']stop-animation["']/g;
const stopEmitMatches = [...startBody.matchAll(implicitStopEmitPattern)];
let unsafeStopEmit = false;
for (const match of stopEmitMatches) {
  const insideEditBranch = editTargetIdBranches.some(
    ([start, end]) => match.index >= start && match.index <= end,
  );
  if (!insideEditBranch) {
    unsafeStopEmit = true;
    break;
  }
}

// Guard 5: Room-scope edit overwrite (the legitimate editTargetId branch)
// must be present — it is the ONLY legitimate replacement path, and we
// want to keep it (so operators can still edit a running animation).
const hasLegitimateEditOverwrite =
  startBody.includes("state.roomDraft.editTargetId")
  && startBody.includes('item.scope === "room"');

const output = {
  suite: "P12-T3-no-implicit-replace-guard",
  phase: "GREEN-STATIC",
  expected: "PASS",
  observed: "PASS",
  checks: [
    {
      id: "start-path-no-unguarded-stopAnimation",
      expected: 0,
      actual: stopAnimationCalls,
      pass: stopAnimationCalls === 0,
      note: "startRoomAnimationFromDraft must not call stopAnimation as a side-effect.",
    },
    {
      id: "no-room-upsert-by-type-roomId",
      expected: false,
      actual: hasRoomUpsertByType,
      pass: !hasRoomUpsertByType,
      note: "Start path must not upsert by (type, roomId) — would implicitly replace a running animation.",
    },
    {
      id: "start-path-uses-additive-createAnimation",
      expected: true,
      actual: hasCreateAnimationFresh,
      pass: hasCreateAnimationFresh,
      note: "Fresh triggers go through createAnimation(...) and additive insertion.",
    },
    {
      id: "no-unsafe-stop-animation-emit-outside-edit-branch",
      expected: false,
      actual: unsafeStopEmit,
      pass: !unsafeStopEmit,
      note: "stop-animation emission is only allowed inside the explicit editTargetId cluster-reuse branch.",
    },
    {
      id: "legitimate-edit-overwrite-path-preserved",
      expected: true,
      actual: hasLegitimateEditOverwrite,
      pass: hasLegitimateEditOverwrite,
      note: "Operator-initiated edit-target overwrite must remain available (not in scope of P12-T3).",
    },
  ],
};

const allPass = output.checks.every((c) => c.pass === true);
output.observed = allPass ? "PASS" : "FAIL";

writeFileSync(
  new URL("./p12-t3-no-implicit-replace-guard-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(
  allPass
    ? "PASS - start path contains no implicit replacement for room-scope animations"
    : "FAIL - implicit replacement guard violated, see output JSON",
);
