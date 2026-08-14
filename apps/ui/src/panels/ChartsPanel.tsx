import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import type { HistoryPoint, HistoryRange, ResolvedPanelCapability } from "../api";
import { api } from "../api";
import { PanelItemGrid } from "../components/PanelItemGrid";
import type { PanelAppearanceLayout } from "../lib/panel-appearance";
import { CapabilityHistoryChart } from "./CapabilityHistoryChart";

const MAX_CHARTS = 12;

const RANGE_LABEL: Record<HistoryRange, string> = {
  "1h": "1h history",
  "6h": "6h history",
  "24h": "24h history",
  "7d": "7d history",
};

type HistoryLoadState = {
  loading: boolean;
  error: string | null;
  points: HistoryPoint[];
};

type Props = {
  capabilities: ResolvedPanelCapability[];
  range: HistoryRange;
  presetId?: string;
  chartMin?: number;
  chartMax?: number;
  layout?: PanelAppearanceLayout;
};

function friendlyHistoryError(message: string): string {
  if (message.includes("HTTP 429")) {
    return "Too many chart requests — wait a moment and refresh";
  }
  return message;
}

export function ChartsPanel({
  capabilities,
  range,
  presetId,
  chartMin,
  chartMax,
  layout = "card",
}: Props) {
  const chartCaps = capabilities.filter((c) => c.kind !== "switch");
  const shown = chartCaps.slice(0, MAX_CHARTS);
  const shownIdsKey = shown.map((c) => c.id).join(",");

  const [historyByCap, setHistoryByCap] = useState<Record<string, HistoryLoadState>>({});

  useEffect(() => {
    if (shown.length === 0) {
      setHistoryByCap({});
      return;
    }

    let cancelled = false;
    const ids = shown.map((c) => c.id);
    setHistoryByCap(
      Object.fromEntries(
        ids.map((id) => [id, { loading: true, error: null, points: [] } satisfies HistoryLoadState])
      )
    );

    void api
      .historyBatch(ids, range)
      .then((batch) => {
        if (cancelled) return;
        const next: Record<string, HistoryLoadState> = {};
        for (const id of ids) {
          const series = batch.series.find((s) => s.capabilityId === id);
          if (!series) {
            next[id] = { loading: false, error: "No data", points: [] };
            continue;
          }
          const err =
            series.error ??
            (series.points.length === 0 ? "No data" : null);
          next[id] = {
            loading: false,
            error: err ? friendlyHistoryError(err) : null,
            points: series.points,
          };
        }
        setHistoryByCap(next);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = friendlyHistoryError(
          err instanceof Error ? err.message : "Failed to load history"
        );
        setHistoryByCap(
          Object.fromEntries(
            ids.map((id) => [id, { loading: false, error: message, points: [] }])
          )
        );
      });

    return () => {
      cancelled = true;
    };
  }, [shownIdsKey, range]);

  const compact = layout === "compact";
  const overflow = chartCaps.length - shown.length;

  if (chartCaps.length === 0) {
    return (
      <Typography color="text.secondary">
        No chartable sensors in this scope. Assign numeric sensors to an Area, then sync
        capabilities.
      </Typography>
    );
  }

  return (
    <PanelItemGrid
      layout={layout}
      rowSize="fluid"
      itemCount={shown.length}
      header={
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            flexShrink: 0,
            mb: 0.75,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontVariantNumeric: "tabular-nums" }}
          >
            {RANGE_LABEL[range]}
          </Typography>
        </Box>
      }
      footer={
        overflow > 0 ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 0.75, display: "block", flexShrink: 0, textAlign: "right" }}
          >
            +{overflow} more sensor(s) not shown — narrow the Area scope.
          </Typography>
        ) : undefined
      }
    >
      {shown.map((cap) => (
        <CapabilityHistoryChart
          key={cap.id}
          capability={cap}
          range={range}
          presetId={presetId}
          chartMin={chartMin}
          chartMax={chartMax}
          compact={compact}
          prefetched={historyByCap[cap.id]}
        />
      ))}
    </PanelItemGrid>
  );
}
