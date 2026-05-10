// Phase 35 D-03-C1 — Bayer 4×4 dithered solid-color overlay contract test.
//
// RED on master: src/app/runtime/render/runtime-effect-dither.js does not
// exist yet. ERR_MODULE_NOT_FOUND is the EXPECTED failure — proof the rail
// is real. When 35-C-PLAN lands the module, this test transitions to GREEN.
//
// Subject: getDitheredSolidColorImageData({ hex, alpha, width, height })
//   → ImageData of (width * height) pixels with Bayer-4×4-modulated RGB
//
// Bayer 4×4 reference matrix (paste verbatim — value-for-value canonical
// since Bayer 1973; from en.wikipedia.org/wiki/Ordered_dithering):
//
//   const BAYER_4X4 = [
//      0,  8,  2, 10,
//     12,  4, 14,  6,
//      3, 11,  1,  9,
//     15,  7, 13,  5,
//   ];

import test from "node:test";
import assert from "node:assert/strict";

// ImageData polyfill for Node — the module under test will need to construct
// these. Mirrors the browser's ImageData class.
if (typeof globalThis.ImageData !== "function") {
  globalThis.ImageData = class ImageData {
    constructor(arg1, arg2, arg3) {
      // Two construction signatures:
      //   new ImageData(w, h)
      //   new ImageData(Uint8ClampedArray, w[, h])
      if (arg1 instanceof Uint8ClampedArray) {
        this.data = arg1;
        this.width = arg2;
        this.height = arg3 ?? arg1.length / 4 / arg2;
      } else {
        this.width = arg1;
        this.height = arg2;
        this.data = new Uint8ClampedArray(arg1 * arg2 * 4);
      }
    }
  };
}

test("D-03-C1: getDitheredSolidColorImageData is exported", async () => {
  const mod = await import(
    "../src/app/runtime/render/runtime-effect-dither.js"
  );
  assert.equal(
    typeof mod.getDitheredSolidColorImageData,
    "function",
    "getDitheredSolidColorImageData export missing",
  );
});

test("D-03-C1: returns ImageData of requested size", async () => {
  const mod = await import(
    "../src/app/runtime/render/runtime-effect-dither.js"
  );
  const img = mod.getDitheredSolidColorImageData({
    hex: "#3a5fcd",
    alpha: 0.5,
    width: 16,
    height: 16,
  });
  assert.equal(img.width, 16, "ImageData.width mismatch");
  assert.equal(img.height, 16, "ImageData.height mismatch");
  assert.equal(
    img.data.length,
    16 * 16 * 4,
    "ImageData.data.length must equal width*height*4 (RGBA)",
  );
});

test("D-03-C1: dither produces non-uniform pixel values (proof of dither)", async () => {
  const mod = await import(
    "../src/app/runtime/render/runtime-effect-dither.js"
  );
  // Mid-grey solid color: Bayer 4×4 should perturb the R channel by ±1 LSB
  // across the 16-pixel kernel, producing at least 2 distinct R values in
  // any 16×16 patch.
  const img = mod.getDitheredSolidColorImageData({
    hex: "#7f7f7f",
    alpha: 1.0,
    width: 16,
    height: 16,
  });
  const rValues = new Set();
  for (let i = 0; i < img.data.length; i += 4) {
    rValues.add(img.data[i]);
  }
  assert.ok(
    rValues.size >= 2,
    `expected >=2 distinct R values for dithered grey, got ${rValues.size} (${[...rValues].join(",")})`,
  );
});

test("D-03-C1: BAYER_4X4 matrix shape (sanity, optional export)", async () => {
  const mod = await import(
    "../src/app/runtime/render/runtime-effect-dither.js"
  );
  // The matrix may be exported for tooling/inspection; if so, validate shape.
  if (mod.BAYER_4X4) {
    assert.equal(
      mod.BAYER_4X4.length,
      16,
      "BAYER_4X4 must have exactly 16 elements (4×4 matrix flat)",
    );
    const sorted = [...mod.BAYER_4X4].sort((a, b) => a - b);
    assert.deepEqual(
      sorted,
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      "BAYER_4X4 must be a permutation of 0..15",
    );
    // Canonical Bayer ordering check — first row is [0, 8, 2, 10]
    assert.equal(mod.BAYER_4X4[0], 0);
    assert.equal(mod.BAYER_4X4[1], 8);
    assert.equal(mod.BAYER_4X4[2], 2);
    assert.equal(mod.BAYER_4X4[3], 10);
  }
});
