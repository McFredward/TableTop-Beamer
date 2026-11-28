const MODEL_GAP_MS = 16_000;
const MODEL_DELAY_MS = 9_000;
const HOLD_CONFIDENCE = 0.60;

function overlaps([x, y, w, h], [u, v, a, b]) {
  const width = Math.max(0, Math.min(x + w, u + a) - Math.max(x, u));
  const height = Math.max(0, Math.min(y + h, v + b) - Math.max(y, v));
  const intersection = width * height;
  return intersection / (w * h + a * b - intersection) >= 0.35;
}

export function createGameDetectionOverlay(now = () => performance.now()) {
  let last;
  let receivedAt;
  let objects = [];

  return function read(model) {
    const time = now();
    if (!model) {
      if (!last || time - receivedAt > MODEL_GAP_MS) return { objects: [], classes: [], delayed: false };
      return { objects, classes: last.classes, delayed: time - receivedAt >= MODEL_DELAY_MS };
    }
    if (model.frameId !== last?.frameId || model.modelId !== last?.modelId) {
      const previous = last && model.modelId === last.modelId && time - receivedAt <= MODEL_GAP_MS ? objects : [];
      const held = previous.filter(item => !item.held && item.confidence >= HOLD_CONFIDENCE &&
        model.classes.includes(item.kind) && !model.objects.some(current =>
          (current.kind === item.kind && overlaps(current.box, item.box)) ||
          (current.reclassifiedFrom?.kind === item.kind && overlaps(current.reclassifiedFrom.box, item.box))));
      objects = model.objects.concat(held.map(item => ({ ...item, held: true })));
      last = model;
      receivedAt = time;
    }
    return { objects, classes: model.classes, delayed: false };
  };
}
