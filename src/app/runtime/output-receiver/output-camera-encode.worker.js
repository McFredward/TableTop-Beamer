const canvas = new OffscreenCanvas(1, 1);
const context = canvas.getContext("2d", { alpha: false });

self.onmessage = async ({ data: bitmap }) => {
  try {
    try {
      if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
      }
      context.drawImage(bitmap, 0, 0);
    } finally {
      bitmap.close();
    }
    const jpeg = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
    const response = await fetch("/api/camera/frame", {
      method: "POST",
      body: jpeg,
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) throw new Error(`Camera upload returned HTTP ${response.status}`);
    self.postMessage(null);
  } catch (error) {
    self.postMessage(error.message);
  }
};
