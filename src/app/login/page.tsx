"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [email, setEmail] = useState("");
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
        redirect: false,
      });
      if (result?.error) {
        setError("Please use your Level Agency email address");
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
    <div className="min-h-screen flex flex-col items-center justify-start bg-black text-white px-4 py-12 overflow-y-auto">
      {/* Logo */}
      <div className="w-16 h-16 bg-gradient-to-br from-[#86D5F4] to-[#FD6EF8] rounded-xl flex items-center justify-center mb-6">
        <span className="text-white text-3xl font-black" style={{ fontFamily: "'Inter Tight', sans-serif" }}>L</span>
      </div>

      {/* Title */}
      <h1 className="text-4xl font-black tracking-tight mb-1" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
        LEVEL <span className="text-[#86D5F4]">UP</span>
      </h1>
      <p className="text-sm tracking-[0.3em] text-[#999] uppercase mb-10" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        The Manager Arena
      </p>

      {/* Quote */}
      <div className="max-w-2xl text-center mb-10 px-4">
        <div className="text-[#86D5F4] text-5xl font-serif leading-none mb-4">&ldquo;</div>
        <p className="text-[#ccc] italic text-sm leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          It is not the critic who counts; not the man who points out how the strong man stumbles,
          or where the doer of deeds could have done them better. The credit belongs to the man
          who is actually in the arena, whose face is marred by dust and sweat and blood; who
          strives valiantly; who errs, who comes short again and again, because there is no effort
          without error and shortcoming; but who does actually strive to do the deeds; who knows
          great enthusiasms, the great devotions; who spends himself in a worthy cause; who at
          the best knows in the end the triumph of high achievement, and who at the worst, if he
          fails, at least fails while daring greatly, so that his place shall never be with those cold
          and timid souls who neither know victory nor defeat.
        </p>
        <p className="text-[#999] text-sm mt-6">&mdash; Theodore Roosevelt</p>
      </div>

      {/* CTA Card */}
      <div className="w-full max-w-md bg-[#111] border border-[#2A2A2A] rounded-2xl p-8 text-center mb-6">
        <h2 className="text-lg font-bold mb-2" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
          It&apos;s time for you to enter the arena and dare greatly.
        </h2>
        <p className="text-[#999] text-sm mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Choose a scenario to sharpen your leadership skills. Each one is
          a real management challenge &mdash; no right answers, just better ones.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm text-center mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 bg-black border border-[#2A2A2A] rounded-lg text-white placeholder-[#666] focus:outline-none focus:ring-2 focus:ring-[#86D5F4] focus:border-transparent text-sm"
            placeholder="you@level.agency"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-[#86D5F4] hover:bg-[#6bc5e8] disabled:bg-[#86D5F4]/50 text-black font-bold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            style={{ fontFamily: "'Inter Tight', sans-serif" }}
          >
            {loading ? "Entering..." : "Enter the Arena"}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="text-[#666] text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        Restricted to @level.agency accounts
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-lg">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
