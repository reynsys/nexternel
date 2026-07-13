import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

export async function GET() {
  try {
    await requireSession();
    const rooms = await prisma.room.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { devices: true } } },
    });
    return NextResponse.json(rooms);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const { name, description, sortOrder } = await request.json();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const room = await prisma.room.create({
      data: { name, description, sortOrder: sortOrder ?? 0 },
    });
    await logActivity("system", `Area created: ${room.name}`);
    return NextResponse.json(room, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create room";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
