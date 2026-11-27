import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { readFile, writeFile } from "node:fs/promises";
import { createConnection, isIPv4 } from "node:net";
import { networkInterfaces, userInfo } from "node:os";
import { Client } from "ssh2";

const FINGERPRINT = /^SHA256:[A-Za-z0-9+/]{43}$/;
const USERNAME = /^[a-z0-9_][a-z0-9_.-]{0,31}$/i;
const HOSTNAME = /^[a-z0-9][a-z0-9-]{0,62}$/i;
const ipv4Number = (address) => address.split(".").reduce((n, byte) => n * 256 + Number(byte), 0);
const fingerprintOf = (key) => "SHA256:" + createHash("sha256").update(key).digest("base64").replace(/=+$/, "");

class PiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function adapterNetwork(adapter) {
  const { address } = adapter;
  const ip = ipv4Number(address);
  const mask = ipv4Number(adapter.netmask);
  const network = (ip & mask) >>> 0;
  const broadcast = (network | ~mask) >>> 0;
  return {
    address,
    includes(candidate) {
      if (!isIPv4(candidate)) return false;
      const value = ipv4Number(candidate);
      return value !== ip && value > network && value < broadcast && ((value & mask) >>> 0) === network;
    },
    nearby: Array.from({ length: 254 }, (_, i) => `${address.slice(0, address.lastIndexOf("."))}.${i + 1}`),
  };
}

function localNetworks(preferredAddress) {
  const networks = Object.values(networkInterfaces()).flat()
    .filter(entry => entry.family === "IPv4" && !entry.internal)
    .sort((a, b) => Number(b.address === preferredAddress) - Number(a.address === preferredAddress))
    .map(adapterNetwork);
  if (!networks.length) throw new PiError(503, "Connect the TT-Beamer PC to the Pi’s network and try again.");
  return networks;
}

async function resolvePiAddress(hostname) {
  let timeout;
  try {
    const result = await Promise.race([
      lookup(`${hostname}.local`, { family: 4 }).catch(() => null),
      new Promise(resolve => { timeout = setTimeout(resolve, 800, null); }),
    ]);
    return result?.address;
  } finally {
    clearTimeout(timeout);
  }
}

function suggestedUsername() {
  try {
    const username = userInfo().username.toLowerCase();
    return USERNAME.test(username) ? username : null;
  } catch {
    return null;
  }
}

