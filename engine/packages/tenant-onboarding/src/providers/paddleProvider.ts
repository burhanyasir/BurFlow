export interface PaddleProvider {
  createCheckout(opts: { onboardingId?: string; workspaceId?: string; amount: number }): Promise<{ checkoutId: string; url?: string }>;
  createSubscription(opts: { tenantId: string; plan: string }): Promise<{ subscriptionId: string; status: string }>;
  handleWebhook(payload: any, signature?: string): Promise<void>;
}
