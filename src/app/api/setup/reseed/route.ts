export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for seeding

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

// ═══════════════════════════════════════════════════════
// RESEED ENDPOINT — Seeds all 12 scenarios
// Admin-only — requires authenticated admin session
// Safe to re-run: deletes and recreates each scenario
// ═══════════════════════════════════════════════════════

type NodeType = "REFLECTION" | "DECISION" | "OUTCOME";
type BehaviorImpact = "POSITIVE" | "NEGATIVE";

interface ScenarioData {
  title: string;
  description: string;
  difficulty: string;
  estimatedTimeMinutes: number;
  primaryQ12Id: number;
  secondaryQ12Id?: number;
  coreValueId: string;
  nodes: Array<{
    type: NodeType;
    order: number;
    content: string;
    choices?: Array<{
      text: string;
      explanation: string;
      q12Impact: number;
      pointsBase: number;
      coreValueAlignment: Record<string, number>;
      behaviorsPositive: number[];
      behaviorsNegative: number[];
    }>;
  }>;
}

async function seedScenario(data: ScenarioData) {
  // Delete existing scenario with same title
  const existing = await prisma.scenario.findFirst({ where: { title: data.title } });
  if (existing) {
    // Delete dependent records that don't have onDelete: Cascade
    await prisma.userScenarioProgress.deleteMany({ where: { scenarioId: existing.id } });
    await prisma.eventLog.deleteMany({ where: { scenarioId: existing.id } });
    await prisma.feedbackSubmission.deleteMany({ where: { scenarioId: existing.id } });
    await prisma.bugReport.deleteMany({ where: { scenarioId: existing.id } });
    // Delete reflection responses tied to this scenario's nodes
    const nodeIds = await prisma.scenarioNode.findMany({
      where: { scenarioId: existing.id },
      select: { id: true },
    });
    if (nodeIds.length > 0) {
      await prisma.reflectionResponse.deleteMany({
        where: { nodeId: { in: nodeIds.map(n => n.id) } },
      });
    }
    // Now safe to delete scenario (cascade handles nodes, choices, behaviors)
    await prisma.scenario.delete({ where: { id: existing.id } });
  }

  const scenario = await prisma.scenario.create({
    data: {
      title: data.title,
      description: data.description,
      difficulty: data.difficulty,
      estimatedTimeMinutes: data.estimatedTimeMinutes,
      primaryQ12Id: data.primaryQ12Id,
      secondaryQ12Id: data.secondaryQ12Id ?? null,
      coreValueId: data.coreValueId,
      isActive: true,
    },
  });

  // Create nodes
  const nodeMap: Record<number, string> = {};
  for (const nodeData of data.nodes) {
    const node = await prisma.scenarioNode.create({
      data: {
        scenarioId: scenario.id,
        nodeType: nodeData.type,
        contentText: nodeData.content,
        orderIndex: nodeData.order,
      },
    });
    nodeMap[nodeData.order] = node.id;
  }

  // Create choices with behavior links
  for (const nodeData of data.nodes) {
    if (nodeData.choices && nodeData.choices.length > 0) {
      const nodeId = nodeMap[nodeData.order];
      const nextNodeId = nodeMap[nodeData.order + 1] ?? null;

      for (const choiceData of nodeData.choices) {
        const choice = await prisma.choice.create({
          data: {
            nodeId,
            choiceText: choiceData.text,
            nextNodeId,
            explanationText: choiceData.explanation,
            q12Impact: choiceData.q12Impact,
            pointsBase: choiceData.pointsBase,
            coreValueAlignment: choiceData.coreValueAlignment,
          },
        });

        for (const bId of choiceData.behaviorsPositive) {
          await prisma.choiceKeyBehavior.create({
            data: { choiceId: choice.id, keyBehaviorId: bId, impact: "POSITIVE" as BehaviorImpact },
          });
        }
        for (const bId of choiceData.behaviorsNegative) {
          await prisma.choiceKeyBehavior.create({
            data: { choiceId: choice.id, keyBehaviorId: bId, impact: "NEGATIVE" as BehaviorImpact },
          });
        }
      }
    }
  }

  return scenario.title;
}

