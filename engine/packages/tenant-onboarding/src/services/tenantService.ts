import { v4 as uuidv4 } from 'uuid';
import MockPaddleProvider from '../providers/mockPaddleProvider';

interface OnboardingState {
  id: string;
  steps: any[];
  createdAt: string;
}

export default class TenantService {
  private store: Map<string, OnboardingState> = new Map();
  private paddle = new MockPaddleProvider();

  async startOnboarding(payload: any): Promise<string> {
    const id = uuidv4();
    const state: OnboardingState = { id, steps: [payload], createdAt: new Date().toISOString() };
    this.store.set(id, state);
    // quick background init: create default workspace, api key, analytics
    // run initialization in the background so startOnboarding is low-latency and resilient
    this.initializeDefaults(id, payload).catch((err) => console.error('initializeDefaults.error', err));
    return id;
  }

  async submitStep(onboardingId: string, step: any): Promise<any> {
    const state = this.store.get(onboardingId);
    if (!state) throw new Error('Onboarding not found');
    state.steps.push(step);
    return { ok: true };
  }

  async complete(onboardingId: string): Promise<any> {
    const state = this.store.get(onboardingId);
    if (!state) throw new Error('Onboarding not found');

    // perform tenant creation flow based on aggregated steps
    const tenantId = `tenant_${uuidv4().slice(0, 8)}`;

    // Mock paddle subscription creation
    const subscription = await this.paddle.createSubscription({ tenantId, plan: 'trial' });

    // return tenant summary
    return {
      tenantId,
      subscription,
      createdAt: new Date().toISOString(),
    };
  }

  private async initializeDefaults(onboardingId: string, payload: any): Promise<void> {
    // Create default workspace, API key, analytics skeleton. In production these persist to DB.
    // For the vertical slice, keep in-memory and emit logs.
    const workspace = { id: `ws_${uuidv4().slice(0,8)}`, name: payload.businessName || 'Default Workspace' };
    const apiKey = `key_${uuidv4().replace(/-/g, '').slice(0,24)}`;
    const analytics = { sessions: 0, demoBookings: 0, trials: 0 };

    // Store in onboarding state metadata
    const s = this.store.get(onboardingId);
    if (s) {
      (s as any).workspace = workspace;
      (s as any).apiKey = apiKey;
      (s as any).analytics = analytics;
    }

    // simulate padddle checkout session creation
    // run checkout creation defensively and log failures — do not throw to caller during init
    try {
      await this.paddle.createCheckout({ onboardingId, workspaceId: workspace.id, amount: 0 });
    } catch (err) {
      console.error('paddle.createCheckout.error', err);
    }
  }
}
