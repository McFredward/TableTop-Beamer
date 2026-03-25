import { readFile } from "node:fs/promises";

const appSource = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
const resolverStart = appSource.indexOf("async function resolveSessionApiCandidates()");
const resolverEnd = appSource.indexOf("function setSessionResolverSnapshot", resolverStart);
const resolverBlock = resolverStart >= 0 && resolverEnd > resolverStart
  ? appSource.slice(resolverStart, resolverEnd)
  : "";

const checks = [
  {
    name: "SESSION_USES_UI_ORIGIN_DEFAULT",
    ok: resolverBlock.includes("source: \"session:ui-origin-default\""),
  },
  {
    name: "SESSION_NO_GLOBAL_PORT_CANDIDATE_DRIFT",
    ok: resolverBlock && !resolverBlock.includes("resolveGlobalDefaultsApiCandidates()"),
  },
  {
    name: "STALE_LOCALSTORAGE_OVERRIDE_CLEARED",
    ok: appSource.includes("clearStaleSessionLocalStorageOverride") && appSource.includes("removeItem(API_BASE_STORAGE_KEY)"),
  },
  {
    name: "DIAG_ENDPOINT_PREFERS_RESOLVED_OR_LAST",
    ok: appSource.includes("state.session.resolvedEndpoint || retry.lastEndpoint || \"\""),
  },
  {
    name: "DIAG_SHOWS_SELECTED_VIA_AND_FALLBACK_REASON",
    ok: appSource.includes("selected via") && appSource.includes("fallback reason"),
  },
];

for (const check of checks) {
  console.log(`${check.name}=${check.ok ? "true" : "false"}`);
}

const failed = checks.filter((check) => !check.ok);
if (failed.length > 0) {
  console.error(`FAILED_CHECKS=${failed.map((entry) => entry.name).join(",")}`);
  process.exit(1);
}
