"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { signOut } from "next-auth/react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import api from "@/lib/api-client";

// ═══════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════
const T = {
  bg: "#000000", surface: "#111111", surfaceHover: "#1A1A1A",
  border: "#2A2A2A", accent: "#86D5F4", accentDim: "rgba(134,213,244,0.12)",
  accentGlow: "rgba(134,213,244,0.35)", text: "#FFFFFF", textDim: "#999999",
  textMuted: "#666666", success: "#8EE34D", danger: "#FD6EF8",
  warning: "#FFAA53", info: "#86D5F4", gray: "#D9DEF0",
};

// ═══════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ═══════════════════════════════════════════════════════
function Badge({ children, color = T.accent, style = {} }: any) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
      background: T.border + "88", color: T.text, border: `1px solid ${T.border}`, ...style,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {children}
    </span>
  );
}

function Card({ children, style = {}, onClick }: any) {
  return (
    <div onClick={onClick} style={{
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16,
      padding: 24, cursor: onClick ? "pointer" : "default", transition: "all 0.2s", ...style,
    }}
    onMouseEnter={e => { if (onClick) { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.background = T.surfaceHover; } }}
    onMouseLeave={e => { if (onClick) { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.surface; } }}
    >{children}</div>
  );
}

function Btn({ children, onClick, variant = "primary", disabled = false, style = {} }: any) {
  const vars: any = {
    primary: { background: T.accent, color: "#000" },
    secondary: { background: T.surfaceHover, color: T.text, border: `1px solid ${T.border}` },
    ghost: { background: "transparent", color: T.textDim },
    danger: { background: T.danger + "22", color: T.danger, border: `1px solid ${T.danger}44` },
  };
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      border: "none", borderRadius: 10, cursor: disabled ? "not-allowed" : "pointer",
      fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8,
      padding: "12px 24px", fontSize: 14, opacity: disabled ? 0.5 : 1,
      fontFamily: "inherit", transition: "all 0.2s", ...vars[variant], ...style,
    }}>{children}</button>
  );
}

function StatBox({ label, value, color = T.accent }: any) {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: 14, padding: "18px 20px", flex: 1, minWidth: 140,
    }}>
      <div style={{ fontSize: 12, color: T.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: T.text }}>{value}</div>
    </div>
  );
}

function ProgressBar({ value, max, color = T.accent, height = 6 }: any) {
  return (
    <div style={{ background: T.border, borderRadius: height, height, overflow: "hidden" }}>
      <div style={{
        width: `${Math.min(100, (value / max) * 100)}%`, height: "100%",
        background: `linear-gradient(90deg, ${color}, ${color}CC)`,
        borderRadius: height, transition: "width 0.6s ease",
      }} />
    </div>
  );
}

function Modal({ children, onClose, title }: any) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)",
      backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={(e: any) => e.stopPropagation()} style={{
        background: T.surface, borderRadius: 16, border: `1px solid ${T.border}`,
        padding: 32, maxWidth: 500, width: "90%",
      }} className="animate-slide-up">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: T.textDim, cursor: "pointer", fontSize: 24 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN GAME SHELL
