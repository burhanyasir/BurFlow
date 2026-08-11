import { Router, Request, Response } from 'express';
import { UserRepository, generateResetToken, comparePassword, hashPassword, isExpired } from '@conversation-engine/saas-core';
import { createLogger, createContextLogger, logAuditEvent } from '@conversation-engine/logger';
import { requireJsonObject, validateEmail, validateRequiredString, validationError, PASSWORD_MIN, PASSWORD_MAX } from '../middleware/validate';
import { getEmailService } from '../services/email';

const baseLogger = createLogger('saas-api:auth-password-reset');

export function createPasswordResetRoutes(userRepo: UserRepository): Router {
  const router = Router();

  router.post('/forgot-password', requireJsonObject, (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      const errors = [validateEmail(email, 'email')].filter(Boolean);
      if (errors.length > 0) return validationError(res, errors as any);

      const user = userRepo.findByEmail(email);
      if (!user) {
        return res.json({ message: 'If that email is registered, a reset link has been sent.' });
      }

      const { token, expiresAt } = generateResetToken();
      userRepo.update(user.id, { resetToken: token, resetTokenExpiry: expiresAt });

      const emailService = getEmailService();
      // Email delivery is best-effort: a failure must NEVER crash the API.
      emailService.send({
        to: user.email,
        subject: 'Reset your password',
        text: `You requested a password reset. Use this link to reset your password:\n\n${process.env.APP_URL}/reset-password?token=${token}\n\nThis link expires in 1 hour.\n\nIf you did not request this, please ignore this email.`,
        html: `<p>You requested a password reset. Use this link to reset your password:</p><p><a href="${process.env.APP_URL}/reset-password?token=${token}">Reset Password</a></p><p>This link expires in 1 hour.</p><p>If you did not request this, please ignore this email.</p>`,
      }).catch((err: any) => {
        createContextLogger(baseLogger).error({ err, to: user.email }, 'Password reset email failed (non-fatal)');
      });

      logAuditEvent(createContextLogger(baseLogger), { event: 'forgot_password', success: true, userId: user.id });
      res.json({ message: 'If that email is registered, a reset link has been sent.' });
    } catch (err: any) {
      createContextLogger(baseLogger).error({ err }, 'Forgot password failed');
      res.status(500).json({ error: 'Failed to process request' });
    }
  });

  router.post('/reset-password', requireJsonObject, (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;

      let tokenError: string | undefined;
      if (!token || typeof token !== 'string') tokenError = 'Token is required';
      const pwError = validateRequiredString(password, 'password', { minLength: PASSWORD_MIN, maxLength: PASSWORD_MAX });

      if (tokenError || pwError) return validationError(res, [tokenError, pwError].filter(Boolean) as any);

      const user = userRepo.findByResetToken(token);
      if (!user || !user.resetTokenExpiry) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      if (isExpired(user.resetTokenExpiry)) {
        return res.status(400).json({ error: 'Reset token has expired' });
      }

      userRepo.update(user.id, {
        passwordHash: hashPassword(password),
        resetToken: null,
        resetTokenExpiry: null,
      });

      logAuditEvent(createContextLogger(baseLogger), { event: 'reset_password', success: true, userId: user.id });
      res.json({ message: 'Password has been reset successfully' });
    } catch (err: any) {
      createContextLogger(baseLogger).error({ err }, 'Reset password failed');
      res.status(500).json({ error: 'Failed to reset password' });
    }
  });

  return router;
}
