import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SqliteDedupStore } from '../index';
import { unlinkSync, existsSync } from 'fs';

const TEST_DB = '__test_dedup_store.db';

describe('SqliteDedupStore', () => {
  let store: SqliteDedupStore;

  beforeAll(() => {
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
    store = new SqliteDedupStore(TEST_DB);
  });

  afterAll(() => {
    store.close();
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  });

  it('returns not duplicate for new message', async () => {
    const result = await store.checkAndSet('tenant-a', 'msg-001', 300);
    expect(result.isDuplicate).toBe(false);
  });

  it('returns duplicate for repeated message', async () => {
    const result = await store.checkAndSet('tenant-a', 'msg-001', 300);
    expect(result.isDuplicate).toBe(true);
    expect(result.existing).toBeDefined();
  });

  it('treats same messageId in different tenants as different', async () => {
    await store.checkAndSet('tenant-a', 'msg-002', 300);
    const result = await store.checkAndSet('tenant-b', 'msg-002', 300);
    expect(result.isDuplicate).toBe(false);
  });

  it('returns null for non-existent entry', async () => {
    const entry = await store.get('tenant-a', 'nonexistent');
    expect(entry).toBeNull();
  });

  it('respects TTL expiry', async () => {
    // Set with 1 second TTL
    await store.checkAndSet('tenant-c', 'msg-expire', 1);
    // Immediately verify it's a duplicate
    const dupResult = await store.checkAndSet('tenant-c', 'msg-expire', 1);
    expect(dupResult.isDuplicate).toBe(true);
    // Wait for expiry
    await new Promise(r => setTimeout(r, 1100));
    // After expiry, should not be a duplicate
    const expiredResult = await store.checkAndSet('tenant-c', 'msg-expire', 1);
    expect(expiredResult.isDuplicate).toBe(false);
  }, 5000);

  it('M-01: busy_timeout pragma is set', () => {
    const timeout = (store as any).db.pragma('busy_timeout', { simple: true });
    expect(timeout).toBe(5000);
  });

  it('M-03: checkAndSet DELETE+INSERT is atomic', async () => {
    // Insert an entry, then check that expired entry is cleaned up atomically
    await store.checkAndSet('tenant-atomic', 'msg-atomic', 1);
    // Wait for expiry
    await new Promise(r => setTimeout(r, 1100));
    // New insert should succeed (expired entry cleaned up atomically)
    const result = await store.checkAndSet('tenant-atomic', 'msg-atomic', 300);
    expect(result.isDuplicate).toBe(false);
  }, 5000);

  describe('input validation', () => {
    it('S6: rejects empty tenantId', async () => {
      await expect(store.checkAndSet('', 'msg', 300)).rejects.toThrow('tenantId must be a non-empty string');
    });

    it('S6: rejects null tenantId', async () => {
      await expect(store.checkAndSet(null as any, 'msg', 300)).rejects.toThrow('tenantId must be a non-empty string');
    });

    it('S6: rejects empty messageId', async () => {
      await expect(store.checkAndSet('tenant-d', '', 300)).rejects.toThrow('messageId must be a non-empty string');
    });

    it('S6: rejects negative ttlSeconds', async () => {
      await expect(store.checkAndSet('tenant-d', 'msg', -1)).rejects.toThrow('ttlSeconds must be a positive number');
    });

    it('S6: rejects zero ttlSeconds', async () => {
      await expect(store.checkAndSet('tenant-d', 'msg', 0)).rejects.toThrow('ttlSeconds must be a positive number');
    });

    it('S6: rejects NaN ttlSeconds', async () => {
      await expect(store.checkAndSet('tenant-d', 'msg', NaN)).rejects.toThrow('ttlSeconds must be a positive number');
    });

    it('S6: rejects Infinity ttlSeconds', async () => {
      await expect(store.checkAndSet('tenant-d', 'msg', Infinity)).rejects.toThrow('ttlSeconds must be a positive number');
    });

    it('S6: validates in markProcessed too', async () => {
      await expect(store.markProcessed('', 'msg', 1)).rejects.toThrow('tenantId must be a non-empty string');
      await expect(store.markProcessed('tenant-d', '', 1)).rejects.toThrow('messageId must be a non-empty string');
    });

    it('S6: validates in get too', async () => {
      await expect(store.get('', 'msg')).rejects.toThrow('tenantId must be a non-empty string');
      await expect(store.get('tenant-d', '')).rejects.toThrow('messageId must be a non-empty string');
    });
  });

  describe('TTL comparison (S6)', () => {
    it('F7: get() does not return expired entries', async () => {
      await store.checkAndSet('tenant-ttl', 'msg-exp-get', 1);
      const beforeExpiry = await store.get('tenant-ttl', 'msg-exp-get');
      expect(beforeExpiry).not.toBeNull();
      await new Promise(r => setTimeout(r, 1100));
      const afterExpiry = await store.get('tenant-ttl', 'msg-exp-get');
      expect(afterExpiry).toBeNull();
    }, 5000);

    it('TTL comparison uses numeric ms values', async () => {
      await store.checkAndSet('tenant-ttl', 'msg-num', 300);
      const entry = await store.get('tenant-ttl', 'msg-num');
      expect(entry).not.toBeNull();
      expect(typeof entry!.createdAt).toBe('number');
      expect(typeof entry!.expiresAt).toBe('number');
      expect(entry!.expiresAt - entry!.createdAt).toBe(300 * 1000);
    });
  });

  describe('markProcessed', () => {
    it('marks entry as processed and increments version', async () => {
      await store.checkAndSet('tenant-e', 'msg-proc', 300);
      const result = await store.markProcessed('tenant-e', 'msg-proc', 1);
      expect(result.success).toBe(true);
      const entry = await store.get('tenant-e', 'msg-proc');
      expect(entry).not.toBeNull();
      expect(entry!.dedupVersion).toBe(2);
    });

    it('returns success=false when version mismatch', async () => {
      const result = await store.markProcessed('tenant-e', 'msg-proc', 1);
      expect(result.success).toBe(false);
    });
  });

  describe('close + cleanup', () => {
    it('close() stops the cleanup timer', async () => {
      const store2 = new SqliteDedupStore('__test_dedup_store2.db');
      const timer = (store2 as any).cleanupTimer;
      expect(timer).toBeDefined();
      store2.close();
      expect((store2 as any).cleanupTimer._destroyed).toBe(true);
    });

    afterAll(() => {
      try { unlinkSync('__test_dedup_store2.db'); } catch { /* ignore */ }
    });
  });

  describe('path traversal prevention', () => {
    it('rejects tenantId with dotdot', async () => {
      await expect(store.checkAndSet('../evil', 'msg', 300)).rejects.toThrow('Invalid tenantId');
    });

    it('rejects tenantId with slash', async () => {
      await expect(store.checkAndSet('evil/tenant', 'msg', 300)).rejects.toThrow('Invalid tenantId');
    });
  });
});
