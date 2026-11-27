// Linear classifier fitted on grayscale gradients from photographed Fire tokens and dice.
const diceWeights = [
  -0.860867, -1.108639, -1.754667, -0.765801, -1.547307, -0.953924, -1.228519, -0.842093,
  -0.010265, -0.204026, -0.148126, 0.118973, 0.043294, 0.035728, -0.358069, 0.250297,
  -0.119393, -0.090434, -0.518868, -0.955250, 0.280138, 0.425319, -0.257028, -0.423586,
  -1.547307, -0.953924, -1.228519, -0.842093, -0.860867, -1.108639, -1.754667, -0.765801,
  0.280138, 0.425319, -0.257028, -0.423586, -0.119393, -0.090434, -0.518868, -0.955250,
  1.023331, 0.641200, 1.913625, 1.045268, 1.916530, 1.201211, 1.534716, 0.380280,
  1.916530, 1.201211, 1.534716, 0.380280, 1.023331, 0.641200, 1.913625, 1.045268,
  0.043294, 0.035728, -0.358069, 0.250297, -0.010265, -0.204026, -0.148126, 0.118973,
  0.043294, 0.035728, -0.358069, 0.250297, -0.010265, -0.204026, -0.148126, 0.118973,
  1.916530, 1.201211, 1.534716, 0.380280, 1.023331, 0.641200, 1.913625, 1.045268,
  1.023331, 0.641200, 1.913625, 1.045268, 1.916530, 1.201211, 1.534716, 0.380280,
  0.280138, 0.425319, -0.257028, -0.423586, -0.119393, -0.090434, -0.518868, -0.955250,
  -1.547307, -0.953924, -1.228519, -0.842093, -0.860867, -1.108639, -1.754667, -0.765801,
  -0.119393, -0.090434, -0.518868, -0.955250, 0.280138, 0.425319, -0.257028, -0.423586,
  -0.010265, -0.204026, -0.148126, 0.118973, 0.043294, 0.035728, -0.358069, 0.250297,
  -0.860867, -1.108639, -1.754667, -0.765801, -1.547307, -0.953924, -1.228519, -0.842093,
];
const diceBias = -0.913413;

const side = 26;
const cells = 4;
const directions = 8;

function pieceGradientFeatures(frame, box) {
  const { width, height, rgba } = frame;
  const pixels = new Float32Array(side * side);
  const spacing = Math.max(box.w, box.h) * 1.18 / (side - 1);
  const middleX = box.x + (box.w - 1) / 2, middleY = box.y + (box.h - 1) / 2;
  function gray(x, y) {
    const offset = (Math.max(0, Math.min(height - 1, y)) * width + Math.max(0, Math.min(width - 1, x))) * 4;
    return (77 * rgba[offset] + 150 * rgba[offset + 1] + 29 * rgba[offset + 2]) / 256;
  }
  for (let row = 0; row < side; row++) {
    for (let column = 0; column < side; column++) {
      const u = (column - (side - 1) / 2) * spacing, v = (row - (side - 1) / 2) * spacing;
      const x = middleX + u, y = middleY + v;
      const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
      const top = gray(x0, y0) * (1 - fx) + gray(x0 + 1, y0) * fx;
      const bottom = gray(x0, y0 + 1) * (1 - fx) + gray(x0 + 1, y0 + 1) * fx;
      pixels[row * side + column] = top * (1 - fy) + bottom * fy;
    }
  }
  const features = new Float32Array(cells * cells * directions);
  for (let row = 1; row < side - 1; row++) {
    for (let column = 1; column < side - 1; column++) {
      const index = row * side + column;
      const dx = pixels[index + 1] - pixels[index - 1], dy = pixels[index + side] - pixels[index - side];
      const magnitude = Math.hypot(dx, dy);
      const direction = ((Math.atan2(dy, dx) + Math.PI * 2) % Math.PI) * directions / Math.PI;
      const bucket = Math.floor(direction), weight = direction - bucket;
      const cell = (Math.floor((row - 1) / 6) * cells + Math.floor((column - 1) / 6)) * directions;
      features[cell + bucket % directions] += magnitude * (1 - weight);
      features[cell + (bucket + 1) % directions] += magnitude * weight;
    }
  }
  const norm = Math.hypot(0.001, ...features);
  return Array.from(features, value => value / norm);
}

export function looksLikeDie(frame, box, redLight) {
  const features = pieceGradientFeatures(frame, box);
  const score = features.reduce((sum, value, i) => sum + value * diceWeights[i], diceBias);
  // Strong projected light also changes contours. Require clearer evidence then.
  return score >= (redLight ? 1.15 : 0.4);
}
