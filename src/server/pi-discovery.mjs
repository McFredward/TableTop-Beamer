import { execFile } from "node:child_process";
import { randomInt } from "node:crypto";
import { createSocket } from "node:dgram";
import { lookup, reverse } from "node:dns/promises";
import { readFile } from "node:fs/promises";
import { createConnection, isIPv4 } from "node:net";
import { networkInterfaces } from "node:os";
import { promisify } from "node:util";

const run = promisify(execFile);
const PI_MAC = /^(?:28cdc1|2ccf67|88a29e|98fe54|b827eb|d83add|dca632|e45f01|f040af9|8c1f6434a)/i;
export const HOSTNAME = /^[a-z0-9][a-z0-9-]{0,62}$/i;
const number = address => address.split(".").reduce((value, byte) => value * 256 + Number(byte), 0);
const ipv4 = value => [24, 16, 8, 0].map(shift => (value >>> shift) & 255).join(".");
const privateNetwork = ip => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(ip);

export function piNetworks(preferred, interfaces = networkInterfaces()) {
  return Object.entries(interfaces).flatMap(([name, entries]) => entries
    .filter(row => row.family === "IPv4" && !row.internal && isIPv4(row.netmask) && !/^(docker|br-|veth)/i.test(name))
    .map(({ address, netmask }) => {
      const ip = number(address);
      const mask = number(netmask);
      const first = (ip & mask) >>> 0;
      const last = (first | ~mask) >>> 0;
      const includes = candidate => isIPv4(candidate) && number(candidate) !== ip &&
        number(candidate) > first && number(candidate) < last;
      const scanFirst = last - first <= 1023 ? first : (ip & 0xffffff00) >>> 0;
      const scanLast = last - first <= 1023 ? last : scanFirst + 255;
      const nearby = privateNetwork(address)
        ? Array.from({ length: Math.max(0, scanLast - scanFirst - 1) }, (_, i) => ipv4(scanFirst + i + 1)).filter(includes)
        : [];
      return { address, includes, nearby, size: last - first };
    })).sort((a, b) => Number(b.address === preferred) - Number(a.address === preferred) || a.size - b.size);
}

export function piNeighbors(raw) {
  return new Set(raw.split(/\r?\n/).flatMap(line => {
    const address = line.trim().split(/\s+/)[0];
    const mac = line.match(/\b[0-9a-f]{2}(?:[:-][0-9a-f]{2}){5}\b/i)?.[0];
    return isIPv4(address) && mac && PI_MAC.test(mac.replace(/[:-]/g, "")) ? [address] : [];
  }));
}

export async function readPiNeighbors() {
  try {
    const data = process.platform === "linux" ? await readFile("/proc/net/arp", "utf8")
      : (await run(process.platform === "win32" ? "arp.exe" : "arp", ["-a"], { timeout: 1200, windowsHide: true })).stdout;
    return piNeighbors(data);
  } catch {
    return new Set();
  }
}

function nameAt(packet, start) {
  let position = start;
  let end;
  const parts = [];
  for (let steps = 0; steps < 48 && position < packet.length; steps++) {
    const length = packet[position++];
    if (!length) return { name: parts.join("."), offset: end ?? position };
    if ((length & 192) === 192 && position < packet.length) {
      end ??= position + 1;
      position = ((length & 63) << 8) | packet[position];
    } else if (length <= 63 && position + length <= packet.length) {
      parts.push(packet.toString("ascii", position, position + length));
      position += length;
    } else break;
  }
  throw new Error("Invalid mDNS name");
}

