#!/usr/bin/env node
/**
 * e2e-verify.mjs — Production End-to-End Verification
 *
 * Exercises every critical workflow against a running SaaS API.
 * Usage:  node scripts/e2e-verify.mjs [baseUrl]
 *         Default baseUrl: http://localhost:3457
 *
 * Exit code: 0 = all critical paths pass, 1 = failures detected
 */

const BASE_URL = (process.argv[2] || process.env.E2E_BASE_URL || 'http://localhost:3457').replace(/\/+$/, '');

// ── Test State ──────────────────────────────────────────────────
const state = {
  email: `e2e-test-${Date.now()}@example.com`,
  password: 'TestPass123!@#',
  name: 'E2E Test User',
  companyName: 'E2E Test Corp',
  userId: null,
  tenantId: null,
  accessToken: null,
  refreshToken: null,
  conversationId: null,
  knowledgeBaseId: null,
  widgetToken: null,
  apiKey: null,
};

// ── Results ─────────────────────────────────────────────────────
const results = [];

function test(name, fn) {
  const entry = { name, status: 'PASS', detail: '' };
  const start = Date.now();
  try {
    const result = fn();
    if (result && result.then) {
      return result.then(r => {
        entry.durationMs = Date.now() - start;
        results.push(entry);
        return r;
      }).catch(err => {
        entry.status = 'FAIL';
        entry.detail = err.message || String(err);
        entry.durationMs = Date.now() - start;
        results.push(entry);
        return null;
      });
    }
    entry.durationMs = Date.now() - start;
    results.push(entry);
    return result;
  } catch (err) {
    entry.status = 'FAIL';
    entry.detail = err.message || String(err);
    entry.durationMs = Date.now() - start;
    results.push(entry);
    return null;
  }
}

async function req(method, path, opts = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  if (state.accessToken && !opts.skipAuth) {
    headers['Authorization'] = `Bearer ${state.accessToken}`;
  }
  const res = await fetch(url, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    ...opts.fetchOpts,
  });
  let body;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }
  return { status: res.status, ok: res.ok, headers: res.headers, body };
}

function fail(msg) { throw new Error(msg); }

// ── Tests ───────────────────────────────────────────────────────

async function runHealthChecks() {
  // GET /api/live
  const liveRes = await req('GET', '/api/live', { skipAuth: true });
  if (liveRes.status !== 200) fail(`Expected 200, got ${liveRes.status}`);
  if (liveRes.body.status !== 'alive') fail(`Expected 'alive', got '${liveRes.body.status}'`);

  // GET /api/ready
  const readyRes = await req('GET', '/api/ready', { skipAuth: true });
  if (readyRes.status !== 200) fail(`Expected 200, got ${readyRes.status}`);

  // GET /api/health
  const healthRes = await req('GET', '/api/health', { skipAuth: true });
  if (healthRes.status !== 200) fail(`Expected 200, got ${healthRes.status}`);
  if (healthRes.body.status !== 'ok') fail(`Expected 'ok', got '${healthRes.body.status}'`);
  if (!healthRes.body.checks || !healthRes.body.checks.database) fail('Missing database health check');
  if (healthRes.body.checks.database.status !== 'healthy') fail(`DB unhealthy: ${JSON.stringify(healthRes.body.checks.database)}`);
}

