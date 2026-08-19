import { getEmailService } from './email';

export interface LeadAlertPayload {
  tenantId: string;
  funnelStage?: string | null;
  timestamp: string;
  contact?: { email?: string; phone?: string | null } | null;
  conversationSummary: string;
  topics: string[];
}

/** Per-tenant alert channel configuration (mirrors LeadNotificationConfig). */
export interface LeadAlertConfig {
  slackWebhookUrl?: string;
  /** Generic HTTPS endpoint that receives the alert payload as JSON. */
  customWebhookUrl?: string;
  /** Comma-separated email recipients. */
  alertEmails?: string;
}

export interface MaybeTriggerOptions {
  /** Tenant alert configuration. When absent, falls back to LEAD_ALERT_WEBHOOK_URL. */
  config?: LeadAlertConfig | null;
}

function buildPayload(
  tenantId: string,
  funnelStage: string | undefined | null,
  contact: { email?: string; phone?: string } | null,
  conversationSummary: string,
  topics: string[]
): LeadAlertPayload {
  return {
    tenantId,
    funnelStage,
    timestamp: new Date().toISOString(),
    contact: contact
      ? { email: contact.email ?? undefined, phone: contact.phone ?? null }
      : null,
    conversationSummary,
    topics,
  };
}

function alertEmailRecipients(config: LeadAlertConfig): string[] {
  return [...new Set(
    (config.alertEmails || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  )];
}

async function dispatchWebhook(url: string, payload: LeadAlertPayload): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    console.error(`Lead alert webhook returned ${response.status}`, await response.text());
  }
}

function dispatchToSlack(webhookUrl: string, payload: LeadAlertPayload): Promise<void> {
  const contactLine = [
    payload.contact?.email && `Email: ${payload.contact.email}`,
    payload.contact?.phone && `Phone: ${payload.contact.phone}`,
  ].filter(Boolean).join(' · ');
  const text = [
    `*Qualified lead alert* (${payload.funnelStage || 'unknown stage'})`,
    contactLine,
    payload.conversationSummary,
    payload.topics.length > 0 ? `Topics: ${payload.topics.join(', ')}` : null,
  ].filter(Boolean).join('\n');
  return fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Slack webhook responded with ${response.status}: ${(await response.text()).slice(0, 200)}`);
    }
  });
}

async function dispatchToEmails(recipients: string[], payload: LeadAlertPayload): Promise<void> {
  const contactLine = [
    payload.contact?.email && `Email: ${payload.contact.email}`,
    payload.contact?.phone && `Phone: ${payload.contact.phone}`,
  ].filter(Boolean).join('\n');
  const text = [
    `A qualified lead was captured (stage: ${payload.funnelStage || 'unknown'}).`,
    contactLine,
    `Summary: ${payload.conversationSummary}`,
    payload.topics.length > 0 ? `Topics: ${payload.topics.join(', ')}` : null,
  ].filter(Boolean).join('\n');
  await getEmailService().send({
    to: recipients.join(', '),
    subject: `Qualified lead alert: ${payload.conversationSummary.slice(0, 80) || payload.tenantId}`,
    text,
    html: `<pre>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>`,
  });
}

/**
 * Dispatches a qualified lead alert to every channel the tenant configured —
 * Slack, a custom webhook, and alert emails — with non-blocking fallbacks:
 * a failure on one channel never throws and never blocks the chat pipeline.
 * When no tenant config is supplied, falls back to the legacy
 * LEAD_ALERT_WEBHOOK_URL environment variable.
 */
export async function maybeTrigger(
  tenantId: string,
  funnelStage: string | undefined | null,
  contact: { email?: string; phone?: string } | null,
  conversationSummary: string,
  topics: string[],
  options?: MaybeTriggerOptions
): Promise<void> {
  const payload = buildPayload(tenantId, funnelStage, contact, conversationSummary, topics);
  const config = options?.config ?? null;

  if (!config) {
    const webhookUrl = process.env.LEAD_ALERT_WEBHOOK_URL;
    if (!webhookUrl) return;
    try {
      await dispatchWebhook(webhookUrl, payload);
    } catch (error) {
      // Non-blocking: never disrupt the visitor's chat experience
      console.error('Lead alert dispatch failed', error);
    }
    return;
  }

  const dispatches: Promise<void>[] = [];
  if (config.slackWebhookUrl) {
    dispatches.push(dispatchToSlack(config.slackWebhookUrl, payload).catch((error: unknown) => {
      console.error('Slack lead alert dispatch failed', error);
    }));
  }
  if (config.customWebhookUrl) {
    dispatches.push(dispatchWebhook(config.customWebhookUrl, payload).catch((error: unknown) => {
      console.error('Custom webhook lead alert dispatch failed', error);
    }));
  }
  const recipients = alertEmailRecipients(config);
  if (recipients.length > 0) {
    dispatches.push(dispatchToEmails(recipients, payload).catch((error: unknown) => {
      console.error('Lead alert email dispatch failed', error);
    }));
  }
  if (dispatches.length > 0) {
    await Promise.allSettled(dispatches);
  }
}