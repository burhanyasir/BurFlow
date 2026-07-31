import { PaddleProvider } from './paddleProvider';

export default class MockPaddleProvider implements PaddleProvider {
  async createCheckout(opts: { onboardingId?: string; workspaceId?: string; amount: number }): Promise<{ checkoutId: string; url?: string }> {
    return { checkoutId: `mock_checkout_${Date.now()}`, url: `https://mock.paddle/checkout/${Date.now()}` };
  }

  async createSubscription(opts: { tenantId: string; plan: string }): Promise<{ subscriptionId: string; status: string }> {
    return { subscriptionId: `mock_sub_${opts.tenantId}_${Date.now()}`, status: 'trialing' };
  }

  async handleWebhook(_payload: any, _signature?: string): Promise<void> {
    // In tests we can assert calls by overriding this method or spying
    return;
  }
}
