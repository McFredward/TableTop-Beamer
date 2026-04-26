// Bootstrap composition. Wires the app-shell initializer through
// TT_BEAMER_BOOT.run; tiny glue layer between index.html load and
// the main runtime IIFE.

(() => {
  function runApplicationBootstrap({ bootstrap, initializer, onError } = {}) {
    const runner = bootstrap || window.TT_BEAMER_BOOT;
    if (!runner || typeof runner.run !== "function") {
      throw new Error("Missing runtime bootstrap adapter");
    }
    if (typeof initializer !== "function") {
      throw new Error("Application initializer must be a function");
    }
    return runner.run(async () => {
      try {
        return await initializer();
      } catch (error) {
        if (typeof onError === "function") {
          onError(error);
        }
        throw error;
      }
    });
  }

  window.TT_BEAMER_BOOT_COMPOSITION = {
    runApplicationBootstrap,
  };
})();