function mdnsQuery(network, questions) {
  if (!questions.length) return Promise.resolve([]);
  const id = randomInt(1, 65536);
  const header = Buffer.alloc(12);
  header.writeUInt16BE(id);
  header.writeUInt16BE(questions.length, 4);
  const query = Buffer.concat([header, ...questions.flatMap(([name, type]) => [
    ...name.split(".").map(part => Buffer.concat([Buffer.from([part.length]), Buffer.from(part, "ascii")])),
    Buffer.from([0, 0, type, 0, 1]),
  ])]);
  return new Promise(resolve => {
    const socket = createSocket("udp4");
    const found = [];
    const timer = setTimeout(finish, 850);
    function finish() {
      clearTimeout(timer);
      try { socket.close(); } catch {}
      resolve(found);
    }
    socket.once("error", finish);
    socket.on("message", (packet, peer) => {
      if (!network.includes(peer.address) || packet.length < 12 ||
          packet.readUInt16BE() !== id || !(packet[2] & 128)) return;
      try {
        let offset = 12;
        for (let i = 0; i < packet.readUInt16BE(4); i++) offset = nameAt(packet, offset).offset + 4;
        const records = packet.readUInt16BE(6) + packet.readUInt16BE(8) + packet.readUInt16BE(10);
        for (let i = 0; i < records && offset < packet.length; i++) {
          const owner = nameAt(packet, offset);
          const type = packet.readUInt16BE(owner.offset);
          const length = packet.readUInt16BE(owner.offset + 8);
          const value = owner.offset + 10;
          offset = value + length;
          if (offset > packet.length) break;
          if (!questions.some(([name, code]) => code === type && name.toLowerCase() === owner.name.toLowerCase())) continue;
          if (type === 1 && length === 4) {
            const address = ipv4(packet.readUInt32BE(value));
            if (network.includes(address)) found.push({ address, hostname: owner.name.split(".")[0] });
          }
          if (type === 12) {
            const hostname = nameAt(packet, value).name.split(".")[0];
            if (HOSTNAME.test(hostname)) found.push({ address: peer.address, hostname });
          }
        }
      } catch {
        // Incomplete and unrelated responses can be ignored.
      }
    });
    socket.bind(0, network.address, () => {
      try {
        socket.setMulticastInterface(network.address);
        socket.send(query, 5353, "224.0.0.251", error => { if (error) finish(); });
      } catch {
        finish();
      }
    });
  });
}

async function resolved(operation) {
  let timer;
  try {
    return await Promise.race([operation.catch(() => null), new Promise(resolve => { timer = setTimeout(resolve, 750, null); })]);
  } finally {
    clearTimeout(timer);
  }
}

export async function findPiNames(networks, { hosts = [], peers = [] } = {}) {
  const names = hosts.filter(host => typeof host === "string" && HOSTNAME.test(host));
  const unicast = [
    ...names.map(async hostname => {
      const entry = await resolved(lookup(hostname + ".local", { family: 4 }));
      return entry && { address: entry.address, hostname };
    }),
    ...peers.map(async address => {
      const result = await resolved(reverse(address));
      const hostname = result?.[0]?.split(".")[0];
      return HOSTNAME.test(hostname ?? "") ? { address, hostname } : null;
    }),
  ];
  const multicast = networks.map(network => mdnsQuery(network, [
    ...names.map(hostname => [hostname + ".local", 1]),
    ...peers.filter(network.includes).map(address => [address.split(".").reverse().join(".") + ".in-addr.arpa", 12]),
  ]));
  return (await Promise.all([...unicast, ...multicast])).flat().filter(Boolean);
}

export function probePiSsh(address) {
  return new Promise(resolve => {
    const socket = createConnection({ host: address, port: 22 });
    let banner = "";
    socket.setTimeout(750);
    const finish = result => { socket.destroy(); resolve(result); };
    socket.on("data", chunk => {
      banner += chunk.toString("ascii");
      const line = /^SSH-[^\n]*\n/m.exec(banner)?.[0];
      if (line) finish({ address, raspberry: /raspbian|raspberry/i.test(line) });
      else if (banner.length >= 4096) finish(null);
    });
    for (const event of ["close", "timeout", "error"]) socket.once(event, () => finish(null));
  });
}
