import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

// POST /api/reflections — Save a reflection response
export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const { nodeId, responseText, scenarioId } = body;

  if (!nodeId || !responseText) {
    return NextResponse.json(
      { error: "nodeId and responseText are required" },
      { status: 400 }
    );
  }

  const reflection = await prisma.reflectionResponse.create({
    data: {
      userId: session!.user.id,
      nodeId,
      responseText,
    },
  });

  // Log event
  await prisma.eventLog.create({
    data: {
      userId: session!.user.id,
      eventType: "reflection_submitted",
      scenarioId: scenarioId || null,
      metadata: { nodeId, charCount: responseText.length },
    },
  });

  return NextResponse.json(reflection, { status: 201 });
}
