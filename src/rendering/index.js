export function drawRenderFallback(ctx, canvas, roomMetrics, age, scope = "room") {
  const pulse = (Math.sin(age * 6.2) + 1) / 2;
  const alpha = 0.1 + pulse * 0.18;
  if (scope === "room") {
    const radius = Math.max(10, roomMetrics?.radius ?? 24);
    const x = roomMetrics?.centerX ?? canvas.width * 0.5;
    const y = roomMetrics?.centerY ?? canvas.height * 0.5;
    ctx.fillStyle = `rgba(255, 110, 80, ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.fillStyle = `rgba(255, 64, 64, ${Math.min(0.18, alpha).toFixed(3)})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
