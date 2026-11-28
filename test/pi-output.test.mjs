import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { piNeighbors, piNetworks } from "../src/server/pi-discovery.mjs";
import { createPiOutput, isLocalPiRequest } from "../src/server/pi-output.mjs";

test("Pi discovery uses the interface netmask and reads Windows and Linux neighbor records", () => {
  const interfaceAddress = { address: "192.168.2.80", family: "IPv4", netmask: "255.255.254.0", internal: false };
  const [network] = piNetworks(interfaceAddress.address, { Ethernet: [interfaceAddress] });
  assert.equal(network.nearby.length, 509);
  assert.ok(network.includes("192.168.3.40"));
  assert.ok(!network.includes("192.168.4.40"));
  const table = [
    "  192.168.2.20   88-a2-9e-12-34-56   dynamic",
    "192.168.3.40    0x1   0x2   dc:a6:32:78:9a:bc   *   eth0",
    "  192.168.2.2    00-11-22-33-44-55   dynamic",
  ].join("\n");
  assert.deepEqual([...piNeighbors(table)], ["192.168.2.20", "192.168.3.40"]);
});

test("the Pi launcher accepts the server's own dashboard address and rejects network peers", () => {
  const headers = { host: "192.168.2.80:4173" };
  const socket = { localAddress: "::ffff:192.168.2.80", remoteAddress: "::ffff:192.168.2.80", localPort: 4173 };
  assert.ok(isLocalPiRequest({ headers, socket }));
  assert.ok(!isLocalPiRequest({ headers, socket: { ...socket, remoteAddress: "192.168.2.81" } }));
  assert.ok(!isLocalPiRequest({ headers: { ...headers, forwarded: "for=192.168.2.81" }, socket }));
  assert.ok(!isLocalPiRequest({ headers: { host: "anywhere.example:4173" }, socket }));
});

test("named Pis are selectable and a paired Pi can start at its new address", async t => {
  const folder = await mkdtemp(join(tmpdir(), "ttb-pi-test-"));
  t.after(() => rm(folder, { recursive: true, force: true }));
  const launcherFile = join(folder, "launcher.sh");
  const stateFile = join(folder, "state.json");
  await writeFile(launcherFile, "#!/bin/bash\n");
  const hosts = {
    "192.168.2.20": { hostname: "projector-flat", fingerprint: "SHA256:" + "a".repeat(43) },
    "192.168.3.40": { hostname: "playroom", fingerprint: "SHA256:" + "b".repeat(43) },
  };
  const requests = [];
  const pi = createPiOutput({
    launcherFile,
    stateFile,
    configuredAddress: () => undefined,
    networksFor: () => [{ includes: host => /^192\.168\.(2|3)\.\d+$/.test(host), nearby: Object.keys(hosts) }],
    namesFor: (_networks, { peers = [] }) => peers.map(address => ({ address, hostname: hosts[address].hostname })),
    readNeighbors: () => new Set(Object.keys(hosts)),
    probe: address => hosts[address] && { address, raspberry: false },
    inspect: address => Promise.resolve(hosts[address]?.fingerprint),
    start: async request => {
      requests.push(request);
      return { hostname: hosts[request.address].hostname, display: "HDMI-1", launchKey: "fixture-key" };
    },
  });
  async function send(body) {
    const response = await pi(body, "192.168.2.80", 4173);
    assert.equal(response.code, 200, response.body.error);
    return response.body;
  }
  const { devices } = await send({ action: "find" });
  assert.deepEqual(devices.map(device => device.hostname), ["playroom", "projector-flat"]);
  assert.ok(devices.every(device => device.raspberry && !device.trusted));
  const first = devices.find(device => device.hostname === "projector-flat").address;
  const { fingerprint } = await send({ action: "identify", address: first });
  const result = await send({ action: "start", address: first, username: "player", password: "fixture-password", fingerprint });
  assert.equal(result.autoStart, true);
  const saved = JSON.parse(await readFile(stateFile, "utf8"));
  assert.equal(saved.password, undefined);
  assert.equal(result.launchKey, undefined);
  assert.equal(requests[0].port, 4173);

  const moved = "192.168.3.41";
  hosts[moved] = hosts[first];
  delete hosts[first];
  const changed = (await send({ action: "find" })).devices[0];
  assert.equal(changed.address, moved);
  assert.equal(changed.trusted, true);
  assert.equal(changed.autoStart, true);
  await send({ action: "start", address: moved, fingerprint });
  assert.equal(requests[1].privateKey, "fixture-key");
  assert.equal(requests[1].password, undefined);
});
