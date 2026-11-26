// Match printed detail in a front-on view. The initial homography handles
// viewpoint, while the local offsets retain lens distortion and board seams.
function edgeFeatures(cv, input) {
  const smooth = new cv.Mat();
  const dx = new cv.Mat();
  const dy = new cv.Mat();
  const edge = new cv.Mat();
  const background = new cv.Mat();
  try {
    cv.GaussianBlur(input, smooth, new cv.Size(0, 0), 1.4);
    cv.Sobel(smooth, dx, cv.CV_32F, 1, 0, 3);
    cv.Sobel(smooth, dy, cv.CV_32F, 0, 1, 3);
    cv.magnitude(dx, dy, edge);
    cv.GaussianBlur(edge, background, new cv.Size(0, 0), 8);
    const values = edge.data32F;
    const local = background.data32F;
    for (let i = 0; i < values.length; i++) values[i] /= local[i] + 5;
    return edge;
  } finally {
    for (const mat of [smooth, dx, dy, background]) mat.delete();
  }
}

function subpixel(left, center, right) {
  const curvature = left - 2 * center + right;
  return curvature < -1e-6 ? Math.max(-0.5, Math.min(0.5, (left - right) / (2 * curvature))) : 0;
}

function matchPatch(cv, reference, rectified, center, radius, search, margin, response) {
  const { x, y } = center;
  const size = radius * 2 + 1;
  const patch = reference.roi(new cv.Rect(x - radius, y - radius, size, size));
  const area = rectified.roi(new cv.Rect(x + margin - radius - search, y + margin - radius - search,
    size + search * 2, size + search * 2));
  try {
    cv.matchTemplate(area, patch, response, cv.TM_CCOEFF_NORMED);
    const { maxVal: score, maxLoc: peak } = cv.minMaxLoc(response);
    const last = search * 2;
    if (score < 0.34 || Math.min(peak.x, peak.y) === 0 || Math.max(peak.x, peak.y) === last) return null;
    const values = response.data32F;
    const stride = response.cols;
    const index = peak.y * stride + peak.x;
    let competitor = -1;
    for (let row = 0; row <= last; row++) {
      for (let col = 0; col <= last; col++) {
        if (Math.max(Math.abs(peak.x - col), Math.abs(peak.y - row)) <= 5) continue;
        competitor = Math.max(competitor, values[row * stride + col]);
      }
    }
    if (score - competitor < 0.055) return null;
    return {
      ...center,
      dx: peak.x - search + subpixel(values[index - 1], score, values[index + 1]),
      dy: peak.y - search + subpixel(values[index - stride], score, values[index + stride]),
      weight: score * (score - competitor),
    };
  } finally {
    patch.delete();
    area.delete();
  }
}

function patchOffsets(cv, reference, rectified, radius, search, margin, searchNearEdge) {
  const step = Math.round(radius * 1.1);
  const response = new cv.Mat();
  const samples = [];
  try {
    for (let y = radius + 1; y < reference.rows - radius; y += step) {
      for (let x = radius + 1; x < reference.cols - radius; x += step) {
        const center = { x, y };
        const sample = matchPatch(cv, reference, rectified, center, radius, searchNearEdge(center), margin, response);
        if (sample) samples.push(sample);
      }
    }
  } finally {
    response.delete();
  }
  return samples.filter(sample => {
    let agree = 0;
    let disagree = 0;
    for (const other of samples) {
      if (other === sample || Math.hypot(sample.x - other.x, sample.y - other.y) > 2.6 * step) continue;
      if (Math.hypot(sample.dx - other.dx, sample.dy - other.dy) < search * 0.24) agree++;
      else disagree++;
    }
    return agree >= 2 && agree > disagree;
  });
}

function textureOffset(samples, { x, y }, radius) {
  let weight = 0;
  let dx = 0;
  let dy = 0;
  let nearest = Infinity;
  for (const sample of samples) {
    const distance = Math.hypot(x - sample.x, y - sample.y) / radius;
    if (distance > 3) continue;
    const w = Math.exp(-(distance ** 2) / 2) * sample.weight;
    dx += w * sample.dx;
    dy += w * sample.dy;
    weight += w;
    nearest = Math.min(nearest, distance);
  }
  const confidence = Math.max(0, Math.min(1, 2.5 - nearest));
  return { x: x + dx / Math.max(weight, 0.00001) * confidence,
    y: y + dy / Math.max(weight, 0.00001) * confidence };
}

