(() => {
  function createSyncHandlers({ hooks = {} } = {}) {
    return {
      bind(context = {}) {
        if (typeof hooks.bind === "function") {
          hooks.bind(context);
        }
      },
      emit(context = {}) {
        if (typeof hooks.emit === "function") {
          hooks.emit(context);
        }
      },
    };
  }

  window.TT_BEAMER_SYNC_HANDLERS = {
    createSyncHandlers,
  };
})();
