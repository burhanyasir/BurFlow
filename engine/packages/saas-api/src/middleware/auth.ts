import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, verifyApiKey, TenantRepository } from '@conversation-engine/saas-core';
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

const WIDGET_SECRET: string = process.env.WIDGET_SECRET || 'development-widget-secret-do-not-use-in-production';

function signWidgetToken(encoded: string): string {
  return createHmac('sha256', WIDGET_SECRET).update(encoded).digest('hex');
}

interface WidgetTokenPayload {
  tenantId: string;
  type: 'widget';
  iat: number;
  exp: number;
}

function verifyWidgetToken(token: string): { tenantId: string } | null {
  try {
    const [encoded, sig] = token.split('.');
    if (!sig) return null;
    const expected = signWidgetToken(encoded);
    const sigBuf = Buffer.from(sig, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as WidgetTokenPayload;
    if (payload.type !== 'widget' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { tenantId: payload.tenantId };
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
      const result = verifyWidgetToken(widgetToken);
      if (result) {
        let tenantId = result.tenantId;
        if (tenantId === 'demo-tenant' && tenantRepo) {
          const demoTenant = tenantRepo.findBySlug('demo-tenant')
            || tenantRepo.findBySlugLike('%demo%')
            || tenantRepo.findByNameLike('%Demo%');
          if (demoTenant) {
            tenantId = demoTenant.id;
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
