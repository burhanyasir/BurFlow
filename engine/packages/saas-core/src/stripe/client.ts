import { createHmac, timingSafeEqual } from 'crypto';

const STRIPE_API_BASE = 'https://api.stripe.com/v1';
const STRIPE_API_VERSION = '2024-06-20';

export interface StripeCheckoutSessionOptions {
  customerId?: string;
  email?: string;
  priceId: string;
  quantity?: number;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  trialPeriodDays?: number;
  mode?: 'subscription' | 'payment';
}

export interface StripeCustomerData {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export class StripeClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.STRIPE_SECRET_KEY || '';
  }

  private async request<T = any>(method: string, path: string, formBody?: Record<string, any>): Promise<T> {
    const body = formBody ? new URLSearchParams(flattenParams(formBody)).toString() : undefined;
    const res = await fetch(`${STRIPE_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Stripe-Version': STRIPE_API_VERSION,
        ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      },
      body,
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      throw new Error(`Stripe API error ${res.status}: ${detail}`);
    }
    return res.json() as Promise<T>;
  }

  /**
   * Verifies a Stripe webhook signature (`stripe-signature` header) following
   * Stripe's scheme: `t=<timestamp>,v1=<hex-hmac>` where the HMAC is computed
   * over `<timestamp>.<raw-payload>` with the webhook signing secret.
   */
  verifyWebhookSignature(payload: string, signatureHeader: string, secret: string, toleranceSeconds = 300): boolean {
    if (!payload || !signatureHeader || !secret) return false;
    const parts: Record<string, string> = {};
    for (const item of signatureHeader.split(',')) {
      const eq = item.indexOf('=');
      if (eq <= 0) continue;
      parts[item.slice(0, eq).trim()] = item.slice(eq + 1).trim();
    }
    const timestamp = parts.t;
    const expectedSig = parts.v1;
    if (!timestamp || !expectedSig) return false;
    const ts = parseInt(timestamp, 10);
    if (!Number.isFinite(ts)) return false;
    if (Math.abs(Date.now() / 1000 - ts) > toleranceSeconds) return false;

    const expected = createHmac('sha256', secret).update(`${timestamp}.${payload}`, 'utf8').digest('hex');
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(expectedSig, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  async createCustomer(data: StripeCustomerData): Promise<{ id: string; email: string }> {
    return this.request('POST', '/customers', {
      email: data.email,
      name: data.name || undefined,
      metadata: data.metadata,
    });
  }

  async createCheckoutSession(options: StripeCheckoutSessionOptions): Promise<{ id: string; url: string | null }> {
    const mode = options.mode || 'subscription';
    const lineItems = JSON.stringify([{ price: options.priceId, quantity: options.quantity || 1 }]);
    const params: Record<string, any> = {
      mode,
      'line_items[0][price]': options.priceId,
      'line_items[0][quantity]': String(options.quantity || 1),
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      metadata: options.metadata || {},
      ...(options.customerId ? { customer: options.customerId } : {}),
      ...(options.email && !options.customerId ? { customer_email: options.email } : {}),
      ...(options.trialPeriodDays ? { subscription_data: { trial_period_days: options.trialPeriodDays } } : {}),
    };
    void lineItems;
    return this.request('POST', '/checkout/sessions', params);
  }

  async getSubscription(subscriptionId: string): Promise<any> {
    return this.request('GET', `/subscriptions/${subscriptionId}`);
  }

  async cancelSubscription(subscriptionId: string): Promise<any> {
    return this.request('DELETE', `/subscriptions/${subscriptionId}`);
  }

  async resumeSubscription(subscriptionId: string): Promise<any> {
    return this.request('POST', `/subscriptions/${subscriptionId}`, { cancel_at_period_end: 'false' });
  }

  async updateSubscriptionItems(subscriptionId: string, priceId: string): Promise<any> {
    const sub = await this.getSubscription(subscriptionId);
    const itemId = sub?.items?.data?.[0]?.id;
    if (!itemId) throw new Error(`No items on subscription ${subscriptionId}`);
    return this.request('POST', `/subscriptions/${subscriptionId}`, {
      items: JSON.stringify([{ id: itemId, price: priceId }]),
      proration_behavior: 'create_prorations',
    });
  }

  async createPortalSession(customerId: string): Promise<{ url: string }> {
    return this.request('POST', '/billing_portal/sessions', { customer: customerId });
  }
}

function flattenParams(params: Record<string, any>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    const k = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flattenParams(value, k));
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        const kk = `${k}[${index}]`;
        if (typeof item === 'object') Object.assign(out, flattenParams(item, kk));
        else out[kk] = String(item);
      });
    } else {
      out[k] = String(value);
    }
  }
  return out;
}
