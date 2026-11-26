import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { rename, unlink, writeFile } from "node:fs/promises";
import { isIPv4 } from "node:net";

const CODE_LIFETIME_MS = 5 * 60 * 1000;

export function readPairedCameraAddress(file) {
  try {
    const { address } = JSON.parse(readFileSync(file, "utf8"));
    return isIPv4(address) ? address : null;
  } catch {
    return null;
  }
}

export function createCameraPairing({ file, setAddress, lifetimeMs = CODE_LIFETIME_MS }) {
  let invitation;
  let saving = false;

  return {
    issue() {
      const secret = randomBytes(16);
      const expiresAt = Date.now() + lifetimeMs;
      invitation = { secret, deadline: performance.now() + lifetimeMs };
      return { token: secret.toString("hex"), expiresAt };
    },

    async accept(remoteAddress, token) {
      const address = remoteAddress?.replace(/^::ffff:/i, "");
      if (!isIPv4(address) || typeof token !== "string" || !/^[0-9a-f]{32}$/.test(token) ||
          !invitation || performance.now() >= invitation.deadline ||
          !timingSafeEqual(invitation.secret, Buffer.from(token, "hex"))) return 403;
      if (saving) return 409;

      const accepted = invitation;
      const temporaryFile = `${file}.${randomBytes(8).toString("hex")}.tmp`;
      saving = true;
      try {
        await writeFile(temporaryFile, JSON.stringify({ address }, null, 2) + "\n", { mode: 0o600, flag: "wx" });
        await rename(temporaryFile, file);
        if (invitation === accepted) invitation = null;
        setAddress(address);
        return 204;
      } catch (error) {
        await unlink(temporaryFile).catch(() => {});
        console.warn("[camera-pairing] could not save camera address:", error.message);
        return 500;
      } finally {
        saving = false;
      }
    },
  };
}
