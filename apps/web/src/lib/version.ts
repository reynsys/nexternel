/** VX.Y.Z — X: project generation, Y: hardware revision, Z: software (000+) */
export const VERSION_GENERATION = 2;
export const VERSION_HARDWARE = 1;
export const VERSION_SOFTWARE = 151;

export function formatVersion(
  gen = VERSION_GENERATION,
  hw = VERSION_HARDWARE,
  sw = VERSION_SOFTWARE
): string {
  return `V${gen}.${hw}.${String(sw).padStart(3, "0")}`;
}

export const APP_VERSION = formatVersion();