// ═══════════════════════════════════════════════════════
export default function GameShell({ session, scenarios, referenceData, userProfile, onDataRefresh }: {
  session: any; scenarios: any[]; referenceData: any; userProfile: any; onDataRefresh: () => void;
}) {
  const [view, setView] = useState("home");
  const [selectedScenario, setSelectedScenario] = useState<any>(null);
  const [fullScenario, setFullScenario] = useState<any>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [showBugModal, setShowBugModal] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [adminData, setAdminData] = useState<any>(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [pendingResume, setPendingResume] = useState<any>(null);

  const user = session.user;
  const q12 = referenceData?.q12Dimensions || [];
  const coreValues = referenceData?.coreValues || [];
  const keyBehaviors = referenceData?.keyBehaviors || [];
  const stats = userProfile?.stats || {};

  const nav = (v: string) => { setView(v); window.scrollTo(0, 0); };

  const logEvent = useCallback(async (eventType: string, scenarioId?: string, metadata?: any) => {
    try { await api.events.log({ eventType, scenarioId, metadata }); } catch {}
  }, []);

  // Load full scenario when starting
  const startScenario = useCallback(async (scenario: any) => {
    try {
      const full = await api.scenarios.get(scenario.id);
      setFullScenario(full);
      setSelectedScenario(scenario);

      // Check for existing in-progress progress
      const progressList = await api.progress.get(scenario.id);
      const inProgress = progressList.find((p: any) => !p.completedAt && p.gameStateJson);

      if (inProgress) {
        // Show resume prompt
        setPendingResume(inProgress);
        setShowResumeModal(true);
      } else {
        // No in-progress, proceed with fresh gameState
        setGameState({
          currentNodeIndex: 0, responses: [], choicesMade: [],
          score: 0, q12Score: 0, cultureScore: 0,
          behaviorsPositive: [] as number[], behaviorsNegative: [] as number[],
          startTime: Date.now(),
        });
        nav("play");
        logEvent("scenario_started", scenario.id);
      }
    } catch (err) {
      console.error("Failed to load scenario:", err);
    }
  }, [logEvent]);

  const handleNodeComplete = useCallback(async (nodeData: any) => {
    if (!fullScenario || !gameState) return;
    const nodes = fullScenario.nodes;
    const currentNode = nodes[gameState.currentNodeIndex];
    const nextIndex = gameState.currentNodeIndex + 1;

    if (nodeData.type === "reflection") {
      // Save reflection to API
      try {
        await api.reflections.save({
          nodeId: currentNode.id,
          responseText: nodeData.text,
          scenarioId: fullScenario.id,
        });
      } catch {}

      setGameState((prev: any) => ({
        ...prev, responses: [...prev.responses, nodeData],
        score: prev.score + 10, currentNodeIndex: nextIndex,
      }));
    } else if (nodeData.type === "choice") {
      const choice = nodeData.choice;
      const cvScore = Object.values(choice.coreValueAlignment as Record<string, number>)
        .reduce((a: number, b: number) => a + b, 0);

      logEvent("choice_selected", fullScenario.id, { choiceId: choice.id });

      setGameState((prev: any) => ({
        ...prev,
        choicesMade: [...prev.choicesMade, { ...nodeData, allChoices: currentNode.choices }],
        score: prev.score + choice.pointsBase + choice.q12Impact + cvScore,
        q12Score: prev.q12Score + choice.q12Impact,
        cultureScore: prev.cultureScore + cvScore,
        behaviorsPositive: [...new Set([...prev.behaviorsPositive, ...(choice.keyBehaviorsPositive?.map((b: any) => b.id) || [])])],
        behaviorsNegative: [...new Set([...prev.behaviorsNegative, ...(choice.keyBehaviorsNegative?.map((b: any) => b.id) || [])])],
        currentNodeIndex: nextIndex,
      }));
    }
  }, [fullScenario, gameState, logEvent]);

  const finishScenario = useCallback(async () => {
    if (!fullScenario || !gameState) return;
    // Save progress to API
    try {
      await api.progress.save(fullScenario.id, {
        scoreTotal: gameState.score,
        q12ScoreTotal: gameState.q12Score,
        cultureScoreTotal: gameState.cultureScore,
        choicesJson: gameState.choicesMade.map((cm: any) => ({
          choiceId: cm.choice.id, choiceText: cm.choice.choiceText,
        })),
      });
    } catch {}
    setShowFeedback(true);
    nav("results");
    onDataRefresh(); // Refresh profile data
  }, [fullScenario, gameState, onDataRefresh]);

  // Load leaderboard
  useEffect(() => {
    if (view === "leaderboard") {
      api.leaderboard.get().then(setLeaderboard).catch(() => {});
    }
  }, [view]);

  // Load admin data
  useEffect(() => {
    if (view === "admin" && user.role === "ADMIN") {
      api.admin.analytics().then(setAdminData).catch(() => {});
    }
  }, [view, user.role]);

  // Auto-save game progress
  useEffect(() => {
    if (view !== "play" || !fullScenario || !gameState || gameState.currentNodeIndex === 0) return;
    const timer = setTimeout(() => {
      api.progress.autoSave(fullScenario.id, {
        currentNodeIndex: gameState.currentNodeIndex,
        gameStateJson: gameState,
        scoreTotal: gameState.score,
        q12ScoreTotal: gameState.q12Score,
        cultureScoreTotal: gameState.cultureScore,
      }).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [view, fullScenario, gameState]);

  // ═══════════════════════════════════════
  // NAV BAR
  // ═══════════════════════════════════════
  const navItems = [
    { key: "home", label: "Arena" },
    { key: "resources", label: "Resources" },
    { key: "profile", label: "Profile" },
    { key: "leaderboard", label: "Board" },
    ...(user.role === "ADMIN" ? [{ key: "admin", label: "Admin" }] : []),
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg }}>
      {/* NAV */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100, background: T.bg + "EE",
        backdropFilter: "blur(12px)", borderBottom: `1px solid ${T.border}`,
        padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div onClick={() => nav("home")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #86D5F4, #FD6EF8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 16, color: "#fff",
          }}>L</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.1 }}>LEVEL UP</div>
            <div style={{ fontSize: 9, color: T.textDim, letterSpacing: 2, textTransform: "uppercase" }}>The Manager Arena</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {navItems.map(item => (
            <button key={item.key} onClick={() => nav(item.key)} style={{
              background: view === item.key ? T.accentDim : "transparent",
              color: view === item.key ? T.accent : T.textDim,
              border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer",
              fontSize: 13, fontWeight: 600, fontFamily: "inherit",
            }}>{item.label}</button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setShowBugModal(true)} style={{
            background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8,
            padding: "6px 10px", cursor: "pointer", color: T.textDim, fontFamily: "inherit", fontSize: 12,
          }}>🐛 Bug</button>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: T.surfaceHover, borderRadius: 8, padding: "6px 12px",
          }}>
            {user.image ? (
              <img src={user.image} alt="" style={{ width: 28, height: 28, borderRadius: "50%" }} />
            ) : (
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "linear-gradient(135deg, #86D5F4, #FD6EF8)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: "#fff",
              }}>{user.name?.[0] || "?"}</div>
            )}
            <span style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</span>
            <Badge color={user.role === "ADMIN" ? T.info : T.success}>{user.role?.toLowerCase()}</Badge>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} style={{
            background: "transparent", border: "none", cursor: "pointer", color: T.textDim, padding: 4, fontSize: 18,
          }}>⏻</button>
        </div>
      </nav>

      {/* CONTENT */}
      <main style={{ maxWidth: view === "admin" ? 1400 : 1100, margin: "0 auto", padding: "24px 24px 80px" }}>
        {view === "home" && (
          <HomeView scenarios={scenarios} stats={stats} onStart={startScenario} />
        )}
        {view === "play" && fullScenario && gameState && (
          <PlayView
            scenario={fullScenario} gameState={gameState}
            onNodeComplete={handleNodeComplete} onFinish={finishScenario}
            keyBehaviors={keyBehaviors}
          />
        )}
        {view === "results" && fullScenario && gameState && (
          <ResultsView
            scenario={fullScenario} gameState={gameState}
            q12={q12} coreValues={coreValues} keyBehaviors={keyBehaviors}
            onBack={() => nav("home")}
          />
        )}
        {view === "resources" && (
          <ResourcesView q12={q12} coreValues={coreValues} keyBehaviors={keyBehaviors} />
        )}
        {view === "profile" && (
          <ProfileView user={user} stats={stats} q12={q12} coreValues={coreValues} recent={userProfile?.recentProgress || []} />
        )}
        {view === "leaderboard" && (
          <LeaderboardView data={leaderboard} currentUserId={user.id} />
        )}
        {view === "admin" && user.role === "ADMIN" && adminData && (
          <AdminView data={adminData} q12={q12} coreValues={coreValues} />
        )}
      </main>

      {/* MODALS */}
      {showBugModal && (
        <Modal onClose={() => setShowBugModal(false)} title="Report a Bug">
          <BugForm onSubmit={async (data: any) => {
            await api.bugs.submit({ ...data, browserInfo: navigator.userAgent, route: view });
            setShowBugModal(false);
          }} />
        </Modal>
      )}
      {showFeedback && fullScenario && (
        <Modal onClose={() => setShowFeedback(false)} title="How was this scenario?">
          <FeedbackForm onSubmit={async (data: any) => {
            await api.feedback.submit(fullScenario.id, data);
            setShowFeedback(false);
          }} />
        </Modal>
      )}
      {showResumeModal && pendingResume && (
        <Modal onClose={() => { setShowResumeModal(false); setPendingResume(null); }} title="Resume Scenario?">
          <p style={{ color: T.textDim, fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
            You have an in-progress session for this scenario. Would you like to pick up where you left off?
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <Btn onClick={async () => {
              // Start fresh
              try { await api.progress.deleteIncomplete(pendingResume.scenarioId); } catch {}
              setGameState({
                currentNodeIndex: 0, responses: [], choicesMade: [],
                score: 0, q12Score: 0, cultureScore: 0,
                behaviorsPositive: [] as number[], behaviorsNegative: [] as number[],
                startTime: Date.now(),
              });
              setShowResumeModal(false);
              setPendingResume(null);
              nav("play");
              logEvent("scenario_started", pendingResume.scenarioId);
            }} variant="secondary" style={{ flex: 1, justifyContent: "center" }}>Start Fresh</Btn>
            <Btn onClick={() => {
              const saved = pendingResume.gameStateJson;
              setGameState({
                ...saved,
                behaviorsPositive: saved.behaviorsPositive || [],
                behaviorsNegative: saved.behaviorsNegative || [],
              });
              setShowResumeModal(false);
              setPendingResume(null);
              nav("play");
              logEvent("scenario_resumed", pendingResume.scenarioId);
            }} style={{ flex: 1, justifyContent: "center" }}>Resume →</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// HOME VIEW
// ═══════════════════════════════════════════════════════
function HomeView({ scenarios, stats, onStart }: any) {
  return (
    <div className="animate-fade-in">
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Welcome to the Arena.</h1>
      <p style={{ color: T.textDim, fontSize: 16, lineHeight: 1.6, marginBottom: 32 }}>
        It&apos;s time for you to enter the arena and dare greatly. Choose a scenario to sharpen your leadership skills. Each one is a real management challenge — no right answers, just better ones.
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 40, flexWrap: "wrap" }}>
        <StatBox label="Total Score" value={stats.totalScore || 0} />
        <StatBox label="Completed" value={`${stats.scenariosCompleted || 0}/${scenarios.length}`} />
        <StatBox label="Avg Score" value={stats.avgScore || 0} />
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Scenario Arena</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
        {scenarios.map((s: any, i: number) => (
          <Card key={s.id} onClick={() => onStart(s)} style={{
            animation: `slideUp 0.5s ease ${i * 0.1}s both`, position: "relative",
          }}>
            {s.userCompleted && (
              <div style={{
                position: "absolute", top: 16, right: 16, background: T.success + "22",
                borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: T.success,
              }}>✓ Completed</div>
            )}
            {!s.userCompleted && s.userInProgress && (
              <div style={{
                position: "absolute", top: 16, right: 16, background: T.warning + "22",
                borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: T.warning,
              }}>⏳ In Progress</div>
            )}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <Badge color={s.coreValue?.color}>{s.coreValue?.name}</Badge>
              <Badge color={T.textDim}>Q12 #{s.primaryQ12Id}: {s.primaryQ12?.title}</Badge>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{s.title}</h3>
            <p style={{ color: T.textDim, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{s.description}</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: T.textMuted }}>
                <span>{s.difficulty}</span>
                <span>~{s.estimatedTimeMinutes} min</span>
                <span>{s.nodes?.length || 0} stages</span>
              </div>
              <div style={{ color: T.accent, fontSize: 13, fontWeight: 600 }}>
                {s.userCompleted ? "Replay →" : s.userInProgress ? "Continue →" : "Start →"}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PLAY VIEW (SCENARIO ENGINE)
// ═══════════════════════════════════════════════════════
function PlayView({ scenario, gameState, onNodeComplete, onFinish, keyBehaviors }: any) {
  const [reflText, setReflText] = useState("");
  const [selChoice, setSelChoice] = useState<any>(null);
  const [showExpl, setShowExpl] = useState(false);

  // Coaching state
  const [coachingActive, setCoachingActive] = useState(false);
  const [coachingLoading, setCoachingLoading] = useState(false);
  const [coachMessage, setCoachMessage] = useState("");
  const [coachExchanges, setCoachExchanges] = useState<Array<{ coachMessage: string; userResponse: string }>>([]);
  const [exchangeNumber, setExchangeNumber] = useState(0);
  const [coachReplyText, setCoachReplyText] = useState("");
  const [decisionFeedback, setDecisionFeedback] = useState<string | null>(null);
  const [decisionFeedbackLoading, setDecisionFeedbackLoading] = useState(false);

  const nodes = scenario.nodes || [];
  const current = nodes[gameState.currentNodeIndex];
  const isOver = gameState.currentNodeIndex >= nodes.length;

  useEffect(() => {
    setReflText(""); setSelChoice(null); setShowExpl(false);
    setCoachingActive(false); setCoachMessage(""); setCoachExchanges([]);
    setExchangeNumber(0); setCoachReplyText(""); setDecisionFeedback(null);
  }, [gameState.currentNodeIndex]);

  if (isOver || (current?.nodeType === "OUTCOME" && showExpl)) {
    return (
      <div style={{ textAlign: "center", paddingTop: 60 }} className="animate-fade-in">
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Scenario Complete!</h2>
        <Btn onClick={onFinish}>View Results →</Btn>
      </div>
    );
  }

  if (!current) return null;

  const progress = (gameState.currentNodeIndex / nodes.length) * 100;
  const formatContent = (text: string) => text.split("**").map((part: string, i: number) =>
    i % 2 === 1 ? <strong key={i} style={{ color: T.accent }}>{part}</strong> : <span key={i}>{part}</span>
  );

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }} className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <Badge color={scenario.coreValue?.color}>{scenario.coreValue?.name}</Badge>
            <span style={{ marginLeft: 8, fontSize: 13, color: T.textDim }}>{scenario.title}</span>
          </div>
          <span style={{ fontSize: 13, color: T.textMuted, fontFamily: "'Inter Tight', 'JetBrains Mono'" }}>
            {gameState.currentNodeIndex + 1} / {nodes.length}
          </span>
        </div>
        <ProgressBar value={progress} max={100} height={4} />
      </div>

      <Card style={{ padding: 32 }} className="animate-slide-up">
        <div style={{ marginBottom: 20 }}>
          <Badge color={current.nodeType === "REFLECTION" ? T.info : current.nodeType === "DECISION" ? T.warning : T.success}>
            {current.nodeType === "REFLECTION" ? "💭 Reflection" : current.nodeType === "DECISION" ? "⚡ Decision Point" : "🏁 Outcome"}
          </Badge>
        </div>

        <div style={{ fontSize: 16, lineHeight: 1.8, whiteSpace: "pre-wrap", marginBottom: 28 }}>
          {formatContent(current.contentText)}
        </div>

        {/* REFLECTION */}
        {current.nodeType === "REFLECTION" && !showExpl && !coachingActive && (
          <div>
            <textarea value={reflText} onChange={(e: any) => setReflText(e.target.value)}
              placeholder="Share your thoughts... (minimum 20 characters)"
              style={{
                width: "100%", minHeight: 140, padding: 16, background: T.bg,
                border: `1px solid ${T.border}`, borderRadius: 12, color: T.text,
                fontSize: 15, lineHeight: 1.6, resize: "vertical", outline: "none", fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
              <span style={{ fontSize: 12, color: T.textMuted }}>{reflText.length} characters</span>
              <Btn onClick={async () => {
                setCoachingLoading(true);
                try {
                  const res = await api.coaching.reflect({
                    scenarioId: scenario.id, nodeId: current.id,
                    userResponse: reflText, exchangeNumber: 1, priorExchanges: [],
                  });
                  setCoachMessage(res.coachMessage);
                  setExchangeNumber(1);
                  setCoachExchanges([]);
                  setCoachingActive(true);
                } catch (err) {
                  console.error("Coaching error:", err);
                  onNodeComplete({ type: "reflection", text: reflText, nodeId: current.id });
                } finally { setCoachingLoading(false); }
              }} disabled={reflText.trim().length < 20 || coachingLoading}>
                {coachingLoading ? "Thinking..." : "Submit Reflection →"}
              </Btn>
            </div>
          </div>
        )}

        {/* COACHING LOOP */}
        {current.nodeType === "REFLECTION" && coachingActive && (
          <div className="animate-slide-up">
            {/* Show the user's initial reflection */}
            <div style={{ background: T.bg, borderRadius: 12, padding: 16, marginBottom: 16, borderLeft: `3px solid ${T.textMuted}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 6 }}>Your Initial Reflection</div>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: T.textDim }}>{reflText}</div>
            </div>

            {/* Show prior exchanges */}
            {coachExchanges.map((ex, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <div style={{ background: T.accent + "11", borderRadius: 12, padding: 16, marginBottom: 8, borderLeft: `3px solid ${T.accent}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, marginBottom: 6 }}>🎯 Coach (Exchange {i + 1})</div>
                  <div style={{ fontSize: 14, lineHeight: 1.7, color: T.text }}>{ex.coachMessage}</div>
                </div>
                <div style={{ background: T.bg, borderRadius: 12, padding: 16, borderLeft: `3px solid ${T.textMuted}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 6 }}>You</div>
                  <div style={{ fontSize: 14, lineHeight: 1.7, color: T.textDim }}>{ex.userResponse}</div>
                </div>
              </div>
            ))}

            {/* Current coach message */}
            <div style={{ background: T.accent + "11", borderRadius: 12, padding: 16, marginBottom: 16, borderLeft: `3px solid ${T.accent}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, marginBottom: 6 }}>
                🎯 Coach {exchangeNumber < 3 ? `(Exchange ${exchangeNumber} of 3)` : "(Final Thought)"}
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.8, color: T.text }}>{coachMessage}</div>
            </div>

            {/* Reply or Continue */}
            {exchangeNumber < 3 ? (
              <div>
                <textarea value={coachReplyText} onChange={(e: any) => setCoachReplyText(e.target.value)}
                  placeholder="Respond to the coach... (or continue to next section)"
                  style={{
                    width: "100%", minHeight: 100, padding: 16, background: T.bg,
                    border: `1px solid ${T.border}`, borderRadius: 12, color: T.text,
                    fontSize: 15, lineHeight: 1.6, resize: "vertical", outline: "none", fontFamily: "inherit",
                  }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 12 }}>
                  <Btn onClick={() => onNodeComplete({ type: "reflection", text: reflText, nodeId: current.id })}
                    style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.textDim }}>
                    Skip & Continue →
                  </Btn>
                  <Btn onClick={async () => {
                    if (coachReplyText.trim().length < 10) return;
                    setCoachingLoading(true);
                    const newExchanges = [...coachExchanges, { coachMessage, userResponse: coachReplyText }];
                    try {
                      const res = await api.coaching.reflect({
                        scenarioId: scenario.id, nodeId: current.id,
                        userResponse: coachReplyText, exchangeNumber: exchangeNumber + 1,
                        priorExchanges: newExchanges,
                      });
                      setCoachExchanges(newExchanges);
                      setCoachMessage(res.coachMessage);
                      setExchangeNumber(exchangeNumber + 1);
                      setCoachReplyText("");
                    } catch (err) {
                      console.error("Coaching error:", err);
                      onNodeComplete({ type: "reflection", text: reflText, nodeId: current.id });
                    } finally { setCoachingLoading(false); }
                  }} disabled={coachReplyText.trim().length < 10 || coachingLoading}>
                    {coachingLoading ? "Thinking..." : "Respond to Coach →"}
                  </Btn>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <Btn onClick={() => onNodeComplete({ type: "reflection", text: reflText, nodeId: current.id })}>
                  Continue to Next Section →
                </Btn>
              </div>
            )}
          </div>
        )}

        {/* DECISION */}
        {current.nodeType === "DECISION" && !showExpl && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(current.choices || []).map((choice: any) => (
              <div key={choice.id} onClick={() => setSelChoice(choice)} style={{
                padding: 20, borderRadius: 12, cursor: "pointer", background: selChoice?.id === choice.id ? T.accentDim : T.bg,
                border: `2px solid ${selChoice?.id === choice.id ? T.accent : T.border}`, transition: "all 0.2s",
              }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                    border: `2px solid ${selChoice?.id === choice.id ? T.accent : T.border}`,
                    background: selChoice?.id === choice.id ? T.accent : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {selChoice?.id === choice.id && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                  </div>
                  <div style={{ fontSize: 15, lineHeight: 1.6 }}>{choice.choiceText}</div>
                </div>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <Btn onClick={() => setShowExpl(true)} disabled={!selChoice}>Lock In Choice →</Btn>
            </div>
          </div>
        )}

        {/* EXPLANATION */}
        {showExpl && selChoice && current.nodeType === "DECISION" && (
          <div className="animate-slide-up">
            <div style={{ background: T.bg, borderRadius: 12, padding: 24, border: `1px solid ${T.accent}33`, marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Breakdown</div>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: T.textDim }}>{selChoice.explanationText}</p>
              <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
                {[
                  { label: "Points", value: selChoice.pointsBase, key: "p" },
                  { label: "Q12", value: selChoice.q12Impact, key: "q" },
                  { label: "Culture", value: Object.values(selChoice.coreValueAlignment as Record<string, number>).reduce((a: number, b: number) => a + b, 0), key: "c" },
                ].map(s => (
                  <div key={s.key} style={{
                    background: ((s.value as number) >= 0 ? T.success : T.danger) + "11", borderRadius: 8, padding: "6px 14px",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <span style={{ fontSize: 11, color: T.textMuted }}>{s.label}</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: (s.value as number) >= 0 ? T.success : T.danger, fontFamily: "'Inter Tight', 'JetBrains Mono'" }}>
                      {(s.value as number) > 0 ? "+" : ""}{s.value}
                    </span>
                  </div>
                ))}
              </div>
              {selChoice.keyBehaviorsPositive?.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, color: T.success, fontWeight: 600, marginBottom: 6 }}>✓ Behaviors Activated</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {selChoice.keyBehaviorsPositive.map((b: any) => <Badge key={b.id} color={T.success} style={{ fontSize: 10 }}>{b.name}</Badge>)}
                  </div>
                </div>
              )}
              {selChoice.keyBehaviorsNegative?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: T.danger, fontWeight: 600, marginBottom: 6 }}>✗ Behaviors Missed</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {selChoice.keyBehaviorsNegative.map((b: any) => <Badge key={b.id} color={T.danger} style={{ fontSize: 10 }}>{b.name}</Badge>)}
                  </div>
                </div>
              )}
            </div>

            {/* Decision Coaching Feedback */}
            {decisionFeedback && (
              <div style={{
                background: T.warning + "11", borderRadius: 12, padding: 20, marginBottom: 20,
                borderLeft: `3px solid ${T.warning}`,
              }} className="animate-slide-up">
                <div style={{ fontSize: 11, fontWeight: 700, color: T.warning, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                  🎯 Coach&apos;s Note
                </div>
                <p style={{ fontSize: 15, lineHeight: 1.8, color: T.text, margin: 0 }}>{decisionFeedback}</p>
              </div>
            )}
            {decisionFeedbackLoading && (
              <div style={{ textAlign: "center", padding: 16, color: T.textMuted, fontSize: 13 }}>
                Getting coach feedback...
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Btn onClick={() => {
                // Fetch decision feedback if not already loaded
                if (!decisionFeedback && !decisionFeedbackLoading) {
                  setDecisionFeedbackLoading(true);
                  api.coaching.decision({
                    scenarioId: scenario.id, nodeId: current.id, chosenChoiceId: selChoice.id,
                  }).then(res => {
                    if (res.feedback) setDecisionFeedback(res.feedback);
                    setDecisionFeedbackLoading(false);
                    // Auto-continue after a brief moment if optimal
                    if (res.isOptimal) {
                      onNodeComplete({ type: "choice", choice: selChoice, nodeId: current.id });
                    }
                  }).catch(() => {
                    setDecisionFeedbackLoading(false);
                    onNodeComplete({ type: "choice", choice: selChoice, nodeId: current.id });
                  });
                } else {
                  onNodeComplete({ type: "choice", choice: selChoice, nodeId: current.id });
                }
              }}>
                {!decisionFeedback && !decisionFeedbackLoading ? "Get Feedback & Continue →" : "Continue →"}
              </Btn>
            </div>
          </div>
        )}

        {/* OUTCOME */}
        {current.nodeType === "OUTCOME" && !showExpl && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <Btn onClick={() => setShowExpl(true)}>See Results →</Btn>
          </div>
        )}
      </Card>

      <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 20, fontSize: 13, color: T.textMuted }}>
        <span>Score: <strong style={{ color: T.text }}>{gameState.score}</strong></span>
        <span>Q12: <strong style={{ color: gameState.q12Score >= 0 ? T.success : T.danger }}>{gameState.q12Score >= 0 ? "+" : ""}{gameState.q12Score}</strong></span>
        <span>Culture: <strong style={{ color: gameState.cultureScore >= 0 ? T.success : T.danger }}>{gameState.cultureScore >= 0 ? "+" : ""}{gameState.cultureScore}</strong></span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// RESULTS VIEW
// ═══════════════════════════════════════════════════════
function ResultsView({ scenario, gameState, q12, coreValues, keyBehaviors, onBack }: any) {
  const cvBreakdown = coreValues.map((cv: any) => {
    const total = gameState.choicesMade.reduce((sum: number, cm: any) => sum + (cm.choice.coreValueAlignment?.[cv.id] || 0), 0);
    return { name: cv.name?.split(",")[0], value: total, color: cv.color };
  });

  const q12Data = q12.map((q: any) => ({
    dimension: `Q${q.id}`,
    impact: Math.max(0, gameState.choicesMade.reduce((sum: number, cm: any) => {
      if (scenario.primaryQ12Id === q.id || scenario.secondaryQ12Id === q.id) return sum + (cm.choice.q12Impact || 0);
      return sum;
    }, 0) + 2),
  }));

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }} className="animate-fade-in">
      <Btn onClick={onBack} variant="ghost" style={{ marginBottom: 24 }}>← Back to Arena</Btn>

      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <Badge color={scenario.coreValue?.color}>{scenario.coreValue?.name}</Badge>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginTop: 8, marginBottom: 8 }}>{scenario.title}</h1>
        <p style={{ color: T.textDim }}>Performance Breakdown</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Total Score", value: gameState.score, color: T.accent },
          { label: "Q12 Impact", value: `${gameState.q12Score >= 0 ? "+" : ""}${gameState.q12Score}`, color: gameState.q12Score >= 0 ? T.success : T.danger },
          { label: "Culture Score", value: `${gameState.cultureScore >= 0 ? "+" : ""}${gameState.cultureScore}`, color: gameState.cultureScore >= 0 ? T.success : T.danger },
        ].map(s => (
          <Card key={s.label} style={{ textAlign: "center", padding: 24 }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: s.color, fontFamily: "'Inter Tight', 'JetBrains Mono'" }}>{s.value}</div>
            <div style={{ fontSize: 13, color: T.textDim, marginTop: 4 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* CV Alignment */}
      <Card style={{ marginBottom: 16, padding: 28 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Core Value Alignment</h3>
        {cvBreakdown.map((cv: any) => (
          <div key={cv.name} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{cv.name}</span>
              <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Inter Tight', 'JetBrains Mono'", color: cv.value >= 0 ? T.success : T.danger }}>
                {cv.value >= 0 ? "+" : ""}{cv.value}
              </span>
            </div>
            <ProgressBar value={Math.max(5, (cv.value + 4) / 8 * 100)} max={100} color={cv.color} height={8} />
          </div>
        ))}
      </Card>

      {/* Behaviors */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card style={{ padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: T.success, marginBottom: 14 }}>✓ Behaviors Activated ({gameState.behaviorsPositive.length})</h3>
          {gameState.behaviorsPositive.map((id: number) => {
            const b = keyBehaviors.find((kb: any) => kb.id === id);
            return b ? <div key={id} style={{ fontSize: 13, color: T.textDim, marginBottom: 4 }}><span style={{ color: T.success }}>●</span> {b.name}</div> : null;
          })}
          {gameState.behaviorsPositive.length === 0 && <div style={{ fontSize: 13, color: T.textMuted }}>None activated</div>}
        </Card>
        <Card style={{ padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: T.danger, marginBottom: 14 }}>✗ Behaviors to Watch ({gameState.behaviorsNegative.length})</h3>
          {gameState.behaviorsNegative.map((id: number) => {
            const b = keyBehaviors.find((kb: any) => kb.id === id);
            return b ? <div key={id} style={{ fontSize: 13, color: T.textDim, marginBottom: 4 }}><span style={{ color: T.danger }}>●</span> {b.name}</div> : null;
          })}
          {gameState.behaviorsNegative.length === 0 && <div style={{ fontSize: 13, color: T.textMuted }}>None flagged — nice!</div>}
        </Card>
      </div>

      {/* Q12 Radar */}
      <Card style={{ padding: 28, marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Q12 Engagement Radar</h3>
        <div style={{ height: 300 }}>
          <ResponsiveContainer>
            <RadarChart data={q12Data}>
              <PolarGrid stroke={T.border} />
              <PolarAngleAxis dataKey="dimension" tick={{ fill: T.textDim, fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 4]} tick={false} axisLine={false} />
              <Radar dataKey="impact" fill={T.accent} fillOpacity={0.3} stroke={T.accent} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Decision Replay with Coaching */}
      <DecisionReplaySection choicesMade={gameState.choicesMade} scenario={scenario} keyBehaviors={keyBehaviors} />

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Btn onClick={onBack}>Return to Arena</Btn>
      </div>
    </div>
  );
}

function DecisionReplaySection({ choicesMade, scenario, keyBehaviors }: any) {
  const [coachingState, setCoachingState] = useState<Record<number, { loading: boolean; feedback: string | null }>>({});

  const scoreChoice = (c: any) => {
    const cvScore = Object.values((c.coreValueAlignment || {}) as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
    return c.pointsBase + c.q12Impact + cvScore;
  };

  const getCoaching = async (index: number, cm: any) => {
    setCoachingState(prev => ({ ...prev, [index]: { loading: true, feedback: null } }));
    try {
      const res = await api.coaching.decision({
        scenarioId: scenario.id,
        nodeId: cm.nodeId,
        chosenChoiceId: cm.choice.id,
      });
      setCoachingState(prev => ({ ...prev, [index]: { loading: false, feedback: res.feedback } }));
    } catch {
      setCoachingState(prev => ({ ...prev, [index]: { loading: false, feedback: "Unable to load coaching feedback." } }));
    }
  };

  return (
    <Card style={{ padding: 28 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Decision Replay</h3>
      {choicesMade.map((cm: any, i: number) => {
        const choice = cm.choice;
        const cvScore = Object.values((choice.coreValueAlignment || {}) as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
        const chosenScore = scoreChoice(choice);

        // Find best alternative
        const allChoices = cm.allChoices || [];
        let bestAlt: any = null;
        let bestAltScore = chosenScore;
        allChoices.forEach((c: any) => {
          if (c.id !== choice.id) {
            const s = scoreChoice(c);
            if (s > bestAltScore) { bestAlt = c; bestAltScore = s; }
          }
        });

        const isOptimal = !bestAlt;
        const coaching = coachingState[i];

        return (
          <div key={i} style={{ padding: 20, background: T.bg, borderRadius: 12, marginBottom: 16, border: `1px solid ${isOptimal ? T.success + "44" : T.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: T.accent, fontWeight: 600 }}>Decision {i + 1}</div>
              {isOptimal && <Badge color={T.success} style={{ fontSize: 10 }}>Optimal Choice</Badge>}
            </div>

            <div style={{ fontSize: 14, marginBottom: 8, fontWeight: 600 }}>{choice.choiceText}</div>
            <div style={{ fontSize: 13, color: T.textDim, lineHeight: 1.6, marginBottom: 12 }}>{choice.explanationText}</div>

            {/* Score Breakdown */}
            <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
              {[
                { label: "Points", value: choice.pointsBase },
                { label: "Q12", value: choice.q12Impact },
                { label: "Culture", value: cvScore },
              ].map(s => (
                <div key={s.label} style={{
                  background: (s.value >= 0 ? T.success : T.danger) + "11", borderRadius: 8, padding: "4px 12px",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span style={{ fontSize: 10, color: T.textMuted }}>{s.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: s.value >= 0 ? T.success : T.danger, fontFamily: "'Inter Tight', 'JetBrains Mono'" }}>
                    {s.value > 0 ? "+" : ""}{s.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Behaviors */}
            {(choice.keyBehaviorsPositive?.length > 0 || choice.keyBehaviorsNegative?.length > 0) && (
              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                {(choice.keyBehaviorsPositive || []).map((b: any) => (
                  <Badge key={`p-${b.id}`} color={T.success} style={{ fontSize: 9 }}>✓ {b.name}</Badge>
                ))}
                {(choice.keyBehaviorsNegative || []).map((b: any) => (
                  <Badge key={`n-${b.id}`} color={T.danger} style={{ fontSize: 9 }}>✗ {b.name}</Badge>
                ))}
              </div>
            )}

            {/* Best Alternative */}
            {bestAlt && (
              <div style={{ background: T.warning + "0A", borderRadius: 10, padding: 14, marginBottom: 12, borderLeft: `3px solid ${T.warning}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.warning, marginBottom: 6 }}>Stronger Alternative</div>
                <div style={{ fontSize: 13, color: T.textDim, lineHeight: 1.6 }}>{bestAlt.choiceText}</div>
                <div style={{ fontSize: 12, color: T.textMuted, marginTop: 6, fontStyle: "italic" }}>{bestAlt.explanationText}</div>
              </div>
            )}

            {/* Coaching Button */}
            {!isOptimal && !coaching?.feedback && (
              <Btn onClick={() => getCoaching(i, cm)} disabled={coaching?.loading}
                variant="secondary" style={{ fontSize: 12, padding: "8px 16px" }}>
                {coaching?.loading ? "Loading..." : "Get Coach's Take →"}
              </Btn>
            )}

            {/* Coaching Feedback */}
            {coaching?.feedback && (
              <div style={{ background: T.accent + "0A", borderRadius: 10, padding: 14, borderLeft: `3px solid ${T.accent}` }} className="animate-slide-up">
                <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, marginBottom: 6 }}>Coach&apos;s Take</div>
                <div style={{ fontSize: 13, color: T.text, lineHeight: 1.7 }}>{coaching.feedback}</div>
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════
// RESOURCES VIEW
// ═══════════════════════════════════════════════════════

function ResourcesView({ q12, coreValues, keyBehaviors }: any) {
  const [tab, setTab] = useState("q12");
  const tabs = [
    { key: "q12", label: "Gallup Q12" },
    { key: "values", label: "Core Values" },
    { key: "behaviors", label: "Key Behaviors" },
  ];

  return (
    <div className="animate-fade-in">
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Resources</h1>
      <p style={{ color: T.textDim, fontSize: 16, lineHeight: 1.6, marginBottom: 32 }}>
        The frameworks and behaviors that power every scenario in the Arena. Use these as your field guide to becoming a stronger leader.
      </p>

      <div style={{ display: "flex", gap: 4, marginBottom: 28 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: tab === t.key ? T.accentDim : "transparent",
            color: tab === t.key ? T.accent : T.textDim,
            border: `1px solid ${tab === t.key ? T.accent + "44" : T.border}`,
            borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}>{t.label}</button>
        ))}
      </div>
      {tab === "q12" && (
        <div>
          <Card style={{ padding: 28, marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>The Gallup Q12</h2>
            <p style={{ color: T.textDim, fontSize: 14, lineHeight: 1.7 }}>
              The Gallup Q12 is a set of 12 survey statements that measure the most important elements of employee engagement.
              These dimensions form the foundation of how scenarios are scored in the Arena. Each scenario targets specific Q12
              dimensions, and your choices directly impact your Q12 engagement score.
            </p>
          </Card>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
            {q12.map((dim: any, i: number) => (
              <Card key={dim.id} style={{ padding: 20, animation: `slideUp 0.4s ease ${i * 0.05}s both` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: T.accentDim, display: "flex", alignItems: "center",
                    justifyContent: "center", fontWeight: 800, fontSize: 16,
                    color: T.accent, fontFamily: "'Inter Tight', 'JetBrains Mono'", flexShrink: 0,
                  }}>Q{dim.id}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 700 }}>{dim.title}</h3>
                </div>
                <p style={{ color: T.textDim, fontSize: 14, lineHeight: 1.6 }}>{dim.description}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
      {tab === "values" && (
        <div>
          <Card style={{ padding: 28, marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Level Core Values</h2>
            <p style={{ color: T.textDim, fontSize: 14, lineHeight: 1.7 }}>
              Our four core values define who we are and how we work at Level. In the Arena, every decision you make
              is scored against these values. Strong alignment means you are leading in a way that reflects our culture.
            </p>
          </Card>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {coreValues.map((cv: any, i: number) => (
              <Card key={cv.id} style={{ padding: 28, animation: `slideUp 0.4s ease ${i * 0.1}s both` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: cv.color, flexShrink: 0 }} />
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: T.text }}>{cv.name}</h3>
                </div>
                <p style={{ color: T.textDim, fontSize: 14, lineHeight: 1.7 }}>{cv.description}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "behaviors" && (
        <div>
          <Card style={{ padding: 28, marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>26 Key Behaviors</h2>
            <p style={{ color: T.textDim, fontSize: 14, lineHeight: 1.7 }}>
              These are the specific behaviors we expect from leaders at Level. During scenario play, your choices
              activate positive behaviors or flag missed opportunities. Over time, your behavior profile reveals your
              leadership strengths and areas for growth.
            </p>
          </Card>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
            {keyBehaviors.map((kb: any, i: number) => (
              <Card key={kb.id} style={{ padding: 20, animation: `slideUp 0.3s ease ${i * 0.03}s both` }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: T.accent + "15", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 13, fontWeight: 800,
                    color: T.accent, fontFamily: "'Inter Tight', 'JetBrains Mono'",
                  }}>{kb.id}</div>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{kb.name}</h4>
                    <p style={{ color: T.textDim, fontSize: 13, lineHeight: 1.6 }}>{kb.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PROFILE VIEW
// ═══════════════════════════════════════════════════════
function ProfileView({ user, stats, q12, coreValues, recent }: any) {
  return (
    <div className="animate-fade-in">
      <Card style={{ padding: 32, marginBottom: 24, display: "flex", alignItems: "center", gap: 24 }}>
        {user.image ? (
          <img src={user.image} alt="" style={{ width: 72, height: 72, borderRadius: "50%" }} />
        ) : (
          <div style={{
            width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #86D5F4, #FD6EF8)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "#fff",
          }}>{user.name?.[0]}</div>
        )}
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{user.name}</h2>
          <p style={{ color: T.textDim, fontSize: 14 }}>{user.email}</p>
        </div>
        <div style={{ display: "flex", gap: 24, textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 900, color: T.accent, fontFamily: "'Inter Tight', 'JetBrains Mono'" }}>{stats.totalScore || 0}</div>
            <div style={{ fontSize: 12, color: T.textDim }}>Total Points</div>
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 900, color: T.success, fontFamily: "'Inter Tight', 'JetBrains Mono'" }}>{stats.scenariosCompleted || 0}</div>
            <div style={{ fontSize: 12, color: T.textDim }}>Completed</div>
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 900, color: T.warning, fontFamily: "'Inter Tight', 'JetBrains Mono'" }}>{stats.avgScore || 0}</div>
            <div style={{ fontSize: 12, color: T.textDim }}>Avg Score</div>
          </div>
        </div>
      </Card>

      <Card style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Completed Scenarios</h3>
        {recent.length === 0 ? (
          <p style={{ color: T.textMuted, fontSize: 14 }}>No scenarios completed yet. Head to the Arena!</p>
        ) : (
          recent.map((r: any, i: number) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: 16, background: T.bg, borderRadius: 10, border: `1px solid ${T.border}`, marginBottom: 8,
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{r.scenarioTitle}</div>
                <div style={{ fontSize: 12, color: T.textDim, marginTop: 2 }}>{new Date(r.completedAt).toLocaleDateString()}</div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.accent, fontFamily: "'Inter Tight', 'JetBrains Mono'" }}>{r.score}</div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// LEADERBOARD VIEW
// ═══════════════════════════════════════════════════════
function LeaderboardView({ data, currentUserId }: any) {
  const [sort, setSort] = useState("score");
  const sorted = useMemo(() => {
    const copy = [...data];
    if (sort === "completed") copy.sort((a: any, b: any) => b.scenariosCompleted - a.scenariosCompleted);
    else if (sort === "q12") copy.sort((a: any, b: any) => b.avgQ12Score - a.avgQ12Score);
    else copy.sort((a: any, b: any) => b.totalScore - a.totalScore);
    return copy;
  }, [data, sort]);

  const medals = ["#FFD700", "#C0C0C0", "#CD7F32"];

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }} className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Leaderboard</h1>
          <p style={{ color: T.textDim, fontSize: 14 }}>See how managers are leveling up.</p>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[{ k: "score", l: "Score" }, { k: "completed", l: "Completed" }, { k: "q12", l: "Q12 Avg" }].map(s => (
            <button key={s.k} onClick={() => setSort(s.k)} style={{
              background: sort === s.k ? T.accentDim : "transparent", color: sort === s.k ? T.accent : T.textDim,
              border: `1px solid ${sort === s.k ? T.accent + "44" : T.border}`, borderRadius: 8,
              padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>{s.l}</button>
          ))}
        </div>
      </div>

      {sorted.map((p: any, i: number) => {
        const rank = i + 1;
        const isYou = p.id === currentUserId || p.isCurrentUser;
        return (
          <div key={p.id} style={{
            display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", borderRadius: 12,
            background: isYou ? T.accentDim : T.surface, border: `1px solid ${isYou ? T.accent + "44" : T.border}`,
            marginBottom: 8, animation: `slideUp 0.3s ease ${i * 0.04}s both`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: rank <= 3 ? medals[rank - 1] + "22" : T.bg,
              border: `1px solid ${rank <= 3 ? medals[rank - 1] + "66" : T.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 14, color: rank <= 3 ? medals[rank - 1] : T.textMuted,
              fontFamily: "'Inter Tight', 'JetBrains Mono'",
            }}>{rank}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>
                {p.name} {isYou && <span style={{ fontSize: 11, color: T.accent }}>(You)</span>}
              </div>
              <div style={{ fontSize: 12, color: T.textMuted }}>{p.scenariosCompleted} completed</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: isYou ? T.accent : T.text, fontFamily: "'Inter Tight', 'JetBrains Mono'" }}>{p.totalScore}</div>
              <div style={{ fontSize: 11, color: T.textMuted }}>points</div>
            </div>
          </div>
        );
      })}
      {sorted.length === 0 && <Card><p style={{ color: T.textMuted }}>No data yet. Be the first to play!</p></Card>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ADMIN VIEW
// ═══════════════════════════════════════════════════════
function AdminView({ data, q12, coreValues }: any) {
  const [tab, setTab] = useState("usage");
  const usage = data.usage || {};

  return (
    <div className="animate-fade-in">
      <Badge color={T.info}>Admin</Badge>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 8, marginBottom: 8 }}>Dashboard</h1>
      <p style={{ color: T.textDim, marginBottom: 24 }}>Analytics and system health for Level Up.</p>

      <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
        {["usage", "q12", "culture", "scenarios", "bugs"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? T.accentDim : "transparent", color: tab === t ? T.accent : T.textDim,
            border: `1px solid ${tab === t ? T.accent + "44" : T.border}`, borderRadius: 8,
            padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            textTransform: "capitalize",
          }}>{t}</button>
        ))}
      </div>

      {tab === "usage" && (
        <div>
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <StatBox label="Active Users" value={usage.activeUsers30d || 0} />
            <StatBox label="Started" value={usage.totalStarted || 0} />
            <StatBox label="Completed" value={usage.totalCompleted || 0} />
            <StatBox label="Drop-off" value={`${usage.dropOffRate || 0}%`} />
            <StatBox label="Avg Time" value={`${usage.avgCompletionMinutes || 0}m`} />
            <StatBox label="Open Bugs" value={usage.totalBugsOpen || 0} />
          </div>
          <Card style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Recent Events</h3>
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {(data.recentEvents || []).map((e: any) => (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderBottom: `1px solid ${T.border}`, fontSize: 13 }}>
                  <span>
                    <Badge color={e.eventType.includes("completed") ? T.success : e.eventType.includes("started") ? T.warning : T.textDim} style={{ marginRight: 8 }}>
                      {e.eventType}
                    </Badge>
                    {e.userName && <span style={{ color: T.textDim }}>{e.userName}</span>}
                    {e.scenarioTitle && <span style={{ color: T.textMuted }}> · {e.scenarioTitle}</span>}
                  </span>
                  <span style={{ color: T.textMuted, fontFamily: "'Inter Tight', 'JetBrains Mono'", fontSize: 11 }}>
                    {new Date(e.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "q12" && (
        <Card style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Average Score per Q12 Dimension</h3>
          <div style={{ height: 350 }}>
            <ResponsiveContainer>
              <BarChart data={(data.q12Analytics?.dimensions || []).map((d: any) => ({ name: `Q${d.id}`, score: d.avgScore, title: d.title }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="name" tick={{ fill: T.textDim, fontSize: 11 }} />
                <YAxis tick={{ fill: T.textDim, fontSize: 11 }} />
                <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8 }} />
                <Bar dataKey="score" fill={T.accent} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {data.q12Analytics?.mostStruggled && (
            <p style={{ color: T.textDim, fontSize: 14, marginTop: 16 }}>
              Most struggled: <strong style={{ color: T.warning }}>Q12 #{data.q12Analytics.mostStruggled.id} ({data.q12Analytics.mostStruggled.title})</strong>
            </p>
          )}
        </Card>
      )}

      {tab === "culture" && (
        <Card style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Core Value Alignment</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {(data.cultureAnalytics?.values || []).map((cv: any) => (
              <div key={cv.id} style={{ padding: 20, background: T.bg, borderRadius: 12, border: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: cv.color }} />
                  <h4 style={{ fontSize: 14, fontWeight: 700 }}>{cv.name}</h4>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Inter Tight', 'JetBrains Mono'", color: T.accent }}>{cv.avgAlignment}</div>
                <div style={{ fontSize: 12, color: T.textMuted }}>avg alignment score</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "scenarios" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {(data.scenarioHealth || []).map((s: any) => (
            <Card key={s.id} style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <h4 style={{ fontSize: 15, fontWeight: 700 }}>{s.title}</h4>
                <Badge color={s.isActive ? T.success : T.danger}>{s.isActive ? "Active" : "Inactive"}</Badge>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 13, color: T.textMuted, marginBottom: 12 }}>
                <span>{s.difficulty}</span>
                <span>{s.totalCompletions} completions</span>
                <span>{s.completionRate}% rate</span>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ background: T.accent + "11", borderRadius: 8, padding: "6px 14px", fontSize: 13 }}>
                  Avg: <strong style={{ color: T.accent }}>{s.avgScore}</strong>
                </div>
                {s.avgFeedbackRating && (
                  <div style={{ background: T.warning + "11", borderRadius: 8, padding: "6px 14px", fontSize: 13 }}>
                    Rating: <strong style={{ color: T.warning }}>{s.avgFeedbackRating}/5</strong>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "bugs" && <AdminBugsTab />}
    </div>
  );
}

function AdminBugsTab() {
  const [bugs, setBugs] = useState<any[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [search, setSearch] = useState("");
  const [expandedBug, setExpandedBug] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const loadBugs = useCallback(async () => {
    try {
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      if (search) params.search = search;
      const res = await api.bugs.list(params);
      setBugs(res.bugs);
      setStatusCounts(res.statusCounts);
    } catch {}
  }, [filterStatus, filterPriority, search]);

  useEffect(() => { loadBugs(); }, [loadBugs]);

  const updateBug = async (id: string, data: any) => {
    setSaving(id);
    try {
      await api.bugs.update(id, data);
      await loadBugs();
    } catch {}
    setSaving(null);
  };

  const statusColors: Record<string, string> = {
    OPEN: T.danger, IN_PROGRESS: T.warning, RESOLVED: T.success, CLOSED: T.textMuted,
  };
  const priorityColors: Record<string, string> = {
    critical: T.danger, high: T.warning, medium: T.accent, low: T.textMuted,
  };

  return (
    <div>
      {/* Status Summary */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map(s => (
          <StatBox key={s} label={s.replace("_", " ")} value={statusCounts[s] || 0} color={statusColors[s]} />
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <select value={filterStatus} onChange={(e: any) => setFilterStatus(e.target.value)}
          style={{ background: T.surface, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: "inherit" }}>
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select value={filterPriority} onChange={(e: any) => setFilterPriority(e.target.value)}
          style={{ background: T.surface, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: "inherit" }}>
          <option value="">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <input value={search} onChange={(e: any) => setSearch(e.target.value)} placeholder="Search bugs..."
          style={{ background: T.surface, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: "inherit", flex: 1, minWidth: 200, outline: "none" }} />
      </div>

      {/* Bug List */}
      {bugs.map((bug: any) => {
        const isExpanded = expandedBug === bug.id;
        return (
          <Card key={bug.id} onClick={() => setExpandedBug(isExpanded ? null : bug.id)}
            style={{ marginBottom: 8, padding: 16, cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <Badge color={statusColors[bug.status]}>{bug.status.replace("_", " ")}</Badge>
                <Badge color={priorityColors[bug.priority || "medium"]}>{bug.priority || "medium"}</Badge>
                <span style={{ fontSize: 13, color: T.textDim }}>{bug.user?.name || bug.user?.email || "Unknown"}</span>
                {bug.route && <span style={{ fontSize: 11, color: T.textMuted }}>· {bug.route}</span>}
                {bug.scenario?.title && <span style={{ fontSize: 11, color: T.textMuted }}>· {bug.scenario.title}</span>}
              </div>
              <span style={{ fontSize: 11, color: T.textMuted, fontFamily: "'Inter Tight', 'JetBrains Mono'", whiteSpace: "nowrap" }}>
                {new Date(bug.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p style={{ fontSize: 13, color: T.textDim, marginTop: 8, lineHeight: 1.5 }}>
              {isExpanded ? bug.description : bug.description.substring(0, 150) + (bug.description.length > 150 ? "..." : "")}
            </p>

            {isExpanded && (
              <div onClick={(e: any) => e.stopPropagation()} style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
                {bug.browserInfo && (
                  <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 12 }}>Browser: {bug.browserInfo.substring(0, 80)}</div>
                )}
                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  <select value={bug.status} onChange={(e: any) => updateBug(bug.id, { status: e.target.value })}
                    style={{ background: T.bg, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 12, fontFamily: "inherit" }}>
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                  <select value={bug.priority || "medium"} onChange={(e: any) => updateBug(bug.id, { priority: e.target.value })}
                    style={{ background: T.bg, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 12, fontFamily: "inherit" }}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <textarea
                  value={editNotes[bug.id] !== undefined ? editNotes[bug.id] : (bug.adminNotes || "")}
                  onChange={(e: any) => setEditNotes(prev => ({ ...prev, [bug.id]: e.target.value }))}
                  placeholder="Admin notes..."
                  style={{ width: "100%", minHeight: 60, padding: 10, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", marginBottom: 8 }}
                />
                <Btn onClick={() => {
                  const notes = editNotes[bug.id] !== undefined ? editNotes[bug.id] : (bug.adminNotes || "");
                  updateBug(bug.id, { adminNotes: notes });
                }} disabled={saving === bug.id} variant="secondary" style={{ fontSize: 12, padding: "6px 14px" }}>
                  {saving === bug.id ? "Saving..." : "Save Notes"}
                </Btn>
              </div>
            )}
          </Card>
        );
      })}
      {bugs.length === 0 && <Card><p style={{ color: T.textMuted, fontSize: 14 }}>No bugs found matching your filters.</p></Card>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// FORMS
// ═══════════════════════════════════════════════════════
function FeedbackForm({ onSubmit }: any) {
  const [realism, setRealism] = useState(0);
  const [difficulty, setDifficulty] = useState(0);
  const [comment, setComment] = useState("");

  const Stars = ({ value, onChange, label }: any) => (
    <div style={{ marginBottom: 20 }}>
      <label style={{ fontSize: 14, fontWeight: 600, display: "block", marginBottom: 8 }}>{label}</label>
      <div style={{ display: "flex", gap: 4 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => onChange(n)} style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: n <= value ? T.warning : T.border, fontSize: 28, padding: 2,
          }}>★</button>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <Stars value={realism} onChange={setRealism} label="Was this realistic?" />
      <Stars value={difficulty} onChange={setDifficulty} label="Difficulty level?" />
      <textarea value={comment} onChange={(e: any) => setComment(e.target.value)} placeholder="Comments (optional)..."
        style={{ width: "100%", minHeight: 80, padding: 12, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none", marginBottom: 16 }} />
      <Btn onClick={() => onSubmit({ ratingRealism: realism, difficultyRating: difficulty, commentsText: comment })}
        disabled={!realism || !difficulty} style={{ width: "100%", justifyContent: "center" }}>Submit Feedback</Btn>
    </div>
  );
}

function BugForm({ onSubmit }: any) {
  const [desc, setDesc] = useState("");
  return (
    <div>
      <textarea value={desc} onChange={(e: any) => setDesc(e.target.value)} placeholder="Describe the bug..."
        style={{ width: "100%", minHeight: 100, padding: 12, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none", marginBottom: 16 }} />
      <Btn onClick={() => onSubmit({ description: desc })} disabled={desc.trim().length < 10}
        variant="danger" style={{ width: "100%", justifyContent: "center" }}>🐛 Submit Bug Report</Btn>
    </div>
  );
}
