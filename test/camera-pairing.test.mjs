import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCameraPairing, readPairedCameraAddress } from "../src/server/camera-pairing.mjs";

test("one-time pairing records the request's actual IPv4 address and persists it", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "ttb-camera-pair-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, "camera.json");
  const seen = [];
  const pairing = createCameraPairing({ file, setAddress: (address) => seen.push(address) });
  assert.equal(readPairedCameraAddress(file), null);
  const { token } = pairing.issue();
  assert.equal(await pairing.accept("192.0.2.81", "0".repeat(32)), 403);
  assert.equal(await pairing.accept("2001:db8::81", token), 403);
  assert.equal(await pairing.accept("::ffff:192.0.2.81", token), 204);
  assert.equal(await pairing.accept("192.0.2.82", token), 403);
  assert.equal(readPairedCameraAddress(file), "192.0.2.81");
  assert.deepEqual(seen, ["192.0.2.81"]);
});

test("renewing a setup command invalidates the old token and expired tokens can't pair", async () => {
  const fail = () => assert.fail("The rejected tokens must not change the address");
  const pairing = createCameraPairing({ setAddress: fail });
  const first = pairing.issue().token;
  pairing.issue();
  assert.equal(await pairing.accept("192.0.2.81", first), 403);
  const expired = createCameraPairing({ setAddress: fail, lifetimeMs: -1 });
  assert.equal(await expired.accept("192.0.2.81", expired.issue().token), 403);
});
