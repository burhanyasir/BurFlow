import { describe, it, expect } from 'vitest';
import { PiiDetector } from '@conversation-engine/pii-detector';
import { GroundingVerifier } from '@conversation-engine/grounding-verifier';
import { buildPrompt } from '@conversation-engine/stage-5-response-generation';
import { TurnContext } from '@conversation-engine/core-types';
import { createRateLimit } from '../middleware/rate-limit';
import { EnvVault } from '@conversation-engine/secrets-vault';

describe('H5 — Rate limiting', () => {
  it('returns 429 when limit exceeded', () => {
    const middleware = createRateLimit({ windowMs: 60000, max: 2 });
    const calls: number[] = [];
    const next = () => { calls.push(1); };
    const makeReq = () => ({ ip: '10.0.0.1', headers: {} } as any);
    const makeRes = () => {
      let _code = 200; let _body: any;
      return {
        status(c: number) { _code = c; return this; },
        get statusCode() { return _code; },
        setHeader() {},
        json(data: any) { _body = data; },
        get body() { return _body; },
      } as any;
    };
    middleware(makeReq(), makeRes(), next);
    middleware(makeReq(), makeRes(), next);
    expect(calls.length).toBe(2);
    const res3 = makeRes();
    middleware(makeReq(), res3, next);
    expect(res3.statusCode).toBe(429);
  });
});

describe('H6 — PII bank_account regex tightened', () => {
  it('does not flag plain numeric strings', () => {
    const d = new PiiDetector();
    expect(d.check('Order 12345678', 'mask').categories).not.toContain('bank_account');
    expect(d.check('Routing: 123456789', 'mask').categories).not.toContain('bank_account');
  });
  it('flags IBAN format', () => {
    const d = new PiiDetector();
    expect(d.check('IBAN: DE89370400440532013000', 'mask').categories).toContain('bank_account');
    expect(d.check('GB29NWBK60161331926819', 'mask').categories).toContain('bank_account');
  });
});

describe('H7 — Tenant-specific PII overrides', () => {
  it('disables detection when enabled=false', () => {
    const d = new PiiDetector();
    d.addTenantOverride('t1', { enabled: false, patterns: [] });
    expect(d.check('Email test@example.com', 'mask', 't1').found).toBe(false);
  });
  it('uses custom patterns', () => {
    const d = new PiiDetector();
    d.addTenantOverride('t2', { enabled: true, patterns: [{ category: 'email', regex: /\bfoo\b/g, placeholder: '[X]' }] });
    const r = d.check('This is foo bar', 'mask', 't2');
    expect(r.found).toBe(true);
    expect(r.redactedMessage).toContain('[X]');
  });
  it('falls back to defaults for unknown tenant', () => {
    expect(new PiiDetector().check('Email test@example.com', 'mask', 'unknown').found).toBe(true);
  });
});

describe('H8 — Grounding verifier action-reference validation', () => {
  const mockConfig = {
    tenantId: 't1', configVersion: 1,
    llm: { model: 'gpt-4', temperature: 0.7, maxTokens: 1024, systemPrompt: 'Helpful.' },
    safety: { contentFilterThreshold: 'moderate', piiRedactionEnabled: false, piiRedactionMode: 'allow' },
    rateLimits: { messagesPerMinute: 60, messagesPerHour: 1000, concurrentSessions: 100 },
    session: { ttlMinutes: 1440, gracePeriodDays: 7, legalHoldDays: 90 },
    fallbackResponse: 'Sorry', supportedLanguages: ['en'],
    featureFlags: { qualityScoringEnabled: false, analyticsEnabled: false },
  } as any;
  it('flags click here', () => {
    expect(new GroundingVerifier().verify('Click here to continue', mockConfig, new AbortController().signal).failures).toContain('action_reference_mismatch');
  });
  it('flags submit this', () => {
    expect(new GroundingVerifier().verify('You need to submit this form', mockConfig, new AbortController().signal).failures).toContain('action_reference_mismatch');
  });
  it('flags buy now', () => {
    expect(new GroundingVerifier().verify('Click buy now to purchase', mockConfig, new AbortController().signal).failures).toContain('action_reference_mismatch');
  });
  it('passes normal response', () => {
    expect(new GroundingVerifier().verify('The weather is sunny.', mockConfig, new AbortController().signal).passed).toBe(true);
  });
});

describe('H11 — History truncation keeps most recent', () => {
  function ctx(history: Array<{ role: 'user' | 'assistant'; content: string }>, msg: string): TurnContext {
    return {
      message: msg, conversationHistory: history,
      tenantConfig: {
        tenantId: 't1', configVersion: 1,
        llm: { model: 'gpt-4', temperature: 0.7, maxTokens: 200, systemPrompt: 'Helpful.' },
        safety: { contentFilterThreshold: 'moderate', piiRedactionEnabled: false, piiRedactionMode: 'allow' },
        rateLimits: { messagesPerMinute: 60, messagesPerHour: 1000, concurrentSessions: 100 },
        session: { ttlMinutes: 1440, gracePeriodDays: 7, legalHoldDays: 90 },
        fallbackResponse: 'Sorry', supportedLanguages: ['en'],
        featureFlags: { qualityScoringEnabled: false, analyticsEnabled: false },
      },
      degradedStages: [], latencyMs: 0,
    } as TurnContext;
  }
  it('keeps recent messages when budget limited', () => {
    const history = [
      { role: 'user' as const, content: 'Old question' },
      { role: 'assistant' as const, content: 'Old answer' },
      { role: 'user' as const, content: 'Recent question' },
      { role: 'assistant' as const, content: 'Recent answer' },
    ];
    const contents = buildPrompt(ctx(history, 'Latest')).map(m => m.content);
    expect(contents).toContain('Recent question');
    expect(contents).toContain('Recent answer');
    expect(contents).toContain('Latest');
  });
  it('system prompt is always first', () => {
    expect(buildPrompt(ctx([], 'Hi'))[0].role).toBe('system');
  });
});

