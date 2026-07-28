import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execute } from '../index';
import { SqliteSessionStore } from '@conversation-engine/session-store';
import { TurnContext } from '@conversation-engine/core-types';
import { unlinkSync, existsSync } from 'fs';

const TEST_DB = '__test_stage7.db';

describe('stage-7-persistence', () => {
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
    return {
      message: 'hi', pipelineStartTime: Date.now(), degradedStages: [], latencyMs: 0,
      tenantId: 't1', sessionId, configVersion: 1,
      sessionState: { sessionId, version: 1, stateMachine: 'awaiting_input', data: { booked: true }, sequenceCounter: 1, configVersion: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ...overrides,
    };
  }

  it('commits session successfully', async () => {
    const ctx = makeContext();
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { sessionStore: store });
    expect(result.success).toBe(true);
    expect(ctx.sessionCommitSucceeded).toBe(true);
    expect(ctx.sessionState!.version).toBe(2);
  });

  it('fails on CAS version conflict', async () => {
    const ctx = makeContext();
    ctx.sessionState!.version = 1; // Stale version — already committed to 2
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { sessionStore: store });
    expect(result.success).toBe(false);
  });
});
