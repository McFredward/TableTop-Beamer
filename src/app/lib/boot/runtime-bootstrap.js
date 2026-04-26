// Runtime-bootstrap factory. Creates the BOOT object whose run method
// invokes the app initializer; the smallest useful module in the tree.

(() => {
  function createRuntimeBootstrap() {
    return {
      run(initializer) {
        if (typeof initializer !== "function") {
          throw new Error("Runtime bootstrap requires an initializer function");
        }
        return initializer();
      },
    };
  }

  window.TT_BEAMER_BOOT = createRuntimeBootstrap();
})();
