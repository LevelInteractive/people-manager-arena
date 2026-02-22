"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        textAlign: "center",
        padding: 24,
      }}
      className="animate-fade-in"
    >
      {/* Logo */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 20,
          background: "linear-gradient(135deg, #F97316, #FF6B2B)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 36,
          fontWeight: 900,
          color: "#fff",
          marginBottom: 24,
        }}
        className="animate-glow"
      >
        L
      </div>

      <h1
        style={{
          fontSize: 48,
          fontWeight: 900,
          letterSpacing: -2,
          background: "linear-gradient(135deg, #E8ECF4, #F97316)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: 8,
        }}
      >
        LEVEL UP
      </h1>

      <p
        style={{
          fontSize: 16,
          color: "#7C86A2",
          letterSpacing: 6,
          textTransform: "uppercase",
          marginBottom: 40,
          fontWeight: 500,
        }}
      >
        The Manager Arena
      </p>

      {/* Roosevelt Quote */}
      <div
        style={{
          maxWidth: 640,
          width: "100%",
          marginBottom: 40,
          position: "relative",
          padding: "0 20px",
        }}
      >
        <div
          style={{
            fontSize: 48,
            color: "#F97316",
            fontFamily: "Georgia, serif",
            lineHeight: 1,
            marginBottom: 8,
            opacity: 0.4,
          }}
        >
          &ldquo;
        </div>
        <p
          style={{
            color: "#9CA3B8",
            fontSize: 15,
            lineHeight: 1.8,
            fontStyle: "italic",
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}
        >
          It is not the critic who counts; not the man who points out how the strong man stumbles,
          or where the doer of deeds could have done them better. The credit belongs to the man
          who is actually in the arena, whose face is marred by dust and sweat and blood; who
          strives valiantly; who errs, who comes short again and again, because there is no effort
          without error and shortcoming; but who does actually strive to do the deeds; who knows
          great enthusiasms, the great devotions; who spends himself in a worthy cause; who at the
          best knows in the end the triumph of high achievement, and who at the worst, if he fails,
          at least fails while daring greatly, so that his place shall never be with those cold and
          timid souls who neither know victory nor defeat.
        </p>
        <p
          style={{
            color: "#6B7280",
            fontSize: 13,
            marginTop: 12,
            fontWeight: 500,
            letterSpacing: 0.5,
          }}
        >
          — Theodore Roosevelt
        </p>
      </div>

      <div
        style={{
          background: "#151929",
          border: "1px solid #252B42",
          borderRadius: 16,
          padding: 40,
          maxWidth: 480,
          width: "100%",
          textAlign: "center",
        }}
      >
        <p style={{ color: "#E8ECF4", fontSize: 16, lineHeight: 1.7, marginBottom: 12, fontWeight: 500 }}>
          It&apos;s time for you to enter the arena and dare greatly.
        </p>
        <p style={{ color: "#7C86A2", fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>
          Choose a scenario to sharpen your leadership skills. Each one is a real
          management challenge — no right answers, just better ones.
        </p>

        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          style={{
            width: "100%",
            padding: "16px 32px",
            borderRadius: 10,
            border: "none",
            background: "#F97316",
            color: "#fff",
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            fontFamily: "inherit",
            transition: "box-shadow 0.2s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.boxShadow =
              "0 0 24px rgba(249,115,22,0.4)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Enter the Arena
        </button>
      </div>

      <p style={{ marginTop: 32, fontSize: 12, color: "#4A5272" }}>
        Restricted to @levelagency.com accounts
      </p>
    </div>
  );
}
