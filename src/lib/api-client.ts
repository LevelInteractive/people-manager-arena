// ═══════════════════════════════════════════════════════
// API Client — typed fetch wrappers for all endpoints
// ═══════════════════════════════════════════════════════

async function fetchAPI<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  return res.json();
}

// ─── Scenarios ───
export const api = {
  scenarios: {
    list: () => fetchAPI<any[]>("/api/scenarios"),
    get: (id: string) => fetchAPI<any>(`/api/scenarios/${id}`),
    create: (data: any) => fetchAPI<any>("/api/scenarios", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchAPI<any>(`/api/scenarios/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => fetchAPI<any>(`/api/scenarios/${id}`, { method: "DELETE" }),
  },

  // ─── Progress ───
  progress: {
    get: (scenarioId: string) => fetchAPI<any[]>(`/api/scenarios/${scenarioId}/progress`),
    save: (scenarioId: string, data: any) =>
      fetchAPI<any>(`/api/scenarios/${scenarioId}/progress`, { method: "POST", body: JSON.stringify(data) }),
  },

  // ─── Reflections ───
  reflections: {
    save: (data: { nodeId: string; responseText: string; scenarioId?: string }) =>
      fetchAPI<any>("/api/reflections", { method: "POST", body: JSON.stringify(data) }),
  },

  // ─── Coaching ───
  coaching: {
    reflect: (data: {
      scenarioId: string;
      nodeId: string;
      userResponse: string;
      exchangeNumber: number;
      priorExchanges?: Array<{ coachMessage: string; userResponse: string }>;
    }) => fetchAPI<{
      coachMessage: string;
      exchangeNumber: number;
      canContinue: boolean;
      maxExchangesReached: boolean;
    }>("/api/coaching/reflect", { method: "POST", body: JSON.stringify(data) }),

    decision: (data: {
      scenarioId: string;
      nodeId: string;
      chosenChoiceId: string;
    }) => fetchAPI<{
      feedback: string | null;
      isOptimal: boolean;
      bestChoicePreview?: string;
    }>("/api/coaching/decision", { method: "POST", body: JSON.stringify(data) }),
  },

  // ─── Feedback ───
  feedback: {
    submit: (scenarioId: string, data: any) =>
      fetchAPI<any>(`/api/scenarios/${scenarioId}/feedback`, { method: "POST", body: JSON.stringify(data) }),
  },

  // ─── Events ───
  events: {
    log: (data: { eventType: string; scenarioId?: string; metadata?: any }) =>
      fetchAPI<any>("/api/events", { method: "POST", body: JSON.stringify(data) }),
    list: (params?: { limit?: number; offset?: number; type?: string }) => {
      const qs = new URLSearchParams();
      if (params?.limit) qs.set("limit", String(params.limit));
      if (params?.offset) qs.set("offset", String(params.offset));
      if (params?.type) qs.set("type", params.type);
      return fetchAPI<any>(`/api/events?${qs}`);
    },
  },

  // ─── Bugs ───
  bugs: {
    submit: (data: { description: string; scenarioId?: string; browserInfo?: string; route?: string }) =>
      fetchAPI<any>("/api/bugs", { method: "POST", body: JSON.stringify(data) }),
    list: (status?: string) => fetchAPI<any[]>(`/api/bugs${status ? `?status=${status}` : ""}`),
    updateStatus: (id: string, status: "OPEN" | "CLOSED") =>
      fetchAPI<any>("/api/bugs", { method: "PATCH", body: JSON.stringify({ id, status }) }),
  },

  // ─── Users ───
  users: {
    me: () => fetchAPI<any>("/api/users"),
  },

  // ─── Leaderboard ───
  leaderboard: {
    get: (sort?: string) => fetchAPI<any[]>(`/api/leaderboard${sort ? `?sort=${sort}` : ""}`),
  },

  // ─── Admin ───
  admin: {
    analytics: () => fetchAPI<any>("/api/admin/analytics"),
    scenarios: () => fetchAPI<any[]>("/api/admin/scenarios"),
    addNode: (scenarioId: string, data: any) =>
      fetchAPI<any>(`/api/scenarios/${scenarioId}/nodes`, { method: "POST", body: JSON.stringify(data) }),
    addChoice: (scenarioId: string, nodeId: string, data: any) =>
      fetchAPI<any>(`/api/scenarios/${scenarioId}/nodes/${nodeId}/choices`, { method: "POST", body: JSON.stringify(data) }),
  },

  // ─── Reference Data ───
  reference: {
    get: () => fetchAPI<{ q12Dimensions: any[]; coreValues: any[]; keyBehaviors: any[] }>("/api/reference"),
  },
};

export default api;
