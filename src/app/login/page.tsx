"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      callbackUrl: "/",
      redirect: true,
    });

    if (result?.error) {
      setError("Login failed. Please try again.");
      setLoading(false);
    }
  };

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

        {/* Email Login Form */}
        <form onSubmit={handleEmailLogin} style={{ marginBottom: 16 }}>
          <input
            type="email"
            placeholder="your.name@level.agency"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 10,
              border: "1px solid #252B42",
              background: "#0B0F1A",
              color: "#E8ECF4",
              fontSize: 15,
              fontFamily: "inherit",
              marginBottom: 12,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {error && (
            <p style={{ color: "#EF4444", fontSize: 13, marginBottom: 8 }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "16px 32px",
              borderRadius: 10,
              border: "none",
              background: loading ? "#6B4E2E" : "#F97316",
              color: "#fff",
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
              fontFamily: "inherit",
              transition: "box-shadow 0.2s",
            }}
            onMouseEnter={(e) =>
              !loading && (e.currentTarget.style.boxShadow = "0 0 24px rgba(249,115,22,0.4)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>

      <p style={{ marginTop: 32, fontSize: 12, color: "#4A5272" }}>
        Level Agency — Manager Training Platform
      </p>
    </div>
  );
}
