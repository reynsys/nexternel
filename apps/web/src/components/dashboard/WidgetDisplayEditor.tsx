"use client";

import { useEffect, useState } from "react";
import type { WidgetElementId, WidgetType } from "@/types/dashboard";
import { WIDGET_ELEMENT_LABELS } from "@/types/dashboard";

function displayElementLabel(id: WidgetElementId, widgetType: WidgetType): string {
  if (id === "title") {
    if (widgetType === "relay") return "Relay name";
    if (widgetType === "device_sensors") return "Device heading";
    if (widgetType === "device_relays") return "Device heading";
    if (widgetType === "device_status") return "Device title";
    return "Sensor name";
  }
  return WIDGET_ELEMENT_LABELS[id];
}

const ALL_ELEMENTS: WidgetElementId[] = [
  "room_line",
  "device_name",
  "title",
  "value",
  "status",
  "chart_button",
];

export function WidgetDisplayEditor({
  widgetLabel,
  widgetType,
  elements,
  onSave,
  onClose,
  inline = false,
}: {
  widgetLabel: string;
  widgetType: WidgetType;
  elements: WidgetElementId[];
  onSave: (elements: WidgetElementId[]) => void;
  onClose: () => void;
  inline?: boolean;
}) {
  const [localElements, setLocalElements] = useState<WidgetElementId[]>(elements);

  useEffect(() => {
    setLocalElements(elements);
  }, [elements]);

  const available = ALL_ELEMENTS.filter((id) => {
    if (widgetType === "device_status") {
      return id === "title" || id === "value";
    }
    if (widgetType === "relay") {
      return id !== "chart_button" && id !== "room_line";
    }
    return id !== "device_name" || widgetType === "room_sensors";
  });

  function toggle(id: WidgetElementId) {
    setLocalElements((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  }

  function move(id: WidgetElementId, dir: -1 | 1) {
    setLocalElements((prev) => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
  }

  function handleApply() {
    onSave(localElements);
    if (!inline) onClose();
  }

  const shell = inline
    ? "rounded-lg border border-[var(--card-border)] bg-black/20 p-3 text-xs"
    : "absolute inset-0 z-20 flex flex-col overflow-auto rounded-lg border border-[var(--accent)] bg-[var(--card)] p-3 text-xs shadow-xl";

  return (
    <div className={shell}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          {!inline && <p className="font-semibold text-primary">Edit widget layout</p>}
          {inline && <p className="font-semibold">Card content</p>}
          {inline && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Widget title is set under Placement above.
            </p>
          )}
          {!inline && <p className="mt-0.5 text-foreground">{widgetLabel}</p>}
        </div>
        <button type="button" className="btn-primary shrink-0 px-2 py-1 text-xs" onClick={handleApply}>
          Apply
        </button>
      </div>
      <ul className="space-y-1">
        {available.map((id) => {
          const on = localElements.includes(id);
          const idx = localElements.indexOf(id);
          return (
            <li key={id} className="flex items-center gap-2 rounded bg-black/30 px-2 py-1.5">
              <input type="checkbox" checked={on} onChange={() => toggle(id)} />
              <span className="flex-1">{displayElementLabel(id, widgetType)}</span>
              {on && (
                <span className="flex gap-1">
                  <button
                    type="button"
                    className="px-1 hover:text-primary disabled:opacity-30"
                    onClick={() => move(id, -1)}
                    disabled={idx === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="px-1 hover:text-primary disabled:opacity-30"
                    onClick={() => move(id, 1)}
                    disabled={idx === localElements.length - 1}
                  >
                    ↓
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
