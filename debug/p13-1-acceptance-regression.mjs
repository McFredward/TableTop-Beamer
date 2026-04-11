import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const projectRoot = new URL("../", import.meta.url).pathname;

function* walk(path) {
  let st;
  try {
    st = statSync(path);
  } catch {
    return;
  }
  if (st.isFile()) {
    if (/\.(m?js|cjs)$/.test(path)) yield path;
    return;
  }
  for (const entry of readdirSync(path)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    yield* walk(join(path, entry));
  }
}

function findFunctionalReferences(root, pattern) {
  // Counts references to a storage API that are NOT inside a single-line
  // comment. Multi-line comments are not used in this codebase's affected
  // files; if they appear we'd need a tokenizer.
  const sites = [];
  for (const file of walk(root)) {
    const src = readFileSync(file, "utf8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const commentStart = line.indexOf("//");
      const matchIdx = line.search(pattern);
      if (matchIdx < 0) continue;
      if (commentStart >= 0 && commentStart <= matchIdx) continue;
      sites.push({
        file: relative(projectRoot, file),
        line: i + 1,
        content: line.trim().slice(0, 160),
      });
    }
  }
  return sites;
}

const scanRoots = [
  join(projectRoot, "src/app"),
  join(projectRoot, "src/live"),
];

const localStorageSites = [];
const indexedDbSites = [];
const sessionStorageSites = [];
for (const root of scanRoots) {
  localStorageSites.push(...findFunctionalReferences(root, /\blocalStorage\b/));
  indexedDbSites.push(...findFunctionalReferences(root, /\bindexedDB\b/));
  sessionStorageSites.push(...findFunctionalReferences(root, /\bsessionStorage\b/));
}

// G13-1-1: NoLocalStorage-Static-Gate
const g13_1_1 = localStorageSites.length === 0 && indexedDbSites.length === 0;

// G13-1-2: Server-Write-Path + broadcast
const serverSrc = readFileSync(join(projectRoot, "server.mjs"), "utf8");
const g13_1_2 =
  serverSrc.includes('req.method === "POST" && routePath === "/api/global-defaults"')
  && serverSrc.includes('broadcastLiveSession("global-config-update"');

// G13-1-3: Debounced-Client-Write-Gate
const runtimeSrc = readFileSync(
  join(projectRoot, "src/app/runtime/runtime-orchestration.js"),
  "utf8",
);
const g13_1_3 =
  runtimeSrc.includes("function scheduleGlobalConfigWrite(reason)")
  && runtimeSrc.includes("GLOBAL_CONFIG_WRITE_DEBOUNCE_MS = 200")
  && runtimeSrc.includes("pendingGlobalConfigWriteTimerId = window.setTimeout")
  && /function persistBoardProfiles\(\)\s*\{[^}]*scheduleGlobalConfigWrite\("board-profiles-mutated"\)/s.test(runtimeSrc);

// G13-1-4: Blocking-Startup-Gate
const g13_1_4 =
  runtimeSrc.includes("renderServerUnreachableOverlay(error);")
  && runtimeSrc.includes('title.textContent = "Server nicht erreichbar";')
  && runtimeSrc.includes('retryButton.textContent = "Retry";')
  && runtimeSrc.includes("window.__TT_BEAMER_BOOTSTRAP_CONFIG__");

// G13-1-5: Redundant-Buttons-Removed-Gate
const indexHtml = readFileSync(join(projectRoot, "index.html"), "utf8");
const g13_1_5 =
  !indexHtml.includes('id="save-global-defaults"')
  && !indexHtml.includes('id="load-apply-global-defaults"')
  && !runtimeSrc.includes('document.querySelector("#save-global-defaults")')
  && !runtimeSrc.includes('document.querySelector("#load-apply-global-defaults")');

// G13-1-6: Export-Import-Round-Trip — import button exists and wiring present
const g13_1_6 =
  indexHtml.includes('id="import-global-defaults"')
  && runtimeSrc.includes("wireImportGlobalDefaultsButton()")
  && runtimeSrc.includes('document.querySelector("#import-global-defaults")');

