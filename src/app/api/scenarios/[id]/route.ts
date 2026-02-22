import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/session";

export const dynamic = 'force-dynamic';

// GET /api/scenarios/[id] — Full scenario with nodes, choices, behaviors
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const scenario = await prisma.scenario.findUnique({
    where: { id: params.id },
    include: {
      primaryQ12: true,
      secondaryQ12: true,
      coreValue: true,
      nodes: {
        orderBy: { orderIndex: "asc" },
        include: {
          choices: {
            include: {
              keyBehaviors: {
                include: {
                  positiveBehavior: true,
                  negativeBehavior: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  // Transform choices to include behavior arrays
  const transformed = {
    ...scenario,
    nodes: scenario.nodes.map((node) => ({
      ...node,
      choices: node.choices.map((choice) => ({
        id: choice.id,
        nodeId: choice.nodeId,
        choiceText: choice.choiceText,
        nextNodeId: choice.nextNodeId,
        explanationText: choice.explanationText,
        q12Impact: choice.q12Impact,
        pointsBase: choice.pointsBase,
        coreValueAlignment: choice.coreValueAlignment as Record<string, number>,
        keyBehaviorsPositive: choice.keyBehaviors
          .filter((kb) => kb.impact === "POSITIVE")
          .map((kb) => ({
            id: kb.keyBehaviorId,
            name: kb.positiveBehavior?.name || kb.negativeBehavior?.name || "",
          })),
        keyBehaviorsNegative: choice.keyBehaviors
          .filter((kb) => kb.impact === "NEGATIVE")
          .map((kb) => ({
            id: kb.keyBehaviorId,
            name: kb.positiveBehavior?.name || kb.negativeBehavior?.name || "",
          })),
      })),
    })),
  };

  return NextResponse.json(transformed);
}

// PUT /api/scenarios/[id] — Update scenario (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const scenario = await prisma.scenario.update({
    where: { id: params.id },
    data: {
      ...(body.title && { title: body.title }),
      ...(body.description && { description: body.description }),
      ...(body.difficulty && { difficulty: body.difficulty }),
      ...(body.estimatedTimeMinutes && { estimatedTimeMinutes: body.estimatedTimeMinutes }),
      ...(body.primaryQ12Id && { primaryQ12Id: body.primaryQ12Id }),
      ...(body.secondaryQ12Id !== undefined && { secondaryQ12Id: body.secondaryQ12Id }),
      ...(body.coreValueId && { coreValueId: body.coreValueId }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  });

  return NextResponse.json(scenario);
}

// DELETE /api/scenarios/[id] — Delete scenario (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  await prisma.scenario.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
