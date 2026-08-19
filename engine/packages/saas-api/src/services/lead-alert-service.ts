export interface LeadAlertPayload {
  tenantId: string;
  funnelStage?: string | null;
  timestamp: string;
  contact?: { email?: string; phone?: string } | null;
  conversationSummary: string;
  topics: string[];
}

export async function maybeTrigger(
  tenantId: string,
  funnelStage: string | undefined | null,
  contact: { email?: string; phone?: string } | null,
  conversationSummary: string,
  topics: string[]
): Promise<void> {
  const webhookUrl = process.env.LEAD_ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  const payload: LeadAlertPayload = {
    tenantId,
    funnelStage,
    timestamp: new Date().toISOString(),
    contact,
    conversationSummary,
    topics,
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error(`Lead alert webhook returned ${response.status}`, await response.text());
    }
  } catch (error) {
    // Non-blocking: never disrupt the visitor's chat experience
    console.error('Lead alert dispatch failed', error);
  }
}