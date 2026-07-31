import { Router, Request, Response } from 'express';
import { WidgetConfigRepository } from '@conversation-engine/saas-core';
import jwt from 'jsonwebtoken';
import { createLogger, createContextLogger } from '@conversation-engine/logger';
import { requireJsonObject, validateRequiredString, validationError, LABEL_MAX } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { createHmac, timingSafeEqual } from 'crypto';

const logger = createLogger('saas-api:widget');

interface WidgetTokenPayload {
  tenantId: string;
  type: 'widget';
  iat: number;
  exp: number;
}

const WIDGET_SECRET: string = process.env.WIDGET_SECRET ?? 'development-widget-secret-do-not-use-in-production';

function signWidgetToken(encoded: string): string {
  return createHmac('sha256', WIDGET_SECRET).update(encoded).digest('hex');
}

export function createWidgetRoutes(widgetConfigRepo: WidgetConfigRepository, jwtSecret?: string): Router {
  const router = Router();
  const widgetAuth = jwtSecret ? authMiddleware(jwtSecret) : undefined;

  function generateWidgetToken(tenantId: string): string {
    const payload: WidgetTokenPayload = {
      tenantId,
      type: 'widget',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = signWidgetToken(encoded);
    return `${encoded}.${sig}`;
  }

  function verifyWidgetToken(token: string): { tenantId: string } | null {
    try {
      const [encoded, sig] = token.split('.');
      if (!sig) return null;
      const expected = signWidgetToken(encoded);
      const sigBuf = Buffer.from(sig, 'hex');
      const expectedBuf = Buffer.from(expected, 'hex');
      if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
        return null;
      }
      const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as WidgetTokenPayload;
      if (payload.type !== 'widget' || payload.exp < Math.floor(Date.now() / 1000)) return null;
      return { tenantId: payload.tenantId };
    } catch {
      return null;
    }
  }

  function tryJwtAuth(req: Request): string | null {
    if (!jwtSecret) return null;
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return null;
    const payload = (() => { try { return jwt.verify(header.slice(7), jwtSecret, { algorithms: ['HS256'] }) as any; } catch { return null; } })();
    if (!payload || !payload.tenantId) return null;
    req.user = payload;
    req.tenantId = payload.tenantId;
    return payload.tenantId;
  }

  router.post('/token', widgetAuth || ((_req, _res, next) => next()), requireJsonObject, (req: Request, res: Response) => {
    try {
      const allowed = ['admin', 'owner'];
      if (!req.user?.role || !allowed.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const token = generateWidgetToken(req.tenantId!);
      res.json({
        token,
        expiresIn: 86400,
        tenantId: req.tenantId,
      });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Widget token generation failed');
      res.status(500).json({ error: 'Failed to generate widget token' });
    }
  });

  router.post('/verify', requireJsonObject, (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Token is required' });
      }
      const payload = verifyWidgetToken(token);
      if (!payload) {
        return res.status(401).json({ error: 'Invalid or expired widget token' });
      }
      const config = widgetConfigRepo.get(payload.tenantId);
      res.json({ valid: true, tenantId: payload.tenantId, config });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Widget token verification failed');
      res.status(500).json({ error: 'Failed to verify widget token' });
    }
  });

  router.get('/config', (req: Request, res: Response) => {
    try {
      let tenantId: string | null = tryJwtAuth(req);
      if (!tenantId) {
        const token = req.query.token as string;
        if (!token) {
          return res.status(400).json({ error: 'Widget token required' });
        }
        const payload = verifyWidgetToken(token);
        if (!payload) {
          return res.status(401).json({ error: 'Invalid or expired widget token' });
        }
        tenantId = payload.tenantId;
      }
      const config = widgetConfigRepo.get(tenantId);
      if (!config) {
        return res.status(404).json({ error: 'Widget not configured' });
      }
      const origin = req.get('Origin') || req.get('Referer') || '';
      if (config.allowedDomains.length > 0 && origin) {
        try {
          const originHost = new URL(origin).hostname;
          const allowed = config.allowedDomains.some((d: string) => {
            if (d.startsWith('*.')) return originHost.endsWith(d.slice(1));
            return originHost === d;
          });
          if (!allowed) {
            return res.status(403).json({ error: 'Domain not allowed' });
          }
        } catch {
          // ignore URL parse errors
        }
      }
      res.json({
        theme: config.theme,
        position: config.position,
        primaryColor: config.primaryColor,
        logoUrl: config.logoUrl,
        companyName: config.companyName,
        greeting: config.greeting,
        launcherText: config.launcherText,
        autoOpen: config.autoOpen,
        autoOpenDelay: config.autoOpenDelay,
      });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Widget config fetch failed');
      res.status(500).json({ error: 'Failed to fetch widget config' });
    }
  });

  router.put('/config', widgetAuth || ((_req, _res, next) => next()), requireJsonObject, (req: Request, res: Response) => {
    try {
      const allowed = ['admin', 'owner'];
      if (!req.user?.role || !allowed.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      const body = { ...req.body };
      if (body.position === 'right') body.position = 'bottom-right';
      if (body.position === 'left') body.position = 'bottom-left';
      const config = widgetConfigRepo.upsert(req.tenantId!, body);
      res.json({ config });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Widget config update failed');
      res.status(500).json({ error: 'Failed to update widget config' });
    }
  });

  router.get('/snippet', (req: Request, res: Response) => {
    try {
      let tenantId: string | null = tryJwtAuth(req);
      let token: string;
      if (tenantId) {
        token = generateWidgetToken(tenantId);
      } else {
        token = req.query.token as string;
        if (!token) {
          return res.status(400).json({ error: 'Widget token required' });
        }
        const payload = verifyWidgetToken(token);
        if (!payload) {
          return res.status(401).json({ error: 'Invalid or expired widget token' });
        }
        tenantId = payload.tenantId;
      }
      const apiUrl = (process.env.APP_URL || '').replace(/\/+$/, '');
      const snippet = `<!-- Chat Widget -->
<script>
(function() {
  var t=document.createElement('script');t.type='text/javascript';t.async=true;
      t.src='${apiUrl}/widget/widget.js?token=${token}';
  var s=document.getElementsByTagName('script')[0];s.parentNode.insertBefore(t,s);
})();
</script>
<link rel="stylesheet" href="${apiUrl}/widget/styles.css">
<!-- End Chat Widget -->`;
      res.setHeader('Content-Type', 'text/plain');
      res.send(snippet);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Snippet generation failed');
      res.status(500).json({ error: 'Failed to generate snippet' });
    }
  });

  return router;
}
