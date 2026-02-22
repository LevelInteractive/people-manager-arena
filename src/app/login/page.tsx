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
          marginBottom: 48,
          fontWeight: 500,
        }}
      >
        The Manager Arena
      </p>

      <div
        style={{
          background: "#151929",
          border: "1px solid #252B42",
          borderRadius: 16,
          padding: 40,
          maxWidth: 420,
          width: "100%",
          textAlign: "center",
        }}
      >
        <p style={{ color: "#7C86A2", marginBottom: 32, lineHeight: 1.6 }}>
          Train your leadership instincts through real-world scenarios rooted in
          the Gallup Q12, Level Core Values, and the 26 Key Behaviors.
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
          Sign in with Google
        </button>
      </div>

      <p style={{ marginTop: 32, fontSize: 12, color: "#4A5272" }}>
        Restricted to @levelagency.com accounts
      </p>
    </div>
  );
}
