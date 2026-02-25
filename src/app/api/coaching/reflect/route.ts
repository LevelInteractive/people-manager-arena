import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { generateReflectionCoaching } from "@/lib/anthropic";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

// POST /api/coaching/reflect — Get coaching feedback on a reflection
export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  // Rate limit: 20 coaching requests per minute per IP
  const rlKey = getRateLimitKey(req, "coaching-reflect");
  const rl = checkRateLimit(rlKey, { limit: 20, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const {
    scenarioId,
    nodeId,
    userResponse,
    exchangeNumber,
    priorExchanges = [],
  } = body;

  if (!scenarioId || !nodeId || !userResponse || !exchangeNumber) {
    return NextResponse.json(
      { error: "Missing required fields: scenarioId, nodeId, userResponse, exchangeNumber" },
      { status: 400 }
    );
  }

  if (typeof userResponse !== "string" || userResponse.length > 10000) {
    return NextResponse.json(
      { error: "userResponse must be a string under 10000 characters" },
      { status: 400 }
    );
  }

  if (exchangeNumber < 1 || exchangeNumber > 3) {
    return NextResponse.json(
      { error: "exchangeNumber must be 1, 2, or 3" },
      { status: 400 }
    );
  }

  try {
    // Load scenario with context
    const scenario = await prisma.scenario.findUnique({
      where: { id: scenarioId },
      include: {
        primaryQ12: true,
        coreValue: true,
        nodes: {
          where: { id: nodeId },
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

    const node = scenario.nodes[0];
    if (!node) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    // Gather key behaviors from the scenario's decision nodes
    const allNodes = await prisma.scenarioNode.findMany({
      where: { scenarioId },
      include: {
        choices: {
          include: {
            keyBehaviors: {
              include: { positiveBehavior: true, negativeBehavior: true },
            },
          },
        },
      },
    });

    const behaviorNames = new Set<string>();
    allNodes.forEach((n) =>
      n.choices.forEach((c) =>
        c.keyBehaviors.forEach((kb) => {
          const name = kb.positiveBehavior?.name || kb.negativeBehavior?.name;
          if (name) behaviorNames.add(name);
        })
      )
    );

    // If no behaviors found from choices, use some defaults relevant to the scenario
    const keyBehaviorsList = behaviorNames.size > 0
      ? Array.from(behaviorNames).slice(0, 6)
      : ["Care A Lot", "Own The Outcome", "Say The Real Thing", "Listen To Learn", "Focus On Solutions"];

    const scenarioContext = {
      title: scenario.title,
      description: scenario.description,
      coreValueName: scenario.coreValue.name,
      coreValueDescription: scenario.coreValue.description,
      q12Title: scenario.primaryQ12.title,
      q12Description: scenario.primaryQ12.description,
      keyBehaviors: keyBehaviorsList,
    };

    // Generate coaching message
    const coachMessage = await generateReflectionCoaching(
      scenarioContext,
      node.contentText,
      userResponse,
      priorExchanges,
      exchangeNumber
    );

    // Save the coaching exchange
    await prisma.coachingExchange.create({
      data: {
        userId: session!.user.id,
        scenarioId,
        nodeId,
        exchangeNumber,
        coachMessage,
        userResponse,
      },
    });

    // Log event
    try {
      await prisma.eventLog.create({
        data: {
          userId: session!.user.id,
          eventType: "coaching_exchange",
          scenarioId,
          metadata: { nodeId, exchangeNumber },
        },
      });
    } catch {}

    return NextResponse.json({
      coachMessage,
      exchangeNumber,
      canContinue: exchangeNumber < 3,
      maxExchangesReached: exchangeNumber >= 3,
    });
  } catch (err: any) {
    console.error("Coaching reflect error:", err);
    return NextResponse.json({ error: "Failed to generate coaching feedback." }, { status: 500 });
  }
}
