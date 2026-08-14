/** Nexternel Backend API — Generation 4 (V4 foundation) */
export const VERSION_GENERATION = 4;
export const VERSION_HARDWARE = 0;
export const VERSION_SOFTWARE = 85;

export function formatVersion(
  gen = VERSION_GENERATION,
  hw = VERSION_HARDWARE,
  sw = VERSION_SOFTWARE
): string {
  return `V${gen}.${hw}.${String(sw).padStart(3, "0")}`;
}

export const APP_VERSION = formatVersion();
