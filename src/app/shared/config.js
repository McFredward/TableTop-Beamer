(() => {
  const BOARDS = [
    {
      id: "nemesis-board-a",
      label: "Nemesis Board A",
      src: "resources/nemesis/boards/httpssteamusercontentaakamaihdnetugc946212227080494269577CF3785BAEF06122BDE208B776E07B27BFFA58.jpg",
      rooms: [
        ["a-01", "Hex A-01", 0.231, 0.248, 0.059],
        ["a-02", "Hex A-02", 0.383, 0.165, 0.058],
        ["a-03", "Hex A-03", 0.547, 0.167, 0.058],
        ["a-04", "Hex A-04", 0.694, 0.191, 0.057],
        ["a-05", "Hex A-05", 0.778, 0.41, 0.055],
        ["a-06", "Hex A-06", 0.623, 0.409, 0.054],
        ["a-07", "Hex A-07", 0.411, 0.358, 0.057],
        ["a-08", "Hex A-08", 0.206, 0.556, 0.057],
        ["a-09", "Hex A-09", 0.333, 0.56, 0.055],
        ["a-10", "Hex A-10", 0.409, 0.704, 0.056],
        ["a-11", "Hex A-11", 0.631, 0.63, 0.054],
        ["a-12", "Hex A-12", 0.777, 0.631, 0.054],
        ["a-13", "Hex A-13", 0.215, 0.835, 0.056],
        ["a-14", "Hex A-14", 0.385, 0.886, 0.056],
        ["a-15", "Hex A-15", 0.534, 0.879, 0.055],
        ["a-16", "Hex A-16", 0.69, 0.879, 0.055],
        {
          id: "special-cockpit",
          label: "Cockpit",
          radius: 0.066,
          points: [
            [0.026, 0.456],
            [0.056, 0.402],
            [0.098, 0.415],
            [0.119, 0.49],
            [0.1, 0.57],
            [0.058, 0.617],
            [0.027, 0.556],
          ],
        },
        {
          id: "special-cryoschlaf",
          label: "Cryoschlaf",
          radius: 0.091,
          points: [
            [0.457, 0.505],
            [0.49, 0.401],
            [0.55, 0.368],
            [0.59, 0.411],
            [0.6, 0.514],
            [0.585, 0.62],
            [0.547, 0.664],
            [0.495, 0.655],
            [0.466, 0.59],
          ],
        },
        {
          id: "special-maschinenraum-1",
          label: "Maschinenraum 1",
          radius: 0.059,
          points: [
            [0.855, 0.769],
            [0.888, 0.728],
            [0.953, 0.728],
            [0.981, 0.769],
            [0.981, 0.85],
            [0.952, 0.892],
            [0.888, 0.892],
            [0.855, 0.852],
          ],
        },
        {
          id: "special-maschinenraum-2",
          label: "Maschinenraum 2",
          radius: 0.052,
          points: [
            [0.857, 0.488],
            [0.889, 0.457],
            [0.952, 0.457],
            [0.98, 0.486],
            [0.98, 0.559],
            [0.952, 0.588],
            [0.889, 0.588],
            [0.857, 0.561],
          ],
        },
        {
          id: "special-maschinenraum-3",
          label: "Maschinenraum 3",
          radius: 0.055,
          points: [
            [0.855, 0.206],
            [0.888, 0.165],
            [0.952, 0.165],
            [0.981, 0.203],
            [0.981, 0.285],
            [0.95, 0.327],
            [0.888, 0.327],
            [0.855, 0.286],
          ],
        },
      ],
    },
    {
      id: "nemesis-board-b",
      label: "Nemesis Board B",
      src: "resources/nemesis/boards/httpssteamusercontentaakamaihdnetugc948472629471389466262B46FE788A03A16E28D87AE3C3D56A707BC356.jpg",
      rooms: [
        ["b-01", "Hex B-01", 0.082, 0.213, 0.059],
        ["b-02", "Hex B-02", 0.214, 0.303, 0.055],
        ["b-03", "Hex B-03", 0.468, 0.288, 0.056],
        ["b-04", "Hex B-04", 0.656, 0.252, 0.057],
        ["b-05", "Hex B-05", 0.812, 0.188, 0.058],
        ["b-06", "Hex B-06", 0.214, 0.552, 0.056],
        ["b-07", "Hex B-07", 0.451, 0.587, 0.055],
        ["b-08", "Hex B-08", 0.575, 0.587, 0.055],
        ["b-09", "Hex B-09", 0.693, 0.587, 0.055],
        ["b-10", "Hex B-10", 0.216, 0.781, 0.056],
        ["b-11", "Hex B-11", 0.477, 0.825, 0.056],
        ["b-12", "Hex B-12", 0.696, 0.875, 0.056],
        ["b-13", "Hex B-13", 0.811, 0.963, 0.056],
        ["b-14", "Hex B-14", 0.082, 0.869, 0.058],
        {
          id: "special-cockpit",
          label: "Cockpit",
          radius: 0.07,
          points: [
            [0.014, 0.383],
            [0.051, 0.347],
            [0.108, 0.348],
            [0.135, 0.392],
            [0.135, 0.67],
            [0.108, 0.71],
            [0.051, 0.71],
            [0.014, 0.668],
          ],
        },
        {
          id: "special-cryoschlaf",
          label: "Cryoschlaf",
          radius: 0.09,
          points: [
            [0.261, 0.402],
            [0.306, 0.347],
            [0.387, 0.347],
            [0.426, 0.392],
            [0.426, 0.667],
            [0.387, 0.709],
            [0.306, 0.709],
            [0.261, 0.668],
          ],
        },
        {
          id: "special-maschinenraum-1",
          label: "Maschinenraum 1",
          radius: 0.055,
          points: [
            [0.856, 0.587],
            [0.895, 0.558],
            [0.957, 0.558],
            [0.986, 0.587],
            [0.986, 0.678],
            [0.957, 0.704],
            [0.895, 0.704],
            [0.856, 0.676],
          ],
        },
        {
          id: "special-maschinenraum-2",
          label: "Maschinenraum 2",
          radius: 0.051,
          points: [
            [0.856, 0.455],
            [0.895, 0.425],
            [0.957, 0.425],
            [0.986, 0.453],
            [0.986, 0.542],
            [0.957, 0.572],
            [0.895, 0.572],
            [0.856, 0.545],
          ],
        },
        {
          id: "special-maschinenraum-3",
          label: "Maschinenraum 3",
          radius: 0.05,
          points: [
            [0.858, 0.323],
            [0.895, 0.294],
            [0.958, 0.294],
            [0.986, 0.323],
            [0.986, 0.409],
            [0.958, 0.435],
            [0.895, 0.435],
            [0.858, 0.411],
          ],
        },
      ],
    },
  ].map((board) => ({
    ...board,
    rooms: board.rooms.map((room) => {
      if (Array.isArray(room)) {
        const [id, label, x, y, radius = 0.055] = room;
        return { id, label, x, y, radius };
      }
      return room;
    }),
  }));

  const INLINE_FALLBACK_BOARDS = BOARDS.map((board) => ({
    ...board,
    rooms: board.rooms.map((room) => ({
      ...room,
      points: Array.isArray(room.points) ? room.points.map((point) => [...point]) : undefined,
    })),
  }));

  const ZONE_CONFIG_SOURCES = [
    { boardId: "nemesis-board-a", endpoint: "/config/zones/nemesis-board-a.json" },
    { boardId: "nemesis-board-b", endpoint: "/config/zones/nemesis-board-b.json" },
  ];

  const ROOM_GIF_ANIMATION_ASSETS = {
    kaputt: "resources/nemesis/animations/malfunction.gif",
    feuer: "resources/nemesis/animations/fire.gif",
    schleim: "resources/nemesis/animations/final.gif",
  };

  const ROOM_GLOBAL_EQUIVALENT_MAP = {
    alarm: "intruder-alert",
    lichtflackern: "hull-flicker",
  };

  const ROOM_ANIMATIONS = [
    { id: "kaputt", label: "Kaputt (malfunction.gif)" },
    { id: "feuer", label: "Feuer (fire.gif)" },
    { id: "schleim", label: "Schleim (final.gif)" },
    { id: "nest", label: "Nest" },
    { id: "dekompression", label: "Dekompression" },
    { id: "lichtflackern", label: "Lichtflackern (global hull-flicker)" },
    { id: "alarm", label: "Alarm" },
  ];

  const INSIDE_SHIP_GLOBAL_ANIMATIONS = [
    { id: "ambient-drift", label: "Ambient Drift", category: "inside-ship" },
    { id: "ash-fall", label: "Ash Fall", category: "inside-ship" },
    { id: "hull-flicker", label: "Hull Flicker", category: "inside-ship" },
    { id: "intruder-alert", label: "Intruder Alert", category: "inside-ship" },
    { id: "reactor-pulse", label: "Reactor Pulse", category: "inside-ship" },
    { id: "power-outage", label: "Power Outage", category: "inside-ship" },
  ];

  const OUTSIDE_SHIP_GLOBAL_ANIMATIONS = [{ id: "outside-space", label: "Outside Space", category: "outside-ship" }];
  const GLOBAL_ANIMATIONS = [...INSIDE_SHIP_GLOBAL_ANIMATIONS, ...OUTSIDE_SHIP_GLOBAL_ANIMATIONS];
  const ALL_ANIMATION_TYPES = [...GLOBAL_ANIMATIONS, ...ROOM_ANIMATIONS];
  const SOUND_MAPPING_NONE = "none";

  const EVENT_SOUND_ASSETS = {
    "intruder-alert": ["resources/nemesis/sounds/alarm.mp3", "resources/nemesis/sounds/monsters/048.wav"],
    "reactor-pulse": ["resources/nemesis/sounds/electricity.mp3"],
    "power-outage": ["resources/nemesis/sounds/power/3.wav"],
    "alarm-beacon": ["resources/nemesis/sounds/alarm.mp3"],
    "electrical-arc": ["resources/nemesis/sounds/electricity.mp3"],
    alarm: ["resources/nemesis/sounds/alarm.mp3"],
    lichtflackern: ["resources/nemesis/sounds/electricity.mp3"],
    feuer: ["resources/nemesis/sounds/power/3.wav"],
  };

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
  const SESSION_REQUEST_TIMEOUT_MS = 9000;
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

  const OUTSIDE_FX_DEFAULT = {
    enabled: false,
    intensity: 0.7,
    speed: 1,
    mode: "standard",
    direction: "forward",
  };

  const ROOM_STATE_DEFAULT = {
    broken: false,
    burning: false,
    alienCount: 0,
    corpse: false,
  };

  window.TT_BEAMER_CONFIG = {
    BOARDS,
    INLINE_FALLBACK_BOARDS,
    ZONE_CONFIG_SOURCES,
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
    SESSION_REQUEST_TIMEOUT_MS,
    LOCAL_API_HOSTS,
    ROOM_GEOMETRY_DEFAULT,
    BOARD_ZOOM_DEFAULT,
    SHIP_POLYGON_DEFAULT,
    OUTSIDE_FX_DEFAULT,
    ROOM_STATE_DEFAULT,
  };
})();
