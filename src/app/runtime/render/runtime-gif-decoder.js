// pure GIF decoder module.
//
// No runtime state. These functions only operate on byte arrays and
// return decoded data structures. `decodeGifPlaybackFramesWithParser`
// stores frames as `ImageData` (CPU-only pixel buffers) — NOT as
// per-frame <canvas> elements. Phase 30 B2 h10: the previous
// canvas-per-frame approach allocated a Chromium GPU-backed
// drawing-buffer for every decoded frame; for a 22 MB / 150-frame
// GIF this peaked at ~150 GPU textures and triggered
// CONTEXT_LOST_WEBGL on Pi VC4 even though the decode itself
// succeeded. ImageData lives in CPU heap memory — much cheaper, and
// the runtime-gif-playback module owns ONE shared playback canvas
// per cache entry that re-paints on demand via putImageData.
//
// Because there are no state dependencies the module does not need
// an init() callback — the API is exposed immediately at script
// load. runtime-orchestration.js destructures it back into its own
// scope the way it already does with window.TT_BEAMER_POLYGON_CONTRACT.
(() => {
  function canDecodeGifFramesWithImageDecoder() {
    return typeof ImageDecoder === "function" && typeof createImageBitmap === "function";
  }

  function readGifSubBlocks(bytes, startOffset) {
    const chunks = [];
    let cursor = startOffset;
    while (cursor < bytes.length) {
      const chunkLength = bytes[cursor];
      cursor += 1;
      if (chunkLength === 0) {
        break;
      }
      const chunk = bytes.subarray(cursor, cursor + chunkLength);
      chunks.push(chunk);
      cursor += chunkLength;
    }
    return {
      data: chunks,
      nextOffset: cursor,
    };
  }

  function concatGifSubBlocks(chunks) {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    return merged;
  }

  function decodeGifLzwIndices(minCodeSize, compressedData, expectedPixelCount) {
    const clearCode = 1 << minCodeSize;
    const endCode = clearCode + 1;
    let codeSize = minCodeSize + 1;
    let dictionary = [];

    const resetDictionary = () => {
      dictionary = [];
      const baseSize = 1 << minCodeSize;
      for (let i = 0; i < baseSize; i += 1) {
        dictionary[i] = [i];
      }
      dictionary[clearCode] = [];
      dictionary[endCode] = null;
      codeSize = minCodeSize + 1;
    };

    resetDictionary();

    let bitBuffer = 0;
    let bitCount = 0;
    let byteCursor = 0;

    const readCode = () => {
      while (bitCount < codeSize) {
        if (byteCursor >= compressedData.length) {
          return null;
        }
        bitBuffer |= compressedData[byteCursor] << bitCount;
        bitCount += 8;
        byteCursor += 1;
      }
      const codeMask = (1 << codeSize) - 1;
      const code = bitBuffer & codeMask;
      bitBuffer >>= codeSize;
      bitCount -= codeSize;
      return code;
    };

    const output = [];
    let previous = null;

    while (true) {
      const code = readCode();
      if (code === null || code === endCode) {
        break;
      }
      if (code === clearCode) {
        resetDictionary();
        previous = null;
        continue;
      }

      let entry;
      if (dictionary[code]) {
        entry = dictionary[code];
      } else if (previous) {
        entry = previous.concat(previous[0]);
      } else {
        entry = [];
      }

      for (const value of entry) {
        output.push(value);
        if (output.length >= expectedPixelCount) {
          return output;
        }
      }

      if (previous && entry.length > 0) {
        dictionary.push(previous.concat(entry[0]));
        if (dictionary.length === 1 << codeSize && codeSize < 12) {
          codeSize += 1;
        }
      }

      previous = entry;
    }

    return output;
  }

  function deinterlaceGifIndices(indices, width, height) {
    const output = new Array(width * height);
    const passes = [
      { start: 0, step: 8 },
      { start: 4, step: 8 },
      { start: 2, step: 4 },
      { start: 1, step: 2 },
    ];
    let sourceCursor = 0;
    for (const pass of passes) {
      for (let y = pass.start; y < height; y += pass.step) {
        const rowOffset = y * width;
        for (let x = 0; x < width; x += 1) {
          output[rowOffset + x] = indices[sourceCursor] ?? 0;
          sourceCursor += 1;
        }
      }
    }
    return output;
  }

  function readGifColorTable(bytes, offset, tableSize) {
    const colors = [];
    let cursor = offset;
    for (let i = 0; i < tableSize; i += 1) {
      const r = bytes[cursor] ?? 0;
      const g = bytes[cursor + 1] ?? 0;
      const b = bytes[cursor + 2] ?? 0;
      colors.push([r, g, b]);
      cursor += 3;
    }
    return {
      colors,
      nextOffset: cursor,
    };
  }

  function applyGifDisposalToCanvas(canvasPixels, frameMeta, bgColorRgba) {
    if (!frameMeta) {
      return;
    }
    if (frameMeta.disposal === 2) {
      const [bgR, bgG, bgB, bgA] = bgColorRgba;
      const xStart = Math.max(0, frameMeta.left);
      const yStart = Math.max(0, frameMeta.top);
      const xEnd = Math.min(frameMeta.canvasWidth, frameMeta.left + frameMeta.width);
      const yEnd = Math.min(frameMeta.canvasHeight, frameMeta.top + frameMeta.height);
      for (let y = yStart; y < yEnd; y += 1) {
        for (let x = xStart; x < xEnd; x += 1) {
          const index = (y * frameMeta.canvasWidth + x) * 4;
          canvasPixels[index] = bgR;
          canvasPixels[index + 1] = bgG;
          canvasPixels[index + 2] = bgB;
          canvasPixels[index + 3] = bgA;
        }
      }
    } else if (frameMeta.disposal === 3 && frameMeta.previousCanvasPixels) {
      canvasPixels.set(frameMeta.previousCanvasPixels);
    }
  }

  // Phase 30 B2 h11: async parser with optional per-frame yield. When
  // `yieldBetweenFrames=true` (passed by /output/), we await
  // setTimeout(0) after each decoded frame so the main thread becomes
  // responsive between frames. Without this, slime.gif parsed in one
  // ~9.8 s synchronous block on Pi 4 → the VC4 GPU driver's WebGL
  // watchdog reaped the context (no rAF callbacks for >5 s = idle
  // signal → CONTEXT_LOST_WEBGL right after decode-success). With the
  // yield, rAF / paint / event-loop work all run between frames; the
  // GL context keeps receiving frame submissions and stays alive.
  // Per-yield overhead on Chrome is ~5 ms (setTimeout 0 minimum),
  // adding ~750 ms to slime parse time. Net latency is irrelevant
  // compared to keeping GL alive.
  async function decodeGifPlaybackFramesWithParser(data, entry, options = {}) {
    const { yieldBetweenFrames = false } = options;
    const yieldTick = yieldBetweenFrames
      ? () => new Promise((resolve) => setTimeout(resolve, 0))
      : null;
    const bytes = new Uint8Array(data);
    if (bytes.length < 13) {
      throw new Error("GIF parse failed: payload too small");
    }
    const header = String.fromCharCode(...bytes.subarray(0, 6));
    if (header !== "GIF89a" && header !== "GIF87a") {
      throw new Error(`GIF parse failed: unsupported header ${header}`);
    }

    const logicalWidth = bytes[6] | (bytes[7] << 8);
    const logicalHeight = bytes[8] | (bytes[9] << 8);
    const packed = bytes[10];
    const hasGlobalColorTable = (packed & 0x80) !== 0;
    const globalColorTableSize = hasGlobalColorTable ? 1 << ((packed & 0x07) + 1) : 0;
    const backgroundColorIndex = bytes[11] ?? 0;

    let cursor = 13;
    let globalColorTable = null;
    if (hasGlobalColorTable) {
      const table = readGifColorTable(bytes, cursor, globalColorTableSize);
      globalColorTable = table.colors;
      cursor = table.nextOffset;
    }

    const bgColor = globalColorTable?.[backgroundColorIndex] ?? [0, 0, 0];
    const bgColorRgba = [bgColor[0], bgColor[1], bgColor[2], 0];
    const canvasPixels = new Uint8ClampedArray(logicalWidth * logicalHeight * 4);
    const frames = [];
    let totalDurationMs = 0;

    let pendingGce = {
      delayMs: 100,
      disposal: 0,
      transparentIndex: null,
    };
    let previousFrameMeta = null;

    while (cursor < bytes.length) {
      const blockType = bytes[cursor];
      cursor += 1;

      if (blockType === 0x3b) {
        break;
      }

      if (blockType === 0x21) {
        const label = bytes[cursor];
        cursor += 1;
        if (label === 0xf9) {
          const byteSize = bytes[cursor] ?? 0;
          cursor += 1;
          const gcePacked = bytes[cursor] ?? 0;
          const delayCs = (bytes[cursor + 1] ?? 0) | ((bytes[cursor + 2] ?? 0) << 8);
          const transparentIndex = (gcePacked & 0x01) === 0x01 ? bytes[cursor + 3] ?? null : null;
          const disposal = (gcePacked >> 2) & 0x07;
          cursor += byteSize;
          if (bytes[cursor] === 0x00) {
            cursor += 1;
          }
          pendingGce = {
            delayMs: Math.max(16, delayCs * 10 || 100),
            disposal,
            transparentIndex,
          };
        } else {
          if (label === 0x01 || label === 0xff) {
            const blockSize = bytes[cursor] ?? 0;
            cursor += 1 + blockSize;
          }
          const skipped = readGifSubBlocks(bytes, cursor);
          cursor = skipped.nextOffset;
        }
        continue;
      }

      if (blockType !== 0x2c) {
        throw new Error(`GIF parse failed: unexpected block ${blockType}`);
      }

      applyGifDisposalToCanvas(canvasPixels, previousFrameMeta, bgColorRgba);

      const left = bytes[cursor] | (bytes[cursor + 1] << 8);
      const top = bytes[cursor + 2] | (bytes[cursor + 3] << 8);
      const width = bytes[cursor + 4] | (bytes[cursor + 5] << 8);
      const height = bytes[cursor + 6] | (bytes[cursor + 7] << 8);
      const descriptorPacked = bytes[cursor + 8];
      cursor += 9;

      const hasLocalColorTable = (descriptorPacked & 0x80) !== 0;
      const interlaced = (descriptorPacked & 0x40) !== 0;
      const localColorTableSize = hasLocalColorTable ? 1 << ((descriptorPacked & 0x07) + 1) : 0;

      let activeColorTable = globalColorTable;
      if (hasLocalColorTable) {
        const localTable = readGifColorTable(bytes, cursor, localColorTableSize);
        activeColorTable = localTable.colors;
        cursor = localTable.nextOffset;
      }
      if (!activeColorTable || activeColorTable.length === 0) {
        throw new Error("GIF parse failed: missing color table");
      }

      const lzwMinCodeSize = bytes[cursor] ?? 0;
      cursor += 1;
      const imageDataBlocks = readGifSubBlocks(bytes, cursor);
      cursor = imageDataBlocks.nextOffset;
      const compressedData = concatGifSubBlocks(imageDataBlocks.data);

      const expectedPixelCount = width * height;
      const decodedIndices = decodeGifLzwIndices(lzwMinCodeSize, compressedData, expectedPixelCount);
      const indices = interlaced ? deinterlaceGifIndices(decodedIndices, width, height) : decodedIndices;

      const previousCanvasPixels =
        pendingGce.disposal === 3 ? new Uint8ClampedArray(canvasPixels) : null;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const sourceIndex = y * width + x;
          const paletteIndex = indices[sourceIndex] ?? 0;
          if (pendingGce.transparentIndex !== null && paletteIndex === pendingGce.transparentIndex) {
            continue;
          }
          const color = activeColorTable[paletteIndex] ?? [0, 0, 0];
          const targetX = left + x;
          const targetY = top + y;
          if (targetX < 0 || targetY < 0 || targetX >= logicalWidth || targetY >= logicalHeight) {
            continue;
          }
          const targetOffset = (targetY * logicalWidth + targetX) * 4;
          canvasPixels[targetOffset] = color[0];
          canvasPixels[targetOffset + 1] = color[1];
          canvasPixels[targetOffset + 2] = color[2];
          canvasPixels[targetOffset + 3] = 255;
        }
      }

      // Phase 30 B2 h10: store ImageData (CPU pixel buffer) instead
      // of an HTMLCanvasElement. Each canvas creation on Chromium
      // GPU-accelerated Canvas2D allocates a backing-store GPU
      // texture; for slime.gif (150 frames × 1080×1080) that
      // accumulated to ~600 MB of GPU memory and reliably tripped
      // CONTEXT_LOST_WEBGL on Pi VC4 mid-decode. ImageData stays in
      // JS heap — adding 150 frames cost ~600 MB CPU RAM on a
      // 1080×1080 GIF, but the Pi has 8 GB system memory and zero
      // GPU pressure. The shared playback canvas in
      // runtime-gif-playback.js does the lazy putImageData when the
      // draw loop asks for a specific frame.
      const frameImageData = new ImageData(
        new Uint8ClampedArray(canvasPixels),
        logicalWidth,
        logicalHeight,
      );

      const durationMs = pendingGce.delayMs;
      frames.push({ imageData: frameImageData, durationMs });
      totalDurationMs += durationMs;

      // Phase 30 B2 h11: yield to event loop between frames so the
      // rAF draw-loop (and the WebGL warp inside it) keeps running
      // through long parses. On Pi VC4 this prevents the GPU
      // driver's no-frames-for-Ns watchdog from reaping the WebGL
      // context mid-parse. No-op when yieldTick is null
      // (dashboard / non-final-output).
      if (yieldTick) {
        await yieldTick();
      }

      previousFrameMeta = {
        disposal: pendingGce.disposal,
        left,
        top,
        width,
        height,
        canvasWidth: logicalWidth,
        canvasHeight: logicalHeight,
        previousCanvasPixels,
      };

      pendingGce = {
        delayMs: 100,
        disposal: 0,
        transparentIndex: null,
      };
    }

    if (frames.length === 0) {
      throw new Error("GIF parse failed: no frames decoded");
    }

    entry.frames = frames;
    entry.totalDurationMs = Math.max(16, totalDurationMs);
    entry.frameWidth = logicalWidth;
    entry.frameHeight = logicalHeight;
    entry.status = "ready";
    entry.error = null;
  }

  window.TT_BEAMER_RUNTIME_GIF_DECODER = {
    canDecodeGifFramesWithImageDecoder,
    decodeGifPlaybackFramesWithParser,
  };
})();
