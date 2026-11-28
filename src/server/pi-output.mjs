import { createHash } from "node:crypto";
import { readFile, rename, writeFile, unlink } from "node:fs/promises";
import { createConnection, isIPv4 } from "node:net";
import { userInfo } from "node:os";
import ssh2 from "ssh2";
import { findPiNames, HOSTNAME, piNetworks, probePiSsh, readPiNeighbors } from "./pi-discovery.mjs";
import { isLocalCameraRequest } from "./camera-vision.mjs";

const { Client, utils } = ssh2;

const FINGERPRINT = /^SHA256:[A-Za-z0-9+/]{43}$/;
const USERNAME = /^[a-z0-9_][a-z0-9_.-]{0,31}$/i;
const fingerprintOf = (key) => "SHA256:" + createHash("sha256").update(key).digest("base64").replace(/=+$/, "");

class PiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function isLocalPiRequest(req) {
  if (isLocalCameraRequest(req)) return true;
  const { host, forwarded, "x-forwarded-for": forwardedFor, "x-forwarded-host": forwardedHost } = req.headers;
  const local = req.socket.localAddress?.replace(/^::ffff:/i, "");
  const peer = req.socket.remoteAddress?.replace(/^::ffff:/i, "");
  return !forwarded && !forwardedFor && !forwardedHost && isIPv4(local) && local === peer &&
    (host === local || host === `${local}:${req.socket.localPort}`);
}

function suggestedUsername() {
  try {
    const username = userInfo().username.toLowerCase();
    return USERNAME.test(username) ? username : null;
  } catch {
    return null;
  }
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

function installLaunchKey(client, script, key) {
  const line = 'restrict,command="bash \\"$HOME/.ssh/tt-beamer-output.sh\\" --paired" ' + key;
  const setup = `set -eu
umask 077
mkdir -p "$HOME/.ssh"
chmod u+rwx,go-rwx "$HOME/.ssh"
launcher="$HOME/.ssh/tt-beamer-output.sh"
temp=$(mktemp "$HOME/.ssh/.tt-beamer.XXXXXX")
printf '%s' '${script.toString("base64")}' | base64 -d > "$temp"
mv -f -- "$temp" "$launcher"
keys="$HOME/.ssh/authorized_keys"
touch "$keys"
chmod u+rw,go-rwx "$keys"
entry=$(printf '%s' '${Buffer.from(line).toString("base64")}' | base64 -d)
if ! grep -Fxq -- "$entry" "$keys"; then printf '\\n%s\\n' "$entry" >> "$keys"; fi
`;
  return new Promise(resolve => {
    client.exec("bash -s", (error, channel) => {
      if (error) return resolve(false);
      channel.on("data", () => {});
      channel.stderr.on("data", () => {});
      channel.once("error", () => resolve(false));
      channel.once("close", code => resolve(code === 0));
      channel.end(setup);
    });
  });
}

function startThroughSsh({ address, username, password, privateKey, fingerprint, port, script, issueToken }) {
  return new Promise((resolve, reject) => {
    const client = new Client();
    const socket = createConnection({ host: address, port: 22 });
    let hostMatches = false;
    let settled = false;
    const timer = setTimeout(() => finish(new PiError(504, "The Pi took too long to start the output.")), 26000);
    function finish(error, result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      client.destroy();
      socket.destroy();
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
      const source = socket.localAddress?.replace(/^::ffff:/i, "");
      if (!isIPv4(source)) return finish(new PiError(502, "Could not choose the PC’s address for the Pi."));
      const origin = `http://${source}:${port}`;
      const token = issueToken?.(address);
      const command = privateKey ? "tt-beamer-output" : "bash -s -- --remote";
      client.exec(`${command} ${origin}${token ? ` ${token}` : ""}`, (error, channel) => {
        if (error) return finish(new PiError(502, "Could not start the launcher on the Pi."));
        let stdout = "";
        let stderr = "";
        channel.on("data", data => { stdout = (stdout + data).slice(-4096); });
        channel.stderr.on("data", data => { stderr = (stderr + data).slice(-4096); });
        channel.on("error", () => finish(new PiError(502, "The Pi launcher was interrupted.")));
        channel.once("close", async code => {
          const display = /^Display: (HDMI[-A0-9]+|none)$/m.exec(stdout)?.[1];
          if (code !== 0 || !display) {
            const message = /^TT-Beamer: (.+)$/m.exec(stderr)?.[1] ??
              (stderr.trim().split("\n").at(-1) || "The Pi could not start Chromium in fullscreen.");
            finish(new PiError(502, message));
            return;
          }
          const hostname = /^Host: ([a-z0-9-]+)$/im.exec(stdout)?.[1];
          let launchKey = privateKey;
          if (password && hostname) {
            try {
              const pair = utils.generateKeyPairSync("ed25519", { comment: "tt-beamer-output" });
              if (await installLaunchKey(client, script, pair.public.trim())) launchKey = pair.private;
            } catch {
              // A successful launch can still be repeated using a password.
            }
          }
          finish(null, { display: display === "none" ? null : display, hostname, launchKey });
        });
        channel.end(privateKey ? undefined : script);
      });
    });
    socket.once("error", () => finish(new PiError(502, "No SSH response from the Pi.")));
    socket.once("connect", () => client.connect({
      sock: socket, host: address, username, password, privateKey, readyTimeout: 6000,
      hostVerifier(key) {
        hostMatches = fingerprintOf(key) === fingerprint;
        return hostMatches;
      },
    }));
  });
}