export async function GET() {
  // Production gate: setup endpoints must be explicitly enabled
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SETUP !== "true") {
    return NextResponse.json({ error: "Setup endpoints are disabled in production" }, { status: 403 });
  }

  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const results: string[] = [];

    // ─── Q12 Dimensions ──────────────────────────────────
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
    results.push("✅ Q12 Dimensions OK");

    // ─── Core Values ─────────────────────────────────────
    results.push("Seeding Core Values...");
    const coreValues = [
      { id: "no-ego", name: "No Ego, All In", description: "Stay humble and work together. No task is too small, no person too big.", color: "#FFAA53" },
      { id: "better", name: "Better Every Day", description: "Embrace curiosity and growth. Focus on progress over perfection.", color: "#8EE34D" },
      { id: "relentless", name: "Relentless for Results", description: "Be driven to win and achieve goals. Act with urgency and accountability.", color: "#FD6EF8" },
      { id: "truth", name: "Driven by Truth", description: "Speak up even when it's tough. Value honesty, transparency, and data-driven decisions.", color: "#86D5F4" },
    ];
    for (const cv of coreValues) {
      await prisma.coreValue.upsert({ where: { id: cv.id }, update: cv, create: cv });
    }
    results.push("✅ Core Values OK");

    // ─── Key Behaviors ───────────────────────────────────
    results.push("Seeding Key Behaviors...");
    const keyBehaviors = [
      { id: 1, name: "Care A Lot", description: "Invest in people, build genuine care and trust." },
      { id: 2, name: "Celebrate Success", description: "Recognize and appreciate wins often." },
      { id: 3, name: "Do Right. Every Time", description: "Act with integrity, own mistakes, and fix them." },
      { id: 4, name: "Focus On Solutions", description: "Fix problems, learn from mistakes, avoid blame." },
      { id: 5, name: "Keep Your Promises", description: "Follow through on commitments and communicate openly." },
      { id: 6, name: "Get Clear From The Start", description: "Define expectations, goals, and align upfront." },
      { id: 7, name: "Love The Details", description: "Care about precision and accuracy." },
      { id: 8, name: "Make Quality A Habit", description: "Standardize excellence and always deliver best work." },
      { id: 9, name: "Own The Outcome", description: "Take responsibility for results, not just activities." },
      { id: 10, name: "Maintain To Sustain", description: "Protect work-life balance and prevent burnout." },
      { id: 11, name: "Assume Good Intent", description: "Give benefit of the doubt and clarify with facts." },
      { id: 12, name: "Listen To Learn", description: "Listen fully and with curiosity." },
      { id: 13, name: "Say The Real Thing", description: "Communicate honestly and kindly, avoid gossip." },
      { id: 14, name: "Challenge, Then Unite", description: "Debate ideas respectfully, then move forward as one." },
      { id: 15, name: "Think Team First", description: "Collaborate, help others, and put team success first." },
      { id: 16, name: "Put The Client First", description: "Prioritize client goals and build trust." },
      { id: 17, name: "See The Whole Board", description: "Connect work to bigger picture and strategy." },
      { id: 18, name: "Respond With Precision", description: "Be quick, clear, and keep people updated." },
      { id: 19, name: "Test. Learn. Grow", description: "Take intelligent risks, learn by doing, and iterate." },
      { id: 20, name: "Get Better Every Day", description: "Continuously improve skills and work." },
      { id: 21, name: "Grow Through Change", description: "Embrace change to become stronger and more resilient." },
      { id: 22, name: "Share Information", description: "Share knowledge respectfully to strengthen the team." },
      { id: 23, name: "Always Be Curious", description: "Ask why, dig deeper for best solutions." },
      { id: 24, name: "Win With Stories & Data", description: "Use data and storytelling to communicate insights." },
      { id: 25, name: "Automate The Repeatable", description: "Use tools to save brainpower for creative work." },
      { id: 26, name: "Bring Fun To What You Do", description: "Enjoy the work, laugh often, and celebrate wins." },
    ];
    for (const kb of keyBehaviors) {
      await prisma.keyBehavior.upsert({ where: { id: kb.id }, update: kb, create: kb });
    }
    results.push("✅ Key Behaviors OK");

    // ─── SCENARIOS ───────────────────────────────────────
    results.push("Seeding all 12 scenarios...");

    // SCENARIO 1: The Acquisition Storm
    let title = await seedScenario({
      title: "The Acquisition Storm",
      description: "Level just acquired a small SEO agency. You're managing the integration of 4 new team members who are anxious about their roles and skeptical about Level's culture. Expectations are unclear and morale is fragile.",
      difficulty: "Medium",
      estimatedTimeMinutes: 12,
      primaryQ12Id: 1,
      secondaryQ12Id: 5,
      coreValueId: "no-ego",
      nodes: [
        {
          type: "REFLECTION", order: 0,
          content: "You've just been told your team is absorbing 4 people from a recently acquired SEO agency. They've heard rumors about layoffs. One of them, Marcus, was a team lead at the old agency and is clearly uncomfortable reporting to you.\n\nBefore your first meeting with the combined team tomorrow, reflect: **What is the most important thing you need to establish in that first interaction, and why?**",
        },
        {
          type: "DECISION", order: 1,
          content: "It's the first team meeting. Marcus visibly tenses when you start talking about \"how we do things at Level.\" He interrupts: \"We had our own way of doing things that worked just fine. Are we just supposed to forget all that?\"\n\nThe room goes quiet. Everyone is watching you.",
          choices: [
            {
              text: "\"Marcus, I hear you. Let's actually start by having your team share what was working — I want to understand your strengths before we talk about anything else.\"",
              explanation: "This honors their expertise while demonstrating humility. You're leading with curiosity, not authority — a textbook 'No Ego, All In' move that also addresses Q12 #1 (expectations) by signaling you value their input.",
              q12Impact: 2, pointsBase: 30,
              coreValueAlignment: { "no-ego": 2, "better": 1, "relentless": 0, "truth": 1 },
              behaviorsPositive: [1, 11, 12, 15], behaviorsNegative: [],
            },
            {
              text: "\"I understand the frustration, but we need to align on one way of working. Let me walk you through our processes so everyone's on the same page.\"",
              explanation: "While clarity is important, leading with 'our processes' right after an acquisition signals hierarchy, not partnership. This may technically set expectations but at the cost of trust.",
              q12Impact: 0, pointsBase: 10,
              coreValueAlignment: { "no-ego": -1, "better": 0, "relentless": 1, "truth": 0 },
              behaviorsPositive: [6], behaviorsNegative: [11, 12, 15],
            },
            {
              text: "\"That kind of attitude isn't going to help anyone. We're one team now, and I need everyone bought in.\"",
              explanation: "Shutting down dissent publicly is one of the fastest ways to destroy psychological safety. This makes people comply, not commit — the opposite of genuine engagement.",
              q12Impact: -2, pointsBase: -10,
              coreValueAlignment: { "no-ego": -2, "better": -1, "relentless": 0, "truth": -1 },
              behaviorsPositive: [], behaviorsNegative: [1, 11, 12, 13, 14],
            },
          ],
        },
        {
          type: "REFLECTION", order: 2,
          content: "After the meeting, one of the acquired team members, Priya, sends you a private Slack message: \"Thanks for today. I was really nervous. But I still don't really understand what my role is going to look like here.\"\n\n**Reflect: How would you approach clarifying Priya's role while respecting that things are still being figured out?**",
        },
        {
          type: "DECISION", order: 3,
          content: "A week later, you notice Marcus and the original team members are still working in separate silos. The acquired team does their SEO work; your original team does theirs. There's no collaboration, and a client deliverable nearly slipped through the cracks because no one knew who owned it.\n\nYou need to fix this before it becomes the norm.",
          choices: [
            {
              text: "Pair up one acquired team member with one original team member on each active client. Create shared ownership from the start, and hold a quick weekly sync to surface gaps.",
              explanation: "Structural integration with accountability. This forces collaboration naturally while creating a safety net (the sync). It addresses Q12 #1 (expectations) by making ownership crystal clear.",
              q12Impact: 2, pointsBase: 30,
              coreValueAlignment: { "no-ego": 2, "better": 1, "relentless": 2, "truth": 1 },
              behaviorsPositive: [6, 9, 15, 17], behaviorsNegative: [],
            },
            {
              text: "Send a Slack message to the team reminding everyone to collaborate and flag any ownership confusion. Trust them to figure it out.",
              explanation: "A Slack message won't rewire team dynamics. This avoids the hard work of structural change. Good managers don't just communicate — they architect collaboration.",
              q12Impact: -1, pointsBase: 5,
              coreValueAlignment: { "no-ego": 0, "better": -1, "relentless": -1, "truth": 0 },
              behaviorsPositive: [18], behaviorsNegative: [6, 9, 17],
            },
            {
              text: "Call a team meeting, lay out the ownership problem publicly, and ask the team to self-organize into integrated pods by end of day.",
              explanation: "Publicly surfacing the problem shows transparency, but forcing same-day self-organization on a team that barely knows each other creates anxiety, not alignment. The urgency is manufactured.",
              q12Impact: 0, pointsBase: 15,
              coreValueAlignment: { "no-ego": 0, "better": 0, "relentless": 1, "truth": 1 },
              behaviorsPositive: [13, 14], behaviorsNegative: [1, 10],
            },
          ],
        },
        {
          type: "OUTCOME", order: 4,
          content: "**Three months later:** The team has gelled. Marcus has become one of your most trusted collaborators — he later tells you that first meeting was the turning point. Priya is thriving in her clarified role and just got a shoutout from a client VP.\n\nThe integration wasn't easy, but your approach to expectations, humility, and structural collaboration made it work.\n\n*This scenario tested your ability to lead through organizational change with humility and clarity — the foundation of engagement.*",
        },
      ],
    });
    results.push(`✅ ${title}`);

    // SCENARIO 2: The Burnout Blind Spot
    title = await seedScenario({
      title: "The Burnout Blind Spot",
      description: "Your top performer, Jordan, has been crushing it for months — leading a major client pitch, mentoring a junior, and volunteering for every fire drill. But you're starting to notice cracks. This scenario tests whether you can spot burnout and act before it's too late.",
      difficulty: "Hard",
      estimatedTimeMinutes: 15,
      primaryQ12Id: 5,
      secondaryQ12Id: 11,
      coreValueId: "better",
      nodes: [
        {
          type: "REFLECTION", order: 0,
          content: "Jordan has been your rock for 6 months. They volunteered for the new client pitch, they're mentoring a new hire, and they picked up slack when a teammate was out on leave. Their work quality is still strong, but you've noticed they've been canceling 1:1s, their Slack responses are shorter, and they skipped the last team happy hour — which they usually organize.\n\n**Reflect: What signals are you seeing, and what might they mean? What's your responsibility as their manager right now?**",
        },
        {
          type: "DECISION", order: 1,
          content: "You manage to get Jordan into a 1:1. When you ask how they're doing, they say: \"I'm fine. Just busy. You know how it is.\"\n\nTheir tone is flat. They haven't made eye contact. Their camera is off (which is unusual for them).",
          choices: [
            {
              text: "\"Jordan, I want to be honest — I've noticed some changes and I'm genuinely concerned about you. Not your output, you. Can we talk about what's really going on?\"",
              explanation: "Leading with care over performance sends a powerful message. You're signaling that they matter as a person (Q12 #5). This requires vulnerability from you as a manager, which is hard but essential.",
              q12Impact: 2, pointsBase: 30,
              coreValueAlignment: { "no-ego": 1, "better": 2, "relentless": 0, "truth": 2 },
              behaviorsPositive: [1, 12, 13, 10], behaviorsNegative: [],
            },
            {
              text: "\"Okay, just making sure. Let's go through your project updates then. I want to make sure nothing's slipping.\"",
              explanation: "Accepting 'I'm fine' at face value when all signals say otherwise is a missed opportunity. Jumping to project updates signals that their output matters more than their wellbeing.",
              q12Impact: -1, pointsBase: 5,
              coreValueAlignment: { "no-ego": -1, "better": -1, "relentless": 1, "truth": -1 },
              behaviorsPositive: [9], behaviorsNegative: [1, 10, 12, 13],
            },
            {
              text: "\"I can tell something's off. I'm going to take the new client prep off your plate this week so you can breathe. Sound good?\"",
              explanation: "Good instinct to lighten the load, but doing it without understanding the real issue is paternalistic. You're solving a problem you haven't diagnosed yet.",
              q12Impact: 0, pointsBase: 15,
              coreValueAlignment: { "no-ego": 0, "better": 1, "relentless": -1, "truth": 0 },
              behaviorsPositive: [1, 4], behaviorsNegative: [12, 7],
            },
          ],
        },
        {
          type: "REFLECTION", order: 2,
          content: "Jordan opens up. They admit they've been stretched thin but felt like they couldn't say no because \"everyone's counting on me.\" They also mention that they haven't been learning anything new — just executing. They miss the creative, strategic side of their work.\n\n**Reflect: What's the real issue underneath Jordan's burnout? How does this connect to engagement, not just workload?**",
        },
        {
          type: "DECISION", order: 3,
          content: "You now have a clearer picture. Jordan is burned out, but it's not just about hours — it's about growth, meaning, and the fear of letting people down.\n\nYou need to take concrete action. What's your move?",
          choices: [
            {
              text: "Co-create a 30-day plan: redistribute one of their three responsibilities, carve out 4 hours/week for a strategic project they're passionate about, and schedule biweekly progress check-ins to talk about their growth — not just tasks.",
              explanation: "This is the gold standard. You're addressing workload AND engagement. The strategic time reconnects them to Q12 #3 (do best daily) and #12 (learn & grow). The check-ins address Q12 #11 (progress).",
              q12Impact: 2, pointsBase: 35,
              coreValueAlignment: { "no-ego": 1, "better": 2, "relentless": 1, "truth": 1 },
              behaviorsPositive: [1, 6, 10, 19, 20], behaviorsNegative: [],
            },
            {
              text: "Redistribute their mentoring responsibility and tell them to take a mental health day this Friday. They need a break.",
              explanation: "A mental health day is a band-aid. Redistributing work is helpful but doesn't address the deeper engagement gap. Jordan will come back Monday to the same structural problem.",
              q12Impact: 0, pointsBase: 15,
              coreValueAlignment: { "no-ego": 0, "better": 0, "relentless": 0, "truth": 0 },
              behaviorsPositive: [1, 10], behaviorsNegative: [6, 17, 20],
            },
            {
              text: "Tell Jordan you hear them and you'll advocate for a lighter workload in the next sprint planning. Ask them to hang tight for now.",
              explanation: "Deferring action when someone is actively burning out is a failure of urgency. 'Hang tight' is the opposite of what a burned-out person needs to hear.",
              q12Impact: -2, pointsBase: 0,
              coreValueAlignment: { "no-ego": -1, "better": -1, "relentless": -2, "truth": -1 },
              behaviorsPositive: [], behaviorsNegative: [5, 9, 10, 18],
            },
          ],
        },
        {
          type: "OUTCOME", order: 4,
          content: "**Six weeks later:** Jordan is re-energized. The strategic project you carved out? They turned it into a new service offering that the client team is now piloting. They told a colleague: \"My manager actually noticed I was drowning before I even fully admitted it to myself.\"\n\nBurnout isn't always about hours. It's about meaning, growth, and whether someone believes their manager truly cares.\n\n*This scenario tested your ability to see past performance to the person — and act on Q12 dimensions of care, progress, and development.*",
        },
      ],
    });
    results.push(`✅ ${title}`);

    // SCENARIO 3: The Recognition Vacuum
    title = await seedScenario({
      title: "The Recognition Vacuum",
      description: "Your team just pulled off a massive client win — a campaign that exceeded every KPI. But instead of celebrating, the mood is flat. Two people have quietly asked about other openings. Something is broken, and it might be you.",
      difficulty: "Medium",
      estimatedTimeMinutes: 12,
      primaryQ12Id: 4,
      secondaryQ12Id: 7,
      coreValueId: "relentless",
      nodes: [
        {
          type: "REFLECTION", order: 0,
          content: "Your team just delivered a campaign that beat the client's target ROAS by 40%. The client sent a glowing email to your VP. Your VP forwarded it to leadership with a note: \"Great work from the team.\"\n\nBut here's the thing — that email named you and the VP. Not a single team member was mentioned. And you didn't correct it or add context.\n\nNow, two days later, the mood is off. People seem disengaged. Your best media buyer, Aisha, was short with you in a meeting.\n\n**Reflect: What do you think happened here? What was the impact of the recognition gap, even if it was unintentional?**",
        },
        {
          type: "DECISION", order: 1,
          content: "You catch Aisha after the meeting and ask if everything's okay. She hesitates, then says: \"Honestly? We busted our asses on that campaign. Every weekend for three weeks. And then the 'great work' email goes out with your name on it. I know you didn't write it, but... nobody said anything.\"\n\nShe's not angry. She's deflated.",
          choices: [
            {
              text: "\"You're right, and I'm sorry. I should have immediately replied-all adding every person's name and contribution. I'm going to fix that today — publicly — and I want your help making sure I get the credits right.\"",
              explanation: "Owning the miss, committing to visible action, and involving Aisha in the solution. This demonstrates 'No Ego, All In' while directly addressing Q12 #4 (recognition).",
              q12Impact: 2, pointsBase: 30,
              coreValueAlignment: { "no-ego": 2, "better": 1, "relentless": 1, "truth": 2 },
              behaviorsPositive: [2, 3, 13, 15], behaviorsNegative: [],
            },
            {
              text: "\"I hear you. I'll make sure to mention the team in the next all-hands. I didn't mean for it to come across that way.\"",
              explanation: "Intent vs. impact. Your intent doesn't matter here — the damage is done. Promising future recognition doesn't heal the current wound.",
              q12Impact: 0, pointsBase: 10,
              coreValueAlignment: { "no-ego": 0, "better": 0, "relentless": 0, "truth": -1 },
              behaviorsPositive: [1], behaviorsNegative: [2, 5, 18],
            },
            {
              text: "\"I understand the frustration, but the VP wrote that email, not me. I can't control how leadership frames things. Let's focus on what's next.\"",
              explanation: "Deflecting responsibility is the exact wrong move. You had the power to correct it and didn't. 'Focus on what's next' dismisses the very real emotional impact.",
              q12Impact: -2, pointsBase: -10,
              coreValueAlignment: { "no-ego": -2, "better": -1, "relentless": 0, "truth": -2 },
              behaviorsPositive: [], behaviorsNegative: [2, 3, 9, 13],
            },
          ],
        },
        {
          type: "REFLECTION", order: 2,
          content: "After your conversation with Aisha, you start thinking about your recognition habits more broadly. You realize you tend to give feedback in private 1:1s but rarely celebrate wins publicly. Your team does incredible work, but the rest of the organization doesn't always see it.\n\n**Reflect: What systems or habits could you build to make recognition more consistent and visible — not just when someone complains?**",
        },
        {
          type: "DECISION", order: 3,
          content: "You want to fix this systemically, not just react to this one incident. You're designing your recognition approach going forward.\n\nWhat do you implement?",
          choices: [
            {
              text: "Create a weekly 'Win Wire' — a Friday Slack post where you publicly credit specific people for specific contributions. Also institute a standing 5-minute 'shoutout' segment in your team standup where anyone can recognize a teammate.",
              explanation: "Systemic and peer-driven. The Win Wire creates visibility beyond the team (Q12 #4), and the standup segment makes recognition a team habit, not just a manager behavior.",
              q12Impact: 2, pointsBase: 35,
              coreValueAlignment: { "no-ego": 2, "better": 2, "relentless": 1, "truth": 1 },
              behaviorsPositive: [2, 8, 15, 22, 26], behaviorsNegative: [],
            },
            {
              text: "Start sending personalized thank-you messages to each team member after big wins. Make it heartfelt and specific to their contribution.",
              explanation: "Private recognition is valuable but doesn't solve the visibility problem. This is necessary but insufficient.",
              q12Impact: 1, pointsBase: 20,
              coreValueAlignment: { "no-ego": 1, "better": 1, "relentless": 0, "truth": 0 },
              behaviorsPositive: [1, 2], behaviorsNegative: [17, 22],
            },
            {
              text: "Nominate team members for the quarterly Core Value Awards. That's what the program is for — let the formal system handle recognition.",
              explanation: "Quarterly awards are great but infrequent. Recognition needs to happen in days, not quarters, to drive engagement.",
              q12Impact: 0, pointsBase: 10,
              coreValueAlignment: { "no-ego": 0, "better": -1, "relentless": 0, "truth": 0 },
              behaviorsPositive: [2], behaviorsNegative: [8, 18, 20],
            },
          ],
        },
        {
          type: "OUTCOME", order: 4,
          content: "**Two months later:** The Win Wire has become one of the most-read Slack posts in the company. Other managers started copying it. Aisha recently told a new hire: \"One thing about this team — your work gets seen.\"\n\nRecognition isn't a perk. It's a performance strategy.\n\n*This scenario tested your ability to own recognition failures and build systems that celebrate the right people, consistently.*",
        },
      ],
    });
    results.push(`✅ ${title}`);

    // SCENARIO 4: The Difficult Conversation
    title = await seedScenario({
      title: "The Difficult Conversation",
      description: "One of your team members, Sam, has been underperforming for weeks. Deadlines are slipping, quality is down, and other team members are picking up the slack. You've been avoiding the conversation. Today that ends.",
      difficulty: "Hard",
      estimatedTimeMinutes: 15,
      primaryQ12Id: 11,
      secondaryQ12Id: 1,
      coreValueId: "truth",
      nodes: [
        { type: "REFLECTION", order: 0, content: "Sam has missed or partially delivered on 3 of their last 5 assignments. A client escalation last week was directly tied to a report Sam sent with incorrect data. Two teammates have privately told you they're frustrated because they keep having to cover.\n\nYou've been meaning to address it for two weeks but kept pushing it. Your next 1:1 with Sam is in 30 minutes.\n\n**Reflect: Why do managers often avoid difficult performance conversations? What's the cost of waiting?**" },
        { type: "DECISION", order: 1, content: "You're in the 1:1. Sam starts by talking about a new campaign idea they're excited about. They seem upbeat and unaware that there's a problem.\n\nHow do you transition into the difficult conversation?",
          choices: [
            { text: "\"Sam, I appreciate the enthusiasm. I want to talk about that, but first I need to have an honest conversation about some patterns I've noticed over the past few weeks. Can I share some specific observations?\"", explanation: "Direct, respectful, and specific. You're not ambushing them — you're naming the shift in topic clearly. Asking permission creates psychological safety while being Driven by Truth.", q12Impact: 2, pointsBase: 30, coreValueAlignment: { "no-ego": 1, "better": 1, "relentless": 1, "truth": 2 }, behaviorsPositive: [3, 6, 13, 12], behaviorsNegative: [] },
            { text: "Let Sam finish their pitch, give positive feedback on the idea, then casually mention: \"By the way, I noticed a few things slipped recently. Let's try to tighten up this quarter.\"", explanation: "Burying critical feedback in a casual aside is the worst of both worlds. Sam won't register the severity. This is sugarcoating — the opposite of Driven by Truth.", q12Impact: -1, pointsBase: 5, coreValueAlignment: { "no-ego": 0, "better": -1, "relentless": -1, "truth": -2 }, behaviorsPositive: [], behaviorsNegative: [3, 6, 13, 9] },
            { text: "\"Sam, we need to talk about your performance. Three of your last five deliverables were late or had errors, and it caused a client escalation. What's going on?\"", explanation: "The right content but a blunt delivery. Leading with the full indictment before any setup can trigger defensiveness.", q12Impact: 0, pointsBase: 15, coreValueAlignment: { "no-ego": -1, "better": 0, "relentless": 1, "truth": 1 }, behaviorsPositive: [13, 9], behaviorsNegative: [1, 11, 12] },
          ],
        },
        { type: "REFLECTION", order: 2, content: "Sam gets quiet. Then they say: \"I didn't realize it was that noticeable. Honestly... I've been dealing with some stuff at home. I didn't want to make excuses.\"\n\nThey look embarrassed.\n\n**Reflect: How do you hold someone accountable for performance while also showing genuine care for what they're going through? Where is the line between empathy and enabling?**" },
        { type: "DECISION", order: 3, content: "Sam has opened up about personal challenges. The performance issues are real, the personal context is real, and your team is feeling the impact.\n\nYou need to find a path forward that holds the standard without crushing the person.",
          choices: [
            { text: "\"Thank you for telling me that. I care about you and I want to support you. Here's what I'd like to do: let's build a 2-week plan with clear, achievable deliverables. I'll check in with you midweek — not to micromanage, but to make sure you have what you need. And if you need accommodations, let's talk to HR together.\"", explanation: "The full package: empathy + structure + accountability + support. The 2-week plan addresses Q12 #1 (clear expectations) and #11 (progress conversations). Offering HR shows you're not trying to be their therapist.", q12Impact: 2, pointsBase: 35, coreValueAlignment: { "no-ego": 1, "better": 2, "relentless": 1, "truth": 2 }, behaviorsPositive: [1, 3, 5, 6, 10, 13], behaviorsNegative: [] },
            { text: "\"I'm sorry you're going through that. Take whatever time you need — we'll figure out coverage. Just let me know when you're ready to come back at full speed.\"", explanation: "Compassionate but structureless. Without a plan, Sam doesn't know what 'full speed' looks like. Empathy without accountability is enabling.", q12Impact: -1, pointsBase: 10, coreValueAlignment: { "no-ego": 1, "better": -1, "relentless": -2, "truth": -1 }, behaviorsPositive: [1, 10], behaviorsNegative: [5, 6, 9, 15] },
            { text: "\"I appreciate you sharing that. But I have to be transparent — the team is feeling the impact and clients are noticing. I need to see improvement in the next two weeks or we'll need to involve HR to discuss next steps.\"", explanation: "Jumping to 'or else' language right after someone shared something vulnerable is a trust-breaker. You've just punished vulnerability.", q12Impact: -1, pointsBase: 10, coreValueAlignment: { "no-ego": -1, "better": -1, "relentless": 1, "truth": 0 }, behaviorsPositive: [9, 13], behaviorsNegative: [1, 10, 11, 12] },
          ],
        },
        { type: "OUTCOME", order: 4, content: "**One month later:** Sam completed every deliverable in the 2-week plan. They connected with an EAP counselor through HR. In your last 1:1, they said: \"That conversation was hard, but it was the first time a manager treated me like a whole person and still held me to a standard. I respect that.\"\n\nYour team noticed too. The fact that you addressed performance without destroying Sam sent a message: this is a team where truth and care coexist.\n\n*This scenario tested your ability to have difficult conversations with both honesty and humanity — the essence of Q12 #11 (progress) and Driven by Truth.*" },
      ],
    });
    results.push(`✅ ${title}`);

    // SCENARIO 5: The Gallup Q12 Deep Dive
    title = await seedScenario({
      title: "The Gallup Q12 Deep Dive",
      description: "Your team's engagement survey results are in and the scores are mixed. Before you can improve engagement, you need to understand what the Gallup Q12 measures and why each dimension matters. This scenario trains you on all 12 dimensions through a real team situation.",
      difficulty: "Medium",
      estimatedTimeMinutes: 15,
      primaryQ12Id: 1,
      secondaryQ12Id: 12,
      coreValueId: "better",
      nodes: [
        { type: "REFLECTION", order: 0, content: "Your team's Q12 engagement scores just came back. Here's what the Gallup Q12 actually measures — 12 questions, in a specific hierarchy:\n\n**Basic Needs (Foundation):**\n• Q1: I know what is expected of me at work.\n• Q2: I have the materials and equipment I need to do my work right.\n\n**Individual Contribution:**\n• Q3: At work, I have the opportunity to do what I do best every day.\n• Q4: In the last seven days, I have received recognition or praise for doing good work.\n• Q5: My supervisor, or someone at work, seems to care about me as a person.\n• Q6: There is someone at work who encourages my development.\n\n**Teamwork:**\n• Q7: At work, my opinions seem to count.\n• Q8: The mission/purpose of my company makes me feel my job is important.\n• Q9: My associates are committed to doing quality work.\n• Q10: I have a best friend at work.\n\n**Growth:**\n• Q11: In the last six months, someone has talked to me about my progress.\n• Q12: This last year, I have had opportunities to learn and grow.\n\nYour team scored lowest on Q1, Q4, and Q6. **Reflect: Why might these three be connected? What does it tell you about your management?**" },
        { type: "DECISION", order: 1, content: "The Gallup framework is hierarchical — you can't build engagement at the top if the foundation is cracked. Your team's low Q1 (Expectations) score means people aren't clear on what success looks like.\n\nYou're redesigning your team's operating rhythm. Where do you start?",
          choices: [
            { text: "Start with Q1 — schedule individual 'role clarity' sessions with each team member to co-define their top 3 priorities, success metrics, and decision-making authority. Then share these across the team so everyone knows who owns what.", explanation: "You're addressing the foundation first, which is exactly how the Q12 hierarchy works. Without clear expectations (Q1), recognition (Q4) and development (Q6) feel random. Co-defining priorities also touches Q7 (opinions count).", q12Impact: 2, pointsBase: 35, coreValueAlignment: { "no-ego": 1, "better": 2, "relentless": 2, "truth": 1 }, behaviorsPositive: [6, 9, 12, 17, 22], behaviorsNegative: [] },
            { text: "Focus on Q4 first — start recognizing people more. Slack shoutouts after every win. Recognition will lift spirits.", explanation: "Recognition matters, but the Q12 hierarchy exists for a reason. If people don't know what's expected (Q1), they won't know what they're being recognized FOR. You're decorating a house with no foundation.", q12Impact: 0, pointsBase: 15, coreValueAlignment: { "no-ego": 1, "better": 0, "relentless": 0, "truth": 0 }, behaviorsPositive: [2, 1], behaviorsNegative: [17, 7] },
            { text: "Address all three at once — create a development plan for each person covering expectations, recognition, and growth in one document.", explanation: "Ambitious but overwhelming. Trying to solve three issues simultaneously usually means none get solved well. The Q12 hierarchy suggests sequential improvement.", q12Impact: 0, pointsBase: 10, coreValueAlignment: { "no-ego": 0, "better": 1, "relentless": 1, "truth": 0 }, behaviorsPositive: [6, 20], behaviorsNegative: [7, 18] },
          ],
        },
        { type: "REFLECTION", order: 2, content: "After clarifying expectations, you turn to the middle of the Q12 pyramid.\n\nQ5 asks: \"Does my supervisor care about me as a person?\" This isn't about being friends — it's about whether your team believes you see them as whole humans, not productivity units.\n\nQ10 asks: \"I have a best friend at work.\" Sounds soft, but Gallup research shows it's one of the strongest predictors of retention and performance. It measures psychological safety and belonging.\n\n**Reflect: As a manager, how do you influence Q5 and Q10 without forcing fake friendships or overstepping boundaries?**" },
        { type: "DECISION", order: 3, content: "Three months into your engagement initiative. Q1 scores have risen. Now you need the growth dimensions — Q11 (Progress) and Q12 (Learn & Grow).\n\nDerek wants to go deep technically; Lila wants leadership skills. One-size-fits-all won't work.\n\nHow do you approach development?",
          choices: [
            { text: "Individual development conversations where YOU ask what growth looks like to THEM. For Derek, find a technical mentorship. For Lila, give her a project lead role. Check in monthly on growth — not tasks.", explanation: "Personalized and action-oriented. You're addressing Q6 (encourages development), Q11 (progress), and Q12 (learn & grow) — tailored to each person. This is what great managers do.", q12Impact: 2, pointsBase: 35, coreValueAlignment: { "no-ego": 1, "better": 2, "relentless": 1, "truth": 1 }, behaviorsPositive: [1, 6, 12, 19, 20, 23], behaviorsNegative: [] },
            { text: "Send both to the same leadership workshop. It covers technical and soft skills, so it should work for both.", explanation: "Generic development signals you haven't invested in understanding what each person needs. A workshop supplements, but doesn't replace personalized growth conversations.", q12Impact: 0, pointsBase: 10, coreValueAlignment: { "no-ego": 0, "better": 0, "relentless": 0, "truth": 0 }, behaviorsPositive: [20], behaviorsNegative: [1, 12, 23] },
            { text: "Tell both to come to you with a development plan. They should own their growth — you'll approve and support whatever they propose.", explanation: "Q6 specifically says 'someone who ENCOURAGES my development.' You're the encourager. Delegating that responsibility back entirely misses the point.", q12Impact: -1, pointsBase: 5, coreValueAlignment: { "no-ego": 0, "better": -1, "relentless": 0, "truth": 0 }, behaviorsPositive: [9], behaviorsNegative: [1, 6, 12, 22] },
          ],
        },
        { type: "OUTCOME", order: 4, content: "**Six months later:** Your team's Q12 scores improved across every dimension. Q1 jumped from 3.2 to 4.5. Q4 rose from 2.8 to 4.1. Q6 went from 3.0 to 4.4.\n\nTwo people who were quietly looking at other jobs decided to stay. The Gallup Q12 isn't just a survey — it's a diagnostic tool. Each question tells you something specific about what your team needs. And the hierarchy matters: fix the foundation before you decorate.\n\n*This scenario trained you on the Gallup Q12 framework — the science of employee engagement, and your roadmap as a manager.*" },
      ],
    });
    results.push(`✅ ${title}`);

    // SCENARIO 6: The Client Fire Drill
    title = await seedScenario({
      title: "The Client Fire Drill",
      description: "Your biggest client just called an emergency meeting — their CEO saw a competitor's campaign and demands a complete strategy pivot by Friday. Your team is already at capacity. How you handle the next 72 hours will define your leadership.",
      difficulty: "Hard",
      estimatedTimeMinutes: 12,
      primaryQ12Id: 9,
      secondaryQ12Id: 2,
      coreValueId: "relentless",
      nodes: [
        { type: "REFLECTION", order: 0, content: "It's Tuesday afternoon. The client's CEO saw a competitor's TikTok campaign go viral and is questioning your entire social strategy. They want a revised plan by Friday 10 AM.\n\nYour team is juggling three active campaigns. Two people are on PTO. The request feels unreasonable, but this client is 30% of revenue.\n\n**Reflect: How do you balance client urgency with team capacity? What's the difference between 'Relentless for Results' and just burning people out?**" },
        { type: "DECISION", order: 1, content: "You pull your team together. Taylor, your social strategist, says: \"We just finalized the Q2 plan last week. Are we really throwing it out because the CEO saw a TikTok?\"\n\nShe has a point. But the client is escalated.",
          choices: [
            { text: "\"Taylor, valid frustration. Here's the reality: we need to respond, but we're not throwing out our strategy. I need us to build a smart addendum — 2-3 test ideas inspired by what they saw, anchored in our data. I'll manage client expectations on scope. Let's timebox this to 8 hours total.\"", explanation: "Validated the concern, protected from scope creep, set a clear boundary, and still delivered urgency. Relentless for Results done right — results-focused without being reckless.", q12Impact: 2, pointsBase: 35, coreValueAlignment: { "no-ego": 1, "better": 1, "relentless": 2, "truth": 2 }, behaviorsPositive: [4, 6, 9, 16, 17], behaviorsNegative: [] },
            { text: "\"I know this is frustrating, but the client is our top account. Drop everything and build a new social strategy by Thursday night. I'll order dinner.\"", explanation: "This confuses urgency with heroics. 'Drop everything' destroys commitments to other clients. Ordering dinner doesn't make an unreasonable ask reasonable.", q12Impact: -1, pointsBase: 10, coreValueAlignment: { "no-ego": -1, "better": -1, "relentless": 1, "truth": -1 }, behaviorsPositive: [16], behaviorsNegative: [7, 8, 10, 15] },
            { text: "\"Let me push back on the client first and buy us more time. I'll ask for next Wednesday.\"", explanation: "Pushing back before exploring what's possible signals avoidance. Great managers figure out what IS possible first, then negotiate smartly.", q12Impact: 0, pointsBase: 15, coreValueAlignment: { "no-ego": 0, "better": 0, "relentless": -1, "truth": 1 }, behaviorsPositive: [10, 13], behaviorsNegative: [9, 16, 18] },
          ],
        },
        { type: "REFLECTION", order: 2, content: "Your team rallied and produced a sharp addendum in 6 hours. The client loved it. But now it's Friday afternoon — the team is drained and regular work is stacking up.\n\n**Reflect: What do you owe your team after a fire drill? How do you prevent 'fire drill culture' from becoming the norm?**" },
        { type: "DECISION", order: 3, content: "Monday morning. Your Account Director hints the client \"loves this new energy\" and wants more reactive pivots. How do you protect your team?",
          choices: [
            { text: "Meet with the AD: \"The team delivered brilliantly under pressure. But we can't make fire drills the operating model. I want to propose a monthly 'innovation sprint' with the client — channels their energy into structured experimentation instead of reactive pivots.\"", explanation: "Solving the root cause. By channeling client reactivity into structured innovation, you protect team capacity AND client satisfaction. This is seeing the whole board.", q12Impact: 2, pointsBase: 35, coreValueAlignment: { "no-ego": 1, "better": 2, "relentless": 2, "truth": 1 }, behaviorsPositive: [4, 8, 10, 16, 17, 19], behaviorsNegative: [] },
            { text: "Set up a rotation so different team members handle fire drills. That way no one person gets burned out.", explanation: "A rotation spreads the pain but doesn't fix the problem. You're normalizing fire drills instead of addressing why they keep happening.", q12Impact: 0, pointsBase: 15, coreValueAlignment: { "no-ego": 1, "better": 0, "relentless": 0, "truth": 0 }, behaviorsPositive: [15, 10], behaviorsNegative: [4, 17, 25] },
            { text: "Just take it as it comes. Some clients are high-maintenance — that's agency life.", explanation: "'That's agency life' is resignation, not results. Great managers shape the environment; they don't just accept it.", q12Impact: -2, pointsBase: 0, coreValueAlignment: { "no-ego": -1, "better": -2, "relentless": -1, "truth": -1 }, behaviorsPositive: [], behaviorsNegative: [1, 4, 10, 17, 20] },
          ],
        },
        { type: "OUTCOME", order: 4, content: "**Three months later:** The innovation sprint became a signature offering. The client renewed and cited your team's 'proactive creativity.' Your Q12 score for 'committed to quality' (Q9) went up because the team felt empowered to do great work on their terms.\n\nBeing Relentless for Results doesn't mean saying yes to everything. It means finding the smartest path to the outcome.\n\n*This scenario tested your ability to manage urgent client demands while protecting team quality and sustainability.*" },
      ],
    });
    results.push(`✅ ${title}`);

    // SCENARIO 7: The Culture Clash
    title = await seedScenario({
      title: "The Culture Clash",
      description: "Two strong personalities on your team have clashing working styles — one methodical and process-driven, the other fast and instinct-driven. The tension is starting to affect the whole team. Can you turn conflict into collaboration?",
      difficulty: "Medium",
      estimatedTimeMinutes: 12,
      primaryQ12Id: 7,
      secondaryQ12Id: 9,
      coreValueId: "no-ego",
      nodes: [
        { type: "REFLECTION", order: 0, content: "Reese is process-driven — documents everything, triple-checks campaigns, always wants alignment before acting. Kim is the opposite — fast, intuitive, delivers amazing results through creative instinct.\n\nReese complained that Kim 'goes rogue.' Kim says Reese 'slows everything down.' The rest of the team is taking sides.\n\n**Reflect: Is one of them right? Or is something more nuanced happening?**" },
        { type: "DECISION", order: 1, content: "In a team meeting, Kim shares a creative angle they tested on the fly — it performed well. Reese stiffens: \"I didn't know about this. We had a plan.\"\n\nKim fires back: \"If I'd waited for a plan, we'd have missed the trend entirely.\"\n\nThe room is tense.",
          choices: [
            { text: "\"Both of you are right. Kim, the instinct to move fast on a trend is exactly the agility we need. Reese, the concern about visibility is equally valid. The real issue is we don't have a shared agreement about when to go fast vs. when to align first. Let's build that together.\"", explanation: "Validated both perspectives, reframed conflict as a systems problem, and invited co-creation. This is 'Challenge, Then Unite' at its best.", q12Impact: 2, pointsBase: 35, coreValueAlignment: { "no-ego": 2, "better": 2, "relentless": 1, "truth": 1 }, behaviorsPositive: [4, 11, 12, 14, 15], behaviorsNegative: [] },
            { text: "\"Kim, results are great but Reese has a point — we need to communicate changes before they go live. Let's make sure we're aligned before testing new angles.\"", explanation: "You sided with process over agility. In a fast-paced agency, always defaulting to 'align first' can kill momentum and dismiss Kim's value.", q12Impact: 0, pointsBase: 15, coreValueAlignment: { "no-ego": 0, "better": -1, "relentless": -1, "truth": 0 }, behaviorsPositive: [6, 18], behaviorsNegative: [11, 14, 19] },
            { text: "\"Let's move on — this isn't the time. I'll talk to you both separately.\"", explanation: "Avoiding the conflict means the team sees you dodge it. This erodes psychological safety.", q12Impact: -1, pointsBase: 5, coreValueAlignment: { "no-ego": -1, "better": -1, "relentless": -1, "truth": -2 }, behaviorsPositive: [], behaviorsNegative: [4, 13, 14, 21] },
          ],
        },
        { type: "REFLECTION", order: 2, content: "After the meeting, two people message you: \"Thanks for handling that — it's been awkward.\"\n\n**Reflect: Working style differences aren't bad — they're only destructive without a framework. What team agreements could prevent this friction from becoming toxic?**" },
        { type: "DECISION", order: 3, content: "You schedule a team workshop to co-create working agreements. How do you run it?",
          choices: [
            { text: "Have each person share their working style and what they need from teammates. Then co-create a simple framework: 'Move Fast' scenarios (time-sensitive, low-risk) vs. 'Align First' scenarios (high-risk, multi-stakeholder). Let the team define the criteria.", explanation: "This turns a personality conflict into a team capability. Everyone's style is valued, the framework is co-owned, and it addresses Q7 (opinions count).", q12Impact: 2, pointsBase: 35, coreValueAlignment: { "no-ego": 2, "better": 2, "relentless": 1, "truth": 1 }, behaviorsPositive: [6, 12, 14, 15, 19, 22], behaviorsNegative: [] },
            { text: "Create the framework yourself based on what you've observed and present it for feedback.", explanation: "Efficient but top-down. A manager-imposed framework doesn't carry the same weight as one the team built.", q12Impact: 0, pointsBase: 15, coreValueAlignment: { "no-ego": -1, "better": 0, "relentless": 1, "truth": 0 }, behaviorsPositive: [6, 8], behaviorsNegative: [12, 14, 15] },
            { text: "Have Reese and Kim lead the workshop together — they need to figure this out themselves.", explanation: "Asking the two people in conflict to co-lead resolution without structure sets them up to fail publicly.", q12Impact: -1, pointsBase: 5, coreValueAlignment: { "no-ego": 0, "better": 0, "relentless": 0, "truth": -1 }, behaviorsPositive: [15], behaviorsNegative: [1, 4, 6, 9] },
          ],
        },
        { type: "OUTCOME", order: 4, content: "**Two months later:** Reese and Kim developed unexpected mutual respect. The 'Move Fast / Align First' framework became team shorthand. People started using it proactively: \"This feels like a Move Fast, yeah?\"\n\n*This scenario tested your ability to mediate working style conflicts by building shared frameworks that respect differences.*" },
      ],
    });
    results.push(`✅ ${title}`);

    // SCENARIO 8: The Data vs. Gut Dilemma
    title = await seedScenario({
      title: "The Data vs. Gut Dilemma",
      description: "Your team is split on a major campaign strategy. The data says one thing; the creative lead's instinct says another. The client presentation is in two days. Can you make truth-driven decisions while respecting diverse perspectives?",
      difficulty: "Hard",
      estimatedTimeMinutes: 12,
      primaryQ12Id: 8,
      secondaryQ12Id: 7,
      coreValueId: "truth",
      nodes: [
        { type: "REFLECTION", order: 0, content: "Your data team's analysis shows short-form UGC video performs best. Your creative lead, Nate, pushes for a bold brand film: \"Data shows what worked BEFORE. To break through, we need something unexpected.\"\n\nThe analysts counter: \"We have 6 months of data. Ignoring it isn't creative — it's reckless.\"\n\nThe client told you they value \"innovation backed by insight.\"\n\n**Reflect: How do you navigate data-driven decisions vs. creative instinct? Is one always right?**" },
        { type: "DECISION", order: 1, content: "Both sides have dug in. The analysts feel disrespected; the creative team feels constrained. The client presentation is in two days.",
          choices: [
            { text: "\"We lead with Nate's bold concept framed as a structured test alongside the data-proven approach. 70% proven UGC strategy, 30% brand film as a controlled experiment. We use data to validate the instinct, not suppress it.\"", explanation: "This is 'Win With Stories & Data' and 'Test. Learn. Grow' in action. You honored both perspectives and gave the client exactly what they asked for — innovation backed by insight.", q12Impact: 2, pointsBase: 35, coreValueAlignment: { "no-ego": 1, "better": 2, "relentless": 2, "truth": 2 }, behaviorsPositive: [14, 17, 19, 23, 24], behaviorsNegative: [] },
            { text: "Go with the data. The numbers don't lie. Tell Nate we'll explore his idea for a future campaign.", explanation: "Data-driven but creativity-killing. 'We'll explore it later' is often code for 'never.' You've told your creative team their instincts don't matter.", q12Impact: 0, pointsBase: 15, coreValueAlignment: { "no-ego": -1, "better": -1, "relentless": 1, "truth": 1 }, behaviorsPositive: [7, 24], behaviorsNegative: [12, 14, 19, 23] },
            { text: "Go with Nate's vision. Trust the talent. Data is backward-looking anyway.", explanation: "Dismissing data is the opposite of 'Driven by Truth.' Great agencies marry creativity and data — they don't pick one.", q12Impact: -1, pointsBase: 10, coreValueAlignment: { "no-ego": 0, "better": 0, "relentless": 0, "truth": -2 }, behaviorsPositive: [19], behaviorsNegative: [7, 8, 17, 24] },
          ],
        },
        { type: "REFLECTION", order: 2, content: "The client loved the 70/30 approach. Nate said: \"Presenting it as a test with data backing actually made it more persuasive. Thanks for finding the third way.\"\n\n**Reflect: What did this teach you about truth-seeking and creativity? How might 'Win With Stories & Data' become a daily practice?**" },
        { type: "DECISION", order: 3, content: "You want to make 'data + instinct' a team norm. How do you embed it?",
          choices: [
            { text: "Institute a 'Test & Learn' board: any team member can propose a creative experiment with a hypothesis, success metric, and test period. Review monthly. Winning tests get scaled; losing tests get celebrated for the learning.", explanation: "Systematic curiosity. Safe space for creative risk-taking with data discipline. Celebrating failed tests that generate learning is pure 'Better Every Day.'", q12Impact: 2, pointsBase: 35, coreValueAlignment: { "no-ego": 2, "better": 2, "relentless": 1, "truth": 2 }, behaviorsPositive: [8, 14, 19, 22, 23, 24], behaviorsNegative: [] },
            { text: "Add a 'data check' step to every creative brief — before any concept moves forward, it needs supporting data.", explanation: "This makes data a gatekeeper rather than a partner. Creative instincts sometimes need to run ahead of data.", q12Impact: 0, pointsBase: 15, coreValueAlignment: { "no-ego": 0, "better": 0, "relentless": 0, "truth": 1 }, behaviorsPositive: [7, 8], behaviorsNegative: [19, 23, 26] },
            { text: "Just keep doing what you're doing. The team saw the 70/30 approach work — they'll naturally adopt it.", explanation: "Culture doesn't happen by osmosis. Without a system, the team will revert to old patterns.", q12Impact: -1, pointsBase: 5, coreValueAlignment: { "no-ego": 0, "better": -1, "relentless": -1, "truth": 0 }, behaviorsPositive: [], behaviorsNegative: [8, 20, 22, 25] },
          ],
        },
        { type: "OUTCOME", order: 4, content: "**Four months later:** The Test & Learn board generated 14 experiments. 4 became standard practices. 2 failed spectacularly — and the team presented the failures at a company all-hands as 'Lessons Learned,' which got a standing ovation.\n\n*This scenario tested your ability to make truth-driven decisions while honoring creative instinct — the essence of 'Win With Stories & Data.'*" },
      ],
    });
    results.push(`✅ ${title}`);

    // SCENARIO 9: The Silent Quitter
    title = await seedScenario({
      title: "The Silent Quitter",
      description: "Dev used to be one of your most engaged team members — always volunteering, sharing ideas, bringing energy. Now they do the minimum and leave at exactly 5:00. They're not underperforming, they've just... stopped caring. Can you re-engage someone who's checked out?",
      difficulty: "Hard",
      estimatedTimeMinutes: 12,
      primaryQ12Id: 3,
      secondaryQ12Id: 6,
      coreValueId: "better",
      nodes: [
        { type: "REFLECTION", order: 0, content: "Dev has been on your team 2 years. For the first 18 months, they were a rockstar. Then about 6 months ago, something shifted. They still deliver what's asked, but nothing more. No new ideas. No mentoring. No excitement.\n\nThere's nothing to 'manage' from a performance standpoint. But you can feel the difference.\n\n**Reflect: What's the difference between 'quiet quitting' and a performance issue? Why is disengagement sometimes harder to address?**" },
        { type: "DECISION", order: 1, content: "In your 1:1, Dev shrugs about their goals: \"Just do my job well, I guess. I don't need to be employee of the month.\"\n\nNo hostility, but no spark either.",
          choices: [
            { text: "\"Dev, I've noticed a shift and I want to be real — not because anything's wrong with your work, but because I remember how energized you used to be. What changed? I'm asking because I care about you being fulfilled here, not just productive.\"", explanation: "Naming the shift while leading with care. The distinction between 'productive' and 'fulfilled' shows you understand engagement is about more than output.", q12Impact: 2, pointsBase: 30, coreValueAlignment: { "no-ego": 1, "better": 2, "relentless": 0, "truth": 2 }, behaviorsPositive: [1, 12, 13, 23], behaviorsNegative: [] },
            { text: "\"I want to talk about your development. Where do you want to grow? I'd love to see you take on more ownership.\"", explanation: "Well-intentioned but premature. If Dev is disengaged, jumping to 'grow more' feels tone-deaf. Understand the WHY first.", q12Impact: 0, pointsBase: 15, coreValueAlignment: { "no-ego": 0, "better": 1, "relentless": 0, "truth": 0 }, behaviorsPositive: [6, 20], behaviorsNegative: [12, 23] },
            { text: "Don't push it. Everyone goes through phases. If their work is fine, respect their boundaries.", explanation: "When engagement drops this significantly, it's a signal, not a phase. Ignoring it fails Q5 (cares about me) and Q6 (development).", q12Impact: -2, pointsBase: 0, coreValueAlignment: { "no-ego": 0, "better": -2, "relentless": -1, "truth": -1 }, behaviorsPositive: [], behaviorsNegative: [1, 12, 20, 23] },
          ],
        },
        { type: "REFLECTION", order: 2, content: "Dev opens up: \"I feel like I'm doing the same thing every day. I applied for the Strategy Lead role a few months ago and didn't even get an interview. That kind of broke something for me.\"\n\nThey ask: \"Does this place actually want people to grow, or just stay in their lane?\"\n\n**Reflect: Dev's disengagement is about unmet Q12 #3, #6, and #12. As their manager, did you know about the role they applied for?**" },
        { type: "DECISION", order: 3, content: "Dev's disengagement is rooted in feeling capped. The role rejection was the tipping point. How do you re-engage them?",
          choices: [
            { text: "\"I should have known about that application. Here's what I want to do: let's map out what the Strategy Lead role requires and build a plan to get you there. I'll give you one strategic project now so you're not just executing. And I'll advocate for you with leadership.\"", explanation: "Acknowledge the failure, create a concrete growth path, provide immediate stretch, and visibly advocate. This addresses Q3, Q6, Q11, and Q12 simultaneously.", q12Impact: 2, pointsBase: 35, coreValueAlignment: { "no-ego": 1, "better": 2, "relentless": 1, "truth": 2 }, behaviorsPositive: [1, 3, 5, 6, 17, 20], behaviorsNegative: [] },
            { text: "\"I'll talk to the hiring manager about why you didn't get the interview and see if there's an opening coming up. Keep doing great work — it'll get noticed.\"", explanation: "'Keep doing great work and it'll get noticed' is the exact promise that already failed Dev. They need structural change, not cheerleading.", q12Impact: 0, pointsBase: 10, coreValueAlignment: { "no-ego": 0, "better": 0, "relentless": 0, "truth": 0 }, behaviorsPositive: [1, 4], behaviorsNegative: [5, 6, 9, 20] },
            { text: "\"The Strategy Lead role required 5+ years of strategy experience. Let's focus on what you CAN do in your current role to grow.\"", explanation: "Even if true, this validates Dev's fear that the company wants them to 'stay in their lane.' You've confirmed their reason for checking out.", q12Impact: -1, pointsBase: 5, coreValueAlignment: { "no-ego": -1, "better": -1, "relentless": 0, "truth": 0 }, behaviorsPositive: [13], behaviorsNegative: [1, 6, 19, 20] },
          ],
        },
        { type: "OUTCOME", order: 4, content: "**Three months later:** Dev is re-engaged. The strategic project you gave them? They crushed it and presented to the executive team. Your VP asked: \"Why haven't we given them more opportunities sooner?\"\n\nDev told their partner: \"I was ready to leave. But my manager actually fought for me.\"\n\nQuiet quitting isn't a personality flaw — it's a symptom. When people stop caring, something stopped caring about them first.\n\n*This scenario tested your ability to re-engage a talented person by understanding root cause and building a real growth path.*" },
      ],
    });
    results.push(`✅ ${title}`);

    // SCENARIO 10: The New Manager Misstep
    title = await seedScenario({
      title: "The New Manager Misstep",
      description: "You promoted Casey from top IC to team lead. Three weeks in, their team is frustrated, Casey is overwhelmed, and the promotion created more problems than it solved. Can you coach a struggling new leader without undermining them?",
      difficulty: "Hard",
      estimatedTimeMinutes: 12,
      primaryQ12Id: 6,
      secondaryQ12Id: 1,
      coreValueId: "no-ego",
      nodes: [
        { type: "REFLECTION", order: 0, content: "Casey was your best IC — highest scores, fastest turnaround. The promotion seemed obvious. But three weeks in, Casey is doing the team's work instead of delegating. Their direct report Riley says: \"Why am I even here if Casey does everything?\"\n\nCasey confided: \"I feel like I'm failing. I was so good at my old job and now I don't know what I'm doing.\"\n\n**Reflect: What went wrong here? Is this Casey's failure, or yours?**" },
        { type: "DECISION", order: 1, content: "Casey vents: \"I can't let quality drop. If I delegate and it's not up to standard, the client suffers. I'd rather just do it myself.\"\n\nThe classic IC-to-manager trap.",
          choices: [
            { text: "\"Casey, your job is no longer to do the work — it's to develop people who can. When you take work from Riley, you're telling them you don't trust them. Let's identify one project where you coach Riley instead of doing it. I'll coach you through the coaching.\"", explanation: "Reframing the role, naming the behavior, and offering supported practice. 'I'll coach you through the coaching' is manager development gold.", q12Impact: 2, pointsBase: 35, coreValueAlignment: { "no-ego": 2, "better": 2, "relentless": 1, "truth": 2 }, behaviorsPositive: [1, 6, 12, 13, 22], behaviorsNegative: [] },
            { text: "\"You need to delegate more. Trust your team. I'll check back in a week.\"", explanation: "Correct advice with zero support. Telling a new manager to 'just delegate' without teaching them how is like telling someone to 'just swim.'", q12Impact: 0, pointsBase: 10, coreValueAlignment: { "no-ego": 0, "better": -1, "relentless": 0, "truth": 0 }, behaviorsPositive: [6], behaviorsNegative: [1, 12, 22] },
            { text: "\"Maybe the team lead role wasn't the right move yet. Would you be open to going back to IC?\"", explanation: "Offering to reverse the promotion 3 weeks in — before giving real coaching — is premature. It tells everyone new managers get one shot and no support.", q12Impact: -2, pointsBase: -5, coreValueAlignment: { "no-ego": 0, "better": -2, "relentless": -1, "truth": 0 }, behaviorsPositive: [13], behaviorsNegative: [1, 5, 6, 21] },
          ],
        },
        { type: "REFLECTION", order: 2, content: "Casey tried letting Riley lead a campaign with coaching instead of takeover. Riley made mistakes Casey would have avoided. But Riley learned, and the client outcome was still good.\n\nCasey: \"It was painful not to jump in. But Riley was so proud at the end. I think I'm starting to get it.\"\n\n**Reflect: What systems could prevent the IC-to-manager struggle from happening in the first place?**" },
        { type: "DECISION", order: 3, content: "Casey is growing into the role. But you realize Level doesn't have a way to prepare new managers. What do you do?",
          choices: [
            { text: "Propose a 'Manager Foundations' program: shadow a current manager for 2 weeks, learn the Q12 framework, and have a dedicated mentor for the first 90 days. Pitch it to your VP with Casey's experience as a case study.", explanation: "Turning a personal failure into systemic solution. This addresses root cause and demonstrates 'See The Whole Board' thinking.", q12Impact: 2, pointsBase: 35, coreValueAlignment: { "no-ego": 2, "better": 2, "relentless": 1, "truth": 1 }, behaviorsPositive: [4, 8, 17, 20, 22], behaviorsNegative: [] },
            { text: "Create a manager resource doc with tips and frameworks. Share it in the company wiki.", explanation: "Better than nothing, but a document alone won't transform capability. New managers need practice, coaching, and mentorship.", q12Impact: 0, pointsBase: 15, coreValueAlignment: { "no-ego": 0, "better": 1, "relentless": 0, "truth": 0 }, behaviorsPositive: [22, 25], behaviorsNegative: [1, 8, 17] },
            { text: "Focus on coaching Casey individually. Not every problem needs a company-wide program.", explanation: "If it happened to Casey, it will happen to the next new manager. Solving it one person at a time is inefficient.", q12Impact: -1, pointsBase: 5, coreValueAlignment: { "no-ego": 0, "better": -1, "relentless": -1, "truth": 0 }, behaviorsPositive: [1], behaviorsNegative: [4, 17, 20, 22] },
          ],
        },
        { type: "OUTCOME", order: 4, content: "**Six months later:** Casey is thriving. Riley just got promoted — Casey's coaching was cited as the reason. The Manager Foundations program is now company-wide.\n\nCasey told you at the holiday party: \"You didn't give up on me when I was ready to give up on myself.\"\n\n*This scenario tested your ability to coach new leaders with patience, structure, and systemic thinking.*" },
      ],
    });
    results.push(`✅ ${title}`);

    // SCENARIO 11: The Merger Integration
    title = await seedScenario({
      title: "The Merger Integration",
      description: "Level is merging Paid Media and Organic Content into one Digital Strategy team. You're leading the integration. Both teams think they're the 'real' team. How do you build one team from two cultures?",
      difficulty: "Hard",
      estimatedTimeMinutes: 15,
      primaryQ12Id: 8,
      secondaryQ12Id: 10,
      coreValueId: "no-ego",
      nodes: [
        { type: "REFLECTION", order: 0, content: "Your Paid Media team (6 people) is merging with Robin's Organic Content team (5 people). You've been named lead. Robin is now your peer, reporting to you.\n\nRobin says: \"My team is terrified they'll become button-pushers for paid campaigns.\" Your paid team thinks organic is 'just blog posts.'\n\n**Reflect: Both teams have identity tied to their specialty. How do you merge capabilities without erasing what makes each valuable?**" },
        { type: "DECISION", order: 1, content: "First combined meeting. People sit in their old groups. Kai from organic asks: \"Are we all going to have to learn paid media?\" Dana from paid mutters: \"And we didn't choose to write blog posts.\"\n\nThe divide is visceral.",
          choices: [
            { text: "\"This is not paid absorbing organic or vice versa. This is building something neither team could do alone. Kai, your content expertise becomes MORE powerful connected to paid data. Dana, your media skills get MORE strategic with content insight. The question is: what can we build together that no one else can?\"", explanation: "Reframed merger as creation, not absorption. Named each team's value and showed how they amplify each other. Building shared purpose (Q12 #8) from day one.", q12Impact: 2, pointsBase: 35, coreValueAlignment: { "no-ego": 2, "better": 2, "relentless": 1, "truth": 2 }, behaviorsPositive: [4, 14, 15, 17, 21], behaviorsNegative: [] },
            { text: "\"Let's keep things separate for now — paid does paid, organic does organic — and gradually find collaboration points.\"", explanation: "This avoids tension but kills the merger's purpose. 'Gradually' usually means 'never.'", q12Impact: -1, pointsBase: 5, coreValueAlignment: { "no-ego": -1, "better": -2, "relentless": -1, "truth": -1 }, behaviorsPositive: [10], behaviorsNegative: [4, 14, 15, 17, 21] },
            { text: "\"Everyone will cross-train on both paid and organic. Within 3 months, every person should run either type of campaign.\"", explanation: "Forced cross-training erases specialization. The goal should be integrated TEAMS, not integrated individuals.", q12Impact: -1, pointsBase: 10, coreValueAlignment: { "no-ego": -1, "better": 0, "relentless": 1, "truth": 0 }, behaviorsPositive: [6], behaviorsNegative: [1, 11, 12, 15] },
          ],
        },
        { type: "REFLECTION", order: 2, content: "Robin pulls you aside: \"My team is watching how you treat me. If they think I've been demoted, they'll never buy in.\"\n\n**Reflect: How do you ensure Robin retains credibility while you lead the combined team? What does 'No Ego, All In' look like with a real power dynamic?**" },
        { type: "DECISION", order: 3, content: "You need to structure the combined team. Robin is watching. Their team is watching. Your team is watching.",
          choices: [
            { text: "Make Robin explicit co-lead of integrated strategy projects. You lead operations and escalations; Robin leads cross-functional strategy and development. On projects, pair one paid person with one organic person, co-led in rotation.", explanation: "Genuine shared leadership preserving Robin's status with operational clarity. The paired structure forces integration while leadership models collaboration.", q12Impact: 2, pointsBase: 35, coreValueAlignment: { "no-ego": 2, "better": 1, "relentless": 1, "truth": 1 }, behaviorsPositive: [1, 6, 14, 15, 17], behaviorsNegative: [] },
            { text: "Give Robin ownership of organic work while you oversee paid. Meet weekly to coordinate.", explanation: "This is two teams with a weekly meeting — not a merger. You've preserved the status quo with extra meetings.", q12Impact: -1, pointsBase: 10, coreValueAlignment: { "no-ego": 0, "better": -1, "relentless": -1, "truth": 0 }, behaviorsPositive: [10], behaviorsNegative: [4, 15, 17, 21] },
            { text: "Make Robin a senior IC role — they can focus on strategy without management overhead. It's actually a gift.", explanation: "This IS the demotion Robin feared. Removing management responsibility in front of their team will cause exactly the trust collapse Robin warned about.", q12Impact: -2, pointsBase: -5, coreValueAlignment: { "no-ego": -2, "better": -1, "relentless": 0, "truth": -1 }, behaviorsPositive: [], behaviorsNegative: [1, 3, 11, 14, 15] },
          ],
        },
        { type: "OUTCOME", order: 4, content: "**Four months later:** The Digital Strategy team outperforms both legacy teams combined. A client told your VP: \"The way your team connects paid with content strategy is unlike any agency.\"\n\nKai and Dana — opposite sides of the room on day one — just co-presented an integrated campaign at the all-hands. Robin told their team: \"This is the best team I've ever been part of.\"\n\n*This scenario tested your ability to merge teams, navigate power dynamics, and build shared purpose in a high-growth agency.*" },
      ],
    });
    results.push(`✅ ${title}`);

    // SCENARIO 12: The Gossip Spiral
    title = await seedScenario({
      title: "The Gossip Spiral",
      description: "You overhear two team members talking about a third teammate behind their back. The comments aren't malicious exactly — but they're not kind. Left unchecked, this kind of talk can destroy team trust. Can you address gossip culture before it becomes the norm?",
      difficulty: "Medium",
      estimatedTimeMinutes: 10,
      primaryQ12Id: 10,
      secondaryQ12Id: 9,
      coreValueId: "truth",
      nodes: [
        { type: "REFLECTION", order: 0, content: "You overhear Toni and Avery in the break room:\n\nToni: \"Morgan left early AGAIN. Must be nice.\"\nAvery: \"And somehow they still get the good projects.\"\n\nMorgan recently worked out a flexible schedule with you due to a family situation — which you can't disclose.\n\n**Reflect: Is this gossip or reasonable frustration? Where's the line? What's your responsibility?**" },
        { type: "DECISION", order: 1, content: "You step around the corner. Toni and Avery see you and go quiet. This is your moment.",
          choices: [
            { text: "\"I overheard part of that. I know it can feel unfair when schedules differ. I can't share someone else's situation, but flexible arrangements exist for anyone who needs them. If you're feeling stretched, I want to hear that. But talking about a teammate when they're not here isn't the Level way. Can we agree to bring concerns directly?\"", explanation: "Addressed gossip without shaming, protected privacy, acknowledged feelings, redirected to direct communication, and reinforced culture. 'Say The Real Thing' at its finest.", q12Impact: 2, pointsBase: 35, coreValueAlignment: { "no-ego": 1, "better": 1, "relentless": 0, "truth": 2 }, behaviorsPositive: [3, 11, 13, 22], behaviorsNegative: [] },
            { text: "Pull them into a meeting room and firmly say gossip is unacceptable. Reference the Key Behaviors.", explanation: "Right message, wrong energy. A formal meeting-room talk for a break room comment feels heavy-handed. Creates fear instead of understanding.", q12Impact: 0, pointsBase: 10, coreValueAlignment: { "no-ego": -1, "better": 0, "relentless": 0, "truth": 1 }, behaviorsPositive: [3, 13], behaviorsNegative: [1, 11, 12] },
            { text: "Let it go. It was a minor comment — people vent. If it becomes a pattern, you'll address it.", explanation: "Small comments become culture. When a manager overhears gossip and does nothing, it signals gossip is acceptable.", q12Impact: -2, pointsBase: -5, coreValueAlignment: { "no-ego": -1, "better": -1, "relentless": -1, "truth": -2 }, behaviorsPositive: [], behaviorsNegative: [3, 8, 13, 15] },
          ],
        },
        { type: "REFLECTION", order: 2, content: "Avery comes to you privately: \"Thanks for that. I was frustrated because I've been wanting a flexible schedule too and didn't know it was an option. I should have just asked.\"\n\n**Reflect: Gossip often masks unmet needs. What could prevent gossip from forming in the first place?**" },
        { type: "DECISION", order: 3, content: "You want to proactively build a culture where people bring concerns directly. What's your approach?",
          choices: [
            { text: "Introduce a 'Direct Communication' norm: concern about a teammate? Talk to them first. Uncomfortable? Bring it to your manager. Never a third party. Pair this with monthly 'team health' check-ins for surfacing concerns safely.", explanation: "Clear behavioral expectation AND a safe channel. The 'talk to them first' norm is 'Say The Real Thing,' and health check-ins prevent concerns from festering.", q12Impact: 2, pointsBase: 30, coreValueAlignment: { "no-ego": 1, "better": 2, "relentless": 1, "truth": 2 }, behaviorsPositive: [3, 8, 13, 14, 22], behaviorsNegative: [] },
            { text: "Increase transparency by sharing a team calendar showing who's on what schedule. If people can see arrangements, they won't speculate.", explanation: "Helps this specific instance but doesn't address the broader gossip pattern.", q12Impact: 1, pointsBase: 15, coreValueAlignment: { "no-ego": 0, "better": 0, "relentless": 0, "truth": 1 }, behaviorsPositive: [18, 22], behaviorsNegative: [8, 13] },
            { text: "Send a general Slack message about communication norms. Keep it light.", explanation: "A passive Slack message won't shift behavior. Without a real conversation, this will be forgotten by lunch.", q12Impact: -1, pointsBase: 5, coreValueAlignment: { "no-ego": 0, "better": -1, "relentless": -1, "truth": -1 }, behaviorsPositive: [18], behaviorsNegative: [3, 8, 13, 22] },
          ],
        },
        { type: "OUTCOME", order: 4, content: "**Two months later:** The direct communication norm took hold. Avery started a flexible Friday schedule and mentioned it openly: \"I just asked.\" Morgan told you: \"I used to worry people resented me. Now it feels like we actually trust each other.\"\n\nGossip is never just gossip. It's a symptom of information gaps and cultural norms that haven't been set. Your job is to set them.\n\n*This scenario tested your ability to address gossip while building communication norms — the foundation of 'Say The Real Thing.'*" },
      ],
    });
    results.push(`✅ ${title}`);

    // ─── Admin user from env ────────────────────────────
    const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL || "myles.biggs@level.agency";
    const bootstrapName = bootstrapEmail.split("@")[0].split(".").map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
    await prisma.user.upsert({
      where: { email: bootstrapEmail },
      update: { role: "ADMIN" },
      create: { email: bootstrapEmail, name: bootstrapName, role: "ADMIN" },
    });
    results.push("✅ Admin user OK");

    results.push("🎉 ALL 12 SCENARIOS SEEDED SUCCESSFULLY!");
    return NextResponse.json({ success: true, steps: results }, { status: 200 });
  } catch (error: any) {
    console.error("Reseed error:", error);
    return NextResponse.json({
      success: false,
      error: "Reseed failed. Check server logs for details.",
    }, { status: 500 });
  }
}
