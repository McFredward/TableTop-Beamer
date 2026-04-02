(() => {
  function createRuntimeBootstrap() {
    let activeRun = null;
    return {
      run(initializer) {
        if (typeof initializer !== "function") {
          throw new Error("Runtime bootstrap requires an initializer function");
        }
        if (activeRun) {
          return activeRun;
        }
        activeRun = Promise.resolve().then(() => initializer());
        return activeRun;
      },
    };
  }

  window.TT_BEAMER_BOOT = createRuntimeBootstrap();
})();
