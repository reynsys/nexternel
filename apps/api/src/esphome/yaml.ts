import { readFile, readdir } from "fs/promises";
import { join } from "path";

export interface EsphomeImportSuggestion {
  esphomeName: string;
  mqttTopicPrefix: string;
  yamlFile: string;
  sensors: {
    name: string;
    slug: string;
    sensorType: string;
    unit?: string;
    esphomeEntityId: string;
  }[];
  relays: {
    name: string;
    slug: string;
    esphomeEntityId: string;
    gpioPin?: number;
  }[];
}

const ESPHOME_DIRS = ["/esphome", join(process.cwd(), "..", "..", "esphome")];

const SKIP_YAML = new Set(["secrets", "packages"]);

/** ESPHome default object_id when `id:` is omitted — slugified name. */
export function esphomeObjectIdFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function resolveSubstitutions(yaml: string): string {
  const subs: Record<string, string> = {};
  const subSection = extractTopLevelSection(yaml, "substitutions");
  if (!subSection) return yaml;

  for (const line of subSection.split(/\r?\n/)) {
    const m = /^\s*(\w+):\s*["']?([^"'\n#]+?)["']?\s*$/.exec(line);
    if (m) subs[m[1]] = m[2].trim();
  }

  let resolved = yaml;
  for (const [key, value] of Object.entries(subs)) {
    resolved = resolved.replaceAll(`\${${key}}`, value);
  }
  return resolved;
}

