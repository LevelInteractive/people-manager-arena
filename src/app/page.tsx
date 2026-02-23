"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api-client";
import GameShell from "@/components/GameShell";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [referenceData, setReferenceData] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const loadData = useCallback(async () => {
    try {
      const [scenarioData, refData, profile] = await Promise.all([
        api.scenarios.list(),
        api.reference.get(),
        api.users.me(),
      ]);
      setScenarios(scenarioData);
      setReferenceData(refData);
      setUserProfile(profile);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      loadData();
    }
  }, [status, loadData]);

  if (status === "loading" || loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "linear-gradient(135deg, #86D5F4, #FD6EF8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            fontWeight: 900,
            color: "#fff",
          }}
          className="animate-glow"
        >
          L
        </div>
        <p style={{ color: "#999999", fontSize: 14 }}>Loading your arena...</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <GameShell
      session={session}
      scenarios={scenarios}
      referenceData={referenceData}
      userProfile={userProfile}
      onDataRefresh={loadData}
    />
  );
}
