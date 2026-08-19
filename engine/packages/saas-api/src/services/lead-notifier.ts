import { Lead, MailerService } from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';
import { getEmailService } from './email';

const logger = createLogger('saas-api:lead-notifier');

export type NotifyThreshold = 'all' | 'sales_qualified_only';

export interface LeadNotificationConfig {
  notificationEmail?: string;
  slackWebhookUrl?: string;
  /** Generic HTTPS endpoint that receives the serialized lead as JSON. */
  customWebhookUrl?: string;
  /** Comma-separated additional email recipients (in addition to notificationEmail). */
  alertEmails?: string;
  notifyThreshold?: NotifyThreshold;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sessionUrl(lead: Lead): string {
  const base = (process.env.APP_URL || 'http://localhost:3457').replace(/\/+$/, '');
  return lead.conversationId
    ? `${base}/admin/conversations/${lead.conversationId}`
    : `${base}/admin/dashboard`;
}

export function buildSlackBlocks(lead: Lead): Record<string, unknown> {
  const qualified = lead.qualificationStatus === 'sales_qualified';
  const fields: { type: string; text: string }[] = [];
  if (lead.name) fields.push({ type: 'mrkdwn', text: `*Name:* ${lead.name}` });
  if (lead.email) fields.push({ type: 'mrkdwn', text: `*Email:* ${lead.email}` });
  if (lead.phone) fields.push({ type: 'mrkdwn', text: `*Phone:* ${lead.phone}` });
  if (lead.company) fields.push({ type: 'mrkdwn', text: `*Company:* ${lead.company}` });
  fields.push({ type: 'mrkdwn', text: `*Score:* ${lead.leadScore}/100` });
  fields.push({ type: 'mrkdwn', text: `*Status:* ${lead.qualificationStatus.replace('_', ' ')}` });

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: qualified ? '🔥 Sales-Qualified Lead' : '🎯 New Lead Captured',
        },
      },
      {
        type: 'section',
        fields,
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `<${sessionUrl(lead)}|View session>` },
        ],
      },
    ],
  };
}

