import { prisma } from "@/lib/db";
import { prismaRelayListOrderBy } from "@/lib/relay-order";

export async function getDashboardCatalog() {
  const [sensors, relays, rooms, devices] = await Promise.all([
    prisma.sensor.findMany({
      where: { isEnabled: true, device: { isEnabled: true } },
      include: { device: { include: { room: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.relay.findMany({
      where: { isEnabled: true, device: { isEnabled: true } },
      include: { device: { include: { room: true } } },
      orderBy: prismaRelayListOrderBy,
    }),
    prisma.room.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.device.findMany({
      where: { isEnabled: true },
      include: { room: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    sensors: sensors.map((s) => ({
      id: s.id,
      name: s.name,
      unit: s.unit,
      sensorType: s.sensorType,
      deviceId: s.deviceId,
      deviceName: s.device.name,
      roomName: s.device.room?.name ?? null,
      roomId: s.device.roomId,
    })),
    relays: relays.map((r) => ({
      id: r.id,
      name: r.name,
      deviceId: r.deviceId,
      deviceName: r.device.name,
      roomName: r.device.room?.name ?? null,
      lastState: r.lastState,
      createdAt: r.createdAt.toISOString(),
    })),
    rooms: rooms.map((r) => ({ id: r.id, name: r.name })),
    devices: devices.map((d) => ({
      id: d.id,
      name: d.name,
      roomName: d.room?.name ?? null,
      isOnline: d.isOnline,
    })),
    hasDevices: sensors.length > 0 || relays.length > 0,
  };
}

export type DashboardCatalog = Awaited<ReturnType<typeof getDashboardCatalog>>;
