(() => {
  function createMediaHandlers({ hooks = {} } = {}) {
    return {
      initialize(context = {}) {
        if (typeof hooks.initialize === "function") {
          hooks.initialize(context);
        }
      },
      teardown(context = {}) {
        if (typeof hooks.teardown === "function") {
          hooks.teardown(context);
        }
      },
    };
  }

  window.TT_BEAMER_MEDIA_HANDLERS = {
    createMediaHandlers,
  };
})();
