import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { generateDecisionFeedback, generateOptimalDecisionFeedback } from "@/lib/anthropic";

// POST /api/coaching/decision — Get feedback when non-optimal choice is selected
export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const { scenarioId, nodeId, chosenChoiceId } = body;

  if (!scenarioId || !nodeId || !chosenChoiceId) {
    return NextResponse.json(
      { error: "Missing required fields: scenarioId, nodeId, chosenChoiceId" },
      { status: 400 }
    );
  }

  try {
    // Load scenario context
    const scenario = await prisma.scenario.findUnique({
      where: { id: scenarioId },
      include: { primaryQ12: true, coreValue: true },
    });

    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    // Load all choices for this node
    const node = await prisma.scenarioNode.findUnique({
      where: { id: nodeId },
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

    if (!node) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    const choices = node.choices;
    const chosenChoice = choices.find((c) => c.id === chosenChoiceId);
    if (!chosenChoice) {
      return NextResponse.json({ error: "Choice not found" }, { status: 404 });
    }

    // Calculate total score for each choice
    const scoreChoice = (c: typeof choices[0]) => {
      const cvScore = Object.values(
        (c.coreValueAlignment as Record<string, number>) || {}
      ).reduce((a, b) => a + b, 0);
      return c.pointsBase + c.q12Impact + cvScore;
    };

    const chosenScore = scoreChoice(chosenChoice);

    // Find best choice
    let bestChoice = choices[0];
    let bestScore = scoreChoice(bestChoice);
    for (const c of choices) {
      const s = scoreChoice(c);
      if (s > bestScore) {
        bestChoice = c;
        bestScore = s;
      }
    }

    // Gather key behaviors
    const behaviorNames: string[] = [];
    node.choices.forEach((c) =>
      c.keyBehaviors.forEach((kb) => {
        const name = kb.positiveBehavior?.name || kb.negativeBehavior?.name;
        if (name && !behaviorNames.includes(name)) behaviorNames.push(name);
      })
    );

    const scenarioContext = {
      title: scenario.title,
      description: scenario.description,
      coreValueName: scenario.coreValue.name,
      coreValueDescription: scenario.coreValue.description,
      q12Title: scenario.primaryQ12.title,
      q12Description: scenario.primaryQ12.description,
      keyBehaviors: behaviorNames.slice(0, 6),
    };

    const isOptimal = bestChoice.id === chosenChoice.id;

    // If chosen IS the best choice, give affirmation coaching
    if (isOptimal) {
      const feedback = await generateOptimalDecisionFeedback(
        scenarioContext,
        node.contentText,
        {
          choiceText: chosenChoice.choiceText,
          pointsBase: chosenChoice.pointsBase,
          q12Impact: chosenChoice.q12Impact,
          coreValueAlignment: (chosenChoice.coreValueAlignment as Record<string, number>) || {},
          explanationText: chosenChoice.explanationText,
        }
      );

      return NextResponse.json({ feedback, isOptimal: true });
    }

    const feedback = await generateDecisionFeedback(
      scenarioContext,
      node.contentText,
      {
        choiceText: chosenChoice.choiceText,
        pointsBase: chosenChoice.pointsBase,
        q12Impact: chosenChoice.q12Impact,
        coreValueAlignment: (chosenChoice.coreValueAlignment as Record<string, number>) || {},
        explanationText: chosenChoice.explanationText,
      },
      {
        choiceText: bestChoice.choiceText,
        pointsBase: bestChoice.pointsBase,
        q12Impact: bestChoice.q12Impact,
        coreValueAlignment: (bestChoice.coreValueAlignment as Record<string, number>) || {},
        explanationText: bestChoice.explanationText,
      }
    );

    // Log event
    try {
      await prisma.eventLog.create({
        data: {
          userId: session!.user.id,
          eventType: "decision_feedback_shown",
          scenarioId,
          metadata: { nodeId, chosenChoiceId, bestChoiceId: bestChoice.id },
        },
      });
    } catch {}

    return NextResponse.json({
      feedback,
      isOptimal: false,
      bestChoicePreview: bestChoice.choiceText.substring(0, 100) + (bestChoice.choiceText.length > 100 ? "..." : ""),
    });
  } catch (err: any) {
    console.error("Coaching decision error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
