"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 20, background: "linear-gradient(135deg, #0a1628 0%, #1a2a4a 50%, #0d1f3c 100%)", color: "#e0e0e0", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ width: 64, height: 64, background: "#f97316", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28, fontWeight: 700, color: "white" }}>L</div>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: "#f97316", letterSpacing: 2, margin: "0 0 8px", fontStyle: "italic" }}>LEVEL UP</h1>
        <p style={{ fontSize: 14, letterSpacing: 6, color: "#8899aa", margin: 0 }}>THE MANAGER ARENA</p>
      </div>
      <div style={{ width: "100%", maxWidth: 400, background: "rgba(255,255,255,0.05)", borderRadius: 16, padding: 32, border: "1px solid rgba(255,255,255,0.1)" }}>
        <p style={{ textAlign: "center", marginBottom: 24, fontSize: 16, fontWeight: 600, color: "#c0c8d4" }}>
          It&apos;s time to enter the arena and dare greatly.
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="email" style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#8899aa" }}>Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@levelagency.com" required style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", color: "#e0e0e0", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label htmlFor="password" style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#8899aa" }}>Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", color: "#e0e0e0", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 16, textAlign: "center" }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ width: "100%", padding: 14, borderRadius: 8, border: "none", background: loading ? "#666" : "#f97316", color: "white", fontSize: 16, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", letterSpacing: 1 }}>
            {loading ? "Entering..." : "Enter the Arena"}
          </button>
        </form>
        <p style={{ marginTop: 24, fontSize: 12, color: "#4A5272", textAlign: "center" }}>Restricted to @levelagency.com accounts</p>
      </div>
    </div>
  );
                   }
