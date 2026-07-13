import { NextResponse } from "next/server";
import os from "os";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getServerLanAddresses } from "@/lib/server-lan-ip";
export async function GET() {
  try {
    await requireSession();
    const devices = await prisma.device.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        ipAddress: true,
        macAddress: true,
        isOnline: true,
        lastSeenAt: true,
        mqttTopicPrefix: true,
        room: { select: { name: true } },
      },
    });

    return NextResponse.json({
      server: {
        hostname: os.hostname(),
        addresses: getServerLanAddresses(),
      },
      devices: devices.map((d) => ({
        id: d.id,
        name: d.name,
        slug: d.slug,
        ipAddress: d.ipAddress,
        macAddress: d.macAddress,
        isOnline: d.isOnline,
        lastSeenAt: d.lastSeenAt,
        mqttTopicPrefix: d.mqttTopicPrefix,
        roomName: d.room?.name || null,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
