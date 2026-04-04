const FAIR_SEQUENCE = ["control", "control", "control", "state", "state", "noisy"];

function clampPositiveInt(value, fallback = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(1, Math.trunc(numeric));
}

export function createFairQueueState() {
  return {
    cursor: 0,
  };
}

export function dequeueFairMutation(queueState, lanes) {
  if (!queueState || !lanes) {
    return null;
  }
  const sequence = FAIR_SEQUENCE;
  for (let offset = 0; offset < sequence.length; offset += 1) {
    const index = (queueState.cursor + offset) % sequence.length;
    const laneKey = sequence[index];
    const lane = lanes[laneKey];
    if (Array.isArray(lane) && lane.length > 0) {
      queueState.cursor = (index + 1) % sequence.length;
      return lane.shift();
    }
  }
  return null;
}

export function computeRetryDelayMs(attempt, {
  baseDelayMs = 120,
  maxDelayMs = 1200,
} = {}) {
  const normalizedAttempt = Math.max(1, clampPositiveInt(attempt, 1));
  const delay = Math.round(baseDelayMs * (2 ** (normalizedAttempt - 1)));
  return Math.max(0, Math.min(maxDelayMs, delay));
}

export function shouldRetryCommand(errorLike, responseStatus, {
  attempt,
  maxAttempts,
} = {}) {
  const normalizedAttempt = clampPositiveInt(attempt, 1);
  const normalizedMax = clampPositiveInt(maxAttempts, 1);
  if (normalizedAttempt >= normalizedMax) {
    return false;
  }
  const status = Number(responseStatus);
  if (Number.isFinite(status) && status >= 500) {
    return true;
  }
  const name = typeof errorLike?.name === "string" ? errorLike.name : "";
  const code = typeof errorLike?.code === "string" ? errorLike.code : "";
  return name === "AbortError" || code === "ECONNRESET" || code === "ETIMEDOUT" || code === "EAI_AGAIN";
}

export function createApplySliceController({
  budgetMs = 8,
  now = () => Date.now(),
} = {}) {
  const normalizedBudget = Math.max(2, Math.min(24, Number(budgetMs) || 8));
  return {
    shouldContinue(sliceStart) {
      return (now() - sliceStart) < normalizedBudget;
    },
    budgetMs: normalizedBudget,
  };
}