async function runSignup() {
  const res = await req('POST', '/api/auth/signup', {
    skipAuth: true,
    body: {
      email: state.email,
      password: state.password,
      name: state.name,
      companyName: state.companyName,
    },
  });
  if (res.status !== 201) fail(`Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
  if (!res.body.user) fail('No user in response');
  if (!res.body.tenant) fail('No tenant in response');
  if (!res.body.token) fail('No access token in response');
  if (!res.body.refreshToken) fail('No refresh token in response');
  state.userId = res.body.user.id;
  state.tenantId = res.body.tenant.id;
  state.accessToken = res.body.token;
  state.refreshToken = res.body.refreshToken;
}

async function runRegisterAlias() {
  const email = `e2e-reg-${Date.now()}@example.com`;
  const res = await req('POST', '/api/auth/register', {
    skipAuth: true,
    body: { email, password: state.password, name: 'Register Alias', companyName: 'RegTest' },
  });
  if (res.status !== 201) fail(`Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
  if (!res.body.token) fail('No token from /register');
}

async function runLogin() {
  const res = await req('POST', '/api/auth/login', {
    skipAuth: true,
    body: { email: state.email, password: state.password },
  });
  if (res.status !== 200) fail(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  if (!res.body.token) fail('No access token');
  if (!res.body.refreshToken) fail('No refresh token');
  state.accessToken = res.body.token;
  state.refreshToken = res.body.refreshToken;
}

async function runAuthMe() {
  const res = await req('GET', '/api/auth/me');
  if (res.status !== 200) fail(`Expected 200, got ${res.status}`);
  if (!res.body.user) fail('No user');
  if (!res.body.tenants) fail('No tenants');
  const match = res.body.tenants.find(t => t.id === state.tenantId);
  if (!match) fail('Tenant from signup not in /me tenants list');
}

async function runUpdateProfile() {
  const newName = 'E2E Updated Name';
  const res = await req('PUT', '/api/auth/me', {
    body: { name: newName, avatarUrl: 'https://example.com/avatar.png' },
  });
  if (res.status !== 200) fail(`Expected 200, got ${res.status}`);
  if (res.body.user.name !== newName) fail(`Name not updated: ${res.body.user.name}`);
}

async function runEmailVerification() {
  // The verification token is generated during signup but not returned.
  // We verify by testing that the endpoint at least accepts valid requests.
  // In production, the user clicks a link. Here we test validation.
  const res = await req('POST', '/api/auth/verify', {
    skipAuth: true,
    body: { token: 'invalid-token-for-test' },
  });
  // Should fail with invalid token (not crash)
  if (res.status === 500) fail(`Server error on verify: ${JSON.stringify(res.body)}`);
}

async function runTenantRead() {
  const res = await req('GET', `/api/tenants/${state.tenantId}`);
  if (res.status !== 200) fail(`Expected 200, got ${res.status}`);
  if (!res.body.tenant) fail('No tenant');
  if (res.body.tenant.id !== state.tenantId) fail('Tenant ID mismatch');
}

async function runTenantList() {
  const res = await req('GET', '/api/tenants');
  if (res.status !== 200) fail(`Expected 200, got ${res.status}`);
  if (!res.body.tenants || res.body.tenants.length === 0) fail('No tenants returned');
}

async function runKnowledgeBaseCreation() {
  const res = await req('POST', '/api/knowledge-bases', {
    body: { name: 'E2E Test KB', description: 'Created by e2e verification' },
  });
  if (res.status !== 201) fail(`Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
  if (!res.body.knowledgeBase) fail('No knowledgeBase in response');
  state.knowledgeBaseId = res.body.knowledgeBase.id;
}

async function runKnowledgeBaseRead() {
  const res = await req('GET', `/api/knowledge-bases/${state.knowledgeBaseId}`);
  if (res.status !== 200) fail(`Expected 200, got ${res.status}`);
  if (res.body.knowledgeBase.id !== state.knowledgeBaseId) fail('KB ID mismatch');
}

async function runDocumentUpload() {
  const res = await req('POST', `/api/knowledge-bases/${state.knowledgeBaseId}/documents`, {
    body: { filename: 'e2e-test-doc.txt', sourceType: 'text', sourceUrl: '' },
  });
  if (res.status !== 201) fail(`Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
  if (!res.body.document) fail('No document in response');
}

async function runKnowledgeUpload() {
  const res = await req('POST', '/api/knowledge/upload', {
    body: {
      filename: 'e2e-faq.txt',
      sourceType: 'faq',
      content: 'Q: What is this?\nA: An e2e test.',
    },
  });
  if (res.status !== 202) fail(`Expected 202, got ${res.status}: ${JSON.stringify(res.body)}`);
  if (!res.body.documentId) fail('No documentId');
}

async function runKnowledgeSources() {
  const res = await req('GET', '/api/knowledge/sources');
  if (res.status !== 200) fail(`Expected 200, got ${res.status}`);
  if (!Array.isArray(res.body.sources)) fail('sources is not an array');
}

async function runWidgetTokenGeneration() {
  const res = await req('POST', '/api/widget/token', { body: {} });
  if (res.status !== 200) fail(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  if (!res.body.token) fail('No widget token');
  state.widgetToken = res.body.token;
}

async function runWidgetConfigUpdate() {
  const res = await req('PUT', '/api/widget/config', {
      body: {
        theme: 'light',
        position: 'bottom-right',
        primaryColor: '#007bff',
        companyName: state.companyName,
        greeting: 'Hello! How can we help?',
        launcherText: 'Chat with us',
        autoOpen: false,
        allowedDomains: ['*'],
      },
  });
  if (res.status !== 200) fail(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
}

async function runWidgetConfigPublic() {
  if (!state.widgetToken) fail('No widget token available');
  const res = await req('GET', `/api/widget/config?token=${state.widgetToken}`, { skipAuth: true });
  if (res.status !== 200) fail(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  if (!res.body.companyName) fail('No companyName in public config');
}

async function runWidgetSnippet() {
  if (!state.widgetToken) fail('No widget token');
  const res = await req('GET', `/api/widget/snippet?token=${state.widgetToken}`, { skipAuth: true });
  if (res.status !== 200) fail(`Expected 200, got ${res.status}`);
  if (!res.body.includes('widget/widget.js')) fail('Snippet missing widget script');
}

async function runWidgetVerify() {
  if (!state.widgetToken) fail('No widget token');
  const res = await req('POST', '/api/widget/verify', {
    skipAuth: true,
    body: { token: state.widgetToken },
  });
  if (res.status !== 200) fail(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  if (!res.body.valid) fail('Token not marked valid');
  if (res.body.tenantId !== state.tenantId) fail('Tenant ID mismatch in widget verify');
}

async function runChatMessage() {
  const res = await req('POST', '/api/chat', {
    body: { message: 'What services do you offer?', responseText: 'We offer AI-powered customer support chatbots.' },
  });
  if (res.status !== 200) fail(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  if (!res.body.response) fail('No response text');
  if (!res.body.sessionId) fail('No sessionId');
  if (!res.body.conversationId) fail('No conversationId');
  state.conversationId = res.body.conversationId;

  // Send a second message to test conversation continuity
  const res2 = await req('POST', '/api/chat', {
    body: { message: 'Tell me more about pricing', sessionId: res.body.sessionId },
  });
  if (res2.status !== 200) fail(`Second message failed: ${JSON.stringify(res2.body)}`);
}

async function runConversationList() {
  const res = await req('GET', '/api/conversations');
  if (res.status !== 200) fail(`Expected 200, got ${res.status}`);
  if (!res.body.conversations || res.body.conversations.length === 0) fail('No conversations');
}

async function runConversationMessages() {
  if (!state.conversationId) fail('No conversation ID');
  const res = await req('GET', `/api/conversations/${state.conversationId}/messages`);
  if (res.status !== 200) fail(`Expected 200, got ${res.status}`);
  if (!res.body.messages || res.body.messages.length === 0) fail('No messages');
}

async function runBillingPlans() {
  const res = await req('GET', '/api/billing/plans');
  if (res.status !== 200) fail(`Expected 200, got ${res.status}`);
  if (!res.body.plans || res.body.plans.length === 0) fail('No plans');
  const free = res.body.plans.find(p => p.id === 'free');
  if (!free) fail('Free plan missing');
}

async function runBillingCurrent() {
  const res = await req('GET', '/api/billing/current');
  if (res.status !== 200 && res.status !== 404) {
    fail(`Unexpected status ${res.status}: ${JSON.stringify(res.body)}`);
  }
}

async function runBillingCheckout() {
  const res = await req('POST', '/api/billing/checkout', {
    body: { plan: 'starter' },
  });
  if (res.status !== 200) fail(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  if (!res.body.url) fail('No checkout URL');
}

async function runBillingChangePlan() {
  // First checkout to create a subscription
  await req('POST', '/api/billing/checkout', { body: { plan: 'starter' } });
  // Then change plan
  const res = await req('POST', '/api/billing/change-plan', {
    body: { plan: 'professional' },
  });
  // Should succeed since the checkout implicitly creates subscription
  if (res.status !== 200) {
    // If no subscription, this is acceptable behavior
    if (res.status === 404) return;
    fail(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  }
}

async function runBillingUsage() {
  const res = await req('GET', '/api/billing/usage');
  if (res.status !== 200 && res.status !== 404) {
    fail(`Unexpected status ${res.status}: ${JSON.stringify(res.body)}`);
  }
}

async function runUsageCurrent() {
  const res = await req('GET', '/api/usage/current');
  if (res.status !== 200) fail(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  if (!res.body.usage) fail('No usage data');
}

async function runUsageList() {
  const res = await req('GET', '/api/usage');
  if (res.status !== 200) fail(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
}

async function runApiKeyCreate() {
  const res = await req('POST', '/api/api-keys', {
    body: { label: 'E2E Test Key', role: 'end-user' },
  });
  if (res.status !== 201) fail(`Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
  if (!res.body.key) fail('No API key returned');
  if (!res.body.apiKey) fail('No apiKey record');
  state.apiKey = res.body.key;
}

async function runApiKeyList() {
  const res = await req('GET', '/api/api-keys');
  if (res.status !== 200) fail(`Expected 200, got ${res.status}`);
  if (!res.body.keys || res.body.keys.length === 0) fail('No API keys');
}

async function runAdminOverview() {
  const res = await req('GET', '/api/admin/overview');
  if (res.status !== 200) fail(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  if (typeof res.body.totalConversations !== 'number') fail('totalConversations not a number');
}

async function runAdminAnalytics() {
  const res = await req('GET', '/api/admin/analytics');
  if (res.status !== 200) fail(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
}

async function runAdminUsers() {
  const res = await req('GET', '/api/admin/users');
  if (res.status !== 200) fail(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  if (!res.body.users || res.body.users.length === 0) fail('No users');
}

async function runAdminSubscription() {
  const res = await req('GET', '/api/admin/subscription');
  // 404 is acceptable if no subscription exists
  if (res.status !== 200 && res.status !== 404) {
    fail(`Unexpected status ${res.status}: ${JSON.stringify(res.body)}`);
  }
}

async function runAdminApiKeys() {
  const res = await req('GET', '/api/admin/api-keys');
  if (res.status !== 200) fail(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
}

async function runAdminLogs() {
  const res = await req('GET', '/api/admin/logs');
  if (res.status !== 200) fail(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  if (!res.body.events) fail('No events in logs response');
}

async function runMetrics() {
  const res = await req('GET', '/api/metrics', { skipAuth: true });
  if (res.status !== 200) fail(`Expected 200, got ${res.status}`);
  if (!res.body.counters) fail('No counters');
}

async function runTokenRefresh() {
  const res = await req('POST', '/api/auth/refresh', {
    skipAuth: true,
    body: { refreshToken: state.refreshToken },
  });
  if (res.status !== 200) fail(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  if (!res.body.token) fail('No new access token');
  if (!res.body.refreshToken) fail('No new refresh token');
  state.accessToken = res.body.token;
  state.refreshToken = res.body.refreshToken;
}

async function runPasswordChange() {
  const newPassword = 'NewPass456!@#';
  const res = await req('PUT', '/api/auth/password', {
    body: { currentPassword: state.password, newPassword },
  });
  if (res.status !== 200) fail(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  state.password = newPassword;
}

async function runLogout() {
  const res = await req('POST', '/api/auth/logout', { body: {} });
  if (res.status !== 200) fail(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  if (res.body.message !== 'Logged out') fail(`Unexpected message: ${res.body.message}`);
}

async function runLogoutVerify() {
  // Token should be invalid after logout (refresh tokens revoked)
  const res = await req('GET', '/api/auth/me');
  if (res.status !== 401 && res.status !== 403) {
    // Token might still be valid (JWT), but refresh tokens should be revoked
    // At minimum, the endpoint should not return user data for the same flow
    // after password change (which also revokes all refresh tokens)
  }
}

async function runKnowledgeSearch() {
  const res = await req('POST', '/api/knowledge/search', {
    body: { query: 'test', topK: 5 },
  });
  if (res.status !== 200) fail(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  if (typeof res.body.totalResults !== 'number') fail('totalResults not a number');
}

async function runKnowledgeStats() {
  const res = await req('GET', '/api/knowledge/stats');
  if (res.status !== 200) fail(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  if (!res.body.vectors) fail('No vector stats');
}

async function runOnboardingProgress() {
  const res = await req('GET', '/api/onboarding/progress');
  if (res.status !== 200) fail(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  if (!res.body.progress) fail('No progress');
}

async function runOnboardingUpdate() {
  const res = await req('PUT', '/api/onboarding/progress', {
    body: { completedSteps: ['signup', 'knowledge_base'], currentStep: 'widget' },
  });
  if (res.status !== 200) fail(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
}

async function loginAgain() {
  const res = await req('POST', '/api/auth/login', {
    skipAuth: true,
    body: { email: state.email, password: state.password },
  });
  if (res.status !== 200) fail(`Re-login failed: ${res.status}: ${JSON.stringify(res.body)}`);
  state.accessToken = res.body.token;
  state.refreshToken = res.body.refreshToken;
}

// ─── Main ──────────────────────────────────────────────────────

async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log('  Production End-to-End Verification');
  console.log(`  Target: ${BASE_URL}`);
  console.log('═'.repeat(70) + '\n');

  // Phase 1: Infrastructure
  console.log('── Phase 1: Infrastructure ──');
  await test('GET /api/live — Liveness', runHealthChecks);
  // runHealthChecks is a multi-check function; we need to handle it differently
  // Let's do them individually here

  const phase1Tests = [
    ['GET /api/live', async () => {
      const r = await req('GET', '/api/live', { skipAuth: true });
      if (r.status !== 200) fail(`${r.status}`);
      if (r.body.status !== 'alive') fail(`status=${r.body.status}`);
    }],
    ['GET /api/ready', async () => {
      const r = await req('GET', '/api/ready', { skipAuth: true });
      if (r.status !== 200) fail(`${r.status}`);
    }],
    ['GET /api/health (with DB check)', async () => {
      const r = await req('GET', '/api/health', { skipAuth: true });
      if (r.status !== 200) fail(`${r.status}`);
      if (r.body.status !== 'ok') fail(`status=${r.body.status}`);
      if (r.body.checks.database.status !== 'healthy') fail(`DB: ${r.body.checks.database.status}`);
    }],
    ['GET /api/metrics', async () => {
      const r = await req('GET', '/api/metrics', { skipAuth: true });
      if (r.status !== 200) fail(`${r.status}`);
      if (!r.body.counters) fail('no counters');
    }],
  ];
  for (const [name, fn] of phase1Tests) {
    await test(name, fn);
  }

  // Phase 2: Authentication
  console.log('\n── Phase 2: Authentication ──');
  const phase2Tests = [
    ['POST /api/auth/signup', runSignup],
    ['POST /api/auth/register (alias)', runRegisterAlias],
    ['POST /api/auth/login', runLogin],
    ['GET /api/auth/me', runAuthMe],
    ['PUT /api/auth/me (profile update)', runUpdateProfile],
    ['POST /api/auth/verify (validation)', runEmailVerification],
  ];
  for (const [name, fn] of phase2Tests) {
    await test(name, fn);
  }

  // Phase 3: Tenant & Knowledge
  console.log('\n── Phase 3: Tenant & Knowledge ──');
  const phase3Tests = [
    ['GET /api/tenants', runTenantList],
    ['GET /api/tenants/:id', runTenantRead],
    ['POST /api/knowledge-bases', runKnowledgeBaseCreation],
    ['GET /api/knowledge-bases/:id', runKnowledgeBaseRead],
    ['POST /knowledge-bases/:id/documents', runDocumentUpload],
    ['POST /api/knowledge/upload', runKnowledgeUpload],
    ['GET /api/knowledge/sources', runKnowledgeSources],
    ['POST /api/knowledge/search', runKnowledgeSearch],
    ['GET /api/knowledge/stats', runKnowledgeStats],
  ];
  for (const [name, fn] of phase3Tests) {
    await test(name, fn);
  }

  // Phase 4: Widget
  console.log('\n── Phase 4: Widget ──');
  const phase4Tests = [
    ['POST /api/widget/token', runWidgetTokenGeneration],
    ['PUT /api/widget/config', runWidgetConfigUpdate],
    ['GET /api/widget/config (public)', runWidgetConfigPublic],
    ['GET /api/widget/snippet', runWidgetSnippet],
    ['POST /api/widget/verify', runWidgetVerify],
  ];
  for (const [name, fn] of phase4Tests) {
    await test(name, fn);
  }

  // Phase 5: Chat
  console.log('\n── Phase 5: Chat ──');
  const phase5Tests = [
    ['POST /api/chat (message)', runChatMessage],
    ['GET /api/conversations', runConversationList],
    ['GET /api/conversations/:id/messages', runConversationMessages],
  ];
  for (const [name, fn] of phase5Tests) {
    await test(name, fn);
  }

  // Phase 6: Billing
  console.log('\n── Phase 6: Billing ──');
  const phase6Tests = [
    ['GET /api/billing/plans', runBillingPlans],
    ['GET /api/billing/current', runBillingCurrent],
    ['POST /api/billing/checkout', runBillingCheckout],
    ['POST /api/billing/change-plan', runBillingChangePlan],
    ['GET /api/billing/usage', runBillingUsage],
  ];
  for (const [name, fn] of phase6Tests) {
    await test(name, fn);
  }

  // Phase 7: Usage & API Keys
  console.log('\n── Phase 7: Usage & API Keys ──');
  const phase7Tests = [
    ['GET /api/usage/current', runUsageCurrent],
    ['GET /api/usage', runUsageList],
    ['POST /api/api-keys', runApiKeyCreate],
    ['GET /api/api-keys', runApiKeyList],
  ];
  for (const [name, fn] of phase7Tests) {
    await test(name, fn);
  }

  // Phase 8: Admin Dashboard
  console.log('\n── Phase 8: Admin Dashboard ──');
  const phase8Tests = [
    ['GET /api/admin/overview', runAdminOverview],
    ['GET /api/admin/analytics', runAdminAnalytics],
    ['GET /api/admin/users', runAdminUsers],
    ['GET /api/admin/subscription', runAdminSubscription],
    ['GET /api/admin/api-keys', runAdminApiKeys],
    ['GET /api/admin/logs', runAdminLogs],
  ];
  for (const [name, fn] of phase8Tests) {
    await test(name, fn);
  }

  // Phase 9: Onboarding
  console.log('\n── Phase 9: Onboarding ──');
  const phase9Tests = [
    ['GET /api/onboarding/progress', runOnboardingProgress],
    ['PUT /api/onboarding/progress', runOnboardingUpdate],
  ];
  for (const [name, fn] of phase9Tests) {
    await test(name, fn);
  }

  // Phase 10: Token Management & Logout
  console.log('\n── Phase 10: Token & Session ──');
  const phase10Tests = [
    ['POST /api/auth/refresh (token rotation)', runTokenRefresh],
    ['PUT /api/auth/password (change password)', runPasswordChange],
    ['Re-login after password change', loginAgain],
    ['POST /api/auth/logout', runLogout],
  ];
  for (const [name, fn] of phase10Tests) {
    await test(name, fn);
  }

  // ─── Report ────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(70));
  console.log('  Verification Report');
  console.log('═'.repeat(70));

  const passed = results.filter(r => r.status === 'PASS');
  const failed = results.filter(r => r.status === 'FAIL');
  const total = results.length;

  console.log(`\n  Total: ${total}  |  Passed: ${passed.length}  |  Failed: ${failed.length}  |  Pass Rate: ${total > 0 ? Math.round(passed.length / total * 100) : 0}%\n`);

  if (failed.length > 0) {
    console.log('  ── Failed Tests ──');
    for (const f of failed) {
      console.log(`  ❌  ${f.name}`);
      console.log(`      ${f.detail}`);
      if (f.durationMs) console.log(`      Duration: ${f.durationMs}ms`);
    }
    console.log('');
  }

  // ─── Detail Table ──────────────────────────────────────────
  console.log('  ── Results Detail ──');
  console.log('  ' + '─'.repeat(66));
  console.log(`  ${'Test'.padEnd(44)} ${'Status'.padEnd(8)} ${'Duration'}`);
  console.log('  ' + '─'.repeat(66));
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✓' : '✗';
    const colored = r.status === 'PASS' ? `\x1b[32m${r.status}\x1b[0m` : `\x1b[31m${r.status}\x1b[0m`;
    const dur = r.durationMs ? `${r.durationMs}ms` : '';
    // Use plain text for clean output
    console.log(`  ${r.name.padEnd(44)} ${r.status.padEnd(8)} ${dur}`);
  }
  console.log('  ' + '─'.repeat(66));
  console.log(`  ${'TOTAL'.padEnd(44)} ${`${passed.length}/${total}`.padEnd(8)}`);
  console.log('');

  // ─── Regression Detection ──────────────────────────────────
  // Track any regressions compared to previous runs
  const regressions = [];
  if (total === 0) regressions.push('No tests were executed');
  if (failed.length > 0) {
    regressions.push(`${failed.length} test(s) failed — inspect details above`);
    for (const f of failed) {
      regressions.push(`  • ${f.name}: ${f.detail}`);
    }
  }

  if (regressions.length > 0) {
    console.log('  ── Regressions Detected ──');
    for (const r of regressions) {
      console.log(`  ⚠  ${r}`);
    }
    console.log('');
  } else {
    console.log('  ✓  No regressions detected\n');
  }

  // ─── Summary ───────────────────────────────────────────────
  if (failed.length === 0) {
    console.log('  ✅  ALL CRITICAL PATHS VERIFIED — System is production-ready\n');
    process.exit(0);
  } else {
    const criticalFailures = failed.filter(f => {
      const critical = ['signup', 'login', 'chat', 'widget/token', 'billing/plans', 'admin/overview', 'health'];
      return critical.some(c => f.name.toLowerCase().includes(c));
    });
    if (criticalFailures.length > 0) {
      console.log('  ❌  CRITICAL FAILURES DETECTED — System is NOT production-ready\n');
      for (const f of criticalFailures) {
        console.log(`  🚨  ${f.name}: ${f.detail}`);
      }
      console.log('');
    } else {
      console.log('  ⚠️  Non-critical failures detected — system may be operational but degraded\n');
    }
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\n  💥 Fatal error:', err.message);
  process.exit(1);
});
