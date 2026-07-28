import fs from "fs";
import path from "path";

/** Host / container paths for config export & adopt. */
export function backupPaths() {
  return {
    esphome: process.env.BACKUP_ESPHOME_DIR || "/esphome",
  };
}

export function pathExists(p: string): boolean {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

export function isDirectory(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** Recursively list files under root as posix-relative paths. */
export function listFilesRecursive(root: string): string[] {
  if (!isDirectory(root)) return [];
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of fs.readdirSync(dir)) {
      if (name === "." || name === "..") continue;
      const full = path.join(dir, name);
      let st: fs.Stats;
      try {
        st = fs.statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(full);
      else if (st.isFile()) {
        out.push(path.relative(root, full).split(path.sep).join("/"));
      }
    }
  };
  walk(root);
  return out;
}

export function readFileSafe(filePath: string): Buffer | null {
  try {
    return fs.readFileSync(filePath);
  } catch {
    return null;
  }
}

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function writeFileEnsured(filePath: string, data: Buffer | string) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, data);
}
