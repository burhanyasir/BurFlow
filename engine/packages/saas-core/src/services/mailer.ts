export interface MailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface MailTransport {
  sendEmail(message: MailMessage): Promise<void>;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from?: string;
}

export interface ResendConfig {
  apiKey: string;
  from?: string;
}

export interface LeadAlertData {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  leadScore?: number;
  qualificationStatus?: string;
  buyingIntent?: string;
  source?: string;
  url?: string;
}

export interface MailerOptions {
  transport: MailTransport;
  fromEmail: string;
  appUrl?: string;
}

const RESEND_API_URL = 'https://api.resend.com/emails';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function displayName(data: LeadAlertData): string {
  return data.name || data.email || data.company || 'New visitor';
}

function leadAlertSubject(data: LeadAlertData): string {
  const who = displayName(data);
  return data.qualificationStatus === 'sales_qualified'
    ? `🔥 Sales-Qualified Lead: ${who}`
    : `🎯 New Lead: ${who}`;
}

export function renderLeadAlertEmail(
  tenantName: string,
  leadData: LeadAlertData,
  conversationSummary?: string,
): string {
  const qualified = leadData.qualificationStatus === 'sales_qualified';
  const title = qualified ? 'Sales-Qualified Lead' : 'New Lead Captured';
  const rows: [string, string][] = [
    ['Workspace', tenantName],
  ];
  if (leadData.name) rows.push(['Name', leadData.name]);
  if (leadData.email) rows.push(['Email', leadData.email]);
  if (leadData.phone) rows.push(['Phone', leadData.phone]);
  if (leadData.company) rows.push(['Company', leadData.company]);
  rows.push(['Lead Score', leadData.leadScore != null ? `${leadData.leadScore}/100` : '—']);
  rows.push(['Qualification Status', (leadData.qualificationStatus || 'unknown').replace(/_/g, ' ')]);
  rows.push(['Buying Intent', (leadData.buyingIntent || 'low').replace(/_/g, ' ')]);

  const rowsHtml = rows.map(([label, value]) => `
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-weight:600;white-space:nowrap;font-size:13px;">${escapeHtml(label)}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;">${escapeHtml(value)}</td>
        </tr>`).join('');

  const summaryHtml = conversationSummary
    ? `
        <p style="margin:24px 0 8px;color:#374151;font-size:13px;font-weight:600;">Conversation summary</p>
        <p style="margin:0;padding:14px 16px;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;color:#4b5563;font-size:13px;line-height:1.5;font-style:italic;">${escapeHtml(conversationSummary)}</p>`
    : '';

  const viewUrl = leadData.url
    ? `<a href="${escapeHtml(leadData.url)}" style="background-color:#6366f1;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;display:inline-block;font-size:14px;font-weight:600;">View Session</a>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:24px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background-color:#6366f1;padding:20px 24px;">
              <h1 style="margin:0;color:#ffffff;font-size:18px;">${qualified ? '🔥 ' : '🎯 '}${title}</h1>
              <p style="margin:4px 0 0;color:#c7d2fe;font-size:13px;">${escapeHtml(tenantName)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.5;">A visitor just shared their contact information:</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;border-collapse:collapse;overflow:hidden;">
                ${rowsHtml}
              </table>
              ${summaryHtml}
              ${viewUrl ? `<p style="margin:24px 0 0;font-size:14px;">${viewUrl}</p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderWelcomeEmail(userName: string, verificationLink: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:24px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background-color:#6366f1;padding:20px 24px;">
              <h1 style="margin:0;color:#ffffff;font-size:18px;">Welcome to Conversation Engine 👋</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.5;">Hi ${escapeHtml(userName)},</p>
              <p style="margin:0 0 24px;color:#374151;font-size:14px;line-height:1.5;">Thanks for signing up. Please verify your email address to activate your workspace.</p>
              <p style="margin:0 0 24px;font-size:14px;">
                <a href="${escapeHtml(verificationLink)}" style="background-color:#6366f1;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;display:inline-block;font-size:14px;font-weight:600;">Verify Email</a>
              </p>
              <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;">If the button does not work, copy and paste this link into your browser:<br><a href="${escapeHtml(verificationLink)}" style="color:#6366f1;word-break:break-all;">${escapeHtml(verificationLink)}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderPasswordResetEmail(resetLink: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:24px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background-color:#6366f1;padding:20px 24px;">
              <h1 style="margin:0;color:#ffffff;font-size:18px;">Reset your password</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.5;">We received a request to reset the password for your account.</p>
              <p style="margin:0 0 24px;color:#374151;font-size:14px;line-height:1.5;">Click the button below to choose a new password. This link expires in 24 hours.</p>
              <p style="margin:0 0 24px;font-size:14px;">
                <a href="${escapeHtml(resetLink)}" style="background-color:#6366f1;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;display:inline-block;font-size:14px;font-weight:600;">Reset Password</a>
              </p>
              <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;">If you did not request this, you can safely ignore this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Transports ───────────────────────────────────────────

export interface NodemailerLike {
  createTransport(options: Record<string, unknown>): {
    sendMail(message: Record<string, unknown>): Promise<unknown>;
  };
}

/**
 * Nodemailer SMTP transport. `nodemailer` is loaded lazily so the package works
 * without the dependency installed (Resend/console fallbacks). The module can
 * also be injected for testing.
 */
export function createNodemailerSmtpTransport(
  config: SmtpConfig,
  nodemailerImpl?: NodemailerLike,
): MailTransport {
  const from = config.from;
  return {
    async sendEmail(message: MailMessage): Promise<void> {
      const nodemailer: NodemailerLike = nodemailerImpl || loadNodemailer();
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure ?? false,
        ...(config.user ? { auth: { user: config.user, pass: config.pass || '' } } : {}),
      });
      await transporter.sendMail({
        from: from || config.user || 'noreply@conversationengine.com',
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
    },
  };
}

function loadNodemailer(): NodemailerLike {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('nodemailer');
  } catch {
    throw new Error(
      'nodemailer is not installed. Install it with `npm install nodemailer` or configure RESEND_API_KEY instead.',
    );
  }
}

export function createResendTransport(config: ResendConfig): MailTransport {
  const from = config.from || 'Acme <onboarding@resend.dev>';
  return {
    async sendEmail(message: MailMessage): Promise<void> {
      const res = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          from,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      });
      if (!res.ok) {
        const detail = (await res.text().catch(() => '')).slice(0, 300);
        throw new Error(`Resend API responded with ${res.status}: ${detail}`);
      }
    },
  };
}

