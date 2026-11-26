// A polygon segment along the artwork boundary is an authored contact with
// that edge. Only those portions need the smaller safety inset.
export function edgeContacts(rooms) {
  const sides = { left: [], right: [], top: [], bottom: [] };
  for (const { polygon } of rooms) {
    if (!Array.isArray(polygon)) continue;
    for (const [index, point] of polygon.entries()) {
      const end = polygon[(index + 1) % polygon.length];
      if (!Array.isArray(point) || !Array.isArray(end)) continue;
      for (const [side, normal, tangent, at] of [
        ["left", 0, 1, 0], ["right", 0, 1, 1], ["top", 1, 0, 0], ["bottom", 1, 0, 1],
      ]) {
        if (!(Math.abs(point[normal] - at) <= 0.002 && Math.abs(end[normal] - at) <= 0.002)) continue;
        const lo = Math.min(point[tangent], end[tangent]);
        const hi = Math.max(point[tangent], end[tangent]);
        if (lo >= 0 && hi <= 1 && hi - lo >= 0.018) sides[side].push([lo, hi]);
      }
    }
  }
  return sides;
}

function colorPeak(frame, point, radius, channel, minimum, contains) {
  let strongest;
  const samples = [];
  for (let y = Math.round(point.y - radius); y <= Math.round(point.y + radius); y++) {
    for (let x = Math.round(point.x - radius); x <= Math.round(point.x + radius); x++) {
      const distance = Math.hypot(x - point.x, y - point.y);
      if (distance > radius || x < 0 || y < 0 || x >= frame.width || y >= frame.height) continue;
      if (contains && !contains({ x, y })) continue;
      const pixel = 4 * (y * frame.width + x);
      const chroma = frame.rgba[pixel + channel] - Math.max(
        frame.rgba[pixel + (channel + 1) % 3], frame.rgba[pixel + (channel + 2) % 3],
      );
      if (chroma < minimum) continue;
      const score = chroma * (1 - 0.48 * (distance / radius) ** 2);
      const candidate = { x, y, chroma, score };
      if (!strongest || score > strongest.score) strongest = candidate;
      samples.push(candidate);
    }
  }
  if (!strongest) return null;
  let x = 0;
  let y = 0;
  let weight = 0;
  let area = 0;
  for (const point of samples) {
    if (Math.hypot(point.x - strongest.x, point.y - strongest.y) > 5.7 || point.chroma < strongest.chroma * 0.45) continue;
    const w = point.chroma - minimum + 1;
    x += point.x * w;
    y += point.y * w;
    weight += w;
    area++;
  }
  if (area < 2) return null;
  return { x: x / weight, y: y / weight, score: strongest.score };
}

export function printedIndicators(rooms, board, reference, camera) {
  if (!reference.rgba || !camera.rgba) return [];
  return rooms.flatMap(room => {
    const polygon = room.polygon;
    if (!Array.isArray(polygon) || polygon.length < 3 || polygon.some(p => !Array.isArray(p) ||
      ![p[0], p[1]].every(v => Number.isFinite(v) && v >= 0 && v <= 1))) return [];
    const xs = polygon.map(p => p[0]);
    const ys = polygon.map(p => p[1]);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    if (Math.max(width, height) > 0.024 || Math.min(width, height) < 0.0025) return [];
    const source = { x: Math.min(...xs) + width / 2, y: Math.min(...ys) + height / 2 };
    const artwork = { x: source.x * (reference.width - 1), y: source.y * (reference.height - 1) };
    const radius = Math.min(10, Math.max(3.5, Math.min(width * reference.width, height * reference.height) * 0.8));
    const colors = [0, 1, 2].map(channel => ({ channel, peak: colorPeak(reference, artwork, radius, channel, 28) }))
      .filter(color => color.peak).sort((a, b) => b.peak.score - a.peak.score);
    if (!colors.length || colors[1]?.peak.score > colors[0].peak.score * 0.76) return [];
    const { channel, peak } = colors[0];
    // The local artwork match predicts the printed spot, which can be a few
    // pixels from the authored centre of the animation.
    const prediction = board.at({ x: peak.x / (reference.width - 1), y: peak.y / (reference.height - 1) });
    const target = colorPeak(camera, prediction, 8, channel, 10, board.contains);
    if (!target || Math.hypot(target.x - prediction.x, target.y - prediction.y) >= 6.5) return [];
    return [{ id: room.id, source, target: { x: target.x, y: target.y } }];
  }).slice(0, 60);
}
