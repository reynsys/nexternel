import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { config } from "../config.js";
import { exportDomain } from "./domain-export.js";
import { packInnerArchive, sealBackup } from "./format.js";
import {
  backupJobsDir,
  influxBackupCli,
  mosquittoConfigDir,
  noderedDataDir,
} from "./paths.js";
import type { BackupManifest, OperationalBackup } from "./types.js";
import { listFilesRecursive, readFileSafe, writeFileEnsured, ensureDir, isDirectory, listEsphomeFiles } from "../migrate/paths.js";

const execFileAsync = promisify(execFile);

const NODERED_FILES = [
  "flows.json",
  "flows_cred.json",
  "settings.js",
  "package.json",
  ".config.nodes.json",
  ".config.runtime.json",
  ".config.users.json",
];

export type CollectProgress = (phase: string, percent: number, message: string) => void;

function readNoderedFiles(): { rel: string; data: Buffer }[] {
  const root = noderedDataDir();
  if (!isDirectory(root)) return [];
  const out: { rel: string; data: Buffer }[] = [];
  for (const name of NODERED_FILES) {
    const data = readFileSafe(path.join(root, name));
    if (data) out.push({ rel: name, data });
  }
  return out;
}

async function runInfluxBackup(destDir: string): Promise<{ rel: string; data: Buffer }[]> {
  ensureDir(destDir);
  const influx = config.influx();
  const cli = influxBackupCli();
  try {
    await execFileAsync(
      cli,
      [
        "backup",
        destDir,
        "--host",
        influx.url,
        "--token",
        influx.token,
        "--org",
        influx.org,
      ],
      { timeout: 600_000 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Historical data backup failed: ${msg}`);
  }
  const out: { rel: string; data: Buffer }[] = [];
  for (const rel of listFilesRecursive(destDir)) {
    const data = readFileSafe(path.join(destDir, rel));
    if (data) out.push({ rel, data });
  }
  return out;
}

function operationalSnapshot(): OperationalBackup {
  return {
    mqttUsername: config.mqttUsername(),
    mqttPassword: config.mqttPassword(),
    mqttTopicPrefix: process.env.MQTT_TOPIC_PREFIX?.trim() || "nexternel",
    serverIp: config.serverIp() || "",
  };
}

export async function createBackupFile(opts: {
  password: string;
  includeHistory: boolean;
  onProgress?: CollectProgress;
}): Promise<{ buffer: Buffer; filename: string; manifest: BackupManifest }> {
  const progress = opts.onProgress ?? (() => {});
  progress("collecting_home", 5, "Configuration");

  const domain = await exportDomain();
  progress("collecting_home", 20, "Configuration");

  progress("collecting_esphome", 30, "Devices");
  const esphome = listEsphomeFiles();
  progress("collecting_esphome", 40, "Devices");

  progress("collecting_automations", 50, "Automations");
  const nodered = readNoderedFiles();
  progress("collecting_automations", 55, "Automations");

  let influx: { rel: string; data: Buffer }[] = [];
  if (opts.includeHistory) {
    progress("collecting_history", 60, "Historical sensor data");
    const tmpDir = path.join(backupJobsDir(), `influx-${Date.now()}`);
    try {
      influx = await runInfluxBackup(tmpDir);
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
    progress("collecting_history", 75, "Historical sensor data");
  }

  progress("packaging", 80, "Finalising backup");
  const operational = operationalSnapshot();
  const passwd = readMosquittoPasswd();
  const { zipBuffer, manifest } = await packInnerArchive({
    domain,
    esphome,
    nodered,
    influx,
    operational,
    mosquittoPasswd: passwd,
    includeHistory: opts.includeHistory,
    includeAutomations: true,
  });

  progress("encrypting", 90, "Finalising backup");
  const buffer = sealBackup(opts.password, zipBuffer);
  progress("verifying", 95, "Finalising backup");

  const day = manifest.createdAt.slice(0, 10);
  const filename = `nexternel-backup-${day}.nexbackup`;
  progress("ready", 100, "Backup ready");
  return { buffer, filename, manifest };
}

export async function restoreEsphomeFromZip(
  files: { rel: string; data: Buffer }[]
): Promise<number> {
  const root = process.env.BACKUP_ESPHOME_DIR || "/esphome";
  ensureDir(root);
  let count = 0;
  for (const f of files) {
    if (f.rel.includes("..")) continue;
    if (f.rel.includes(".esphome/") || f.rel.endsWith(".bin")) continue;
    const base = path.basename(f.rel).toLowerCase();
    const isYaml = /\.ya?ml$/i.test(f.rel);
    const isSecrets = base === "secrets.yaml" || base === "secrets.yml";
    if (!isYaml && !isSecrets) continue;
    writeFileEnsured(path.join(root, f.rel), f.data);
    count += 1;
  }
  return count;
}

export async function restoreNoderedFromZip(
  files: { rel: string; data: Buffer }[]
): Promise<number> {
  const root = noderedDataDir();
  if (!isDirectory(root)) ensureDir(root);
  let count = 0;
  for (const f of files) {
    if (f.rel.includes("..")) continue;
    writeFileEnsured(path.join(root, f.rel), f.data);
    count += 1;
  }
  return count;
}

export async function restoreInfluxFromZip(
  files: { rel: string; data: Buffer }[]
): Promise<void> {
  if (files.length === 0) return;
  const tmpDir = path.join(backupJobsDir(), `influx-restore-${Date.now()}`);
  ensureDir(tmpDir);
  for (const f of files) {
    if (f.rel.includes("..")) continue;
    writeFileEnsured(path.join(tmpDir, f.rel), f.data);
  }
  const influx = config.influx();
  const cli = influxBackupCli();
  try {
    await execFileAsync(
      cli,
      [
        "restore",
        tmpDir,
        "--full",
        "--host",
        influx.url,
        "--token",
        influx.token,
      ],
      { timeout: 600_000 }
    );
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

export function restoreMosquittoPasswd(passwdContent: Buffer | null): boolean {
  if (!passwdContent?.length) return false;
  const dir = mosquittoConfigDir();
  const passwdPath = path.join(dir, "passwd");
  try {
    ensureDir(dir);
    fs.writeFileSync(passwdPath, passwdContent);
    return true;
  } catch {
    return false;
  }
}

/** Regenerate Mosquitto passwd from username/password (matches generate-mqtt-passwd.sh). */
export async function regenerateMosquittoPasswd(
  username: string,
  password: string
): Promise<boolean> {
  const user = username.trim();
  const pass = password;
  if (!user || !pass) return false;
  const dir = mosquittoConfigDir();
  const passwdPath = path.join(dir, "passwd");
  try {
    ensureDir(dir);
    try {
      fs.unlinkSync(passwdPath);
    } catch {
      /* ignore */
    }
    await execFileAsync(
      "mosquitto_passwd",
      ["-b", "-c", passwdPath, user, pass],
      { timeout: 30_000 }
    );
    return true;
  } catch {
    return false;
  }
}

export function mqttEnvMatchesOperational(operational: OperationalBackup): boolean {
  const envUser = config.mqttUsername();
  const envPass = config.mqttPassword();
  const envPrefix = (process.env.MQTT_TOPIC_PREFIX || "nexternel").trim();
  return (
    operational.mqttUsername === envUser &&
    operational.mqttPassword === envPass &&
    operational.mqttTopicPrefix === envPrefix
  );
}

export function readMosquittoPasswd(): Buffer | null {
  return readFileSafe(path.join(mosquittoConfigDir(), "passwd"));
}

export async function extractZipEntries(
  innerZip: import("jszip"),
  prefix: string
): Promise<{ rel: string; data: Buffer }[]> {
  const out: { rel: string; data: Buffer }[] = [];
  const names = Object.keys(innerZip.files).filter(
    (n) => n.startsWith(prefix) && !innerZip.files[n]!.dir
  );
  for (const name of names) {
    const rel = name.slice(prefix.length);
    if (!rel || rel.includes("..")) continue;
    out.push({ rel, data: await innerZip.files[name]!.async("nodebuffer") });
  }
  return out;
}