// G13-1-7: Settings-Subtab-SessionStorage-Gate
const g13_1_7 =
  runtimeSrc.includes("window.sessionStorage.setItem(SETTINGS_SUBTAB_STORAGE_KEY")
  && runtimeSrc.includes("window.sessionStorage.getItem(SETTINGS_SUBTAB_STORAGE_KEY")
  && !runtimeSrc.match(/window\.localStorage\.(setItem|getItem)\(SETTINGS_SUBTAB_STORAGE_KEY/);

// G13-1-8: API-Base-URL-Param-Gate
const g13_1_8 =
  !runtimeSrc.match(/window\.localStorage\.(setItem|getItem)\(API_BASE_STORAGE_KEY/)
  && runtimeSrc.includes("readApiBaseFromQuery()")
  && runtimeSrc.includes("override:url(");

// G13-1-9: Phase-11-HF6-NonRegression-Gate — seen-once retention intact
const g13_1_9 =
  runtimeSrc.includes("activeSeenOneShotRunByTriggerRevision")
  && runtimeSrc.includes("observeGlobalStopRevisions(runtime);")
  && runtimeSrc.includes("observeGlobalClearRevision(runtime);");

// G13-1-10: Phase-12-AdditiveLayering-NonRegression-Gate
const g13_1_10 =
  runtimeSrc.includes("const roomConcurrencyByKey = new Map();")
  && runtimeSrc.includes('ctx.globalCompositeOperation = "lighter";')
  && runtimeSrc.includes("state.runtimePerf.roomConcurrencyByKey = roomConcurrencyByKey;");

// Logger URL param migration
const loggerSrc = readFileSync(
  join(projectRoot, "src/app/shared/logger.js"),
  "utf8",
);
const loggerUrlParam =
  loggerSrc.includes('params.get("logLevel")')
  && !loggerSrc.match(/localStorage\.(getItem|setItem)\(/);

// global-defaults-api.js facade no longer accepts localStorage argument
const facadeSrc = readFileSync(
  join(projectRoot, "src/app/api/global-defaults-api.js"),
  "utf8",
);
const facadeNoLocalStorageArg =
  !facadeSrc.match(/localStorage,\s*\n\s*\}\)/)
  && !facadeSrc.match(/localStorage\.(getItem|setItem)\(/);

// global-config-update receive handler in the websocket onmessage
const broadcastReceiveHandler = runtimeSrc.includes('payload?.type === "global-config-update"');

const output = {
  suite: "P13-1-acceptance-regression",
  phase: "GREEN",
  observed: "PASS",
  hardGates: {
    "G13-1-1-NoLocalStorage-Static": g13_1_1,
    "G13-1-2-Server-Write-Path-With-Broadcast": g13_1_2,
    "G13-1-3-Debounced-Client-Write": g13_1_3,
    "G13-1-4-Blocking-Startup-Error-Banner": g13_1_4,
    "G13-1-5-Save-Load-Buttons-Removed": g13_1_5,
    "G13-1-6-Import-Button-Wired": g13_1_6,
    "G13-1-7-Settings-Subtab-SessionStorage": g13_1_7,
    "G13-1-8-API-Base-URL-Param-Only": g13_1_8,
    "G13-1-9-Phase-11-HF6-NonRegression": g13_1_9,
    "G13-1-10-Phase-12-AdditiveLayering-NonRegression": g13_1_10,
    "G13-1-extra-Logger-URL-Param": loggerUrlParam,
    "G13-1-extra-Facade-No-LocalStorage-Arg": facadeNoLocalStorageArg,
    "G13-1-extra-Broadcast-Receive-Handler": broadcastReceiveHandler,
  },
  localStorageFunctionalReferences: localStorageSites,
  sessionStorageFunctionalReferences: sessionStorageSites,
  indexedDbFunctionalReferences: indexedDbSites,
};

const allPass = Object.values(output.hardGates).every((v) => v === true);
output.observed = allPass ? "PASS" : "FAIL";

writeFileSync(
  new URL("./p13-1-acceptance-regression-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(
  allPass
    ? "PASS - Plan 13-1 server-authoritative config gates closed"
    : `FAIL - ${Object.entries(output.hardGates).filter(([, v]) => !v).map(([k]) => k).join(", ")}`,
);
