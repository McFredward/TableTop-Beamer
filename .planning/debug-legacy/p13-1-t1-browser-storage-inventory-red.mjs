import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const projectRoot = new URL("../", import.meta.url).pathname;
const scanRoots = [
  join(projectRoot, "src/app"),
  join(projectRoot, "src/live"),
  join(projectRoot, "src/app.js"),
];

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

const referenceSites = [];
const patterns = [
  { id: "localStorage", regex: /localStorage/g },
  { id: "sessionStorage", regex: /sessionStorage/g },
  { id: "indexedDB", regex: /indexedDB/g },
  { id: "window.localStorage", regex: /window\.localStorage/g },
  { id: "window.sessionStorage", regex: /window\.sessionStorage/g },
];

for (const root of scanRoots) {
  for (const file of walk(root)) {
    const src = readFileSync(file, "utf8");
    const lines = src.split("\n");
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx += 1) {
      const line = lines[lineIdx];
      for (const pat of patterns) {
        if (pat.regex.test(line)) {
          referenceSites.push({
            file: relative(projectRoot, file),
            line: lineIdx + 1,
            pattern: pat.id,
            content: line.trim().slice(0, 160),
          });
        }
        pat.regex.lastIndex = 0;
      }
    }
  }
}

// Storage keys currently used (from shared/config.js).
const sharedConfig = readFileSync(
  join(projectRoot, "src/app/lib/shared/config.js"),
  "utf8",
);
const storageKeyMatches = [
  ...sharedConfig.matchAll(
    /const\s+([A-Z_]+STORAGE_KEY[A-Z_]*)\s*=\s*"([^"]+)"/g,
  ),
];
const storageKeys = storageKeyMatches.map((m) => ({
  constant: m[1],
  value: m[2],
}));

// Count persistBoardProfiles() call sites in runtime.
const runtimeSrc = readFileSync(
  join(projectRoot, "src/app/runtime/runtime-orchestration.js"),
  "utf8",
);
const persistCallSites = [
  ...runtimeSrc.matchAll(/persistBoardProfiles\s*\(\s*\)/g),
];
const persistCallCount = persistCallSites.length;

// Save button + load button handlers present.
const hasSaveButtonHandler = runtimeSrc.includes(
  'document.querySelector("#save-global-defaults")',
)
  || runtimeSrc.includes('"#save-global-defaults"');
const hasLoadButtonHandler = runtimeSrc.includes(
  '"#load-apply-global-defaults"',
);

// Settings subtab persistence is in runtime.
const hasSettingsSubtabLocalStorage = runtimeSrc.includes(
  "SETTINGS_SUBTAB_STORAGE_KEY",
);

const output = {
  suite: "P13-1-T1-browser-storage-inventory",
  phase: "RED",
  expected: "FAIL",
  observed: referenceSites.length > 0 ? "FAIL" : "INCONCLUSIVE",
  summary: {
    totalReferences: referenceSites.length,
    referencesByFile: Object.fromEntries(
      [...referenceSites.reduce((acc, ref) => {
        acc.set(ref.file, (acc.get(ref.file) || 0) + 1);
        return acc;
      }, new Map())].sort(),
    ),
    referencesByPattern: Object.fromEntries(
      [...referenceSites.reduce((acc, ref) => {
        acc.set(ref.pattern, (acc.get(ref.pattern) || 0) + 1);
        return acc;
      }, new Map())].sort(),
    ),
    storageKeys,
    persistBoardProfilesCallSites: persistCallCount,
    hasSaveButtonHandler,
    hasLoadButtonHandler,
    hasSettingsSubtabLocalStorage,
  },
  checks: [
    {
      id: "baseline-has-localStorage-references",
      expected: true,
      pass: referenceSites.some((r) => r.pattern === "localStorage" || r.pattern === "window.localStorage"),
    },
    {
      id: "baseline-declares-storage-keys-in-shared-config",
      expected: true,
      pass: storageKeys.length >= 5,
    },
    {
      id: "baseline-has-many-persistBoardProfiles-call-sites",
      expected: true,
      pass: persistCallCount >= 40,
    },
    {
      id: "baseline-save-button-handler-present",
      expected: true,
      pass: hasSaveButtonHandler,
    },
    {
      id: "baseline-load-button-handler-present",
      expected: true,
      pass: hasLoadButtonHandler,
    },
    {
      id: "baseline-settings-subtab-localStorage-reference-present",
      expected: true,
      pass: hasSettingsSubtabLocalStorage,
    },
  ],
  referenceSites,
};

writeFileSync(
  new URL("./p13-1-t1-browser-storage-inventory-red-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

const allChecksPass = output.checks.every((c) => c.pass === true);
console.log(
  allChecksPass
    ? `FAIL - RED baseline captured: ${referenceSites.length} browser-storage references across ${Object.keys(output.summary.referencesByFile).length} files, ${persistCallCount} persistBoardProfiles call sites, ${storageKeys.length} storage keys`
    : "INCONCLUSIVE - review baseline checks",
);
