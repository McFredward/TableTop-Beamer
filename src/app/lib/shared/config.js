// Shared config constants. Board catalog, animation-type registry,
// localStorage-key literals, ROOMS defaults, sound-mapping presets.
// Loaded first within the lib block so every consumer can read
// TT_BEAMER_CONFIG at parse time.

(() => {
  function toRootAssetPath(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return raw;
    }
    if (
      raw.startsWith("/") ||
      raw.startsWith("http://") ||
      raw.startsWith("https://") ||
      raw.startsWith("data:")
    ) {
      return raw;
    }
    return `/${raw}`;
  }

  // All boards load from /api/boards at startup. No
  // hardcoded board definitions — the app is fully generic and
  // works for any board game. If the server is unreachable on
  // first load, the blocking overlay prompts retry.
  const BOARDS = [];

  const INLINE_FALLBACK_BOARDS = BOARDS.map((board) => ({
    ...board,
    rooms: board.rooms.map((room) => ({
      ...room,
      points: Array.isArray(room.points) ? room.points.map((point) => [...point]) : undefined,
    })),
  }));

  const ROOM_GIF_ANIMATION_ASSETS = {
    kaputt: toRootAssetPath("resources/animations/malfunction.gif"),
    fire: toRootAssetPath("resources/animations/fire.gif"),
    slime: toRootAssetPath("resources/animations/slime.gif"),
  };

  const ROOM_GLOBAL_EQUIVALENT_MAP = {
    alarm: "intruder-alert",
    flicker: "hull-flicker",
  };

  const ROOM_ANIMATIONS = [
    { id: "kaputt", label: "Malfunction (malfunction.gif)" },
    { id: "fire", label: "Fire (fire.gif)" },
    { id: "slime", label: "Slime (slime.gif)" },
    { id: "scanning", label: "Scanning" },
    { id: "flicker", label: "Light Flicker (global hull-flicker)" },
    { id: "alarm", label: "Alarm" },
  ];

  function createDefaultRoomAnimationDefinitions() {
    return [
      {
        id: "kaputt",
        name: "Malfunction",
        assetType: "gif",
        assetRef: toRootAssetPath("resources/animations/malfunction.gif"),
      },
      {
        id: "fire",
        name: "Fire",
        assetType: "gif",
        assetRef: toRootAssetPath("resources/animations/fire.gif"),
      },
      {
        id: "slime",
        name: "Slime",
        assetType: "gif",
        assetRef: toRootAssetPath("resources/animations/slime.gif"),
      },
      {
        id: "scanning",
        name: "Scanning",
        assetType: "coded",
        assetRef: "special-scanning",
      },
      {
        id: "flicker",
        name: "Light Flicker",
        assetType: "coded",
        assetRef: "hull-flicker",
      },
      {
        id: "alarm",
        name: "Alarm",
        assetType: "coded",
        assetRef: "intruder-alert",
      },
    ];
  }

  function createDefaultInsideAnimationDefinitions() {
    return [
      { id: "hull-flicker", name: "Hull Flicker", assetType: "coded", assetRef: "hull-flicker", intensity: 1, speed: 1, loopUntilStopped: true },
      { id: "intruder-alert", name: "Intruder Alert", assetType: "coded", assetRef: "intruder-alert", intensity: 1, speed: 1, loopUntilStopped: false },
      { id: "power-outage", name: "Power Outage", assetType: "coded", assetRef: "power-outage", intensity: 1, speed: 1, loopUntilStopped: false },
    ];
  }

  const INSIDE_SHIP_GLOBAL_ANIMATIONS = createDefaultInsideAnimationDefinitions().map((entry) => ({
    id: entry.id,
    label: entry.name,
    category: "inside-ship",
  }));

  const OUTSIDE_SHIP_GLOBAL_ANIMATIONS = [{ id: "outside-space", label: "Outside Space", category: "outside-ship" }];
  const GLOBAL_ANIMATIONS = [...INSIDE_SHIP_GLOBAL_ANIMATIONS, ...OUTSIDE_SHIP_GLOBAL_ANIMATIONS];
  const ALL_ANIMATION_TYPES = [...GLOBAL_ANIMATIONS, ...ROOM_ANIMATIONS];
  const SOUND_MAPPING_NONE = "none";

  const EVENT_SOUND_ASSETS = Object.fromEntries(
    Object.entries({
      "intruder-alert": ["resources/sounds/alarm.mp3", "resources/sounds/monsters/048.wav"],
      "power-outage": ["resources/sounds/power/3.wav"],
      "alarm-beacon": ["resources/sounds/alarm.mp3"],
      "electrical-arc": ["resources/sounds/electricity.mp3"],
      alarm: ["resources/sounds/alarm.mp3"],
      flicker: ["resources/sounds/electricity.mp3"],
      fire: ["resources/sounds/power/3.wav"],
    }).map(([animationId, assetPaths]) => [animationId, assetPaths.map(toRootAssetPath)]),
  );

  const ALL_SOUND_ASSET_PATHS = Array.from(new Set(Object.values(EVENT_SOUND_ASSETS).flat()));

  const HITAREA_CALIBRATION_DEFAULT = { offsetX: 0, offsetY: 0, scale: 1 };
  const HITAREA_CALIBRATION_STORAGE_KEY = "tt-beamer.hitarea-calibration.v1";
  const BOARD_PROFILE_STORAGE_KEY = "tt-beamer.board-profiles.v1";
  const ROOM_GEOMETRY_STORAGE_KEY = "tt-beamer.room-geometry.v1";
  const SPECIAL_POLYGON_STORAGE_KEY = "tt-beamer.special-polygons.v1";
  const API_BASE_STORAGE_KEY = "tt-beamer.api-base.v1";
  const API_BASE_URL_PARAM_KEYS = ["ttApiBase", "apiBase", "api_base"];
  const API_PORT_FALLBACKS = [4173, 4174, 3000, 8080];
  const API_REQUEST_TIMEOUT_MS = 3000;
  const LOCAL_API_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

  const ROOM_GEOMETRY_DEFAULT = {
    mode: "relative",
    offsetX: 0,
    offsetY: 0,
    absoluteX: null,
    absoluteY: null,
    stretchX: 1,
    stretchY: 1,
  };

  const BOARD_ZOOM_DEFAULT = { scale: 1, panX: 0, panY: 0 };

  const SHIP_POLYGON_DEFAULT = [
    [0.06, 0.08],
    [0.94, 0.08],
    [0.97, 0.5],
    [0.94, 0.92],
    [0.06, 0.92],
    [0.03, 0.5],
  ];

  const OUTSIDE_ANIMATION_ASSET_TYPES = ["coded", "gif", "mp4"];

  function createDefaultOutsideAnimationDefinitions() {
    return [
      {
        id: "outside-space",
        name: "Outside Space",
        assetType: "coded",
        assetRef: "outside-space",
        intensity: 0.7,
        speed: 1,
        mode: "standard",
        direction: "forward",
        soundEnabled: false,
      },
      {
        id: "outside-sandstorm",
        name: "Outside Sandstorm",
        assetType: "mp4",
        assetRef: toRootAssetPath("resources/animations/sandstorm.mp4"),
        intensity: 0.9,
        speed: 1,
        mode: "standard",
        direction: "forward",
        soundEnabled: false,
      },
    ];
  }

  const OUTSIDE_FX_DEFAULT = {
    enabled: false,
    selectedAnimationId: "outside-sandstorm",
    animations: createDefaultOutsideAnimationDefinitions(),
  };

  // App version. Cadence (post-v1.0 / 2026-05-21 onward): each closed
  // phase ships a version. Patch (e.g. 1.0.0 → 1.0.1) for small-fix
  // phases; minor (1.0.x → 1.1.0) for new user-facing features; major
  // (1.x → 2.0) only for big architectural shifts. Bump on phase
  // closure, in TWO places — this constant AND `package.json` — both
  // must stay in lockstep or the topbar chip drifts from the actual
  // build. Surfaced to the user via the small chip in the topbar
  // (index.html #app-version, populated at parse time by the inline
  // script next to the topbar).
  const APP_VERSION = "1.2.0";

  window.TT_BEAMER_CONFIG = {
    BOARDS,
    INLINE_FALLBACK_BOARDS,
    ROOM_GIF_ANIMATION_ASSETS,
    ROOM_GLOBAL_EQUIVALENT_MAP,
    ROOM_ANIMATIONS,
    INSIDE_SHIP_GLOBAL_ANIMATIONS,
    OUTSIDE_SHIP_GLOBAL_ANIMATIONS,
    GLOBAL_ANIMATIONS,
    ALL_ANIMATION_TYPES,
    SOUND_MAPPING_NONE,
    EVENT_SOUND_ASSETS,
    ALL_SOUND_ASSET_PATHS,
    HITAREA_CALIBRATION_DEFAULT,
    HITAREA_CALIBRATION_STORAGE_KEY,
    BOARD_PROFILE_STORAGE_KEY,
    ROOM_GEOMETRY_STORAGE_KEY,
    SPECIAL_POLYGON_STORAGE_KEY,
    API_BASE_STORAGE_KEY,
    API_BASE_URL_PARAM_KEYS,
    API_PORT_FALLBACKS,
    API_REQUEST_TIMEOUT_MS,
    LOCAL_API_HOSTS,
    ROOM_GEOMETRY_DEFAULT,
    BOARD_ZOOM_DEFAULT,
    SHIP_POLYGON_DEFAULT,
    OUTSIDE_ANIMATION_ASSET_TYPES,
    createDefaultRoomAnimationDefinitions,
    createDefaultInsideAnimationDefinitions,
    createDefaultOutsideAnimationDefinitions,
    OUTSIDE_FX_DEFAULT,
    APP_VERSION,
  };
})();
