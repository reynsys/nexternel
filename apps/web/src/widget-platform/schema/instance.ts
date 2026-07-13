import { z } from "zod";

const bindingSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("sensor"), sensorId: z.string().min(1) }),
  z.object({ kind: z.literal("none") }),
]);

const gaugeDesignSchema = z
  .object({
    gaugeType: z.enum(["semicircle", "radial", "grafana"]).optional(),
    minValue: z.number().optional(),
    maxValue: z.number().optional(),
    startAngle: z.number().optional(),
    endAngle: z.number().optional(),
    marginInPercent: z.number().min(0).max(0.5).optional(),
    arc: z
      .object({
        width: z.number().min(0.05).max(0.95).optional(),
        padding: z.number().min(0).max(0.25).optional(),
        cornerRadius: z.number().min(0).optional(),
        padEndpoints: z.boolean().optional(),
        nbSubArcs: z.number().int().min(1).max(200).optional(),
        gradient: z.boolean().optional(),
        colorArray: z.array(z.string()).max(20).optional(),
        subArcs: z
          .array(
            z.object({
              limit: z.number().optional(),
              color: z.string(),
              showTick: z.boolean().optional(),
            })
          )
          .max(12)
          .optional(),
        emptyColor: z.string().optional(),
        effects: z
          .object({
            glow: z.boolean().optional(),
            glowBlur: z.number().optional(),
            glowSpread: z.number().optional(),
            innerShadow: z.boolean().optional(),
            dropShadow: z
              .object({
                dy: z.number().optional(),
                blur: z.number().optional(),
                opacity: z.number().optional(),
              })
              .optional(),
          })
          .optional(),
        subArcsStrokeWidth: z.number().optional(),
        subArcsStrokeColor: z.string().optional(),
        outerArc: z
          .object({
            width: z.number().optional(),
            padding: z.number().optional(),
            cornerRadius: z.number().optional(),
          })
          .optional(),
      })
      .passthrough()
      .optional(),
    pointer: z
      .object({
        type: z.enum(["needle", "blob", "arrow"]).optional(),
        color: z.string().optional(),
        baseColor: z.string().optional(),
        length: z.number().min(0.1).max(1.5).optional(),
        width: z.number().min(1).max(80).optional(),
        strokeWidth: z.number().optional(),
        strokeColor: z.string().optional(),
        elastic: z.boolean().optional(),
        animationDuration: z.number().min(0).max(10000).optional(),
        animationDelay: z.number().optional(),
        hide: z.boolean().optional(),
      })
      .optional(),
    pointers: z
      .array(
        z.object({
          value: z.number(),
          type: z.enum(["needle", "blob", "arrow"]).optional(),
          color: z.string().optional(),
          baseColor: z.string().optional(),
          length: z.number().min(0.1).max(1.5).optional(),
          width: z.number().optional(),
          label: z.string().optional(),
        })
      )
      .max(8)
      .optional(),
    labels: z
      .object({
        valueLabel: z
          .object({
            hide: z.boolean().optional(),
            matchColorWithArc: z.boolean().optional(),
            animateValue: z.boolean().optional(),
            fontSize: z.string().optional(),
            offsetX: z.number().optional(),
            offsetY: z.number().optional(),
          })
          .optional(),
        tickLabels: z
          .object({
            type: z.enum(["inner", "outer"]).optional(),
            hideMinMax: z.boolean().optional(),
            tickValues: z.array(z.number()).max(24).optional(),
            tickFontSize: z.number().optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .optional()
  .default({});

const formatSchema = z
  .object({
    unit: z.string().max(16).optional(),
    decimals: z.number().int().min(0).max(4).optional(),
    scale: z.number().optional(),
  })
  .optional();

export const gaugePlatformInstanceSchema = z.object({
  version: z.literal(1),
  definitionId: z.literal("gauge"),
  presetId: z.string().max(64).optional(),
  binding: bindingSchema,
  design: gaugeDesignSchema,
  format: formatSchema,
});

export const widgetPlatformInstanceSchema = gaugePlatformInstanceSchema;

export type ParsedWidgetPlatformInstance = z.infer<typeof widgetPlatformInstanceSchema>;

export function parseWidgetPlatformInstance(
  raw: unknown
): { ok: true; data: ParsedWidgetPlatformInstance } | { ok: false; error: string } {
  const result = widgetPlatformInstanceSchema.safeParse(raw);
  if (!result.success) {
    const msg = result.error.issues.map((i) => i.message).join("; ");
    return { ok: false, error: msg || "Invalid platform config" };
  }
  return { ok: true, data: result.data };
}

export function validateWidgetConfigPlatform(config: { platform?: unknown }): string | null {
  if (config.platform === undefined || config.platform === null) return null;
  const parsed = parseWidgetPlatformInstance(config.platform);
  return parsed.ok ? null : parsed.error;
}
