import { Paddle as PaddleSDK, Environment } from '@paddle/paddle-node-sdk';

export class PaddleClient {
  private client: PaddleSDK;

  constructor(apiKey?: string, environment?: Environment) {
    const key = apiKey || process.env.PADDLE_API_KEY || '';
    const env = environment || (process.env.PADDLE_ENVIRONMENT === 'production' ? Environment.production : Environment.sandbox);
    this.client = new PaddleSDK(key, { environment: env });
  }

  get sdk(): PaddleSDK {
    return this.client;
  }

  async createCustomer(data: { email: string; name: string; customData?: Record<string, string> }) {
    return this.client.customers.create({
      email: data.email,
      name: data.name,
      customData: data.customData,
    });
  }

  async listPrices(priceIds?: string[]) {
    const filter: any = { status: 'active' };
    if (priceIds?.length) filter.id = priceIds;
    return this.client.prices.list(filter);
  }

  async createCheckoutTransaction(customerId: string, items: Array<{ priceId: string; quantity: number }>, options?: { returnUrl?: string }) {
    return this.client.transactions.create({
      items: items.map(i => ({ priceId: i.priceId, quantity: i.quantity })),
      customerId,
      ...(options?.returnUrl ? { checkout: { url: options.returnUrl } } : {}),
    });
  }

  async getSubscription(subscriptionId: string) {
    return this.client.subscriptions.get(subscriptionId);
  }

  async cancelSubscription(subscriptionId: string) {
    return this.client.subscriptions.cancel(subscriptionId, {
      effectiveFrom: 'immediately',
    });
  }

  async pauseSubscription(subscriptionId: string) {
    return this.client.subscriptions.pause(subscriptionId, {});
  }

  async resumeSubscription(subscriptionId: string) {
    return this.client.subscriptions.resume(subscriptionId, { effectiveFrom: 'immediately' });
  }

  async updateSubscriptionItems(subscriptionId: string, items: Array<{ priceId: string; quantity: number }>) {
    return this.client.subscriptions.update(subscriptionId, {
      items: items.map(i => ({ priceId: i.priceId, quantity: i.quantity })),
    });
  }

  async createPortalSession(customerId: string, subscriptionIds: string[]) {
    return this.client.customerPortalSessions.create(customerId, subscriptionIds);
  }

  async listTransactions(customerId: string) {
    return this.client.transactions.list({ customerId: [customerId] });
  }

  /**
   * Verify a Paddle webhook and unmarshal it into an event entity.
   * The SDK expects (body, secret, signature) — earlier callers swapped the
   * last two args, which made every signature check fail.
   * Returns null when the signature is invalid or the secret is unset.
   */
  async verifyWebhook(requestBody: string, signatureHeader: string): Promise<any | null> {
    const secret = process.env.PADDLE_WEBHOOK_SECRET || '';
    if (!secret) return null;
    try {
      return await this.client.webhooks.unmarshal(requestBody, secret, signatureHeader);
    } catch {
      return null;
    }
  }
}
