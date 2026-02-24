import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

// PUT /api/scenarios/[id]/nodes/[nodeId]/choices/[choiceId] — Update a choice (admin)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; nodeId: string; choiceId: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const {
    choiceText, nextNodeId, explanationText,
    q12Impact, pointsBase, coreValueAlignment,
    keyBehaviorsPositive, keyBehaviorsNegative,
  } = body;

  const data: any = {};
  if (choiceText !== undefined) data.choiceText = choiceText;
  if (nextNodeId !== undefined) data.nextNodeId = nextNodeId || null;
  if (explanationText !== undefined) data.explanationText = explanationText;
  if (q12Impact !== undefined) data.q12Impact = q12Impact;
  if (pointsBase !== undefined) data.pointsBase = pointsBase;
  if (coreValueAlignment !== undefined) data.coreValueAlignment = coreValueAlignment;

  if (Object.keys(data).length === 0 && !keyBehaviorsPositive && !keyBehaviorsNegative) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  // Update choice fields
  const choice = await prisma.choice.update({
    where: { id: params.choiceId },
    data,
  });

  // Update key behaviors if provided — delete old, recreate new
  if (keyBehaviorsPositive !== undefined || keyBehaviorsNegative !== undefined) {
    await prisma.choiceKeyBehavior.deleteMany({
      where: { choiceId: params.choiceId },
    });

    const behaviors: any[] = [];
    if (keyBehaviorsPositive?.length) {
      behaviors.push(
        ...keyBehaviorsPositive.map((bId: number) => ({
          choiceId: params.choiceId,
          keyBehaviorId: bId,
          impact: "POSITIVE" as const,
        }))
      );
    }
    if (keyBehaviorsNegative?.length) {
      behaviors.push(
        ...keyBehaviorsNegative.map((bId: number) => ({
          choiceId: params.choiceId,
          keyBehaviorId: bId,
          impact: "NEGATIVE" as const,
        }))
      );
    }
    if (behaviors.length > 0) {
      await prisma.choiceKeyBehavior.createMany({ data: behaviors });
    }
  }

  return NextResponse.json(choice);
}

// DELETE /api/scenarios/[id]/nodes/[nodeId]/choices/[choiceId] — Delete a choice (admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; nodeId: string; choiceId: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  await prisma.choice.delete({ where: { id: params.choiceId } });
  return NextResponse.json({ success: true });
}
