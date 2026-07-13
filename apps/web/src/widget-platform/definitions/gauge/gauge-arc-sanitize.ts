import type { GaugeDesignConfig, SerializableSubArc } from "@/widget-platform/types";

/** Keep subArc limits inside [minValue, maxValue] for react-gauge-component validateArcs. */
export function clampSubArcLimits(
  subArcs: SerializableSubArc[] | undefined,
  minValue: number,
  maxValue: number
): SerializableSubArc[] | undefined {
  if (!subArcs?.length) return subArcs;
  if (maxValue <= minValue) return subArcs;

  const out: SerializableSubArc[] = [];
  let prevLimit = minValue;

  for (let i = 0; i < subArcs.length; i++) {
    const sub = { ...subArcs[i] };
    if (sub.limit === undefined) {
      out.push(sub);
      continue;
    }

    let limit = Math.min(maxValue, Math.max(minValue, sub.limit));
    if (i > 0 && limit <= prevLimit) {
      const step = (maxValue - minValue) / (subArcs.length + 1);
      limit = Math.min(maxValue, prevLimit + Math.max(step, 0.001));
    }
    if (limit <= minValue && i < subArcs.length - 1) continue;

    if (limit > minValue && limit <= maxValue) {
      sub.limit = limit;
      prevLimit = limit;
      out.push(sub);
    } else if (i === subArcs.length - 1) {
      const { limit: _drop, ...rest } = sub;
      out.push(rest as SerializableSubArc);
    }
  }

  return out.length ? out : [{ color: subArcs[subArcs.length - 1]?.color ?? "#888888" }];
}

export function sanitizeArcForRange(
  arc: GaugeDesignConfig["arc"] | undefined,
  minValue: number,
  maxValue: number
): GaugeDesignConfig["arc"] | undefined {
  if (!arc) return arc;
  if (!arc.subArcs?.length) return arc;
  return {
    ...arc,
    subArcs: clampSubArcLimits(arc.subArcs, minValue, maxValue),
  };
}

/** Gallery cards — clone arc so react-gauge-component cannot mutate catalog presets. */
export function prepareGalleryArc(
  arc: GaugeDesignConfig["arc"] | undefined,
  minValue: number,
  maxValue: number
): GaugeDesignConfig["arc"] | undefined {
  if (!arc) return arc;
  const cloned = JSON.parse(JSON.stringify(arc)) as NonNullable<GaugeDesignConfig["arc"]>;
  if (cloned.nbSubArcs !== undefined && cloned.subArcs?.length) {
    delete cloned.subArcs;
  }
  if (cloned.width !== undefined) {
    cloned.width = Math.min(0.95, Math.max(0.05, cloned.width));
  }
  return sanitizeArcForRange(cloned, minValue, maxValue);
}

export function clampGaugeValue(value: number, minValue: number, maxValue: number): number {
  return Math.min(maxValue, Math.max(minValue, value));
}

export function scaleSubArcLimits(
  arc: GaugeDesignConfig["arc"] | undefined,
  prevMin: number,
  prevMax: number,
  nextMin: number,
  nextMax: number
): GaugeDesignConfig["arc"] | undefined {
  if (!arc?.subArcs?.length) return arc;
  const prevSpan = prevMax - prevMin;
  const nextSpan = nextMax - nextMin;
  if (prevSpan <= 0 || nextSpan <= 0) {
    return sanitizeArcForRange(arc, nextMin, nextMax);
  }

  const scaled = arc.subArcs.map((sub) => {
    if (sub.limit === undefined) return { ...sub };
    const t = (sub.limit - prevMin) / prevSpan;
    return { ...sub, limit: nextMin + t * nextSpan };
  });

  return sanitizeArcForRange({ ...arc, subArcs: scaled }, nextMin, nextMax);
}

export function scaleTickValues(
  tickValues: number[],
  prevMin: number,
  prevMax: number,
  nextMin: number,
  nextMax: number
): number[] {
  const prevSpan = prevMax - prevMin;
  if (prevSpan <= 0) return [nextMin, nextMax];
  return tickValues.map((t) => nextMin + ((t - prevMin) / prevSpan) * (nextMax - nextMin));
}
