export interface WhatsAppClientConfig {
  phoneNumberId?: string;
  token?: string;
  apiVersion?: string;
}

export interface WhatsAppSendResult {
  ok: boolean;
  status: number;
  error?: string;
}

const DEFAULT_API_VERSION = 'v18.0';

function envOrDefault(value: string | undefined, key: string, fallback: string): string {
  return value || process.env[key] || fallback;
}

export class WhatsAppNotConfiguredError extends Error {
  constructor(missing: string) {
    super(`WhatsApp ${missing} is not configured. Set WHATSAPP_${missing.toUpperCase()} or provide it to WhatsAppClient.`);
    this.name = 'WhatsAppNotConfiguredError';
  }
}

/**
 * Thin client for the Meta WhatsApp Business Cloud API.
 *
 * Sends outbound text messages to a WhatsApp phone number. Credentials are
 * resolved from WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_TOKEN when not provided
 * explicitly (useful for tests and multi-instance deployments).
 */
export class WhatsAppClient {
  private readonly apiVersion: string;

  constructor(private config: WhatsAppClientConfig = {}) {
    this.apiVersion = config.apiVersion || DEFAULT_API_VERSION;
  }

  private resolvePhoneNumberId(): string {
    const id = envOrDefault(this.config.phoneNumberId, 'WHATSAPP_PHONE_NUMBER_ID', '');
    if (!id) throw new WhatsAppNotConfiguredError('PHONE_NUMBER_ID');
    return id;
  }

  private resolveToken(): string {
    const token = envOrDefault(this.config.token, 'WHATSAPP_TOKEN', '');
    if (!token) throw new WhatsAppNotConfiguredError('TOKEN');
    return token;
  }

  async sendWhatsAppMessage(toPhoneNumber: string, text: string): Promise<WhatsAppSendResult> {
    const phoneNumberId = this.resolvePhoneNumberId();
    const token = this.resolveToken();
    const url = `https://graph.facebook.com/${this.apiVersion}/${phoneNumberId}/messages`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: toPhoneNumber,
          type: 'text',
          text: { body: text },
        }),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        return { ok: false, status: response.status, error: detail || `Meta API responded with ${response.status}` };
      }
      return { ok: true, status: response.status };
    } catch (err: any) {
      return { ok: false, status: 0, error: err?.message || String(err) };
    }
  }
}
