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

IMPORTANT — CALIBRATE YOUR RESPONSE TO THEIR QUALITY:
- If their response is thoughtful, specific, and shows real management instinct — AFFIRM that. Name exactly what they got right and why it matters. Then invite them to go one layer deeper. Don't challenge for the sake of challenging.
- If their response is vague, surface-level, or generic — that's when you push harder. Ask them to get concrete.
- If their response is partially strong — celebrate the strong part, then redirect on the weak part.
A great coach makes people feel seen when they nail it AND pushes them when they're coasting. Do both as needed.

${exchangeNumber === 1
  ? `This is their first reflection. Start by genuinely acknowledging what's strong in their response — be specific about which part shows good instinct and why. Then ask ONE follow-up question. If their answer was already strong, the question should be an invitation to go deeper (not a correction), like exploring:
- How they'd handle the hardest version of this moment
- What "${scenarioContext.coreValueName}" looks like in the specific words they'd use
- How different team members might experience their approach differently
If their answer was vague, push for specifics: what would they actually DO, SAY, or DECIDE?`
  : exchangeNumber === 2
  ? `They've engaged with your first question. Match your energy to theirs:
- If they're showing real depth, tell them what's landing well and explore an edge case or complication — frame it as expanding their toolkit, not fixing a gap
- If they're still surface-level, anchor them: ask for the exact first conversation, the specific words, or the 48-hour action plan
- Either way, weave in "${scenarioContext.coreValueName}" — not as a test, but as a lens that sharpens their thinking`
  : `This is the final exchange. Synthesize what they've developed across the conversation. If they've shown strong thinking, honor that — tell them what specifically makes their approach effective as a manager. Give them ONE concrete, memorable takeaway they can carry into a real situation. Connect it back to "${scenarioContext.coreValueName}" and the Q12 dimension "${scenarioContext.q12Title}". Make it feel like a mentor's genuine endorsement and parting wisdom, not a correction or summary.`
}

TONE: Warm and direct. Like a trusted mentor who genuinely respects the person they're coaching. Affirm what's good before building on it. Use "you" language. Keep it conversational — no bullet points, no formal structure. 2-4 sentences max.

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
  const prompt = `You are an executive leadership coach. A manager made a decision in a scenario — their choice wasn't the strongest available, but it may still have real merit. Your job is to coach, not criticize.

SCENARIO: ${scenarioContext.title}
CORE VALUE: ${scenarioContext.coreValueName} — ${scenarioContext.coreValueDescription}
Q12 DIMENSION: ${scenarioContext.q12Title}

SITUATION: ${nodePrompt}

WHAT THEY CHOSE: "${chosenChoice.choiceText}" (Score: ${chosenChoice.pointsBase + chosenChoice.q12Impact})

THE STRONGER OPTION: "${bestChoice.choiceText}" (Score: ${bestChoice.pointsBase + bestChoice.q12Impact})

COACHING APPROACH:
- First, if their choice has genuine strengths, briefly acknowledge what's reasonable about it (1 short clause is fine)
- Then explain the key insight about why the stronger option is more effective — frame it as a learning moment, not a mistake
- Reference "${scenarioContext.coreValueName}" or "${scenarioContext.q12Title}" only if it genuinely adds clarity
- Use framing like "The edge here is..." or "What separates good from great here is..." — forward-looking, not backward-looking

RESPOND ONLY with the 2-3 sentence coaching note. No preamble.`;

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

// ─── Optimal Decision Affirmation ────────────────────

export async function generateOptimalDecisionFeedback(
  scenarioContext: ScenarioContext,
  nodePrompt: string,
  chosenChoice: ChoiceInfo
): Promise<string> {
  const prompt = `You are an executive leadership coach. A manager just made the strongest decision available in a scenario. Affirm their instinct and deepen their understanding of WHY it was effective.

SCENARIO: ${scenarioContext.title}
CORE VALUE: ${scenarioContext.coreValueName} — ${scenarioContext.coreValueDescription}
Q12 DIMENSION: ${scenarioContext.q12Title}

SITUATION: ${nodePrompt}

WHAT THEY CHOSE (the optimal choice): "${chosenChoice.choiceText}"

Write 2-3 sentences that:
1. Affirm their decision with specificity — name what makes this the strongest move (not just "good job")
2. Explain the leadership principle it demonstrates — connect it to "${scenarioContext.coreValueName}" or "${scenarioContext.q12Title}" in a way that deepens their understanding
3. Give them something to carry forward — a broader insight about when this kind of decision matters most

Be genuinely encouraging. This person showed good judgment — help them understand their own instinct so they can replicate it.

RESPOND ONLY with the coaching note. No preamble.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0];
    if (text.type === "text") return text.text.trim();
    return `Strong instinct here. Choosing "${chosenChoice.choiceText.substring(0, 60)}..." shows you understand what "${scenarioContext.coreValueName}" looks like in practice — not just as a value on the wall, but as a real decision under pressure.`;
  } catch (error) {
    console.error("Anthropic API error (optimal decision):", error);
    return `Strong instinct here. This choice demonstrates "${scenarioContext.coreValueName}" in action — the kind of decision that builds trust with your team over time.`;
  }
}

// ─── Fallbacks (when API is unavailable) ─────────────

function getFallbackReflectionCoaching(
  exchangeNumber: number,
  ctx: ScenarioContext
): string {
  const fallbacks: Record<number, string[]> = {
    1: [
      `There's real thought behind that — I can tell you're considering the human side, not just the tactical side. Now take it one step further: what's the very first conversation you'd have, and what would your opening line sound like?`,
      `You're already thinking about this the right way. I'm curious — what would you actually say in the first 5 minutes? How does "${ctx.coreValueName}" show up in your words, not just your intent?`,
      `That's a solid read on the situation. Now zoom in — what specific action would you take in the next 48 hours, and how would your team experience "${ctx.coreValueName}" through that action?`,
    ],
    2: [
      `You're building something strong here. Now stress-test it — what could go wrong with this approach, and how would you adapt while staying true to "${ctx.coreValueName}"?`,
      `I like how concrete you're getting. Now consider the person on the other side of this conversation — what are they feeling, and how does that awareness sharpen your approach?`,
      `That's a smart instinct. Now think about the ripple effect — how does your team interpret this move? What message does it send about "${ctx.coreValueName}"?`,
    ],
    3: [
      `You've shown real growth in how you're thinking about this. Here's the takeaway: the best managers use moments like this to show the team what "${ctx.coreValueName}" looks like in action. You're already thinking that way.`,
      `Strong work developing this. "${ctx.q12Title}" isn't just a score — it's a daily practice. The fact that you're thinking this carefully about your approach tells me you're the kind of leader who takes that seriously.`,
      `You've really worked through this well. Remember: your team notices how you handle the hard moments. The way you're approaching "${ctx.coreValueName}" here is exactly what builds lasting trust.`,
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