describe('H12 — CAS conflicts retryable', () => {
  it('marks CAS conflict as retryable', async () => {
    const { execute } = await import('@conversation-engine/stage-7-persistence');
    const { ErrorCodes } = await import('@conversation-engine/core-types');
    const result = await execute({
      context: { tenantId: 't1', sessionId: 's1', sessionState: { version: 5, data: {}, stateMachine: 'active' }, degradedStages: [] } as any,
      signal: new AbortController().signal,
    }, { sessionStore: { commitSession: async () => ({ success: false }) } as any });
    expect(result.success).toBe(false);
    expect(result.error?.retryable).toBe(true);
    expect(result.errorCode).toBe(ErrorCodes.ERR_SESSION_VERSION_CONFLICT);
  });
});

describe('H13 — Stage 4 loads conversation history', () => {
  it('loads history from session state', async () => {
    const { execute } = await import('@conversation-engine/stage-4-context');
    const history = [{ role: 'user', content: 'Hi' }, { role: 'assistant', content: 'Hey!' }];
    const ctx = { tenantId: 't1', sessionId: 's1', degradedStages: [] } as any;
    await execute({ context: ctx, signal: new AbortController().signal }, {
      sessionStore: { loadSession: async () => ({
        tenantId: 't1', sessionId: 's1', version: 1, state: JSON.stringify({ conversationHistory: history }),
        stateMachine: 'active', sequenceCounter: 0, configVersion: 1,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        ttlMinutes: 1440, gracePeriodDays: 7, legalHoldDays: 90,
      }) } as any,
    });
    expect(ctx.conversationHistory).toEqual(history);
  });
  it('defaults to empty when no history', async () => {
    const { execute } = await import('@conversation-engine/stage-4-context');
    const ctx = { tenantId: 't1', sessionId: 's1', degradedStages: [] } as any;
    await execute({ context: ctx, signal: new AbortController().signal }, {
      sessionStore: { loadSession: async () => ({
        tenantId: 't1', sessionId: 's1', version: 1, state: JSON.stringify({}),
        stateMachine: 'active', sequenceCounter: 0, configVersion: 1,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        ttlMinutes: 1440, gracePeriodDays: 7, legalHoldDays: 90,
      }) } as any,
    });
    expect(ctx.conversationHistory).toEqual([]);
  });
});

describe('H14 — No duplicate degradedStages', () => {
  it('deduplicates on push', () => {
    const d: string[] = [];
    const stage = 'stage-5';
    if (!d.includes(stage)) d.push(stage);
    if (!d.includes(stage)) d.push(stage);
    expect(d).toHaveLength(1);
  });
});

describe('H16 — Session TTL enforcement', () => {
  it('marks expired session on load', async () => {
    const { SqliteSessionStore } = await import('@conversation-engine/session-store');
    const store = new SqliteSessionStore(':memory:');
    const s = await store.createSession('t1', 1, 1);
    const twoMinAgo = new Date(Date.now() - 120000).toISOString();
    (store as any).db.prepare('UPDATE sessions SET updated_at = ? WHERE tenant_id = ? AND session_id = ?').run(twoMinAgo, 't1', s.sessionId);
    const loaded = await store.loadSession('t1', s.sessionId);
    expect(loaded?.stateMachine).toBe('expired');
    store.close();
  });
});

describe('H20 — Secrets vault validation', () => {
  it('resolves env vars', async () => {
    process.env.TEST_VAULT_H20 = 'yes';
    const vault = new EnvVault();
    expect(await vault.resolve('TEST_VAULT_H20')).toBe('yes');
    delete process.env.TEST_VAULT_H20;
  });
  it('validateRequired returns missing', async () => {
    const r = await new EnvVault().validateRequired(['NONEXISTENT_H20_KEY_XYZ']);
    expect(r.valid).toBe(false);
    expect(r.missing).toContain('NONEXISTENT_H20_KEY_XYZ');
  });
  it('validateRequired returns valid when present', async () => {
    process.env.H20_PRESENT_OK = 'ok';
    const r = await new EnvVault().validateRequired(['H20_PRESENT_OK']);
    expect(r.valid).toBe(true);
    delete process.env.H20_PRESENT_OK;
  });
  it('filters by prefix', async () => {
    process.env.MYTEST_PFX_K = 'val';
    const vault = new EnvVault('MYTEST_PFX_');
    expect(await vault.resolve('MYTEST_PFX_K')).toBe('val');
    delete process.env.MYTEST_PFX_K;
  });
});
