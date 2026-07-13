import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getLatestReading, getReadingHistory } from "@/lib/influx";

// History endpoint: GET /api/readings?sensorId=...&hours=24

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const sensorId = searchParams.get("sensorId");
    const hours = parseInt(searchParams.get("hours") || "24", 10);

    if (!sensorId) {
      return NextResponse.json({ error: "sensorId is required" }, { status: 400 });
    }

    const sensor = await prisma.sensor.findUnique({
      where: { id: sensorId },
      include: { device: true },
    });

    if (!sensor) {
      return NextResponse.json({ error: "Sensor not found" }, { status: 404 });
    }

    const entityId = sensor.esphomeEntityId || sensor.slug;
    const deviceSlug = sensor.device.slug;

    const [latest, history] = await Promise.all([
      getLatestReading(deviceSlug, entityId),
      getReadingHistory(deviceSlug, entityId, hours),
    ]);

    return NextResponse.json({
      sensorId: sensor.id,
      name: sensor.name,
      unit: sensor.unit,
      latest: latest?.value ?? null,
      updatedAt: latest?.time ?? null,
      history,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