export function createConsoleMailTransport(): MailTransport {
  return {
    async sendEmail(message: MailMessage): Promise<void> {
      console.log('=== Mailer ===');
      console.log(`To: ${Array.isArray(message.to) ? message.to.join(', ') : message.to}`);
      console.log(`Subject: ${message.subject}`);
      if (message.text) console.log(`Body:\n${message.text}`);
      else console.log(`HTML:\n${message.html}`);
      console.log('=== End Mailer ===');
    },
  };
}

// ─── Service ──────────────────────────────────────────────

export class MailerService {
  constructor(private readonly options: MailerOptions) {}

  get transport(): MailTransport {
    return this.options.transport;
  }

  async send(message: MailMessage): Promise<void> {
    await this.options.transport.sendEmail(message);
  }

  async sendLeadAlert(
    recipients: string | string[],
    opts: {
      tenantName: string;
      lead: LeadAlertData;
      conversationSummary?: string;
      subject?: string;
    },
  ): Promise<void> {
    const subject = opts.subject || leadAlertSubject(opts.lead);
    const html = renderLeadAlertEmail(opts.tenantName, opts.lead, opts.conversationSummary);
    await this.send({
      to: recipients,
      subject,
      html,
      text: [
        `${opts.tenantName} — ${subject}`,
        '',
        ...Object.entries({
          Name: opts.lead.name,
          Email: opts.lead.email,
          Phone: opts.lead.phone,
          Company: opts.lead.company,
          'Lead Score': opts.lead.leadScore != null ? `${opts.lead.leadScore}/100` : undefined,
          Status: opts.lead.qualificationStatus?.replace(/_/g, ' '),
          'Buying Intent': opts.lead.buyingIntent?.replace(/_/g, ' '),
        })
          .filter(([, v]) => !!v)
          .map(([k, v]) => `${k}: ${v}`),
        '',
        ...(opts.conversationSummary ? [`Conversation summary: ${opts.conversationSummary}`, ''] : []),
        opts.lead.url ? `View session: ${opts.lead.url}` : '',
      ].filter(Boolean).join('\n'),
    });
  }

  async sendWelcome(
    recipients: string | string[],
    opts: { userName: string; verificationLink: string; subject?: string },
  ): Promise<void> {
    await this.send({
      to: recipients,
      subject: opts.subject || 'Welcome to Conversation Engine — verify your email',
      html: renderWelcomeEmail(opts.userName, opts.verificationLink),
      text: [
        `Hi ${opts.userName},`,
        '',
        'Thanks for signing up. Please verify your email address to activate your workspace:',
        opts.verificationLink,
      ].join('\n'),
    });
  }

  async sendPasswordReset(
    recipients: string | string[],
    opts: { resetLink: string; subject?: string },
  ): Promise<void> {
    await this.send({
      to: recipients,
      subject: opts.subject || 'Reset your password',
      html: renderPasswordResetEmail(opts.resetLink),
      text: [
        'We received a request to reset the password for your account.',
        '',
        `Reset your password here (expires in 24 hours): ${opts.resetLink}`,
        '',
        'If you did not request this, you can safely ignore this email.',
      ].join('\n'),
    });
  }

  /**
   * Environment-driven factory:
   * 1. SMTP via nodemailer (MAILER_SMTP_HOST/MAILER_SMTP_PORT + MAILER_SMTP_USER/MAILER_SMTP_PASS)
   * 2. Resend API (RESEND_API_KEY)
   * 3. Console fallback (development)
   */
  static fromEnv(env: NodeJS.ProcessEnv = process.env): MailerService {
    const fromEmail = env.MAILER_FROM_EMAIL || env.RESEND_FROM_EMAIL || 'noreply@conversationengine.com';

    const smtpHost = env.MAILER_SMTP_HOST;
    const smtpPort = env.MAILER_SMTP_PORT ? parseInt(env.MAILER_SMTP_PORT, 10) : NaN;
    if (smtpHost && !isNaN(smtpPort)) {
      return new MailerService({
        transport: createNodemailerSmtpTransport({
          host: smtpHost,
          port: smtpPort,
          secure: env.MAILER_SMTP_SECURE === 'true',
          user: env.MAILER_SMTP_USER,
          pass: env.MAILER_SMTP_PASS,
          from: fromEmail,
        }),
        fromEmail,
        appUrl: env.APP_URL,
      });
    }

    if (env.RESEND_API_KEY) {
      return new MailerService({
        transport: createResendTransport({ apiKey: env.RESEND_API_KEY, from: fromEmail }),
        fromEmail,
        appUrl: env.APP_URL,
      });
    }

    return new MailerService({
      transport: createConsoleMailTransport(),
      fromEmail,
      appUrl: env.APP_URL,
    });
  }
}
