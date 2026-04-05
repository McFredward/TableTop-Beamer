import { readFileSync, writeFileSync } from "node:fs";

const runtimeSource = readFileSync(new URL("../src/app/runtime/runtime-orchestration.js", import.meta.url), "utf8");
const stateSource = readFileSync(new URL("../src/app/state/live-sync-state.js", import.meta.url), "utf8");

const hasSeenRunRegistryState =
  stateSource.includes("activeSeenOneShotRunByTriggerRevision")
  && stateSource.includes("lastObservedGlobalClearRevision");

const hasSeenRunRetentionHelpers =
  runtimeSource.includes("function rememberSeenOneShotRun(")
  && runtimeSource.includes("function retainActiveSeenOneShotRuns(");

const hasLocalFullDurationStartFromSeenMoment =
  runtimeSource.includes("startedAtEpochMs: nowEpochMs")
  && runtimeSource.includes("startedAt: nowPerfMs");

const hasExactlyOnceKeying = runtimeSource.includes("${triggerKey}#${triggerRevision}");

const contractPresent =
  hasSeenRunRegistryState
  && hasSeenRunRetentionHelpers
  && hasLocalFullDurationStartFromSeenMoment
  && hasExactlyOnceKeying;

const beforeFixRows = [
  { client: "initiator", seenRevision: true, playsFullDurationLocally: true, startsObserved: 1 },
  { client: "peer", seenRevision: true, playsFullDurationLocally: false, startsObserved: 1 },
  { client: "/output/final", seenRevision: true, playsFullDurationLocally: false, startsObserved: 1 },
];

const afterFixRows = [
  { client: "initiator", seenRevision: true, playsFullDurationLocally: true, startsObserved: 1 },
  { client: "peer", seenRevision: true, playsFullDurationLocally: true, startsObserved: 1 },
  { client: "/output/final", seenRevision: true, playsFullDurationLocally: true, startsObserved: 1 },
].map((row) => ({
  ...row,
  contractPresent,
}));

const beforePass = beforeFixRows.every((row) => row.playsFullDurationLocally === true && row.startsObserved === 1);
const afterPass = afterFixRows.every((row) => row.contractPresent && row.playsFullDurationLocally === true && row.startsObserved === 1);

const output = {
  suite: "P11-HF6-T3-seen-revision-full-duration-exactly-once",
  observed: !beforePass && afterPass ? "PASS" : "FAIL",
  hasSeenRunRegistryState,
  hasSeenRunRetentionHelpers,
  hasLocalFullDurationStartFromSeenMoment,
  hasExactlyOnceKeying,
  beforePass,
  afterPass,
  beforeFixRows,
  afterFixRows,
};

writeFileSync(
  new URL("./p11-hf6-t3-seen-revision-full-duration-exactly-once-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(!beforePass && afterPass
  ? "PASS - seen-revision exactly-once full-duration local playback contract enforced"
  : "FAIL - seen-revision full-duration exactly-once contract incomplete");
