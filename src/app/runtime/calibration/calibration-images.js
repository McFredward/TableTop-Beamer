let cvReady;

export function loadOpenCV() {
  if (!cvReady) {
    cvReady = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("OpenCV did not load.")), 15000);
      const unavailable = () => {
        clearTimeout(timer);
        reject(new Error("OpenCV is unavailable. Restart TT-Beamer with its current dependencies."));
      };
      function waitForRuntime() {
        const instance = globalThis.cv;
        const ready = () => {
          clearTimeout(timer);
          resolve({ cv: instance });
        };
        if (!instance) unavailable();
        else if (instance.Mat) ready();
        else instance.onRuntimeInitialized = ready;
      }
      if (typeof document === "undefined") {
        try {
          importScripts("/vendor/calibration-opencv.js");
          waitForRuntime();
        } catch { unavailable(); }
        return;
      }
      const script = document.createElement("script");
      script.src = "/vendor/calibration-opencv.js";
      script.onerror = unavailable;
      script.onload = waitForRuntime;
      document.head.append(script);
    }).catch(error => { cvReady = undefined; throw error; });
  }
  return cvReady;
}

export function readBitmap(bitmap, keepColor = false) {
  const width = Math.min(1920, bitmap.width);
  const height = Math.round(bitmap.height * width / bitmap.width);
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(bitmap, 0, 0, width, height);
  const rgba = context.getImageData(0, 0, width, height).data;
  const pixels = new Uint8Array(width * height);
  for (let i = 0, j = 0; i < pixels.length; i++, j += 4) {
    pixels[i] = (77 * rgba[j] + 150 * rgba[j+1] + 29 * rgba[j+2]) >> 8;
  }
  return { width, height, pixels, ...(keepColor && { rgba }) };
}

export async function readImage(blob, keepColor = false) {
  const bitmap = await createImageBitmap(blob);
  try {
    return readBitmap(bitmap, keepColor);
  } finally {
    bitmap.close();
  }
}
