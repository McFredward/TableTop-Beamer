#!/usr/bin/env node

const baseUrl = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";

async function readJson(path) {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`${path} failed (${response.status})`);
  }
  return response.json();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const state = await readJson("/api/live/state");
  const telemetry = await readJson("/api/live/telemetry");
  const defaults = await readJson("/api/global-defaults");
  const boards = await readJson("/api/boards");

  assert(state?.ok === true, "live state unavailable");
  assert(telemetry?.ok === true, "live telemetry unavailable");
  assert(defaults?.schema === "tt-beamer.global-defaults.v1", "global defaults schema changed");
  assert(boards?.schema === "tt-beamer.board-catalog.v1", "board catalog schema changed");

  console.log(JSON.stringify({
    pass: true,
    checks: {
      liveStateSchema: state.session?.snapshot?.schema,
      globalDefaultsSchema: defaults.schema,
      boardCatalogSchema: boards.schema,
      telemetrySchema: telemetry.schema,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ pass: false, error: error.message }, null, 2));
  process.exitCode = 1;
});
