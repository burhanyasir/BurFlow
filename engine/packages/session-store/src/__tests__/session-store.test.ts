import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SqliteSessionStore } from '../index';
import { unlinkSync, existsSync } from 'fs';

const TEST_DB = '__test_session_store.db';

describe('SqliteSessionStore', () => {
  let store: SqliteSessionStore;

  beforeAll(() => {
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
    store = new SqliteSessionStore(TEST_DB);
  });

  afterAll(() => {
    store.close();
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  });

  it('creates a session', async () => {
    const session = await store.createSession('tenant-a', 1);
    expect(session.sessionId).toBeTruthy();
    expect(session.tenantId).toBe('tenant-a');
    expect(session.version).toBe(1);
    expect(session.configVersion).toBe(1);
    expect(session.sequenceCounter).toBe(0);
  });

  it('loads an existing session', async () => {
    const created = await store.createSession('tenant-a', 1);
    const loaded = await store.loadSession('tenant-a', created.sessionId);
    expect(loaded).not.toBeNull();
    expect(loaded!.sessionId).toBe(created.sessionId);
    expect(loaded!.version).toBe(1);
  });

  it('returns null for non-existent session', async () => {
    const loaded = await store.loadSession('tenant-a', 'nonexistent');
    expect(loaded).toBeNull();
  });

  it('commits a session with CAS check', async () => {
    const session = await store.createSession('tenant-b', 2);
    const result = await store.commitSession('tenant-b', session.sessionId, 1, { state: JSON.stringify({ booked: true }) });
    expect(result.success).toBe(true);
    expect(result.newVersion).toBe(2);
    const reloaded = await store.loadSession('tenant-b', session.sessionId);
    expect(reloaded!.version).toBe(2);
    expect(JSON.parse(reloaded!.state)).toEqual({ booked: true });
  });

  it('fails CAS commit on version conflict', async () => {
    const session = await store.createSession('tenant-c', 1);
    await store.commitSession('tenant-c', session.sessionId, 1, { state: '{"first": true}' });
    const result = await store.commitSession('tenant-c', session.sessionId, 1, { state: '{"second": true}' });
    expect(result.success).toBe(false);
  });

  it('increments sequence counter', async () => {
    const session = await store.createSession('tenant-d', 1);
    const seq1 = await store.incrementSequence('tenant-d', session.sessionId);
    expect(seq1).toBe(1);
    const seq2 = await store.incrementSequence('tenant-d', session.sessionId);
    expect(seq2).toBe(2);
  });

  it('reports healthy status', async () => {
    const health = await store.health();
    expect(health.status).toBe('healthy');
  });

  it('M-01: busy_timeout pragma is set', () => {
    const timeout = (store as any).db.pragma('busy_timeout', { simple: true });
    expect(timeout).toBe(5000);
  });

  it('M-02: commitSession returns sequenceCounter atomically', async () => {
    const session = await store.createSession('tenant-atomic', 1);
    const result = await store.commitSession('tenant-atomic', session.sessionId, 1, {});
    expect(result.success).toBe(true);
    expect(result.sequenceCounter).toBe(1);
    const result2 = await store.commitSession('tenant-atomic', session.sessionId, 2, {});
    expect(result2.sequenceCounter).toBe(2);
  });
});