export function buildLeadEmailHtml(lead: Lead): string {
  const rows = [
    lead.name && ['Name', lead.name],
    lead.email && ['Email', lead.email],
    lead.phone && ['Phone', lead.phone],
    lead.company && ['Company', lead.company],
    ['Lead Score', `${lead.leadScore}/100`],
    ['Qualification Status', lead.qualificationStatus.replace('_', ' ')],
  ].filter(Boolean) as [string, string][];

  const rowsHtml = rows.map(([label, value]) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-weight:600;white-space:nowrap;">${escapeHtml(label)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(value)}</td>
      </tr>`).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>New Lead Captured</title></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:24px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background-color:#6366f1;padding:16px 24px;">
              <h1 style="margin:0;color:#ffffff;font-size:18px;">🎯 New Lead Captured</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 16px;color:#374151;font-size:14px;">A visitor just shared their contact information:</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;border-collapse:collapse;">
                ${rowsHtml}
              </table>
              <p style="margin:16px 0 0;font-size:14px;">
                <a href="${escapeHtml(sessionUrl(lead))}" style="background-color:#6366f1;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;display:inline-block;">View Session</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendSlackNotification(webhookUrl: string, lead: Lead): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildSlackBlocks(lead)),
  });
  if (!res.ok) {
    throw new Error(`Slack webhook responded with ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

export async function sendEmailNotification(recipientEmail: string, lead: Lead): Promise<void> {
  const subject = lead.qualificationStatus === 'sales_qualified'
    ? `🔥 Sales-Qualified Lead: ${lead.name || lead.email || 'New visitor'}`
    : `🎯 New Lead: ${lead.name || lead.email || 'New visitor'}`;
  const text = [
    'A visitor just shared their contact information:',
    '',
    lead.name && `Name: ${lead.name}`,
    lead.email && `Email: ${lead.email}`,
    lead.phone && `Phone: ${lead.phone}`,
    lead.company && `Company: ${lead.company}`,
    `Lead Score: ${lead.leadScore}/100`,
    `Qualification Status: ${lead.qualificationStatus}`,
    '',
    `View session: ${sessionUrl(lead)}`,
  ].filter(Boolean).join('\n');

  await getEmailService().send({
    to: recipientEmail,
    subject,
    text,
    html: buildLeadEmailHtml(lead),
  });
}

export function shouldNotifyLead(config: LeadNotificationConfig | null | undefined, lead: Lead): boolean {
  if (!config) return false;
  if (!config.notificationEmail && !config.slackWebhookUrl && !config.customWebhookUrl && !config.alertEmails) return false;
  if (config.notifyThreshold === 'sales_qualified_only' && lead.qualificationStatus !== 'sales_qualified') {
    return false;
  }
  return true;
}

export async function sendCustomWebhookNotification(webhookUrl: string, lead: Lead): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...toLeadAlertData(lead), event: 'lead.alert', timestamp: new Date().toISOString() }),
  });
  if (!res.ok) {
    throw new Error(`Custom webhook responded with ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

function alertEmailRecipients(config: LeadNotificationConfig): string[] {
  const explicit = (config.notificationEmail || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const extra = (config.alertEmails || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([...explicit, ...extra])];
}

export function dispatchLeadNotifications(config: LeadNotificationConfig | null | undefined, lead: Lead): number {
  if (!shouldNotifyLead(config, lead)) return 0;
  let dispatched = 0;
  if (config!.slackWebhookUrl) {
    dispatched += 1;
    void sendSlackNotification(config!.slackWebhookUrl, lead).catch((err: unknown) => {
      createContextLogger(logger).error({ err }, 'Slack lead notification failed');
    });
  }
  if (config!.customWebhookUrl) {
    dispatched += 1;
    void sendCustomWebhookNotification(config!.customWebhookUrl, lead).catch((err: unknown) => {
      createContextLogger(logger).error({ err }, 'Custom webhook lead notification failed');
    });
  }
  const recipients = alertEmailRecipients(config!);
  for (const recipient of recipients) {
    dispatched += 1;
    void sendEmailNotification(recipient, lead).catch((err: unknown) => {
      createContextLogger(logger).error({ err }, 'Email lead notification failed');
    });
  }
  return dispatched;
}

// ─── MailerService integration ─────────────────────────────

export interface LeadAlertContext {
  tenantName?: string;
  conversationSummary?: string;
}

/**
 * Resolves alert recipients: an explicit notification email wins (widget config
 * or tenant.notification_email); otherwise all team member emails are used.
 */
export function resolveLeadNotificationRecipients(opts: { notificationEmail?: string; alertEmails?: string; teamEmails?: string[] }): string[] {
  const explicit = (opts.notificationEmail || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const extra = (opts.alertEmails || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const candidates = explicit.length > 0 ? [...explicit, ...extra] : [...extra, ...(opts.teamEmails || [])];
  return [...new Set(candidates.filter(Boolean))];
}

export function toLeadAlertData(lead: Lead): Record<string, string | number | undefined> {
  return {
    name: lead.name || undefined,
    email: lead.email || undefined,
    phone: lead.phone || undefined,
    company: lead.company || undefined,
    leadScore: lead.leadScore,
    qualificationStatus: lead.qualificationStatus,
    buyingIntent: lead.buyingIntent,
    source: lead.source,
    url: sessionUrl(lead),
  };
}

/** Sends the instant lead-capture alert via the MailerService (SMTP/Resend/console). */
export async function sendLeadAlertEmails(
  mailer: MailerService,
  recipients: string[],
  lead: Lead,
  context: LeadAlertContext = {},
): Promise<void> {
  if (recipients.length === 0) return;
  await mailer.sendLeadAlert(recipients, {
    tenantName: context.tenantName || 'Your workspace',
    lead: toLeadAlertData(lead),
    conversationSummary: context.conversationSummary,
  });
}

/** Fire-and-forget dispatch for chat pipeline: email (MailerService) + Slack. */
export function dispatchLeadAlerts(
  mailer: MailerService,
  opts: {
    config?: LeadNotificationConfig | null;
    tenantNotificationEmail?: string;
    teamEmails?: string[];
    lead: Lead;
    tenantName?: string;
    conversationSummary?: string;
  },
): number {
  if (!opts.config || (opts.config.notifyThreshold === 'sales_qualified_only' && opts.lead.qualificationStatus !== 'sales_qualified')) {
    return 0;
  }
  let dispatched = 0;
  const recipients = resolveLeadNotificationRecipients({
    notificationEmail: opts.config.notificationEmail || opts.tenantNotificationEmail,
    alertEmails: opts.config.alertEmails,
    teamEmails: opts.teamEmails,
  });
  if (recipients.length > 0) {
    dispatched += recipients.length;
    void sendLeadAlertEmails(mailer, recipients, opts.lead, {
      tenantName: opts.tenantName,
      conversationSummary: opts.conversationSummary,
    }).catch((err: unknown) => {
      createContextLogger(logger).error({ err }, 'Lead alert email failed');
    });
  }
  if (opts.config.slackWebhookUrl) {
    dispatched += 1;
    void sendSlackNotification(opts.config.slackWebhookUrl, opts.lead).catch((err: unknown) => {
      createContextLogger(logger).error({ err }, 'Slack lead notification failed');
    });
  }
  return dispatched;
}
