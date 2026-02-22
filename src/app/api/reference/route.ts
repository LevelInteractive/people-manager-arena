import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/reference — Get all reference/seed data (public for authenticated users)
export async function GET() {
  const [q12Dimensions, coreValues, keyBehaviors] = await Promise.all([
    prisma.q12Dimension.findMany({ orderBy: { id: "asc" } }),
    prisma.coreValue.findMany(),
    prisma.keyBehavior.findMany({ orderBy: { id: "asc" } }),
  ]);

  return NextResponse.json({ q12Dimensions, coreValues, keyBehaviors });
}
