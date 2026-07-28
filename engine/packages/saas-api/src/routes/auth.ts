import { Router, Request, Response } from 'express';
import { UserRepository, TenantRepository, RefreshTokenRepository, generateToken, comparePassword, hashPassword, generateVerificationToken, hashToken } from '@conversation-engine/saas-core';
import { createLogger, createContextLogger, logAuditEvent } from '@conversation-engine/logger';
import { authMiddleware } from '../middleware/auth';
import {
  requireJsonObject, validateEmail, validateRequiredString, validateOptionalString,
  validationError, PASSWORD_MIN, PASSWORD_MAX, EMAIL_MAX, NAME_MAX,
} from '../middleware/validate';
import { getEmailService } from '../services/email';
import { randomBytes } from 'crypto';

const baseLogger = createLogger('saas-api:auth');
const PIPELINE_URL = (process.env.PIPELINE_URL || '').replace(/\/+$/, '');
const PIPELINE_SYNC_KEY = process.env.INTERNAL_SYNC_KEY || '';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

function syncConfigToPipeline(tenantId: string): void {
  const config = {
    tenantId,
    configVersion: 0,
    llm: { model: 'gpt-4', temperature: 0.7, maxTokens: 1024, systemPrompt: 'You are a helpful assistant.' },
    safety: { contentFilterThreshold: 'moderate', piiRedactionEnabled: true, piiRedactionMode: 'mask' },
    rateLimits: { messagesPerMinute: 60, messagesPerHour: 1000, concurrentSessions: 100 },
    session: { ttlMinutes: 1440, gracePeriodDays: 7, legalHoldDays: 90 },
    fallbackResponse: 'I apologize, but I am unable to process your request at this time.',
    supportedLanguages: ['en'],
    featureFlags: { qualityScoringEnabled: false, analyticsEnabled: false },
  };
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (PIPELINE_SYNC_KEY) {
    headers['Authorization'] = `Bearer ${PIPELINE_SYNC_KEY}`;
    headers['X-Timestamp'] = String(Date.now());
    headers['X-Nonce'] = `saas-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
  fetch(`${PIPELINE_URL}/api/internal/sync-config`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ tenantId, config }),
  }).catch(() => { /* pipeline may not be available */ });
}

function generateRefreshToken(): { token: string; hash: string; expiresAt: string } {
  const token = `ref_${randomBytes(40).toString('base64url')}`;
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 86400000).toISOString();
  return { token, hash: token, expiresAt };
}

export function createAuthRoutes(userRepo: UserRepository, tenantRepo: TenantRepository, refreshTokenRepo: RefreshTokenRepository, jwtSecret: string): Router {
  const router = Router();
  const auth = authMiddleware(jwtSecret);

  router.post('/signup', requireJsonObject, (req: Request, res: Response) => {
    try {
      const { email, password, name, companyName } = req.body;

      const errors = [
        validateEmail(email, 'email'),
        validateRequiredString(name, 'name', { maxLength: NAME_MAX }),
        validateRequiredString(password, 'password', { minLength: PASSWORD_MIN, maxLength: PASSWORD_MAX }),
        validateOptionalString(companyName, 'companyName', { maxLength: NAME_MAX }),
      ].filter(Boolean);

      if (errors.length > 0) return validationError(res, errors as any);

      const existing = userRepo.findByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const { token: verificationToken, expiresAt: verificationTokenExpiry } = generateVerificationToken();
      const user = userRepo.create({ email, password, name, verificationToken, verificationTokenExpiry });
      const tenant = tenantRepo.create({ name: companyName || `${name}'s Organization`, ownerId: user.id });

      syncConfigToPipeline(tenant.id);

      const emailService = getEmailService();
      emailService.send({
        to: user.email,
        subject: 'Verify your email',
        text: `Welcome! Use this link to verify your email:\n\n${process.env.APP_URL}/verify-email?token=${verificationToken}\n\nThis link expires in 24 hours.`,
        html: `<p>Welcome! Use this link to verify your email:</p><p><a href="${process.env.APP_URL}/verify-email?token=${verificationToken}">Verify Email</a></p><p>This link expires in 24 hours.</p>`,
      });

      const accessToken = generateToken({
        sub: user.id,
        email: user.email,
        name: user.name,
        tenantId: tenant.id,
        role: 'owner',
      }, jwtSecret);

      const { token: refreshTokenValue, expiresAt } = generateRefreshToken();
      refreshTokenRepo.create(user.id, refreshTokenValue, expiresAt);

      res.status(201).json({
        user: { id: user.id, email: user.email, name: user.name },
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, plan: tenant.plan },
        token: accessToken,
        refreshToken: refreshTokenValue,
      });
    } catch (err: any) {
      const log = createContextLogger(baseLogger);
      log.error({ err }, 'Signup failed');
      logAuditEvent(log, { event: 'signup', success: false, ip: req.ip, detail: err.message });
      res.status(500).json({ error: 'Signup failed' });
    }
  });

  router.post('/register', requireJsonObject, (req: Request, res: Response) => {
    const { email, password, name, companyName } = req.body;

    const errors = [
      validateEmail(email, 'email'),
      validateRequiredString(name, 'name', { maxLength: NAME_MAX }),
      validateRequiredString(password, 'password', { minLength: PASSWORD_MIN, maxLength: PASSWORD_MAX }),
      validateOptionalString(companyName, 'companyName', { maxLength: NAME_MAX }),
    ].filter(Boolean);

    if (errors.length > 0) return validationError(res, errors as any);

    const existing = userRepo.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const { token: verificationToken, expiresAt: verificationTokenExpiry } = generateVerificationToken();
    const user = userRepo.create({ email, password, name, verificationToken, verificationTokenExpiry });
    const tenant = tenantRepo.create({ name: companyName || `${name}'s Organization`, ownerId: user.id });

    syncConfigToPipeline(tenant.id);

    const emailService = getEmailService();
    emailService.send({
      to: user.email,
      subject: 'Verify your email',
        text: `Welcome! Use this link to verify your email:\n\n${process.env.APP_URL}/verify-email?token=${verificationToken}\n\nThis link expires in 24 hours.`,
        html: `<p>Welcome! Use this link to verify your email:</p><p><a href="${process.env.APP_URL}/verify-email?token=${verificationToken}">Verify Email</a></p><p>This link expires in 24 hours.</p>`,
    });

    const accessToken = generateToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      tenantId: tenant.id,
      role: 'owner',
    }, jwtSecret);

    const refreshResult = generateRefreshToken();
    refreshTokenRepo.create(user.id, refreshResult.token, refreshResult.expiresAt);

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, plan: tenant.plan },
      token: accessToken,
      refreshToken: refreshResult.token,
    });
  });

  router.post('/login', requireJsonObject, (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      const errors = [
        validateEmail(email, 'email'),
        validateRequiredString(password, 'password', { minLength: 1 }),
      ].filter(Boolean);

      if (errors.length > 0) return validationError(res, errors as any);

      const user = userRepo.findByEmail(email);
      if (!user) {
        logAuditEvent(createContextLogger(baseLogger), { event: 'login', success: false, ip: req.ip, detail: 'invalid credentials' });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const valid = comparePassword(password, user.passwordHash);
      if (!valid) {
        logAuditEvent(createContextLogger(baseLogger), { event: 'login', success: false, tenantId: user.id, ip: req.ip, detail: 'wrong password' });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const tenants = tenantRepo.findByOwner(user.id);
      const primaryTenant = tenants[0];

      const accessToken = generateToken({
        sub: user.id,
        email: user.email,
        name: user.name,
        tenantId: primaryTenant?.id,
        role: 'owner',
      }, jwtSecret);

      const { token: refreshTokenValue, expiresAt } = generateRefreshToken();
      refreshTokenRepo.create(user.id, refreshTokenValue, expiresAt);

      logAuditEvent(createContextLogger(baseLogger), { event: 'login', success: true, userId: user.id, tenantId: primaryTenant?.id, ip: req.ip });

      res.json({
        user: { id: user.id, email: user.email, name: user.name },
        tenant: primaryTenant ? { id: primaryTenant.id, name: primaryTenant.name, slug: primaryTenant.slug, plan: primaryTenant.plan } : null,
        token: accessToken,
        refreshToken: refreshTokenValue,
      });
    } catch (err: any) {
      const log = createContextLogger(baseLogger);
      log.error({ err }, 'Login failed');
      res.status(500).json({ error: 'Login failed' });
    }
  });

  router.get('/me', auth, (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = userRepo.findById(req.user.sub);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tenants = tenantRepo.findByOwner(user.id);
    res.json({
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
      tenants: tenants.map(t => ({ id: t.id, name: t.name, slug: t.slug, plan: t.plan, subscriptionStatus: t.subscriptionStatus })),
    });
  });

  router.put('/me', auth, requireJsonObject, (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const { name, avatarUrl } = req.body;

      const errors = [
        validateOptionalString(name, 'name', { maxLength: NAME_MAX }),
        validateOptionalString(avatarUrl, 'avatarUrl', { maxLength: 500, pattern: /^https?:\/\//, patternMessage: 'Must be a valid URL' }),
      ].filter(Boolean);

      if (errors.length > 0) return validationError(res, errors as any);

      const updated = userRepo.update(req.user.sub, { name, avatarUrl });
      if (!updated) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user: { id: updated.id, email: updated.email, name: updated.name, avatarUrl: updated.avatarUrl } });
    } catch (err: any) {
      createContextLogger(baseLogger).error({ err }, 'Update profile failed');
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  router.put('/password', auth, requireJsonObject, (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const { currentPassword, newPassword } = req.body;

      const errors = [
        validateRequiredString(currentPassword, 'currentPassword', { minLength: 1 }),
        validateRequiredString(newPassword, 'newPassword', { minLength: PASSWORD_MIN, maxLength: PASSWORD_MAX }),
      ].filter(Boolean);

      if (errors.length > 0) return validationError(res, errors as any);

      const user = userRepo.findById(req.user.sub);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const valid = comparePassword(currentPassword, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      userRepo.update(user.id, { passwordHash: hashPassword(newPassword) });
      refreshTokenRepo.revokeAllForUser(user.id);
      logAuditEvent(createContextLogger(baseLogger), { event: 'password_change', success: true, userId: user.id, ip: req.ip });
      res.json({ message: 'Password updated' });
    } catch (err: any) {
      createContextLogger(baseLogger).error({ err }, 'Password change failed');
      res.status(500).json({ error: 'Failed to change password' });
    }
  });

  router.post('/refresh', requireJsonObject, (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken || typeof refreshToken !== 'string') {
        return res.status(400).json({ error: 'Refresh token is required' });
      }

      const tokenHash = hashToken(refreshToken);
      const found = refreshTokenRepo.findByTokenHash(tokenHash);

      if (!found) {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
      }

      refreshTokenRepo.revoke(found.id);

      const user = userRepo.findById(found.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const tenants = tenantRepo.findByOwner(user.id);
      const primaryTenant = tenants[0];

      const accessToken = generateToken({
        sub: user.id,
        email: user.email,
        name: user.name,
        tenantId: primaryTenant?.id,
        role: 'owner',
      }, jwtSecret);

      const newRefresh = generateRefreshToken();
      refreshTokenRepo.create(user.id, newRefresh.token, newRefresh.expiresAt);

      res.json({
        token: accessToken,
        refreshToken: newRefresh.token,
      });
    } catch (err: any) {
      createContextLogger(baseLogger).error({ err }, 'Token refresh failed');
      res.status(500).json({ error: 'Failed to refresh token' });
    }
  });

  router.post('/logout', auth, (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    refreshTokenRepo.revokeAllForUser(req.user.sub);
    logAuditEvent(createContextLogger(baseLogger), { event: 'logout', success: true, userId: req.user.sub });
    res.json({ message: 'Logged out' });
  });

  return router;
}
