import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

// GET /api/reference — Get all reference/seed data (authenticated users only)
export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const [q12Dimensions, coreValues, keyBehaviors] = await Promise.all([
    prisma.q12Dimension.findMany({ orderBy: { id: "asc" } }),
    prisma.coreValue.findMany(),
    prisma.keyBehavior.findMany({ orderBy: { id: "asc" } }),
  ]);

  return NextResponse.json({ q12Dimensions, coreValues, keyBehaviors });
}
