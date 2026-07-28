import sgMail from '@sendgrid/mail';
import { EmailPayload, EmailService } from './email';
import { createLogger } from '@conversation-engine/logger';

const logger = createLogger('saas-api:sendgrid-email');

export class SendGridEmailProvider implements EmailService {
  constructor(apiKey: string) {
    sgMail.setApiKey(apiKey);
  }

  async send(payload: EmailPayload): Promise<void> {
    try {
      await sgMail.send({
        to: payload.to,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@conversationengine.com',
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      });
      logger.info({ to: payload.to, subject: payload.subject }, 'Email sent via SendGrid');
    } catch (err: any) {
      logger.error({ err, to: payload.to, subject: payload.subject }, 'SendGrid email failed');
      throw new Error(`Failed to send email: ${err.message}`);
    }
  }
}
