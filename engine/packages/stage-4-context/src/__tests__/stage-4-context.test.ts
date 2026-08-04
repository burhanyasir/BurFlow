import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execute } from '../index';
import { SqliteSessionStore } from '@conversation-engine/session-store';
import { TurnContext } from '@conversation-engine/core-types';
import { unlinkSync, existsSync } from 'fs';

const TEST_DB = '__test_stage4.db';

describe('stage-4-context', () => {
  let store: SqliteSessionStore;
  let sessionId: string;

  beforeAll(async () => {
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
    store = new SqliteSessionStore(TEST_DB);
    const session = await store.createSession('t1', 1);
    sessionId = session.sessionId;
  });

  afterAll(() => {
    store.close();
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  });

  function makeContext(overrides: Partial<TurnContext> = {}): TurnContext {
    return { message: 'hi', pipelineStartTime: Date.now(), degradedStages: [], latencyMs: 0, ...overrides };
  }

  it('loads existing session', async () => {
    const ctx = makeContext({ tenantId: 't1', sessionId });
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { sessionStore: store });
    expect(result.success).toBe(true);
    expect(ctx.sessionState).toBeDefined();
    expect(ctx.sessionState!.sessionId).toBe(sessionId);
    expect(ctx.sessionState!.version).toBe(1);
  });

  it('creates a session for a valid client-generated sessionId when none exists', async () => {
    const clientSessionId = 'session_12345abcde';
    const ctx = makeContext({ tenantId: 't1', sessionId: clientSessionId });
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { sessionStore: store });
    expect(result.success).toBe(true);
    expect(ctx.sessionState).toBeDefined();
    expect(ctx.sessionState!.sessionId).toBe(clientSessionId);
    expect(ctx.sessionState!.version).toBe(1);
  });

  it('rejects malformed session ids without creating a session', async () => {
    const ctx = makeContext({ tenantId: 't1', sessionId: 'bad/session' });
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { sessionStore: store });
    expect(result.success).toBe(false);
  });

  it('fails without sessionId', async () => {
    const ctx = makeContext({ tenantId: 't1', sessionId: undefined });
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { sessionStore: store });
    expect(result.success).toBe(false);
  });
});
