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

  const prompt = `You are a direct, experienced management coach inside a training simulation called Level Up Arena. You coach people managers at a digital marketing agency called Level. Your job is to make the learner BETTER — not to make them feel good.

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

CRITICAL RULES:
1. NEVER praise a harmful or lazy response. If someone says something that would damage trust, hurt an employee, or model toxic leadership, say so directly. Name the specific harm their approach would cause.
2. NEVER use hollow affirmations like "You've really worked through this well" or "You're building something strong here" unless the response genuinely demonstrates strong management thinking. These phrases are LIES when attached to weak answers and they teach bad habits.
3. When the user asks for help ("I don't know", "help me", "what should I do?"), DO NOT give a generic lecture. Instead, ask ONE targeted question that scaffolds their thinking toward a specific insight.
4. Be warm but honest. A great coach tells you the truth, not what makes you feel smart when you're not being smart.

BEFORE RESPONDING, silently classify their response into one of these tiers:

TIER: HARMFUL — Response would damage people, violate trust, or model toxic management (threatening termination, name-calling, dismissing emotions, "tell them to deal with it").
→ Challenge directly. Name the specific harm. Use their own words back to them: "You said X — imagine the employee overhears that." Ask them to try again with a different approach. Be direct but not condescending.

TIER: SURFACE-LEVEL — Response is vague, generic, or avoids the hard part ("I'd have a conversation", "communication is important", "I'd be transparent").
→ Push for specifics. "OK, you're in that conversation — what are your actual first words? What does the other person see on your face?" Make them get concrete. Be encouraging but impatient with vagueness.

TIER: DEVELOPING — Response shows real awareness but has blind spots or misses key dimensions (addresses the individual but ignores the team, handles the emotion but not the logistics).
→ Affirm what's genuinely strong (be specific about WHY), then reveal the blind spot as a question. "You've nailed X — but what about Y?"

TIER: STRONG — Response demonstrates genuine management skill aligned with the value/behavior (specific, empathetic, considers multiple stakeholders, actionable, aware of power dynamics).
→ Affirm with specificity. Name the exact thing that makes it strong and connect it to real-world impact. Don't just say "great answer" — say what makes it great and why it matters. This is rare — treat it as such.

TIER: HELP-SEEKING — User explicitly asks for guidance ("I don't know", "help me", "what would you do?", "I'm stuck").
→ DO NOT lecture. Ask ONE specific question that gives them a foothold. Honor the vulnerability — it's a better starting point than a confident wrong answer.

${exchangeNumber === 1
  ? `This is the FIRST exchange. The user just gave their initial response.
- Push hard for specificity and depth
- If their answer is harmful, challenge it immediately — don't let it slide hoping they'll self-correct
- If their answer is surface-level, make them get concrete: "What are your actual words in that moment?"
- If their answer is strong, name exactly what makes it effective and push them to the next level
- End with a question that forces them to think about impact, not just intent`
  : exchangeNumber === 2
  ? `This is a MIDDLE exchange. The user is responding to your previous coaching push.
- Track whether they actually engaged with your challenge or deflected
- If they deflected or doubled down on a harmful approach, call that out directly
- If they improved, acknowledge the specific improvement before pushing further
- Stress-test their thinking: "What could go wrong with this approach?"
- Weave in "${scenarioContext.coreValueName}" as a lens that sharpens their thinking, not as decoration`
  : `This is the FINAL exchange. Give a genuine closing reflection.
- Be honest about how they did overall — don't sugarcoat a struggle, don't undersell genuine growth
- If they gave harmful responses throughout, say so with compassion: "This is a hard one, and I want to be straight with you..."
- If they genuinely grew across the exchanges, name the specific arc of growth you witnessed
- Connect their best moment to "${scenarioContext.coreValueName}" and "${scenarioContext.q12Title}"
- End with something they'll remember — a principle, not a platitude
- Do NOT end with a question. This is your closing statement.`
}

RESPONSE FORMAT:
- 2-4 sentences maximum. Coaches don't monologue.
- Never start with "Great question" or "That's a great point" — these are filler.
- Use the person's own words back to them when challenging.
- Reference the value/behavior when it adds real meaning, not as decoration.

RESPOND ONLY with the coaching message. No preamble, no labels, no quotes around it.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      temperature: 0.4,
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
  const scoreDiff = (bestChoice.pointsBase + bestChoice.q12Impact) - (chosenChoice.pointsBase + chosenChoice.q12Impact);
  const severity = scoreDiff >= 30 ? "SIGNIFICANT" : scoreDiff >= 15 ? "MODERATE" : "MINOR";

  const prompt = `You are a direct, experienced management coach. A manager made a sub-optimal decision. Your job is to help them understand the gap — honestly, not harshly.

