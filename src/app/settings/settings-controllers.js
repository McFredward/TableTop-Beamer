(() => {
  function createSettingsControllers({ hooks = {} } = {}) {
    return {
      initialize(context = {}) {
        if (typeof hooks.initialize === "function") {
          hooks.initialize(context);
        }
      },
      apply(context = {}) {
        if (typeof hooks.apply === "function") {
          hooks.apply(context);
        }
      },
    };
  }

  window.TT_BEAMER_SETTINGS_CONTROLLERS = {
    createSettingsControllers,
  };
})();
