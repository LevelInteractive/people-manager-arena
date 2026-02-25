export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

// GET /api/setup/migrate — Run schema migrations for new fields
// Admin-only — requires authenticated admin session
export async function GET() {
  // Production gate: setup endpoints must be explicitly enabled
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SETUP !== "true") {
    return NextResponse.json({ error: "Setup endpoints are disabled in production" }, { status: 403 });
  }

  const { error } = await requireAdmin();
  if (error) return error;

  const steps: string[] = [];

  try {
    // 1. Add currentNodeIndex to user_scenario_progress
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "user_scenario_progress"
        ADD COLUMN IF NOT EXISTS "current_node_index" INTEGER DEFAULT 0
      `);
      steps.push("✅ Added current_node_index to user_scenario_progress");
    } catch (e: any) {
      steps.push(`⚠️ current_node_index: ${e.message}`);
    }

    // 2. Add gameStateJson to user_scenario_progress
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "user_scenario_progress"
        ADD COLUMN IF NOT EXISTS "game_state_json" JSONB
      `);
      steps.push("✅ Added game_state_json to user_scenario_progress");
    } catch (e: any) {
      steps.push(`⚠️ game_state_json: ${e.message}`);
    }

    // 3. Add priority to bug_reports
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "bug_reports"
        ADD COLUMN IF NOT EXISTS "priority" TEXT DEFAULT 'medium'
      `);
      steps.push("✅ Added priority to bug_reports");
    } catch (e: any) {
      steps.push(`⚠️ priority: ${e.message}`);
    }

    // 4. Add admin_notes to bug_reports
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "bug_reports"
        ADD COLUMN IF NOT EXISTS "admin_notes" TEXT
      `);
      steps.push("✅ Added admin_notes to bug_reports");
    } catch (e: any) {
      steps.push(`⚠️ admin_notes: ${e.message}`);
    }

    // 5. Add new BugStatus enum values (IN_PROGRESS, RESOLVED)
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TYPE "BugStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS'
      `);
      steps.push("✅ Added IN_PROGRESS to BugStatus enum");
    } catch (e: any) {
      steps.push(`⚠️ IN_PROGRESS enum: ${e.message}`);
    }

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TYPE "BugStatus" ADD VALUE IF NOT EXISTS 'RESOLVED'
      `);
      steps.push("✅ Added RESOLVED to BugStatus enum");
    } catch (e: any) {
      steps.push(`⚠️ RESOLVED enum: ${e.message}`);
    }

    return NextResponse.json({ success: true, steps });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, steps }, { status: 500 });
  }
}
