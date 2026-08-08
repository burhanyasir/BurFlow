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
const LEGACY_WIDGET_SECRETS = [
  'development-widget-secret-do-not-use-in-production',
  'dev-widget-secret',
  'local-dev-widget-secret-1234567890123456789012345678901234567890',
];

const HEX_COLOR_RE = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const THEMES = ['light', 'dark', 'auto'] as const;
const POSITIONS = ['bottom-right', 'bottom-left', 'right', 'left'] as const;
const NOTIFY_THRESHOLDS = ['all', 'sales_qualified_only'] as const;
const MAX_STR_LEN = 5000;
const MAX_STARTER_OPTIONS = 10;
const MAX_ALLOWED_DOMAINS = 20;

interface SanitizedBranding {
  ok: true;
  data: Record<string, unknown>;
}

interface SanitizeError {
  ok: false;
  error: string;
}

type SanitizeResult = SanitizedBranding | SanitizeError;

function sanitizeString(value: unknown, field: string, maxLen: number): SanitizeError | string {
  if (typeof value !== 'string') return { ok: false, error: `${field} must be a string` };
  const trimmed = value.trim();
  if (trimmed.length > maxLen) return { ok: false, error: `${field} must be at most ${maxLen} characters` };
  return trimmed;
}

function sanitizeWidgetConfig(body: unknown): SanitizeResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }
  const raw = body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  const KNOWN_KEYS = new Set([
    'primaryColor', 'theme', 'themeMode', 'position', 'widgetPosition',
    'greeting', 'greetingText', 'avatarUrl', 'logoUrl', 'companyName',
    'launcherText', 'starterOptions', 'allowedDomains', 'autoOpen',
    'autoOpenDelay', 'customCss', 'notificationEmail', 'slackWebhookUrl',
    'notifyThreshold', 'businessProfile',
  ]);
  for (const key of Object.keys(raw)) {
    if (!KNOWN_KEYS.has(key)) return { ok: false, error: `Unknown field: ${key}` };
  }

  if (raw.primaryColor !== undefined) {
    if (typeof raw.primaryColor !== 'string' || !HEX_COLOR_RE.test(raw.primaryColor.trim())) {
      return { ok: false, error: 'primaryColor must be a hex color like #3B82F6 or #38f' };
    }
    data.primaryColor = raw.primaryColor.trim().toLowerCase();
  }

  const theme = raw.themeMode !== undefined ? raw.themeMode : raw.theme;
  if (theme !== undefined) {
    if (typeof theme !== 'string' || !(THEMES as readonly string[]).includes(theme)) {
      return { ok: false, error: 'theme must be one of: light, dark, auto' };
    }
    data.theme = theme;
  }

  const position = raw.widgetPosition !== undefined ? raw.widgetPosition : raw.position;
  if (position !== undefined) {
    if (typeof position !== 'string' || !(POSITIONS as readonly string[]).includes(position)) {
      return { ok: false, error: 'position must be one of: bottom-right, bottom-left, right, left' };
    }
    data.position = position === 'right' ? 'bottom-right' : position === 'left' ? 'bottom-left' : position;
  }

  const greeting = raw.greetingText !== undefined ? raw.greetingText : raw.greeting;
  if (greeting !== undefined) {
    const clean = sanitizeString(greeting, 'greeting', 500);
    if (typeof clean !== 'string') return clean;
    data.greeting = clean;
  }

  for (const field of ['avatarUrl', 'logoUrl'] as const) {
    if (raw[field] !== undefined) {
      const clean = sanitizeString(raw[field], field, 2048);
      if (typeof clean !== 'string') return clean;
      data[field] = clean || undefined;
    }
  }

  if (raw.companyName !== undefined) {
    const clean = sanitizeString(raw.companyName, 'companyName', 100);
    if (typeof clean !== 'string') return clean;
    data.companyName = clean;
  }

  if (raw.launcherText !== undefined) {
    const clean = sanitizeString(raw.launcherText, 'launcherText', 100);
    if (typeof clean !== 'string') return clean;
    data.launcherText = clean;
  }

  if (raw.customCss !== undefined) {
    const clean = sanitizeString(raw.customCss, 'customCss', MAX_STR_LEN);
    if (typeof clean !== 'string') return clean;
    data.customCss = clean || undefined;
  }

  if (raw.starterOptions !== undefined) {
    if (!Array.isArray(raw.starterOptions) || raw.starterOptions.length > MAX_STARTER_OPTIONS) {
      return { ok: false, error: `starterOptions must be an array of at most ${MAX_STARTER_OPTIONS} strings` };
    }
    const options: string[] = [];
    for (const item of raw.starterOptions) {
      if (typeof item !== 'string') return { ok: false, error: 'starterOptions must contain only strings' };
      const clean = item.trim();
      if (clean.length > 200) return { ok: false, error: 'starterOptions items must be at most 200 characters' };
      if (clean && !options.includes(clean)) options.push(clean);
    }
    data.starterOptions = options;
  }

  if (raw.allowedDomains !== undefined) {
    if (!Array.isArray(raw.allowedDomains) || raw.allowedDomains.length > MAX_ALLOWED_DOMAINS) {
      return { ok: false, error: `allowedDomains must be an array of at most ${MAX_ALLOWED_DOMAINS} strings` };
    }
    const domains: string[] = [];
    for (const item of raw.allowedDomains) {
      if (typeof item !== 'string') return { ok: false, error: 'allowedDomains must contain only strings' };
      const clean = item.trim().toLowerCase();
      if (clean.length > 253) return { ok: false, error: 'allowedDomains items must be at most 253 characters' };
      if (clean && !domains.includes(clean)) domains.push(clean);
    }
    data.allowedDomains = domains;
  }

  if (raw.autoOpen !== undefined) {
    if (typeof raw.autoOpen !== 'boolean') return { ok: false, error: 'autoOpen must be a boolean' };
    data.autoOpen = raw.autoOpen;
  }

  if (raw.autoOpenDelay !== undefined) {
    if (typeof raw.autoOpenDelay !== 'number' || !Number.isFinite(raw.autoOpenDelay) || raw.autoOpenDelay < 0 || raw.autoOpenDelay > 60) {
      return { ok: false, error: 'autoOpenDelay must be a number between 0 and 60' };
    }
    data.autoOpenDelay = raw.autoOpenDelay;
  }

  if (raw.notificationEmail !== undefined) {
    if (typeof raw.notificationEmail !== 'string' || (raw.notificationEmail.trim() && !EMAIL_RE.test(raw.notificationEmail.trim()))) {
      return { ok: false, error: 'notificationEmail must be a valid email address' };
    }
    data.notificationEmail = raw.notificationEmail.trim() || undefined;
  }

  if (raw.slackWebhookUrl !== undefined) {
    const clean = sanitizeString(raw.slackWebhookUrl, 'slackWebhookUrl', 2048);
    if (typeof clean !== 'string') return clean;
    if (clean && !clean.startsWith('https://')) return { ok: false, error: 'slackWebhookUrl must be an https URL' };
    data.slackWebhookUrl = clean || undefined;
  }

  if (raw.notifyThreshold !== undefined) {
    if (typeof raw.notifyThreshold !== 'string' || !(NOTIFY_THRESHOLDS as readonly string[]).includes(raw.notifyThreshold)) {
      return { ok: false, error: 'notifyThreshold must be one of: all, sales_qualified_only' };
    }
    data.notifyThreshold = raw.notifyThreshold;
  }

  if (raw.businessProfile !== undefined) {
    if (!raw.businessProfile || typeof raw.businessProfile !== 'object' || Array.isArray(raw.businessProfile)) {
      return { ok: false, error: 'businessProfile must be an object' };
    }
    data.businessProfile = raw.businessProfile;
  }

  for (const key of Object.keys(data)) {
    if (data[key] === undefined) delete data[key];
  }

  return { ok: true, data };
}

