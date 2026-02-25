// ═══════════════════════════════════════════════════════
// Environment Variable Validation
// Import this in layout.tsx or a server component to
// surface missing env vars at startup.
// ═══════════════════════════════════════════════════════

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
] as const;

const RECOMMENDED_ENV_VARS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "ANTHROPIC_API_KEY",
  "BOOTSTRAP_ADMIN_EMAIL",
] as const;

export function validateEnv() {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  for (const key of RECOMMENDED_ENV_VARS) {
    if (!process.env[key]) {
      warnings.push(key);
    }
  }

  if (missing.length > 0) {
    console.error(`❌ Missing REQUIRED env vars: ${missing.join(", ")}`);
  }
  if (warnings.length > 0) {
    console.warn(`⚠️  Missing recommended env vars: ${warnings.join(", ")}`);
  }

  return { missing, warnings, isValid: missing.length === 0 };
}

// Auto-run validation on import (server-side only)
if (typeof window === "undefined") {
  validateEnv();
}
