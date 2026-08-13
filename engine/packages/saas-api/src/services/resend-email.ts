import { Resend } from 'resend';
import { EmailPayload, EmailService } from './email';
import { createLogger } from '@conversation-engine/logger';

const logger = createLogger('saas-api:resend-email');

const DEFAULT_FROM = 'BurFlow <onboarding@resend.dev>';

/**
 * Resend email provider.
 *
 * API key precedence: RESEND_API_KEY, then SENDGRID_API_KEY (legacy fallback
 * so existing deployments keep working — the value is used as the Resend key).
 * The sender address comes from EMAIL_FROM, defaulting to the BurFlow
 * onboarding address on resend.dev.
 *
 * Delivery failures are logged as non-fatal warnings and never rethrown, so a
 * mail outage (or a bad recipient address) can never take down the API process.
 */
export class ResendEmailProvider implements EmailService {
  private readonly resend: Resend;
  private readonly from: string;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
    this.from = process.env.EMAIL_FROM || DEFAULT_FROM;
  }

  async send(payload: EmailPayload): Promise<void> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to: [payload.to],
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      });
      if (error) {
        logger.warn({ err: error, to: payload.to, subject: payload.subject }, 'Resend email failed (non-fatal)');
        return;
      }
      logger.info({ to: payload.to, subject: payload.subject, id: data?.id }, 'Email sent via Resend');
    } catch (err: any) {
      // Non-fatal: never let email delivery bring down the API.
      logger.warn({ err, to: payload.to, subject: payload.subject }, 'Resend email delivery error (non-fatal)');
    }
  }
}
