// ═══════════════════════════════════════════════════════
// Anthropic Claude Integration — Coaching Engine
// ═══════════════════════════════════════════════════════

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

interface ScenarioContext {
  title: string;
  description: string;
  coreValueName: string;
  coreValueDescription: string;
  q12Title: string;
  q12Description: string;
  keyBehaviors: string[];
}

interface CoachingExchange {
  coachMessage: string;
  userResponse: string;
}

// ─── Reflection Coaching ─────────────────────────────

export async function generateReflectionCoaching(
  scenarioContext: ScenarioContext,
  nodePrompt: string,
  userReflection: string,
  priorExchanges: CoachingExchange[],
  exchangeNumber: number
): Promise<string> {
  const priorText = priorExchanges.length > 0
    ? priorExchanges.map((e, i) =>
        `Exchange ${i + 1}:\nCoach: ${e.coachMessage}\nManager: ${e.userResponse}`
      ).join("\n\n")
    : "None — this is the first coaching exchange.";

  const prompt = `You are an executive leadership coach working with a people manager at a performance marketing agency called Level. You're helping them develop their thinking on a real management scenario they're working through.

SCENARIO CONTEXT:
Title: ${scenarioContext.title}
Situation: ${scenarioContext.description}
Core Value Being Tested: ${scenarioContext.coreValueName} — ${scenarioContext.coreValueDescription}
Q12 Engagement Dimension: ${scenarioContext.q12Title} — ${scenarioContext.q12Description}
Key Behaviors to Consider: ${scenarioContext.keyBehaviors.join(", ")}

REFLECTION PROMPT THEY RESPONDED TO:
${nodePrompt}

PRIOR COACHING EXCHANGES:
${priorText}

THEIR ${priorExchanges.length > 0 ? "LATEST" : "INITIAL"} RESPONSE:
"${userReflection}"

YOUR COACHING TASK (Exchange #${exchangeNumber} of max 3):
${exchangeNumber === 1
  ? `This is their first reflection. Acknowledge ONE specific thing they said (don't just summarize), then ask ONE sharp follow-up question that pushes them to:
- Get more specific about what they'd actually DO (actions, not ideas)
- Connect their thinking to "${scenarioContext.coreValueName}" or one of the key behaviors
- Think about the impact on their team members, not just the situation`
  : exchangeNumber === 2
  ? `They've engaged with your first question. Go deeper on whatever they said. Push them to:
- Name the specific conversation they'd have, or the exact first step they'd take
- Consider what could go wrong with their approach
- Think about how "${scenarioContext.coreValueName}" shows up in their specific actions`
  : `This is the final exchange. Synthesize what they've developed across the conversation. Give them ONE concrete, memorable takeaway they can carry into a real situation. Connect it back to "${scenarioContext.coreValueName}" and the Q12 dimension "${scenarioContext.q12Title}". Make it feel like a mentor's parting wisdom, not a summary.`
}

TONE: Direct but warm. Like a trusted mentor at a whiteboard, not a professor lecturing. Use "you" language. Keep it conversational — no bullet points, no formal structure. 2-4 sentences max.

RESPOND ONLY with the coaching message. No preamble, no labels, no quotes around it.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0];
    if (text.type === "text") return text.text.trim();
    return getFallbackReflectionCoaching(exchangeNumber, scenarioContext);
  } catch (error) {
    console.error("Anthropic API error (reflection):", error);
    return getFallbackReflectionCoaching(exchangeNumber, scenarioContext);
  }
}

// ─── Decision Feedback ───────────────────────────────

interface ChoiceInfo {
  choiceText: string;
  pointsBase: number;
  q12Impact: number;
  coreValueAlignment: Record<string, number>;
  explanationText: string;
}

export async function generateDecisionFeedback(
  scenarioContext: ScenarioContext,
  nodePrompt: string,
  chosenChoice: ChoiceInfo,
  bestChoice: ChoiceInfo
): Promise<string> {
  const prompt = `You are an executive leadership coach. A manager just made a decision in a scenario and didn't pick the strongest option. Give them a brief, constructive nudge — not criticism.

SCENARIO: ${scenarioContext.title}
CORE VALUE: ${scenarioContext.coreValueName} — ${scenarioContext.coreValueDescription}
Q12 DIMENSION: ${scenarioContext.q12Title}

SITUATION: ${nodePrompt}

WHAT THEY CHOSE: "${chosenChoice.choiceText}"

THE STRONGER OPTION: "${bestChoice.choiceText}"

Write 1-2 sentences explaining why the stronger option better develops them as a manager in this situation. Reference the core value "${scenarioContext.coreValueName}" or Q12 dimension "${scenarioContext.q12Title}" if it adds clarity. Don't say "the better choice was..." — instead frame it as "Consider how..." or "A key insight here is..." to make it forward-looking.

RESPOND ONLY with the 1-2 sentence coaching note. No preamble.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0];
    if (text.type === "text") return text.text.trim();
    return getFallbackDecisionFeedback(scenarioContext);
  } catch (error) {
    console.error("Anthropic API error (decision):", error);
    return getFallbackDecisionFeedback(scenarioContext);
  }
}

// ─── Fallbacks (when API is unavailable) ─────────────

function getFallbackReflectionCoaching(
  exchangeNumber: number,
  ctx: ScenarioContext
): string {
  const fallbacks: Record<number, string[]> = {
    1: [
      `That's a solid start. Now get specific — what's the very first conversation you'd have, and with whom? Think about how "${ctx.coreValueName}" would guide your opening line.`,
      `Good thinking. But I want to push you — what would you actually say in the first 5 minutes? How does "${ctx.coreValueName}" show up in your approach, not just your intent?`,
      `You're on the right track. Now zoom in — what specific action would you take in the next 48 hours, and how would your team experience "${ctx.coreValueName}" through that action?`,
    ],
    2: [
      `Getting closer. Now think about what could go wrong with your approach. What's the biggest risk, and how would you handle it while staying true to "${ctx.coreValueName}"?`,
      `Good — you're getting more concrete. But consider the person on the other side of this conversation. What are they feeling right now, and how does that change your approach?`,
      `I like the direction. Now think about the ripple effect — how does your team interpret this move? Does it reinforce "${ctx.coreValueName}" or undermine it?`,
    ],
    3: [
      `Here's what I want you to remember: the best managers don't just solve the problem — they use moments like this to show the team what "${ctx.coreValueName}" looks like in action. That's what separates good from great.`,
      `Strong work developing this. The takeaway: "${ctx.q12Title}" isn't just a score — it's a daily practice. The way you handle this scenario sends a message about what kind of leader you are.`,
      `You've come a long way on this one. Remember: your team is always watching how you handle the hard moments. Living "${ctx.coreValueName}" here builds the kind of trust that makes everything else easier.`,
    ],
  };

  const options = fallbacks[exchangeNumber] || fallbacks[1];
  return options[Math.floor(Math.random() * options.length)];
}

function getFallbackDecisionFeedback(ctx: ScenarioContext): string {
  const fallbacks = [
    `Consider how "${ctx.coreValueName}" could have guided a stronger approach here — sometimes the harder choice is the one that builds the most trust with your team.`,
    `A key insight: the strongest managers in "${ctx.q12Title}" situations lead with action, not just intention. Think about what would have made your team feel the difference.`,
    `Worth reflecting on: the best option here wasn't just about the outcome — it was about demonstrating "${ctx.coreValueName}" in a way your team would remember.`,
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}