export function createPiOutput({ stateFile, launcherFile, configuredAddress, issueToken,
  networksFor = piNetworks, namesFor = findPiNames, readNeighbors = readPiNeighbors,
  probe = probePiSsh, inspect = inspectHost, start = startThroughSsh }) {
  let searching = false;
  let starting = false;

  async function remembered() {
    try { return JSON.parse(await readFile(stateFile, "utf8")); }
    catch { return null; }
  }

  async function dispatch(body, serverAddress, port) {
    const networks = networksFor(serverAddress);
    if (!networks.length) throw new PiError(503, "Connect the TT-Beamer PC to the Pi’s network and try again.");
    const networkFor = address => networks.find(network => network.includes(address));
    const saved = await remembered();
    const paired = configuredAddress();
    if (body?.action === "find") {
      if (searching) throw new PiError(409, "A Pi search is already running.");
      searching = true;
      try {
        const hosts = [...new Set([saved?.hostname, "raspberrypi"].filter(value => HOSTNAME.test(value ?? "")))];
        const [named, neighbors] = await Promise.all([namesFor(networks, { hosts }), readNeighbors()]);
        const known = new Set([saved?.address, paired, ...named.map(item => item.address), ...neighbors]);
        // Spread the budget across adapters so a VPN or a virtual adapter cannot
        // exhaust it before the physical network is visited.
        const scanNetworks = networks.filter(network => network.nearby.length);
        const perNetwork = Math.floor(1024 / Math.max(1, scanNetworks.length));
        const candidates = [...new Set([...known, ...scanNetworks.flatMap(network => network.nearby.slice(0, perNetwork))])]
          .filter(address => networkFor(address)).slice(0, 1024);
        const ready = [];
        for (let i = 0; i < candidates.length; i += 56) {
          ready.push(...(await Promise.all(candidates.slice(i, i + 56).map(probe))).filter(Boolean));
        }
        const networkHints = await readNeighbors();
        for (const address of neighbors) networkHints.add(address);
        const peers = ready.slice(0, 32).map(item => item.address);
        const discoveredNames = new Map([...await namesFor(networks, { peers }), ...named]
          .map(({ address, hostname }) => [address, hostname]));
        const devices = await Promise.all(ready.slice(0, 32).map(async ({ address, raspberry }) => {
          const hostname = discoveredNames.get(address) ?? (address === saved?.address ? saved.hostname : undefined);
          const piHint = raspberry || networkHints.has(address) || address === paired ||
            named.some(item => item.address === address) || /^raspberrypi(?:[-0-9]*)$/i.test(hostname ?? "");
          const fingerprint = saved?.fingerprint && (piHint || address === saved.address)
            ? await inspect(address).catch(() => null) : null;
          const trusted = Boolean(fingerprint && fingerprint === saved?.fingerprint);
          return { address, hostname, raspberry: piHint || trusted, trusted,
            ...(trusted && { fingerprint, username: saved.username, autoStart: Boolean(saved.launchKey) }) };
        }));
        devices.sort((a, b) => Number(b.trusted) - Number(a.trusted) || Number(b.raspberry) - Number(a.raspberry) ||
          (a.hostname ?? a.address).localeCompare(b.hostname ?? b.address, undefined, { numeric: true }));
        return { devices };
      } finally {
        searching = false;
      }
    }

    const { action, address, username, password, fingerprint } = body ?? {};
    const network = networkFor(address);
    if (!network) throw new PiError(400, "Enter the Pi’s IPv4 address on the same network as this PC.");
    if (action === "identify") {
      const found = await inspect(address);
      const trusted = found === saved?.fingerprint;
      return { fingerprint: found, trusted, username: (trusted ? saved.username : null) ?? suggestedUsername(),
        autoStart: Boolean(trusted && saved.launchKey) };
    }
    const reusable = !password && fingerprint === saved?.fingerprint && saved?.launchKey && USERNAME.test(saved.username);
    if (action !== "start" || (!reusable && (typeof username !== "string" || !USERNAME.test(username) ||
        typeof password !== "string" || !password || password.length > 256)) ||
        typeof fingerprint !== "string" || !FINGERPRINT.test(fingerprint)) {
      throw new PiError(400, "Enter the Pi user name and password after selecting its SSH identity.");
    }
    if (starting) throw new PiError(409, "A Pi launch is already in progress.");
    starting = true;
    try {
      const script = await readFile(launcherFile);
      const user = reusable ? saved.username : username;
      const { launchKey, ...result } = await start({ address, username: user, password: reusable ? undefined : password,
        privateKey: reusable ? saved.launchKey : undefined, fingerprint, issueToken, script, port });
      const temporary = stateFile + ".tmp";
      let rememberedKey = false;
      try {
        await writeFile(temporary, JSON.stringify({ address, username: user, fingerprint,
          hostname: result.hostname ?? saved?.hostname, launchKey }) + "\n", { mode: 0o600 });
        await rename(temporary, stateFile);
        rememberedKey = Boolean(launchKey);
      } catch {
        await unlink(temporary).catch(() => {});
      }
      return { ...result, address, autoStart: rememberedKey };
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
