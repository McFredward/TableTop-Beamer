self.onmessage = async ({ data: { board, reference, frame } }) => {
  try {
    const [{ loadOpenCV }, { registerBoard }, { makeGameLayout }, { prepareTrackBeads }] = await Promise.all([
      import("../calibration/calibration-images.js"),
      import("../calibration/calibration-math.js"),
      import("./game-observer.js"),
      import("./track-beads.js"),
    ]);
    const { cv } = await loadOpenCV();
    const registration = registerBoard(cv, reference, frame);
    const { slots } = makeGameLayout(board, registration, frame.width, frame.height);
    self.postMessage({ slots: prepareTrackBeads(slots, registration, reference, frame) });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
