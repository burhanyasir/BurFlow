import { describe, it, expect } from 'vitest';
import { requirePermission, requireRole, permissionMatrix } from '../middleware/auth';

function runMiddleware(mw: any, req: any = {}, res: any = {}, next: any = () => {}) {
  const r = { status: (code: number) => ({ json: (obj:any) => { r._res = { code, obj }; return r; } }), json: (obj:any) => { r._res = { obj }; return r; }, _res: null } as any;
  const rr = mw(req, r, next);
  return r._res || null;
}

describe('auth middleware (unit)', () => {
  it('permissionMatrix contains owner role', () => {
    expect(permissionMatrix.owner).toBeTruthy();
  });

  it('requirePermission denies when not authenticated', () => {
    const mw = requirePermission('dashboard.view');
    const res = runMiddleware(mw, {}, {});
    expect(res).toBeTruthy();
    expect(res.obj).toHaveProperty('error');
  });

  it('requirePermission allows when role has permission', () => {
    const mw = requirePermission('dashboard.view');
    let called = false;
    const req: any = { user: { role: 'owner' } };
    mw(req, {}, () => { called = true; });
    expect(called).toBe(true);
  });

  it('requireRole denies missing role', () => {
    const mw = requireRole('owner');
    const res = runMiddleware(mw, {}, {});
    expect(res).toBeTruthy();
  });

  it('requireRole allows correct role', () => {
    const mw = requireRole('owner');
    let called = false;
    const req: any = { user: { role: 'owner' } };
    mw(req, {}, () => { called = true; });
    expect(called).toBe(true);
  });
});
