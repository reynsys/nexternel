import path from "path";
import {
  backupPaths,
  isDirectory,
  listFilesRecursive,
  pathExists,
  readFileSafe,
} from "../backup/paths.js";

/** ESPHome dir used for config export/adopt (same mount as backup paths). */
export function esphomeDir(): string {
  return backupPaths().esphome;
}

export function listEsphomeFiles(): { rel: string; data: Buffer }[] {
  const root = esphomeDir();
  if (!isDirectory(root)) return [];
  const out: { rel: string; data: Buffer }[] = [];
  for (const rel of listFilesRecursive(root)) {
    // Skip compiled/cache junk
    if (rel.includes(".esphome/") || rel.endsWith(".bin")) continue;
    const data = readFileSafe(path.join(root, rel));
    if (data) out.push({ rel, data });
  }
  return out;
}

export { pathExists, isDirectory, writeFileEnsured, ensureDir } from "../backup/paths.js";
