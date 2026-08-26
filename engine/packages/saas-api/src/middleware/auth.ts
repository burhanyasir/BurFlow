import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, verifyApiKey, TenantRepository, WidgetConfigRepository } from '@conversation-engine/saas-core';
import type { ApiKeyRepository } from '@conversation-engine/saas-core';
import { createHmac, timingSafeEqual } from 'crypto';

function verifyTokenWithAlg(token: string, secret: string): JwtPayload | null {
  try {
    return jwt.verify(token, secret, { algorithms: ['HS256'] }) as JwtPayload;
  } catch {
    return null;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      tenantId?: string;
    }
  }
}

const DEV_ONLY_WIDGET_SECRETS = new Set([
  'development-widget-secret-do-not-use-in-production',
  'dev-widget-secret',
  'local-dev-widget-secret-1234567890123456789012345678901234567890',
]);

/**
 * Resolves the configured widget-token secret. Returns null when the secret is
 * missing or (in production) set to a known development value, so verification
 * always fails instead of falling back to a hardcoded secret.
 */
function getWidgetSecret(): string | null {
  const secret = process.env.WIDGET_SECRET;
  if (!secret) return null;
  if (process.env.NODE_ENV === 'production' && DEV_ONLY_WIDGET_SECRETS.has(secret)) {
    return null;
  }
  return secret;
}

function signWidgetToken(encoded: string, secret: string): string {
  return createHmac('sha256', secret).update(encoded).digest('hex');
}

interface WidgetTokenPayload {
  tenantId: string;
  type: 'widget';
  iat: number;
  exp: number;
}

function verifyWidgetToken(token: string, requestOrigin?: string): { tenantId: string } | null {
  const secret = getWidgetSecret();
  if (!secret) return null;
  try {
    const [encoded, sig] = token.split('.');
    if (!sig) return null;
    const expected = signWidgetToken(encoded, secret);
    const sigBuf = Buffer.from(sig, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)) {
      const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as WidgetTokenPayload;
      if (payload.type !== 'widget' || payload.exp < Math.floor(Date.now() / 1000)) return null;
      return { tenantId: payload.tenantId };
    }
    return null;
  } catch {
    return null;
  }
}

export function authMiddleware(secret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

      const token = authHeader.slice(7);
      const payload = verifyTokenWithAlg(token, secret);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = payload;
    req.tenantId = payload.tenantId;
    next();
  };
}

export function publicChatAuth(secret: string, apiKeyRepo?: ApiKeyRepository, tenantRepo?: TenantRepository) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Try JWT Bearer first (admin dashboard users)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const payload = verifyTokenWithAlg(authHeader.slice(7), secret);
      if (payload && payload.tenantId) {
        req.user = payload;
        req.tenantId = payload.tenantId;
        return next();
      }
    }

    // Fall back to widget token (public widget visitors)
    const widgetToken = (req.headers['x-widget-token'] as string) || '';
    if (widgetToken) {
      const origin = req.get('Origin') || req.get('Referer') || undefined;
      const result = verifyWidgetToken(widgetToken, origin);
      if (result) {
        let tenantId = result.tenantId;
        if (tenantRepo) {
          // Resolve slug to UUID if the token carries a slug, not an id
          if (tenantId === 'demo-tenant') {
            const demoTenant = tenantRepo.findBySlug('demo-tenant')
              || tenantRepo.findBySlugLike('%demo%')
              || tenantRepo.findByNameLike('%Demo%');
            if (demoTenant) tenantId = demoTenant.id;
          } else {
            const resolved = tenantRepo.findById(tenantId) || tenantRepo.findBySlug(tenantId);
            if (resolved) tenantId = resolved.id;
          }
        }
        req.tenantId = tenantId;
        return next();
      }
    }

    // Fall back to API key header (demo widget, server-to-server integration)
    const apiKey = (req.headers['x-api-key'] as string) || '';
    if (apiKey && apiKeyRepo) {
      const prefix = apiKey.slice(0, 11);
      try {
        const record = apiKeyRepo.findByPrefix(prefix);
        if (record && verifyApiKey(apiKey, record.keyHash)) {
          apiKeyRepo.updateLastUsed(record.id);
          req.tenantId = record.tenantId;
          return next();
        }
      } catch {
        // DB lookup failure — fall through to 401
      }
    }

    return res.status(401).json({ error: 'Authentication required' });
  };
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!req.user.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function requireTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.tenantId) {
    return res.status(400).json({ error: 'Tenant context required' });
  }
  next();
}

/**
 * Middleware that checks Origin/Referer against the tenant's allowed domains.
 * Enforced on POST /chat and token issuance to prevent unauthenticated LLM spend.
 *
 * Grace period: if the tenant has no widget_config yet (new sign-up before
 * setup wizard completes), allow the request so the widget still works during
 * onboarding. The dashboard shows a setup wizard; the 7-day grace window is
 * handled there.
 */
export function requireAllowedOrigin(widgetConfigRepo: WidgetConfigRepository) {
  return (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.tenantId;
    if (!tenantId) return next();

    try {
      const config = widgetConfigRepo.get(tenantId);
      if (!config || !config.allowedDomains || config.allowedDomains.length === 0) {
        // No domain restriction configured — allow during grace period.
        // Prevents 403 for new tenants whose widget_config hasn't been seeded yet.
        return next();
      }

      const origin = req.get('Origin') || req.get('Referer') || '';
      if (!origin) return next(); // No origin header — allow (server-to-server, curl, etc.)

      const originHost = new URL(origin).hostname;
      const allowed = config.allowedDomains.some((d: string) => {
        if (d.startsWith('*.')) return originHost.endsWith(d.slice(1));
        return originHost === d;
      });

      if (!allowed) {
        return res.status(403).json({ error: 'Domain not allowed' });
      }
      next();
    } catch {
      // Fail open on errors — the request already passed publicChatAuth,
      // so the tenant is authenticated. Domain check is defense-in-depth.
      return next();
    }
  };
}
