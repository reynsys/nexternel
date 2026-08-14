const IP_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

export type NoderedRemapOpts = {
  oldTopicRoots: string[];
  newTopicRoot: string;
  /** Known old Nexternel server IP from operational snapshot only */
  oldServerIp?: string;
  newServerIp: string;
};

function uniqueNonEmpty(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const t = (v ?? "").trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Replace only known Nexternel server IP references in Node-RED exports.
 * Does NOT globally replace arbitrary IP addresses (e.g. Shelly device IPs).
 */
export function remapNoderedServerIp(
  content: string,
  oldServerIp: string,
  newServerIp: string
): string {
  const from = oldServerIp.trim();
  const to = newServerIp.trim();
  if (!from || !to || from === to) return content;

  let text = content;
  text = text.replace(
    new RegExp(`mqtt://${escapeRegExp(from)}(?::\\d+)?`, "g"),
    `mqtt://${to}`
  );
  text = text.replace(
    new RegExp(`("broker"\\s*:\\s*")${escapeRegExp(from)}(")`, "g"),
    `$1${to}$2`
  );
  text = text.replace(
    new RegExp(`(broker\\s*:\\s*")${escapeRegExp(from)}(")`, "g"),
    `$1${to}$2`
  );
  text = text.replace(
    new RegExp(`("host"\\s*:\\s*")${escapeRegExp(from)}(")`, "g"),
    `$1${to}$2`
  );
  return text;
}

export function remapNoderedFileContent(content: string, opts: NoderedRemapOpts): string {
  let text = content;
  const newIp = opts.newServerIp.trim();

  if (opts.oldServerIp?.trim()) {
    text = remapNoderedServerIp(text, opts.oldServerIp, newIp);
  }

  const newRoot = opts.newTopicRoot.trim().replace(/^\/+|\/+$/g, "");
  if (!newRoot) return text;

  for (const oldRoot of uniqueNonEmpty(opts.oldTopicRoots)) {
    if (!oldRoot || oldRoot === newRoot) continue;
    const escaped = escapeRegExp(oldRoot);
    const topicRe = new RegExp(`\\b${escaped}(?=/)`, "g");
    text = text.replace(topicRe, newRoot);
    const marker = `/${oldRoot}/`;
    const replacement = `/${newRoot}/`;
    if (text.includes(marker)) {
      text = text.split(marker).join(replacement);
    }
  }

  return text;
}

export function remapNoderedArchive(
  files: { rel: string; data: Buffer }[],
  opts: NoderedRemapOpts
): { rel: string; data: Buffer }[] {
  return files.map((f) => {
    const name = f.rel.toLowerCase();
    if (!name.endsWith(".json") && !name.endsWith(".js")) {
      return f;
    }
    const text = f.data.toString("utf8");
    const remapped = remapNoderedFileContent(text, opts);
    if (remapped === text) return f;
    return { rel: f.rel, data: Buffer.from(remapped, "utf8") };
  });
}

export function collectOldTopicRoots(
  operationalPrefix: string | undefined,
  domainPrefixes: string[]
): string[] {
  const roots = new Set<string>();
  if (operationalPrefix?.trim()) roots.add(operationalPrefix.trim());
  for (const prefix of domainPrefixes) {
    const parts = prefix.trim().split("/").filter((part) => part.length > 0);
    if (parts.length < 2) continue;
    const root = parts[0];
    if (root && root.toLowerCase() !== "shellies") roots.add(root);
  }
  return Array.from(roots);
}

/** Only the backup installation's server IP — never scan device YAML for arbitrary IPs. */
export function collectOldServerIp(operationalServerIp: string | undefined): string[] {
  const ip = operationalServerIp?.trim();
  return ip ? [ip] : [];
}

/** @deprecated use collectOldServerIp */
export function collectOldBrokerIps(operationalServerIp: string | undefined): string[] {
  return collectOldServerIp(operationalServerIp);
}

export { IP_PATTERN };
