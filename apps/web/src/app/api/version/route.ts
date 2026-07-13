import { NextResponse } from "next/server";
import { APP_VERSION, VERSION_GENERATION, VERSION_HARDWARE, VERSION_SOFTWARE } from "@/lib/version";

export async function GET() {
  return NextResponse.json({
    version: APP_VERSION,
    generation: VERSION_GENERATION,
    hardware: VERSION_HARDWARE,
    software: VERSION_SOFTWARE,
    features: ["widget-grid", "multi-dashboard", "widget-layout"],
  });
}
