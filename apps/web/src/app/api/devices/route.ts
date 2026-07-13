import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { deviceSlugFromTopicPrefix, slugify } from "@/lib/utils";
import { logActivity } from "@/lib/activity-log";
import { deviceInclude } from "@/lib/device-mqtt";
import { refreshAllDevicesOnlineStatus } from "@/lib/device-status";

export async function GET() {
  try {
    await requireSession();
    await refreshAllDevicesOnlineStatus();
    const devices = await prisma.device.findMany({
      orderBy: { name: "asc" },
      include: deviceInclude,
    });
    return NextResponse.json(devices);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const body = await request.json();
    const {
      name,
      roomId,
      mqttTopicPrefix,
      esphomeName,
      ipAddress,
      sensors = [],
      relays = [],
    } = body;

    if (!name || !mqttTopicPrefix) {
      return NextResponse.json(
        { error: "Name and MQTT topic prefix are required" },
        { status: 400 }
      );
    }

    const slug = deviceSlugFromTopicPrefix(mqttTopicPrefix) || slugify(name);

    const device = await prisma.device.create({
      data: {
        name,
        slug,
        roomId: roomId || null,
        mqttTopicPrefix,
        esphomeName: esphomeName || slug,
        ipAddress: ipAddress || null,
        sensors: {
          create: sensors.map(
            (s: {
              name: string;
              slug: string;
              sensorType: string;
              unit?: string;
              esphomeEntityId: string;
              gpioPin?: number;
            }) => ({
              name: s.name,
              slug: s.slug,
              sensorType: s.sensorType,
              unit: s.unit,
              esphomeEntityId: s.esphomeEntityId,
              gpioPin: s.gpioPin,
              mqttStateTopic: `${mqttTopicPrefix}/sensor/${s.esphomeEntityId}/state`,
            })
          ),
        },
        relays: {
          create: relays.map(
            (r: {
              name: string;
              slug: string;
              esphomeEntityId: string;
              gpioPin?: number;
            }) => ({
              name: r.name,
              slug: r.slug,
              esphomeEntityId: r.esphomeEntityId,
              gpioPin: r.gpioPin,
              mqttCommandTopic: `${mqttTopicPrefix}/switch/${r.esphomeEntityId}/command`,
              mqttStateTopic: `${mqttTopicPrefix}/switch/${r.esphomeEntityId}/state`,
            })
          ),
        },
      },
      include: deviceInclude,
    });

    await logActivity("device", `Device added: ${device.name}`, { deviceId: device.id });
    return NextResponse.json(device, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create device";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
