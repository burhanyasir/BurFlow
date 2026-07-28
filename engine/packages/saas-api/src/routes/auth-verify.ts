import { Router, Request, Response } from 'express';
import { UserRepository, generateVerificationToken, isExpired } from '@conversation-engine/saas-core';
import { createLogger, createContextLogger, logAuditEvent } from '@conversation-engine/logger';
import { requireJsonObject, validateEmail, validationError } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { getEmailService } from '../services/email';

const baseLogger = createLogger('saas-api:auth-verify');

export function createVerifyRoutes(userRepo: UserRepository, jwtSecret: string): Router {
  const router = Router();
  const auth = authMiddleware(jwtSecret);

  router.post('/verify-email', requireJsonObject, (req: Request, res: Response) => {
    try {
      const { token } = req.body;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Verification token is required' });
      }

      const user = userRepo.findByVerificationToken(token);
      if (!user || !user.verificationTokenExpiry) {
        return res.status(400).json({ error: 'Invalid or expired verification token' });
      }

      if (isExpired(user.verificationTokenExpiry)) {
        return res.status(400).json({ error: 'Verification token has expired. Request a new one.' });
      }

      userRepo.update(user.id, {
        emailVerified: true,
        verificationToken: null as string | null,
        verificationTokenExpiry: null as string | null,
      });

      logAuditEvent(createContextLogger(baseLogger), { event: 'verify_email', success: true, userId: user.id });
      res.json({ message: 'Email verified successfully' });
    } catch (err: any) {
      createContextLogger(baseLogger).error({ err }, 'Email verification failed');
      res.status(500).json({ error: 'Failed to verify email' });
    }
  });

  router.post('/resend-verification', auth, requireJsonObject, (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const user = userRepo.findById(req.user.sub);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.emailVerified) {
        return res.status(400).json({ error: 'Email is already verified' });
      }

      const { token, expiresAt } = generateVerificationToken();
      userRepo.update(user.id, { verificationToken: token, verificationTokenExpiry: expiresAt });

      const emailService = getEmailService();
      emailService.send({
        to: user.email,
        subject: 'Verify your email',
        text: `Use this link to verify your email:\n\n${process.env.APP_URL}/verify-email?token=${token}\n\nThis link expires in 24 hours.`,
        html: `<p>Use this link to verify your email:</p><p><a href="${process.env.APP_URL}/verify-email?token=${token}">Verify Email</a></p><p>This link expires in 24 hours.</p>`,
      });

      logAuditEvent(createContextLogger(baseLogger), { event: 'resend_verification', success: true, userId: user.id });
      res.json({ message: 'Verification email sent' });
    } catch (err: any) {
      createContextLogger(baseLogger).error({ err }, 'Resend verification failed');
      res.status(500).json({ error: 'Failed to send verification email' });
    }
  });

  return router;
}
