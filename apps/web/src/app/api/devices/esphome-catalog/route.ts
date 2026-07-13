import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { listEsphomeYamlFiles, suggestFromEsphome } from "@/lib/esphome-yaml";

/** Lists ESPHome YAML configs on the server and whether each is registered in Nexternel. */
export async function GET() {
  try {
    await requireSession();
    const files = await listEsphomeYamlFiles();
    const registered = await prisma.device.findMany({
      select: { esphomeName: true, slug: true, mqttTopicPrefix: true },
    });

    const configs = await Promise.all(
      files.map(async (fileName) => {
        const suggestion = await suggestFromEsphome(fileName);
        const esphomeName = suggestion?.esphomeName || fileName;
        const mqttTopicPrefix = suggestion?.mqttTopicPrefix || `damnhome/${fileName}`;
        const isRegistered = registered.some(
          (d) =>
            d.esphomeName === esphomeName ||
            d.esphomeName === fileName ||
            d.slug === fileName ||
            d.mqttTopicPrefix === mqttTopicPrefix
        );

        return {
          fileName,
          esphomeName,
          mqttTopicPrefix,
          registered: isRegistered,
          sensorCount: suggestion?.sensors.length ?? 0,
          relayCount: suggestion?.relays.length ?? 0,
          suggestion,
        };
      })
    );

    return NextResponse.json({
      configs,
      esphomeDirHint:
        files.length === 0
          ? "No YAML files found in /esphome — create a device in ESPHome Builder first, then upload or sync the esphome/ folder to the server."
          : null,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
