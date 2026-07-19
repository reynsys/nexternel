"use client";

import { cn } from "@/lib/utils";
import { WidgetTitleBar } from "@/components/dashboard/WidgetTitleBar";
import { useRelayToggle } from "@/library/widgets/switches/useRelayToggle";

interface RelayCardProps {
  relayId: string;
  name: string;
  deviceName: string;
  roomName?: string | null;
  initialState?: string | null;
}

export function RelayCard({
  relayId,
  name,
  roomName,
  initialState,
  rowSpan = 1,
}: RelayCardProps & { rowSpan?: number }) {
  const { isOn, loading, toggle, state } = useRelayToggle(relayId, initialState);

  return (
    <div
      className={cn(
        "card flex h-full min-h-0 flex-col text-left",
        rowSpan > 1 ? "justify-center" : "justify-start"
      )}
    >
      {/* Same title chrome as other widgets — room as trailing, not a second header line */}
      <WidgetTitleBar
        title={name}
        trailing={
          roomName ? (
            <span className="truncate text-[10px] leading-none text-muted-foreground">
              {roomName}
            </span>
          ) : null
        }
      />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-center">
        <span className={isOn ? "badge-online" : "badge-offline"}>{state || "Unknown"}</span>
        <button
          onClick={() => void toggle()}
          disabled={loading}
          className={`relative h-8 w-16 shrink-0 rounded-full transition-colors ${
            isOn ? "bg-[var(--success)]" : "bg-muted"
          } ${loading ? "opacity-50" : ""}`}
          aria-label={`Toggle ${name}`}
        >
          <span
            className={`absolute top-0.5 h-7 w-7 rounded-full bg-white shadow transition-transform ${
              isOn ? "left-8" : "left-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
