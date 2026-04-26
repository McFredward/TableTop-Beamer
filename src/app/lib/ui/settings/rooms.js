// Settings/rooms UI helpers. Small DOM-side helpers used by the rooms
// settings subtab; kept under lib/ui/settings/ to mirror the directory
// shape of the settings pane.

(() => {
  function buildRoomOption(room) {
    return {
      value: room.id,
      label: room.name || room.label || room.id,
    };
  }

  function syncRoomSelect(selectEl, rooms, value) {
    if (!selectEl) {
      return null;
    }
    selectEl.replaceChildren();
    for (const room of rooms) {
      const option = document.createElement("option");
      const entry = buildRoomOption(room);
      option.value = entry.value;
      option.textContent = entry.label;
      selectEl.append(option);
    }
    if (!rooms.some((room) => room.id === value)) {
      value = rooms[0]?.id ?? "";
    }
    selectEl.value = value;
    selectEl.disabled = rooms.length === 0;
    return value;
  }

  window.TT_BEAMER_UI_SETTINGS_ROOMS = {
    syncRoomSelect,
    buildRoomOption,
  };
})();