/** Top-level YAML section body (lines after `key:` until next top-level key). */
export function extractTopLevelSection(yaml: string, key: string): string | null {
  const lines = yaml.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^${key}:\\s*$`).test(line));
  if (start === -1) return null;

  const body: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^[a-zA-Z_][\w-]*:\s*/.test(line)) break;
    body.push(line);
  }
  return body.join("\n");
}

/** Split a YAML list section into one string per `-` list item. */
export function splitYamlListItems(section: string): string[] {
  const items: string[] = [];
  let current: string[] = [];

  for (const line of section.split(/\r?\n/)) {
    if (/^\s*-\s+/.test(line)) {
      if (current.length) items.push(current.join("\n"));
      current = [line.replace(/^\s*-\s+/, "")];
    } else if (current.length && (line.trim() === "" || /^\s+/.test(line))) {
      current.push(line);
    }
  }
  if (current.length) items.push(current.join("\n"));
  return items;
}

function parsePin(block: string): number | undefined {
  const inline = /\bpin:\s*GPIO?(\d+)/i.exec(block);
  if (inline) return Number(inline[1]);
  const nested = /\bnumber:\s*GPIO?(\d+)/i.exec(block);
  if (nested) return Number(nested[1]);
  return undefined;
}

function parseYamlName(block: string): string | undefined {
  const doubleQuoted = /\bname:\s*"([^"]+)"/i.exec(block);
  if (doubleQuoted) return doubleQuoted[1].trim();
  const singleQuoted = /\bname:\s*'([^']+)'/i.exec(block);
  if (singleQuoted) return singleQuoted[1].trim();
  const plain = /\bname:\s*([^\n#]+)/i.exec(block);
  if (plain) return plain[1].trim();
  return undefined;
}

function parseSwitchBlock(block: string): {
  entityId: string;
  name: string;
  gpioPin?: number;
} | null {
  if (!/platform:\s*(gpio|output|inverted_gpio)/i.test(block)) return null;

  const idM = /\bid:\s*(\w+)/i.exec(block);
  const objectIdM = /\bobject_id:\s*(\w+)/i.exec(block);
  const label = parseYamlName(block);
  const outputRef = /\boutput:\s*(\w+)/i.exec(block)?.[1];

  let entityId = idM?.[1] || objectIdM?.[1];

  if (!entityId && label) {
    entityId = esphomeObjectIdFromName(label);
  }
  if (!entityId && outputRef) {
    entityId = outputRef;
  }
  if (!entityId) return null;

  return {
    entityId,
    name: label || entityId.replace(/_/g, " "),
    gpioPin: parsePin(block),
  };
}

function parseSwitchRelays(yaml: string): EsphomeImportSuggestion["relays"] {
  const relays: EsphomeImportSuggestion["relays"] = [];
  const seen = new Set<string>();

  function addRelay(parsed: { entityId: string; name: string; gpioPin?: number }) {
    if (seen.has(parsed.entityId)) return;
    seen.add(parsed.entityId);
    relays.push({
      name: parsed.name,
      slug: parsed.entityId.replace(/_/g, "-"),
      esphomeEntityId: parsed.entityId,
      gpioPin: parsed.gpioPin,
    });
  }

  const switchSection = extractTopLevelSection(yaml, "switch");
  if (switchSection) {
    for (const block of splitYamlListItems(switchSection)) {
      const parsed = parseSwitchBlock(block);
      if (parsed) addRelay(parsed);
    }
  }

  const outputSection = extractTopLevelSection(yaml, "output");
  if (outputSection) {
    for (const block of splitYamlListItems(outputSection)) {
      if (!/platform:\s*gpio/i.test(block)) continue;
      const idM = /\bid:\s*(\w+)/i.exec(block);
      if (!idM) continue;
      const nameM = /\bname:\s*["']?([^"'\n#]+?)["']?/i.exec(block);
      addRelay({
        entityId: idM[1],
        name: nameM?.[1]?.trim() || idM[1].replace(/_/g, " "),
        gpioPin: parsePin(block),
      });
    }
  }

  return relays;
}

/** Best-effort parse of ESPHome YAML for device registration hints. */
export function parseEsphomeYaml(
  yaml: string,
  fallbackName: string,
  yamlFile = fallbackName
): EsphomeImportSuggestion {
  const resolved = resolveSubstitutions(yaml);

  const nameMatch =
    /(?:^|\n)\s*name:\s*["']?([^"'\n${}]+?)["']?\s*$/m.exec(resolved) ||
    /^esphome:\s*\n(?:\s+.+\n)*?\s+name:\s*["']?([^"'\n${}]+)/m.exec(resolved);
  const esphomeName = nameMatch?.[1]?.trim() || fallbackName;

  const prefixMatch = /topic_prefix:\s*["']?([^"'\n${}]+)/m.exec(resolved);
  const mqttTopicPrefix = prefixMatch?.[1]?.trim() || `damnhome/${esphomeName}`;

  const sensors: EsphomeImportSuggestion["sensors"] = [];
  const idBlocks = [...resolved.matchAll(/\s+id:\s*(\w+)\s*\n/g)];
  for (const [, id] of idBlocks) {
    if (id.includes("temperature")) {
      sensors.push({
        name: "Temperature",
        slug: "temperature",
        sensorType: "temperature",
        unit: "°C",
        esphomeEntityId: id,
      });
    } else if (id.includes("humidity")) {
      sensors.push({
        name: "Humidity",
        slug: "humidity",
        sensorType: "humidity",
        unit: "%",
        esphomeEntityId: id,
      });
    }
  }

  const relays = parseSwitchRelays(resolved);

  return { esphomeName, mqttTopicPrefix, yamlFile, sensors, relays };
}

export async function listEsphomeYamlFiles(): Promise<string[]> {
  const names = new Set<string>();
  for (const dir of ESPHOME_DIRS) {
    try {
      const entries = await readdir(dir);
      for (const file of entries) {
        if (!file.endsWith(".yaml")) continue;
        const base = file.replace(/\.yaml$/, "");
        if (SKIP_YAML.has(base)) continue;
        names.add(base);
      }
    } catch {
      /* try next path */
    }
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

export async function loadEsphomeYaml(esphomeName: string): Promise<string | null> {
  const candidates = [
    esphomeName,
    esphomeName.replace(/_/g, "-"),
    esphomeName.replace(/-/g, "_"),
  ];

  for (const base of candidates) {
    const fileName = `${base}.yaml`;
    for (const dir of ESPHOME_DIRS) {
      try {
        return await readFile(join(dir, fileName), "utf8");
      } catch {
        /* try next path */
      }
    }
  }
  return null;
}

/** Load YAML and append any same-folder `!include` files (common in ESPHome builder). */
export async function loadEsphomeYamlMerged(esphomeName: string): Promise<string | null> {
  const base = await loadEsphomeYaml(esphomeName);
  if (!base) return null;

  let merged = base;
  const includes = [
    ...base.matchAll(/!include\s+['"]?([^'"\s#]+\.yaml)['"]?/g),
    ...base.matchAll(/!include\s+['"]?([^'"\s#]+)['"]?/g),
  ];

  for (const [, file] of includes) {
    const stem = file.replace(/\.yaml$/, "");
    const inc = await loadEsphomeYaml(stem);
    if (inc && !merged.includes(inc)) merged += `\n${inc}`;
  }

  return merged;
}

export async function suggestFromEsphome(
  esphomeName: string
): Promise<EsphomeImportSuggestion | null> {
  const yaml = await loadEsphomeYamlMerged(esphomeName);
  if (!yaml) return null;
  return parseEsphomeYaml(yaml, esphomeName, esphomeName);
}

/** Try several file/name variants until YAML loads. */
export async function suggestFromEsphomeCandidates(
  names: string[]
): Promise<EsphomeImportSuggestion | null> {
  const tried = new Set<string>();
  for (const raw of names) {
    if (!raw || tried.has(raw)) continue;
    tried.add(raw);
    const yaml = await loadEsphomeYamlMerged(raw);
    if (!yaml) continue;
    return parseEsphomeYaml(yaml, raw, raw);
  }
  return null;
}
