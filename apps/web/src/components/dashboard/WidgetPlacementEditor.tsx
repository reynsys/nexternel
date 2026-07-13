"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function WidgetPlacementEditor({
  title,
  cell,
  colSpan,
  rowSpan,
  maxColSpan,
  maxRowSpan,
  onApply,
}: {
  title: string;
  cell: string;
  colSpan: number;
  rowSpan: number;
  maxColSpan: number;
  maxRowSpan: number;
  onApply: (patch: {
    title: string | null;
    cell: string;
    colSpan: number;
    rowSpan: number;
  }) => void;
}) {
  const [localTitle, setLocalTitle] = useState(title);
  const [localCell, setLocalCell] = useState(cell);
  const [localColSpan, setLocalColSpan] = useState(colSpan);
  const [localRowSpan, setLocalRowSpan] = useState(rowSpan);

  useEffect(() => {
    setLocalTitle(title);
    setLocalCell(cell);
    setLocalColSpan(colSpan);
    setLocalRowSpan(rowSpan);
  }, [title, cell, colSpan, rowSpan]);

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">Placement</p>
        <Button
          type="button"
          size="sm"
          className="h-7 text-xs"
          onClick={() =>
            onApply({
              title: localTitle.trim() || null,
              cell: localCell.toUpperCase(),
              colSpan: localColSpan,
              rowSpan: localRowSpan,
            })
          }
        >
          Apply
        </Button>
      </div>
      <div>
        <label className="label">Widget title</label>
        <p className="mb-1 text-[10px] text-muted-foreground">
          Optional label on the dashboard grid (not the sensor name).
        </p>
        <input
          className="input"
          value={localTitle}
          onChange={(e) => setLocalTitle(e.target.value)}
          placeholder="Leave blank to use sensor name"
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="label">Cell</label>
          <input
            className="input"
            value={localCell}
            onChange={(e) => setLocalCell(e.target.value.toUpperCase())}
          />
        </div>
        <div>
          <label className="label">W</label>
          <input
            type="number"
            min={1}
            max={maxColSpan}
            className="input"
            value={localColSpan}
            onChange={(e) => setLocalColSpan(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="label">H</label>
          <input
            type="number"
            min={1}
            max={maxRowSpan}
            className="input"
            value={localRowSpan}
            onChange={(e) => setLocalRowSpan(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
