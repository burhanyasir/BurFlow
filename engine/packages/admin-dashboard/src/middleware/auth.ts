import { Request, Response, NextFunction } from 'express';

// This module provides lightweight wrappers around existing auth utilities when available.
// It prefers to reuse the saas-api auth middleware (which implements JWT verification,
// requireRole, and tenant resolution). If not present, it exposes conservative fallbacks
// suitable for development and for tests. All fallbacks are intentionally strict.

type MiddlewareFn = (req: Request, res: Response, next: NextFunction) => void;

function tryRequireSaasAuth() {
  try {
    // relative to admin-dashboard/src -> engine/packages/saas-api/src/middleware/auth.ts
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../../saas-api/src/middleware/auth');
    return mod;
  } catch (e) {
    return null;
  }
}

const saasAuth = tryRequireSaasAuth();

// Fallback simple authenticate: expects Authorization: Bearer <token>
// Token payload format (development): base64url of JSON { sub, role, tenantId }
function simpleDevAuthenticate(secret = 'dev') {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = (req.headers.authorization || '') as string;
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
    const token = auth.slice(7).trim();
    try {
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[0] || token, 'base64url').toString());
      req.user = payload;
      // tenantId is authoritative only when provided by trusted token
      if (payload.tenantId) req.tenantId = payload.tenantId;
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token format' });
    }
  };
}

export function authenticate() : MiddlewareFn {
  if (saasAuth && typeof saasAuth.authMiddleware === 'function') {
    const secret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET must be set — refusing to start with a fallback secret');
    }
    return saasAuth.authMiddleware(secret);
  }
  return simpleDevAuthenticate();
}

export function requireTenant(req: Request, res: Response, next: NextFunction) {
  if (saasAuth && typeof saasAuth.requireTenant === 'function') return saasAuth.requireTenant(req, res, next);
  if (!req.tenantId) return res.status(400).json({ error: 'Tenant context required' });
  return next();
}

export function requireRole(...roles: string[]) {
  // returns middleware
  if (saasAuth && typeof saasAuth.requireRole === 'function') return saasAuth.requireRole(...roles);
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const role = (req.user as any).role || '';
    if (!roles.includes(role)) return res.status(403).json({ error: 'Insufficient permissions' });
    return next();
  };
}

// permission matrix maps roles to allowed permission strings
const permissionMatrix: Record<string, string[]> = {
  super_admin: ['*'],
  owner: ['dashboard.view','analytics.view','conversations.view','knowledge.view','widget.manage','billing.view','apikey.manage','team.manage','settings.manage','audit.view'],
  admin: ['dashboard.view','analytics.view','conversations.view','knowledge.view','widget.manage','apikey.manage','team.manage','settings.manage'],
  manager: ['dashboard.view','analytics.view','conversations.view','knowledge.view','widget.manage'],
  agent: ['conversations.view','knowledge.view','widget.view'],
  viewer: ['dashboard.view','analytics.view','conversations.view'],
};

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const role = (req.user as any).role || '';
    const allowed = permissionMatrix[role] || [];
    if (allowed.includes('*') || allowed.includes(permission)) return next();
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}

// Audit hook - uses existing logger audit when available
export function auditAction(event: string, details?: Record<string, any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // try to use the centralized logger
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const loggerMod = require('../../logger/src/index');
      if (loggerMod && typeof loggerMod.createContextLogger === 'function' && typeof loggerMod.logAuditEvent === 'function') {
        const base = loggerMod.createContextLogger(loggerMod.createLogger('admin-dashboard:audit'));
        loggerMod.logAuditEvent(base, { event, success: true, userId: (req.user as any)?.sub, tenantId: req.tenantId, detail: details || {} });
      }
    } catch (e) {
      // best-effort, ignore
    }
    return next();
  };
}

// Simple rate limit placeholder (per-route, in-memory) - very small and conservative
const rateWindows: Record<string, { count: number; resetAt: number }> = {};
export function rateLimit(keyPrefix = 'rl', limit = 60, windowSec = 60) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = `${keyPrefix}:${(req.user as any)?.sub || req.ip}`;
      const now = Date.now();
      const win = rateWindows[key] || { count: 0, resetAt: now + windowSec * 1000 };
      if (now > win.resetAt) { win.count = 0; win.resetAt = now + windowSec * 1000; }
      win.count += 1;
      rateWindows[key] = win;
      if (win.count > limit) return res.status(429).json({ error: 'Rate limit exceeded' });
    } catch (e) {
      // ignore rate limiter failure and allow request
    }
    return next();
  };
}

export { permissionMatrix };
