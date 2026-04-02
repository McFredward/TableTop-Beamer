(() => {
  function createEditorFlows({ hooks = {} } = {}) {
    return {
      initialize(context = {}) {
        if (typeof hooks.initialize === "function") {
          hooks.initialize(context);
        }
      },
      sync(context = {}) {
        if (typeof hooks.sync === "function") {
          hooks.sync(context);
        }
      },
    };
  }

  window.TT_BEAMER_EDITOR_FLOWS = {
    createEditorFlows,
  };
})();
