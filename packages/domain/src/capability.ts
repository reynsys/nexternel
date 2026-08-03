import { z } from "zod";

/** Extensible capability kinds — UI renders from these, not device manufacturers. */
export const CAPABILITY_KINDS = [
  "temperature",
  "humidity",
  "pressure",
  "battery",
  "voltage",
  "current",
  "power",
  "energy",
  "co2",
  "pm1",
  "pm25",
  "pm10",
  "number",
  "switch",
  "brightness",
  "colour",
  "motion",
  "door",
  "lock",
  "camera",
  "alarm",
  "weather",
  "gps",
  "binary_sensor",
  "enum",
  "text",
  "json",
] as const;

export type CapabilityKind = (typeof CAPABILITY_KINDS)[number];

export const CapabilityKindSchema = z.enum(CAPABILITY_KINDS);

export const CapabilityQualitySchema = z.enum([
  "good",
  "stale",
  "unknown",
  "error",
]);

export type CapabilityQuality = z.infer<typeof CapabilityQualitySchema>;

/** Live or snapshot state for one capability. */
export const CapabilityStateSchema = z.object({
  value: z.unknown().nullable(),
  unit: z.string().optional(),
  quality: CapabilityQualitySchema.default("unknown"),
  updatedAt: z.string().datetime().optional(),
});

export type CapabilityState = z.infer<typeof CapabilityStateSchema>;

/** Metadata for a capability (config plane — PostgreSQL). */
export const CapabilityMetaSchema = z.object({
  id: z.string().uuid(),
  deviceId: z.string().uuid(),
  kind: CapabilityKindSchema,
  name: z.string().min(1),
  unit: z.string().optional(),
});

export type CapabilityMeta = z.infer<typeof CapabilityMetaSchema>;
