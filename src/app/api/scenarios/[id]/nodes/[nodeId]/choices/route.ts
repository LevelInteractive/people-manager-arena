import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

// POST /api/scenarios/[id]/nodes/[nodeId]/choices — Add choice to a node
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; nodeId: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const {
    choiceText, nextNodeId, explanationText,
    q12Impact, pointsBase, coreValueAlignment,
    keyBehaviorsPositive, keyBehaviorsNegative,
  } = body;

  if (!choiceText || !explanationText) {
    return NextResponse.json(
      { error: "Missing required fields: choiceText, explanationText" },
      { status: 400 }
    );
  }

  const choice = await prisma.choice.create({
    data: {
      nodeId: params.nodeId,
      choiceText,
      nextNodeId: nextNodeId || null,
      explanationText,
      q12Impact: q12Impact || 0,
      pointsBase: pointsBase || 0,
      coreValueAlignment: coreValueAlignment || {},
    },
  });

  // Create behavior links
  if (keyBehaviorsPositive?.length) {
    await prisma.choiceKeyBehavior.createMany({
      data: keyBehaviorsPositive.map((bId: number) => ({
        choiceId: choice.id,
        keyBehaviorId: bId,
        impact: "POSITIVE" as const,
      })),
    });
  }

  if (keyBehaviorsNegative?.length) {
    await prisma.choiceKeyBehavior.createMany({
      data: keyBehaviorsNegative.map((bId: number) => ({
        choiceId: choice.id,
        keyBehaviorId: bId,
        impact: "NEGATIVE" as const,
      })),
    });
  }

  return NextResponse.json(choice, { status: 201 });
}
