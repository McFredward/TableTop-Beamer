import assert from "node:assert/strict";

function runBudgetFrame({ role, pressureLevel, requestedOps }) {
  const roleBaseBudget = role === "final-output" ? 10 : 5;
  const pressurePenalty = pressureLevel >= 2 ? 3 : pressureLevel === 1 ? 1 : 0;
  const budget = Math.max(2, roleBaseBudget - pressurePenalty);
  let used = 0;
  let applied = 0;
  let deferred = 0;
  for (const op of requestedOps) {
    const overBudget = used + op.cost > budget;
    if (overBudget && op.priority !== "critical") {
      deferred += 1;
      continue;
    }
    applied += 1;
    used += op.cost;
  }
  return {
    budget,
    applied,
    deferred,
    used,
  };
}

const workload = [
  { cost: 2, priority: "normal", label: "room-play" },
  { cost: 1, priority: "normal", label: "room-rate" },
  { cost: 3, priority: "normal", label: "room-seek" },
  { cost: 2, priority: "normal", label: "inside-play" },
  { cost: 3, priority: "critical", label: "outside-seek" },
  { cost: 2, priority: "critical", label: "outside-play" },
  { cost: 1, priority: "normal", label: "inside-rate" },
  { cost: 2, priority: "normal", label: "room2-play" },
];

const finalResult = runBudgetFrame({
  role: "final-output",
  pressureLevel: 2,
  requestedOps: workload,
});

const controlResult = runBudgetFrame({
  role: "control",
  pressureLevel: 2,
  requestedOps: workload,
});

assert.equal(finalResult.budget, 7, "final-output budget mismatch at pressure level 2");
assert.equal(controlResult.budget, 2, "control budget mismatch at pressure level 2");
assert.equal(finalResult.applied > controlResult.applied, true, "final output must apply more video ops than control");
assert.equal(controlResult.deferred > 0, true, "control path should defer non-critical ops under pressure");

console.log(JSON.stringify({
  suite: "p9-hf3-video-scheduler",
  executedAt: new Date().toISOString(),
  pressureLevel: 2,
  finalOutput: finalResult,
  control: controlResult,
  result: "PASS",
}, null, 2));
