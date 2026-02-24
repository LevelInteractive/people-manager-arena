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
// TOAST NOTIFICATION SYSTEM
// ═══════════════════════════════════════════════════════
type ToastType = "error" | "success" | "info";
interface Toast { id: number; message: string; type: ToastType; }

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  const colors: Record<ToastType, { bg: string; border: string; icon: string }> = {
    error: { bg: "rgba(253,110,248,0.12)", border: "#FD6EF8", icon: "⚠" },
    success: { bg: "rgba(142,227,77,0.12)", border: "#8EE34D", icon: "✓" },
    info: { bg: "rgba(134,213,244,0.12)", border: "#86D5F4", icon: "ℹ" },
  };
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 10000, display: "flex", flexDirection: "column", gap: 8, maxWidth: 380 }}>
      {toasts.map(t => {
        const c = colors[t.type];
        return (
          <div key={t.id} style={{
            background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: "12px 16px",
            display: "flex", alignItems: "flex-start", gap: 10, backdropFilter: "blur(12px)",
            animation: "slideUp 0.3s ease", color: T.text, fontSize: 13, lineHeight: 1.4,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{c.icon}</span>
            <span style={{ flex: 1 }}>{t.message}</span>
            <button onClick={() => onDismiss(t.id)} style={{
              background: "transparent", border: "none", color: T.textMuted, cursor: "pointer", fontSize: 18,
              padding: 0, lineHeight: 1, flexShrink: 0,
            }}>×</button>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ONBOARDING WALKTHROUGH
// ═══════════════════════════════════════════════════════
const ONBOARDING_STEPS = [
  {
    target: null,
    title: "Welcome to Level Up!",
    body: "Let's take a quick tour of the Manager Arena — your training ground for real leadership challenges.",
    icon: "🏟️",
  },
  {
    target: "[data-onboarding='first-scenario']",
    title: "Scenario Cards",
    body: "Each card is a real management challenge. You'll see the core value and Q12 dimension it tests, the difficulty level, and how long it takes. Click any card to start playing.",
    icon: "🎯",
  },
  {
    target: "[data-onboarding='stats']",
    title: "Your Progress",
    body: "Track your total score, how many scenarios you've completed, and your average performance. These update each time you finish a scenario.",
    icon: "📊",
  },
  {
    target: "[data-onboarding='nav-resources']",
    title: "Resources",
    body: "Deep dives on all 12 Gallup Q12 engagement dimensions and Level's core values. Great reference material before or after a scenario.",
    icon: "📚",
  },
  {
    target: "[data-onboarding='nav-profile']",
    title: "Your Profile",
    body: "See your strengths across Q12 dimensions and core values. A radar chart shows where you excel and where you can grow.",
    icon: "👤",
  },
  {
    target: "[data-onboarding='nav-board']",
    title: "Leaderboard",
    body: "See how you stack up against your peers. Sort by total score or scenarios completed.",
    icon: "🏆",
  },
  {
    target: "[data-onboarding='bug-btn']",
    title: "Report a Bug",
    body: "Found something broken? Click the bug icon anytime to submit a report. We'll fix it.",
    icon: "🐛",
  },
  {
    target: null,
    title: "AI Coaching",
    body: "During scenarios, an AI coach will challenge your thinking with honest, direct feedback. Expect to be pushed — not flattered.",
    icon: "🤖",
  },
  {
    target: null,
    title: "You're Ready",
    body: "Enter the arena and dare greatly. Pick a scenario to start sharpening your leadership skills.",
    icon: "⚡",
    cta: true,
  },
];

function OnboardingOverlay({ userName, onClose }: { userName: string; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const currentStep = ONBOARDING_STEPS[step];

  // Highlight target element with a glowing outline, scroll it into view
  useEffect(() => {
    // Clean up any previous highlight
    document.querySelectorAll(".onboarding-highlight").forEach(el => {
      el.classList.remove("onboarding-highlight");
    });

    if (currentStep.target) {
      const el = document.querySelector(currentStep.target);
      if (el) {
        el.classList.add("onboarding-highlight");
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else {
      // Scroll to top for center-card steps
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    return () => {
      document.querySelectorAll(".onboarding-highlight").forEach(el => {
        el.classList.remove("onboarding-highlight");
      });
    };
  }, [step, currentStep.target]);

  const finish = () => {
    try { localStorage.setItem("levelup_onboarding_done", "true"); } catch {}
    document.querySelectorAll(".onboarding-highlight").forEach(el => {
      el.classList.remove("onboarding-highlight");
    });
    onClose();
  };

  const next = () => step < ONBOARDING_STEPS.length - 1 ? setStep(step + 1) : finish();
  const back = () => step > 0 && setStep(step - 1);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e: any) => e.stopPropagation()} style={{
        maxWidth: 420, width: "calc(100% - 32px)", background: T.surface,
        border: `1px solid ${T.border}`, borderRadius: 16, padding: 32,
        animation: "slideUp 0.3s ease",
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>{currentStep.icon}</div>
        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: T.text }}>
          {step === 0 ? `Welcome, ${userName?.split(" ")[0] || "Manager"}!` : currentStep.title}
        </h3>
        <p style={{ color: T.textDim, fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
          {currentStep.body}
        </p>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, justifyContent: "center" }}>
          {ONBOARDING_STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 24 : 8, height: 8, borderRadius: 4,
              background: i === step ? T.accent : T.border,
              transition: "all 0.3s ease",
            }} />
          ))}
        </div>

        {/* Step count */}
        <div style={{ textAlign: "center", fontSize: 11, color: T.textMuted, marginBottom: 16 }}>
          {step + 1} of {ONBOARDING_STEPS.length}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
          <div>
            {step > 0 && (
              <Btn onClick={back} variant="ghost" style={{ padding: "10px 16px", fontSize: 13 }}>← Back</Btn>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!(currentStep as any).cta && (
              <Btn onClick={finish} variant="ghost" style={{ padding: "10px 16px", fontSize: 13, color: T.textMuted }}>Skip</Btn>
            )}
            <Btn onClick={(currentStep as any).cta ? finish : next} style={{ padding: "10px 20px", fontSize: 13 }}>
              {(currentStep as any).cta ? "Let's Go! →" : "Next →"}
            </Btn>
          </div>
        </div>
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
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  let toastIdRef = 0;

  // Auto-trigger onboarding on first visit
  useEffect(() => {
    try {
      if (!localStorage.getItem("levelup_onboarding_done")) {
        setShowOnboarding(true);
      }
    } catch {}
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "error") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

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
      showToast("Failed to load scenario. Please try again.");
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
      api.leaderboard.get().then(setLeaderboard).catch(() => showToast("Failed to load leaderboard."));
    }
  }, [view]);

  // Load admin data
  useEffect(() => {
    if (view === "admin" && user.role === "ADMIN") {
      api.admin.analytics().then(setAdminData).catch(() => showToast("Failed to load admin analytics."));
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
    { key: "home", label: "Arena", onboarding: null },
    { key: "resources", label: "Resources", onboarding: "nav-resources" },
    { key: "profile", label: "Profile", onboarding: "nav-profile" },
    { key: "leaderboard", label: "Board", onboarding: "nav-board" },
    ...(user.role === "ADMIN" ? [{ key: "admin", label: "Admin", onboarding: null }] : []),
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg }}>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {showOnboarding && view === "home" && (
        <OnboardingOverlay userName={user.name || ""} onClose={() => setShowOnboarding(false)} />
      )}
      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .game-nav { padding: 10px 12px !important; flex-wrap: wrap; gap: 8px; }
          .game-nav-links { order: 3; width: 100%; justify-content: center !important; overflow-x: auto; }
          .game-nav-links button { padding: 6px 10px !important; font-size: 12px !important; white-space: nowrap; }
          .game-nav-user .user-name-text { display: none; }
          .game-nav-user .user-role-badge { display: none; }
          .game-main { padding: 16px 12px 80px !important; }
          .profile-header-stats { gap: 12px !important; }
        }
        @keyframes onboardingPulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(134,213,244,0.5), 0 0 20px rgba(134,213,244,0.2); }
          50% { box-shadow: 0 0 0 6px rgba(134,213,244,0.3), 0 0 30px rgba(134,213,244,0.3); }
        }
        .onboarding-highlight {
          position: relative;
          z-index: 2001 !important;
          border-radius: 16px;
          animation: onboardingPulse 1.5s ease-in-out infinite !important;
        }
      `}</style>
      {/* NAV */}
      <nav className="game-nav" style={{
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

        <div className="game-nav-links" data-onboarding="nav" style={{ display: "flex", gap: 4 }}>
          {navItems.map(item => (
            <button key={item.key} onClick={() => nav(item.key)}
              {...(item.onboarding ? { "data-onboarding": item.onboarding } : {})}
              style={{
              background: view === item.key ? T.accentDim : "transparent",
              color: view === item.key ? T.accent : T.textDim,
              border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer",
              fontSize: 13, fontWeight: 600, fontFamily: "inherit",
            }}>{item.label}</button>
          ))}
        </div>

        <div className="game-nav-user" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button data-onboarding="bug-btn" onClick={() => setShowBugModal(true)} style={{
            background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8,
            padding: "6px 10px", cursor: "pointer", color: T.textDim, fontFamily: "inherit", fontSize: 12,
          }}>🐛</button>
          <button onClick={() => { nav("home"); setTimeout(() => setShowOnboarding(true), 100); }} title="Tutorial" style={{
            background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8,
            padding: "6px 10px", cursor: "pointer", color: T.textDim, fontFamily: "inherit", fontSize: 12,
          }}>?</button>
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
            <span className="user-name-text" style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</span>
            <span className="user-role-badge"><Badge color={user.role === "ADMIN" ? T.info : T.success}>{user.role?.toLowerCase()}</Badge></span>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} style={{
            background: "transparent", border: "none", cursor: "pointer", color: T.textDim, padding: 4, fontSize: 18,
          }}>⏻</button>
        </div>
      </nav>

      {/* CONTENT */}
      <main className="game-main" style={{ maxWidth: view === "admin" ? 1400 : 1100, margin: "0 auto", padding: "24px 24px 80px" }}>
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
          <AdminView data={adminData} q12={q12} coreValues={coreValues} keyBehaviors={keyBehaviors} currentUserId={user.id} />
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

      <div data-onboarding="stats" style={{ display: "flex", gap: 12, marginBottom: 40, flexWrap: "wrap" }}>
        <StatBox label="Total Score" value={stats.totalScore || 0} />
        <StatBox label="Completed" value={`${stats.scenariosCompleted || 0}/${scenarios.length}`} />
        <StatBox label="Avg Score" value={stats.avgScore || 0} />
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Scenario Arena</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))", gap: 16 }}>
        {scenarios.map((s: any, i: number) => (
          <div key={s.id} {...(i === 0 ? { "data-onboarding": "first-scenario" } : {})}>
          <Card onClick={() => onStart(s)} style={{
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
          </div>
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
// Q12 TRAINING VIEW — Comprehensive Gallup Q12 Resource
// ═══════════════════════════════════════════════════════

const Q12_GUIDE: Record<number, { tier: string; tierColor: string; tierLabel: string; whyItMatters: string; managerTips: string[]; warning: string }> = {
  1: {
    tier: "basic", tierColor: "#86D5F4", tierLabel: "Basic Needs",
    whyItMatters: "When employees don't know what's expected, they default to guessing — which leads to wasted effort, anxiety, and misalignment. Clear expectations are the foundation everything else is built on.",
    managerTips: [
      "Define success criteria for every project before it begins — what 'done' looks like, not just what to do.",
      "Revisit expectations regularly. What was clear in January may be ambiguous by March.",
      "Ask your report to reflect your expectations back to you. If their version differs from yours, the gap is yours to close.",
    ],
    warning: "If this score is low on your team, nothing else you do will land. Fix this first.",
  },
  2: {
    tier: "basic", tierColor: "#86D5F4", tierLabel: "Basic Needs",
    whyItMatters: "This isn't just about laptops and software. It's about whether your people feel set up to succeed — or whether they're fighting their tools every day. Resourceful managers remove friction.",
    managerTips: [
      "Audit your team's tooling and access quarterly. Ask: 'What slows you down that shouldn't?'",
      "Advocate upward — if your team needs budget or tools, it's your job to make the case.",
      "Don't assume silence means satisfaction. People often accept friction because they think nothing will change.",
    ],
    warning: "Low scores here signal that employees feel unsupported at the most basic level. It erodes trust fast.",
  },
  3: {
    tier: "basic", tierColor: "#86D5F4", tierLabel: "Basic Needs",
    whyItMatters: "When people spend most of their day doing things they're bad at or dislike, engagement plummets. Great managers align strengths to work — not just assign tasks.",
    managerTips: [
      "Have a direct conversation about strengths: 'What energizes you? What drains you?'",
      "Redesign roles where possible — even shifting 20% of tasks toward strengths has a measurable impact.",
      "Notice when someone is in flow versus grinding. Flow is the signal you've matched the work to the person.",
    ],
    warning: "Chronically low scores here often mean talented people are in the wrong seat — not the wrong company.",
  },
  4: {
    tier: "basic", tierColor: "#86D5F4", tierLabel: "Basic Needs",
    whyItMatters: "Recognition isn't a 'nice to have.' Gallup's research shows that employees who don't feel recognized are twice as likely to say they'll quit in the next year. And it has to be frequent — the question specifically asks about the last seven days.",
    managerTips: [
      "Build a weekly habit: identify at least one specific thing someone did well and tell them directly.",
      "Be precise. 'Great job' is noise. 'The way you handled that client escalation on Tuesday showed real judgment' is signal.",
      "Recognize publicly when appropriate, but don't skip private recognition — some people prefer it.",
    ],
    warning: "If you think you recognize people enough, you probably don't. Managers consistently overestimate how much recognition they give.",
  },
  5: {
    tier: "support", tierColor: "#8EE34D", tierLabel: "Management Support",
    whyItMatters: "People don't leave companies, they leave managers — and this dimension is why. When employees feel their manager genuinely cares about them as a human being (not just a producer), they bring their full selves to work.",
    managerTips: [
      "Learn what matters to your people outside work. You don't need to be their therapist — but know if they have a sick parent or a kid's recital.",
      "Check in on wellbeing, not just deliverables. 'How are you doing?' before 'Where are we on the project?'",
      "Flex when life happens. The goodwill from accommodating a tough week pays back tenfold.",
    ],
    warning: "This is the single strongest predictor of whether someone stays or leaves your team.",
  },
  6: {
    tier: "support", tierColor: "#8EE34D", tierLabel: "Management Support",
    whyItMatters: "Employees who feel their growth is actively encouraged are more engaged, more productive, and more loyal. A manager who invests in development is signaling: 'I see your future here, and I want to help you get there.'",
    managerTips: [
      "Have a growth conversation at least once per quarter — separate from performance reviews.",
      "Connect people with stretch assignments, mentors, or learning opportunities proactively — don't wait for them to ask.",
      "Share your own growth journey. Vulnerability about what you're still learning models a growth culture.",
    ],
    warning: "High performers especially need this. If they don't feel they're growing, they'll find somewhere they can.",
  },
  7: {
    tier: "teamwork", tierColor: "#FFAA53", tierLabel: "Teamwork",
    whyItMatters: "When people feel their voice doesn't matter, they stop contributing ideas — and you lose the distributed intelligence of your team. Innovation dies in silence.",
    managerTips: [
      "Actively solicit input before decisions are made, not after. 'What am I missing?' is one of the most powerful questions a manager can ask.",
      "When you can't act on someone's input, explain why. The worst thing is asking for opinions and then ignoring them without explanation.",
      "Create psychological safety: reward people for speaking up, especially when they disagree with you.",
    ],
    warning: "If only your loudest team members feel heard, you're leaving enormous value on the table.",
  },
  8: {
    tier: "teamwork", tierColor: "#FFAA53", tierLabel: "Teamwork",
    whyItMatters: "People need to feel their work connects to something bigger than a task list. When the mission feels real, mundane work becomes meaningful. When it doesn't, even exciting work feels hollow.",
    managerTips: [
      "Regularly connect your team's work to the company's mission and client outcomes. 'Here's why this matters.'",
      "Share client wins and the real-world impact of your team's contributions — make the abstract concrete.",
      "Help your reports see their role in the larger strategy. People who understand the 'why' bring more creativity to the 'how.'",
    ],
    warning: "Low scores here often indicate a communication gap between leadership vision and day-to-day work.",
  },
  9: {
    tier: "teamwork", tierColor: "#FFAA53", tierLabel: "Teamwork",
    whyItMatters: "Nothing is more demoralizing than giving your best while others coast. When employees feel surrounded by people who also care about quality, it raises the bar for everyone.",
    managerTips: [
      "Set clear quality standards and hold everyone accountable — including top performers.",
      "Address underperformance directly. Tolerating low quality sends a louder message than any all-hands speech.",
      "Celebrate quality, not just speed. Recognize work that's done right, not just done fast.",
    ],
    warning: "If you have one person dragging down quality and you don't address it, you're telling the whole team that standards are optional.",
  },
  10: {
    tier: "teamwork", tierColor: "#FFAA53", tierLabel: "Teamwork",
    whyItMatters: "This is Gallup's most debated question — but the research is clear. Deep workplace friendships drive engagement, collaboration, and retention. It's not about forcing friendships; it's about creating the conditions where genuine connection can form.",
    managerTips: [
      "Create space for non-work interaction — team lunches, casual Slack channels, offsites with unstructured time.",
      "Pair people on projects who might not naturally work together. Proximity creates connection.",
      "Don't dismiss this dimension as 'soft.' Teams with strong interpersonal bonds outperform those without, consistently.",
    ],
    warning: "Remote teams are especially at risk here. Be intentional about connection when you can't rely on hallway conversations.",
  },
  11: {
    tier: "growth", tierColor: "#FD6EF8", tierLabel: "Growth",
    whyItMatters: "If no one has talked to you about your progress in six months, the message is clear: no one is paying attention. Progress conversations signal investment and keep development on track.",
    managerTips: [
      "Don't save feedback for formal reviews. Brief, frequent progress conversations are far more impactful.",
      "Be specific about what's improved and what still needs work. Vague 'you're doing great' is not a progress conversation.",
      "Ask the employee first: 'How do you think you've grown in the last few months?' Then share your perspective.",
    ],
    warning: "If your team's scores are low here, the fix is simple: schedule the conversations. Most managers just forget.",
  },
  12: {
    tier: "growth", tierColor: "#FD6EF8", tierLabel: "Growth",
    whyItMatters: "Growth is a fundamental human need. When people feel stagnant, they disengage or leave. This question captures whether your organization is delivering on its promise of professional development.",
    managerTips: [
      "Make learning a regular part of the rhythm — not a once-a-year training event.",
      "Support self-directed learning: courses, conferences, side projects, cross-functional exposure.",
      "Track growth over time. Help people see how far they've come, not just how far they have to go.",
    ],
    warning: "Strong performers who don't see growth opportunities will leave within 18 months — count on it.",
  },
};

const Q12_TIERS = [
  { key: "basic", label: "Basic Needs", color: "#86D5F4", ids: [1, 2, 3, 4], description: "Before anything else, employees need clarity, resources, the chance to use their strengths, and regular recognition. These are non-negotiable — without them, nothing higher on the pyramid works." },
  { key: "support", label: "Management Support", color: "#8EE34D", ids: [5, 6], description: "Once basic needs are met, employees need to feel genuinely cared about as people and encouraged to develop. This is where the manager-employee relationship becomes the engine of engagement." },
  { key: "teamwork", label: "Teamwork", color: "#FFAA53", ids: [7, 8, 9, 10], description: "Engaged individuals become engaged teams when opinions matter, mission is clear, quality is shared, and real relationships form. This tier transforms groups of individuals into cohesive units." },
  { key: "growth", label: "Growth", color: "#FD6EF8", ids: [11, 12], description: "At the top of the pyramid, employees need ongoing feedback about their progress and real opportunities to learn. This is what turns a job into a career." },
];

function Q12TrainingView({ q12 }: { q12: any[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div>
      {/* ─── Hero Intro ─── */}
      <Card style={{ padding: 32, marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>The Gallup Q12: A Manager's Complete Guide</h2>
        <p style={{ color: T.textDim, fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
          The Gallup Q12 is the result of decades of research by the Gallup organization into what drives employee engagement. Based on studies of millions of employees across hundreds of thousands of teams, Gallup identified 12 core conditions that consistently predict team performance, retention, profitability, and customer satisfaction.
        </p>
        <p style={{ color: T.textDim, fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
          These aren't aspirational ideals — they're measurable, actionable conditions that you, as a manager, have direct influence over. Teams in the top quartile of Q12 engagement scores see 23% higher profitability, 18% higher productivity, and 43% lower turnover compared to bottom-quartile teams.
        </p>
        <p style={{ color: T.textDim, fontSize: 14, lineHeight: 1.8 }}>
          In the Arena, every scenario is mapped to one or more Q12 dimensions. Understanding these dimensions deeply will help you make better decisions in the game — and more importantly, with your real team.
        </p>
      </Card>

      {/* ─── The Pyramid ─── */}
      <Card style={{ padding: 32, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>The Engagement Hierarchy</h2>
        <p style={{ color: T.textDim, fontSize: 13, lineHeight: 1.7, marginBottom: 28 }}>
          The Q12 dimensions form a hierarchy — like Maslow's pyramid, you have to satisfy lower levels before higher ones take hold. A team without clear expectations (Q1) won't benefit from growth conversations (Q11). Build from the bottom up.
        </p>

        {/* Pyramid visual — just the shape */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginBottom: 28 }}>
          {[...Q12_TIERS].reverse().map((tier, i) => {
            const widthPct = 30 + (i * 23); // 30%, 53%, 76%, 99%
            return (
              <div key={tier.key} style={{
                width: `${widthPct}%`, minWidth: 140,
                padding: "12px 16px", borderRadius: 8,
                background: tier.color + "18", border: `1px solid ${tier.color}33`,
                textAlign: "center",
              }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: tier.color }}>{tier.label}</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2, fontFamily: "'Inter Tight', 'JetBrains Mono'" }}>
                  Q{tier.ids[0]}{tier.ids.length > 1 ? `–Q${tier.ids[tier.ids.length - 1]}` : ""}
                </div>
              </div>
            );
          })}
          <p style={{ color: T.textMuted, fontSize: 11, marginTop: 8, fontStyle: "italic" }}>▲ Start at the base and work upward</p>
        </div>

        {/* Tier descriptions — full width, below the pyramid */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Q12_TIERS.map(tier => (
            <div key={tier.key} style={{
              display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px",
              background: T.surface, borderRadius: 8, border: `1px solid ${T.border}`,
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%", background: tier.color,
                flexShrink: 0, marginTop: 4,
              }} />
              <div>
                <span style={{ fontWeight: 700, fontSize: 13, color: tier.color }}>{tier.label}</span>
                <span style={{ color: T.textMuted, fontSize: 12 }}>{" "}(Q{tier.ids[0]}{tier.ids.length > 1 ? `–Q${tier.ids[tier.ids.length - 1]}` : ""})</span>
                <p style={{ fontSize: 13, color: T.textDim, lineHeight: 1.7, marginTop: 4 }}>{tier.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ─── Detailed Q12 Cards by Tier ─── */}
      {Q12_TIERS.map(tier => (
        <div key={tier.key} style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: tier.color, flexShrink: 0 }} />
            <h3 style={{ fontSize: 16, fontWeight: 800, color: tier.color }}>{tier.label}</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tier.ids.map(qId => {
              const dim = q12.find((d: any) => d.id === qId);
              const guide = Q12_GUIDE[qId];
              if (!dim || !guide) return null;
              const isExpanded = expandedId === qId;
              return (
                <Card key={qId} style={{ padding: 0, overflow: "hidden", animation: `slideUp 0.4s ease ${(qId - 1) * 0.03}s both` }}>
                  {/* Header — always visible */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : qId)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "18px 22px",
                      background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                    }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 10,
                      background: tier.color + "18", border: `1px solid ${tier.color}33`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontSize: 15, color: tier.color,
                      fontFamily: "'Inter Tight', 'JetBrains Mono'", flexShrink: 0,
                    }}>Q{qId}</div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 2 }}>{dim.title}</h4>
                      <p style={{ fontSize: 13, color: T.textMuted, fontStyle: "italic" }}>"{dim.description}"</p>
                    </div>
                    <span style={{ color: T.textMuted, fontSize: 18, transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div style={{ padding: "0 22px 22px", borderTop: `1px solid ${T.border}` }}>
                      {/* Why It Matters */}
                      <div style={{ marginTop: 18, marginBottom: 20 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: tier.color, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>Why This Matters</div>
                        <p style={{ fontSize: 14, color: T.textDim, lineHeight: 1.8 }}>{guide.whyItMatters}</p>
                      </div>

                      {/* Manager Playbook */}
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 }}>Manager Playbook</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {guide.managerTips.map((tip, i) => (
                            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                              <div style={{
                                width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
                                background: T.accentDim, display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 11, fontWeight: 800, color: T.accent,
                              }}>{i + 1}</div>
                              <p style={{ fontSize: 13, color: T.textDim, lineHeight: 1.7 }}>{tip}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Warning */}
                      <div style={{
                        background: T.warning + "10", border: `1px solid ${T.warning}33`, borderRadius: 8,
                        padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start",
                      }}>
                        <span style={{ fontSize: 14, flexShrink: 0 }}>⚠</span>
                        <p style={{ fontSize: 12, color: T.warning, lineHeight: 1.6, fontWeight: 500 }}>{guide.warning}</p>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {/* ─── How to Use This Framework ─── */}
      <Card style={{ padding: 32, marginTop: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>Putting It Into Practice</h2>
        <p style={{ color: T.textDim, fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
          The Q12 framework isn't something you "implement" once — it's a lens for everyday management. Here's how to use it:
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))", gap: 14 }}>
          {[
            { title: "Diagnose Before You Act", text: "If your team seems disengaged, don't guess where the problem is. Walk through the 12 dimensions mentally — or better yet, ask your team directly. The Q12 gives you a diagnostic framework, not just a survey." },
            { title: "Build From The Base", text: "Fix basic needs (Q1-Q4) before investing in growth conversations (Q11-Q12). A team that doesn't have clear expectations won't benefit from a learning stipend." },
            { title: "Focus on 2-3 Dimensions", text: "You can't improve all 12 at once. Identify the 2-3 lowest-scoring areas on your team and make them your priority for the quarter. Small, consistent effort beats grand gestures." },
            { title: "Connect to the Arena", text: "Every scenario you play here targets specific Q12 dimensions. When you finish a scenario, reflect on how the skills you practiced map to your real team's engagement gaps." },
          ].map((item, i) => (
            <div key={i} style={{
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 20,
              animation: `slideUp 0.4s ease ${i * 0.08}s both`,
            }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: T.text }}>{item.title}</h4>
              <p style={{ fontSize: 13, color: T.textDim, lineHeight: 1.7 }}>{item.text}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
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
      {tab === "q12" && <Q12TrainingView q12={q12} />}
      {tab === "values" && (
        <div>
          <Card style={{ padding: 28, marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Level Core Values</h2>
            <p style={{ color: T.textDim, fontSize: 14, lineHeight: 1.7 }}>
              Our four core values define who we are and how we work at Level. In the Arena, every decision you make
              is scored against these values. Strong alignment means you are leading in a way that reflects our culture.
            </p>
          </Card>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))", gap: 16 }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))", gap: 12 }}>
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
  const q12Breakdown = stats.q12Breakdown || {};
  const cvBreakdown = stats.coreValueBreakdown || {};

  // Build radar data from Q12 scores
  const radarData = q12.map((d: any) => ({
    dimension: `Q${d.id}`,
    fullName: d.title,
    score: q12Breakdown[d.id] || 0,
  }));

  const maxQ12 = Math.max(...radarData.map((d: any) => d.score), 1);

  return (
    <div className="animate-fade-in">
      {/* Header card with stats */}
      <Card style={{ padding: 32, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          {user.image ? (
            <img src={user.image} alt="" style={{ width: 72, height: 72, borderRadius: "50%" }} />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #86D5F4, #FD6EF8)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "#fff",
            }}>{user.name?.[0]}</div>
          )}
          <div style={{ flex: 1, minWidth: 150 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{user.name}</h2>
            <p style={{ color: T.textDim, fontSize: 14 }}>{user.email}</p>
          </div>
          <div style={{ display: "flex", gap: 20, textAlign: "center", flexWrap: "wrap" }}>
            {[
              { value: stats.totalScore || 0, label: "Total Points", color: T.accent },
              { value: stats.scenariosCompleted || 0, label: "Completed", color: T.success },
              { value: stats.avgScore || 0, label: "Avg Score", color: T.warning },
              { value: stats.totalAttempts || 0, label: "Attempts", color: T.info },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 26, fontWeight: 900, color: s.color, fontFamily: "'Inter Tight', 'JetBrains Mono'" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: T.textDim }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Q12 Radar Chart */}
      {radarData.some((d: any) => d.score > 0) && (
        <Card style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Q12 Engagement Profile</h3>
          <p style={{ fontSize: 12, color: T.textDim, marginBottom: 16 }}>Your Q12 impact scores across completed scenarios</p>
          <div style={{ height: 300 }}>
            <ResponsiveContainer>
              <RadarChart data={radarData}>
                <PolarGrid stroke={T.border} />
                <PolarAngleAxis dataKey="dimension" tick={{ fill: T.textDim, fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fill: T.textMuted, fontSize: 10 }} domain={[0, maxQ12]} />
                <Radar name="Q12 Score" dataKey="score" stroke={T.accent} fill={T.accent} fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {radarData.filter((d: any) => d.score > 0).map((d: any) => (
              <div key={d.dimension} style={{
                background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 12,
              }}>
                <span style={{ color: T.accent, fontWeight: 700 }}>{d.dimension}</span>
                <span style={{ color: T.textMuted, marginLeft: 6 }}>{d.fullName}</span>
                <span style={{ color: T.text, fontWeight: 700, marginLeft: 8, fontFamily: "'Inter Tight', 'JetBrains Mono'" }}>{d.score}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Core Values Breakdown */}
      {Object.keys(cvBreakdown).length > 0 && (
        <Card style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Core Value Alignment</h3>
          <p style={{ fontSize: 12, color: T.textDim, marginBottom: 16 }}>Your culture scores by core value</p>
          {coreValues.map((cv: any) => {
            const score = cvBreakdown[cv.id] || 0;
            const maxCv = Math.max(...Object.values(cvBreakdown).map((v: any) => Math.abs(v)), 1);
            const pct = Math.min(Math.abs(score) / maxCv * 100, 100);
            return (
              <div key={cv.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: cv.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{cv.name}</span>
                  </div>
                  <span style={{
                    fontSize: 14, fontWeight: 800, fontFamily: "'Inter Tight', 'JetBrains Mono'",
                    color: score >= 0 ? T.success : T.danger,
                  }}>{score > 0 ? "+" : ""}{score}</span>
                </div>
                <div style={{ height: 6, background: T.bg, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${pct}%`, borderRadius: 3, transition: "width 0.5s ease",
                    background: score >= 0 ? cv.color : T.danger,
                  }} />
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* Completed Scenarios */}
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
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{r.scenarioTitle}</div>
                <div style={{ fontSize: 12, color: T.textDim, marginTop: 2 }}>{new Date(r.completedAt).toLocaleDateString()}</div>
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: T.textMuted }}>Q12</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: (r.q12Score || 0) >= 0 ? T.success : T.danger, fontFamily: "'Inter Tight', 'JetBrains Mono'" }}>{r.q12Score > 0 ? "+" : ""}{r.q12Score || 0}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: T.textMuted }}>Culture</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: (r.cultureScore || 0) >= 0 ? T.success : T.danger, fontFamily: "'Inter Tight', 'JetBrains Mono'" }}>{r.cultureScore > 0 ? "+" : ""}{r.cultureScore || 0}</div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: T.accent, fontFamily: "'Inter Tight', 'JetBrains Mono'", minWidth: 50, textAlign: "right" }}>{r.score}</div>
              </div>
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
function AdminView({ data, q12, coreValues, keyBehaviors, currentUserId }: any) {
  const [tab, setTab] = useState("usage");
  const usage = data.usage || {};

  return (
    <div className="animate-fade-in">
      <Badge color={T.info}>Admin</Badge>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 8, marginBottom: 8 }}>Dashboard</h1>
      <p style={{ color: T.textDim, marginBottom: 24 }}>Analytics and system health for Level Up.</p>

      <div style={{ display: "flex", gap: 4, marginBottom: 24, flexWrap: "wrap" }}>
        {["usage", "q12", "culture", "scenarios", "users", "bugs"].map(t => (
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

      {tab === "scenarios" && <AdminScenariosTab scenarioHealth={data.scenarioHealth || []} q12={q12} coreValues={coreValues} keyBehaviors={keyBehaviors} />}

      {tab === "users" && <AdminUsersTab currentUserId={currentUserId} />}

      {tab === "bugs" && <AdminBugsTab />}
    </div>
  );
}

function AdminScenariosTab({ scenarioHealth, q12, coreValues, keyBehaviors }: any) {
  const [scenarios, setScenarios] = useState<any[]>(scenarioHealth);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editMeta, setEditMeta] = useState<any>({});
  const [editNodes, setEditNodes] = useState<Record<string, any>>({});
  const [editChoices, setEditChoices] = useState<Record<string, any>>({});

  // New entity forms
  const [newNode, setNewNode] = useState<any>(null);
  const [newChoiceForNode, setNewChoiceForNode] = useState<string | null>(null);
  const [newChoiceData, setNewChoiceData] = useState<any>({});
  const [newScenario, setNewScenario] = useState<any>({ title: "", description: "", difficulty: "Medium", estimatedTimeMinutes: 10, primaryQ12Id: q12[0]?.id || 1, secondaryQ12Id: null, coreValueId: coreValues[0]?.id || "" });

  const inputStyle: any = { background: T.bg, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%" };
  const selectStyle: any = { ...inputStyle, width: "auto" };
  const textareaStyle: any = { ...inputStyle, minHeight: 80, resize: "vertical" as const, lineHeight: 1.6 };
  const labelStyle: any = { fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 4, display: "block" };

  // Load full scenario nodes when expanding
  const loadNodes = useCallback(async (scenarioId: string) => {
    setLoading(true);
    try {
      const data = await api.admin.getNodes(scenarioId);
      setNodes(data);
      // Initialize edit state from loaded data
      const scenario = scenarios.find((s: any) => s.id === scenarioId);
      if (scenario) {
        setEditMeta({ title: scenario.title, description: scenario.description || "", difficulty: scenario.difficulty, isActive: scenario.isActive });
      }
    } catch (err) { console.error("Failed to load nodes:", err); }
    setLoading(false);
  }, [scenarios]);

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setNodes([]);
      setEditNodes({});
      setEditChoices({});
      setNewNode(null);
      setNewChoiceForNode(null);
    } else {
      setExpandedId(id);
      loadNodes(id);
    }
  };

  // Reload scenario list after changes
  const reloadList = async () => {
    try {
      const res = await api.admin.analytics();
      setScenarios(res.scenarioHealth || []);
    } catch {}
  };

  // ─── Save scenario metadata ───
  const saveMeta = async (id: string) => {
    setSaving("meta");
    try {
      await api.scenarios.update(id, editMeta);
      await reloadList();
    } catch (err) { console.error(err); }
    setSaving(null);
  };

  // ─── Toggle active ───
  const toggleActive = async (id: string, current: boolean) => {
    setSaving("active-" + id);
    try {
      await api.scenarios.update(id, { isActive: !current });
      await reloadList();
      setEditMeta((prev: any) => ({ ...prev, isActive: !current }));
    } catch (err) { console.error(err); }
    setSaving(null);
  };

  // ─── Node CRUD ───
  const saveNode = async (scenarioId: string, nodeId: string) => {
    setSaving("node-" + nodeId);
    try {
      await api.admin.updateNode(scenarioId, nodeId, editNodes[nodeId]);
      await loadNodes(scenarioId);
    } catch (err) { console.error(err); }
    setSaving(null);
  };

  const deleteNode = async (scenarioId: string, nodeId: string) => {
    if (!confirm("Delete this node and all its choices?")) return;
    setSaving("node-" + nodeId);
    try {
      await api.admin.deleteNode(scenarioId, nodeId);
      await loadNodes(scenarioId);
    } catch (err) { console.error(err); }
    setSaving(null);
  };

  const addNode = async (scenarioId: string) => {
    if (!newNode?.contentText?.trim()) return;
    setSaving("new-node");
    try {
      await api.admin.addNode(scenarioId, { ...newNode, orderIndex: nodes.length });
      setNewNode(null);
      await loadNodes(scenarioId);
    } catch (err) { console.error(err); }
    setSaving(null);
  };

  // ─── Choice CRUD ───
  const saveChoice = async (scenarioId: string, nodeId: string, choiceId: string) => {
    setSaving("choice-" + choiceId);
    try {
      await api.admin.updateChoice(scenarioId, nodeId, choiceId, editChoices[choiceId]);
      await loadNodes(scenarioId);
    } catch (err) { console.error(err); }
    setSaving(null);
  };

  const deleteChoice = async (scenarioId: string, nodeId: string, choiceId: string) => {
    if (!confirm("Delete this choice?")) return;
    setSaving("choice-" + choiceId);
    try {
      await api.admin.deleteChoice(scenarioId, nodeId, choiceId);
      await loadNodes(scenarioId);
    } catch (err) { console.error(err); }
    setSaving(null);
  };

  const addChoice = async (scenarioId: string, nodeId: string) => {
    if (!newChoiceData.choiceText?.trim() || !newChoiceData.explanationText?.trim()) return;
    setSaving("new-choice");
    try {
      await api.admin.addChoice(scenarioId, nodeId, newChoiceData);
      setNewChoiceForNode(null);
      setNewChoiceData({});
      await loadNodes(scenarioId);
    } catch (err) { console.error(err); }
    setSaving(null);
  };

  // ─── Create scenario ───
  const createScenario = async () => {
    if (!newScenario.title?.trim() || !newScenario.description?.trim()) return;
    setSaving("new-scenario");
    try {
      await api.scenarios.create(newScenario);
      setCreating(false);
      setNewScenario({ title: "", description: "", difficulty: "Medium", estimatedTimeMinutes: 10, primaryQ12Id: q12[0]?.id || 1, secondaryQ12Id: null, coreValueId: coreValues[0]?.id || "" });
      await reloadList();
    } catch (err) { console.error(err); }
    setSaving(null);
  };

  // ─── Delete scenario ───
  const deleteScenario = async (id: string) => {
    if (!confirm("Permanently delete this scenario and ALL its data?")) return;
    setSaving("delete-" + id);
    try {
      await api.scenarios.delete(id);
      setExpandedId(null);
      await reloadList();
    } catch (err) { console.error(err); }
    setSaving(null);
  };

  const nodeTypeBadgeColor: Record<string, string> = {
    REFLECTION: T.info, DECISION: T.warning, OUTCOME: T.success,
  };

  return (
    <div>
      {/* Create New Scenario */}
      <div style={{ marginBottom: 20 }}>
        {!creating ? (
          <Btn onClick={() => setCreating(true)} style={{ fontSize: 13 }}>+ New Scenario</Btn>
        ) : (
          <Card style={{ padding: 20 }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Create New Scenario</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Title</label>
                <input value={newScenario.title} onChange={(e: any) => setNewScenario((p: any) => ({ ...p, title: e.target.value }))} style={inputStyle} placeholder="Scenario title..." />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div>
                  <label style={labelStyle}>Difficulty</label>
                  <select value={newScenario.difficulty} onChange={(e: any) => setNewScenario((p: any) => ({ ...p, difficulty: e.target.value }))} style={inputStyle}>
                    <option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Est. Minutes</label>
                  <input type="number" value={newScenario.estimatedTimeMinutes} onChange={(e: any) => setNewScenario((p: any) => ({ ...p, estimatedTimeMinutes: parseInt(e.target.value) || 10 }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Core Value</label>
                  <select value={newScenario.coreValueId} onChange={(e: any) => setNewScenario((p: any) => ({ ...p, coreValueId: e.target.value }))} style={inputStyle}>
                    {coreValues.map((cv: any) => <option key={cv.id} value={cv.id}>{cv.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Primary Q12</label>
                <select value={newScenario.primaryQ12Id} onChange={(e: any) => setNewScenario((p: any) => ({ ...p, primaryQ12Id: parseInt(e.target.value) }))} style={inputStyle}>
                  {q12.map((q: any) => <option key={q.id} value={q.id}>Q{q.id}: {q.title}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Secondary Q12 (optional)</label>
                <select value={newScenario.secondaryQ12Id || ""} onChange={(e: any) => setNewScenario((p: any) => ({ ...p, secondaryQ12Id: e.target.value ? parseInt(e.target.value) : null }))} style={inputStyle}>
                  <option value="">None</option>
                  {q12.map((q: any) => <option key={q.id} value={q.id}>Q{q.id}: {q.title}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Description</label>
              <textarea value={newScenario.description} onChange={(e: any) => setNewScenario((p: any) => ({ ...p, description: e.target.value }))} style={textareaStyle} placeholder="Describe the scenario..." />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={createScenario} disabled={saving === "new-scenario" || !newScenario.title.trim()}>
                {saving === "new-scenario" ? "Creating..." : "Create Scenario"}
              </Btn>
              <Btn onClick={() => setCreating(false)} style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.textDim }}>Cancel</Btn>
            </div>
          </Card>
        )}
      </div>

      {/* Scenario List */}
      {scenarios.map((s: any) => {
        const isExpanded = expandedId === s.id;
        return (
          <Card key={s.id} style={{ marginBottom: 12, padding: 0 }}>
            {/* Collapsed Header */}
            <div onClick={() => toggleExpand(s.id)} style={{ padding: 20, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h4 style={{ fontSize: 15, fontWeight: 700 }}>{s.title}</h4>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Badge color={s.isActive ? T.success : T.danger}>{s.isActive ? "Active" : "Inactive"}</Badge>
                  <span style={{ fontSize: 12, color: T.textMuted }}>{isExpanded ? "▲" : "▼"}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 13, color: T.textMuted, flexWrap: "wrap" }}>
                <span>{s.difficulty}</span>
                <span>{s.totalCompletions} completions</span>
                <span>{s.completionRate}% rate</span>
                {s.avgScore > 0 && <span>Avg: {s.avgScore}</span>}
                {s.avgFeedbackRating && <span>Rating: {s.avgFeedbackRating}/5</span>}
              </div>
            </div>

            {/* Expanded Editor */}
            {isExpanded && (
              <div onClick={(e: any) => e.stopPropagation()} style={{ padding: "0 20px 20px", borderTop: `1px solid ${T.border}` }}>
                {loading ? (
                  <p style={{ color: T.textMuted, fontSize: 13, padding: "20px 0" }}>Loading scenario data...</p>
                ) : (
                  <>
                    {/* ─── Metadata Editor ─── */}
                    <div style={{ paddingTop: 16, marginBottom: 24 }}>
                      <h5 style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginBottom: 12 }}>Scenario Metadata</h5>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                        <div>
                          <label style={labelStyle}>Title</label>
                          <input value={editMeta.title || ""} onChange={(e: any) => setEditMeta((p: any) => ({ ...p, title: e.target.value }))} style={inputStyle} />
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Difficulty</label>
                            <select value={editMeta.difficulty || "Medium"} onChange={(e: any) => setEditMeta((p: any) => ({ ...p, difficulty: e.target.value }))} style={inputStyle}>
                              <option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option>
                            </select>
                          </div>
                          <div>
                            <label style={labelStyle}>Active</label>
                            <Btn onClick={() => toggleActive(s.id, editMeta.isActive)} disabled={saving === "active-" + s.id}
                              style={{ fontSize: 12, padding: "6px 14px", background: editMeta.isActive ? T.success + "22" : T.danger + "22", color: editMeta.isActive ? T.success : T.danger, border: `1px solid ${editMeta.isActive ? T.success + "44" : T.danger + "44"}` }}>
                              {editMeta.isActive ? "Active" : "Inactive"}
                            </Btn>
                          </div>
                        </div>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <label style={labelStyle}>Description</label>
                        <textarea value={editMeta.description || ""} onChange={(e: any) => setEditMeta((p: any) => ({ ...p, description: e.target.value }))} style={textareaStyle} />
                      </div>
                      <Btn onClick={() => saveMeta(s.id)} disabled={saving === "meta"} style={{ fontSize: 12, padding: "6px 14px" }}>
                        {saving === "meta" ? "Saving..." : "Save Metadata"}
                      </Btn>
                    </div>

                    {/* ─── Nodes Editor ─── */}
                    <div style={{ marginBottom: 24 }}>
                      <h5 style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginBottom: 12 }}>
                        Nodes ({nodes.length})
                      </h5>
                      {nodes.map((node: any, ni: number) => {
                        const ne = editNodes[node.id] || { nodeType: node.nodeType, contentText: node.contentText };
                        return (
                          <div key={node.id} style={{ background: T.bg, borderRadius: 10, padding: 16, marginBottom: 12, border: `1px solid ${T.border}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <Badge color={nodeTypeBadgeColor[node.nodeType] || T.textMuted}>{node.nodeType}</Badge>
                                <span style={{ fontSize: 12, color: T.textMuted }}>Node {ni + 1} (order: {node.orderIndex})</span>
                              </div>
                              <select value={ne.nodeType} onChange={(e: any) => setEditNodes((p: any) => ({ ...p, [node.id]: { ...ne, nodeType: e.target.value } }))} style={selectStyle}>
                                <option value="REFLECTION">REFLECTION</option>
                                <option value="DECISION">DECISION</option>
                                <option value="OUTCOME">OUTCOME</option>
                              </select>
                            </div>
                            <textarea value={ne.contentText} onChange={(e: any) => setEditNodes((p: any) => ({ ...p, [node.id]: { ...ne, contentText: e.target.value } }))}
                              style={{ ...textareaStyle, marginBottom: 10 }} />
                            <div style={{ display: "flex", gap: 8 }}>
                              <Btn onClick={() => saveNode(s.id, node.id)} disabled={saving === "node-" + node.id} style={{ fontSize: 11, padding: "5px 12px" }}>
                                {saving === "node-" + node.id ? "Saving..." : "Save Node"}
                              </Btn>
                              <Btn onClick={() => deleteNode(s.id, node.id)} disabled={saving === "node-" + node.id} variant="danger" style={{ fontSize: 11, padding: "5px 12px" }}>Delete</Btn>
                            </div>

                            {/* ─── Choices (for DECISION nodes) ─── */}
                            {node.nodeType === "DECISION" && (
                              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${T.border}` }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: T.warning, marginBottom: 10 }}>Choices ({(node.choices || []).length})</div>
                                {(node.choices || []).map((choice: any) => {
                                  const ce = editChoices[choice.id] || {
                                    choiceText: choice.choiceText, explanationText: choice.explanationText,
                                    q12Impact: choice.q12Impact || 0, pointsBase: choice.pointsBase || 0,
                                    keyBehaviorsPositive: (choice.keyBehaviors || []).filter((kb: any) => kb.impact === "POSITIVE").map((kb: any) => kb.keyBehaviorId),
                                    keyBehaviorsNegative: (choice.keyBehaviors || []).filter((kb: any) => kb.impact === "NEGATIVE").map((kb: any) => kb.keyBehaviorId),
                                  };
                                  return (
                                    <div key={choice.id} style={{ background: T.surface, borderRadius: 8, padding: 12, marginBottom: 10, border: `1px solid ${T.border}` }}>
                                      <div style={{ marginBottom: 8 }}>
                                        <label style={labelStyle}>Choice Text</label>
                                        <textarea value={ce.choiceText} onChange={(e: any) => setEditChoices((p: any) => ({ ...p, [choice.id]: { ...ce, choiceText: e.target.value } }))}
                                          style={{ ...textareaStyle, minHeight: 50 }} />
                                      </div>
                                      <div style={{ marginBottom: 8 }}>
                                        <label style={labelStyle}>Explanation (shown after choosing)</label>
                                        <textarea value={ce.explanationText} onChange={(e: any) => setEditChoices((p: any) => ({ ...p, [choice.id]: { ...ce, explanationText: e.target.value } }))}
                                          style={{ ...textareaStyle, minHeight: 50 }} />
                                      </div>
                                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                                        <div>
                                          <label style={labelStyle}>Q12 Impact</label>
                                          <input type="number" value={ce.q12Impact} onChange={(e: any) => setEditChoices((p: any) => ({ ...p, [choice.id]: { ...ce, q12Impact: parseInt(e.target.value) || 0 } }))} style={inputStyle} />
                                        </div>
                                        <div>
                                          <label style={labelStyle}>Points Base</label>
                                          <input type="number" value={ce.pointsBase} onChange={(e: any) => setEditChoices((p: any) => ({ ...p, [choice.id]: { ...ce, pointsBase: parseInt(e.target.value) || 0 } }))} style={inputStyle} />
                                        </div>
                                      </div>
                                      {/* Key Behaviors */}
                                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                                        <div>
                                          <label style={labelStyle}>Positive Behaviors</label>
                                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                            {(keyBehaviors || []).map((kb: any) => {
                                              const isSelected = (ce.keyBehaviorsPositive || []).includes(kb.id);
                                              return (
                                                <button key={kb.id} onClick={() => {
                                                  const updated = isSelected
                                                    ? ce.keyBehaviorsPositive.filter((id: number) => id !== kb.id)
                                                    : [...(ce.keyBehaviorsPositive || []), kb.id];
                                                  setEditChoices((p: any) => ({ ...p, [choice.id]: { ...ce, keyBehaviorsPositive: updated } }));
                                                }} style={{
                                                  background: isSelected ? T.success + "22" : T.bg, color: isSelected ? T.success : T.textMuted,
                                                  border: `1px solid ${isSelected ? T.success + "44" : T.border}`, borderRadius: 6,
                                                  padding: "3px 8px", fontSize: 10, cursor: "pointer", fontFamily: "inherit",
                                                }}>{kb.name}</button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                        <div>
                                          <label style={labelStyle}>Negative Behaviors</label>
                                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                            {(keyBehaviors || []).map((kb: any) => {
                                              const isSelected = (ce.keyBehaviorsNegative || []).includes(kb.id);
                                              return (
                                                <button key={kb.id} onClick={() => {
                                                  const updated = isSelected
                                                    ? ce.keyBehaviorsNegative.filter((id: number) => id !== kb.id)
                                                    : [...(ce.keyBehaviorsNegative || []), kb.id];
                                                  setEditChoices((p: any) => ({ ...p, [choice.id]: { ...ce, keyBehaviorsNegative: updated } }));
                                                }} style={{
                                                  background: isSelected ? T.danger + "22" : T.bg, color: isSelected ? T.danger : T.textMuted,
                                                  border: `1px solid ${isSelected ? T.danger + "44" : T.border}`, borderRadius: 6,
                                                  padding: "3px 8px", fontSize: 10, cursor: "pointer", fontFamily: "inherit",
                                                }}>{kb.name}</button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                      <div style={{ display: "flex", gap: 8 }}>
                                        <Btn onClick={() => saveChoice(s.id, node.id, choice.id)} disabled={saving === "choice-" + choice.id} style={{ fontSize: 11, padding: "4px 10px" }}>
                                          {saving === "choice-" + choice.id ? "Saving..." : "Save Choice"}
                                        </Btn>
                                        <Btn onClick={() => deleteChoice(s.id, node.id, choice.id)} disabled={saving === "choice-" + choice.id} variant="danger" style={{ fontSize: 11, padding: "4px 10px" }}>Delete</Btn>
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Add Choice Form */}
                                {newChoiceForNode === node.id ? (
                                  <div style={{ background: T.surface, borderRadius: 8, padding: 12, border: `1px dashed ${T.accent}` }}>
                                    <div style={{ marginBottom: 8 }}>
                                      <label style={labelStyle}>Choice Text</label>
                                      <textarea value={newChoiceData.choiceText || ""} onChange={(e: any) => setNewChoiceData((p: any) => ({ ...p, choiceText: e.target.value }))} style={{ ...textareaStyle, minHeight: 50 }} placeholder="What does the manager choose?" />
                                    </div>
                                    <div style={{ marginBottom: 8 }}>
                                      <label style={labelStyle}>Explanation</label>
                                      <textarea value={newChoiceData.explanationText || ""} onChange={(e: any) => setNewChoiceData((p: any) => ({ ...p, explanationText: e.target.value }))} style={{ ...textareaStyle, minHeight: 50 }} placeholder="Why this choice matters..." />
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                                      <div>
                                        <label style={labelStyle}>Q12 Impact</label>
                                        <input type="number" value={newChoiceData.q12Impact || 0} onChange={(e: any) => setNewChoiceData((p: any) => ({ ...p, q12Impact: parseInt(e.target.value) || 0 }))} style={inputStyle} />
                                      </div>
                                      <div>
                                        <label style={labelStyle}>Points Base</label>
                                        <input type="number" value={newChoiceData.pointsBase || 0} onChange={(e: any) => setNewChoiceData((p: any) => ({ ...p, pointsBase: parseInt(e.target.value) || 0 }))} style={inputStyle} />
                                      </div>
                                    </div>
                                    <div style={{ display: "flex", gap: 8 }}>
                                      <Btn onClick={() => addChoice(s.id, node.id)} disabled={saving === "new-choice"} style={{ fontSize: 11, padding: "4px 10px" }}>
                                        {saving === "new-choice" ? "Adding..." : "Add Choice"}
                                      </Btn>
                                      <Btn onClick={() => { setNewChoiceForNode(null); setNewChoiceData({}); }} style={{ fontSize: 11, padding: "4px 10px", background: "transparent", border: `1px solid ${T.border}`, color: T.textDim }}>Cancel</Btn>
                                    </div>
                                  </div>
                                ) : (
                                  <button onClick={() => { setNewChoiceForNode(node.id); setNewChoiceData({ choiceText: "", explanationText: "", q12Impact: 0, pointsBase: 0 }); }}
                                    style={{ background: "transparent", border: `1px dashed ${T.border}`, borderRadius: 8, padding: "8px 14px", color: T.textMuted, fontSize: 11, cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
                                    + Add Choice
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Add Node */}
                      {newNode ? (
                        <div style={{ background: T.bg, borderRadius: 10, padding: 16, border: `1px dashed ${T.accent}` }}>
                          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                            <div>
                              <label style={labelStyle}>Node Type</label>
                              <select value={newNode.nodeType || "REFLECTION"} onChange={(e: any) => setNewNode((p: any) => ({ ...p, nodeType: e.target.value }))} style={selectStyle}>
                                <option value="REFLECTION">REFLECTION</option>
                                <option value="DECISION">DECISION</option>
                                <option value="OUTCOME">OUTCOME</option>
                              </select>
                            </div>
                          </div>
                          <div style={{ marginBottom: 10 }}>
                            <label style={labelStyle}>Content Text</label>
                            <textarea value={newNode.contentText || ""} onChange={(e: any) => setNewNode((p: any) => ({ ...p, contentText: e.target.value }))} style={textareaStyle} placeholder="The prompt or situation text..." />
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <Btn onClick={() => addNode(s.id)} disabled={saving === "new-node"} style={{ fontSize: 11, padding: "5px 12px" }}>
                              {saving === "new-node" ? "Adding..." : "Add Node"}
                            </Btn>
                            <Btn onClick={() => setNewNode(null)} style={{ fontSize: 11, padding: "5px 12px", background: "transparent", border: `1px solid ${T.border}`, color: T.textDim }}>Cancel</Btn>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setNewNode({ nodeType: "REFLECTION", contentText: "" })}
                          style={{ background: "transparent", border: `1px dashed ${T.border}`, borderRadius: 10, padding: "10px 16px", color: T.textMuted, fontSize: 12, cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
                          + Add Node
                        </button>
                      )}
                    </div>

                    {/* ─── Delete Scenario ─── */}
                    <div style={{ paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
                      <Btn onClick={() => deleteScenario(s.id)} disabled={saving === "delete-" + s.id} variant="danger" style={{ fontSize: 12, padding: "6px 14px" }}>
                        {saving === "delete-" + s.id ? "Deleting..." : "Delete Entire Scenario"}
                      </Btn>
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>
        );
      })}
      {scenarios.length === 0 && <Card><p style={{ color: T.textMuted, fontSize: 14, padding: 16 }}>No scenarios yet. Create your first one above.</p></Card>}
    </div>
  );
}

function AdminUsersTab({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.admin.getUsers().then(u => { setUsers(u); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const toggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "ADMIN" ? "MANAGER" : "ADMIN";
    const action = newRole === "ADMIN" ? "grant admin access to" : "remove admin access from";
    const user = users.find(u => u.id === userId);
    if (!confirm(`Are you sure you want to ${action} ${user?.name || user?.email}?`)) return;

    setUpdating(userId);
    try {
      const updated = await api.admin.updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updated } : u));
    } catch (e: any) {
      alert(e.message || "Failed to update role");
    }
    setUpdating(null);
  };

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
  });

  const admins = filtered.filter(u => u.role === "ADMIN");
  const managers = filtered.filter(u => u.role === "MANAGER");

  if (loading) return <Card style={{ padding: 40, textAlign: "center" }}><p style={{ color: T.textMuted }}>Loading users...</p></Card>;

  return (
    <div>
      <Card style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>User Management</h3>
            <p style={{ color: T.textDim, fontSize: 13 }}>
              {users.length} total users · {users.filter(u => u.role === "ADMIN").length} admins · {users.filter(u => u.role === "MANAGER").length} standard
            </p>
          </div>
          <input
            type="text" placeholder="Search by name or email..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{
              background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px",
              color: T.text, fontSize: 13, fontFamily: "inherit", width: 260,
            }}
          />
        </div>
      </Card>

      {/* Admins section */}
      {admins.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.info }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.info }}>Admins ({admins.length})</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {admins.map(u => (
              <Card key={u.id} style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", background: T.accentDim,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 13, color: T.accent,
                  }}>{(u.name || u.email || "?").charAt(0).toUpperCase()}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{u.name || "Unnamed"}</div>
                    <div style={{ fontSize: 12, color: T.textMuted }}>{u.email}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {u.lastLoginAt && (
                    <span style={{ fontSize: 11, color: T.textMuted }}>
                      Last login: {new Date(u.lastLoginAt).toLocaleDateString()}
                    </span>
                  )}
                  {u.id === currentUserId ? (
                    <Badge color={T.info}>You</Badge>
                  ) : (
                    <button
                      onClick={() => toggleRole(u.id, u.role)}
                      disabled={updating === u.id}
                      style={{
                        background: T.danger + "18", color: T.danger, border: `1px solid ${T.danger}44`,
                        borderRadius: 6, padding: "6px 14px", fontSize: 11, fontWeight: 700,
                        cursor: updating === u.id ? "wait" : "pointer", fontFamily: "inherit",
                        opacity: updating === u.id ? 0.5 : 1,
                      }}
                    >
                      {updating === u.id ? "..." : "Revoke Admin"}
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Standard users section */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.success }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: T.success }}>Standard Users ({managers.length})</span>
        </div>
        {managers.length === 0 ? (
          <Card style={{ padding: 24, textAlign: "center" }}>
            <p style={{ color: T.textMuted, fontSize: 13 }}>{search ? "No matching users found." : "No standard users yet."}</p>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {managers.map(u => (
              <Card key={u.id} style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", background: T.border,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 13, color: T.textDim,
                  }}>{(u.name || u.email || "?").charAt(0).toUpperCase()}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{u.name || "Unnamed"}</div>
                    <div style={{ fontSize: 12, color: T.textMuted }}>{u.email}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {u.lastLoginAt && (
                    <span style={{ fontSize: 11, color: T.textMuted }}>
                      Last login: {new Date(u.lastLoginAt).toLocaleDateString()}
                    </span>
                  )}
                  <button
                    onClick={() => toggleRole(u.id, u.role)}
                    disabled={updating === u.id}
                    style={{
                      background: T.accentDim, color: T.accent, border: `1px solid ${T.accent}44`,
                      borderRadius: 6, padding: "6px 14px", fontSize: 11, fontWeight: 700,
                      cursor: updating === u.id ? "wait" : "pointer", fontFamily: "inherit",
                      opacity: updating === u.id ? 0.5 : 1,
                    }}
                  >
                    {updating === u.id ? "..." : "Make Admin"}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
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