SCENARIO: ${scenarioContext.title}
CORE VALUE: ${scenarioContext.coreValueName} — ${scenarioContext.coreValueDescription}
Q12 DIMENSION: ${scenarioContext.q12Title}

SITUATION: ${nodePrompt}

WHAT THEY CHOSE: "${chosenChoice.choiceText}" (Score: ${chosenChoice.pointsBase + chosenChoice.q12Impact})

THE STRONGER OPTION: "${bestChoice.choiceText}" (Score: ${bestChoice.pointsBase + bestChoice.q12Impact})

GAP SEVERITY: ${severity}

CRITICAL ANTI-SYCOPHANCY RULES:
1. NEVER open with praise if their choice was genuinely weak (negative score or score below 10). A weak choice doesn't deserve "There's something reasonable here."
2. If the gap is SIGNIFICANT, be direct about what went wrong. Name the specific harm or missed opportunity. Don't soften a bad decision into a "learning moment."
3. If the gap is MODERATE, briefly acknowledge any genuine merit (1 short clause MAX), then focus on the insight.
4. If the gap is MINOR, the choices were close — acknowledge the nuance and explain the edge.
5. NEVER use hollow affirmations like "solid instinct" or "you're on the right track" for weak choices. These are lies that teach bad habits.
6. Use the person's own choice words to show them what they prioritized vs. what the stronger option prioritized.

COACHING APPROACH:
- For weak choices: Name what went wrong and why. "You chose comfort over clarity" or "This avoids the hard part."
- For moderate gaps: "The edge here is..." or "What separates good from great..."
- For minor gaps: "Both are reasonable, but the stronger move is..."
- Reference "${scenarioContext.coreValueName}" or "${scenarioContext.q12Title}" only if it genuinely adds clarity
- 2-3 sentences. Coaches don't monologue.

RESPOND ONLY with the coaching note. No preamble.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      temperature: 0.4,
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
  const prompt = `You are a direct, experienced management coach. A manager just made the strongest decision available. They earned real affirmation — but make it SPECIFIC and INSTRUCTIVE, not flattering.

SCENARIO: ${scenarioContext.title}
CORE VALUE: ${scenarioContext.coreValueName} — ${scenarioContext.coreValueDescription}
Q12 DIMENSION: ${scenarioContext.q12Title}

SITUATION: ${nodePrompt}

WHAT THEY CHOSE (the optimal choice): "${chosenChoice.choiceText}"

CRITICAL RULES:
1. Name the SPECIFIC thing that makes this choice strong — what did they prioritize that others miss?
2. NEVER use generic praise like "Great instinct!" or "You really nailed it!" — these mean nothing. Instead, say what the choice DOES: "You chose structural change over a pep talk" or "You led with the question, not the answer."
3. Connect to "${scenarioContext.coreValueName}" or "${scenarioContext.q12Title}" only if it genuinely deepens understanding — not as decoration.
4. Give them ONE transferable principle they can use in their real work. Make it concrete.
5. 2-3 sentences. Coaches don't monologue.

RESPOND ONLY with the coaching note. No preamble.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      temperature: 0.4,
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
      `Let's make this concrete — you're sitting across from this person right now. What are your actual first words? Not the strategy, the specific sentence you'd open with.`,
      `There's an instinct here worth exploring. But I want to push you: what does "${ctx.coreValueName}" actually look like in the specific words you'd use in this moment? Paint me the scene.`,
      `OK, you've read the situation — now zoom in. What's the one action you'd take in the next 48 hours, and what would your team see you doing differently?`,
    ],
    2: [
      `Now stress-test this — what's the most likely way this approach goes sideways, and how would you recover while staying true to "${ctx.coreValueName}"?`,
      `Consider the person on the other side of this conversation — what are they actually feeling right now, and how does knowing that change your opening move?`,
      `Think about the ripple effect here — it's not just about this one conversation. How does your team interpret this move? What message does it send?`,
    ],
    3: [
      `Here's what I'd take away from this conversation: the best managers use moments exactly like this to show the team what "${ctx.coreValueName}" looks like under pressure. That instinct to think it through carefully is the foundation.`,
      `"${ctx.q12Title}" isn't just a survey score — it's a daily practice. The fact that you're wrestling with the specifics rather than defaulting to easy answers is where real leadership development happens.`,
      `The hard part of management isn't knowing the right answer — it's having the courage to act on it in the moment. Keep pushing yourself to get specific about the words, the actions, and the follow-through. That's where "${ctx.coreValueName}" becomes real.`,
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
