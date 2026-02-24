import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

// PUT /api/scenarios/[id]/nodes/[nodeId] — Update a node (admin)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; nodeId: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { nodeType, contentText } = body;

  const data: any = {};
  if (nodeType) data.nodeType = nodeType;
  if (contentText !== undefined) data.contentText = contentText;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const node = await prisma.scenarioNode.update({
    where: { id: params.nodeId },
    data,
  });

  return NextResponse.json(node);
}

// DELETE /api/scenarios/[id]/nodes/[nodeId] — Delete a node (admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; nodeId: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  await prisma.scenarioNode.delete({ where: { id: params.nodeId } });
  return NextResponse.json({ success: true });
}
