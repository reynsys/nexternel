import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

export async function GET() {
  try {
    await requireSession();
    const automations = await prisma.automation.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(automations);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const body = await request.json();
    const { name, description, triggerType, triggerConfig, actionType, actionConfig } = body;

    if (!name || !triggerType || !actionType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const automation = await prisma.automation.create({
      data: {
        name,
        description,
        triggerType,
        triggerConfig: triggerConfig || {},
        actionType,
        actionConfig: actionConfig || {},
      },
    });
    await logActivity("system", `Automation created: ${automation.name}`, {
      automationId: automation.id,
    });
    return NextResponse.json(automation, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create automation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
