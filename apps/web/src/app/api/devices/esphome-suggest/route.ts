import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { suggestFromEsphome } from "@/lib/esphome-yaml";

/** Preview sensors/relays from an ESPHome YAML before registering the device. */
export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const name = request.nextUrl.searchParams.get("name");
    if (!name) {
      return NextResponse.json({ error: "name query parameter is required" }, { status: 400 });
    }

    const suggestion = await suggestFromEsphome(name);
    if (!suggestion) {
      return NextResponse.json(
        {
          error: `Could not read esphome/${name}.yaml. Ensure the file exists in the server's esphome/ folder (same files ESPHome Builder uses).`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(suggestion);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
