export function runLegacyTimeoutScenario({ attempts = 1, ackAvailableAtAttempt = 2 } = {}) {
  let accepted = false;
  for (let index = 1; index <= attempts; index += 1) {
    if (index >= ackAvailableAtAttempt) {
      accepted = true;
      break;
    }
  }
  return {
    attempts,
    ackAvailableAtAttempt,
    accepted,
    status: accepted ? "PASS" : "FAIL",
  };
}

export function runLegacyFairnessScenario() {
  const queue = {
    control: Array.from({ length: 2 }, (_, i) => `stop-${i + 1}`),
    state: Array.from({ length: 40 }, (_, i) => `trigger-${i + 1}`),
    noisy: Array.from({ length: 20 }, (_, i) => `context-${i + 1}`),
  };
  const applied = [];
  while (queue.control.length || queue.state.length || queue.noisy.length) {
    const next = queue.control.shift() ?? queue.state.shift() ?? queue.noisy.shift();
    applied.push(next);
  }
  const firstNoisyIndex = applied.findIndex((entry) => entry?.startsWith("context-"));
  return {
    firstNoisyIndex,
    firstNoisyWithinFairBudget: firstNoisyIndex >= 0 && firstNoisyIndex <= 8,
    status: firstNoisyIndex >= 0 && firstNoisyIndex <= 8 ? "PASS" : "FAIL",
  };
}

export function runLegacyNoDropScenario({ queueMax = 10, incoming = 30 } = {}) {
  let dropped = 0;
  let queued = 0;
  for (let i = 0; i < incoming; i += 1) {
    if (queued >= queueMax) {
      dropped += 1;
      continue;
    }
    queued += 1;
  }
  return {
    queueMax,
    incoming,
    dropped,
    status: dropped === 0 ? "PASS" : "FAIL",
  };
}
