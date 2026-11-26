const MAX_DIRECT_JPEG_BYTES = 1_500_000;
let canvas;
let context;

async function encode(bitmap) {
  try {
    if (!canvas) {
      canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      context = canvas.getContext("2d", { alpha: false });
    }
    if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
    }
    context.drawImage(bitmap, 0, 0);
    return await canvas.convertToBlob({ type: "image/jpeg", quality: 0.76 });
  } finally {
    bitmap.close();
  }
}

self.onmessage = async ({ data: frame }) => {
  try {
    let jpeg = frame;
    if (!(frame instanceof Blob)) {
      jpeg = await encode(frame);
    } else if (frame.size > MAX_DIRECT_JPEG_BYTES) {
      jpeg = await encode(await createImageBitmap(frame));
    }
    const response = await fetch("/api/camera/frame", {
      method: "POST",
      body: jpeg,
      priority: "low",
      signal: AbortSignal.timeout(2500),
    });
    self.postMessage({
      bytes: jpeg.size,
      status: response.status,
      error: response.ok ? null : `Camera upload returned HTTP ${response.status}`,
    });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