// Look for a consistent brightness step along each side in the black
// projection frame. Reject isolated features and fit a gently curving edge.
function findEdge(read, span, search) {
  const observations = [];
  for (let index = 1; index < 20; index++) {
    const t = index / 20;
    const at = Math.round(t * span);
    function contrast(offset) {
      let inside = 0;
      let outside = 0;
      for (let across = 2; across <= 7; across++) {
        for (let along = -5; along <= 5; along += 2) {
          inside += read(at + along, offset + across);
          outside += read(at + along, offset - across);
        }
      }
      return (outside - inside) / 36;
    }
    let peak = { value: 0, offset: 0 };
    for (let offset = -search; offset <= search; offset++) {
      const value = contrast(offset);
      if (Math.abs(value) > Math.abs(peak.value)) peak = { value, offset };
    }
    if (Math.abs(peak.value) < 13 || Math.abs(peak.offset) >= search - 2) continue;
    const sign = Math.sign(peak.value);
    observations.push({ t, sign, offset: peak.offset + subpixel(
      contrast(peak.offset - 1) * sign, peak.value * sign, contrast(peak.offset + 1) * sign,
    ) });
  }
  const sign = Math.sign(observations.reduce((sum, point) => sum + point.sign, 0));
  const agreed = observations.filter(point => point.sign === sign);
  // Remove isolated peaks before using nearby samples to interpolate an edge.
  const edge = agreed.filter(point => agreed.some(other => other !== point &&
    Math.abs(other.t - point.t) < 0.12 && Math.abs(other.offset - point.offset) < 6));
  if (edge.length < 12 || edge[0].t > 0.20 || edge.at(-1).t < 0.80) return null;
  return t => {
    let sum = 0;
    let value = 0;
    let position = 0;
    let variance = 0;
    let covariance = 0;
    for (const point of edge) {
      const offset = point.t - t;
      const weight = Math.exp(-((offset / 0.12) ** 2));
      sum += weight;
      value += weight * point.offset;
      position += weight * offset;
      variance += weight * offset ** 2;
      covariance += weight * offset * point.offset;
    }
    return (variance * value - position * covariance) / (sum * variance - position ** 2);
  };
}

export function refinePrintedBoard(cv, reference, camera, inverse, contacts = {}) {
  const width = reference.cols - 1;
  const height = reference.rows - 1;
  const shorter = Math.min(width, height);
  const radius = Math.max(14, Math.round(shorter * 0.028));
  const search = Math.max(16, Math.round(shorter * 0.035));
  const edgeSearch = Math.max(search, Math.round(shorter * 0.065));
  const margin = edgeSearch + 10;
  const transform = cv.matFromArray(3, 3, cv.CV_64F, [
    ...inverse.slice(0, 3).map((value, i) => value + margin * inverse[i + 6]),
    ...inverse.slice(3, 6).map((value, i) => value + margin * inverse[i + 6]),
    ...inverse.slice(6),
  ]);
  const rectified = new cv.Mat();
  let referenceFeatures;
  let cameraFeatures;
  try {
    cv.warpPerspective(camera, rectified, transform, new cv.Size(width + 1 + margin * 2, height + 1 + margin * 2));
    referenceFeatures = edgeFeatures(cv, reference);
    cameraFeatures = edgeFeatures(cv, rectified);
    const pixels = rectified.data;
    const read = (x, y) => pixels[(y + margin) * rectified.cols + x + margin];
    // Prefer the side near the artwork fit. A cropped reference image or
    // strong perspective can put the physical edge beyond that first search.
    const side = (readSide, span) => findEdge(readSide, span, search) ?? findEdge(readSide, span, edgeSearch);
    const left = side((along, inward) => read(inward, along), height);
    const right = side((along, inward) => read(width - inward, along), height);
    const top = side((along, inward) => read(along, inward), width);
    const bottom = side((along, inward) => read(along, height - inward), width);
    const detailBand = shorter * 0.16;
    function searchNearEdge({ x, y }) {
      const candidates = [
        x < detailBand && left?.(y / height),
        width - x < detailBand && right?.(y / height),
        y < detailBand && top?.(x / width),
        height - y < detailBand && bottom?.(x / width),
      ];
      return candidates.some(offset => Math.abs(offset) > search * 0.85) ? edgeSearch : search;
    }
    const samples = patchOffsets(cv, referenceFeatures, cameraFeatures, radius, search, margin, searchNearEdge);
    const edgeFade = shorter * 0.048;
    // Projector focus and video filtering spread bright pixels at the last
    // row of the picture. Effects authored to touch the edge use a smaller
    // inset just at the contact, leaving the rest of the edge protected.
    const edgeInset = shorter * 0.012;
    const contactInset = shorter * 0.002;
    function inset(side, t) {
      let contact = 0;
      for (const [lo, hi] of contacts[side] ?? []) {
        const distance = Math.max(lo - t, t - hi, 0);
        const fraction = 1 - Math.min(1, distance / 0.065);
        contact = Math.max(contact, fraction * fraction * (3 - 2 * fraction));
      }
      return edgeInset - contact * (edgeInset - contactInset);
    }
    function blend(distance, coordinate, target) {
      if (!Number.isFinite(target) || distance >= edgeFade) return coordinate;
      const t = Math.max(0, distance) / edgeFade;
      const weight = 1 - t * t * (3 - 2 * t);
      return coordinate + weight * (target - coordinate);
    }
    return {
      count: samples.length,
      edges: [top, right, bottom, left].filter(Boolean).length,
      at(point) {
        const { x, y } = point;
        const adjusted = textureOffset(samples, point, radius * 1.8);
        const horizontal = blend(x, adjusted.x, x + left?.(y / height) + inset("left", y / height));
        const vertical = blend(y, adjusted.y, y + top?.(x / width) + inset("top", x / width));
        return {
          x: blend(width - x, horizontal, x - right?.(y / height) - inset("right", y / height)),
          y: blend(height - y, vertical, y - bottom?.(x / width) - inset("bottom", x / width)),
        };
      },
    };
  } finally {
    for (const mat of [transform, rectified, referenceFeatures, cameraFeatures]) mat?.delete();
  }
}
