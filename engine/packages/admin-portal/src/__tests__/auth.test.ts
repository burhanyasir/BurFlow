import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAuth, setAuth, clearAuth, isAuthenticated, hasRole,
  canAccessAdmin, canManageKnowledge, canViewConversations,
  parseJwtPayload, loginFromToken, onAuthChange,
} from '../core/auth';

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

describe('auth', () => {
  beforeEach(() => { clearAuth(); });

  it('starts unauthenticated', () => {
    expect(isAuthenticated()).toBe(false);
    expect(getAuth()).toEqual({ userId: null, email: null, name: null, role: null, tenantId: null, token: null });
  });

  it('setAuth merges state', () => {
    setAuth({ userId: 'u1', email: 'a@b.com', role: 'admin', tenantId: 't1', token: 'tok' });
    expect(isAuthenticated()).toBe(true);
    const a = getAuth();
    expect(a.userId).toBe('u1');
    expect(a.email).toBe('a@b.com');
    expect(a.role).toBe('admin');
    expect(a.tenantId).toBe('t1');
  });

  it('clearAuth resets everything', () => {
    setAuth({ userId: 'u1', token: 'tok' });
    clearAuth();
    expect(isAuthenticated()).toBe(false);
    expect(getAuth().userId).toBeNull();
  });

  it('hasRole checks auth role', () => {
    expect(hasRole('admin')).toBe(false);
    setAuth({ userId: 'u1', token: 'tok', role: 'admin' });
    expect(hasRole('admin')).toBe(true);
    expect(hasRole('owner')).toBe(false);
  });

  it('canAccessAdmin for owner and admin', () => {
    setAuth({ userId: 'u1', token: 'tok', role: 'owner' });
    expect(canAccessAdmin()).toBe(true);
    setAuth({ role: 'admin' });
    expect(canAccessAdmin()).toBe(true);
    setAuth({ role: 'member' });
    expect(canAccessAdmin()).toBe(false);
  });

  it('canManageKnowledge for owner/admin/operator', () => {
    setAuth({ userId: 'u1', token: 'tok', role: 'operator' });
    expect(canManageKnowledge()).toBe(true);
    setAuth({ role: 'viewer' });
    expect(canManageKnowledge()).toBe(false);
  });

  it('canViewConversations for owner/admin/operator/member', () => {
    for (const role of ['owner', 'admin', 'operator', 'member']) {
      setAuth({ userId: 'u1', token: 'tok', role: role as any });
      expect(canViewConversations()).toBe(true);
    }
    setAuth({ userId: 'u1', token: 'tok', role: 'viewer' });
    expect(canViewConversations()).toBe(false);
  });

  it('parseJwtPayload decodes valid token', () => {
    const token = makeJwt({ sub: 'u1', email: 'a@b.com', name: 'Alice', role: 'admin', tenantId: 't1' });
    const payload = parseJwtPayload(token);
    expect(payload.userId).toBe('u1');
    expect(payload.email).toBe('a@b.com');
    expect(payload.name).toBe('Alice');
    expect(payload.role).toBe('admin');
    expect(payload.tenantId).toBe('t1');
    expect(payload.token).toBe(token);
  });

  it('parseJwtPayload returns empty on invalid token', () => {
    expect(parseJwtPayload('not-valid')).toEqual({});
  });

  it('loginFromToken sets auth from JWT', () => {
    const token = makeJwt({ sub: 'u1', email: 'a@b.com', role: 'admin', tenantId: 't1' });
    loginFromToken(token);
    expect(isAuthenticated()).toBe(true);
    expect(getAuth().role).toBe('admin');
  });

  it('onAuthChange notifies on changes', () => {
    const calls: number[] = [];
    const unsub = onAuthChange(() => calls.push(1));
    setAuth({ userId: 'u1' });
    setAuth({ role: 'admin' });
    clearAuth();
    unsub();
    setAuth({ userId: 'u2' });
    expect(calls).toEqual([1, 1, 1]);
  });

  it('onAuthChange unsub works', () => {
    let count = 0;
    const unsub = onAuthChange(() => count++);
    setAuth({ userId: 'u1' });
    expect(count).toBe(1);
    unsub();
    setAuth({ userId: 'u2' });
    expect(count).toBe(1);
  });
});
