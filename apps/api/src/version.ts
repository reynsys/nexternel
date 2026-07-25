/** Nexternel Backend API — Generation 3 */
export const VERSION_GENERATION = 3;
export const VERSION_HARDWARE = 1;
export const VERSION_SOFTWARE = 52;

export function formatVersion(
  gen = VERSION_GENERATION,
  hw = VERSION_HARDWARE,
  sw = VERSION_SOFTWARE
): string {
  return `V${gen}.${hw}.${String(sw).padStart(3, "0")}`;
}

export const APP_VERSION = formatVersion();