function signWidgetToken(encoded: string, secret: string = WIDGET_SECRET): string {
  return createHmac('sha256', secret).update(encoded).digest('hex');
}

export function createWidgetRoutes(widgetConfigRepo: WidgetConfigRepository, jwtSecret?: string): Router {
  const router = Router();
  const widgetAuth = jwtSecret ? authMiddleware(jwtSecret) : undefined;
  const LOCAL_DEMO_TENANT = 'demo-tenant';

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

  function getDemoWidgetConfig(): Record<string, unknown> {
    return {
      theme: 'light',
      position: 'bottom-right',
      primaryColor: '#6366f1',
      logoUrl: undefined,
      companyName: 'BurFlow',
      greeting: 'Hi! I’m BurFlow. How can I help you today?',
      launcherText: 'Start a conversation',
      allowedDomains: [],
      autoOpen: false,
      autoOpenDelay: 3,
    };
  }

  function verifyWidgetToken(token: string): { tenantId: string } | null {
    try {
      const [encoded, sig] = token.split('.');
      if (!sig) return null;

      const candidates = [WIDGET_SECRET, ...LEGACY_WIDGET_SECRETS.filter((secret) => secret !== WIDGET_SECRET)];
      for (const secret of candidates) {
        const expected = signWidgetToken(encoded, secret);
        const sigBuf = Buffer.from(sig, 'hex');
        const expectedBuf = Buffer.from(expected, 'hex');
        if (sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)) {
          const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as WidgetTokenPayload;
          if (payload.type !== 'widget' || payload.exp < Math.floor(Date.now() / 1000)) return null;
          return { tenantId: payload.tenantId };
        }
      }
      return null;
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
        if (tenantId === LOCAL_DEMO_TENANT) {
          const demoConfig = getDemoWidgetConfig();
          return res.json(demoConfig);
        }
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
        avatarUrl: config.avatarUrl,
        companyName: config.companyName,
        greeting: config.greeting,
        launcherText: config.launcherText,
        businessProfile: config.businessProfile,
        starterOptions: config.starterOptions,
        customCss: config.customCss,
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

  router.patch('/config', widgetAuth || ((_req, _res, next) => next()), requireJsonObject, (req: Request, res: Response) => {
    try {
      const allowed = ['admin', 'owner'];
      if (!req.user?.role || !allowed.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      const result = sanitizeWidgetConfig(req.body);
      if (!result.ok) {
        return res.status(400).json({ error: result.error });
      }
      const config = widgetConfigRepo.upsert(req.tenantId!, result.data);
      res.json({ config });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Widget config patch failed');
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
