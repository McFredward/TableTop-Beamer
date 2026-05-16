import { performance } from "node:perf_hooks";

const zoneAnchors = [
  [0.19, 0.28],
  [0.3, 0.53],
  [0.43, 0.42],
  [0.56, 0.64],
  [0.72, 0.29],
  [0.84, 0.55],
];

const particles = [];
const frames = 12000;
const intensity = 0.8;
const canvasWidth = 1280;
const canvasHeight = 800;

const startedAt = performance.now();
let peakParticles = 0;
let budgetMisses = 0;
let totalFrameMs = 0;

for (let frame = 0; frame < frames; frame += 1) {
  const frameStart = performance.now();

  if (Math.random() > 0.7 - intensity * 0.2) {
    particles.push({
      x: Math.random() * canvasWidth,
      y: -14,
      vx: (Math.random() - 0.5) * 0.6,
      vy: 0.45 + Math.random() * 0.9,
      life: 1,
      kind: "ash",
      size: 0.8 + Math.random() * 2.8,
    });
  }

  if (Math.random() > 0.8 - intensity * 0.18) {
    const [zx, zy] = zoneAnchors[(Math.random() * zoneAnchors.length) | 0];
    particles.push({
      x: zx * canvasWidth + (Math.random() - 0.5) * 40,
      y: zy * canvasHeight + (Math.random() - 0.5) * 22,
      vx: (Math.random() - 0.5) * 0.22,
      vy: -0.15 - Math.random() * 0.32,
      life: 1,
      kind: "leak",
      size: 8 + Math.random() * 12,
    });
  }

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.008;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }

  peakParticles = Math.max(peakParticles, particles.length);
  const frameMs = performance.now() - frameStart;
  totalFrameMs += frameMs;
  if (frameMs > 16.7) {
    budgetMisses += 1;
  }
}

const runtimeMs = performance.now() - startedAt;
const avgFrameMs = totalFrameMs / frames;
const fpsEquivalent = 1000 / avgFrameMs;

console.log(JSON.stringify({
  frames,
  runtimeMs: Number(runtimeMs.toFixed(2)),
  avgFrameMs: Number(avgFrameMs.toFixed(4)),
  fpsEquivalent: Number(fpsEquivalent.toFixed(2)),
  peakParticles,
  budgetMisses,
}, null, 2));
