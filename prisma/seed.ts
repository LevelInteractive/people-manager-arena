// ═══════════════════════════════════════════════════════
// Level Up - Database Seed
// Seeds: Q12 Dimensions, Core Values, Key Behaviors,
//        4 Scenarios with nodes, choices, and scoring
// ═══════════════════════════════════════════════════════

import { PrismaClient, NodeType, BehaviorImpact } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Level Up database...\n");

  // ─── Q12 Dimensions ──────────────────────────────────
  console.log("  📊 Seeding Q12 Dimensions...");
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

  // ─── Core Values ─────────────────────────────────────
  console.log("  💎 Seeding Core Values...");
  const coreValues = [
    { id: "no-ego", name: "No Ego, All In", description: "Stay humble and work together. No task is too small, no person too big.", color: "#F59E0B" },
    { id: "better", name: "Better Every Day", description: "Embrace curiosity and growth. Focus on progress over perfection.", color: "#10B981" },
    { id: "relentless", name: "Relentless for Results", description: "Be driven to win and achieve goals. Act with urgency and accountability.", color: "#EF4444" },
    { id: "truth", name: "Driven by Truth", description: "Speak up even when it's tough. Value honesty, transparency, and data-driven decisions.", color: "#6366F1" },
  ];

  for (const cv of coreValues) {
    await prisma.coreValue.upsert({ where: { id: cv.id }, update: cv, create: cv });
  }

  // ─── Key Behaviors ───────────────────────────────────
  console.log("  🧭 Seeding 26 Key Behaviors...");
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

  // ─── Scenarios ───────────────────────────────────────
  console.log("  🎮 Seeding Scenarios...\n");

  // Helper to create a scenario with all its nodes/choices/behaviors
  async function seedScenario(data: {
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
  }) {
    // Delete existing scenario with same title
    const existing = await prisma.scenario.findFirst({ where: { title: data.title } });
    if (existing) {
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

    // Create choices (link next_node to the node after the current one)
    for (const nodeData of data.nodes) {
      if (nodeData.choices && nodeData.choices.length > 0) {
        const nodeId = nodeMap[nodeData.order];
        const nextNodeId = nodeMap[nodeData.order + 1] ?? null;

        for (const choiceData of nodeData.choices) {
          const choice = await prisma.choice.create({
            data: {
              nodeId: nodeId,
              choiceText: choiceData.text,
              nextNodeId: nextNodeId,
              explanationText: choiceData.explanation,
              q12Impact: choiceData.q12Impact,
              pointsBase: choiceData.pointsBase,
              coreValueAlignment: choiceData.coreValueAlignment,
            },
          });

          // Create behavior links
          for (const bId of choiceData.behaviorsPositive) {
            await prisma.choiceKeyBehavior.create({
              data: { choiceId: choice.id, keyBehaviorId: bId, impact: BehaviorImpact.POSITIVE },
            });
          }
          for (const bId of choiceData.behaviorsNegative) {
            await prisma.choiceKeyBehavior.create({
              data: { choiceId: choice.id, keyBehaviorId: bId, impact: BehaviorImpact.NEGATIVE },
            });
          }
        }
      }
    }

    console.log(`    ✅ ${data.title}`);
    return scenario;
  }

  // ─── SCENARIO 1: The Acquisition Storm ─────────────
  await seedScenario({
    title: "The Acquisition Storm",
    description: "Level just acquired a small SEO agency. You're managing the integration of 4 new team members who are anxious about their roles and skeptical about Level's culture. Expectations are unclear and morale is fragile.",
    difficulty: "Medium",
    estimatedTimeMinutes: 12,
    primaryQ12Id: 1,
    secondaryQ12Id: 5,
    coreValueId: "no-ego",
    nodes: [
      {
        type: NodeType.REFLECTION, order: 0,
        content: "You've just been told your team is absorbing 4 people from a recently acquired SEO agency. They've heard rumors about layoffs. One of them, Marcus, was a team lead at the old agency and is clearly uncomfortable reporting to you.\n\nBefore your first meeting with the combined team tomorrow, reflect: **What is the most important thing you need to establish in that first interaction, and why?**",
      },
      {
        type: NodeType.DECISION, order: 1,
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
        type: NodeType.REFLECTION, order: 2,
        content: "After the meeting, one of the acquired team members, Priya, sends you a private Slack message: \"Thanks for today. I was really nervous. But I still don't really understand what my role is going to look like here.\"\n\n**Reflect: How would you approach clarifying Priya's role while respecting that things are still being figured out?**",
      },
      {
        type: NodeType.DECISION, order: 3,
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
        type: NodeType.OUTCOME, order: 4,
        content: "**Three months later:** The team has gelled. Marcus has become one of your most trusted collaborators — he later tells you that first meeting was the turning point. Priya is thriving in her clarified role and just got a shoutout from a client VP.\n\nThe integration wasn't easy, but your approach to expectations, humility, and structural collaboration made it work.\n\n*This scenario tested your ability to lead through organizational change with humility and clarity — the foundation of engagement.*",
      },
    ],
  });

  // ─── SCENARIO 2: The Burnout Blind Spot ────────────
  await seedScenario({
    title: "The Burnout Blind Spot",
    description: "Your top performer, Jordan, has been crushing it for months — leading a major client pitch, mentoring a junior, and volunteering for every fire drill. But you're starting to notice cracks. This scenario tests whether you can spot burnout and act before it's too late.",
    difficulty: "Hard",
    estimatedTimeMinutes: 15,
    primaryQ12Id: 5,
    secondaryQ12Id: 11,
    coreValueId: "better",
    nodes: [
      {
        type: NodeType.REFLECTION, order: 0,
        content: "Jordan has been your rock for 6 months. They volunteered for the new client pitch, they're mentoring a new hire, and they picked up slack when a teammate was out on leave. Their work quality is still strong, but you've noticed they've been canceling 1:1s, their Slack responses are shorter, and they skipped the last team happy hour — which they usually organize.\n\n**Reflect: What signals are you seeing, and what might they mean? What's your responsibility as their manager right now?**",
      },
      {
        type: NodeType.DECISION, order: 1,
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
        type: NodeType.REFLECTION, order: 2,
        content: "Jordan opens up. They admit they've been stretched thin but felt like they couldn't say no because \"everyone's counting on me.\" They also mention that they haven't been learning anything new — just executing. They miss the creative, strategic side of their work.\n\n**Reflect: What's the real issue underneath Jordan's burnout? How does this connect to engagement, not just workload?**",
      },
      {
        type: NodeType.DECISION, order: 3,
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
        type: NodeType.OUTCOME, order: 4,
        content: "**Six weeks later:** Jordan is re-energized. The strategic project you carved out? They turned it into a new service offering that the client team is now piloting. They told a colleague: \"My manager actually noticed I was drowning before I even fully admitted it to myself.\"\n\nBurnout isn't always about hours. It's about meaning, growth, and whether someone believes their manager truly cares.\n\n*This scenario tested your ability to see past performance to the person — and act on Q12 dimensions of care, progress, and development.*",
      },
    ],
  });

  // ─── SCENARIO 3: The Recognition Vacuum ────────────
  await seedScenario({
    title: "The Recognition Vacuum",
    description: "Your team just pulled off a massive client win — a campaign that exceeded every KPI. But instead of celebrating, the mood is flat. Two people have quietly asked about other openings. Something is broken, and it might be you.",
    difficulty: "Medium",
    estimatedTimeMinutes: 12,
    primaryQ12Id: 4,
    secondaryQ12Id: 7,
    coreValueId: "relentless",
    nodes: [
      {
        type: NodeType.REFLECTION, order: 0,
        content: "Your team just delivered a campaign that beat the client's target ROAS by 40%. The client sent a glowing email to your VP. Your VP forwarded it to leadership with a note: \"Great work from the team.\"\n\nBut here's the thing — that email named you and the VP. Not a single team member was mentioned. And you didn't correct it or add context.\n\nNow, two days later, the mood is off. People seem disengaged. Your best media buyer, Aisha, was short with you in a meeting.\n\n**Reflect: What do you think happened here? What was the impact of the recognition gap, even if it was unintentional?**",
      },
      {
        type: NodeType.DECISION, order: 1,
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
        type: NodeType.REFLECTION, order: 2,
        content: "After your conversation with Aisha, you start thinking about your recognition habits more broadly. You realize you tend to give feedback in private 1:1s but rarely celebrate wins publicly. Your team does incredible work, but the rest of the organization doesn't always see it.\n\n**Reflect: What systems or habits could you build to make recognition more consistent and visible — not just when someone complains?**",
      },
      {
        type: NodeType.DECISION, order: 3,
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
        type: NodeType.OUTCOME, order: 4,
        content: "**Two months later:** The Win Wire has become one of the most-read Slack posts in the company. Other managers started copying it. Aisha recently told a new hire: \"One thing about this team — your work gets seen.\"\n\nRecognition isn't a perk. It's a performance strategy.\n\n*This scenario tested your ability to own recognition failures and build systems that celebrate the right people, consistently.*",
      },
    ],
  });

  // ─── SCENARIO 4: The Difficult Conversation ────────
  await seedScenario({
    title: "The Difficult Conversation",
    description: "One of your team members, Sam, has been underperforming for weeks. Deadlines are slipping, quality is down, and other team members are picking up the slack. You've been avoiding the conversation. Today that ends.",
    difficulty: "Hard",
    estimatedTimeMinutes: 15,
    primaryQ12Id: 11,
    secondaryQ12Id: 1,
    coreValueId: "truth",
    nodes: [
      {
        type: NodeType.REFLECTION, order: 0,
        content: "Sam has missed or partially delivered on 3 of their last 5 assignments. A client escalation last week was directly tied to a report Sam sent with incorrect data. Two teammates have privately told you they're frustrated because they keep having to cover.\n\nYou've been meaning to address it for two weeks but kept pushing it. Your next 1:1 with Sam is in 30 minutes.\n\n**Reflect: Why do managers often avoid difficult performance conversations? What's the cost of waiting?**",
      },
      {
        type: NodeType.DECISION, order: 1,
        content: "You're in the 1:1. Sam starts by talking about a new campaign idea they're excited about. They seem upbeat and unaware that there's a problem.\n\nHow do you transition into the difficult conversation?",
        choices: [
          {
            text: "\"Sam, I appreciate the enthusiasm. I want to talk about that, but first I need to have an honest conversation about some patterns I've noticed over the past few weeks. Can I share some specific observations?\"",
            explanation: "Direct, respectful, and specific. You're not ambushing them — you're naming the shift in topic clearly. Asking permission creates psychological safety while being Driven by Truth.",
            q12Impact: 2, pointsBase: 30,
            coreValueAlignment: { "no-ego": 1, "better": 1, "relentless": 1, "truth": 2 },
            behaviorsPositive: [3, 6, 13, 12], behaviorsNegative: [],
          },
          {
            text: "Let Sam finish their pitch, give positive feedback on the idea, then casually mention: \"By the way, I noticed a few things slipped recently. Let's try to tighten up this quarter.\"",
            explanation: "Burying critical feedback in a casual aside is the worst of both worlds. Sam won't register the severity. This is sugarcoating — the opposite of Driven by Truth.",
            q12Impact: -1, pointsBase: 5,
            coreValueAlignment: { "no-ego": 0, "better": -1, "relentless": -1, "truth": -2 },
            behaviorsPositive: [], behaviorsNegative: [3, 6, 13, 9],
          },
          {
            text: "\"Sam, we need to talk about your performance. Three of your last five deliverables were late or had errors, and it caused a client escalation. What's going on?\"",
            explanation: "The right content but a blunt delivery. Leading with the full indictment before any setup can trigger defensiveness.",
            q12Impact: 0, pointsBase: 15,
            coreValueAlignment: { "no-ego": -1, "better": 0, "relentless": 1, "truth": 1 },
            behaviorsPositive: [13, 9], behaviorsNegative: [1, 11, 12],
          },
        ],
      },
      {
        type: NodeType.REFLECTION, order: 2,
        content: "Sam gets quiet. Then they say: \"I didn't realize it was that noticeable. Honestly... I've been dealing with some stuff at home. I didn't want to make excuses.\"\n\nThey look embarrassed.\n\n**Reflect: How do you hold someone accountable for performance while also showing genuine care for what they're going through? Where is the line between empathy and enabling?**",
      },
      {
        type: NodeType.DECISION, order: 3,
        content: "Sam has opened up about personal challenges. The performance issues are real, the personal context is real, and your team is feeling the impact.\n\nYou need to find a path forward that holds the standard without crushing the person.",
        choices: [
          {
            text: "\"Thank you for telling me that. I care about you and I want to support you. Here's what I'd like to do: let's build a 2-week plan with clear, achievable deliverables. I'll check in with you midweek — not to micromanage, but to make sure you have what you need. And if you need accommodations, let's talk to HR together.\"",
            explanation: "The full package: empathy + structure + accountability + support. The 2-week plan addresses Q12 #1 (clear expectations) and #11 (progress conversations). Offering HR shows you're not trying to be their therapist.",
            q12Impact: 2, pointsBase: 35,
            coreValueAlignment: { "no-ego": 1, "better": 2, "relentless": 1, "truth": 2 },
            behaviorsPositive: [1, 3, 5, 6, 10, 13], behaviorsNegative: [],
          },
          {
            text: "\"I'm sorry you're going through that. Take whatever time you need — we'll figure out coverage. Just let me know when you're ready to come back at full speed.\"",
            explanation: "Compassionate but structureless. Without a plan, Sam doesn't know what 'full speed' looks like. Empathy without accountability is enabling.",
            q12Impact: -1, pointsBase: 10,
            coreValueAlignment: { "no-ego": 1, "better": -1, "relentless": -2, "truth": -1 },
            behaviorsPositive: [1, 10], behaviorsNegative: [5, 6, 9, 15],
          },
          {
            text: "\"I appreciate you sharing that. But I have to be transparent — the team is feeling the impact and clients are noticing. I need to see improvement in the next two weeks or we'll need to involve HR to discuss next steps.\"",
            explanation: "Jumping to 'or else' language right after someone shared something vulnerable is a trust-breaker. You've just punished vulnerability.",
            q12Impact: -1, pointsBase: 10,
            coreValueAlignment: { "no-ego": -1, "better": -1, "relentless": 1, "truth": 0 },
            behaviorsPositive: [9, 13], behaviorsNegative: [1, 10, 11, 12],
          },
        ],
      },
      {
        type: NodeType.OUTCOME, order: 4,
        content: "**One month later:** Sam completed every deliverable in the 2-week plan. They connected with an EAP counselor through HR. In your last 1:1, they said: \"That conversation was hard, but it was the first time a manager treated me like a whole person and still held me to a standard. I respect that.\"\n\nYour team noticed too. The fact that you addressed performance without destroying Sam sent a message: this is a team where truth and care coexist.\n\n*This scenario tested your ability to have difficult conversations with both honesty and humanity — the essence of Q12 #11 (progress) and Driven by Truth.*",
      },
    ],
  });

  // ─── Create a default admin user ───────────────────
  console.log("\n  👤 Creating default admin user...");
  await prisma.user.upsert({
    where: { email: "admin@levelagency.com" },
    update: { role: "ADMIN" },
    create: {
      email: "admin@levelagency.com",
      name: "Level Admin",
      role: "ADMIN",
    },
  });

  console.log("\n✅ Seed complete!\n");
  console.log("  📊 12 Q12 Dimensions");
  console.log("  💎 4 Core Values");
  console.log("  🧭 26 Key Behaviors");
  console.log("  🎮 4 Scenarios (with nodes, choices, scoring)");
  console.log("  👤 1 Admin user");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
