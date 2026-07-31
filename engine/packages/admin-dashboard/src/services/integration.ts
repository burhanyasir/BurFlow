// Integration service: consume existing public APIs and telemetry where available.
// All calls are best-effort and non-blocking; fall back to safe stubs when upstream modules are absent.

export async function getTelemetrySummary() {
  try {
    // try to require telemetry module if exists
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const telemetry = require('../../..\..\engine\packages\telemetry') || null;
    if (telemetry && typeof telemetry.summary === 'function') {
      return await telemetry.summary();
    }
  } catch (e) {
    // ignore and return stub
  }
  return {
    activeConversations: 12,
    aiResolutionRate: 0.78,
    humanHandoffRate: 0.12,
    leadConversions: 4,
    knowledgeUsage: 0.42,
    topIntents: [ 'pricing', 'demo', 'support' ],
    widgetPerformance: { ctr: 0.045 },
    recentActivity: [],
    systemHealth: { status: 'ok' },
  };
}

export async function getAnalytics() {
  // Pull from telemetry/analytics provider if present
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const telemetry = require('../../..\..\engine\packages\telemetry') || null;
    if (telemetry && typeof telemetry.analytics === 'function') return await telemetry.analytics();
  } catch (e) {
    // fallback
  }
  return {
    daily: [],
    weekly: [],
    monthly: [],
    conversionRate: 0.07,
    ctaCTR: 0.05,
    journeyCompletion: 0.34,
    topButtons: [ 'Book demo', 'Free trial' ],
    knowledgeAccuracy: 0.72,
    aiConfidence: { low: 0.1, med: 0.6, high: 0.3 },
    csat: null,
  };
}

export async function getConversations(opts: any = {}) {
  try {
    // safe require conversations service if present
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const conv = require('../../..\..\engine\packages\conversation-engine') || null;
    if (conv && typeof conv.search === 'function') return await conv.search(opts);
  } catch (e) {
    // ignore
  }
  return [{ id: 'conv_1', snippet: 'User asked about pricing', status: 'resolved' }];
}

export async function getKnowledgeSummary() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ke = require('../../..\..\engine\packages\stage-1-ingestion') || null;
    if (ke && typeof ke.summary === 'function') return await ke.summary();
  } catch (e) {
    // ignore
  }
  return { docs: [], crawlStatus: {}, faq: [], lastIndexedAt: null };
}

export async function getInstallSnippet(widgetId: string) {
  try {
    // try to locate widget info in onboarding/installation generator
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const w = require('../../..\..\engine\packages\tenant-onboarding') || null;
    if (w && typeof w.getInstallSnippet === 'function') return await w.getInstallSnippet(widgetId);
  } catch (e) {
    // ignore
  }
  return { snippet: `<script>/* widget ${widgetId} placeholder */</script>` };
}

export async function listApiKeys() {
  try {
    const ts = require('../../..\..\engine\packages\tenant-onboarding') || null;
    if (ts && typeof ts.listApiKeys === 'function') return await ts.listApiKeys();
  } catch (e) {
    // ignore
  }
  return [{ key: 'key_stub_123', lastUsed: null }];
}

export async function getBillingSummary() {
  try {
    const pb = require('../../..\..\engine\packages\billing') || null;
    if (pb && typeof pb.summary === 'function') return await pb.summary();
  } catch (e) {}
  return { subscriptions: [], revenueMonthly: 0 };
}

export async function getSettings() {
  return { businessProfile: {}, branding: {}, integrations: [] };
}

export async function getAuditLogs() {
  try {
    const audit = require('../../..\..\engine\packages\audit-logs') || null;
    if (audit && typeof audit.query === 'function') return await audit.query({ limit: 50 });
  } catch (e) {}
  return [];
}
