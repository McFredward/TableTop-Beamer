// Transparent counters distort the glyph below them and add bright
// highlights in areas where the bare artwork is dark.
function gray(frame, x, y) {
  const col = Math.floor(x), row = Math.floor(y);
  if (col < 0 || row < 0 || col + 1 >= frame.width || row + 1 >= frame.height) return NaN;
  const index = row * frame.width + col;
  const u = x - col, v = y - row;
  const a = frame.pixels[index] * (1 - u) + frame.pixels[index + 1] * u;
  const b = frame.pixels[index + frame.width] * (1 - u) + frame.pixels[index + frame.width + 1] * u;
  return a * (1 - v) + b * v;
}

export function prepareTrackBeads(slots, board, reference, frameSize) {
  return slots.map(slot => {
    const x = slot.x / 1600, y = slot.y;
    const center = board.at({ x, y });
    const vx = board.at({ x: x + 0.001, y });
    const vy = board.at({ x, y: y + 0.001 });
    const samples = [];
    let sum = 0, square = 0;
    for (let row = -10; row <= 10; row++) {
      for (let col = -10; col <= 10; col++) {
        if (col * col + row * row > 111) continue;
        const dx = col * 0.96, dy = row * 1.63;
        const value = gray(reference, (x + dx * 0.001) * (reference.width - 1),
          (y + dy * 0.001) * (reference.height - 1));
        samples.push({
          x: center.x + dx * (vx.x - center.x) + dy * (vy.x - center.x),
          y: center.y + dx * (vx.y - center.y) + dy * (vy.y - center.y),
          value, dark: value < 70 && (Math.abs(col) >= 3 || Math.abs(row) >= 5),
        });
        sum += value;
        square += value * value;
      }
    }
    const xs = slot.polygon.map(point => point.x), ys = slot.polygon.map(point => point.y);
    const left = Math.min(...xs), top = Math.min(...ys);
    return {
      ...slot, samples, sum, variance: square * samples.length - sum * sum,
      anchor: [center.x / frameSize.width, center.y / frameSize.height],
      box: [left, top, Math.max(...xs) - left, Math.max(...ys) - top],
    };
  });
}

function intensityFit(frame, slot) {
  const { samples, sum, variance } = slot;
  const n = samples.length;
  const values = new Float32Array(n);
  let best;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      let total = 0, square = 0, product = 0;
      for (const [i, sample] of samples.entries()) {
        const value = gray(frame, sample.x + dx, sample.y + dy);
        values[i] = value;
        total += value;
        square += value * value;
        product += value * sample.value;
      }
      const adjustment = product * n - sum * total;
      const observedVariance = square * n - total * total;
      const correlation = adjustment / Math.sqrt(variance * observedVariance);
      if (!Number.isFinite(correlation) || (best && correlation <= best.correlation)) continue;
      const gain = adjustment / variance;
      const bias = (total - gain * sum) / n;
      // A dim round field can still have a distorted digit with faint highlights.
      const contrast = Math.sqrt(observedVariance) / n;
      const faintThreshold = Math.max(20, Math.min(36, contrast * 0.82));
      let highlights = 0, faintHighlights = 0;
      for (const [i, sample] of samples.entries()) {
        if (!sample.dark) continue;
        const residual = values[i] - (gain * sample.value + bias);
        if (residual > 36) highlights++;
        if (residual > faintThreshold) faintHighlights++;
      }
      best = { correlation, highlights, faintHighlights };
    }
  }
  return best;
}

export function detectTrackBeads(frame, slots) {
  const ranked = new Map();
  const faintRounds = [];
  const destructionReads = [];
  for (const slot of slots) {
    const fit = intensityFit(frame, slot);
    if (slot.track === "self-destruct") destructionReads.push(fit);
    if (!fit || fit.correlation > 0.65) continue;
    // A visibly distorted digit requires fewer independent highlights.
    const requiredHighlights = fit.correlation <= 0.52 && slot.value > 0 ? 12 : 24;
    const score = count => 1 - fit.correlation + Math.min(count / slot.samples.length, 0.2) * 1.6;
    if (fit.highlights >= requiredHighlights) {
      const proposals = ranked.get(slot.track) ?? [];
      proposals.push({ slot, score: score(fit.highlights) });
      ranked.set(slot.track, proposals);
    } else if (slot.track === "round" && fit.faintHighlights >= requiredHighlights) {
      faintRounds.push({ slot, score: score(fit.faintHighlights) });
    }
  }
  if (!ranked.has("round") && faintRounds.length) ranked.set("round", faintRounds);
  const objects = [...ranked.values()].flatMap(proposals => {
    proposals.sort((a, b) => b.score - a.score);
    const [first, next] = proposals;
    if (next && first.score - next.score < 0.09) return [];
    return [{ kind: "track-marker", confidence: 0.8, anchor: first.slot.anchor, box: first.slot.box,
      track: first.slot.track, value: first.slot.value }];
  });
  const emptyDestruction = destructionReads.length > 0 && !ranked.has("self-destruct") &&
    destructionReads.every(fit => fit && fit.correlation >= 0.67 && fit.highlights < 24);
  return { objects, emptyDestruction };
}
