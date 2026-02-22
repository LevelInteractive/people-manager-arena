import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

// POST /api/scenarios/[id]/nodes — Add a node to a scenario (admin)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { nodeType, contentText, orderIndex } = body;

  if (!nodeType || !contentText || orderIndex === undefined) {
    return NextResponse.json(
      { error: "Missing required fields: nodeType, contentText, orderIndex" },
      { status: 400 }
    );
  }

  const node = await prisma.scenarioNode.create({
    data: {
      scenarioId: params.id,
      nodeType: nodeType,
      contentText,
      orderIndex,
    },
  });

  return NextResponse.json(node, { status: 201 });
}

// GET /api/scenarios/[id]/nodes — List nodes for a scenario
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const nodes = await prisma.scenarioNode.findMany({
    where: { scenarioId: params.id },
    orderBy: { orderIndex: "asc" },
    include: {
      choices: {
        include: { keyBehaviors: true },
      },
    },
  });

  return NextResponse.json(nodes);
}
