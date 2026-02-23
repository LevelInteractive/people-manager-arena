"use client";

import { signIn } from "next-auth/react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

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

        {/* Google Sign-In Button */}
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl })}
          className="w-full py-3 px-4 bg-[#86D5F4] hover:bg-[#6bc5e8] text-black font-bold rounded-lg transition-colors duration-200 flex items-center justify-center gap-3"
          style={{ fontFamily: "'Inter Tight', sans-serif" }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Enter the Arena
        </button>
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
