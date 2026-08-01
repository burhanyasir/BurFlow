import { useState, useEffect, useCallback } from 'react';
import type { SessionsResponse, SessionDetail, AnalyticsResponse, DashboardMetrics, SessionSummary, LeadSummary, FollowUpSummary, Note, TimelineEvent } from '../types/conversation-intelligence';
import { storage } from '../lib/storage';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = storage.getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { ...headers, ...options?.headers as Record<string, string> | undefined },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json();
}

// ─── Session List ────────────────────────────────────────
export function useSessions(limit = 50, offset = 0) {
  const [data, setData] = useState<(SessionsResponse & { sessions: SessionSummary[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchJson<SessionsResponse>(`/admin/sessions?limit=${limit}&offset=${offset}`);
      setData(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load };
}

// ─── Session Detail ──────────────────────────────────────
export function useSessionDetail(sessionId: string | null) {
  const [data, setData] = useState<(SessionDetail & { notes?: Note[]; timeline?: TimelineEvent[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchJson<SessionDetail>(`/admin/sessions/${sessionId}`);
      setData(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load };
}

// ─── Analytics ───────────────────────────────────────────
export function useAnalytics() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchJson<AnalyticsResponse>('/admin/analytics');
      setData(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load };
}

// ─── Dashboard ───────────────────────────────────────────
export function useDashboard() {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionsRes, analyticsRes] = await Promise.all([
        fetchJson<SessionsResponse>('/admin/sessions?limit=200&offset=0'),
        fetchJson<AnalyticsResponse>('/admin/analytics'),
      ]);

      const withIntel = sessionsRes.sessions.filter(s => s.hasIntel);
      const personaCounts: Record<string, number> = {};
      const stageCounts: Record<string, number> = {};
      for (const s of withIntel) {
        personaCounts[s.persona] = (personaCounts[s.persona] || 0) + 1;
        stageCounts[s.funnelStage] = (stageCounts[s.funnelStage] || 0) + 1;
      }

      const topPersona = Object.entries(personaCounts).sort((a, b) => b[1] - a[1])[0];
      const topStage = Object.entries(stageCounts).sort((a, b) => b[1] - a[1])[0];

      const activeSessionCount = sessionsRes.sessions.filter(s => s.stateMachine !== 'expired').length;

      setData({
        totalSessions: sessionsRes.total,
        activeSessions: activeSessionCount,
        avgTurns: analyticsRes.avgTurns,
        avgBuyingIntentRate: analyticsRes.avgBuyingIntentRate,
        qualificationCompletionRate: analyticsRes.qualificationCompletionRate,
        topPersona: topPersona?.[0] ?? 'N/A',
        topPersonaPercent: topPersona ? Math.round((topPersona[1] / withIntel.length) * 100) : 0,
        topFunnelStage: topStage?.[0] ?? 'N/A',
        topFunnelStagePercent: topStage ? Math.round((topStage[1] / withIntel.length) * 100) : 0,
        recentSessions: sessionsRes.sessions.slice(0, 5),
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load };
}

// ─── Operational Actions ─────────────────────────────────

export async function updateSessionStatus(sessionId: string, status: string): Promise<void> {
  await fetchJson(`/admin/sessions/${sessionId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function assignSessionOwner(sessionId: string, owner: string): Promise<void> {
  await fetchJson(`/admin/sessions/${sessionId}/owner`, {
    method: 'PUT',
    body: JSON.stringify({ owner }),
  });
}

export async function toggleSessionFlag(sessionId: string, flagged: boolean): Promise<void> {
  await fetchJson(`/admin/sessions/${sessionId}/flag`, {
    method: 'PUT',
    body: JSON.stringify({ flagged }),
  });
}

export async function toggleSessionArchive(sessionId: string, archived: boolean): Promise<void> {
  await fetchJson(`/admin/sessions/${sessionId}/archive`, {
    method: 'PUT',
    body: JSON.stringify({ archived }),
  });
}

export async function createSessionNote(sessionId: string, author: string, message: string): Promise<Note> {
  return fetchJson<Note>(`/admin/sessions/${sessionId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ author, message }),
  });
}

export async function getSessionNotes(sessionId: string): Promise<Note[]> {
  return fetchJson<Note[]>(`/admin/sessions/${sessionId}/notes`);
}

export async function updateSessionTags(sessionId: string, tags: string[]): Promise<{ tags: string[] }> {
  return fetchJson<{ tags: string[] }>(`/admin/sessions/${sessionId}/tags`, {
    method: 'PUT',
    body: JSON.stringify({ tags }),
  });
}

export async function getSessionTags(sessionId: string): Promise<{ tags: string[] }> {
  return fetchJson<{ tags: string[] }>(`/admin/sessions/${sessionId}/tags`);
}

export async function getSessionTimeline(sessionId: string): Promise<TimelineEvent[]> {
  return fetchJson<TimelineEvent[]>(`/admin/sessions/${sessionId}/timeline`);
}

// ─── Leads ───────────────────────────────────────────────
export async function fetchLeads(limit = 50, offset = 0): Promise<{ leads: LeadSummary[]; total: number }> {
  return fetchJson<{ leads: LeadSummary[]; total: number }>(`/admin/leads?limit=${limit}&offset=${offset}`);
}

// ─── Follow-ups ──────────────────────────────────────────
export async function fetchFollowUps(limit = 50, offset = 0): Promise<{ followups: FollowUpSummary[]; total: number }> {
  return fetchJson<{ followups: FollowUpSummary[]; total: number }>(`/admin/followups?limit=${limit}&offset=${offset}`);
}

// ─── Export ──────────────────────────────────────────────
export function exportSessionsJson(sessions: SessionSummary[]): void {
  const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: 'application/json' });
  downloadBlob(blob, 'conversations.json');
}

export function exportSessionsCsv(sessions: SessionSummary[]): void {
  const headers = ['Session ID', 'Created', 'Updated', 'State', 'Turns', 'Persona', 'Funnel Stage', 'Buying Intent', 'Status', 'Owner', 'Tags'];
  const rows = sessions.map(s => [
    s.sessionId,
    s.createdAt,
    s.updatedAt,
    s.stateMachine,
    s.turnCount,
    s.persona,
    s.funnelStage,
    s.buyingIntentDetected ? 'Yes' : 'No',
    s.status || '',
    s.owner || '',
    (s.tags || []).join('; '),
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  downloadBlob(blob, 'conversations.csv');
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
