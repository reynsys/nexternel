import os from "os";

const DOCKER_IFACE = /^(docker|br-|veth|lo|tun|tap|cni|flannel|calico)/i;

/** Docker bridge / compose networks commonly use 172.17–172.31.x.x inside containers. */
function isLikelyDockerBridgeIp(ip: string): boolean {
  const m = ip.match(/^172\.(\d+)\./);
  if (!m) return false;
  const octet = Number(m[1]);
  return octet >= 17 && octet <= 31;
}

function isPrivateIpv4(host: string): boolean {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  if (host.startsWith("192.168.")) return true;
  if (host.startsWith("10.")) return true;
  const m = host.match(/^172\.(\d+)\./);
  if (m) {
    const octet = Number(m[1]);
    return octet >= 16 && octet <= 31;
  }
  return false;
}

function ipFromNextAuthUrl(): string | null {
  const raw = process.env.NEXTAUTH_URL?.trim();
  if (!raw) return null;
  try {
    const host = new URL(raw).hostname;
    return isPrivateIpv4(host) ? host : null;
  } catch {
    return null;
  }
}

function pickLanIpFromInterfaces(): string | null {
  const candidates: { ip: string; score: number }[] = [];

  for (const [name, entries] of Object.entries(os.networkInterfaces())) {
    if (DOCKER_IFACE.test(name)) continue;
    for (const net of entries || []) {
      if (net.family !== "IPv4" || net.internal) continue;
      const ip = net.address;
      if (isLikelyDockerBridgeIp(ip)) continue;

      let score = 0;
      if (ip.startsWith("192.168.")) score += 100;
      else if (ip.startsWith("10.")) score += 80;
      else if (isPrivateIpv4(ip)) score += 40;
      if (/^(eth|enp|ens|eno|wlan|wlp|wl)/i.test(name)) score += 20;

      candidates.push({ ip, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.ip ?? null;
}

/**
 * Host LAN IPv4 for display in widgets.
 * Prefer SERVER_IP from .env (set to your Ubuntu machine's LAN address).
 */
export function getServerLanIp(): string | null {
  const fromEnv = process.env.SERVER_IP?.trim();
  if (fromEnv && isPrivateIpv4(fromEnv)) return fromEnv;

  const fromUrl = ipFromNextAuthUrl();
  if (fromUrl) return fromUrl;

  return pickLanIpFromInterfaces();
}

export function getServerLanAddresses(): string[] {
  const ip = getServerLanIp();
  return ip ? [ip] : [];
}
