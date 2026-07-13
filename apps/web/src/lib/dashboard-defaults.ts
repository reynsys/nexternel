import { Prisma } from "@prisma/client";
import { formatCellAddress } from "./grid";

type SensorRow = {
  id: string;
  name: string;
  device: { roomId: string | null; room: { name: string } | null };
};

type RelayRow = {
  id: string;
  name: string;
};

export function buildDefaultWidgets(
  sensors: SensorRow[],
  relays: RelayRow[],
  columns: number,
  rows: number
): Prisma.DashboardWidgetCreateWithoutLayoutInput[] {
  const widgets: Prisma.DashboardWidgetCreateWithoutLayoutInput[] = [];
  let col = 0;
  let row = 0;

  const roomIds = Array.from(
    new Set(
      sensors
        .map((s) => s.device.roomId)
        .filter((id): id is string => id !== null)
    )
  );
  if (roomIds.length > 0) {
    const roomId = roomIds[0];
    const roomName = sensors.find((s) => s.device.roomId === roomId)?.device.room?.name ?? "Room";
    const roomSensorIds = sensors.filter((s) => s.device.roomId === roomId).map((s) => s.id);
    widgets.push({
      type: "room_sensors",
      title: roomName,
      cell: "A1",
      colSpan: Math.min(2, columns),
      rowSpan: 1,
      config: { roomId, sensorIds: roomSensorIds },
    });
    col = 2;
  }

  sensors.forEach((sensor, i) => {
    if (widgets.some((w) => w.type === "room_sensors" && (w.config as { sensorIds?: string[] }).sensorIds?.includes(sensor.id))) {
      return;
    }
    const cell = formatCellAddress(col, row);
    if (col + 1 > columns) {
      col = 0;
      row += 1;
    }
    const c = formatCellAddress(col, row);
    if (row >= rows) return;
    widgets.push({
      type: "sensor",
      title: sensor.name,
      cell: c,
      colSpan: 1,
      rowSpan: 1,
      config: { sensorId: sensor.id },
    });
    col += 1;
    if (col >= columns) {
      col = 0;
      row += 1;
    }
  });

  relays.forEach((relay) => {
    if (row >= rows) return;
    const c = formatCellAddress(col, row);
    widgets.push({
      type: "relay",
      title: relay.name,
      cell: c,
      colSpan: 1,
      rowSpan: 1,
      config: { relayId: relay.id },
    });
    col += 1;
    if (col >= columns) {
      col = 0;
      row += 1;
    }
  });

  const statusRow = Math.min(2, rows - 1);
  widgets.push({
    type: "device_status",
    title: "Devices",
    cell: formatCellAddress(0, statusRow),
    colSpan: Math.min(columns, 2),
    rowSpan: 1,
    config: {},
  });

  return widgets;
}
