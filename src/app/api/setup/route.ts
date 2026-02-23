export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// ONE-TIME SETUP ENDPOINT: Creates tables and seeds data
// DELETE THIS FILE AFTER SETUP IS COMPLETE

export async function GET() {
  try {
    const results: string[] = [];

    // Step 1: Create enums using raw SQL
    results.push("Creating enums...");
    await prisma.$executeRawUnsafe(`DO $$ BEGIN CREATE TYPE "UserRole" AS ENUM ('MANAGER', 'ADMIN'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
    await prisma.$executeRawUnsafe(`DO $$ BEGIN CREATE TYPE "NodeType" AS ENUM ('REFLECTION', 'DECISION', 'OUTCOME'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
    await prisma.$executeRawUnsafe(`DO $$ BEGIN CREATE TYPE "BehaviorImpact" AS ENUM ('POSITIVE', 'NEGATIVE'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
    await prisma.$executeRawUnsafe(`DO $$ BEGIN CREATE TYPE "BugStatus" AS ENUM ('OPEN', 'CLOSED'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
    results.push("Enums OK");

    // Step 2: Create tables
    results.push("Creating tables...");

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "users" ("id" TEXT NOT NULL, "name" TEXT, "email" TEXT, "emailVerified" TIMESTAMP(3), "image" TEXT, "role" "UserRole" NOT NULL DEFAULT 'MANAGER', "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "last_login_at" TIMESTAMP(3), CONSTRAINT "users_pkey" PRIMARY KEY ("id"))`);
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Account" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "type" TEXT NOT NULL, "provider" TEXT NOT NULL, "providerAccountId" TEXT NOT NULL, "refresh_token" TEXT, "access_token" TEXT, "expires_at" INTEGER, "token_type" TEXT, "scope" TEXT, "id_token" TEXT, "session_state" TEXT, CONSTRAINT "Account_pkey" PRIMARY KEY ("id"))`);
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Session" ("id" TEXT NOT NULL, "sessionToken" TEXT NOT NULL, "userId" TEXT NOT NULL, "expires" TIMESTAMP(3) NOT NULL, CONSTRAINT "Session_pkey" PRIMARY KEY ("id"))`);
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "VerificationToken" ("identifier" TEXT NOT NULL, "token" TEXT NOT NULL, "expires" TIMESTAMP(3) NOT NULL)`);
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "q12_dimensions" ("id" INTEGER NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL, CONSTRAINT "q12_dimensions_pkey" PRIMARY KEY ("id"))`);
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "core_values" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT NOT NULL, "color" TEXT NOT NULL DEFAULT '#FFAA53', CONSTRAINT "core_values_pkey" PRIMARY KEY ("id"))`);
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "key_behaviors" ("id" INTEGER NOT NULL, "name" TEXT NOT NULL, "description" TEXT NOT NULL, CONSTRAINT "key_behaviors_pkey" PRIMARY KEY ("id"))`);
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "scenarios" ("id" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL, "difficulty" TEXT NOT NULL, "estimated_time_minutes" INTEGER NOT NULL, "primary_q12_id" INTEGER NOT NULL, "secondary_q12_id" INTEGER, "core_value_id" TEXT NOT NULL, "is_active" BOOLEAN NOT NULL DEFAULT true, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id"))`);
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "scenario_nodes" ("id" TEXT NOT NULL, "scenario_id" TEXT NOT NULL, "node_type" "NodeType" NOT NULL, "content_text" TEXT NOT NULL, "order_index" INTEGER NOT NULL, CONSTRAINT "scenario_nodes_pkey" PRIMARY KEY ("id"))`);
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "choices" ("id" TEXT NOT NULL, "node_id" TEXT NOT NULL, "choice_text" TEXT NOT NULL, "next_node_id" TEXT, "explanation_text" TEXT NOT NULL, "q12_impact" INTEGER NOT NULL DEFAULT 0, "points_base" INTEGER NOT NULL DEFAULT 0, "core_value_alignment" JSONB NOT NULL DEFAULT '{}', CONSTRAINT "choices_pkey" PRIMARY KEY ("id"))`);
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "choice_key_behaviors" ("id" TEXT NOT NULL, "choice_id" TEXT NOT NULL, "key_behavior_id" INTEGER NOT NULL, "impact" "BehaviorImpact" NOT NULL, CONSTRAINT "choice_key_behaviors_pkey" PRIMARY KEY ("id"))`);
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "user_scenario_progress" ("id" TEXT NOT NULL, "user_id" TEXT NOT NULL, "scenario_id" TEXT NOT NULL, "score_total" INTEGER NOT NULL DEFAULT 0, "q12_score_total" INTEGER NOT NULL DEFAULT 0, "culture_score_total" INTEGER NOT NULL DEFAULT 0, "choices_json" JSONB, "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completed_at" TIMESTAMP(3), CONSTRAINT "user_scenario_progress_pkey" PRIMARY KEY ("id"))`);
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "reflection_responses" ("id" TEXT NOT NULL, "user_id" TEXT NOT NULL, "node_id" TEXT NOT NULL, "response_text" TEXT NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "reflection_responses_pkey" PRIMARY KEY ("id"))`);
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "event_logs" ("id" TEXT NOT NULL, "user_id" TEXT NOT NULL, "event_type" TEXT NOT NULL, "scenario_id" TEXT, "metadata" JSONB, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "event_logs_pkey" PRIMARY KEY ("id"))`);
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "feedback_submissions" ("id" TEXT NOT NULL, "user_id" TEXT NOT NULL, "scenario_id" TEXT NOT NULL, "rating_realism" INTEGER NOT NULL, "difficulty_rating" INTEGER NOT NULL, "comments_text" TEXT, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "feedback_submissions_pkey" PRIMARY KEY ("id"))`);
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "bug_reports" ("id" TEXT NOT NULL, "user_id" TEXT NOT NULL, "scenario_id" TEXT, "description" TEXT NOT NULL, "browser_info" TEXT, "route" TEXT, "status" "BugStatus" NOT NULL DEFAULT 'OPEN', "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "bug_reports_pkey" PRIMARY KEY ("id"))`);
    results.push("Tables OK");

    // Step 3: Create indexes
    results.push("Creating indexes...");
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId")`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken")`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "VerificationToken"("token")`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token")`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email")`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "scenario_nodes_scenario_id_order_index_key" ON "scenario_nodes"("scenario_id", "order_index")`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "choice_key_behaviors_choice_id_key_behavior_id_impact_key" ON "choice_key_behaviors"("choice_id", "key_behavior_id", "impact")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "event_logs_user_id_idx" ON "event_logs"("user_id")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "event_logs_event_type_idx" ON "event_logs"("event_type")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "event_logs_created_at_idx" ON "event_logs"("created_at")`);
    results.push("Indexes OK");

    // Step 4: Foreign keys (skip if already exist)
    results.push("Adding foreign keys...");
    const fkeys = [
      `ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_primary_q12_id_fkey" FOREIGN KEY ("primary_q12_id") REFERENCES "q12_dimensions"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
      `ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_secondary_q12_id_fkey" FOREIGN KEY ("secondary_q12_id") REFERENCES "q12_dimensions"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_core_value_id_fkey" FOREIGN KEY ("core_value_id") REFERENCES "core_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
      `ALTER TABLE "scenario_nodes" ADD CONSTRAINT "scenario_nodes_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "choices" ADD CONSTRAINT "choices_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "scenario_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "choice_key_behaviors" ADD CONSTRAINT "choice_key_behaviors_choice_id_fkey" FOREIGN KEY ("choice_id") REFERENCES "choices"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "choice_key_behaviors" ADD CONSTRAINT "positive_behavior_fk" FOREIGN KEY ("key_behavior_id") REFERENCES "key_behaviors"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
      `ALTER TABLE "user_scenario_progress" ADD CONSTRAINT "user_scenario_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "user_scenario_progress" ADD CONSTRAINT "user_scenario_progress_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
      `ALTER TABLE "reflection_responses" ADD CONSTRAINT "reflection_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "reflection_responses" ADD CONSTRAINT "reflection_responses_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "scenario_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
      `ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "feedback_submissions" ADD CONSTRAINT "feedback_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "feedback_submissions" ADD CONSTRAINT "feedback_submissions_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
      `ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    ];
    for (const fk of fkeys) {
      try { await prisma.$executeRawUnsafe(fk); } catch (e: any) {
        if (!e.message?.includes('already exists')) throw e;
      }
    }
    results.push("Foreign keys OK");

    // Step 5: Seed data
    results.push("Seeding Q12 Dimensions...");
    const q12Data = [
      { id: 1, title: "Expectations", description: "I know what is expected of me at work." },
      { id: 2, title: "Materials & Equipment", description: "I have the materials and equipment I need to do my work right." },
      { id: 3, title: "Do Best Daily", description: "At work, I have the opportunity to do what I do best every day." },
      { id: 4, title: "Recognition", description: "In the last seven days, I have received recognition or praise for doing good work." },
      { id: 5, title: "Cares About Me", description: "My supervisor, or someone at work, seems to care about me as a person." },
      { id: 6, title: "Encourages Development", description: "There is someone at work who encourages my development." },
      { id: 7, title: "Opinions Count", description: "At work, my opinions seem to count." },
      { id: 8, title: "Mission/Purpose", description: "The mission or purpose of my company makes me feel my job is important." },
      { id: 9, title: "Committed to Quality", description: "My associates or fellow employees are committed to doing quality work." },
      { id: 10, title: "Best Friend", description: "I have a best friend at work." },
      { id: 11, title: "Progress", description: "In the last six months, someone at work has talked to me about my progress." },
      { id: 12, title: "Learn & Grow", description: "This last year, I have had opportunities at work to learn and grow." },
    ];
    for (const q of q12Data) {
      await prisma.q12Dimension.upsert({ where: { id: q.id }, update: q, create: q });
    }

    results.push("Seeding Core Values...");
    const coreValues = [
      { id: "no-ego", name: "No Ego, All In", description: "Stay humble and work together.", color: "#FFAA53" },
      { id: "better", name: "Better Every Day", description: "Embrace curiosity and growth.", color: "#8EE34D" },
      { id: "relentless", name: "Relentless for Results", description: "Be driven to win and achieve goals.", color: "#FD6EF8" },
      { id: "truth", name: "Driven by Truth", description: "Speak up even when it's tough.", color: "#86D5F4" },
    ];
    for (const cv of coreValues) {
      await prisma.coreValue.upsert({ where: { id: cv.id }, update: cv, create: cv });
    }

    results.push("Seeding Key Behaviors...");
    const keyBehaviors = [
      { id: 1, name: "Care A Lot", description: "Invest in people, build genuine care and trust." },
      { id: 2, name: "Celebrate Success", description: "Recognize and appreciate wins often." },
      { id: 3, name: "Do Right. Every Time", description: "Act with integrity, own mistakes, and fix them." },
      { id: 4, name: "Focus On Solutions", description: "Fix problems, learn from mistakes, avoid blame." },
      { id: 5, name: "Keep Your Promises", description: "Follow through on commitments." },
      { id: 6, name: "Get Clear From The Start", description: "Define expectations and align upfront." },
      { id: 7, name: "Love The Details", description: "Care about precision and accuracy." },
      { id: 8, name: "Make Quality A Habit", description: "Standardize excellence." },
      { id: 9, name: "Own The Outcome", description: "Take responsibility for results." },
      { id: 10, name: "Maintain To Sustain", description: "Protect work-life balance." },
      { id: 11, name: "Assume Good Intent", description: "Give benefit of the doubt." },
      { id: 12, name: "Listen To Learn", description: "Listen fully and with curiosity." },
      { id: 13, name: "Say The Real Thing", description: "Communicate honestly and kindly." },
      { id: 14, name: "Challenge, Then Unite", description: "Debate respectfully, then move forward." },
      { id: 15, name: "Think Team First", description: "Collaborate and help others." },
      { id: 16, name: "Put The Client First", description: "Prioritize client goals." },
      { id: 17, name: "See The Whole Board", description: "Connect work to bigger picture." },
      { id: 18, name: "Respond With Precision", description: "Be quick and clear." },
      { id: 19, name: "Test. Learn. Grow", description: "Take intelligent risks." },
      { id: 20, name: "Get Better Every Day", description: "Continuously improve." },
      { id: 21, name: "Grow Through Change", description: "Embrace change." },
      { id: 22, name: "Share Information", description: "Share knowledge to strengthen team." },
      { id: 23, name: "Always Be Curious", description: "Ask why, dig deeper." },
      { id: 24, name: "Win With Stories & Data", description: "Use data and storytelling." },
      { id: 25, name: "Automate The Repeatable", description: "Use tools to save brainpower." },
      { id: 26, name: "Bring Fun To What You Do", description: "Enjoy the work." },
    ];
    for (const kb of keyBehaviors) {
      await prisma.keyBehavior.upsert({ where: { id: kb.id }, update: kb, create: kb });
    }

    // Seed one test scenario
    results.push("Seeding sample scenario...");
    const existingScenario = await prisma.scenario.findFirst({ where: { title: "The Acquisition Storm" } });
    if (!existingScenario) {
      const scenario = await prisma.scenario.create({
        data: {
          title: "The Acquisition Storm",
          description: "Level just acquired a small SEO agency. You're managing the integration of 4 new team members who are anxious about their roles.",
          difficulty: "Medium",
          estimatedTimeMinutes: 12,
          primaryQ12Id: 1,
          secondaryQ12Id: 5,
          coreValueId: "no-ego",
          isActive: true,
        },
      });

      // Create nodes for the scenario
      const node0 = await prisma.scenarioNode.create({
        data: { scenarioId: scenario.id, nodeType: "REFLECTION", contentText: "You've just been told your team is absorbing 4 people from a recently acquired SEO agency. Before your first meeting, reflect: What is the most important thing you need to establish?", orderIndex: 0 },
      });
      const node1 = await prisma.scenarioNode.create({
        data: { scenarioId: scenario.id, nodeType: "DECISION", contentText: "Marcus interrupts: 'We had our own way of doing things that worked just fine. Are we just supposed to forget all that?' The room goes quiet.", orderIndex: 1 },
      });
      const node2 = await prisma.scenarioNode.create({
        data: { scenarioId: scenario.id, nodeType: "REFLECTION", contentText: "Priya sends you a Slack message: 'I still don't understand what my role is going to look like here.' Reflect on how you'd clarify her role.", orderIndex: 2 },
      });
      const node3 = await prisma.scenarioNode.create({
        data: { scenarioId: scenario.id, nodeType: "DECISION", contentText: "A week later, the teams are working in silos. A client deliverable nearly slipped. You need to fix this.", orderIndex: 3 },
      });
      const node4 = await prisma.scenarioNode.create({
        data: { scenarioId: scenario.id, nodeType: "OUTCOME", contentText: "Three months later: The team has gelled. Marcus became one of your most trusted collaborators. Your approach to expectations, humility, and collaboration made it work.", orderIndex: 4 },
      });

      // Choices for node1
      await prisma.choice.create({
        data: { nodeId: node1.id, choiceText: "Let's start by having your team share what was working — I want to understand your strengths first.", nextNodeId: node2.id, explanationText: "This honors their expertise while demonstrating humility.", q12Impact: 2, pointsBase: 30, coreValueAlignment: { "no-ego": 2, "better": 1, "truth": 1 } },
      });
      await prisma.choice.create({
        data: { nodeId: node1.id, choiceText: "I understand the frustration, but we need to align on one way of working. Let me walk you through our processes.", nextNodeId: node2.id, explanationText: "Leading with 'our processes' signals hierarchy, not partnership.", q12Impact: 0, pointsBase: 10, coreValueAlignment: { "no-ego": -1, "relentless": 1 } },
      });
      await prisma.choice.create({
        data: { nodeId: node1.id, choiceText: "That kind of attitude isn't going to help anyone. We're one team now.", nextNodeId: node2.id, explanationText: "Shutting down dissent destroys psychological safety.", q12Impact: -2, pointsBase: -10, coreValueAlignment: { "no-ego": -2, "better": -1, "truth": -1 } },
      });

      // Choices for node3
      await prisma.choice.create({
        data: { nodeId: node3.id, choiceText: "Pair up one acquired team member with one original member on each client. Create shared ownership with weekly syncs.", nextNodeId: node4.id, explanationText: "Structural integration with accountability.", q12Impact: 2, pointsBase: 30, coreValueAlignment: { "no-ego": 2, "better": 1, "relentless": 2, "truth": 1 } },
      });
      await prisma.choice.create({
        data: { nodeId: node3.id, choiceText: "Send a Slack message reminding everyone to collaborate. Trust them to figure it out.", nextNodeId: node4.id, explanationText: "A Slack message won't rewire team dynamics.", q12Impact: -1, pointsBase: 5, coreValueAlignment: { "no-ego": 0, "better": -1, "relentless": -1 } },
      });
      await prisma.choice.create({
        data: { nodeId: node3.id, choiceText: "Call a team meeting, lay out the problem, ask them to self-organize into pods by end of day.", nextNodeId: node4.id, explanationText: "Forcing same-day self-organization creates anxiety, not alignment.", q12Impact: 0, pointsBase: 15, coreValueAlignment: { "relentless": 1, "truth": 1 } },
      });
      results.push("Scenario 'The Acquisition Storm' seeded!");
    } else {
      results.push("Scenario already exists, skipping.");
    }

    // Create admin user
    results.push("Creating admin user...");
    await prisma.user.upsert({
      where: { email: "admin@levelagency.com" },
      update: { role: "ADMIN" },
      create: { email: "admin@levelagency.com", name: "Level Admin", role: "ADMIN" },
    });

    // Also create Myles as a user
    await prisma.user.upsert({
      where: { email: "myles.biggs@level.agency" },
      update: {},
      create: { email: "myles.biggs@level.agency", name: "Myles Biggs", role: "ADMIN" },
    });
    results.push("Users created!");

    // Verify
    const tableCount = await prisma.$queryRawUnsafe(`SELECT count(*) as cnt FROM pg_tables WHERE schemaname = 'public'`) as any[];
    results.push(`Total tables: ${tableCount[0]?.cnt}`);

    return NextResponse.json({ success: true, steps: results }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, stack: error.stack }, { status: 500 });
  }
}