function hasSsh(address) {
  return new Promise(resolve => {
    const socket = createConnection({ host: address, port: 22 });
    socket.setTimeout(500);
    const finish = (found) => {
      socket.destroy();
      resolve(found);
    };
    socket.once("data", data => finish(data.toString("ascii").startsWith("SSH-")));
    socket.once("close", () => finish(false));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

function inspectHost(address) {
  return new Promise((resolve, reject) => {
    const client = new Client();
    let fingerprint;
    const finish = () => {
      client.destroy();
      if (fingerprint) resolve(fingerprint);
      else reject(new PiError(502, "No SSH response from this address. Check that SSH is enabled on the Pi."));
    };
    client.on("error", finish).once("close", finish).connect({
      host: address, username: "tt-beamer-discovery", readyTimeout: 4000,
      hostVerifier(key) {
        fingerprint = fingerprintOf(key);
        return false;
      },
    });
  });
}

function startThroughSsh({ address, username, password, fingerprint, origin, script, issueToken }) {
  return new Promise((resolve, reject) => {
    const client = new Client();
    let hostMatches = false;
    let settled = false;
    const timer = setTimeout(() => finish(new PiError(504, "The Pi took too long to start the output.")), 26000);
    function finish(error, result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      client.destroy();
      if (error) reject(error);
      else resolve(result);
    }
    client.on("error", error => finish(new PiError(
      error.level === "client-authentication" ? 401 : 502,
      error.level === "client-authentication" ? "SSH sign-in failed. Check the Pi user name and password."
        : hostMatches ? "The SSH connection to the Pi was interrupted."
          : "Could not verify the Pi’s SSH identity. Find the Pi again.",
    )));
    client.once("close", () => finish(new PiError(502, "The Pi closed the SSH connection.")));
    client.once("ready", () => {
      // The origin is generated from the server's local IPv4 and port. The token is a hex string.
      const token = issueToken?.(address);
      client.exec(`bash -s -- --remote ${origin}${token ? ` ${token}` : ""}`, (error, channel) => {
        if (error) return finish(new PiError(502, "Could not start the launcher on the Pi."));
        let stdout = "";
        let stderr = "";
        channel.on("data", data => { stdout = (stdout + data).slice(-4096); });
        channel.stderr.on("data", data => { stderr = (stderr + data).slice(-4096); });
        channel.on("error", () => finish(new PiError(502, "The Pi launcher was interrupted.")));
        channel.once("close", (code) => {
          const display = /^Display: (HDMI[-A0-9]+|none)$/m.exec(stdout)?.[1];
          if (code !== 0 || !display) {
            const message = /^TT-Beamer: (.+)$/m.exec(stderr)?.[1] ??
              (stderr.trim().split("\n").at(-1) || "The Pi could not start Chromium in fullscreen.");
            finish(new PiError(502, message));
            return;
          }
          const hostname = /^Host: ([a-z0-9-]+)$/im.exec(stdout)?.[1];
          finish(null, { display: display === "none" ? null : display, ...(hostname && { hostname }) });
        });
        channel.end(script);
      });
    });
    client.connect({
      host: address, username, password, readyTimeout: 6000,
      hostVerifier(key) {
        hostMatches = fingerprintOf(key) === fingerprint;
        return hostMatches;
      },
    });
  });
}

export function createPiOutput({ stateFile, launcherFile, configuredAddress, issueToken }) {
  let searching = false;
  let starting = false;

  async function remembered() {
    try { return JSON.parse(await readFile(stateFile, "utf8")); }
    catch { return null; }
  }

  async function dispatch(body, serverAddress, port) {
    const networks = localNetworks(serverAddress);
    const networkFor = address => networks.find(network => network.includes(address));
    const saved = await remembered();
    const paired = configuredAddress();
    if (body?.action === "find") {
      if (searching) throw new PiError(409, "A Pi search is already running.");
      searching = true;
      try {
        const hostnames = [...new Set([saved?.hostname, "raspberrypi"].filter(hostname =>
          typeof hostname === "string" && HOSTNAME.test(hostname)))];
        const named = await Promise.all(hostnames.map(resolvePiAddress));
        const preferred = [...new Set([saved?.address, paired, ...named])].filter(address => networkFor(address));
        const reachable = await Promise.all(preferred.map(hasSsh));
        const devices = preferred.filter((_, i) => reachable[i]);
        if (saved?.fingerprint) {
          const trusted = await Promise.all(devices.map(address => inspectHost(address).catch(() => null)));
          const match = devices[trusted.indexOf(saved.fingerprint)];
          if (match) return { devices, preferred: match };
        } else if (devices.length) {
          return { devices, preferred: devices[0] };
        }
        const network = networkFor(saved?.address) ?? networkFor(paired) ?? networks[0];
        const nearby = network.nearby.filter(address => network.includes(address) && !preferred.includes(address));
        for (let i = 0; i < nearby.length; i += 40) {
          const batch = nearby.slice(i, i + 40);
          const results = await Promise.all(batch.map(hasSsh));
          devices.push(...batch.filter((_, j) => results[j]));
        }
        if (saved?.fingerprint) {
          const discovered = devices.filter(address => !preferred.includes(address));
          const fingerprints = await Promise.all(discovered.map(address => inspectHost(address).catch(() => null)));
          const match = discovered[fingerprints.indexOf(saved.fingerprint)];
          if (match) return { devices, preferred: match };
        }
        return { devices, ...(devices.length === 1 && { preferred: devices[0] }) };
      } finally {
        searching = false;
      }
    }

    const { action, address, username, password, fingerprint } = body ?? {};
    const network = networkFor(address);
    if (!network) throw new PiError(400, "Enter the Pi’s IPv4 address on the same network as this PC.");
    if (action === "identify") {
      const found = await inspectHost(address);
      const trusted = found === saved?.fingerprint;
      return { fingerprint: found, trusted, username: (trusted ? saved.username : null) ?? suggestedUsername() };
    }
    if (action !== "start" || typeof username !== "string" || !USERNAME.test(username) ||
        typeof password !== "string" || !password || password.length > 256 ||
        typeof fingerprint !== "string" || !FINGERPRINT.test(fingerprint)) {
      throw new PiError(400, "Enter the Pi user name and password after selecting its SSH identity.");
    }
    if (starting) throw new PiError(409, "A Pi launch is already in progress.");
    starting = true;
    try {
      const script = await readFile(launcherFile);
      const result = await startThroughSsh({ address, username, password, fingerprint, issueToken, script,
        origin: `http://${network.address}:${port}` });
      await writeFile(stateFile, JSON.stringify({ address, username, fingerprint, hostname: result.hostname ?? saved?.hostname }) + "\n", { mode: 0o600 })
        .catch(() => {});
      return { ...result, address };
    } finally {
      starting = false;
    }
  }

  return async (body, serverAddress, port) => {
    try { return { code: 200, body: await dispatch(body, serverAddress, port) }; }
    catch (error) {
      return error instanceof PiError ? { code: error.status, body: { error: error.message } }
        : { code: 500, body: { error: "The TT-Beamer Pi launcher is unavailable." } };
    }
  };
}
