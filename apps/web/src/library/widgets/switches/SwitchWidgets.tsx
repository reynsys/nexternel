"use client";

import type { ComponentType, ReactNode } from "react";
import { Power } from "lucide-react";
import { cn } from "@/lib/utils";
import { RELAY_ICON } from "@/lib/library-icons";
import { useRelayToggle } from "./useRelayToggle";

export type SwitchWidgetProps = {
  relayId: string;
  name: string;
  subtitle?: string | null;
  initialState?: string | null;
  editPreview?: boolean;
};

/** Shared row control — used in single-switch widgets and multi-relay panels. */
export function RelaySwitchRow({
  relayId,
  name,
  subtitle,
  initialState,
  editPreview,
  showIcon = true,
  className,
  compactGrid = false,
}: SwitchWidgetProps & { showIcon?: boolean; className?: string; compactGrid?: boolean }) {
  if (editPreview) {
    return (
      <div className={cn("flex items-center gap-2 rounded-lg border border-border px-2 py-1.5", className)}>
        <Power className="h-4 w-4 shrink-0 text-emerald-600" />
        <span className="min-w-0 flex-1 truncate text-left text-xs font-medium">{name}</span>
        <div className="h-5 w-9 shrink-0 rounded-full bg-emerald-500/80" />
      </div>
    );
  }

  const { isOn, loading, toggle } = useRelayToggle(relayId, initialState);
  const Icon = RELAY_ICON;

  return (
    <div
      className={cn(
        "relay-switch-row flex min-w-0 items-center gap-2 rounded-lg border border-border/60 bg-muted/10 px-2 py-1.5",
        compactGrid && "relay-switch-row--grid-compact flex-col items-center gap-0.5 px-1 py-1",
        className
      )}
    >
      {showIcon && !compactGrid ? (
        <div
          className={cn(
            "relay-switch-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            isOn ? "bg-emerald-500/20 text-emerald-600" : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      ) : null}
      <div className={cn("min-w-0", compactGrid ? "w-full text-center" : "flex-1")}>
        <p
          className={cn(
            "relay-switch-label font-medium leading-tight",
            compactGrid ? "line-clamp-2 text-[9px] leading-snug text-center" : "truncate text-sm"
          )}
          title={name}
        >
          {name}
        </p>
        {subtitle ? (
          <p className="truncate text-[10px] text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={loading}
        className={cn(
          "relay-switch-toggle relative h-6 w-11 shrink-0 rounded-full transition-colors",
          isOn ? "bg-[var(--success)]" : "bg-muted",
          loading && "opacity-50"
        )}
        aria-label={`Toggle ${name}`}
      >
        <span
          data-on={isOn ? "true" : "false"}
          className={cn(
            "relay-switch-toggle-knob absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            isOn ? "left-[1.35rem]" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}

/** Compact vertical ON/OFF — one row per relay in multi-switch panels. */
export function RelayPanelVerticalRow({
  relayId,
  name,
  initialState,
  editPreview,
}: Pick<SwitchWidgetProps, "relayId" | "name" | "initialState" | "editPreview">) {
  if (editPreview) {
    return (
      <div className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5">
        <span className="min-w-0 flex-1 truncate text-[9px]">{name}</span>
        <div className="flex flex-col gap-0.5">
          <div className="h-3 w-7 rounded bg-emerald-500/20 text-center text-[7px] leading-3 text-emerald-700">
            ON
          </div>
          <div className="h-3 w-7 rounded border border-border text-center text-[7px] leading-3 text-muted-foreground">
            OFF
          </div>
        </div>
      </div>
    );
  }

  const { isOn, loading, setRelayState } = useRelayToggle(relayId, initialState);

  return (
    <div className="relay-panel-vertical-row flex min-w-0 items-center gap-1.5 rounded-md border border-border/50 bg-muted/10 px-1.5 py-1">
      <p className="min-w-0 flex-1 truncate text-xs font-medium">{name}</p>
      <div className="flex shrink-0 flex-col gap-0.5">
        <button
          type="button"
          disabled={loading}
          onClick={() => void setRelayState("ON")}
          className={cn(
            "h-5 w-9 rounded border text-[10px] font-semibold leading-none transition-colors",
            isOn
              ? "border-emerald-500 bg-emerald-500/15 text-emerald-700"
              : "border-border bg-muted/20 text-muted-foreground"
          )}
        >
          ON
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void setRelayState("OFF")}
          className={cn(
            "h-5 w-9 rounded border text-[10px] font-semibold leading-none transition-colors",
            !isOn
              ? "border-foreground/30 bg-muted/40 text-foreground"
              : "border-border bg-muted/20 text-muted-foreground"
          )}
        >
          OFF
        </button>
      </div>
    </div>
  );
}

/** Compact horizontal ON | OFF — one row per relay in multi-switch panels. */
export function RelayPanelHorizontalRow({
  relayId,
  name,
  initialState,
  editPreview,
}: Pick<SwitchWidgetProps, "relayId" | "name" | "initialState" | "editPreview">) {
  if (editPreview) {
    return (
      <div className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5">
        <span className="min-w-0 flex-1 truncate text-[9px]">{name}</span>
        <div className="grid grid-cols-2 gap-0.5">
          <div className="rounded bg-emerald-500 px-1 py-0.5 text-[7px] font-bold text-white">ON</div>
          <div className="rounded border border-border px-1 py-0.5 text-[7px] text-muted-foreground">
            OFF
          </div>
        </div>
      </div>
    );
  }

  const { isOn, loading, setRelayState } = useRelayToggle(relayId, initialState);

  return (
    <div className="relay-panel-horizontal-row flex min-w-0 items-center gap-1.5 rounded-md border border-border/50 bg-muted/10 px-1.5 py-1">
      <p className="min-w-0 flex-1 truncate text-xs font-medium">{name}</p>
      <div className="grid shrink-0 grid-cols-2 gap-0.5">
        <button
          type="button"
          disabled={loading}
          onClick={() => void setRelayState("ON")}
          className={cn(
            "h-6 w-8 rounded border text-[10px] font-bold leading-none transition-colors",
            isOn
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-border bg-muted/20 text-muted-foreground"
          )}
        >
          ON
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void setRelayState("OFF")}
          className={cn(
            "h-6 w-8 rounded border text-[10px] font-bold leading-none transition-colors",
            !isOn
              ? "border-foreground/30 bg-muted/40 text-foreground"
              : "border-border bg-muted/20 text-muted-foreground"
          )}
        >
          OFF
        </button>
      </div>
    </div>
  );
}

/** Compact round power button — one row per relay in multi-switch panels. */
export function RelayPanelRoundRow({
  relayId,
  name,
  initialState,
  editPreview,
}: Pick<SwitchWidgetProps, "relayId" | "name" | "initialState" | "editPreview">) {
  if (editPreview) {
    return (
      <div className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5">
        <span className="min-w-0 flex-1 truncate text-[9px]">{name}</span>
        <div className="h-5 w-5 rounded-full border border-emerald-500/50 bg-emerald-500/10" />
      </div>
    );
  }

  const { isOn, loading, toggle } = useRelayToggle(relayId, initialState);
  const Icon = RELAY_ICON;

  return (
    <div className="relay-panel-round-row flex min-w-0 items-center gap-1.5 rounded-md border border-border/50 bg-muted/10 px-1.5 py-1">
      <p className="min-w-0 flex-1 truncate text-xs font-medium">{name}</p>
      <button
        type="button"
        disabled={loading}
        onClick={() => void toggle()}
        className={cn(
          "relay-panel-round-btn flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          isOn
            ? "border-emerald-500 bg-emerald-500/15 text-emerald-600"
            : "border-border bg-muted/30 text-muted-foreground",
          loading && "opacity-50"
        )}
        aria-label={`Toggle ${name}`}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}

function SwitchShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("card flex h-full min-h-0 flex-col overflow-hidden", className)}>
      {children}
    </div>
  );
}

/** Horizontal pill toggle — compact row layout for 1×1 cells. */
export function SwitchPill(props: SwitchWidgetProps) {
  if (props.editPreview) {
    return <SwitchPreview label="Pill toggle" name={props.name} layout="compact" />;
  }
  return (
    <SwitchShell className="justify-center p-2">
      <RelaySwitchRow {...props} />
    </SwitchShell>
  );
}

/** Stacked ON / OFF buttons — suits tall widgets. */
export function SwitchVertical({
  relayId,
  name,
  subtitle,
  initialState,
  editPreview,
}: SwitchWidgetProps) {
  if (editPreview) return <SwitchPreview label="Vertical buttons" name={name} layout="vertical" />;

  const { isOn, loading, setRelayState, state } = useRelayToggle(relayId, initialState);

  return (
    <SwitchShell className="p-2">
      <div className="mb-2 min-w-0 shrink-0 text-center">
        <p className="truncate text-sm font-semibold leading-tight">{name}</p>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
        <p className="mt-0.5 text-xs text-muted-foreground">Status: {state || "—"}</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <div className="switch-vertical-btns flex w-full max-w-[7.5rem] flex-col gap-1.5">
          <button
            type="button"
            disabled={loading}
            onClick={() => void setRelayState("ON")}
            className={cn(
              "h-8 rounded-lg border-2 text-xs font-semibold transition-colors",
              isOn
                ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                : "border-border bg-muted/30 text-muted-foreground hover:border-emerald-500/40"
            )}
          >
            ON
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void setRelayState("OFF")}
            className={cn(
              "h-8 rounded-lg border-2 text-xs font-semibold transition-colors",
              !isOn && state === "OFF"
                ? "border-muted-foreground/50 bg-muted/50 text-foreground"
                : "border-border bg-muted/20 text-muted-foreground hover:border-border"
            )}
          >
            OFF
          </button>
        </div>
      </div>
    </SwitchShell>
  );
}

/** Side-by-side ON | OFF — suits wide widgets. */
export function SwitchHorizontal({
  relayId,
  name,
  subtitle,
  initialState,
  editPreview,
}: SwitchWidgetProps) {
  if (editPreview) return <SwitchPreview label="Horizontal buttons" name={name} layout="horizontal" />;

  const { isOn, loading, setRelayState } = useRelayToggle(relayId, initialState);

  return (
    <SwitchShell className="p-2">
      <div className="mb-2 min-w-0 shrink-0 text-center">
        <p className="truncate text-sm font-semibold leading-tight">{name}</p>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="switch-horizontal-btns grid w-full max-w-[10rem] grid-cols-2 gap-1.5">
          <button
            type="button"
            disabled={loading}
            onClick={() => void setRelayState("ON")}
            className={cn(
              "h-8 rounded-lg border-2 text-xs font-bold transition-colors",
              isOn
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-border bg-muted/20 text-muted-foreground"
            )}
          >
            ON
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void setRelayState("OFF")}
            className={cn(
              "h-8 rounded-lg border-2 text-xs font-bold transition-colors",
              !isOn
                ? "border-foreground/30 bg-muted text-foreground"
                : "border-border bg-muted/20 text-muted-foreground"
            )}
          >
            OFF
          </button>
        </div>
      </div>
    </SwitchShell>
  );
}

/** Large round power button. */
export function SwitchRound({
  relayId,
  name,
  subtitle,
  initialState,
  editPreview,
}: SwitchWidgetProps) {
  if (editPreview) return <SwitchPreview label="Round button" name={name} layout="round" />;

  const { isOn, loading, toggle, state } = useRelayToggle(relayId, initialState);
  const Icon = RELAY_ICON;

  return (
    <SwitchShell className="items-center justify-center gap-1.5 p-2 text-center">
      <p className="w-full break-words text-sm font-semibold leading-tight">{name}</p>
      {subtitle ? (
        <p className="w-full truncate text-xs text-muted-foreground">{subtitle}</p>
      ) : null}
      <button
        type="button"
        disabled={loading}
        onClick={() => void toggle()}
        className={cn(
          "switch-round-btn flex shrink-0 items-center justify-center rounded-full border-4 transition-all",
          isOn
            ? "border-emerald-500 bg-emerald-500/20 text-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.35)]"
            : "border-border bg-muted/40 text-muted-foreground",
          loading && "opacity-50"
        )}
        aria-label={`Toggle ${name}`}
      >
        <Icon className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={2.5} />
      </button>
      <span className={cn("text-xs", isOn ? "badge-online" : "badge-offline")}>{state || "—"}</span>
    </SwitchShell>
  );
}

/** Compact row — icon, name, mini toggle for dense dashboards. */
export function SwitchCompact(props: SwitchWidgetProps) {
  if (props.editPreview) {
    return <SwitchPreview label="Compact switch" name={props.name} layout="compact" />;
  }
  return (
    <SwitchShell className="justify-center p-2">
      <RelaySwitchRow {...props} />
    </SwitchShell>
  );
}

/** Stat card — shows relay status and includes a toggle to control it. */
export function SwitchStatCard({
  relayId,
  name,
  subtitle,
  initialState,
  editPreview,
}: SwitchWidgetProps) {
  if (editPreview) return <SwitchPreview label="Stat card" name={name} layout="stat" />;

  const { isOn, loading, toggle, state } = useRelayToggle(relayId, initialState);
  const Icon = RELAY_ICON;

  return (
    <SwitchShell className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-sm font-medium leading-tight">{name}</p>
          {subtitle ? (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            isOn ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-xl font-semibold tabular-nums">{state || "—"}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">Tap toggle to control relay</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className={isOn ? "badge-online" : "badge-offline"}>
          {isOn ? "Active" : "Inactive"}
        </span>
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={loading}
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-full transition-colors",
            isOn ? "bg-[var(--success)]" : "bg-muted",
            loading && "opacity-50"
          )}
          aria-label={`Toggle ${name}`}
        >
          <span
            className={cn(
              "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
              isOn ? "left-[1.35rem]" : "left-0.5"
            )}
          />
        </button>
      </div>
    </SwitchShell>
  );
}

function SwitchPreview({
  label,
  name,
  layout = "pill",
  devicePanelLayout = "list",
}: {
  label: string;
  name: string;
  layout?: "pill" | "vertical" | "horizontal" | "round" | "compact" | "stat" | "device";
  devicePanelLayout?: "list" | "grid-2" | "vertical" | "horizontal" | "round";
}) {
  const relayNames = ["Relay 1", "Relay 2", "Relay 3", "Relay 4"];

  return (
    <div className="flex h-full w-full flex-col gap-2 p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      {layout === "device" ? (
        <div
          className={cn(
            "flex min-h-0 flex-1 gap-1",
            devicePanelLayout === "grid-2" ? "grid grid-cols-2 content-start" : "flex flex-col"
          )}
        >
          {relayNames.map((r) => {
            if (devicePanelLayout === "vertical") {
              return <RelayPanelVerticalRow key={r} relayId="p" name={r} editPreview />;
            }
            if (devicePanelLayout === "horizontal") {
              return <RelayPanelHorizontalRow key={r} relayId="p" name={r} editPreview />;
            }
            if (devicePanelLayout === "round") {
              return <RelayPanelRoundRow key={r} relayId="p" name={r} editPreview />;
            }
            return (
              <div
                key={r}
                className="flex items-center gap-2 rounded border border-border px-2 py-1"
              >
                <Power className="h-3 w-3 text-emerald-600" />
                <span className="flex-1 text-left text-[10px]">{r}</span>
                <div className="h-4 w-7 rounded-full bg-muted" />
              </div>
            );
          })}
        </div>
      ) : layout === "round" ? (
        <>
          <p className="truncate text-sm font-semibold">{name || "Garden Relay 1"}</p>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-emerald-500/50 bg-emerald-500/10">
            <Power className="h-7 w-7 text-emerald-600" />
          </div>
        </>
      ) : layout === "vertical" ? (
        <div className="mx-auto flex w-full max-w-[6rem] flex-1 flex-col gap-1">
          <div className="h-7 rounded border-2 border-emerald-500/50 bg-emerald-500/10 text-xs font-semibold leading-7 text-emerald-700">
            ON
          </div>
          <div className="h-7 rounded border border-border bg-muted/30 text-xs leading-7 text-muted-foreground">
            OFF
          </div>
        </div>
      ) : layout === "horizontal" ? (
        <div className="mx-auto grid w-full max-w-[8rem] grid-cols-2 gap-1">
          <div className="rounded bg-emerald-500 py-1.5 text-xs font-bold text-white">ON</div>
          <div className="rounded border border-border bg-muted/30 py-1.5 text-xs text-muted-foreground">
            OFF
          </div>
        </div>
      ) : layout === "compact" || layout === "pill" ? (
        <div className="flex w-full items-center gap-2 rounded-lg border border-border px-2 py-1.5">
          <Power className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="min-w-0 flex-1 truncate text-left text-xs">{name || "Relay 1"}</span>
          <div className="h-5 w-9 shrink-0 rounded-full bg-emerald-500/80" />
        </div>
      ) : layout === "stat" ? (
        <div className="w-full rounded-lg border border-border p-2 text-left">
          <p className="text-[9px] text-muted-foreground">Relay status</p>
          <p className="text-lg font-semibold">OFF</p>
          <p className="text-[9px] text-muted-foreground">Tap toggle to control</p>
          <div className="mt-2 h-5 w-10 rounded-full bg-muted" />
        </div>
      ) : null}
    </div>
  );
}

export function SwitchDevicePanelPreview({
  layout,
}: {
  layout: "list" | "grid-2" | "vertical" | "horizontal" | "round";
}) {
  const labels: Record<typeof layout, string> = {
    list: "Device panel (list)",
    "grid-2": "Device panel (grid)",
    vertical: "Device panel (vertical)",
    horizontal: "Device panel (horizontal)",
    round: "Device panel (round)",
  };
  return (
    <SwitchPreview
      label={labels[layout]}
      name="Garden Relays"
      layout="device"
      devicePanelLayout={layout}
    />
  );
}

export const SWITCH_LIBRARY_RENDERERS: Record<string, ComponentType<SwitchWidgetProps>> = {
  "switch-pill": SwitchPill,
  "switch-vertical": SwitchVertical,
  "switch-horizontal": SwitchHorizontal,
  "switch-round": SwitchRound,
  "switch-compact": SwitchCompact,
  "switch-stat-card": SwitchStatCard,
};

export function suggestRelayPanelSize(
  _relayCount?: number,
  _layout?: "list" | "grid-2"
): { colSpan: number; rowSpan: number } {
  return { colSpan: 1, rowSpan: 1 };
}
